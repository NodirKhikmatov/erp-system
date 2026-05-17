import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Roles } from "./decorators/roles.decorator";
import {
  CurrentUserResponseDto,
  TokenPairResponseDto,
} from "./dto/auth-response.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import type { AuthUser } from "./types/auth.types";

@ApiTags("Autentifikatsiya")
@Controller("autentifikatsiya")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("kirish")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Elektron pochta va parol bilan tizimga kirish" })
  @ApiOkResponse({ type: TokenPairResponseDto })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "UZ: Yangi akkaunt (WORKER/MANAGER). EN: Create account (worker or manager).",
  })
  @ApiCreatedResponse({ type: TokenPairResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("jeton-yangilash")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Jetonlarni yangilash (yuborilgan yangilanish jetonini bekor qiladi)",
  })
  @ApiOkResponse({ type: TokenPairResponseDto })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("chiqish")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Yangilanish jetonini bekor qilish (chiqish)" })
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.auth.logout(dto.refreshToken);
  }

  @Get("men")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("kirish-jetoni")
  @ApiOperation({
    summary: "Joriy foydalanuvchi (kirish jetoni talab qilinadi)",
  })
  @ApiOkResponse({ type: CurrentUserResponseDto })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.getProfile(user.id);
  }

  @Get("admin/tekshiruv")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth("kirish-jetoni")
  @ApiOperation({
    summary:
      "Namunaviy ruxsat — faqat bosh administrator (ADMIN) roli kira oladi",
  })
  adminTekshiruv() {
    return { tayyor: true, daraja: "administrator" as const };
  }
}
