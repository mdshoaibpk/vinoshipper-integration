const axios = require('axios');

const options = {
    method: 'POST',
    url: 'https://vinoshipper.com/api/v3/p/addresses/access-points',
    headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: 'Basic MjIxMi5CQTlENDQ2MTg4N0Q0NDQ0OkIzNllyYTlvVHM2WWFjRFhJTFVaamdJRFZlTnpVNlE3bW1sbHVwYmh6WlFB'
    },
    data: {
        street1: '1370 Railroad Ave',
        city: 'St Helena',
        stateCode: 'CA',
        postalCode: '94574',
        country: 'US',
        phoneNumber: '4043120550'
    }
};
async function getUpsLocations() {
    try {
        const response = await axios.request(options);
        console.log(response.data);
    } catch (error) {
        console.error(error);
    }
}

getUpsLocations();