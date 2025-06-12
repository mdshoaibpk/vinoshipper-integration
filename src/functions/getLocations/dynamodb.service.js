const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { TOKEN_TABLE, LOCATIONS_TABLE, TOKEN_KEY } = require('./config');
const logger = require('./logger');

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});

/**
 * Retrieves stored access token if valid
 * @returns {Promise<string|null>} Access token or null if not found/expired
 */
exports.getStoredToken = async () => {
    try {
        logger.debug('Fetching stored token', { table: TOKEN_TABLE, key: TOKEN_KEY });
        const result = await dynamoDB.send(new GetCommand({
            TableName: TOKEN_TABLE,
            Key: { id: TOKEN_KEY }
        }));

        if (result.Item && result.Item.expiresAt > Date.now()) {
            logger.info('Valid token found in DynamoDB');
            return result.Item.accessToken;
        }
        
        logger.info('No valid token found in DynamoDB');
        return null;
    } catch (error) {
        logger.error('Error fetching token from DynamoDB', error);
        return null;
    }
};

/**
 * Stores token data in DynamoDB
 * @param {Object} tokenData - Token response from UPS API
 * @returns {Promise<string>} Access token
 */
exports.storeToken = async (tokenData) => {
    const expiresAt = Date.now() + (tokenData.expires_in * 1000);
    
    try {
        logger.debug('Storing token in DynamoDB', { 
            table: TOKEN_TABLE,
            expiresAt: new Date(expiresAt).toISOString()
        });

        await dynamoDB.send(new PutCommand({
            TableName: TOKEN_TABLE,
            Item: {
                id: TOKEN_KEY,
                accessToken: tokenData.access_token,
                expiresAt,
                refreshToken: tokenData.refresh_token
            }
        }));
        
        logger.info('Successfully stored token in DynamoDB');
        return tokenData.access_token;
    } catch (error) {
        logger.error('Error storing token in DynamoDB', error);
        throw error;
    }
};

/**
 * Gets cached locations for an address
 * @param {string} addressHash - Hash of the address
 * @returns {Promise<Object|null>} Cached locations or null if not found/expired
 */
exports.getCachedLocations = async (addressHash) => {
    try {
        logger.debug('Checking cache for locations', { 
            table: LOCATIONS_TABLE,
            addressHash 
        });

        const result = await dynamoDB.send(new GetCommand({
            TableName: LOCATIONS_TABLE,
            Key: { addressHash }
        }));

        if (result.Item && result.Item.expiresAt > Date.now()) {
            logger.info('Cache hit for locations', { 
                addressHash,
                locationCount: result.Item.locations.length
            });
            return result.Item.locations;
        }

        logger.info('Cache miss for locations', { addressHash });
        return null;
    } catch (error) {
        logger.error('Error fetching cached locations', error);
        return null;
    }
};

/**
 * Caches locations for an address
 * @param {string} addressHash - Hash of the address
 * @param {Object} addressData - Original address data
 * @param {Array} locations - UPS locations to cache
 * @param {number} cacheDuration - Cache duration in milliseconds
 */
exports.cacheLocations = async (addressHash, addressData, locations, cacheDuration) => {
    try {
        const expiresAt = Date.now() + cacheDuration;
        const item = {
            addressHash,
            locations:locations,
            address: addressData,
            expiresAt,
            createdAt: Date.now()
        };

        logger.debug('Preparing to cache locations', { 
            table: LOCATIONS_TABLE,
            addressHash,
            locationCount: locations.length,
            cacheDuration,
            expiresAt: new Date(expiresAt).toISOString()
        });

        await dynamoDB.send(new PutCommand({
            TableName: LOCATIONS_TABLE,
            Item: item
        }));

        logger.info('Successfully cached locations', { 
            addressHash,
            locationCount: locations.length,
            expiresAt: new Date(expiresAt).toISOString()
        });
    } catch (error) {
        logger.error('Error caching locations', {
            error: {
                name: error.name,
                message: error.message,
                code: error.code
            },
            table: LOCATIONS_TABLE,
            addressHash
        });
        throw error;
    }
}; 