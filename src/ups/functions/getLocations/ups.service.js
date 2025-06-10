const fetch = require('node-fetch');
const { UPS_AUTH_URL, UPS_BASE_URL } = require('./config');
const logger = require('./logger');

/**
 * Gets a new access token from UPS API
 * @param {string} clientId - Client ID
 * @param {string} clientSecret - Client secret
 * @returns {Promise<Object>} Access token data
 */
async function getNewAccessToken(clientId, clientSecret) {
    if (!clientId || !clientSecret) {
        logger.error('Missing UPS credentials', { 
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret 
        });
        throw new Error('Client ID and Secret are required');
    }

    try {
        logger.info('Requesting new UPS access token', { clientId });

        const response = await fetch(UPS_AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-merchant-id': clientId,
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            body: 'grant_type=client_credentials'
        });

        const data = await response.json();

        if (!response.ok) {
            logger.error('UPS auth request failed', {
                status: response.status,
                statusText: response.statusText,
                error: data.response?.errors?.[0]
            });
            throw new Error(`UPS Auth Error: ${data.response?.errors?.[0]?.message || response.statusText}`);
        }

        logger.info('Successfully obtained UPS access token');
        return data;
    } catch (error) {
        logger.error('Error getting new access token', error);
        throw error;
    }
}

/**
 * Fetches locations from UPS API
 * @param {Object} addressData - Address data
 * @param {string} accessToken - UPS API access token
 * @param {Object} searchCriteria - Search criteria
 * @returns {Promise<Array>} Array of locations
 */
async function fetchLocationsFromUPS(addressData, accessToken, searchCriteria) {
    if (!addressData || !accessToken || !searchCriteria) {
        logger.error('Missing required parameters for UPS location search', {
            hasAddressData: !!addressData,
            hasAccessToken: !!accessToken,
            hasSearchCriteria: !!searchCriteria
        });
        throw new Error('Address data, access token, and search criteria are required');
    }

    try {
        const requestBody = {
            LocatorRequest: {
                Request: {
                    TransactionReference: {
                        CustomerContext: "Location Search"
                    },
                    RequestAction: "Locator"
                },
                OriginAddress: {
                    AddressKeyFormat: {
                        AddressLine: addressData.street,
                        PoliticalDivision2: addressData.city,
                        PoliticalDivision1: addressData.state,
                        PostcodePrimaryLow: addressData.postalCode,
                        PostcodeExtendedLow: addressData.postalCode,
                        CountryCode: addressData.country || 'US'
                    },
                    MaximumListSize: searchCriteria.maxResults.toString()
                },
                Translate: {
                    LanguageCode: "ENG",
                    Locale: "en_US"
                },
                UnitOfMeasurement: {
                    Code: "MI"
                },
                LocationSearchCriteria: {
                    MaximumListSize: searchCriteria.maxResults.toString(),
                    SearchRadius: searchCriteria.radius.toString(),
                    ServiceSearch: {
                        Time: "1030",
                        ServiceCode: {
                            Code: searchCriteria.serviceTypes[0] || "01"
                        }
                    }
                },
                SortCriteria: {
                    SortType: "01"
                }
            }
        };

        logger.debug('Making UPS location API request', {
            url: UPS_BASE_URL,
            searchCriteria: {
                radius: searchCriteria.radius,
                maxResults: searchCriteria.maxResults,
                serviceTypes: searchCriteria.serviceTypes
            },
            address: {
                city: addressData.city,
                state: addressData.state,
                country: addressData.country
            }
        });

        const response = await fetch(`${UPS_BASE_URL}?Locale=en_US`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            logger.error('UPS location API request failed', {
                status: response.status,
                statusText: response.statusText,
                error: data.response?.errors?.[0]
            });
            throw new Error(`UPS API Error: ${data.response?.errors?.[0]?.message || response.statusText}`);
        }

        console.log('data--->', data.LocatorResponse?.SearchResults?.DropLocation);

        if (!data.LocatorResponse?.SearchResults?.DropLocation) {
            logger.warn('No locations found or unexpected response format', { data });
            return [];
        }

        const locations = data.LocatorResponse.SearchResults.DropLocation.map(location => ({
            locationId: location.LocationID,
            name: location.LocationName,
            type: location.Type,
            address: {
                street: location.AddressKeyFormat?.AddressLine,
                city: location.AddressKeyFormat?.PoliticalDivision2,
                state: location.AddressKeyFormat?.PoliticalDivision1,
                postalCode: location.AddressKeyFormat?.PostcodePrimaryLow,
                country: location.AddressKeyFormat?.CountryCode
            },
            coordinates: {
                latitude: location.Geocode?.Latitude,
                longitude: location.Geocode?.Longitude
            },
            distance: location.Distance,
            operatingHours: location.StandardHoursOfOperation,
            services: location.Services,
            capabilities: location.Capabilities
        }));

        logger.info('Successfully retrieved UPS locations', { 
            locationCount: locations.length,
            firstLocation: locations[0] ? {
                locationId: locations[0].locationId,
                name: locations[0].name,
                city: locations[0].address.city,
                state: locations[0].address.state
            } : null
        });

        return locations;
    } catch (error) {
        logger.error('Error fetching locations from UPS', error);
        throw error;
    }
}

module.exports = {
    getNewAccessToken,
    fetchLocationsFromUPS
}; 