import type { UserRole } from "@prisma/client";

/** JWT access payload (signed with `JWT_ACCESS_SECRET`). */
export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: UserRole;
}

/** `req.user` after JwtStrategy.validate */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
