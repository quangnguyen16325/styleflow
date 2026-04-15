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

## Already Implemented

- `POST /delivery-callback`
  - validates order existence
  - appends `delivery_events`
  - updates `orders.delivery_status`
  - increments `orders.delivery_fail_count`
  - updates `orders.last_delivery_failed_reason`
- `POST /payment-events`
  - appends `payment_logs`
  - updates order payment fields when `orderId` is present
- Admin issue APIs
  - `GET /admin/issues`
  - `GET /admin/issues/:id`
  - `PATCH /admin/issues/:id/status`
- Admin order APIs
  - `GET /admin/orders`
  - `GET /admin/orders/:id`
  - `PATCH /admin/orders/:id/status`
  - `GET /admin/orders/:id/delivery-events`
- Address change APIs
  - `POST /orders/:id/address-change-request`
  - `POST /admin/orders/:id/address-change-decision`

## Next Backend Endpoints

### Refund Flow

- `POST /refund-requests`
  - authenticated customer
  - payload: `{ orderId, imageUrl }`
  - backend should use authenticated customer, not `user_phone`
  - create issue or refund record
  - update abuse metrics or pass enough data for n8n scoring

### Payment Failover Control Flow

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
  - returns only the authenticated customer's orders
- `GET /orders/:id`
  - allows only own order access

### Admin / Staff

- `GET /admin/orders`
- `GET /admin/orders/:id`
- `PATCH /admin/orders/:id/status`
- `GET /admin/orders/:id/delivery-events`
- `GET /admin/issues`
- `GET /admin/issues/:id`
- `PATCH /admin/issues/:id/status`
- `GET /admin/system-config`
- `PATCH /admin/system-config`

## Business Rules To Lock Next

- customer checkout is authenticated-only
- every order must belong to one registered customer
- the current `Customer-Facing` and `Admin` sections in `docs/api-contract.md` are frozen for the ongoing web/mobile work
- future backend work must be additive and must not break the active client contract
- shipping snapshot on `orders` is immutable history after creation, except through explicit address-change flow
- `customer_addresses` is only an address book, not order history
- payment gateway failover state should live in `system_config`
- delivery callbacks should never write directly to Google Sheets as primary state

## Suggested Implementation Order

1. Keep the current customer-facing and admin contract stable for web/mobile.
2. Implement system-config admin APIs.
3. Implement refund request APIs.
4. Add payment incident read/control APIs.
