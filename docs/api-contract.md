# API Contract v0.2

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
- Creating an order increases `inventory.reserved_qty` and creates an `inventory_transactions` record with type `RESERVE`
