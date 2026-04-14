# API Contract v0.4

Base URL:
- Production: `https://api.ecloria.co.uk`
- Local: `http://localhost:5000`

Content-Type:
- Request: `application/json`
- Response: `application/json`

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

## Endpoints

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

### `GET /customers/:customerId/addresses`

Get all addresses for one customer.

Response `200`:

```json
[
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
]
```

Response `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Customer id must be a positive integer"
  }
}
```

Response `404`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Customer not found"
  }
}
```

### `GET /customers/:customerId/addresses/:addressId`

Get one address by id for one customer.

Response `200`:

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

Response `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Address id must be a positive integer"
  }
}
```

Response `404`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Address not found"
  }
}
```

### `POST /customers/:customerId/addresses`

Create a new address for one customer.

Request body:

```json
{
  "label": "home",
  "receiverName": "Nguyen Van A",
  "receiverPhone": "0901234567",
  "addressLine": "123 Nguyen Trai",
  "ward": "Ward 2",
  "district": "District 5",
  "city": "Ho Chi Minh City",
  "country": "Vietnam",
  "postalCode": "700000",
  "isDefault": true
}
```

Rules:
- `receiverName`: required
- `receiverPhone`: required
- `addressLine`: required
- `city`: required
- `label`: optional, defaults to `home`
- `country`: optional, defaults to `Vietnam`
- `isDefault`: optional boolean

Response `201`:

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

### `PATCH /customers/:customerId/addresses/:addressId`

Update one address for one customer.

Request body:

```json
{
  "label": "office",
  "receiverPhone": "0911111111",
  "isDefault": true
}
```

Rules:
- request body must include at least one address field
- `isDefault = true` will unset other default addresses of the same customer
- if the current default address is deleted or unset, backend assigns another existing address as default when possible

Response `200`:

```json
{
  "id": 1,
  "customerId": 1,
  "label": "office",
  "receiverName": "Nguyen Van A",
  "receiverPhone": "0911111111",
  "addressLine": "123 Nguyen Trai",
  "ward": "Ward 2",
  "district": "District 5",
  "city": "Ho Chi Minh City",
  "country": "Vietnam",
  "postalCode": "700000",
  "isDefault": true,
  "createdAt": "2026-04-02T10:00:00.000Z",
  "updatedAt": "2026-04-02T10:05:00.000Z"
}
```

Response `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "At least one address field is required"
  }
}
```

Response `404`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Address not found"
  }
}
```

### `DELETE /customers/:customerId/addresses/:addressId`

Delete one address for one customer.

Response `204`:
- empty body

Response `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Address id must be a positive integer"
  }
}
```

Response `404`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Address not found"
  }
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

Create a new order.

Request body:

```json
{
  "customer": {
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "email": "nguyenvana@example.com"
  },
  "shippingAddress": "123 Nguyen Trai, HCMC",
  "city": "Ho Chi Minh City",
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
- `customer.fullName`: required, string
- `customer.phone`: required, string
- `customer.email`: required, string
- `shippingAddress`: required, string
- `city`: required, string
- `shippingFee`: optional, non-negative number
- `items`: required, array, minimum 1 item
- `productId`: required
- `quantity`: required, integer, greater than 0
- `priceAtPurchase` and `totalAmount` are computed by the backend
- backend creates or updates the customer by phone

Response `201`:

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

Side effects:
- backend creates or updates the customer by phone
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

### `GET /orders`

Get order list.

Query params:
- `status` optional
- allowed values: `pending`, `awaiting_payment`, `paid`, `processing`, `shipping`, `completed`, `cancelled`, `failed`

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
