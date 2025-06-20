const axios = require('axios');
const { formatDate, generateId } = require('./helper');
const logger = require('./logger');

const VINOSHIPPER_API_URL = process.env.VINOSHIPPER_API_URL;
const VINOSHIPPER_USERNAME = process.env.VINOSHIPPER_USERNAME;
const VINOSHIPPER_PASSWORD = process.env.VINOSHIPPER_PASSWORD;
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

const shipping_classes = [
    {
      "carrier": "UPS",
      "rateCode": "03",
      "rateDescription": "UPS Ground"
    },
    {
      "carrier": "UPS",
      "rateCode": "12",
      "rateDescription": "UPS 3 Day Select"
    },
    {
      "carrier": "UPS",
      "rateCode": "02",
      "rateDescription": "UPS 2nd Day Air"
    },
    {
      "carrier": "UPS",
      "rateCode": "01",
      "rateDescription": "UPS Next Day Air"
    },
    {
      "carrier": "SELF",
      "rateCode": "DIGITAL",
      "rateDescription": "Digital Delivery"
    },
    {
      "carrier": "SELF",
      "rateCode": "MAIL",
      "rateDescription": "Mail"
    }
  ]
/**
 * Check if a product is a wine product based on its category
 * @param {Object} product - Shopify product object from GraphQL
 * @returns {boolean} True if product is wine
 */
function isWineProduct(product) {
    if (!product || !product.productType) {
        logger.info('Product missing productType', { product });
        return false;
    }
    
    const wineKeywords = ['wine', 'red wine', 'white wine', 'rosé', 'sparkling wine', 'champagne'];
    const productType = product.productType.toLowerCase();
    
    const isWine = wineKeywords.some(keyword => productType.includes(keyword));
    
    logger.info('Wine product check', {
        productId: product.id,
        productTitle: product.title,
        productType: product.productType,
        category: product.category,
        isWine: isWine,
        matchedKeywords: wineKeywords.filter(keyword => productType.includes(keyword))
    });
    
    return isWine;
}

/**
 * Query Shopify GraphQL API to get product details
 * @param {Array} productIds - Array of Shopify product IDs
 * @returns {Promise<Array>} Array of product details
 */
async function getProductsFromGraphQL(productIds) {
    if (!productIds || productIds.length === 0) {
        logger.info('No product IDs provided for GraphQL query');
        return [];
    }

    logger.info('Starting GraphQL query for products', {
        productIds: productIds,
        count: productIds.length
    });

    try {
        // Build GraphQL query for multiple products
        const query = `
            query getProducts($ids: [ID!]!) {
                nodes(ids: $ids) {
                    ... on Product {
                        id
                        title
                        productType
                        tags
                        vendor
                        handle
                        category{
                            id
                            name
                        }
                    }
                }
            }
        `;

        // Convert product IDs to GraphQL global IDs
        const globalIds = productIds.map(id => `gid://shopify/Product/${id}`);
        
        logger.debug('GraphQL request details', {
            query: query,
            globalIds: globalIds,
            shopifyDomain: SHOPIFY_DOMAIN
        });

        const response = await axios.post(
            `https://${SHOPIFY_DOMAIN}/admin/api/2025-04/graphql.json`,
            {
                query: query,
                variables: {
                    ids: globalIds
                }
            },
            {
                headers: {
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );

        logger.info('GraphQL response received', {
            status: response.status,
            hasData: !!response.data,
            hasErrors: !!response.data.errors,
            nodeCount: response.data?.data?.nodes?.length || 0
        });

        if (response.data.errors) {
            logger.error('GraphQL errors', response.data.errors);
            return [];
        }

        const products = response.data.data.nodes || [];
        
        logger.info('Products fetched from GraphQL', {
            totalProducts: products.length,
            products: products.map(p => ({
                id: p.id,
                title: p.title,
                productType: p.productType,
                category: p.category,
                vendor: p.vendor
            }))
        });

        return products;
    } catch (error) {
        logger.error('Error fetching products from GraphQL', {
            error: error.message,
            status: error.response?.status,
            response: error.response?.data,
            productIds: productIds
        });
        return [];
    }
}

/**
 * Check if order contains wine products
 * @param {Array} lineItems - Shopify line items
 * @returns {Promise<Object>} Object containing wine check results
 */
async function checkOrderForWineProducts(lineItems) {
    if (!lineItems || lineItems.length === 0) {
        logger.info('No line items found in order');
        return { hasWineProducts: false, wineProducts: [], allProducts: [] };
    }

    logger.info('WINE PRODUCT DETECTION START');
    logger.info('Checking order for wine products', {
        totalItems: lineItems.length,
        itemIds: lineItems.map(item => item.product_id),
        lineItems: lineItems.map(item => ({
            product_id: item.product_id,
            title: item.title,
            sku: item.sku,
            quantity: item.quantity
        }))
    });

    // Extract unique product IDs
    const productIds = [...new Set(lineItems.map(item => item.product_id))];
    logger.info('Unique product IDs extracted', {
        productIds: productIds,
        count: productIds.length
    });
    
    // Get product details from Shopify GraphQL API
    logger.info('Fetching product details from Shopify GraphQL API');
    const products = await getProductsFromGraphQL(productIds);
    
    logger.info('Product details received', {
        requestedCount: productIds.length,
        receivedCount: products.length,
        products: products.map(p => ({
            id: p.id,
            title: p.title,
            productType: p.productType,
            category: p.category
        }))
    });
    
    // Filter wine products
    logger.info('Filtering for wine products');
    const wineProducts = products.filter(product => isWineProduct(product));
    
    logger.info('Wine product analysis', {
        totalProducts: products.length,
        wineProductsFound: wineProducts.length,
        wineProductIds: wineProducts.map(p => p.id),
        wineProductTypes: wineProducts.map(p => p.productType),
        wineProductTitles: wineProducts.map(p => p.title)
    });

    const result = {
        hasWineProducts: wineProducts.length > 0,
        wineProducts: wineProducts,
        allProducts: products
    };

    logger.info('WINE PRODUCT DETECTION RESULT');
    logger.info('Final result', {
        hasWineProducts: result.hasWineProducts,
        wineProductCount: result.wineProducts.length,
        totalProductCount: result.allProducts.length
    });

    return result;
}

// Helper function to find matching shipping class
function findMatchingShippingClass(shippingLines) {
    if (!shippingLines || shippingLines.length === 0) {
        logger.info('No shipping lines found, using default UPS Ground');
        return {
            rateCode: '03',
            carrier: 'UPS'
        };
    }

    logger.info('Finding matching shipping class', {
        shippingLinesCount: shippingLines.length,
        shippingLines: shippingLines.map(line => ({
            code: line.code,
            title: line.title
        }))
    });

    for (const shippingLine of shippingLines) {
        const shippingText = `${shippingLine.code} ${shippingLine.title}`.toLowerCase();
        
        logger.debug('Checking shipping line', {
            code: shippingLine.code,
            title: shippingLine.title,
            combinedText: shippingText
        });

        for (const shippingClass of shipping_classes) {
            const classDescription = shippingClass.rateDescription.toLowerCase();
            
            // Check if shipping line contains the shipping class description
            if (shippingText.includes(classDescription)) {
                logger.info('Found matching shipping class', {
                    shippingLineCode: shippingLine.code,
                    shippingLineTitle: shippingLine.title,
                    matchedClass: shippingClass.rateDescription,
                    rateCode: shippingClass.rateCode,
                    carrier: shippingClass.carrier
                });
                
                return {
                    rateCode: shippingClass.rateCode,
                    carrier: shippingClass.carrier
                };
            }
        }
    }

    logger.warn('No matching shipping class found, using default UPS Ground', {
        shippingLines: shippingLines.map(line => ({
            code: line.code,
            title: line.title
        }))
    });
    
    return {
        rateCode: '03',
        carrier: 'UPS'
    };
}

// Helper function to create Vinoshipper order
async function createVinoshipperOrder(orderData) {
    logger.info('VINOSHIPPER ORDER CREATION START');
    logger.info('Creating Vinoshipper order for Shopify order', {
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        customerEmail: orderData.email,
        lineItemCount: orderData.line_items?.length || 0
    });

    // Find matching shipping class from shipping lines
    const shippingRate = findMatchingShippingClass(orderData.shipping_lines);

    const vinoshipperOrder = {
        paid: true,
        customer: {
            address: {
                street1: orderData.shipping_address.address1,
                city: orderData.shipping_address.city,
                postalCode: orderData.shipping_address.zip,
                stateCode: orderData.shipping_address.province_code
            },
            email: orderData.email,
            firstName: orderData.shipping_address.first_name,
            lastName: orderData.shipping_address.last_name,
            phone: orderData.shipping_address.phone ? orderData.shipping_address.phone.replace(/^\+1|^1|\D/g, '') : ''
        },
        shipToAddress: {
            country: orderData.shipping_address.country_code,
            phone: {
                number: orderData.shipping_address.phone ? orderData.shipping_address.phone.replace(/^\+1|^1|\D/g, '') : '',
                country: 1
            },
            postalCode: orderData.shipping_address.zip,
            stateCode: orderData.shipping_address.province_code,
            city: orderData.shipping_address.city,
            street1: orderData.shipping_address.address1,
            street2: `.D2R.${orderData.note_attributes.find(attr => attr.name === 'UPS_Access_Point_ID')?.value}`,
            upsAccessPointId: orderData.note_attributes.find(attr => attr.name === 'UPS_Access_Point_ID')?.value
        },
        shippingRate: shippingRate,
        products: orderData.line_items
            .filter(item => item.requires_shipping)
            .map(item => ({
                productId: item.sku,
                quantity: item.quantity,
                price: parseFloat(item.price)
            })),
        productIdType: 'SKU',
        orderNumber: `RDW-SHPFY-${orderData.order_number.toString()}`,
        orderDate: orderData.created_at,
        totalPrice: parseFloat(orderData.total_price),
        shippingPrice: orderData.line_items.filter(item => item.sku === 'shipping_and_handling_fee').reduce((acc, item) => acc + item.price * item.quantity, 0),
        tax: parseFloat(orderData.total_tax)
    };

    logger.info('Prepared Vinoshipper order payload', {
        orderNumber: vinoshipperOrder.orderNumber,
        customerEmail: vinoshipperOrder.customer.email,
        productCount: vinoshipperOrder.products.length,
        totalPrice: vinoshipperOrder.totalPrice,
        shippingPrice: vinoshipperOrder.shippingPrice,
        fullPayload: vinoshipperOrder
    });

    try {
        logger.info('VINOSHIPPER ORDER CREATION SUCCESS');
        logger.info('Vinoshipper order', vinoshipperOrder);
        // return vinoshipperOrder;
        logger.info('Sending request to Vinoshipper API', vinoshipperOrder);
        const response = await axios.post(
            `${VINOSHIPPER_API_URL}/p/orders`,
            vinoshipperOrder,
            {
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'authorization': `Basic ${Buffer.from(`${VINOSHIPPER_USERNAME}:${VINOSHIPPER_PASSWORD}`).toString('base64')}`
                }
            }
        );
        logger.info('Successfully created Vinoshipper order', {
            orderNumber: vinoshipperOrder.orderNumber,
            vinoshipperOrderId: response.data.id
        });
        return response.data;
    } catch (error) {
        logger.error('Error creating Vinoshipper order', {
            orderId: orderData.id,
            orderNumber: orderData.order_number,
            error: error.message,
            statusCode: error.response?.status,
            validationErrors: error.response?.data?.error?.errors || [],
            requestPayload: {
                orderNumber: vinoshipperOrder.orderNumber,
                customerEmail: vinoshipperOrder.customer.email,
                productCount: vinoshipperOrder.products.length
            }
        });
        throw error;
    }
}

// Helper function to update Vinoshipper order
async function updateVinoshipperOrder(orderId, orderData) {
    logger.info('Updating Vinoshipper order', {
        orderId,
        shopifyOrderNumber: orderData.order_number,
        customerEmail: orderData.email
    });

    // Find matching shipping class from shipping lines
    const shippingRate = findMatchingShippingClass(orderData.shipping_lines);

    const vinoshipperOrder = {
        customer: {
            address: {
                street1: orderData.shipping_address.address1,
                city: orderData.shipping_address.city,
                postalCode: orderData.shipping_address.zip,
                stateCode: orderData.shipping_address.province_code
            },
            email: orderData.email,
            firstName: orderData.shipping_address.first_name,
            lastName: orderData.shipping_address.last_name,
            phone: orderData.shipping_address.phone ? orderData.shipping_address.phone.replace(/^\+1|^1|\D/g, '') : ''
        },
        shipToAddress: {
            country: orderData.shipping_address.country_code,
            phone: {
                number: orderData.shipping_address.phone ? orderData.shipping_address.phone.replace(/^\+1|^1|\D/g, '') : '',
                country: 1
            },
            postalCode: orderData.shipping_address.zip,
            stateCode: orderData.shipping_address.province_code,
            city: orderData.shipping_address.city,
            street1: orderData.shipping_address.address1,
            street2: `.D2R.${orderData.note_attributes.find(attr => attr.name === 'UPS_Access_Point_ID')?.value}`
        },
        shippingRate: shippingRate,
        products: orderData.line_items
            .filter(item => item.requires_shipping)
            .map(item => ({
                productId: Number(item.sku.split(':')[1]) || Number(item.sku),
                quantity: item.quantity,
                price: parseFloat(item.price)
            })),
        productIdType: 'SKU',
        orderNumber: `RDW-SHPFY-${orderData.order_number.toString()}`,
        orderDate: orderData.created_at,
        totalPrice: parseFloat(orderData.total_price),
        shippingPrice: orderData.line_items.filter(item => item.sku === 'shipping_and_handling_fee').reduce((acc, item) => acc + item.price * item.quantity, 0),
        tax: parseFloat(orderData.total_tax),
        status: orderData.fulfillment_status || 'pending'
    };

    logger.info('Prepared Vinoshipper order update payload', {
        orderId,
        orderNumber: vinoshipperOrder.orderNumber,
        status: vinoshipperOrder.status,
        productCount: vinoshipperOrder.products.length
    });

    try {
        logger.info('Sending update request to Vinoshipper API');
        const response = await axios.put(
            `${VINOSHIPPER_API_URL}/p/orders/${orderId}`,
            vinoshipperOrder,
            {
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'authorization': `Basic ${Buffer.from(`${VINOSHIPPER_USERNAME}:${VINOSHIPPER_PASSWORD}`).toString('base64')}`
                }
            }
        );
        logger.info('Successfully updated Vinoshipper order', {
            orderId,
            orderNumber: vinoshipperOrder.orderNumber,
            status: vinoshipperOrder.status
        });
        return response.data;
    } catch (error) {
        logger.error('Error updating Vinoshipper order', {
            orderId: orderData.id,
            orderNumber: orderData.order_number,
            error: error.message,
            statusCode: error.response?.status,
            validationErrors: error.response?.data?.error?.errors || [],
            requestPayload: {
                orderNumber: vinoshipperOrder.orderNumber,
                customerEmail: vinoshipperOrder.customer.email,
                productCount: vinoshipperOrder.products.length
            }
        });
        throw error;
    }
}

// Helper function to cancel Vinoshipper order
async function cancelVinoshipperOrder(orderId) {
    logger.info('Cancelling Vinoshipper order', { orderId });

    try {
        logger.info('Sending cancellation request to Vinoshipper API');
        const response = await axios.post(
            `${VINOSHIPPER_API_URL}/p/orders/${orderId}/cancel`,
            {},
            {
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'authorization': `Basic ${Buffer.from(`${VINOSHIPPER_USERNAME}:${VINOSHIPPER_PASSWORD}`).toString('base64')}`
                }
            }
        );
        logger.info('Successfully cancelled Vinoshipper order', { orderId });
        return response.data;
    } catch (error) {
        logger.error('Error cancelling Vinoshipper order', {
            orderId,
            error: error.message,
            statusCode: error.response?.status,
            validationErrors: error.response?.data?.error?.errors || [],
            requestPayload: {
                orderId
            }
        });
        throw error;
    }
}

exports.handler = async (event) => {
    const { httpMethod, path } = event;
    logger.info('SHOPIFY WEBHOOK HANDLER START');
    logger.info('Received Shopify webhook request', JSON.stringify(event, null, 3));
    logger.info('Request body', JSON.parse(event.body));
    
    if (httpMethod !== 'POST' || path !== '/shopify/webhook/order') {
        logger.warn('Invalid webhook request', { httpMethod, path });
        return {
            statusCode: 404,
            body: 'Not Found'
        };
    }

    const body = JSON.parse(event.body || '{}');
    const topic = event.headers['X-Shopify-Topic'] || event.headers['x-shopify-topic'];
    const orderData = body;

    logger.info('WEBHOOK PROCESSING START');
    logger.info('Processing Shopify webhook', {
        topic: topic,
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        customerEmail: orderData.email,
        lineItemCount: orderData.line_items?.length || 0,
        totalPrice: orderData.total_price,
        currency: orderData.currency
    });

    logger.info('Order details', {
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        name: orderData.name,
        email: orderData.email,
        phone: orderData.phone,
        financialStatus: orderData.financial_status,
        fulfillmentStatus: orderData.fulfillment_status,
        createdAt: orderData.created_at,
        updatedAt: orderData.updated_at
    });

    logger.info('Shipping address', {
        firstName: orderData.shipping_address?.first_name,
        lastName: orderData.shipping_address?.last_name,
        address1: orderData.shipping_address?.address1,
        city: orderData.shipping_address?.city,
        state: orderData.shipping_address?.province,
        zip: orderData.shipping_address?.zip,
        country: orderData.shipping_address?.country,
        phone: orderData.shipping_address?.phone
    });

    logger.info('Line items', orderData.line_items?.map(item => ({
        id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price,
        requires_shipping: item.requires_shipping,
        vendor: item.vendor
    })) || []);

    logger.info('Note attributes', orderData.note_attributes || []);

    try {
        // Check for wine products in the order
        logger.info('WINE PRODUCT CHECK START');
        const wineCheck = await checkOrderForWineProducts(orderData.line_items);
        
        if (!wineCheck.hasWineProducts) {
            logger.info('ORDER IGNORED - NO WINE PRODUCTS');
            logger.info('Order ignored - no wine products found', {
                orderId: orderData.id,
                orderNumber: orderData.order_number,
                totalProducts: wineCheck.allProducts.length,
                wineProductCount: wineCheck.wineProducts.length
            });
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Order ignored - no wine products found',
                    orderId: orderData.id,
                    orderNumber: orderData.order_number,
                    totalProducts: wineCheck.allProducts.length,
                    wineProductCount: wineCheck.wineProducts.length
                })
            };
        }

        logger.info('ORDER PROCESSING - WINE PRODUCTS FOUND');
        logger.info('Processing order with wine products', {
            orderId: orderData.id,
            orderNumber: orderData.order_number,
            wineProductCount: wineCheck.wineProducts.length,
            wineProducts: wineCheck.wineProducts.map(p => ({
                id: p.id,
                title: p.title,
                productType: p.productType,
                category: p.category
            }))
        });

        // Filter order data to only include wine products
        const wineProductIds = wineCheck.wineProducts.map(p => p.id.split('/').pop()); // Extract numeric ID from GraphQL global ID
        const filteredOrderData = {
            ...orderData,
            line_items: orderData.line_items.filter(item => 
                wineProductIds.includes(item.product_id.toString())
            )
        };

        logger.info('Filtered order data for wine products only', {
            originalLineItemCount: orderData.line_items.length,
            filteredLineItemCount: filteredOrderData.line_items.length,
            wineProductIds: wineProductIds,
            filteredLineItems: filteredOrderData.line_items.map(item => ({
                product_id: item.product_id,
                title: item.title,
                sku: item.sku,
                quantity: item.quantity,
                price: item.price
            }))
        });

        switch (topic) {
            case 'orders/create':
                logger.info('HANDLING ORDER CREATION');
                const vinoshipperOrder = await createVinoshipperOrder(filteredOrderData);
                logger.info('Vinoshipper order created successfully', {
                    orderNumber: vinoshipperOrder.orderNumber,
                    customerEmail: vinoshipperOrder.customer.email,
                    productCount: vinoshipperOrder.products.length,
                    totalPrice: vinoshipperOrder.totalPrice
                });
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Order created successfully',
                        shopifyOrder: {
                            id: orderData.id,
                            orderNumber: orderData.order_number,
                            customerEmail: orderData.email
                        },
                        vinoshipperOrder: {
                            orderNumber: vinoshipperOrder.orderNumber,
                            customerEmail: vinoshipperOrder.customer.email,
                            productCount: vinoshipperOrder.products.length
                        },
                        wineProducts: wineCheck.wineProducts.map(p => ({
                            id: p.id,
                            title: p.title,
                            productType: p.productType
                        }))
                    })
                };

            case 'orders/updated':
                logger.info('HANDLING ORDER UPDATE');
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Order updated successfully',
                        shopifyOrder: {
                            id: orderData.id,
                            orderNumber: orderData.order_number,
                            customerEmail: orderData.email
                        },
                        wineProducts: wineCheck.wineProducts.map(p => ({
                            id: p.id,
                            title: p.title,
                            productType: p.productType
                        }))
                    })
                };

            case 'orders/cancelled':
                logger.info('HANDLING ORDER CANCELLATION');
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Order cancelled successfully',
                        shopifyOrder: {
                            id: orderData.id,
                            orderNumber: orderData.order_number,
                            customerEmail: orderData.email
                        },
                        wineProducts: wineCheck.wineProducts.map(p => ({
                            id: p.id,
                            title: p.title,
                            productType: p.productType
                        }))
                    })
                };

            case 'orders/fulfilled':
                logger.info('HANDLING ORDER FULFILLMENT');
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Order fulfilled successfully',
                        shopifyOrder: {
                            id: orderData.id,
                            orderNumber: orderData.order_number,
                            customerEmail: orderData.email
                        },
                        wineProducts: wineCheck.wineProducts.map(p => ({
                            id: p.id,
                            title: p.title,
                            productType: p.productType
                        }))
                    })
                };

            default:
                logger.warn('UNSUPPORTED WEBHOOK TOPIC');
                logger.warn('Unsupported webhook topic', { topic: topic });
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'Unsupported webhook topic',
                        topic: topic
                    })
                };
        }
    } catch (error) {
        logger.error('ERROR PROCESSING WEBHOOK');
        logger.error('Error processing webhook', {
            error: error.message,
            stack: error.stack,
            orderData: orderData ? {
                id: orderData.id,
                orderNumber: orderData.order_number,
                customerEmail: orderData.email
            } : null
        });
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error processing webhook',
                error: error.message
            })
        };
    } finally {
        logger.info('SHOPIFY WEBHOOK HANDLER END');
    }
};