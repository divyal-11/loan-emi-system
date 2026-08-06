import { Router } from "express";
import { apply, mine, getById, applySchema } from "../controllers/loanController";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// POST /api/loans/apply — borrower only
router.post("/apply", authMiddleware, roleMiddleware("borrower"), validateRequest(applySchema), apply);

// GET /api/loans/mine — borrower only (returns their own applications)
router.get("/mine", authMiddleware, roleMiddleware("borrower"), mine);

// GET /api/loans/:id — borrower (own loan) or admin; ownership checked in controller
router.get("/:id", authMiddleware, getById);

export default router;
