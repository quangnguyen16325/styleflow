import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  return res.json({
    customer: req.authCustomer,
  });
});

export default router;
