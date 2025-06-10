# Vinoshipper Integration Project

This repository contains a Node.js AWS Lambda function for compliance checking and Shopify customer tagging, integrated with Vinoshipper and Shopify APIs. The project is built and deployed using AWS SAM.

---

## Features

- **Compliance Check:**  
  Validates orders using the Vinoshipper API and caches compliant results in DynamoDB.

- **Shopify Customer Tagging:**  
  Tags compliant customers in Shopify and updates their address using the Shopify Admin GraphQL API.

- **CORS Support:**  
  API is CORS-enabled for third-party integrations.

- **Environment Variable Management:**  
  Sensitive credentials are managed via environment variables and `.env` (for local development).

---

## Project Structure

```
.
├── src/
│   └── compliance/
│       ├── compliance.js      # Lambda handler
│       ├── dynamodb.js        # DynamoDB helpers
│       ├── shopify.js         # Shopify GraphQL helpers
│       └── utils.js           # Utility functions
├── template.yaml              # AWS SAM template
├── package.json
├── .env                       # Local environment variables (not committed)
├── .gitignore
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- AWS credentials configured

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/blairlott/VinoshipperIntegration.git
   cd VinoshipperIntegration
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Create a `.env` file for local development:**
   ```
   VINOSHIPPER_USERNAME=your_vinoshipper_username
   VINOSHIPPER_PASSWORD=your_vinoshipper_password
   COMPLIANCE_CACHE_TABLE=ComplianceCache
   SHOPIFY_DOMAIN=yourshop.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your_shopify_access_token
   NODE_ENV=development
   ```

---

## Deployment

You can deploy using the provided script or manually:

### Using the script

```sh
./deploy.sh
```

### Manually

```sh
sam build
sam deploy --parameter-overrides \
  VinoShipperUsername=your_vinoshipper_username \
  VinoShipperPassword=your_vinoshipper_password \
  ShopifyDomain=yourshop.myshopify.com \
  ShopifyAccessToken=your_shopify_access_token
```

---

## Security

- **Never commit secrets:**  
  The `.env` file and other sensitive files are excluded via `.gitignore`.
- **Secrets in AWS:**  
  For production, use AWS Lambda environment variables or AWS Secrets Manager.

---

## Testing

A sample script `test-cors.js` is provided to test CORS and API responses.

---

## License

MIT

---

## Author

[blairlott](https://github.com/blairlott)