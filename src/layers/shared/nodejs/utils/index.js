const logger = require('./logger');
const { client: dynamoClient, docClient } = require('./dynamodb');
const httpClient = require('./http-client');

module.exports = {
  logger,
  dynamoClient,
  docClient,
  httpClient
}; 