import express from "express";
import cors from "cors";

import { migrate } from "./db/migrate.js";
import { attachAuthCustomerId, requireAuth, requireRole } from "./middleware/require-auth.js";
import adminOrdersRouter from "./routes/admin-orders.js";
import adminPaymentIncidentsRouter from "./routes/admin-payment-incidents.js";
import adminRefundRequestsRouter from "./routes/admin-refund-requests.js";
import adminSystemConfigRouter from "./routes/admin-system-config.js";
import authRouter from "./routes/auth.js";
import addressesRouter from "./routes/addresses.js";
import deliveryRouter from "./routes/delivery.js";
import issuesRouter from "./routes/issues.js";
import meRouter from "./routes/me.js";
import paymentsRouter from "./routes/payments.js";
import productsRouter from "./routes/products.js";
import refundRequestsRouter from "./routes/refund-requests.js";
import ordersRouter from "./routes/orders.js";

const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.WEB_ORIGIN || "*" }));

app.get("/", (_req, res) => {
  res.json({ name: "Order API Base", ok: true });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "backend" });
});

app.use("/auth", authRouter);
app.use("/me", requireAuth, meRouter);
app.use("/me/addresses", requireAuth, attachAuthCustomerId, addressesRouter);
app.use("/refund-requests", requireAuth, refundRequestsRouter);
app.use("/", deliveryRouter);
app.use("/", paymentsRouter);
app.use("/admin/orders", requireAuth, requireRole("admin", "staff"), adminOrdersRouter);
app.use(
  "/admin/payment-incidents",
  requireAuth,
  requireRole("admin", "staff"),
  adminPaymentIncidentsRouter,
);
app.use("/admin/issues", requireAuth, requireRole("admin", "staff"), issuesRouter);
app.use(
  "/admin/refund-requests",
  requireAuth,
  requireRole("admin", "staff"),
  adminRefundRequestsRouter,
);
app.use(
  "/admin/system-config",
  requireAuth,
  requireRole("admin", "staff"),
  adminSystemConfigRouter,
);
app.use("/customers/:customerId/addresses", addressesRouter);
app.use("/products", productsRouter);
app.use("/orders", ordersRouter);

const PORT = Number(process.env.PORT || 5000);

migrate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend base listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
  });
