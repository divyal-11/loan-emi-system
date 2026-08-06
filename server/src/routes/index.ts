import { Router } from "express";
import authRoutes from "./authRoutes";

const router = Router();

router.use("/auth", authRoutes);

// Future route groups will be mounted here as each phase is completed:
// router.use("/loans", loanRoutes);
// router.use("/repayments", repaymentRoutes);
// router.use("/admin", adminRoutes);

export default router;
