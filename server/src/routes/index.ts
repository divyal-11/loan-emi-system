import { Router } from "express";
import authRoutes from "./authRoutes";
import loanRoutes from "./loanRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/loans", loanRoutes);

// Future route groups will be mounted here as each phase is completed:
// router.use("/repayments", repaymentRoutes);
// router.use("/admin", adminRoutes);

export default router;
