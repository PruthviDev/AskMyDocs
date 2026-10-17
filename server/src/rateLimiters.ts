import rateLimit from "express-rate-limit";

const base = {
  standardHeaders: true,
  legacyHeaders: false,
} as const;

const msg = (error: string) => ({ error });

// Every /api request, per IP
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 120,
  message: msg("Too many requests. Please slow down."),
});

// Brute-force protection: only failed logins count
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: msg("Too many login attempts. Try again in 15 minutes."),
});

export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: msg("Too many sign-ups from this network. Try again later."),
});

// Per-user limiters (must run after requireAuth)
export const uploadLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => `upload:${req.userId}`,
  message: msg("Upload limit reached (20 per hour). Try again later."),
});

export const askLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 15,
  keyGenerator: (req) => `ask:${req.userId}`,
  message: msg("You're asking too fast. Wait a moment and try again."),
});