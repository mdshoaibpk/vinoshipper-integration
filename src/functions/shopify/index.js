const { formatDate, generateId } = require('./helper');

exports.handler = async (event) => {
    const { httpMethod, path } = event;
    console.log('Shopify order webhook received', event);
    const body = JSON.parse(event.body || '{}');
    console.log('Shopify order webhook received', JSON.stringify(body, null, 3));

    if (httpMethod === 'POST' && path === '/shopify/webhook/order') {
        // Parse the order data from the request body
        const orderData = body;
        // TODO: Add your order processing logic here

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Order received', order: orderData }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    return {
        statusCode: 404,
        body: 'Not Found',
    };
};