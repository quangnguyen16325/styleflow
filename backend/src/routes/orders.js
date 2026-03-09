import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json([]);
});

router.post("/", (_req, res) => {
  res.status(501).json({ message: "Order flow is not implemented in base template" });
});

export default router;
