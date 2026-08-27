import { z } from "zod";

export const LoginRequestSchema = z.object({
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthStatusSchema = z.object({
  authenticated: z.boolean(),
  authRequired: z.boolean(),
});
export type AuthStatus = z.infer<typeof AuthStatusSchema>;
