const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { LOCATIONS_TABLE } = require('./config');
const logger = require('./logger');

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});

/**
 * Gets cached locations for an address
 * @param {string} addressHash - Hash of the address
 * @returns {Promise<Object|null>} Cached locations or null if not found/expired
 */
exports.getCachedLocations = async (addressHash) => {
    try {
        logger.debug('Checking cache for Vinoshipper locations', { 
            table: LOCATIONS_TABLE,
            addressHash 
        });

        const result = await dynamoDB.send(new GetCommand({
            TableName: LOCATIONS_TABLE,
            Key: { addressHash }
        }));

        if (result.Item && result.Item.expiresAt > Date.now()) {
            logger.info('Cache hit for Vinoshipper locations', { 
                addressHash,
                locationCount: result.Item.locations.length
            });
            return result.Item.locations;
        }

        logger.info('Cache miss for Vinoshipper locations', { addressHash });
        return null;
    } catch (error) {
        logger.error('Error fetching cached Vinoshipper locations', error);
        return null;
    }
};

/**
 * Caches locations for an address
 * @param {string} addressHash - Hash of the address
 * @param {Object} addressData - Original address data
 * @param {Array} locations - Vinoshipper locations to cache
 * @param {number} cacheDuration - Cache duration in milliseconds
 */
exports.cacheLocations = async (addressHash, addressData, locations, cacheDuration) => {
    try {
        const expiresAt = Date.now() + cacheDuration;
        const item = {
            addressHash,
            locations: locations,
            address: addressData,
            expiresAt,
            createdAt: Date.now(),
            source: 'vinoshipper'
        };

        logger.debug('Preparing to cache Vinoshipper locations', { 
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

        logger.info('Successfully cached Vinoshipper locations', { 
            addressHash,
            locationCount: locations.length,
            expiresAt: new Date(expiresAt).toISOString()
        });
    } catch (error) {
        logger.error('Error caching Vinoshipper locations', {
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