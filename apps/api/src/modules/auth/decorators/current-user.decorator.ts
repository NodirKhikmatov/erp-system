import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";

import { t } from "../../../i18n/messages";
import { getRequestLocale } from "../../../i18n/request-locale.storage";
import type { AuthUser } from "../types/auth.types";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException(
        t(getRequestLocale(), "auth.unauthorized"),
      );
    }
    return user;
  },
);
