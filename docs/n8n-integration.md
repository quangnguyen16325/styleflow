# n8n Integration Guide

This document describes how `n8n` should integrate with the current backend.

Core rule:
- backend database is the source of truth
- `n8n` orchestrates approval, notification, and monitoring
- `n8n` should not replace backend business-state updates with Google Sheets or ad-hoc storage

Base URLs:
- Production backend: `https://api.ecloria.co.uk`
- Local backend: `http://localhost:5000`

## Shared Principles

### What should go through backend directly

- customer-authenticated business actions
- order creation
- refund request creation
- address change request creation
- delivery and payment state writes

### What `n8n` should do

- receive third-party events if you want orchestration visibility
- normalize payloads
- call backend APIs
- wait for approvals
- send Discord / email / SMS / Zalo notifications
- monitor incidents and manual review queues

### What `n8n` should not do

- maintain order state in Google Sheets
- calculate fail counts independently from backend
- update order/payment/refund state directly in a spreadsheet
- duplicate backend business rules in a second system

## Flow 1: Delivery Failed

### Backend source of truth

- `POST /delivery-callback`

Backend behavior:
- validates `X-Internal-Webhook-Secret`
- dedupes repeated callbacks by `externalEventId`
- updates `orders.delivery_status`
- updates `orders.delivery_fail_count`
- creates `DELIVERY_FAILED` issue when fail threshold is reached

Response example:

```json
{
  "success": true,
  "action": "retry_pending",
  "failCount": 1,
  "customerEmail": "customer@example.com"
}
```

### Recommended `n8n` role

1. Receive delivery partner webhook
2. Normalize payload
3. `POST /delivery-callback`
4. Branch on `action`
5. Send notifications

### Recommended incoming payload to backend

```json
{
  "orderId": 12,
  "status": "FAILED",
  "reason": "CUSTOMER_UNREACHABLE",
  "partner": "GHN",
  "externalEventId": "ghn_evt_001"
}
```

### Branching guidance

- `retry_pending`: notify customer service / customer
- `returning`: notify warehouse/admin
- `duplicate_ignored`: do nothing
- `delivered`: informational only
- `returned`: informational only

## Flow 2: Address Change & Approve Fee

### Backend source of truth

- customer request:
  - `POST /orders/:id/address-change-request`
- admin decision:
  - `POST /admin/orders/:id/address-change-decision`

### Current business rules

- if `order.status = pending`
  - backend applies the new address immediately
  - backend recalculates `shippingFee`
  - no extra handling fee
  - response action: `updated_pending_recalculated`
- if order has moved past `pending` but is still eligible
  - backend stores a pending request
  - admin/n8n approval is required
  - same-province approved change:
    - keep current `shippingFee`
    - add `10000` handling fee
  - cross-province approved change:
    - recalculate `shippingFee`
    - add `10000` handling fee

### Recommended app/web flow

1. app/web calls backend directly:
   - `POST /orders/:id/address-change-request`
2. app/web always triggers `n8n` after receiving backend response
3. app/web maps backend result to a minimal orchestration payload:
   - `updated_pending_recalculated` -> `requiresApproval = false`
   - `pending_approval` -> `requiresApproval = true`

### Recommended payload from app/web to `n8n`

```json
{
  "orderId": 12,
  "requiresApproval": true
}
```

Backend already calculates:
- `calculatedShippingFee`
- `processingFee`
- `feeDelta`

So app/web and `n8n` do not need to propose shipping fee values anymore.

### Recommended `n8n` role

1. receive `orderId` and `requiresApproval`
2. `GET /admin/orders/:id`
3. if `requiresApproval = false`
   - send customer notification only
4. if `requiresApproval = true`
   - send approval request to Discord/Telegram
   - wait for admin decision
   - `POST /admin/orders/:id/address-change-decision`
   - notify customer

## Flow 3: Refund Request / Block Spam

### Backend source of truth

- customer create:
  - `POST /refund-requests`
- admin list/detail:
  - `GET /admin/refund-requests`
  - `GET /admin/refund-requests/:id`
- admin decision:
  - `PATCH /admin/refund-requests/:id/status`

### Current business rules

Backend create request:
- validates order belongs to authenticated customer
- stores `imageUrl`
- stores `reason`
- snapshots `abuse_score`
- if abuse score is high:
  - status becomes `manual_review_required`
  - issue `ABUSE_RISK` is created

Refund request model currently includes:
- `orderAmount`
- `customerEmail`
- `reason`

### Recommended app/web flow

1. app/web calls backend directly:
   - `POST /refund-requests`
2. backend creates real DB record
3. if needed, app/web or backend-triggered automation starts `n8n` review flow

### Recommended payload from app/web to backend

```json
{
  "orderId": 12,
  "imageUrl": "https://assets.ecloria.co.uk/refunds/test-12.jpg",
  "reason": "Product was damaged on arrival"
}
```

### Recommended payload from app/web/backend to `n8n`

```json
{
  "refundRequestId": 7
}
```

### Recommended `n8n` role

1. receive `refundRequestId`
2. `GET /admin/refund-requests/:id`
3. branch on `status`
4. notify admin if review is needed
5. wait for decision
6. `PATCH /admin/refund-requests/:id/status`
7. notify customer

## Flow 4: Inventory / Ops Monitoring

### Backend source of truth

Current backend state already writes inventory lifecycle records:
- `RESERVE`
- `SALE`
- `RETURN`
- `EXPIRED_CANCEL`

`n8n` should treat backend DB as the reporting source, not calculate stock lifecycle itself.

### Recommended `n8n` role

- low stock monitoring
- periodic reports
- admin alerts for anomalies

### Good backend sources

- `inventory`
- `inventory_transactions`
- `orders`
- `issues`
- `GET /admin/inventory`
- `GET /admin/analytics/sales-by-product`

### Recommended production approach

1. `GET /admin/inventory`
2. `GET /admin/analytics/sales-by-product?from=YYYY-MM-DD&to=YYYY-MM-DD`
3. classify products in `n8n`
4. send Discord / email alerts

Notes:
- backend now exposes `ads`, `doi`, `lastCalculatedAt`, low-stock flags, and current stock snapshot through `/admin/inventory`
- backend now exposes per-product `soldQty`, `revenue`, and `orderCount` through `/admin/analytics/sales-by-product`
- sales analytics currently use orders with `status = completed`

## Flow 5: Payment Failover

### Backend source of truth

- payment event ingest:
  - `POST /payment-events`
- admin monitoring:
  - `GET /admin/payment-incidents/active`
  - `GET /admin/payment-logs`
  - `GET /admin/system-config`
  - `PATCH /admin/system-config`

### Current backend behavior

- payment events are idempotent by `externalEventId`
- incidents are aggregated from recent logs + system config

### Recommended `n8n` role

1. receive gateway/provider events if needed
2. forward to backend `POST /payment-events`
3. monitor `/admin/payment-incidents/active`
4. notify ops/admin
5. optionally automate config changes through `/admin/system-config`

## Suggested `n8n` Webhook Contracts

These are internal orchestrator payloads, not customer-facing backend APIs.

### Address change approval start

```json
{
  "orderId": 12,
  "requiresApproval": true
}
```

### Refund review start

```json
{
  "refundRequestId": 7
}
```

### Delivery partner normalization output

```json
{
  "orderId": 12,
  "status": "FAILED",
  "reason": "CUSTOMER_UNREACHABLE",
  "partner": "GHN",
  "externalEventId": "ghn_evt_001"
}
```

## Environment / Secrets

Backend:
- `INTERNAL_WEBHOOK_SECRET`
- `JWT_SECRET`

`n8n` should store:
- backend admin token or service credential for `/admin/*` calls
- `X-Internal-Webhook-Secret` value for internal delivery callbacks

Do not hardcode these secrets in workflow nodes.

## Recommended Migration Pattern From Demo Flows

If an old flow currently uses Google Sheets:

1. remove Sheets as source of truth
2. replace Sheets reads with backend `GET`
3. replace Sheets writes with backend `POST`/`PATCH`
4. keep Discord / Email / Wait / approval nodes
5. branch using backend response actions/statuses

## Current Status Summary

- Flow 1: backend-ready
- Flow 2: backend-ready, `n8n` only needed for approval path after `pending`
- Flow 3: backend-ready
- Flow 4: backend writes exist, `n8n` should focus on monitoring/reporting
- Flow 5: backend-ready for incident/control-plane workflows
