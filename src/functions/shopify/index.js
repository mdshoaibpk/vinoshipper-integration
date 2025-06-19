const axios = require('axios');
const { formatDate, generateId } = require('./helper');

const VINOSHIPPER_API_URL = process.env.VINOSHIPPER_API_URL;
const VINOSHIPPER_USERNAME = process.env.VINOSHIPPER_USERNAME;
const VINOSHIPPER_PASSWORD = process.env.VINOSHIPPER_PASSWORD;

// Helper function to create Vinoshipper order
async function createVinoshipperOrder(orderData) {
    console.log('Creating Vinoshipper order for Shopify order:', {
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        customerEmail: orderData.email
    });

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
            phone: orderData.shipping_address.phone
        },
        shipToAddress: {
            country: orderData.shipping_address.country_code,
            phone: {
                number: orderData.shipping_address.phone,
                country: 1
            },
            postalCode: orderData.shipping_address.zip,
            stateCode: orderData.shipping_address.province_code,
            city: orderData.shipping_address.city,
            street1: orderData.shipping_address.address1,
            street2: `.D2R.${orderData.note_attributes.find(attr => attr.name === 'UPS_Access_Point_ID')?.value}`,
            upsAccessPointId: orderData.note_attributes.find(attr => attr.name === 'UPS_Access_Point_ID')?.value
        },
        shippingRate: {
            rateCode: orderData.note_attributes.find(attr => attr.name === 'Shipping_Class')?.value || '03',
            carrier: 'UPS'
        },
        products: orderData.line_items
            .filter(item => item.requires_shipping)
            .map(item => ({
                productId: Number(item.sku.split(':')[1]) || Number(item.sku),
                quantity: item.quantity,
                price: parseFloat(item.price)
            })),
        productIdType: 'VS_ID',
        orderNumber: `RDW-SHPFY-${orderData.order_number.toString()}`,
        orderDate: orderData.created_at,
        totalPrice: parseFloat(orderData.total_price),
        shippingPrice: orderData.line_items.filter(item => item.sku === 'shipping_and_handling_fee').reduce((acc, item) => acc + item.price * item.quantity, 0),
        tax: parseFloat(orderData.total_tax)
    };

    console.log('Prepared Vinoshipper order payload:', {
        orderNumber: vinoshipperOrder.orderNumber,
        customerEmail: vinoshipperOrder.customer.email,
        productCount: vinoshipperOrder.products.length,
        totalPrice: vinoshipperOrder.totalPrice,
        shippingPrice: vinoshipperOrder.shippingPrice
    });

    try {
        console.log('Sending request to Vinoshipper API...', vinoshipperOrder);
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
        console.log('Successfully created Vinoshipper order:', {
            orderNumber: vinoshipperOrder.orderNumber,
            vinoshipperOrderId: response.data.id
        });
        return response.data;
    } catch (error) {
        console.error('Error creating Vinoshipper order:', {
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
    console.log('Updating Vinoshipper order:', {
        orderId,
        shopifyOrderNumber: orderData.order_number,
        customerEmail: orderData.email
    });

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
            phone: orderData.shipping_address.phone
        },
        shipToAddress: {
            country: orderData.shipping_address.country_code,
            phone: {
                number: orderData.shipping_address.phone,
                country: 1
            },
            postalCode: orderData.shipping_address.zip,
            stateCode: orderData.shipping_address.province_code,
            city: orderData.shipping_address.city,
            street1: orderData.shipping_address.address1,
            street2: `.D2R.${orderData.note_attributes.find(attr => attr.name === 'UPS_Access_Point_ID')?.value}`
        },
        shippingRate: {
            rateCode: orderData.note_attributes.find(attr => attr.name === 'Shipping_Class')?.value || '03',
            carrier: 'UPS'
        },
        products: orderData.line_items
            .filter(item => item.requires_shipping)
            .map(item => ({
                productId: Number(item.sku.split(':')[1]) || Number(item.sku),
                quantity: item.quantity,
                price: parseFloat(item.price)
            })),
        productIdType: 'VS_ID',
        orderNumber: `RDW-SHPFY-${orderData.order_number.toString()}`,
        orderDate: orderData.created_at,
        totalPrice: parseFloat(orderData.total_price),
        shippingPrice: orderData.line_items.filter(item => item.sku === 'shipping_and_handling_fee').reduce((acc, item) => acc + item.price * item.quantity, 0),
        tax: parseFloat(orderData.total_tax),
        status: orderData.fulfillment_status || 'pending'
    };

    console.log('Prepared Vinoshipper order update payload:', {
        orderId,
        orderNumber: vinoshipperOrder.orderNumber,
        status: vinoshipperOrder.status,
        productCount: vinoshipperOrder.products.length
    });

    try {
        console.log('Sending update request to Vinoshipper API...');
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
        console.log('Successfully updated Vinoshipper order:', {
            orderId,
            orderNumber: vinoshipperOrder.orderNumber,
            status: vinoshipperOrder.status
        });
        return response.data;
    } catch (error) {
        console.error('Error updating Vinoshipper order:', {
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
    console.log('Cancelling Vinoshipper order:', { orderId });

    try {
        console.log('Sending cancellation request to Vinoshipper API...');
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
        console.log('Successfully cancelled Vinoshipper order:', { orderId });
        return response.data;
    } catch (error) {
        console.error('Error cancelling Vinoshipper order:', {
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
    console.log('Received Shopify webhook request:', JSON.stringify(event, null, 3));
    console.log('Received Shopify webhook request:', JSON.parse(event.body));

    if (httpMethod !== 'POST' || path !== '/shopify/webhook/order') {
        console.warn('Invalid webhook request:', { httpMethod, path });
        return {
            statusCode: 404,
            body: 'Not Found'
        };
    }

    const body = JSON.parse(event.body || '{}');
    const topic = event.headers['X-Shopify-Topic'] || event.headers['x-shopify-topic'];
    const orderData = body;

     
    
    

    try {
        console.log('Processing Shopify webhook:', {
            topic,
            orderId: orderData.id,
            orderNumber: orderData.order_number,
            customerEmail: orderData.email
        });

        switch (topic) {
            case 'orders/create':
                console.log('Handling order creation webhook');
                const vinoshipperOrder = await createVinoshipperOrder(orderData);
                console.log('Vinoshipper order created:', vinoshipperOrder);
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Order created successfully',
                        shopifyOrder: orderData,
                        vinoshipperOrder
                    })
                };

            case 'orders/updated':
                console.log('Handling order update webhook');
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Order updated successfully',
                        shopifyOrder: orderData
                    })
                };
            // const updatedOrder = await updateVinoshipperOrder(orderData.id, orderData);
            // return {
            //     statusCode: 200,
            //     body: JSON.stringify({
            //         message: 'Order updated successfully',
            //         shopifyOrder: orderData,
            //         vinoshipperOrder: updatedOrder
            //     })
            // };

            case 'orders/cancelled':
                console.log('Handling order cancellation webhook');
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Order cancelled successfully',
                        shopifyOrder: orderData
                    })
                };
            // const cancelledOrder = await cancelVinoshipperOrder(orderData.id);
            // return {
            //     statusCode: 200,
            //     body: JSON.stringify({
            //         message: 'Order cancelled successfully',
            //         shopifyOrder: orderData,
            //         vinoshipperOrder: cancelledOrder
            //     })
            // };

            case 'orders/fulfilled':
                console.log('Handling order fulfillment webhook');
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Order fulfilled successfully',
                        shopifyOrder: orderData
                    })
                };
            // const fulfilledOrder = await updateVinoshipperOrder(orderData.id, {
            //     ...orderData,
            //     status: 'fulfilled'
            // });
            // return {
            //     statusCode: 200,
            //     body: JSON.stringify({
            //         message: 'Order fulfilled successfully',
            //         shopifyOrder: orderData,
            //         vinoshipperOrder: fulfilledOrder
            //     })
            // };

            default:
                console.warn('Unsupported webhook topic:', { topic });
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'Unsupported webhook topic',
                        topic
                    })
                };
        }
    } catch (error) {
        console.error('Error processing webhook:', {
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
    }
};