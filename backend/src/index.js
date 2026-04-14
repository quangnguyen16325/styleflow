import express from "express";
import cors from "cors";

import { migrate } from "./db/migrate.js";
import authRouter from "./routes/auth.js";
import productsRouter from "./routes/products.js";
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
