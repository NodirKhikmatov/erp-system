import type { NextFunction, Request, Response } from "express";

import { parseLocale } from "./locale";
import { requestLocaleStorage } from "./request-locale.storage";

export function i18nMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers["accept-language"] as
    | string
    | string[]
    | undefined;
  const raw: string | undefined = Array.isArray(header) ? header[0] : header;
  const locale = parseLocale(raw);
  requestLocaleStorage.run(locale, () => {
    next();
  });
}
