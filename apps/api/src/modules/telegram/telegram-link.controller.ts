import { Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUser } from "../auth/types/auth.types";
import { TelegramLinkService } from "./telegram-link.service";
import { TelegramLinkCodeResponseDto } from "./dto/telegram-link-code-response.dto";

@ApiTags("Telegram bot")
@ApiBearerAuth("kirish-jetoni")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.WORKER, UserRole.MANAGER, UserRole.ADMIN)
@Controller("integrations/telegram")
export class TelegramLinkController {
  constructor(private readonly links: TelegramLinkService) {}

  @Post("link-code")
  @ApiOperation({
    summary:
      "Telegram uchun bir martalik bog‘lash kodi (botda /start KOD deb yuboriladi)",
  })
  @ApiOkResponse({ type: TelegramLinkCodeResponseDto })
  async createLinkCode(
    @CurrentUser() user: AuthUser,
  ): Promise<TelegramLinkCodeResponseDto> {
    const { code, expiresAt } = await this.links.issueCode(user.id);
    return {
      code,
      expiresAt: expiresAt.toISOString(),
    };
  }
}
