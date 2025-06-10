const { getCustomerKey, validateInput, corsHeaders } = require('./utils');
const { getCachedCompliance, saveCompliance } = require('./dynamodb');
const { tagShopifyCustomer } = require('./shopify');

const VINOSHIPPER_URL = 'https://vinoshipper.com/api/v3/p/orders/check-compliance';

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    console.log('CORS preflight request received.');
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
  try {
    console.log('Received event:', JSON.stringify(event));

    const body = JSON.parse(event.body);
    console.log('Parsed request body:', body);

    // Input validation
    if (!validateInput(body)) {
      console.warn('Validation failed for request body:', body);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input. Required fields are missing.' }),
        headers: corsHeaders,
      };
    }

    const customerKey = getCustomerKey(body);
    console.log('Generated customerKey:', customerKey);

    // 1. Check cache (only compliant results are stored)
    console.log('Checking DynamoDB cache for customerKey...');
    const cached = await getCachedCompliance(customerKey);
    console.log('DynamoDB cache result:', cached);

    if (cached.Item) {
      console.log('Cache hit. Returning cached compliance result.');
      return {
        statusCode: 200,
        body: JSON.stringify({
          cached: true,
          compliant: true,
          details: cached.Item.compliance
        }),
        headers: corsHeaders,
      };
    }

    // 2. Always check with Vinoshipper if not cached
    const username = process.env.VINOSHIPPER_USERNAME;
    const password = process.env.VINOSHIPPER_PASSWORD;
    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
    };

    console.log('Calling Vinoshipper API with options:', { ...options, body: '[REDACTED]' });

    const response = await fetch(VINOSHIPPER_URL, options);
    console.log('Vinoshipper API response status:', response.status);

    const data = await response.json();
    console.log('Vinoshipper API response data:', data);

    // Only cache if isCompliant is true
    if (data && data.isCompliant === true) {
      console.log('isCompliant is true. Saving compliance result to DynamoDB cache...');
      await saveCompliance(customerKey, data);
      console.log('Saved to DynamoDB.');

      // Tag Shopify customer as compliant
      try {
        const shopifyDomain = process.env.SHOPIFY_DOMAIN; // e.g. "yourstore.myshopify.com"
        const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
        const customerId = body.customer.shopifyCustomerId; // Must be provided in request
        await tagShopifyCustomer({
          shopifyDomain,
          accessToken,
          customerId,
          tag: 'compliant',
          firstName: body.customer.firstName,
          lastName: body.customer.lastName,
          phone: `${body.shipToAddress.phone.country}${body.shipToAddress.phone.number}` || '',
          address: {
            firstName: body.customer.firstName,
            lastName: body.customer.lastName,
            address1: body.customer.address.street1,
            address2: body.customer.address.street2 || '',
            city: body.customer.address.city,
            province: body.customer.address.stateCode,
            country: body.customer.address.country || 'US',
            zip: body.customer.address.postalCode,
            phone: `${body.shipToAddress.phone.country}${body.shipToAddress.phone.number}` || '',
            countryCode: body.shipToAddress.country || 'US'
          }
        });
        console.log(`Tagged Shopify customer ${customerId} as compliant.`);
      } catch (shopifyErr) {
        console.error('Failed to tag Shopify customer:', shopifyErr);
      }
    } else {
      console.log('isCompliant is false. Not saving to DynamoDB.');
    }

    return {
      statusCode: response.status,
      body: JSON.stringify({
        cached: false,
        compliant: !!(data && data.isCompliant),
        details: data
      }),
      headers: corsHeaders,
    };
  } catch (err) {
    console.error('Error occurred:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
      headers: corsHeaders,
    };
  }
};