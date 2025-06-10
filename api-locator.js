require('dotenv').config();
const fetch = require('node-fetch');

const CLIENT_ID = 'OZkhhY6qhGOPcc53HVn2P8ZsxFpIeogC3wqGS9AmqGkgNPqb' //process.env.UPS_CLIENT_ID;
const CLIENT_SECRET = 'GIHARUIl8TAXzSXzpwijKvkQVqrtuUraiQ3wg4yfxwckW5jBYlWqUeS0sJZsH61b' // process.env.UPS_CLIENT_SECRET;
const AUTH_URL = 'https://wwwcie.ups.com/security/v1/oauth/token';
const UPS_BASE_URL = 'https://wwwcie.ups.com/api/locations/v2/search/availabilities/1?Locale=en_US';

// Logging utility
const logger = {
    info: function(message, data) {
        const timestamp = new Date().toISOString();
        if (data) {
            console.log(`[${timestamp}] INFO: ${message}`, JSON.stringify(data, null, 2));
        } else {
            console.log(`[${timestamp}] INFO: ${message}`);
        }
    },
    error: function(message, data) {
        const timestamp = new Date().toISOString();
        if (data) {
            console.error(`[${timestamp}] ERROR: ${message}`, JSON.stringify(data, null, 2));
        } else {
            console.error(`[${timestamp}] ERROR: ${message}`);
        }
    },
    debug: function(message, data) {
        const timestamp = new Date().toISOString();
        if (data) {
            console.debug(`[${timestamp}] DEBUG: ${message}`, JSON.stringify(data, null, 2));
        } else {
            console.debug(`[${timestamp}] DEBUG: ${message}`);
        }
    }
};

async function getAccessToken() {
    logger.info('Starting OAuth authentication process');

    if (!CLIENT_ID || !CLIENT_SECRET) {
        logger.error('Missing credentials - CLIENT_ID and/or CLIENT_SECRET not configured');
        return null;
    }

    try {
        logger.debug(`Requesting access token from ${AUTH_URL}`);
        
        const response = await fetch(AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-merchant-id': CLIENT_ID,
                'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            const errorBody = await response.text();
            logger.error('Failed to get access token', {
                status: response.status,
                statusText: response.statusText,
                error: errorBody
            });
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        logger.info('Successfully obtained access token');
        logger.debug('Token response', {
            tokenType: data.token_type,
            expiresIn: data.expires_in
        });
        
        return data.access_token;
    } catch (error) {
        logger.error('Error during authentication:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        return null;
    }
}

async function findUPSLocations(address, city, state, postalCode, country = 'US') {
    logger.info('Starting UPS location search', {
        address,
        city,
        state,
        postalCode,
        country
    });

    const accessToken = await getAccessToken();
    if (!accessToken) {
        logger.error('Unable to proceed with location search - no access token available');
        return;
    }

    try {
        const requestBody = {
            "LocatorRequest": {
                "Request": {
                    "TransactionReference": {
                        "CustomerContext": "Location Search"
                    },
                    "RequestAction": "Locator"
                },
                "OriginAddress": {
                    "AddressKeyFormat": {
                        "AddressLine": address,
                        "PoliticalDivision2": city,
                        "PoliticalDivision1": state,
                        "PostcodePrimaryLow": postalCode,
                        "PostcodeExtendedLow": postalCode,
                        "CountryCode": country
                    },
                    "MaximumListSize": "10"
                },
                "Translate": {
                    "LanguageCode": "ENG",
                    "Locale": "en_US"
                },
                "UnitOfMeasurement": {
                    "Code": "MI"
                },
                "LocationSearchCriteria": {
                    "MaximumListSize": "10",
                    "SearchRadius": "75",
                    "ServiceSearch": {
                        "Time": "1030",
                        "ServiceCode": {
                            "Code": "01"
                        }
                    }
                },
                "SortCriteria": {
                    "SortType": "01"
                }
            }
        };

        logger.debug('Making UPS Location API request', {
            url: UPS_BASE_URL,
            // requestBody: requestBody
        });

        const response = await fetch(UPS_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error('UPS Location API request failed', {
                status: response.status,
                statusText: response.statusText,
                responseBody: errorText
            });
            throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        }

        const data = await response.json();
        // logger.debug('Received API response', data);

        const locations = data.LocatorResponse?.SearchResults?.DropLocation || [];
        console.log('locations--->', locations);
        logger.info(`Found ${locations.length} locations`);
        
        return locations;
    } catch (error) {
        logger.error('Error fetching UPS locations:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        return null;
    }
}

async function testAPI() {
    logger.info('=== Starting UPS Locator API Test ===');
    logger.info('Searching for locations near Atlanta...');

    const locations = await findUPSLocations(
        '123 Fork rd',    // address
        'Atlanta',        // city
        'GA',            // state
        '30005'          // postal code
    );
        // console.log('locations--->', locations.length);
    // if (locations && locations.length > 0) {
    //     logger.info(`Found ${locations.length} locations`);
        
    //     locations.forEach((location, index) => {
    //         logger.info(`Location ${index + 1} details:`, {
    //             name: location.LocationName,
    //             address: location.Address ? {
    //                 street: location.Address.AddressLine1,
    //                 city: location.Address.City,
    //                 state: location.Address.StateProvinceCode,
    //                 postalCode: location.Address.PostalCode
    //             } : 'No address available',
    //             distance: location.Distance ? `${location.Distance} miles` : 'Distance not available',
    //             hours: location.StandardHoursOfOperation || 'Hours not available'
    //         });
    //     });
    // } else {
    //     logger.error('No locations found or search failed');
    // }
    
    logger.info('=== UPS Locator API Test Complete ===');
}

// Run the test
testAPI(); 