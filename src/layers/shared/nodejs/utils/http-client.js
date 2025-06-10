const axios = require('axios');
const logger = require('./logger');

const httpClient = axios.create({
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for logging
httpClient.interceptors.request.use(
  (config) => {
    logger.info('Making HTTP request', {
      method: config.method,
      url: config.url,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    logger.error('HTTP request error', { error: error.message });
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
httpClient.interceptors.response.use(
  (response) => {
    logger.info('Received HTTP response', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url
    });
    return response;
  },
  (error) => {
    logger.error('HTTP response error', {
      error: error.message,
      url: error.config?.url,
      status: error.response?.status
    });
    return Promise.reject(error);
  }
);

module.exports = httpClient; 