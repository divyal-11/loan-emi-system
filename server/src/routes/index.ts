import { Router } from "express";
import authRoutes from "./authRoutes";
import loanRoutes from "./loanRoutes";
import adminRoutes from "./adminRoutes";
import repaymentRoutes from "./repaymentRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/loans", loanRoutes);
router.use("/admin", adminRoutes);
router.use("/repayments", repaymentRoutes);

export default router;
