const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.COMPLIANCE_CACHE_TABLE;
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

async function getCachedCompliance(customerKey) {
  return ddbDocClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { customerKey }
  }));
}

async function saveCompliance(customerKey, data) {
  return ddbDocClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      customerKey,
      compliance: data,
      vinoshipperResponse: data,
      createdAt: Date.now()
    }
  }));
}

module.exports = { getCachedCompliance, saveCompliance };