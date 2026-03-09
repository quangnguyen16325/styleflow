import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json([]);
});

router.get("/:id", (_req, res) => {
  res.status(404).json({ message: "Product not found in base template" });
});

export default router;
