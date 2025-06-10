const axios = require('axios');
const { logger } = require('../utils/logger');

class VinoshipperService {
  constructor() {
    this.username = process.env.VINOSHIPPER_USERNAME;
    this.password = process.env.VINOSHIPPER_PASSWORD;
    this.baseUrl = process.env.VINOSHIPPER_API_URL || 'https://vinoshipper.com/api/v3';
    this.producerId = '2212';
    
    if (!this.username || !this.password) {
      throw new Error('Vinoshipper username and password are required');
    }
  }

  async getAllProducts() {
    try {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      const response = await axios.get(`${this.baseUrl}/feeds/vs/${this.producerId}/products`, {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
      });
      return response.data?.products;
    } catch (error) {
      logger.error('Failed to fetch products from Vinoshipper:', error.response?.data || error.message);
      throw error;
    }
  }

  async getProductById(productId) {
    try {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      const response = await axios.get(`${this.baseUrl}/feeds/vs/${this.producerId}/products/${String(productId)}`, {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'Authorization': `Basic ${auth}`,
        }
      });

      logger.info('Vinoshipper API Response:', response.data);

      // Ensure product ID is a string in the response
      if (response.data) {
        response.data.id = String(response.data.id);
        logger.info('Product ID after conversion:', response.data.id, typeof response.data.id);
      }

      return [response.data];
    } catch (error) {
      logger.error(`Failed to fetch product ${productId} from Vinoshipper:`, error.response?.data || error.message);
      throw error.message;
    }
  }
}

module.exports = { VinoshipperService }; 