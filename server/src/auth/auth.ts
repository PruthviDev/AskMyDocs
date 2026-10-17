import { Router, type NextFunction, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db";
import { AppError } from "../errors";
import { validate, loginSchema, registerSchema } from "../validate";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not set");
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

const sign = (userId: number) => jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: EXPIRES_IN as any });

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new AppError(401, "Please log in to continue.");
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as unknown as { sub: number };
    req.userId = Number(payload.sub);
    next();
  } catch {
    throw new AppError(401, "Your session has expired. Please log in again.");
  }
}

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id, email",
      [email, hash]
    );
    res.status(201).json({ token: sign(rows[0].id), user: rows[0] });
  } catch (e: any) {
    if (e.code === "23505") throw new AppError(409, "An account with this email already exists.");
    throw e;
  }
});

authRouter.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new AppError(401, "Invalid email or password.");
  res.json({ token: sign(user.id), user: { id: user.id, email: user.email } });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT id, email FROM users WHERE id = $1", [req.userId]);
  if (!rows[0]) throw new AppError(401, "Account no longer exists.");
  res.json({ user: rows[0] });
});