# API Contract v0.5

Base URL:

- Production: `https://api.ecloria.co.uk`
- Local: `http://localhost:5000`

Content-Type:

- Request: `application/json`
- Response: `application/json`

Authorization:

- Authenticated endpoints require `Authorization: Bearer <token>`

## Client Compatibility Policy

The `Customer-Facing` and `Admin` sections below are the active contract for the current web admin and mobile work.

Until both clients finish the tasks already assigned:

- do not remove existing endpoints from these sections
- do not rename existing request fields
- do not rename existing response fields
- do not change field types
- do not move customer-facing behavior into different paths
- future backend work must be additive:
  - add new optional fields only
  - add new endpoints under `/admin/*` or internal webhook paths
  - use new endpoints for new workflows instead of breaking current ones

If a breaking change is ever required later, it must go through a new path or an explicit versioned contract.

## Response Rules

### Success

- API returns JSON
- Use HTTP status codes consistently

### Error

Shared format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload"
  }
}
```

Common error codes:

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `INTERNAL_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `CONFLICT`

## Product Model

```json
{
  "id": 1,
  "sku": "TSHIRT-001",
  "name": "Classic T-Shirt",
  "basePrice": 199000,
  "categoryId": 1,
  "category": "apparel",
  "imageUrl": "https://assets.ecloria.co.uk/products/1/main-1712736000000.jpeg",
  "stockQty": 20,
  "reservedQty": 0,
  "availableQty": 20,
  "minStockLevel": 5,
  "createdAt": "2026-04-02T10:00:00.000Z"
}
```

## Category Model

```json
{
  "id": 1,
  "name": "Apparel",
  "slug": "apparel",
  "createdAt": "2026-04-02T10:00:00.000Z",
  "updatedAt": "2026-04-02T10:00:00.000Z"
}
```

## Order Item Model

```json
{
  "id": 1,
  "productId": 1,
  "quantity": 2,
  "priceAtPurchase": 199000
}
```

## Customer Model

```json
{
  "id": 1,
  "fullName": "Nguyen Van A",
  "phone": "0901234567",
  "email": "nguyenvana@example.com"
}
```

## Customer Address Model

```json
{
  "id": 1,
  "customerId": 1,
  "label": "home",
  "receiverName": "Nguyen Van A",
  "receiverPhone": "0901234567",
  "addressLine": "123 Nguyen Trai",
  "provinceCode": "79",
  "districtCode": "760",
  "wardCode": "26734",
  "ward": "Ward 2",
  "district": "District 5",
  "city": "Ho Chi Minh City",
  "country": "Vietnam",
  "postalCode": "700000",
  "isDefault": true,
  "createdAt": "2026-04-02T10:00:00.000Z",
  "updatedAt": "2026-04-02T10:00:00.000Z"
}
```

## Shipping Snapshot Model

```json
{
  "receiverName": "Nguyen Van A",
  "receiverPhone": "0901234567",
  "addressLine": "123 Nguyen Trai",
  "provinceCode": "79",
  "districtCode": "760",
  "wardCode": "26734",
  "ward": "Ward 2",
  "district": "District 5",
  "city": "Ho Chi Minh City",
  "country": "Vietnam",
  "postalCode": "700000",
  "fullAddress": "123 Nguyen Trai, Ward 2, District 5, Ho Chi Minh City, Vietnam"
}
```

## Issue Model

```json
{
  "id": 1,
  "orderId": 12,
  "productId": null,
  "type": "DELIVERY_FAILED",
  "severity": "high",
  "status": "open",
  "logHistory": [],
  "createdAt": "2026-04-02T10:00:00.000Z",
  "updatedAt": "2026-04-02T10:00:00.000Z"
}
```

## Delivery Event Model

```json
{
  "id": 1,
  "orderId": 12,
  "partner": "GHN",
  "externalEventId": "ev_001",
  "status": "FAILED",
  "reason": "CUSTOMER_UNREACHABLE",
  "payload": {
    "orderId": 12,
    "status": "FAILED",
    "reason": "CUSTOMER_UNREACHABLE",
    "partner": "GHN"
  },
  "createdAt": "2026-04-02T10:00:00.000Z"
}
```

## Refund Request Model

```json
{
  "id": 1,
  "orderId": 12,
  "customerId": 4,
  "orderAmount": 219000,
  "customerEmail": "customer@example.com",
  "imageUrl": "https://example.com/evidence.jpg",
  "reason": "Product was damaged on arrival",
  "status": "pending",
  "abuseScoreSnapshot": 1,
  "reviewNote": null,
  "createdAt": "2026-04-02T10:00:00.000Z",
  "updatedAt": "2026-04-02T10:00:00.000Z"
}
```

Notes:

- `orderAmount` and `customerEmail` are returned by `GET /admin/refund-requests/:id`
- list and status-update responses do not currently include `orderAmount` or `customerEmail`

## Auth Response Model

```json
{
  "token": "jwt-token",
  "customer": {
    "id": 1,
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "email": "nguyenvana@example.com",
    "role": "customer",
    "abuseScore": 0,
    "isBlacklisted": false,
    "createdAt": "2026-04-02T10:00:00.000Z",
    "updatedAt": "2026-04-02T10:00:00.000Z"
  }
}
```

## Order Model

```json
{
  "id": 1,
  "status": "pending",
  "totalAmount": 438000,
  "shippingFee": 40000,
  "paymentExpiresAt": "2026-04-03T10:15:00.000Z",
  "failCount": 0,
  "customerAddressId": 1,
  "shippingAddress": "123 Nguyen Trai, HCMC",
  "city": "Ho Chi Minh City",
  "addressChangeStatus": "requested",
  "addressChangePayload": {
    "receiverName": "Nguyen Van A",
    "receiverPhone": "0901234567",
    "addressLine": "88 Nguyen Van Linh",
    "ward": "Hai Chau 1",
    "district": "Hai Chau",
    "city": "Da Nang",
    "fullAddress": "88 Nguyen Van Linh, Hai Chau 1, Hai Chau, Da Nang, Vietnam",
    "calculatedShippingFee": 40000,
    "processingFee": 10000,
    "currentShippingFee": 40000
  },
  "shipping": {
    "receiverName": "Nguyen Van A",
    "receiverPhone": "0901234567",
    "addressLine": "123 Nguyen Trai",
    "provinceCode": "79",
    "districtCode": "760",
    "wardCode": "26734",
    "ward": "Ward 2",
    "district": "District 5",
    "city": "Ho Chi Minh City",
    "country": "Vietnam",
    "postalCode": "700000",
    "fullAddress": "123 Nguyen Trai, Ward 2, District 5, Ho Chi Minh City, Vietnam"
  },
  "customer": {
    "id": 1,
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "email": "nguyenvana@example.com"
  },
  "items": [
    {
      "id": 1,
      "productId": 1,
      "quantity": 2,
      "priceAtPurchase": 199000
    }
  ],
  "createdAt": "2026-04-02T10:15:00.000Z",
  "updatedAt": "2026-04-02T10:15:00.000Z"
}
```

Notes:

- `addressChangeStatus` and `addressChangePayload` are currently returned by admin order endpoints
- `addressChangePayload` is `null` unless an address change request is pending or preserved on the order

## Endpoints

### Customer-Facing

### `GET /health`

Check backend status.

Response `200`:

```json
{
  "ok": true,
  "service": "backend"
}
```

### `POST /auth/register`

Register a new customer account.

Request body:

```json
{
  "fullName": "Nguyen Van A",
  "phone": "0901234567",
  "email": "nguyenvana@example.com",
  "password": "secret123"
}
```

Rules:

- `fullName`: required
- `phone`: required
- `email`: required
- `password`: required, minimum 8 characters

Response `201`:

```json
{
  "customer": {
    "id": 1,
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "email": "nguyenvana@example.com",
    "role": "customer",
    "abuseScore": 0,
    "isBlacklisted": false,
    "createdAt": "2026-04-02T10:00:00.000Z",
    "updatedAt": "2026-04-02T10:00:00.000Z"
  }
}
```

Response `409`:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Customer already exists"
  }
}
```

Response `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "password must be at least 8 characters"
  }
}
```

### `POST /auth/login`

Login with email and password.

Request body:

```json
{
  "email": "nguyenvana@example.com",
  "password": "secret123"
}
```

Response `200`:

```json
{
  "token": "jwt-token",
  "customer": {
    "id": 1,
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "email": "nguyenvana@example.com",
    "role": "customer",
    "abuseScore": 0,
    "isBlacklisted": false,
    "createdAt": "2026-04-02T10:00:00.000Z",
    "updatedAt": "2026-04-02T10:00:00.000Z"
  }
}
```

Response `401`:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

Response `403`:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Customer is blacklisted"
  }
}
```

Response `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email is required"
  }
}
```

### `GET /me`

Get the authenticated customer profile.

Response `200`:

```json
{
  "customer": {
    "id": 1,
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "email": "nguyenvana@example.com",
    "role": "customer",
    "abuseScore": 0,
    "isBlacklisted": false,
    "createdAt": "2026-04-02T10:00:00.000Z",
    "updatedAt": "2026-04-02T10:00:00.000Z"
  }
}
```

### `GET /me/addresses`

Get all addresses of the authenticated customer.

Response `200`:

- array of `Customer Address Model`

### `POST /me/addresses`

Create a new address for the authenticated customer.

Request body example:

```json
{
  "label": "home",
  "receiverName": "Nguyen Van A",
  "receiverPhone": "0901234567",
  "addressLine": "123 Nguyen Trai",
  "provinceCode": "79",
  "districtCode": "760",
  "wardCode": "26734",
  "ward": "Ward 2",
  "district": "District 5",
  "city": "Ho Chi Minh City",
  "country": "Vietnam",
  "postalCode": "700000",
  "isDefault": true
}
```

Rules:

- `receiverName`, `receiverPhone`, `addressLine`, and `city` are required
- `provinceCode`, `districtCode`, and `wardCode` are optional additive fields for precise Vietnam administrative mapping
- existing clients can continue sending only text fields (`ward`, `district`, `city`)

Response `201`:

- `Customer Address Model`

### `PATCH /me/addresses/:addressId`

Update one address of the authenticated customer.

Response `200`:

- `Customer Address Model`

### `DELETE /me/addresses/:addressId`

Delete one address of the authenticated customer.

Response `204`:

- empty body

### `GET /locations/provinces`

Get the Vietnam province/city list for address pickers.

Response `200`:

```json
[
  {
    "code": 48,
    "name": "Thành phố Đà Nẵng",
    "divisionType": "thành phố trung ương",
    "codename": "thanh_pho_da_nang",
    "phoneCode": 236
  }
]
```

### `GET /locations/provinces/:provinceCode/districts`

Get the district list for one province.

Response `200`:

```json
[
  {
    "code": 493,
    "name": "Quận Sơn Trà",
    "divisionType": "quận",
    "codename": "quan_son_tra",
    "provinceCode": 48
  }
]
```

### `GET /locations/districts/:districtCode/wards`

Get the ward list for one district.

Response `200`:

```json
[
  {
    "code": 20194,
    "name": "Phường Hòa Hiệp Bắc",
    "divisionType": "phường",
    "codename": "phuong_hoa_hiep_bac",
    "districtCode": 490
  }
]
```

### Admin

Preferred admin order routes:

- `GET /admin/inventory`
- `GET /admin/analytics/sales-by-product`
- `GET /admin/products`
- `GET /admin/products/:id`
- `POST /admin/products`
- `PATCH /admin/products/:id`
- `DELETE /admin/products/:id`
- `GET /admin/categories`
- `GET /admin/categories/:id`
- `POST /admin/categories`
- `PATCH /admin/categories/:id`
- `DELETE /admin/categories/:id`
- `GET /admin/orders`
- `GET /admin/orders/:id`
- `PATCH /admin/orders/:id/status`
- `GET /admin/orders/:id/delivery-events`
- `POST /admin/uploads/presign`
- `PATCH /admin/products/:id/image`

Compatibility note:

- existing admin clients may continue using `PATCH /orders/:id/status`
- new admin work should prefer the `/admin/orders/*` routes

### `GET /admin/orders`

Get admin order list.

Query params:

- `status` optional
- allowed values: `pending`, `processing`, `shipping`, `completed`, `cancelled`, `failed`

Status model:

- `status` is the order lifecycle only
- `paymentStatus` carries payment state such as `payment_pending`, `paid`, `payment_failed`
- `deliveryStatus` carries delivery state such as `ready_to_ship`, `in_transit`, `delivered`

Access rules:

- admin/staff only

Response `200`:

```json
[
  {
    "id": 1,
    "status": "pending",
    "paymentStatus": "unpaid",
    "deliveryStatus": "pending",
    "totalAmount": 418000,
    "shippingFee": 20000,
    "paymentExpiresAt": "2026-04-03T10:15:00.000Z",
    "failCount": 0,
    "customerAddressId": 1,
    "shippingAddress": "123 Nguyen Trai, HCMC",
    "city": "Ho Chi Minh City",
    "shipping": {
      "receiverName": "Nguyen Van A",
      "receiverPhone": "0901234567",
      "addressLine": "123 Nguyen Trai",
      "ward": "Ward 2",
      "district": "District 5",
      "city": "Ho Chi Minh City",
      "country": "Vietnam",
      "postalCode": "700000",
      "fullAddress": "123 Nguyen Trai, Ward 2, District 5, Ho Chi Minh City, Vietnam"
    },
    "customer": {
      "id": 1,
      "fullName": "Nguyen Van A",
      "phone": "0901234567",
      "email": "nguyenvana@example.com"
    },
    "items": [
      {
        "id": 1,
        "productId": 1,
        "quantity": 2,
        "priceAtPurchase": 199000
      }
    ],
    "createdAt": "2026-04-02T10:15:00.000Z",
    "updatedAt": "2026-04-02T10:15:00.000Z"
  }
]
```

### `GET /admin/orders/:id`

Get one order by id for admin/staff.

Access rules:

- admin/staff only

Response `200`:

```json
{
  "id": 1,
  "status": "pending",
  "paymentStatus": "unpaid",
  "deliveryStatus": "pending",
  "totalAmount": 418000,
  "shippingFee": 20000,
  "paymentExpiresAt": "2026-04-03T10:15:00.000Z",
  "failCount": 0,
  "customerAddressId": 1,
  "shippingAddress": "123 Nguyen Trai, HCMC",
  "city": "Ho Chi Minh City",
  "shipping": {
    "receiverName": "Nguyen Van A",
    "receiverPhone": "0901234567",
    "addressLine": "123 Nguyen Trai",
    "ward": "Ward 2",
    "district": "District 5",
    "city": "Ho Chi Minh City",
    "country": "Vietnam",
    "postalCode": "700000",
    "fullAddress": "123 Nguyen Trai, Ward 2, District 5, Ho Chi Minh City, Vietnam"
  },
  "customer": {
    "id": 1,
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "email": "nguyenvana@example.com"
  },
  "items": [
    {
      "id": 1,
      "productId": 1,
      "quantity": 2,
      "priceAtPurchase": 199000
    }
  ],
  "createdAt": "2026-04-02T10:15:00.000Z",
  "updatedAt": "2026-04-02T10:15:00.000Z"
}
```

### `PATCH /admin/orders/:id/status`

Update order status through the admin-specific path.

Access rules:

- admin/staff only

Request body:

```json
{
  "status": "processing"
}
```

Allowed status values:

- `pending`
- `processing`
- `shipping`
- `completed`
- `cancelled`
- `failed`

Notes:

- use `POST /payment-events` to update payment state
- `paid` is represented as `paymentStatus = paid`, not `status = paid`
- payment success may move `status` from `pending` to `processing`

Side effects:

- when status changes to `failed`, backend automatically creates an `issue` record with:
  - `type = ORDER_FAILED`
  - `severity = high`
  - `status = open`

Response `200`:

```json
{
  "id": 1,
  "status": "processing",
  "paymentStatus": "paid",
  "deliveryStatus": "pending",
  "totalAmount": 418000,
  "shippingFee": 20000,
  "paymentExpiresAt": "2026-04-03T10:15:00.000Z",
  "failCount": 0,
  "customerAddressId": 1,
  "shippingAddress": "123 Nguyen Trai, HCMC",
  "city": "Ho Chi Minh City",
  "customer": {
    "id": 1,
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "email": "nguyenvana@example.com"
  },
  "items": [
    {
      "id": 1,
      "productId": 1,
      "quantity": 2,
      "priceAtPurchase": 199000
    }
  ],
  "createdAt": "2026-04-02T10:15:00.000Z",
  "updatedAt": "2026-04-02T10:20:00.000Z"
}
```

### `GET /admin/orders/:id/delivery-events`

Get delivery callback history for one order.

Access rules:

- admin/staff only

Response `200`:

```json
[
  {
    "id": 1,
    "orderId": 12,
    "partner": "GHN",
    "externalEventId": "ev_001",
    "status": "FAILED",
    "reason": "CUSTOMER_UNREACHABLE",
    "payload": {
      "orderId": 12,
      "status": "FAILED",
      "reason": "CUSTOMER_UNREACHABLE",
      "partner": "GHN"
    },
    "createdAt": "2026-04-02T10:00:00.000Z"
  }
]
```

### `POST /admin/orders/:id/address-change-decision`

Approve or reject a pending address change request.

Access rules:

- admin/staff only

Request body:

```json
{
  "decision": "approved",
  "approvedShippingFee": 50000
}
```

Allowed `decision` values:

- `approved`
- `rejected`
- `rejected_timeout`

Rules:

- order must currently have `address_change_status = requested`
- `approvedShippingFee` is optional and only used when `decision = approved`

Response `200`:

```json
{
  "success": true,
  "action": "approved"
}
```

Response `409`:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Order does not have a pending address change request"
  }
}
```

### `GET /admin/refund-requests`

Get refund request list.

Query params:

- `status` optional
- allowed values: `pending`, `manual_review_required`, `approved`, `rejected`, `refunded`

Access rules:

- admin/staff only

Response `200`:

- array of refund request summary objects with:
  - `id`
  - `orderId`
  - `customerId`
  - `imageUrl`
  - `reason`
  - `status`
  - `abuseScoreSnapshot`
  - `reviewNote`
  - `createdAt`
  - `updatedAt`

### `GET /admin/refund-requests/:id`

Get one refund request by id.

Access rules:

- admin/staff only

Response `200`:

- `Refund Request Model`

### `PATCH /admin/refund-requests/:id/status`

Update refund request status.

Access rules:

- admin/staff only

Request body:

```json
{
  "status": "approved",
  "reviewNote": "Approved after manual image verification"
}
```

Allowed `status` values:

- `pending`
- `manual_review_required`
- `approved`
- `rejected`
- `refunded`

Response `200`:

- refund request status object with:
  - `id`
  - `orderId`
  - `customerId`
  - `imageUrl`
  - `reason`
  - `status`
  - `abuseScoreSnapshot`
  - `reviewNote`
  - `createdAt`
  - `updatedAt`

### `GET /admin/system-config`

Get the current admin-editable system configuration.

Access rules:

- admin/staff only

Current keys:

- `payment.active_gateway`
- `payment.maintenance_mode`

Response `200`:

```json
[
  {
    "id": 1,
    "configGroup": "payment",
    "configKey": "payment.active_gateway",
    "configValue": "PAYPAL",
    "configType": "string",
    "description": "Currently active payment gateway for checkout",
    "createdAt": "2026-04-02T10:00:00.000Z",
    "updatedAt": "2026-04-02T10:00:00.000Z"
  },
  {
    "id": 2,
    "configGroup": "payment",
    "configKey": "payment.maintenance_mode",
    "configValue": false,
    "configType": "boolean",
    "description": "Whether payment maintenance mode is enabled",
    "createdAt": "2026-04-02T10:00:00.000Z",
    "updatedAt": "2026-04-02T10:00:00.000Z"
  }
]
```

### `PATCH /admin/system-config`

Update allowed system configuration keys.

Access rules:

- admin/staff only

Request body:

```json
{
  "items": [
    {
      "configKey": "payment.active_gateway",
      "configValue": "BANK_TRANSFER",
      "configType": "string",
      "description": "Currently active payment gateway for checkout"
    },
    {
      "configKey": "payment.maintenance_mode",
      "configValue": true,
      "configType": "boolean",
      "description": "Whether payment maintenance mode is enabled"
    }
  ]
}
```

Rules:

- only whitelisted keys are accepted
- `items` must be a non-empty array
- supported `configType` values:
  - `string`
  - `boolean`
  - `number`

Response `200`:

- array of updated system config records in the same shape as `GET /admin/system-config`

### `GET /admin/payment-incidents/active`

Get the current active payment incident summary.

Access rules:

- admin/staff only

Response `200`:

```json
{
  "active": true,
  "activeGateway": "BANK_TRANSFER",
  "maintenanceMode": true,
  "pendingCount": 12,
  "outageSignalCount": 4,
  "recentSignals": [
    {
      "id": 10,
      "orderId": 12,
      "incidentId": "incident_001",
      "gatewayName": "PAYPAL",
      "transactionRef": "txn_123",
      "source": "payment_service",
      "httpStatus": 503,
      "errorCode": "SERVICE_UNAVAILABLE",
      "paymentStatus": "payment_unknown",
      "rawResponse": {
        "source": "payment_service",
        "gateway": "PAYPAL",
        "httpStatus": 503,
        "errorCode": "SERVICE_UNAVAILABLE",
        "orderId": 12,
        "transactionRef": "txn_123"
      },
      "createdAt": "2026-04-02T10:00:00.000Z"
    }
  ]
}
```

### `GET /admin/payment-logs`

Get raw payment log history for investigation.

Access rules:

- admin/staff only

Query params:

- `gateway` optional
- `orderId` optional
- `transactionRef` optional
- `incidentId` optional

Response `200`:

```json
[
  {
    "id": 10,
    "orderId": 12,
    "incidentId": "incident_001",
    "externalEventId": "evt_001",
    "gatewayName": "PAYPAL",
    "transactionRef": "txn_123",
    "source": "payment_service",
    "httpStatus": 503,
    "errorCode": "SERVICE_UNAVAILABLE",
    "paymentStatus": "payment_unknown",
    "rawResponse": {
      "source": "payment_service",
      "gateway": "PAYPAL",
      "httpStatus": 503,
      "errorCode": "SERVICE_UNAVAILABLE",
      "orderId": 12,
      "transactionRef": "txn_123",
      "externalEventId": "evt_001"
    },
    "createdAt": "2026-04-02T10:00:00.000Z"
  }
]
```

### `GET /admin/issues`

Get issue list for admin or staff.

Query params:

- `status` optional
- `severity` optional
- `type` optional

Response `200`:

- array of `Issue Model`

### `GET /admin/issues/:id`

Get one issue by id for admin or staff.

Response `200`:

- `Issue Model`

### `PATCH /admin/issues/:id/status`

Update issue status for admin or staff.

Request body:

```json
{
  "status": "investigating"
}
```

Allowed `status`:

- `open`
- `investigating`
- `resolved`
- `ignored`

Response `200`:

- `Issue Model`

### Internal / Integration

### `POST /delivery-callback`

Process delivery partner callback.

Headers:

- `X-Internal-Webhook-Secret: <secret>` required

Request body:

```json
{
  "orderId": 12,
  "status": "FAILED",
  "reason": "CUSTOMER_UNREACHABLE",
  "partner": "GHN",
  "externalEventId": "ev_123"
}
```

Allowed `status`:

- `FAILED`
- `DELIVERED`
- `IN_TRANSIT`
- `HANDOVER`
- `RETURNED`

Rules:

- `orderId`: required, positive integer
- `reason`: required when `status = FAILED`
- `externalEventId` is optional
- when `externalEventId` is provided, repeated callbacks with the same value are ignored idempotently

Response `200`:

```json
{
  "success": true,
  "action": "retry_pending",
  "customerEmail": "nguyenvana@example.com"
}
```

Other possible `action` values:

- `delivered`
- `returning`
- `returned`
- `updated`
- `duplicate_ignored`

Side effects:

- `IN_TRANSIT` / `HANDOVER` can move `orders.status` to `shipping`
- `DELIVERED` moves `orders.status` to `completed` and `orders.deliveryStatus` to `delivered`
- when delivery reaches `DELIVERED`, backend records `SALE` inventory transactions once
- when delivery reaches `RETURNED`, backend records `RETURN` inventory transactions once
- after 3 failed delivery callbacks, backend moves `orders.status` to `failed`
- when delivery fails 3 times, backend creates an issue with:
  - `type = DELIVERY_FAILED`
  - `severity = high`
  - `status = open`

### `POST /payment-events`

Process payment incident or failover signal.

Request body:

```json
{
  "source": "payment_service",
  "gateway": "PAYPAL",
  "httpStatus": 503,
  "errorCode": "SERVICE_UNAVAILABLE",
  "orderId": 12,
  "transactionRef": "txn_123",
  "externalEventId": "evt_001"
}
```

Allowed `source`:

- `payment_service`
- `app_client`
- `schedule`

Rules:

- `externalEventId` is optional
- when `externalEventId` is provided, repeated events with the same value are ignored idempotently

Response `200`:

```json
{
  "status": "outage_suspected",
  "action": "logged",
  "paymentStatus": "payment_unknown"
}
```

Other possible `action` values:

- `duplicate_ignored`

Side effects:

- when payment status resolves to `paid`, backend sets `orders.paymentStatus = paid`
- if the order is still `pending`, payment success moves `orders.status` to `processing`
- when payment status resolves to `payment_failed`, backend sets `orders.status = failed`
- payment failure rolls back reserved inventory through the normal order lifecycle

### `GET /products`

Get the product list.

Response `200`:

```json
[
  {
    "id": 1,
    "sku": "TSHIRT-001",
    "name": "Classic T-Shirt",
    "basePrice": 199000,
    "categoryId": 1,
    "category": "apparel",
    "imageUrl": "https://assets.ecloria.co.uk/products/1/main-1712736000000.jpeg",
    "stockQty": 20,
    "reservedQty": 0,
    "availableQty": 20,
    "minStockLevel": 5,
    "createdAt": "2026-04-02T10:00:00.000Z"
  }
]
```

### `GET /products/:id`

Get product details.

Response `200`:

```json
{
  "id": 1,
  "sku": "TSHIRT-001",
  "name": "Classic T-Shirt",
  "basePrice": 199000,
  "categoryId": 1,
  "category": "apparel",
  "imageUrl": "https://assets.ecloria.co.uk/products/1/main-1712736000000.jpeg",
  "stockQty": 20,
  "reservedQty": 0,
  "availableQty": 20,
  "minStockLevel": 5,
  "createdAt": "2026-04-02T10:00:00.000Z"
}
```

### `GET /categories`

Get the public category list.

Response `200`:

```json
[
  {
    "id": 1,
    "name": "Apparel",
    "slug": "apparel",
    "createdAt": "2026-04-02T10:00:00.000Z",
    "updatedAt": "2026-04-02T10:00:00.000Z"
  }
]
```

Response `404`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Product not found"
  }
}
```

Response `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Product id must be a positive integer"
  }
}
```

### `POST /admin/uploads/presign`

Create a presigned R2 upload URL for a product image.

Access rules:

- admin/staff only

Request body:

```json
{
  "productId": 1,
  "fileName": "classic-tshirt.jpg",
  "contentType": "image/jpeg"
}
```

Allowed `contentType` values:

- `image/jpeg`
- `image/png`
- `image/webp`
- `image/gif`

Response `201`:

```json
{
  "uploadUrl": "https://<account_id>.r2.cloudflarestorage.com/styleflow-assets/products/1/main-1712736000000.jpeg?...",
  "objectKey": "products/1/main-1712736000000.jpeg",
  "publicUrl": "https://assets.ecloria.co.uk/products/1/main-1712736000000.jpeg",
  "expiresIn": 300
}
```

### `PATCH /admin/products/:id/image`

Save the uploaded product image URL.

Access rules:

- admin/staff only

Request body:

```json
{
  "imageUrl": "https://assets.ecloria.co.uk/products/1/main-1712736000000.jpeg"
}
```

Response `200`:

```json
{
  "id": 1,
  "sku": "TSHIRT-001",
  "name": "Classic T-Shirt",
  "basePrice": 199000,
  "categoryId": 1,
  "category": "apparel",
  "imageUrl": "https://assets.ecloria.co.uk/products/1/main-1712736000000.jpeg",
  "stockQty": 20,
  "reservedQty": 0,
  "availableQty": 20,
  "minStockLevel": 5,
  "createdAt": "2026-04-02T10:00:00.000Z"
}
```

### `GET /admin/products`

Get the admin product list with inventory fields.

Access rules:

- admin/staff only

Response `200`:

```json
[
  {
    "id": 1,
    "sku": "TSHIRT-001",
    "name": "Classic T-Shirt",
    "basePrice": 199000,
    "category": "apparel",
    "imageUrl": "https://assets.ecloria.co.uk/products/1/main-1712736000000.jpeg",
    "stockQty": 20,
    "reservedQty": 0,
    "availableQty": 20,
    "minStockLevel": 5,
    "createdAt": "2026-04-02T10:00:00.000Z"
  }
]
```

### `GET /admin/products/:id`

Get one product for admin/staff.

Access rules:

- admin/staff only

Response `200`:

```json
{
  "id": 1,
  "sku": "TSHIRT-001",
  "name": "Classic T-Shirt",
  "basePrice": 199000,
  "categoryId": 1,
  "category": "apparel",
  "imageUrl": "https://assets.ecloria.co.uk/products/1/main-1712736000000.jpeg",
  "stockQty": 20,
  "reservedQty": 0,
  "availableQty": 20,
  "minStockLevel": 5,
  "createdAt": "2026-04-02T10:00:00.000Z"
}
```

### `POST /admin/products`

Create a new product and its inventory row.

Access rules:

- admin/staff only

Request body:

```json
{
  "sku": "CAP-001",
  "name": "Baseball Cap",
  "basePrice": 159000,
  "categoryId": 2,
  "imageUrl": "https://assets.ecloria.co.uk/products/4/main-1712736000000.jpeg",
  "stockQty": 15,
  "minStockLevel": 3
}
```

Notes:

- `imageUrl` is optional
- `stockQty` defaults to `0`
- `minStockLevel` defaults to `5`
- send either `categoryId` or `category`
- when both are provided, backend resolves by `categoryId`

Response `201`:

```json
{
  "id": 4,
  "sku": "CAP-001",
  "name": "Baseball Cap",
  "basePrice": 159000,
  "categoryId": 2,
  "category": "accessories",
  "imageUrl": "https://assets.ecloria.co.uk/products/4/main-1712736000000.jpeg",
  "stockQty": 15,
  "reservedQty": 0,
  "availableQty": 15,
  "minStockLevel": 3,
  "createdAt": "2026-04-02T10:00:00.000Z"
}
```

### `PATCH /admin/products/:id`

Update product fields and inventory settings.

Access rules:

- admin/staff only

Request body:

```json
{
  "name": "Classic T-Shirt Oversized",
  "basePrice": 219000,
  "categoryId": 1,
  "imageUrl": "https://assets.ecloria.co.uk/products/1/main-1712736000001.jpeg",
  "stockQty": 25,
  "minStockLevel": 6
}
```

Rules:

- all fields are optional
- `stockQty` cannot be lower than current `reservedQty`
- `categoryId` must reference an existing category if provided

Response `200`:

```json
{
  "id": 1,
  "sku": "TSHIRT-001",
  "name": "Classic T-Shirt Oversized",
  "basePrice": 219000,
  "categoryId": 1,
  "category": "apparel",
  "imageUrl": "https://assets.ecloria.co.uk/products/1/main-1712736000001.jpeg",
  "stockQty": 25,
  "reservedQty": 0,
  "availableQty": 25,
  "minStockLevel": 6,
  "createdAt": "2026-04-02T10:00:00.000Z"
}
```

### `DELETE /admin/products/:id`

Delete a product.

Access rules:

- admin/staff only

Rules:

- returns `409 CONFLICT` if the product is referenced by existing records such as `order_items`

Response `204`:

- no content

### `GET /admin/inventory`

Get the current inventory snapshot with warehouse analytics fields.

Access rules:

- admin/staff only

Query params:

- `categoryId` optional, positive integer
- `lowStockOnly` optional, `true` or `false`

Response `200`:

```json
{
  "generatedAt": "2026-04-24T10:00:00.000Z",
  "items": [
    {
      "productId": 1,
      "sku": "TSHIRT-001",
      "productName": "Classic T-Shirt",
      "categoryId": 1,
      "category": "apparel",
      "imageUrl": "https://assets.ecloria.co.uk/products/1/main-1712736000000.jpeg",
      "basePrice": 199000,
      "stockQty": 20,
      "reservedQty": 3,
      "availableQty": 17,
      "minStockLevel": 5,
      "ads": 0,
      "doi": 0,
      "lastCalculatedAt": null,
      "isLowStock": false,
      "isOutOfStock": false,
      "createdAt": "2026-04-02T10:00:00.000Z"
    }
  ]
}
```

### `GET /admin/analytics/sales-by-product`

Get aggregated product sales metrics for a date window.

Access rules:

- admin/staff only

Query params:

- `from` optional, `YYYY-MM-DD`
- `to` optional, `YYYY-MM-DD`

Behavior:

- if both params are omitted, backend returns the last 7 days ending on today (UTC)
- analytics currently count orders with `status = completed`
- the sales window uses `orders.updated_at` as the completed timestamp reference

Response `200`:

```json
{
  "generatedAt": "2026-04-24T10:00:00.000Z",
  "from": "2026-04-18",
  "to": "2026-04-24",
  "items": [
    {
      "productId": 1,
      "sku": "TSHIRT-001",
      "productName": "Classic T-Shirt",
      "categoryId": 1,
      "category": "apparel",
      "imageUrl": "https://assets.ecloria.co.uk/products/1/main-1712736000000.jpeg",
      "basePrice": 199000,
      "stockQty": 20,
      "reservedQty": 3,
      "availableQty": 17,
      "minStockLevel": 5,
      "ads": 0,
      "doi": 0,
      "lastCalculatedAt": null,
      "soldQty": 12,
      "revenue": 2388000,
      "orderCount": 7
    }
  ]
}
```

### `GET /admin/categories`

Get the admin category list.

Access rules:

- admin/staff only

Response `200`:

```json
[
  {
    "id": 1,
    "name": "Apparel",
    "slug": "apparel",
    "createdAt": "2026-04-02T10:00:00.000Z",
    "updatedAt": "2026-04-02T10:00:00.000Z"
  }
]
```

### `GET /admin/categories/:id`

Get one category for admin/staff.

Access rules:

- admin/staff only

Response `200`:

```json
{
  "id": 1,
  "name": "Apparel",
  "slug": "apparel",
  "createdAt": "2026-04-02T10:00:00.000Z",
  "updatedAt": "2026-04-02T10:00:00.000Z"
}
```

### `POST /admin/categories`

Create a category.

Access rules:

- admin/staff only

Request body:

```json
{
  "name": "Footwear",
  "slug": "footwear"
}
```

Response `201`:

```json
{
  "id": 4,
  "name": "Footwear",
  "slug": "footwear",
  "createdAt": "2026-04-02T10:00:00.000Z",
  "updatedAt": "2026-04-02T10:00:00.000Z"
}
```

### `PATCH /admin/categories/:id`

Update a category.

Access rules:

- admin/staff only

Request body:

```json
{
  "name": "Fashion Accessories",
  "slug": "accessories"
}
```

Behavior:

- when a category slug changes, backend also syncs `products.category` for products referencing that `categoryId`

### `DELETE /admin/categories/:id`

Delete a category.

Access rules:

- admin/staff only

Rules:

- returns `409 CONFLICT` if any products still reference the category

Response `204`:

- no content

### `POST /orders`

Create a new order for the authenticated customer.

Request body using a saved address:

```json
{
  "addressId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 2
    }
  ]
}
```

Request body using a new address:

```json
{
  "newAddress": {
    "receiverName": "Nguyen Van A",
    "receiverPhone": "0901234567",
    "addressLine": "123 Nguyen Trai",
    "provinceCode": "79",
    "districtCode": "760",
    "wardCode": "26734",
    "ward": "Ward 2",
    "district": "District 5",
    "city": "Ho Chi Minh City",
    "country": "Vietnam",
    "postalCode": "700000"
  },
  "items": [
    {
      "productId": 1,
      "quantity": 2
    }
  ]
}
```

Rules:

- authenticated endpoint only
- customer identity is taken from the JWT token
- use either `addressId` or `newAddress`
- do not send both `addressId` and `newAddress`
- `newAddress.receiverName`: required
- `newAddress.receiverPhone`: required
- `newAddress.addressLine`: required
- `newAddress.city`: required
- `shippingFee`: optional, non-negative number
- `items`: required, array, minimum 1 item
- `productId`: required
- `quantity`: required, integer, greater than 0
- `priceAtPurchase` and `totalAmount` are computed by the backend
- backend computes final `shippingFee` from the shipping city using the Da Nang origin zone rules
- client-provided `shippingFee` is accepted for backward compatibility, but backend-calculated fee is the source of truth
- when `addressId` is used, it must belong to the authenticated customer

Response `201`:

```json
{
  "id": 1,
  "status": "pending",
  "totalAmount": 438000,
  "shippingFee": 40000,
  "paymentExpiresAt": "2026-04-03T10:15:00.000Z",
  "failCount": 0,
  "customerAddressId": 1,
  "shippingAddress": "123 Nguyen Trai, HCMC",
  "city": "Ho Chi Minh City",
  "shipping": {
    "receiverName": "Nguyen Van A",
    "receiverPhone": "0901234567",
    "addressLine": "123 Nguyen Trai",
    "provinceCode": "79",
    "districtCode": "760",
    "wardCode": "26734",
    "ward": "Ward 2",
    "district": "District 5",
    "city": "Ho Chi Minh City",
    "country": "Vietnam",
    "postalCode": "700000",
    "fullAddress": "123 Nguyen Trai, Ward 2, District 5, Ho Chi Minh City, Vietnam"
  },
  "customer": {
    "id": 1,
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "email": "nguyenvana@example.com"
  },
  "items": [
    {
      "id": 1,
      "productId": 1,
      "quantity": 2,
      "priceAtPurchase": 199000
    }
  ],
  "createdAt": "2026-04-02T10:15:00.000Z",
  "updatedAt": "2026-04-02T10:15:00.000Z"
}
```

Side effects:

- backend copies a shipping snapshot into the order from `addressId` or `newAddress`
- backend increases `inventory.reserved_qty`
- backend creates an `inventory_transactions` record with type `RESERVE`
- inventory lifecycle writes are duplicate-protected by transaction reference

Response `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Items must not be empty"
  }
}
```

Response `401`:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authorization token is required"
  }
}
```

### `POST /orders/:id/address-change-request`

Create an address change request for an existing order.

Access rules:

- authenticated customer only
- customer can request change only for own order

Request body using a saved address:

```json
{
  "addressId": 2
}
```

Request body using a new address:

```json
{
  "newAddress": {
    "receiverName": "Nguyen Van A",
    "receiverPhone": "0901234567",
    "addressLine": "200 Dien Bien Phu",
    "ward": "Ward 15",
    "district": "Binh Thanh",
    "city": "Da Nang",
    "country": "Vietnam",
    "postalCode": "550000"
  }
}
```

Rules:

- use either `addressId` or `newAddress`, not both
- if the order status is `pending`, the address change is applied immediately and `shippingFee` is recalculated from the new address without any extra handling fee
- for orders that have moved past `pending`, the request is stored as pending approval for admin/n8n flow
- same-province approved changes keep the current `shippingFee` and add a `10000` handling fee
- cross-province change stores a recalculated shipping fee using the backend shipping rule
- order must still be in an address-change-eligible delivery stage

Response `200` immediate update:

```json
{
  "success": true,
  "action": "updated_pending_recalculated",
  "shippingFee": 15000,
  "processingFee": 0,
  "feeDelta": -25000
}
```

Response `200` pending approval:

```json
{
  "success": true,
  "action": "pending_approval",
  "calculatedShippingFee": 40000,
  "processingFee": 10000,
  "feeDelta": 35000
}
```

Response `409`:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "An address change request is already pending"
  }
}
```

### `POST /refund-requests`

Create a refund request for an existing order.

Access rules:

- authenticated customer only
- customer can create a refund request only for own order

Request body:

```json
{
  "orderId": 12,
  "imageUrl": "https://example.com/evidence.jpg",
  "reason": "Product was damaged on arrival"
}
```

Rules:

- `orderId` must be a positive integer
- `imageUrl` is required
- `reason` is required
- an order cannot have more than one active refund request at the same time
- backend uses the authenticated customer from JWT, not any client-provided phone
- if the customer's abuse score is high, the request starts as `manual_review_required`

Response `201`:

```json
{
  "id": 1,
  "orderId": 12,
  "customerId": 4,
  "imageUrl": "https://example.com/evidence.jpg",
  "reason": "Product was damaged on arrival",
  "status": "pending",
  "abuseScoreSnapshot": 1,
  "reviewNote": null,
  "createdAt": "2026-04-02T10:00:00.000Z",
  "updatedAt": "2026-04-02T10:00:00.000Z"
}
```

Response `409`:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "A refund request is already active for this order"
  }
}
```

### `GET /orders`

Get order list.

Query params:

- `status` optional
- allowed values: `pending`, `processing`, `shipping`, `completed`, `cancelled`, `failed`

Status model:

- `status` is the order lifecycle only
- `paymentStatus` carries payment state such as `payment_pending`, `paid`, `payment_failed`
- `deliveryStatus` carries delivery state such as `ready_to_ship`, `in_transit`, `delivered`

Access rules:

- customer: only sees own orders
- admin/staff: sees all orders

Response `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid order status filter"
  }
}
```

Response `200`:

```json
[
  {
    "id": 1,
    "status": "pending",
    "paymentStatus": "unpaid",
    "deliveryStatus": "pending",
    "latestRefundRequestStatus": null,
    "totalAmount": 418000,
    "shippingFee": 20000,
    "paymentExpiresAt": "2026-04-03T10:15:00.000Z",
    "failCount": 0,
    "shippingAddress": "123 Nguyen Trai, HCMC",
    "city": "Ho Chi Minh City",
    "customer": {
      "id": 1,
      "fullName": "Nguyen Van A",
      "phone": "0901234567",
      "email": "nguyenvana@example.com"
    },
    "items": [
      {
        "id": 1,
        "productId": 1,
        "quantity": 2,
        "priceAtPurchase": 199000
      }
    ],
    "createdAt": "2026-04-02T10:15:00.000Z",
    "updatedAt": "2026-04-02T10:15:00.000Z"
  }
]
```

### `GET /orders/:id`

Get one order by id.

Access rules:

- customer: only own order
- admin/staff: any order

Response `200`:

```json
{
  "id": 1,
  "status": "pending",
  "paymentStatus": "unpaid",
  "deliveryStatus": "pending",
  "latestRefundRequestStatus": null,
  "totalAmount": 418000,
  "shippingFee": 20000,
  "paymentExpiresAt": "2026-04-03T10:15:00.000Z",
  "failCount": 0,
  "shippingAddress": "123 Nguyen Trai, HCMC",
  "city": "Ho Chi Minh City",
  "customer": {
    "id": 1,
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "email": "nguyenvana@example.com"
  },
  "items": [
    {
      "id": 1,
      "productId": 1,
      "quantity": 2,
      "priceAtPurchase": 199000
    }
  ],
  "createdAt": "2026-04-02T10:15:00.000Z",
  "updatedAt": "2026-04-02T10:15:00.000Z"
}
```

Response `404`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Order not found"
  }
}
```

Response `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Order id must be a positive integer"
  }
}
```

### `PATCH /orders/:id/status`

Update order status.

Access rules:

- admin/staff only

Request body:

```json
{
  "status": "processing"
}
```

Allowed status values:

- `pending`
- `processing`
- `shipping`
- `completed`
- `cancelled`
- `failed`

Notes:

- use `POST /payment-events` to update payment state
- `paid` is represented as `paymentStatus = paid`, not `status = paid`
- payment success may move `status` from `pending` to `processing`

Side effects:

- when status changes to `failed`, backend automatically creates an `issue` record with:
  - `type = ORDER_FAILED`
  - `severity = high`
  - `status = open`
- when status changes to `completed`, backend records `SALE` inventory transactions once
- when status changes to `cancelled` or `failed`, backend rolls back reserved inventory once with `EXPIRED_CANCEL`

Response `200`:

```json
{
  "id": 1,
  "status": "processing",
  "paymentStatus": "paid",
  "deliveryStatus": "pending",
  "totalAmount": 418000,
  "shippingFee": 20000,
  "paymentExpiresAt": "2026-04-03T10:15:00.000Z",
  "failCount": 0,
  "shippingAddress": "123 Nguyen Trai, HCMC",
  "city": "Ho Chi Minh City",
  "customer": {
    "id": 1,
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "email": "nguyenvana@example.com"
  },
  "items": [
    {
      "id": 1,
      "productId": 1,
      "quantity": 2,
      "priceAtPurchase": 199000
    }
  ],
  "createdAt": "2026-04-02T10:15:00.000Z",
  "updatedAt": "2026-04-02T10:20:00.000Z"
}
```

Response `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A valid order status is required"
  }
}
```

Response `404`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Order not found"
  }
}
```

## Notes For Frontend Web And Mobile

- Only use fields defined in this contract
- Do not send `priceAtPurchase` or `totalAmount` from clients
- UI can calculate temporary totals for display, but backend is the source of truth
- Contract changes should be versioned and announced by the team lead
- `GET /products/:id` and `GET /orders/:id` require a positive integer id
- `GET /orders` supports optional `status` filtering
- Changing an order status to `failed` automatically creates an `issue` record for issue tracking and n8n automation

## Planned Next Scope

The following backend capabilities are planned for the next phase and are not implemented yet:

- address change request workflow
- refund request workflow
- system-config admin APIs
- payment failover control APIs
