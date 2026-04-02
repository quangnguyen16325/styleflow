# API Contract v0.1

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
  "id": "prod_001",
  "name": "Classic T-Shirt",
  "description": "Cotton t-shirt",
  "price": 199000,
  "imageUrl": "https://cdn.example.com/products/shirt-1.jpg",
  "stock": 20,
  "createdAt": "2026-04-02T10:00:00.000Z"
}
```

## Order Item Model

```json
{
  "productId": "prod_001",
  "quantity": 2,
  "unitPrice": 199000,
  "lineTotal": 398000
}
```

## Order Model

```json
{
  "id": "ord_001",
  "customerName": "Nguyen Van A",
  "customerPhone": "0901234567",
  "customerAddress": "123 Nguyen Trai, HCMC",
  "note": "Call before delivery",
  "status": "pending",
  "items": [
    {
      "productId": "prod_001",
      "quantity": 2,
      "unitPrice": 199000,
      "lineTotal": 398000
    }
  ],
  "totalAmount": 398000,
  "createdAt": "2026-04-02T10:15:00.000Z"
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
    "id": "prod_001",
    "name": "Classic T-Shirt",
    "description": "Cotton t-shirt",
    "price": 199000,
    "imageUrl": "https://cdn.example.com/products/shirt-1.jpg",
    "stock": 20,
    "createdAt": "2026-04-02T10:00:00.000Z"
  }
]
```

### `GET /products/:id`

Get product details.

Response `200`:

```json
{
  "id": "prod_001",
  "name": "Classic T-Shirt",
  "description": "Cotton t-shirt",
  "price": 199000,
  "imageUrl": "https://cdn.example.com/products/shirt-1.jpg",
  "stock": 20,
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
  "customerName": "Nguyen Van A",
  "customerPhone": "0901234567",
  "customerAddress": "123 Nguyen Trai, HCMC",
  "note": "Call before delivery",
  "items": [
    {
      "productId": "prod_001",
      "quantity": 2
    }
  ]
}
```

Rules:
- `customerName`: required, string
- `customerPhone`: required, string
- `customerAddress`: required, string
- `note`: optional, string
- `items`: required, array, minimum 1 item
- `productId`: required
- `quantity`: required, integer, greater than 0
- `unitPrice`, `lineTotal`, `totalAmount` are computed by the backend

Response `201`:

```json
{
  "id": "ord_001",
  "customerName": "Nguyen Van A",
  "customerPhone": "0901234567",
  "customerAddress": "123 Nguyen Trai, HCMC",
  "note": "Call before delivery",
  "status": "pending",
  "items": [
    {
      "productId": "prod_001",
      "quantity": 2,
      "unitPrice": 199000,
      "lineTotal": 398000
    }
  ],
  "totalAmount": 398000,
  "createdAt": "2026-04-02T10:15:00.000Z"
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

Response `200`:

```json
[
  {
    "id": "ord_001",
    "customerName": "Nguyen Van A",
    "customerPhone": "0901234567",
    "customerAddress": "123 Nguyen Trai, HCMC",
    "note": "Call before delivery",
    "status": "pending",
    "items": [
      {
        "productId": "prod_001",
        "quantity": 2,
        "unitPrice": 199000,
        "lineTotal": 398000
      }
    ],
    "totalAmount": 398000,
    "createdAt": "2026-04-02T10:15:00.000Z"
  }
]
```

## Notes For Frontend Web And Mobile

- Only use fields defined in this contract
- Do not send `unitPrice`, `lineTotal`, or `totalAmount` from clients
- UI can calculate temporary totals for display, but backend is the source of truth
- Contract changes should be versioned and announced by the team lead
