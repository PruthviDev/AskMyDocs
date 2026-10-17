import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import { migrate } from "./db";
import { authRouter } from "./auth/auth";
import { router } from "./routes";
import { requireAuth } from "./auth/auth";
import { AppError } from "./errors";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api", requireAuth, router);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

migrate()
  .then(() => app.listen(PORT, () => console.log(`API listening on :${PORT}`)))
  .catch((e) => { console.error("Migration failed", e); process.exit(1); });
