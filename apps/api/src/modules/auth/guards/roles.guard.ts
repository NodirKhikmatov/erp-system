import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@prisma/client";

import { ROLES_KEY } from "../decorators/roles.decorator";
import { t } from "../../../i18n/messages";
import { getRequestLocale } from "../../../i18n/request-locale.storage";
import type { AuthUser } from "../types/auth.types";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    const lang = getRequestLocale();
    if (!user) {
      throw new ForbiddenException(t(lang, "auth.forbidden"));
    }
    if (!required.includes(user.role)) {
      throw new ForbiddenException(t(lang, "auth.insufficientRole"));
    }
    return true;
  }
}
