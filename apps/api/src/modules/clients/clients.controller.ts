import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
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
import {
  ClientListResponseDto,
  ClientResponseDto,
} from "./dto/client-response.dto";
import { CreateClientDto } from "./dto/create-client.dto";
import { ListClientsQueryDto } from "./dto/list-clients-query.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { ClientsService } from "./clients.service";

@ApiTags("Mijozlar")
@ApiBearerAuth("kirish-jetoni")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller("clients")
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Post()
  @ApiOperation({ summary: "Yangi mijoz yaratish" })
  @ApiCreatedResponse({ type: ClientResponseDto })
  create(@Body() dto: CreateClientDto, @CurrentUser() user: AuthUser) {
    return this.clients.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary:
      "Ro‘yxat — pagination, qidiruv, buyurtma holati / buyurtma borligi filtri",
  })
  @ApiOkResponse({ type: ClientListResponseDto })
  findAll(@Query() query: ListClientsQueryDto) {
    return this.clients.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Bitta mijoz (so‘nggi buyurtmalar bilan)" })
  @ApiOkResponse({ type: ClientResponseDto })
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.clients.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Mijozni yangilash" })
  @ApiOkResponse({ type: ClientResponseDto })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clients.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mijozni soft-delete qilish" })
  @ApiNoContentResponse()
  remove(@Param("id", new ParseUUIDPipe()) id: string): Promise<void> {
    return this.clients.remove(id);
  }
}
