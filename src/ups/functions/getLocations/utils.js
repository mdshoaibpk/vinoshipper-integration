const { getCachedLocations, cacheLocations, getStoredToken, storeToken } = require('./dynamodb.service');
const { getNewAccessToken, fetchLocationsFromUPS } = require('./ups.service');
const { LOCATION_CACHE_DURATION, DEFAULT_SEARCH_CRITERIA } = require('./config');
const logger = require('./logger');

/**
 * Creates a unique hash for an address
 * @param {Object} address - The address object
 * @returns {string} Base64 encoded hash of the address
 */
function createAddressHash(address) {
    const normalized = `${address.street}_${address.city}_${address.state}_${address.postalCode}_${address.country}`.toLowerCase();
    const hash = Buffer.from(normalized).toString('base64');
    logger.debug('Created address hash', { address, hash });
    return hash;
}

/**
 * Validates the required fields in the request body
 * @param {Object} body - The request body
 * @returns {string[]} Array of missing field names
 */
function validateRequestBody(body) {
    const requiredFields = ['street', 'city', 'state', 'postalCode'];
    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
        logger.warn('Request validation failed', { missingFields, body });
    }
    return missingFields;
}

function createResponse(statusCode, body) {
    const response = {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
    logger.debug('Creating response', { statusCode, body });
    return response;
}

function mergeSearchCriteria(userCriteria = {}) {
    logger.debug('Merging search criteria', { userCriteria, defaultCriteria: DEFAULT_SEARCH_CRITERIA });
    const merged = { ...DEFAULT_SEARCH_CRITERIA };

    // Merge top-level properties
    if (userCriteria.maxResults) merged.maxResults = userCriteria.maxResults;
    if (userCriteria.radius) merged.radius = userCriteria.radius;
    if (userCriteria.serviceTypes) merged.serviceTypes = userCriteria.serviceTypes;

    // Merge nested searchOptions
    if (userCriteria.searchOptions) {
        merged.searchOptions = {
            ...merged.searchOptions,
            ...userCriteria.searchOptions
        };
    }

    // Merge nested filters
    if (userCriteria.filters) {
        merged.filters = {
            AccessPointSearch: {
                ...merged.filters.AccessPointSearch,
                ...userCriteria.filters.AccessPointSearch
            },
            DropoffFacilities: {
                ...merged.filters.DropoffFacilities,
                ...userCriteria.filters.DropoffFacilities
            },
            OperatingHours: {
                ...merged.filters.OperatingHours,
                ...userCriteria.filters.OperatingHours
            }
        };
    }

    logger.debug('Merged search criteria', { merged });
    return merged;
}

async function getLocations(addressData) {
    logger.info('Starting location search', { addressData });
    const addressHash = createAddressHash(addressData);
    const searchCriteria = mergeSearchCriteria(addressData?.searchCriteria || {});
    
    try {
        const cacheKey = JSON.stringify(searchCriteria) !== JSON.stringify(DEFAULT_SEARCH_CRITERIA) ? 
            `${addressHash}_${JSON.stringify(searchCriteria)}` : 
            addressHash;

        logger.debug('Checking cache', { cacheKey });
        const cachedLocations = await getCachedLocations(cacheKey);
        if (cachedLocations) {
            logger.info('Returning cached locations', { 
                locationCount: cachedLocations.length,
                cacheKey 
            });
            return { locations: cachedLocations, cached: true };
        }

        let accessToken = await getStoredToken();
        if (!accessToken) {
            logger.info('No stored token found, requesting new token');
            const clientId = process.env.UPS_CLIENT_ID;
            const clientSecret = process.env.UPS_CLIENT_SECRET;
            
            if (!clientId || !clientSecret) {
                logger.error('UPS credentials not configured');
                throw new Error('UPS credentials not configured');
            }
            
            const tokenData = await getNewAccessToken(clientId, clientSecret);
            if (!tokenData.access_token) {
                logger.error('Failed to obtain access token', { tokenData });
                throw new Error('Failed to obtain access token');
            }

            logger.info('Storing new access token');
            await storeToken(tokenData);
            accessToken = tokenData.access_token;
        }

        if (!accessToken) {
            logger.error('No valid access token available');
            throw new Error('No valid access token available');
        }

        logger.info('Fetching locations from UPS API');
        const locations = await fetchLocationsFromUPS(addressData, accessToken, searchCriteria);
        
        // Only cache if we have valid locations and no errors
        if (Array.isArray(locations) && locations.length > 0) {
            logger.info('Caching locations', { 
                locationCount: locations.length,
                cacheKey,
                cacheDuration: LOCATION_CACHE_DURATION 
            });
            await cacheLocations(cacheKey, addressData, locations, LOCATION_CACHE_DURATION);
        } else {
            logger.warn('No locations found, skipping cache', {
                addressData,
                searchCriteria
            });
        }

        return { locations, cached: false };
    } catch (error) {
        logger.error('Error in getLocations', error);
        
        // Determine if this is a UPS API error or a system error
        if (error.message && error.message.startsWith('UPS API Error:')) {
            // This is a UPS API error, return it with a 400 status
            throw {
                statusCode: 400,
                message: error.message
            };
        } else if (error.message && (
            error.message.includes('UPS credentials not configured') ||
            error.message.includes('Failed to obtain access token') ||
            error.message.includes('No valid access token available')
        )) {
            // This is a configuration or auth error
            throw {
                statusCode: 503,
                message: 'UPS service temporarily unavailable'
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
    getLocations,
    mergeSearchCriteria
}; 