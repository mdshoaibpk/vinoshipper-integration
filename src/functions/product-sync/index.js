const { SyncService } = require('./services/sync.service');
const { logger } = require('./utils/logger');

exports.handler = async (event) => {
  try {
    const syncService = new SyncService();
    await syncService.syncProducts();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Product synchronization completed successfully'
      })
    };
  } catch (error) {
    logger.error('Failed to sync products:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Failed to sync products',
        error: error.message
      })
    };
  }
}; 