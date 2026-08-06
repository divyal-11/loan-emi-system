import { Router } from "express";
import authRoutes from "./authRoutes";
import loanRoutes from "./loanRoutes";
import adminRoutes from "./adminRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/loans", loanRoutes);
router.use("/admin", adminRoutes);

// Future route groups:
// router.use("/repayments", repaymentRoutes);

export default router;
