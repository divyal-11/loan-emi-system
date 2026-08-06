import { Router } from "express";
import { getSchedule, markPaid } from "../controllers/repaymentController";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();

// GET /api/repayments/:loanId — borrower (own loan) or admin (ownership checked in controller)
router.get("/:loanId", authMiddleware, getSchedule);

// PATCH /api/repayments/:id/pay — borrower only
router.patch("/:id/pay", authMiddleware, roleMiddleware("borrower"), markPaid);

export default router;
