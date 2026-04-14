# Backend Backlog

## Current Data Model Direction

`PostgreSQL` is the source of truth.

`n8n` should orchestrate workflows around the backend database, not replace it.
Google Sheets can still be used for reporting or demo visibility, but not as the primary state store.

## Recent Schema Additions

The backend schema now includes new persistence for the next n8n-focused phase:

- `orders`
  - `payment_status`
  - `payment_gateway`
  - `transaction_ref`
  - `victim_notified`
  - `incident_id`
  - `delivery_partner`
  - `delivery_status`
  - `delivery_fail_count`
  - `last_delivery_failed_reason`
  - `address_change_status`
  - `address_change_requested_at`
  - `shipping_fee_approved`
- `delivery_events`
- `payment_logs`
- `system_config`

These fields are added for workflow support, even if the public API does not expose them yet.

## Next Backend Endpoints

### Delivery Failed Flow

- `POST /delivery-callback`
  - payload: `{ orderId, status, reason, partner, externalEventId? }`
  - validate order existence
  - append `delivery_events`
  - update `orders.delivery_status`
  - increment `orders.delivery_fail_count`
  - update `orders.last_delivery_failed_reason`
  - if fail count < 3:
    - set `orders.delivery_status = 'retry_pending'`
  - if fail count >= 3:
    - set `orders.delivery_status = 'returning'`
    - create `issues` record with type `DELIVERY_FAILED`

### Address Change Flow

- `POST /orders/:id/address-change-request`
  - customer-authenticated
  - create request state in `orders.address_change_status`
  - set `address_change_requested_at`
  - if same city and allowed by current delivery status:
    - update shipping snapshot directly
  - if cross-city:
    - mark request pending approval for n8n/admin flow

- `POST /orders/:id/address-change-decision`
  - admin-only
  - approve / reject / reject_timeout
  - update shipping snapshot and shipping fee if approved

### Refund Flow

- `POST /refund-requests`
  - authenticated customer
  - payload: `{ orderId, imageUrl }`
  - backend should use authenticated customer, not `user_phone`
  - create issue or refund record
  - update abuse metrics or pass enough data for n8n scoring

### Payment Failover Flow

- `POST /payment-events`
  - normalized payment service error event intake
  - append `payment_logs`
  - update `orders.payment_status` if order-specific

- `GET /admin/payment-incidents/active`
  - admin-only
  - summary of active outage state

- `PATCH /admin/system-config`
  - admin-only
  - update keys like:
    - `payment.active_gateway`
    - `payment.maintenance_mode`

## Role and Access Backlog

### Customer

- `GET /me`
- `GET /me/addresses`
- `POST /me/addresses`
- `PATCH /me/addresses/:id`
- `DELETE /me/addresses/:id`
- `POST /orders`
- `GET /orders`
  - should eventually return only the authenticated customer's orders
- `GET /orders/:id`
  - should eventually allow only own order access

### Admin / Staff

- `GET /admin/orders`
- `GET /admin/orders/:id`
- `PATCH /admin/orders/:id/status`
- `GET /admin/issues`
- `GET /admin/issues/:id`
- `PATCH /admin/issues/:id/status`
- `GET /admin/system-config`
- `PATCH /admin/system-config`

## Business Rules To Lock Next

- customer checkout is authenticated-only
- every order must belong to one registered customer
- shipping snapshot on `orders` is immutable history after creation, except through explicit address-change flow
- `customer_addresses` is only an address book, not order history
- payment gateway failover state should live in `system_config`
- delivery callbacks should never write directly to Google Sheets as primary state

## Suggested Implementation Order

1. Add role-based authorization for customer/admin/staff.
2. Restrict customer order queries to own orders.
3. Implement `POST /delivery-callback`.
4. Implement admin issue APIs.
5. Implement `POST /payment-events`.
6. Implement system-config admin APIs.
7. Implement address-change request APIs.
8. Implement refund request APIs.
