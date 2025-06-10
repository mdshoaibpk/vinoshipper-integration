const axios = require('axios');
const { logger } = require('../utils/logger');

class ShopifyService {
  constructor() {
    this.domain = process.env.SHOPIFY_DOMAIN;
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    this.baseUrl = `https://${this.domain}/admin/api/2024-01`;
  }

  async createOrUpdateProduct(product) {
    try {
      const response = await axios.post(`${this.baseUrl}/products.json`, {
        product
      }, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create/update product in Shopify:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = { ShopifyService }; 