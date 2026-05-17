import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

/** Faqat brauzer ichki so‘rovi; JWT ni Socket.IO `auth.token` ga berish uchun. */
export async function GET() {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ token });
}
