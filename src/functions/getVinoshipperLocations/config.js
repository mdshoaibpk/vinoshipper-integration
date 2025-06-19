// DynamoDB Table Names
exports.LOCATIONS_TABLE = process.env.LOCATIONS_TABLE || 'UpsLocations';

// Vinoshipper API Configuration
exports.VINOSHIPPER_USERNAME = process.env.VINOSHIPPER_USERNAME;
exports.VINOSHIPPER_PASSWORD = process.env.VINOSHIPPER_PASSWORD;
exports.VINOSHIPPER_API_URL = process.env.VINOSHIPPER_API_URL || 'https://vinoshipper.com/api/v3';

// Cache Configuration (24 hours in milliseconds)
const LOCATION_CACHE_DURATION = 24 * 60 * 60 * 1000;

module.exports = {
    LOCATION_CACHE_DURATION,
    VINOSHIPPER_API_URL: exports.VINOSHIPPER_API_URL,
    LOCATIONS_TABLE: exports.LOCATIONS_TABLE,
    VINOSHIPPER_USERNAME: exports.VINOSHIPPER_USERNAME,
    VINOSHIPPER_PASSWORD: exports.VINOSHIPPER_PASSWORD
}; 