require('dotenv').config();
const { SyncService } = require('./services/sync.service');
const { logger } = require('./utils/logger');

async function testSync() {
  try {
    const syncService = new SyncService();
    
    // Get products from Vinoshipper
    logger.info('Fetching products from Vinoshipper...');
    const products = await syncService.vinoshipperService.getProductById('158960');
    console.log('Products:', products);
    
    if (!products) {
      logger.error('No product found in Vinoshipper');
      return;
    }

    const testProduct = products;
    logger.info('Testing sync with product:', {
      id: testProduct.id,
      name: testProduct.name,
      sku: testProduct.sku
    });

    // Check sync status
    const syncStatus = await syncService.getSyncStatus(testProduct.id);
    if (syncStatus && syncStatus.status === 'success') {
      logger.info('Product already synced successfully. Shopify data:', syncStatus.shopifyData);
      return;
    }

    // Transform and sync
    logger.info('Transforming product for Shopify...');
    const shopifyProduct = syncService.transformToShopifyFormat(testProduct);
    
    logger.info('Syncing to Shopify...', shopifyProduct);
    const shopifyResponse = await syncService.shopifyService.createOrUpdateProduct(shopifyProduct);
    console.log('Shopify Response:', shopifyResponse);

    // Update sync status with Shopify data
    await syncService.updateSyncStatus({
      productId: testProduct.id,
      lastSyncedAt: new Date().toISOString(),
      status: 'success',
      shopifyData: {
        id: shopifyResponse.product.id,
        handle: shopifyResponse.product.handle,
        variants: shopifyResponse.product.variants.map(v => ({
          id: v.id,
          sku: v.sku
        }))
      }
    });

    logger.info('Successfully synced test product to Shopify');
  } catch (error) {
    logger.error('Test sync failed:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  }
}

// Run the test
testSync().catch(error => {
  logger.error('Unhandled error in test sync:', error);
  process.exit(1);
}); 