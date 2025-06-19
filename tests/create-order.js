const axios = require('axios');

const options = {
  method: 'POST',
  url: 'https://vinoshipper.com/api/v3/p/orders',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Basic MjIxMi5CQTlENDQ2MTg4N0Q0NDQ0OkIzNllyYTlvVHM2WWFjRFhJTFVaamdJRFZlTnpVNlE3bW1sbHVwYmh6WlFB'
  },
  data: {
    paid: true,
    customer: {
      address: {
        street1: '1370 Railroad Ave',
        city: 'ST. HELENA',
        postalCode: '94574-1124',
        stateCode: 'CA'
      },
      email: 'mdshoaibpk@hotmail.com',
      firstName: 'blair',
      lastName: 'lott',
      phone: '12035543466'
    },
    shipToAddress: {
      country: 'US',
      phone: { number: '12035543466', country: 1 },
      postalCode: '94574-1124',
      stateCode: 'CA',
      city: 'ST. HELENA',
      street1: '1370 Railroad Ave',
      street2: '.D2R.U67583539',
      upsAccessPointId: ''
    },
    shippingRate: { rateCode: '03', carrier: 'UPS' },
    products: [ { productId: 158960, quantity: 1, price: 10 } ],
    productIdType: 'VS_ID',
    orderNumber: 'RDW-SHPFY-1209A',
    orderDate: '2025-06-19T08:25:41-04:00',
    totalPrice: 15.73,
    shippingPrice: 0,
    tax: 0.83
  }
};

async function createOrder() {
  const response = await axios.request(options);
  console.log(response.data);
}

createOrder();

//   const response = {
//   "orderNumber": "92923446894",
//   "sourceUrl": null,
//   "status": "PENDING",
//   "orderStatus": "OPEN",
//   "customer": {
//     "email": "mdshoaibpk@hotmail.com",
//     "firstName": "Shoaib",
//     "lastName": "Manj",
//     "address": {
//       "street1": "123 fork rd",
//       "street2": null,
//       "city": "Atlanta",
//       "postalCode": "GA",
//       "stateCode": "30005"
//     },
//     "dateOfBirth": null,
//     "wholesale": false,
//     "company": null,
//     "id": null,
//     "fullName": "Shoaib Manj",
//     "customerSince": null
//   },
//   "shipToAddress": {
//     "id": null,
//     "salutation": null,
//     "firstName": "Shoaib",
//     "lastName": "Manj",
//     "businessName": null,
//     "fullName": "Shoaib Manj",
//     "street1": "123 fork rd",
//     "street2": null,
//     "city": "Atlanta",
//     "postalCode": "30005",
//     "stateCode": "GA",
//     "country": "US",
//     "phoneNumber": "2035543466",
//     "phone": {
//       "number": "2035543466",
//       "country": null,
//       "extension": null
//     },
//     "accessPoint": {
//       "id": 1225501,
//       "locationId": "139728",
//       "lat": 33.98313903,
//       "lng": -84.3487091,
//       "imageUrl": "https://www.ups.com/rms/image?id=48E6C74C-6813-44C4-BE2C-D21B937201E7",
//       "hours": "Mon: 9:00am-8:00pm; Tue-Fri: 9:00am-7:30pm; Sat, Sun: 10:00am-6:00pm",
//       "note": "",
//       "businessName": "THE UPS STORE",
//       "street1": "8343 ROSWELL RD",
//       "street2": "",
//       "city": "ATLANTA",
//       "postalCode": "30350",
//       "stateCode": "GA",
//       "country": "US",
//       "phoneNumber": "7709939777"
//     },
//     "description": null,
//     "suspectedPOBox": false,
//     "poBox": false,
//     "linkedAddress": null
//   },
//   "productDiscount": 0,
//   "shippingDiscount": 0,
//   "products": [
//     {
//       "productId": 158960,
//       "productName": "RDW Cola",
//       "productVintage": null,
//       "sku": "RDW01",
//       "upc": "",
//       "category": "Beverage (Taxable)",
//       "productTaxonomy": {
//         "id": 25,
//         "externalId": "21300",
//         "displayName": "Alcohol-Free Beverage (Non-soda)",
//         "sortOrder": 0
//       },
//       "quantity": 1,
//       "price": 10,
//       "discount": 0,
//       "alcoholPercentage": 0,
//       "packProductId": null,
//       "taxes": {
//         "taxRate": 0.0775,
//         "taxableValue": 10,
//         "taxes": 0.78
//       }
//     }
//   ],
//   "packs": [],
//   "shipping": {
//     "carrier": "UPS",
//     "rateCode": "03",
//     "price": 35,
//     "shipper": {
//       "id": 5514,
//       "name": "Domo Wine Services",
//       "isFulfillmentCenter": true
//     },
//     "rateDescription": "UPS Ground",
//     "packages": [
//       {
//         "carrier": null,
//         "trackingNumber": null,
//         "box": {
//           "weight": {
//             "lbs": 2
//           },
//           "dimensions": {
//             "widthInches": 5,
//             "heightInches": 5,
//             "depthInches": 15
//           },
//           "containsAlcohol": true
//         }
//       }
//     ],
//     "taxes": {
//       "taxRate": 0.0775,
//       "taxableValue": 35,
//       "taxes": 2.71
//     }
//   },
//   "extraFee": 0,
//   "extraFeeDetails": [],
//   "extraFees": [],
//   "extraFeesTotal": 0,
//   "taxesTotal": 3.49,
//   "taxes": {
//     "county": "FULTON",
//     "countyTaxRate": 0.03,
//     "countyReportingCode": "060",
//     "countyTaxes": 1.35,
//     "city": "ALPHARETTA",
//     "cityTaxRate": 0.0075,
//     "cityReportingCode": "060",
//     "cityTaxes": 0.34,
//     "state": "GA",
//     "stateTaxRate": 0.04,
//     "stateTaxes": 1.8,
//     "otherTaxRate": 0,
//     "otherTaxes": 0
//   },
//   "tipAmount": 0,
//   "total": 48.49,
//   "specialInstructions": {
//     "producerNote": null,
//     "giftNote": null,
//     "shipDate": null,
//     "wineryNote": null
//   },
//   "isCompliant": true,
//   "purchasedAt": null,
//   "canceledAt": null,
//   "shippedAt": null,
//   "deliveredAt": null,
//   "metaFields": {},
//   "orderProblems": [],
//   "ageVerification": {
//     "verified": false,
//     "idScanUrl": null
//   },
//   "platformCharges": {
//     "fundsReceived": 48.49,
//     "creditCardFee": 0,
//     "pickPackFee": 0,
//     "vinoshipperFee": -0.94,
//     "shipping": 0,
//     "taxSales": -3.49,
//     "taxExcise": 0,
//     "stateFees": 0,
//     "amountDue": 44.06
//   },
//   "cancelReason": null,
//   "fulfillmentAccount": null,
//   "store": {
//     "id": 2143,
//     "name": "Default Store"
//   }
// }