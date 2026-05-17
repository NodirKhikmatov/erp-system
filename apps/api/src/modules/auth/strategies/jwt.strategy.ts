import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import type { Env } from "../../../config/env";
import { t } from "../../../i18n/messages";
import { getRequestLocale } from "../../../i18n/request-locale.storage";
import { PrismaService } from "../../../prisma/prisma.service";
import type { JwtAccessPayload } from "../types/auth.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get("JWT_ACCESS_SECRET", { infer: true });
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtAccessPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      throw new UnauthorizedException(t(getRequestLocale(), "auth.jwtInvalid"));
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
