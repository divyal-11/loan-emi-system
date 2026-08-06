import express, { Application, Request, Response } from "express";
import cors from "cors";
import apiRoutes from "./routes/index";
import { errorHandler } from "./middleware/errorHandler";

const app: Application = express();

app.use(cors());
app.use(express.json());

// Health check — no auth required; also confirms the server process is alive
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { status: "ok" } });
});

// All /api/* routes
app.use("/api", apiRoutes);

// Global error handler — MUST be last middleware registered
app.use(errorHandler);

export default app;
