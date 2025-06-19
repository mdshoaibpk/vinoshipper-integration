const axios = require('axios');
const { VINOSHIPPER_API_URL, VINOSHIPPER_USERNAME, VINOSHIPPER_PASSWORD } = require('./config');
const logger = require('./logger');

/**
 * Fetches access points from Vinoshipper API
 * @param {Object} addressData - Address data matching the test file format
 * @returns {Promise<Array>} Array of access points
 */
async function fetchAccessPointsFromVinoshipper(addressData) {
    if (!addressData) {
        logger.error('Missing address data for Vinoshipper access point search');
        throw new Error('Address data is required');
    }

    try {
        const requestBody = {
            street1: addressData.street1,
            city: addressData.city,
            stateCode: addressData.stateCode,
            postalCode: addressData.postalCode,
            country: addressData.country || 'US',
            phoneNumber: addressData.phoneNumber || '4043120550'
        };

        logger.debug('Making Vinoshipper access points API request', {
            url: `${VINOSHIPPER_API_URL}/p/addresses/access-points`,
            requestBody
        });

        const response = await axios.post(
            `${VINOSHIPPER_API_URL}/p/addresses/access-points`,
            requestBody,
            {
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'authorization': `Basic ${Buffer.from(`${VINOSHIPPER_USERNAME}:${VINOSHIPPER_PASSWORD}`).toString('base64')}`
                }
            }
        );

        logger.info('Successfully retrieved Vinoshipper access points', { 
            accessPointCount: response.data?.length || 0
        });
        
        return response.data?.locations || [];
    } catch (error) {
        logger.error('Error fetching access points from Vinoshipper', {
            error: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        if (error.response?.status === 401) {
            throw new Error('Vinoshipper authentication failed');
        } else if (error.response?.status === 400) {
            throw new Error('Invalid address data provided to Vinoshipper');
        } else if (error.response?.status >= 500) {
            throw new Error('Vinoshipper service temporarily unavailable');
        }
        
        throw new Error(`Vinoshipper API Error: ${error.message}`);
    }
}

module.exports = {
    fetchAccessPointsFromVinoshipper
}; 