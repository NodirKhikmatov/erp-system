import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "./src/i18n/routing";
import { ACCESS_COOKIE } from "./src/lib/auth/cookies";

const handleI18nRouting = createMiddleware(routing);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/orders",
  "/tasks",
  "/worker",
  "/workers",
  "/expenses",
  "/reports",
  "/settings",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function stripLocale(
  pathname: string,
): { locale: string; rest: string } | null {
  const pattern = new RegExp(`^\\/(${routing.locales.join("|")})(\\/.*)?$`);
  const match = pathname.match(pattern);
  if (!match?.[1]) {
    return null;
  }
  const locale = match[1];
  const rest = !match[2] || match[2] === "/" ? "/" : match[2];
  return { locale, rest };
}

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const intlResponse = handleI18nRouting(request);
  if (intlResponse.status >= 300) {
    return intlResponse;
  }

  const stripped = stripLocale(request.nextUrl.pathname);
  if (!stripped) {
    return intlResponse;
  }

  const { locale, rest } = stripped;
  const token = request.cookies.get(ACCESS_COOKIE)?.value;

  if (isProtectedPath(rest) && !token) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("next", rest);
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
