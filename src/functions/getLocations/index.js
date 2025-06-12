const { validateRequestBody, createResponse, getLocations } = require('./utils');
const logger = require('./logger');

exports.handler = async (event) => {
    logger.info('Lambda invocation started', { event });

    // Handle OPTIONS request (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(200, {});
    }

    try {
        if (!event.body) {
            logger.warn('Request body is missing');
            return createResponse(400, { error: 'Request body is required' });
        }

        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        logger.debug('Parsed request body', { body });

        const missingFields = validateRequestBody(body);
        
        if (missingFields.length > 0) {
            logger.warn('Missing required fields in request', { missingFields });
            return createResponse(400, { error: 'Missing required fields', missingFields });
        }

        const addressData = { ...body, country: body.country || 'US' };
        logger.info('Processing location request', { addressData });

        const { locations, cached } = await getLocations(addressData);
        logger.info('Location search completed', { 
            locationCount: locations?.length || 0,
            cached,
            firstLocation: locations?.[0] ? {
                locationId: locations[0].locationId,
                name: locations[0].name
            } : null
        });

        return createResponse(200, { success: true, locations, cached });
    } catch (error) {
        logger.error('Lambda handler error', error);
        
        // Handle structured errors from getLocations
        if (error.statusCode && error.message) {
            return createResponse(error.statusCode, { 
                error: error.message,
                success: false
            });
        }
        
        // Fallback for unhandled errors
        return createResponse(500, { 
            error: 'Internal server error', 
            message: error.message || 'An unexpected error occurred',
            success: false
        });
    } finally {
        logger.info('Lambda invocation completed');
    }
}; 