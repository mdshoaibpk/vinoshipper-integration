function getCustomerKey(body) {
  const { customer, shipToAddress, products } = body;
  return `${customer.email}|${shipToAddress.street1}|${shipToAddress.city}|${shipToAddress.postalCode}|${shipToAddress.stateCode}`;
}

function validateInput(body) {
  if (
    !body ||
    !body.customer ||
    !body.customer.email ||
    !body.customer.address ||
    !body.customer.address.street1 ||
    !body.customer.address.city ||
    !body.customer.address.postalCode ||
    !body.customer.address.stateCode ||
    !body.shipToAddress ||
    !body.shipToAddress.street1 ||
    !body.shipToAddress.city ||
    !body.shipToAddress.stateCode ||
    !body.shipToAddress.postalCode ||
    !body.products ||
    !Array.isArray(body.products) ||
    body.products.length === 0 ||
    !body.products[0].productId
  ) {
    return false;
  }
  return true;
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
};

module.exports = { getCustomerKey, validateInput, corsHeaders };