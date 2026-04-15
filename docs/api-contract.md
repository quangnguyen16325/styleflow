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
  "category": "apparel",
  "stockQty": 20,
  "reservedQty": 0,
  "availableQty": 20,
  "minStockLevel": 5,
  "createdAt": "2026-04-02T10:00:00.000Z"
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
  "type": "PAYMENT_ERROR",
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
  "imageUrl": "https://example.com/evidence.jpg",
  "status": "pending",
  "abuseScoreSnapshot": 1,
  "reviewNote": null,
  "createdAt": "2026-04-02T10:00:00.000Z",
  "updatedAt": "2026-04-02T10:00:00.000Z"
}
```

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

### Admin

Preferred admin order routes:
- `GET /admin/orders`
- `GET /admin/orders/:id`
- `PATCH /admin/orders/:id/status`
- `GET /admin/orders/:id/delivery-events`

Compatibility note:
- existing admin clients may continue using `PATCH /orders/:id/status`
- new admin work should prefer the `/admin/orders/*` routes

### `GET /admin/orders`

Get admin order list.

Query params:
- `status` optional
- allowed values: `pending`, `awaiting_payment`, `paid`, `processing`, `shipping`, `completed`, `cancelled`, `failed`

Access rules:
- admin/staff only

Response `200`:

```json
[
  {
    "id": 1,
    "status": "pending",
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
- `awaiting_payment`
- `paid`
- `processing`
- `shipping`
- `completed`
- `cancelled`
- `failed`

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
- array of `Refund Request Model`

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
- `Refund Request Model`

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

Rules:
- `orderId`: required, positive integer
- `reason`: required when `status = FAILED`

Response `200`:

```json
{
  "success": true,
  "action": "retry_pending"
}
```

Other possible `action` values:
- `delivered`
- `returning`
- `updated`

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
  "transactionRef": "txn_123"
}
```

Allowed `source`:
- `payment_service`
- `app_client`
- `schedule`

Response `200`:

```json
{
  "status": "outage_suspected",
  "action": "logged",
  "paymentStatus": "payment_unknown"
}
```

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
    "category": "apparel",
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
  "category": "apparel",
  "stockQty": 20,
  "reservedQty": 0,
  "availableQty": 20,
  "minStockLevel": 5,
  "createdAt": "2026-04-02T10:00:00.000Z"
}
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

### `POST /orders`

Create a new order for the authenticated customer.

Request body using a saved address:

```json
{
  "addressId": 1,
  "shippingFee": 20000,
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
    "ward": "Ward 2",
    "district": "District 5",
    "city": "Ho Chi Minh City",
    "country": "Vietnam",
    "postalCode": "700000"
  },
  "shippingFee": 20000,
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
- when `addressId` is used, it must belong to the authenticated customer

Response `201`:

```json
{
  "id": 1,
  "status": "pending",
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

Side effects:
- backend copies a shipping snapshot into the order from `addressId` or `newAddress`
- backend increases `inventory.reserved_qty`
- backend creates an `inventory_transactions` record with type `RESERVE`

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
  },
  "requestedShippingFee": 50000
}
```

Rules:
- use either `addressId` or `newAddress`, not both
- same-city change is applied immediately
- cross-city change is stored as pending approval for admin/n8n flow
- order must still be in an address-change-eligible delivery stage

Response `200` immediate update:

```json
{
  "success": true,
  "action": "updated_same_city"
}
```

Response `200` pending approval:

```json
{
  "success": true,
  "action": "pending_approval"
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
  "imageUrl": "https://example.com/evidence.jpg"
}
```

Rules:
- `orderId` must be a positive integer
- `imageUrl` is required
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
- allowed values: `pending`, `awaiting_payment`, `paid`, `processing`, `shipping`, `completed`, `cancelled`, `failed`

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
- `awaiting_payment`
- `paid`
- `processing`
- `shipping`
- `completed`
- `cancelled`
- `failed`

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
