const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { ShopifyService } = require('./shopify.service');
const { VinoshipperService } = require('./vinoshipper.service');
const { logger } = require('../utils/logger');

class SyncService {
  constructor() {
    const client = new DynamoDBClient({});
    this.dynamoDB = DynamoDBDocumentClient.from(client);
    this.shopifyService = new ShopifyService();
    this.vinoshipperService = new VinoshipperService();
    this.SYNC_TABLE = process.env.SYNC_TABLE || 'ProductSyncTable';
  }

  async syncProducts() {
    try {
      // Fetch all products from Vinoshipper
      const vinoshipperProducts = await this.vinoshipperService.getProductById('158960');
      
      for (const product of vinoshipperProducts) {
        try {
          // Check if product was already synced
          const syncStatus = await this.getSyncStatus(product.id);
          
          if (syncStatus && syncStatus.status === 'success') {
            logger.info(`Product ${product.id} already synced successfully, skipping...`);
            continue;
          }

          // Transform Vinoshipper product to Shopify format
          const shopifyProduct = this.transformToShopifyFormat(product);
          
          // Create or update product in Shopify
          const shopifyResponse = await this.shopifyService.createOrUpdateProduct(shopifyProduct);
          
          // Update sync status with Shopify data
          await this.updateSyncStatus({
            productId: product.id,
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

          logger.info(`Successfully synced product ${product.id} to Shopify`);
        } catch (error) {
          logger.error(`Failed to sync product ${product.id}:`, error);
          
          // Update sync status with error
          await this.updateSyncStatus({
            productId: product.id,
            lastSyncedAt: new Date().toISOString(),
            status: 'failed',
            error: error.message
          });
        }
      }
    } catch (error) {
      logger.error('Failed to sync products:', error);
      throw error;
    }
  }

  async getSyncStatus(productId) {
    try {
      const command = new GetCommand({
        TableName: this.SYNC_TABLE,
        Key: { productId }
      });

      const result = await this.dynamoDB.send(command);
      return result.Item || null;
    } catch (error) {
      logger.error(`Failed to get sync status for product ${productId}:`, error);
      return null;
    }
  }

  async updateSyncStatus(status) {
    try {
      const command = new PutCommand({
        TableName: this.SYNC_TABLE,
        Item: status
      });

      await this.dynamoDB.send(command);
    } catch (error) {
      logger.error(`Failed to update sync status for product ${status.productId}:`, error);
      throw error;
    }
  }

  transformToShopifyFormat(vinoshipperProduct) {
    return {
      title: vinoshipperProduct.name || vinoshipperProduct.displayName || 'Untitled',
      body_html: `<p>${vinoshipperProduct.desc || ''}</p>`,
      vendor: 'Rescue Dog Wines',
      product_type: vinoshipperProduct.productCategory || 'Misc',
      tags: vinoshipperProduct.alcohol === false ? 'non-alcoholic' : '',
      handle: vinoshipperProduct.urlSlug?.split('/').pop() || vinoshipperProduct.name?.toLowerCase().replace(/\s+/g, '-'),
      status: 'active',
      options: [
        {
          name: 'Title',
          values: ['Default']
        }
      ],
      variants: [
        {
          option1: 'Default',
          price: vinoshipperProduct.price?.toFixed(2) || '0.00',
          sku: vinoshipperProduct.sku || '',
          inventory_management: 'shopify',
          inventory_policy: 'deny',
          fulfillment_service: 'manual',
          weight: vinoshipperProduct.weight?.lbs ? (vinoshipperProduct.weight.lbs * 0.453592).toFixed(2) : 0.45,
          weight_unit: 'kg'
        }
      ],
      images: vinoshipperProduct.img
        ? [
            {
              src: vinoshipperProduct.img,
              alt: vinoshipperProduct.name || 'Product image'
            }
          ]
        : []
    };
  }
}

module.exports = { SyncService }; 