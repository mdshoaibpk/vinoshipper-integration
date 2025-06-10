const { formatDate, generateId } = require('./helper');

exports.handler = async (event) => {
    const { httpMethod, path } = event;

    if (httpMethod === 'POST' && path === '/shopify/webhook/order') {
        // Parse the order data from the request body
        const orderData = JSON.parse(event.body || '{}');
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