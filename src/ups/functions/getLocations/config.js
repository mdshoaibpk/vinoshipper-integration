// DynamoDB Table Names
exports.TOKEN_TABLE = process.env.TOKEN_TABLE || 'UpsTokens';
exports.LOCATIONS_TABLE = process.env.LOCATIONS_TABLE || 'UpsLocations';
exports.TOKEN_KEY = 'ups_api_token';

// UPS API Configuration
exports.CLIENT_ID = process.env.UPS_CLIENT_ID;
exports.CLIENT_SECRET = process.env.UPS_CLIENT_SECRET;

// Cache Configuration (24 hours in milliseconds)
const LOCATION_CACHE_DURATION = 24 * 60 * 60 * 1000;

// UPS API URLs with environment-based fallbacks
const UPS_ENV = process.env.UPS_ENV || 'development';
const UPS_URLS = {
    development: {
        auth: 'https://wwwcie.ups.com/security/v1/oauth/token',
        locations: 'https://wwwcie.ups.com/api/locations/v2/search/availabilities/1'
    },
    production: {
        auth: 'https://onlinetools.ups.com/security/v1/oauth/token',
        locations: 'https://onlinetools.ups.com/api/locations/v2/search/availabilities/1'
    }
};

const UPS_AUTH_URL = process.env.UPS_AUTH_URL || UPS_URLS[UPS_ENV].auth;
const UPS_BASE_URL = process.env.UPS_BASE_URL || UPS_URLS[UPS_ENV].locations;

const DEFAULT_SEARCH_CRITERIA = {
    maxResults: 10,
    radius: 25, // miles
    serviceTypes: ['01'], // 01 = Daily Pickup
    searchOptions: {
        ReturnAllLocations: false,
        ShowNonPickupLocations: false,
        ShowClosedLocations: false,
        SortBy: 'Distance'
    },
    filters: {
        AccessPointSearch: {
            PublicAccessPoint: true,
            RetailLocation: true
        },
        DropoffFacilities: {
            DropoffFacility: true,
            HoldForPickup: true
        },
        OperatingHours: {
            SundayHours: false,
            After5PMHours: true,
            After6PMHours: false
        }
    }
};

module.exports = {
    LOCATION_CACHE_DURATION,
    DEFAULT_SEARCH_CRITERIA,
    UPS_AUTH_URL,
    UPS_BASE_URL,
    TOKEN_TABLE: exports.TOKEN_TABLE,
    LOCATIONS_TABLE: exports.LOCATIONS_TABLE,
    TOKEN_KEY: exports.TOKEN_KEY,
    CLIENT_ID: exports.CLIENT_ID,
    CLIENT_SECRET: exports.CLIENT_SECRET
}; 