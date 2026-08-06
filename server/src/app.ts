import express, { Application, Request, Response } from "express";
import cors from "cors";

const app: Application = express();

app.use(cors());
app.use(express.json());

// Health check — used to verify the server is up and, once DB is wired in,
// will be extended to confirm DB connectivity too.
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { status: "ok" } });
});

// Route mounting will grow here as each phase adds a new resource:
// app.use("/api/auth", authRoutes);
// app.use("/api/loans", loanRoutes);
// app.use("/api/repayments", repaymentRoutes);
// app.use("/api/admin", adminRoutes);

export default app;
