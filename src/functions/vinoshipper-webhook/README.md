# Vinoshipper Webhook Handler

This Lambda function handles webhooks from Vinoshipper to update Shopify orders with tracking information and status updates.

## Functionality

- Receives webhook notifications from Vinoshipper when order status changes
- Extracts Shopify order number from Vinoshipper order number (format: `RDW-SHPFY-{shopifyOrderNumber}`)
- Updates Shopify orders with tracking information when orders are shipped
- Handles different order statuses (shipped, cancelled, pending, processing)

## API Endpoint

- **Path**: `/vinoshipper/webhook/order`
- **Method**: `POST`
- **Authentication**: None (webhook endpoint)

## Expected Webhook Payload

```json
{
  "id": "vinoshipper_order_id",
  "orderNumber": "RDW-SHPFY-12345",
  "status": "shipped",
  "trackingNumber": "1Z999AA1234567890",
  "carrier": "UPS",
  "trackingUrl": "https://www.ups.com/track?tracknum=1Z999AA1234567890"
}
```

## Environment Variables

- `SHOPIFY_DOMAIN`: Shopify store domain
- `SHOPIFY_ACCESS_TOKEN`: Shopify access token for API calls

## Response Format

### Success Response (200)
```json
{
  "message": "Webhook processed successfully",
  "result": {
    "success": true,
    "action": "fulfilled",
    "shopifyOrderNumber": "12345",
    "vinoshipperOrderId": "vinoshipper_order_id",
    "trackingNumber": "1Z999AA1234567890",
    "shopifyFulfillmentId": "fulfillment_id"
  }
}
```

### Error Response (400/500)
```json
{
  "message": "Error message",
  "error": "Detailed error description"
}
```

## Order Status Handling

- **shipped/fulfilled**: Creates Shopify fulfillment with tracking information
- **cancelled**: Logs cancellation (Shopify doesn't support order cancellation via API)
- **pending/processing**: Logs status update
- **unknown**: Logs with warning

## Dependencies

- `axios`: For making HTTP requests to Shopify API
- Custom logger utility for consistent logging 