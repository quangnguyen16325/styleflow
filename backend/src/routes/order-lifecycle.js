export async function applyOrderLifecycleTransition(client, orderId, previousStatus, nextStatus) {
  if (previousStatus !== "completed" && nextStatus === "completed") {
    await finalizeOrderSale(client, orderId);
    return;
  }

  if (
    previousStatus !== "completed" &&
    !["cancelled", "failed"].includes(previousStatus) &&
    ["cancelled", "failed"].includes(nextStatus)
  ) {
    await rollbackReservedInventory(client, orderId);
  }
}

export async function applyOrderReturn(client, orderId) {
  const items = await getInventoryItemsForOrder(client, orderId);
  for (const item of items) {
    await client.query(
      `
        UPDATE inventory
        SET
          stock_qty = stock_qty + $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [item.quantity, item.inventory_id],
    );

    await client.query(
      `
        INSERT INTO inventory_transactions (
          inventory_id,
          change_amount,
          type,
          order_id,
          created_by,
          reference_id
        )
        VALUES ($1, $2, 'RETURN', $3, 'SYSTEM', $4)
      `,
      [item.inventory_id, item.quantity, orderId, `ORDER_${orderId}_RETURN`],
    );
  }
}

async function finalizeOrderSale(client, orderId) {
  const items = await getInventoryItemsForOrder(client, orderId);
  for (const item of items) {
    await client.query(
      `
        UPDATE inventory
        SET
          stock_qty = GREATEST(stock_qty - $1, 0),
          reserved_qty = GREATEST(reserved_qty - $1, 0),
          updated_at = NOW()
        WHERE id = $2
      `,
      [item.quantity, item.inventory_id],
    );

    await client.query(
      `
        INSERT INTO inventory_transactions (
          inventory_id,
          change_amount,
          type,
          order_id,
          created_by,
          reference_id
        )
        VALUES ($1, $2, 'SALE', $3, 'SYSTEM', $4)
      `,
      [item.inventory_id, -item.quantity, orderId, `ORDER_${orderId}_SALE`],
    );
  }
}

async function rollbackReservedInventory(client, orderId) {
  const items = await getInventoryItemsForOrder(client, orderId);
  for (const item of items) {
    await client.query(
      `
        UPDATE inventory
        SET
          reserved_qty = GREATEST(reserved_qty - $1, 0),
          updated_at = NOW()
        WHERE id = $2
      `,
      [item.quantity, item.inventory_id],
    );

    await client.query(
      `
        INSERT INTO inventory_transactions (
          inventory_id,
          change_amount,
          type,
          order_id,
          created_by,
          reference_id
        )
        VALUES ($1, $2, 'EXPIRED_CANCEL', $3, 'SYSTEM', $4)
      `,
      [item.inventory_id, item.quantity, orderId, `ORDER_${orderId}_ROLLBACK`],
    );
  }
}

async function getInventoryItemsForOrder(client, orderId) {
  const { rows } = await client.query(
    `
      SELECT
        oi.product_id,
        oi.quantity,
        i.id AS inventory_id
      FROM order_items oi
      JOIN inventory i ON i.product_id = oi.product_id
      WHERE oi.order_id = $1
    `,
    [orderId],
  );

  return rows.map((row) => ({
    product_id: Number(row.product_id),
    quantity: Number(row.quantity),
    inventory_id: Number(row.inventory_id),
  }));
}
