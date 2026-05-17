import { createHash, randomBytes } from "node:crypto";

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";

import type { Env } from "../../config/env";
import { t } from "../../i18n/messages";
import { getRequestLocale } from "../../i18n/request-locale.storage";
import { PrismaService } from "../../prisma/prisma.service";
import type { RegisterDto } from "./dto/register.dto";
import type { JwtAccessPayload } from "./types/auth.types";

const BCRYPT_ROUNDS = 12;

function hashRefreshToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** `900s`, `15m`, `1h`, `7d` formatini soniyaga aylantiradi (standart 900). */
function parseExpiresInSeconds(expires: string): number {
  const m = /^(\d+)(s|m|h|d)$/i.exec(expires.trim());
  if (!m?.[1] || !m[2]) {
    return 900;
  }
  const n = parseInt(m[1], 10);
  switch (m[2].toLowerCase()) {
    case "s":
      return n;
    case "m":
      return n * 60;
    case "h":
      return n * 3600;
    case "d":
      return n * 86400;
    default:
      return 900;
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        deletedAt: null,
        isActive: true,
      },
    });
    const lang = getRequestLocale();
    if (!user?.passwordHash) {
      throw new UnauthorizedException(t(lang, "auth.invalidCredentials"));
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException(t(lang, "auth.invalidCredentials"));
    }
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    return this.issueTokens(user);
  }

  async register(dto: RegisterDto) {
    const lang = getRequestLocale();
    const email = dto.email.trim().toLowerCase();
    const name = dto.fullname.trim();
    const taken = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (taken) {
      throw new ConflictException(t(lang, "auth.emailTaken"));
    }

    const passwordHash = await AuthService.hashPassword(dto.password);

    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          displayName: name,
          passwordHash,
          role: dto.role,
          isActive: true,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictException(t(lang, "auth.emailTaken"));
      }
      throw err;
    }

    return this.issueTokens(user);
  }

  private async issueTokens(user: User) {
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessExpires = this.config.get("JWT_ACCESS_EXPIRES", {
      infer: true,
    });
    const accessToken = await this.jwt.signAsync(payload);
    const expiresIn = parseExpiresInSeconds(accessExpires);

    const rawRefresh = randomBytes(48).toString("base64url");
    const tokenHash = hashRefreshToken(rawRefresh);
    const days = this.config.get("JWT_REFRESH_EXPIRES_DAYS", { infer: true });
    const expiresAt = new Date(Date.now() + days * 86_400_000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn,
    };
  }

  async refresh(refreshTokenRaw: string) {
    const tokenHash = hashRefreshToken(refreshTokenRaw);
    const record = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (!record || record.user.deletedAt || !record.user.isActive) {
      throw new UnauthorizedException(
        t(getRequestLocale(), "auth.invalidRefresh"),
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(record.user);
  }

  async logout(refreshTokenRaw: string): Promise<void> {
    const tokenHash = hashRefreshToken(refreshTokenRaw);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        phone: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException(
        t(getRequestLocale(), "auth.userInactive"),
      );
    }
    return user;
  }

  static hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }
}
