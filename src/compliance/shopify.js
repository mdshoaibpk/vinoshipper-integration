const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function tagShopifyCustomer({ shopifyDomain, accessToken, customerId, tag, firstName,lastName, phone, address }) {
  const url = `https://${shopifyDomain}/admin/api/2023-10/graphql.json`;
  const mutation = `
    mutation customerUpdate($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer {
          id
          firstName
          lastName
          phone
          tags
          defaultAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            country
            zip
            phone
            countryCode
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  const variables = {
    input: {
      id: `gid://shopify/Customer/${customerId}`,
      tags: [tag],
      phone: phone || '',
      firstName: firstName || '',
      lastName: lastName || '',
      addresses: address ? [address] : undefined
    }
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query: mutation, variables })
  });
  const result = await response.json();
  if (result.errors || (result.data && result.data.customerUpdate && result.data.customerUpdate.userErrors.length > 0)) {
    throw new Error(`Failed to tag Shopify customer or update address: ${JSON.stringify(result)}`);
  }
  return result.data.customerUpdate.customer;
}

module.exports = { tagShopifyCustomer };