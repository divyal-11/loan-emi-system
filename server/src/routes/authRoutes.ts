import { Router } from "express";
import { signup, login, me, signupSchema, loginSchema } from "../controllers/authController";
import { validateRequest } from "../middleware/validateRequest";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// POST /api/auth/signup — public
router.post("/signup", validateRequest(signupSchema), signup);

// POST /api/auth/login — public
router.post("/login", validateRequest(loginSchema), login);

// GET /api/auth/me — protected (any authenticated user)
router.get("/me", authMiddleware, me);

export default router;
