const { getCachedLocations, cacheLocations } = require('./dynamodb.service');
const { fetchAccessPointsFromVinoshipper } = require('./vinoshipper.service');
const { LOCATION_CACHE_DURATION } = require('./config');
const logger = require('./logger');

/**
 * Creates a unique hash for an address
 * @param {Object} address - The address object
 * @returns {string} Base64 encoded hash of the address
 */
function createAddressHash(address) {
    const normalized = `${address.street1}_${address.city}_${address.stateCode}_${address.postalCode}_${address.country}`.toLowerCase();
    const hash = Buffer.from(normalized).toString('base64');
    logger.debug('Created address hash for Vinoshipper', { address, hash });
    return hash;
}

/**
 * Validates the required fields in the request body
 * @param {Object} body - The request body
 * @returns {string[]} Array of missing field names
 */
function validateRequestBody(body) {
    const requiredFields = ['street1', 'city', 'stateCode', 'postalCode','phoneNumber'];
    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
        logger.warn('Request validation failed for Vinoshipper', { missingFields, body });
    }
    return missingFields;
}

/**
 * Creates a standardized response
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @returns {Object} Lambda response object
 */
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST'
        },
        body: JSON.stringify(body)
    };
}

/**
 * Main function to get Vinoshipper locations
 * @param {Object} addressData - Address data
 * @returns {Promise<Object>} Object containing locations and cache status
 */
async function getVinoshipperLocations(addressData) {
    logger.info('Starting Vinoshipper location search', { addressData });
    const addressHash = createAddressHash(addressData);
    
    try {
        const cacheKey = `${addressHash}_vinoshipper`;

        logger.debug('Checking cache for Vinoshipper', { cacheKey });
        const cachedLocations = await getCachedLocations(cacheKey);
        if (cachedLocations) {
            logger.info('Returning cached Vinoshipper locations', { 
                locationCount: cachedLocations.length,
                cacheKey 
            });
            return { locations: cachedLocations, cached: true };
        }

        logger.info('Fetching locations from Vinoshipper API');
        const locations = await fetchAccessPointsFromVinoshipper(addressData);
        
        // Only cache if we have valid locations and no errors
        if(locations.success){
            return { locations, cached: false };
        }
        if (Array.isArray(locations) && locations.length > 0) {
            logger.info('Caching Vinoshipper locations', { 
                locationCount: locations.length,
                cacheKey,
                cacheDuration: LOCATION_CACHE_DURATION 
            });
            await cacheLocations(cacheKey, addressData, locations, LOCATION_CACHE_DURATION);
        } else {
            logger.warn('No Vinoshipper locations found, skipping cache', {
                addressData
            });
        }

        return { locations, cached: false };
    } catch (error) {
        logger.error('Error in getVinoshipperLocations', error);
        
        // Determine if this is a Vinoshipper API error or a system error
        if (error.message && error.message.startsWith('Vinoshipper API Error:')) {
            // This is a Vinoshipper API error, return it with a 400 status
            throw {
                statusCode: 400,
                message: error.message
            };
        } else if (error.message && (
            error.message.includes('Vinoshipper authentication failed') ||
            error.message.includes('Vinoshipper service temporarily unavailable')
        )) {
            // This is a configuration or auth error
            throw {
                statusCode: 503,
                message: 'Vinoshipper service temporarily unavailable'
            };
        }
        
        // For all other errors, throw a generic error
        throw {
            statusCode: 500,
            message: 'Internal server error'
        };
    }
}

module.exports = {
    createAddressHash,
    validateRequestBody,
    createResponse,
    getVinoshipperLocations
}; 