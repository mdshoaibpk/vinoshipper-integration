const axios = require('axios');
const logger = require('./logger');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

/**
 * Update Shopify order with Vinoshipper tracking information
 * @param {string} shopifyOrderNumber - The Shopify order number
 * @param {Object} trackingInfo - Tracking information from Vinoshipper
 * @returns {Promise<Object>} Shopify API response
 */
async function updateShopifyOrder(shopifyOrderNumber, trackingInfo) {
    logger.info('Updating Shopify order with tracking information', {
        shopifyOrderNumber,
        trackingInfo
    });

    try {
        // First, find the Shopify order by order number
        const searchResponse = await axios.get(
            `https://${SHOPIFY_DOMAIN}/admin/api/2025-04/orders.json?name=${shopifyOrderNumber}`,
            {
                headers: {
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!searchResponse.data.orders || searchResponse.data.orders.length === 0) {
            logger.warn('Shopify order not found', { shopifyOrderNumber });
            throw new Error(`Shopify order not found: ${shopifyOrderNumber}`);
        }

        const shopifyOrder = searchResponse.data.orders[0];
        logger.info('Found Shopify order', {
            shopifyOrderId: shopifyOrder.id,
            shopifyOrderNumber: shopifyOrder.order_number,
            fulfillmentStatus: shopifyOrder.fulfillment_status
        });

        // Prepare fulfillment data
        const fulfillmentData = {
            fulfillment: {
                tracking_number: trackingInfo.trackingNumber || null,
                tracking_company: trackingInfo.carrier || 'UPS',
                tracking_urls: trackingInfo.trackingUrl ? [trackingInfo.trackingUrl] : [],
                notify_customer: true,
                line_items: shopifyOrder.line_items.map(item => ({
                    id: item.id,
                    quantity: item.quantity
                }))
            }
        };

        logger.info('Creating fulfillment for Shopify order', {
            shopifyOrderId: shopifyOrder.id,
            fulfillmentData
        });

        // Create fulfillment
        const fulfillmentResponse = await axios.post(
            `https://${SHOPIFY_DOMAIN}/admin/api/2025-04/orders/${shopifyOrder.id}/fulfillments.json`,
            fulfillmentData,
            {
                headers: {
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );

        logger.info('Successfully created Shopify fulfillment', {
            shopifyOrderId: shopifyOrder.id,
            fulfillmentId: fulfillmentResponse.data.fulfillment.id,
            trackingNumber: fulfillmentResponse.data.fulfillment.tracking_number
        });

        return fulfillmentResponse.data;
    } catch (error) {
        logger.error('Error updating Shopify order', {
            shopifyOrderNumber,
            error: error.message,
            statusCode: error.response?.status,
            response: error.response?.data
        });
        throw error;
    }
}

/**
 * Process Vinoshipper order status update
 * @param {Object} vinoshipperOrder - Vinoshipper order data
 * @returns {Promise<Object>} Processing result
 */
async function processVinoshipperOrderUpdate(vinoshipperOrder) {
    logger.info('Processing Vinoshipper order update', {
        vinoshipperOrderId: vinoshipperOrder.id,
        orderNumber: vinoshipperOrder.orderNumber,
        status: vinoshipperOrder.status
    });

    try {
        // Extract Shopify order number from Vinoshipper order number
        // Format: RDW-SHPFY-{shopifyOrderNumber}
        const orderNumberMatch = vinoshipperOrder.orderNumber.match(/RDW-SHPFY-(\d+)/);
        if (!orderNumberMatch) {
            logger.warn('Invalid Vinoshipper order number format', {
                orderNumber: vinoshipperOrder.orderNumber
            });
            throw new Error(`Invalid order number format: ${vinoshipperOrder.orderNumber}`);
        }

        const shopifyOrderNumber = orderNumberMatch[1];
        logger.info('Extracted Shopify order number', {
            vinoshipperOrderNumber: vinoshipperOrder.orderNumber,
            shopifyOrderNumber
        });

        // Handle different order statuses
        switch (vinoshipperOrder.status?.toLowerCase()) {
            case 'shipped':
            case 'fulfilled':
                logger.info('Processing shipped order', {
                    vinoshipperOrderId: vinoshipperOrder.id,
                    shopifyOrderNumber
                });

                // Extract tracking information
                const trackingInfo = {
                    trackingNumber: vinoshipperOrder.trackingNumber || vinoshipperOrder.tracking_number,
                    carrier: vinoshipperOrder.carrier || 'UPS',
                    trackingUrl: vinoshipperOrder.trackingUrl || vinoshipperOrder.tracking_url
                };

                logger.info('Tracking information extracted', {
                    trackingNumber: trackingInfo.trackingNumber,
                    carrier: trackingInfo.carrier,
                    trackingUrl: trackingInfo.trackingUrl
                });

                // Update Shopify order with tracking information
                const shopifyUpdate = await updateShopifyOrder(shopifyOrderNumber, trackingInfo);

                return {
                    success: true,
                    action: 'fulfilled',
                    shopifyOrderNumber,
                    vinoshipperOrderId: vinoshipperOrder.id,
                    trackingNumber: trackingInfo.trackingNumber,
                    shopifyFulfillmentId: shopifyUpdate.fulfillment.id
                };

            case 'cancelled':
                logger.info('Processing cancelled order', {
                    vinoshipperOrderId: vinoshipperOrder.id,
                    shopifyOrderNumber
                });

                // Note: Shopify doesn't have a direct "cancel" API for orders
                // You might want to add a note or tag to the order
                return {
                    success: true,
                    action: 'cancelled',
                    shopifyOrderNumber,
                    vinoshipperOrderId: vinoshipperOrder.id,
                    message: 'Order cancelled in Vinoshipper'
                };

            case 'pending':
            case 'processing':
                logger.info('Processing pending/processing order', {
                    vinoshipperOrderId: vinoshipperOrder.id,
                    shopifyOrderNumber
                });

                return {
                    success: true,
                    action: 'updated',
                    shopifyOrderNumber,
                    vinoshipperOrderId: vinoshipperOrder.id,
                    status: vinoshipperOrder.status
                };

            default:
                logger.warn('Unknown order status', {
                    vinoshipperOrderId: vinoshipperOrder.id,
                    status: vinoshipperOrder.status
                });

                return {
                    success: true,
                    action: 'unknown_status',
                    shopifyOrderNumber,
                    vinoshipperOrderId: vinoshipperOrder.id,
                    status: vinoshipperOrder.status
                };
        }
    } catch (error) {
        logger.error('Error processing Vinoshipper order update', {
            vinoshipperOrderId: vinoshipperOrder.id,
            orderNumber: vinoshipperOrder.orderNumber,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Main Lambda handler function
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} API Gateway response
 */
exports.handler = async (event) => {
    const { httpMethod, path } = event;
    
    logger.info('VINOSHIPPER WEBHOOK HANDLER START');
    logger.info('Received Vinoshipper webhook request', {
        httpMethod,
        path,
        headers: event.headers
    });

    // Validate request method and path
    if (httpMethod !== 'POST' || path !== '/vinoshipper/webhook/order') {
        logger.warn('Invalid webhook request', { httpMethod, path });
        return {
            statusCode: 404,
            body: JSON.stringify({
                message: 'Not Found',
                error: 'Invalid endpoint'
            })
        };
    }

    try {
        // Parse request body
        const body = JSON.parse(event.body || '{}');
        console.log('Vinoshipper webhook payload', JSON.stringify(body, null, 2));
        logger.info('Vinoshipper webhook payload', {
            orderId: body.id,
            orderNumber: body.orderNumber,
            status: body.status,
            eventType: body.eventType || 'order_update'
        });

        // Validate required fields
        if (!body.id || !body.orderNumber) {
            logger.warn('Missing required fields in webhook payload', {
                hasId: !!body.id,
                hasOrderNumber: !!body.orderNumber,
                payload: body
            });
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Bad Request',
                    error: 'Missing required fields: id, orderNumber'
                })
            };
        }

        // Process the webhook
        // const result = await processVinoshipperOrderUpdate(body);
        const result = {
            success: true,
            action: 'unknown_status',
            shopifyOrderNumber: body.orderNumber,
            vinoshipperOrderId: body.id,
            status: body.status
        };

        logger.info('VINOSHIPPER WEBHOOK PROCESSED SUCCESSFULLY');
        logger.info('Webhook processing result', result);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Webhook processed successfully',
                result
            })
        };

    } catch (error) {
        logger.error('ERROR PROCESSING VINOSHIPPER WEBHOOK');
        logger.error('Error processing webhook', {
            error: error.message,
            stack: error.stack,
            event: {
                httpMethod,
                path,
                body: event.body ? JSON.parse(event.body) : null
            }
        });

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal Server Error',
                error: error.message
            })
        };
    } finally {
        logger.info('VINOSHIPPER WEBHOOK HANDLER END');
    }
}; 