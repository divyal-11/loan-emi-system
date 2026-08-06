import { Router } from "express";
import { approve, reject, getPending, getAuditLogs, rejectSchema } from "../controllers/adminController";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// All admin routes require a valid token AND admin role
const adminGuard = [authMiddleware, roleMiddleware("admin")];

// GET /api/admin/loans/pending — list all PENDING applications
router.get("/loans/pending", ...adminGuard, getPending);

// GET /api/admin/audit/:loanId — view audit trail for a loan
router.get("/audit/:loanId", ...adminGuard, getAuditLogs);

// PATCH /api/admin/loans/:id/approve — approve a PENDING loan
router.patch("/loans/:id/approve", ...adminGuard, approve);

// PATCH /api/admin/loans/:id/reject — reject a PENDING loan (optional reason in body)
router.patch("/loans/:id/reject", ...adminGuard, validateRequest(rejectSchema), reject);

export default router;
