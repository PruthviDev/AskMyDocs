import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "./errors";

export function validate(schema: z.ZodType, source: "body" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw new AppError(400, result.error.issues[0]?.message ?? "Invalid request.");
    }
    if (source === "body") req.body = result.data; // stripped + normalized
    next();
  };
}

const emailSchema = z
  .string({ error: "Email is required." })
  .trim()
  .toLowerCase()
  .max(254, "Email is too long.")
  .email("Enter a valid email address.");

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Password is required." })
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters.")
    .regex(/[A-Za-z]/, "Password must contain a letter.")
    .regex(/\d/, "Password must contain a number."),
});

// Login doesn't enforce strength rules, only sane bounds
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Password is required." })
    .min(1, "Password is required.")
    .max(72, "Invalid email or password."),
});

export const askSchema = z.object({
  question: z
    .string({ error: "Question is required." })
    .trim()
    .min(3, "Question must be 3-1000 characters.")
    .max(1000, "Question must be 3-1000 characters."),
  documentId: z.coerce.number().int().positive().nullish(),
});

export const idParamSchema = z.object({
  id: z.coerce.number({ error: "Invalid document id." }).int().positive("Invalid document id."),
});