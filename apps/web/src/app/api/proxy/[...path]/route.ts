import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE } from "@/lib/auth/cookies";
import { tryRefreshTokens } from "@/lib/auth/refresh-session";
import { getApiBaseUrl } from "@/lib/api-base";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function pickBearerForUpstream(
  incomingAuthorization: string | null,
  cookieAccessToken: string | undefined,
): string | undefined {
  const raw = incomingAuthorization?.trim();
  if (raw && raw.length > 7 && raw.toLowerCase().startsWith("bearer ")) {
    return raw;
  }
  if (cookieAccessToken) {
    return `Bearer ${cookieAccessToken}`;
  }
  return undefined;
}

function upstreamUnavailableResponse(err: unknown): NextResponse {
  const message =
    err instanceof Error
      ? `${err.message}${err.cause instanceof Error ? ` (${err.cause.message})` : ""}`
      : "fetch failed";
  return NextResponse.json(
    { error: "upstream_unavailable", message },
    { status: 503 },
  );
}

const NO_REFRESH_401_SEGMENTS = [
  "autentifikatsiya/jeton-yangilash",
  "autentifikatsiya/kirish",
  "autentifikatsiya/register",
];

function allowsRefreshRetry(path: string, method: string): boolean {
  if (method === "OPTIONS") {
    return false;
  }
  return !NO_REFRESH_401_SEGMENTS.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

async function forward(
  req: NextRequest,
  pathParts: string[],
  method: string,
): Promise<NextResponse> {
  const path = pathParts.join("/");
  const search = req.nextUrl.search;
  const target = `${getApiBaseUrl()}/${path}${search}`;

  const accept = req.headers.get("accept");
  const acceptLanguage = req.headers.get("accept-language");
  const incomingAuth = req.headers.get("authorization");
  const reqContentType = req.headers.get("content-type");

  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;

  const headersInit = new Headers();
  if (accept) {
    headersInit.set("Accept", accept);
  }
  if (acceptLanguage) {
    headersInit.set("Accept-Language", acceptLanguage);
  }
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();
  if (reqContentType && body !== undefined) {
    headersInit.set("Content-Type", reqContentType);
  }
  const bearer = pickBearerForUpstream(incomingAuth, token);
  if (bearer) {
    headersInit.set("Authorization", bearer);
  }

  let res: Response;
  try {
    res = await fetch(target, {
      method,
      headers: headersInit,
      ...(body !== undefined ? { body } : {}),
      cache: "no-store",
    });
  } catch (err) {
    return upstreamUnavailableResponse(err);
  }

  if (res.status === 401 && allowsRefreshRetry(path, method)) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      const retryHeaders = new Headers();
      if (accept) {
        retryHeaders.set("Accept", accept);
      }
      if (acceptLanguage) {
        retryHeaders.set("Accept-Language", acceptLanguage);
      }
      if (reqContentType && body !== undefined) {
        retryHeaders.set("Content-Type", reqContentType);
      }
      const tok2 = (await cookies()).get(ACCESS_COOKIE)?.value;
      const retryBearer = tok2
        ? `Bearer ${tok2}`
        : pickBearerForUpstream(incomingAuth, token);
      if (retryBearer) {
        retryHeaders.set("Authorization", retryBearer);
      }
      try {
        res = await fetch(target, {
          method,
          headers: retryHeaders,
          ...(body !== undefined ? { body } : {}),
          cache: "no-store",
        });
      } catch (err) {
        return upstreamUnavailableResponse(err);
      }
    }
  }

  const outHeaders = new Headers();
  const resCt = res.headers.get("content-type");
  if (resCt) {
    outHeaders.set("Content-Type", resCt);
  }
  return new NextResponse(res.body, {
    status: res.status,
    headers: outHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, "GET");
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, "POST");
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, "PATCH");
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, "PUT");
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, "DELETE");
}
