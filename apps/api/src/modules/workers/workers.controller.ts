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

import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUser } from "../auth/types/auth.types";
import { CreateWorkerDto } from "./dto/create-worker.dto";
import { ListWorkersQueryDto } from "./dto/list-workers-query.dto";
import { UpdateWorkerDto } from "./dto/update-worker.dto";
import {
  WorkerListResponseDto,
  WorkerResponseDto,
  WorkerStatisticsDto,
  WorkerTaskListResponseDto,
} from "./dto/worker-response.dto";
import { WorkerTasksQueryDto } from "./dto/worker-tasks-query.dto";
import { WorkersService } from "./workers.service";

@ApiTags("Ishchilar")
@ApiBearerAuth("kirish-jetoni")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller("workers")
export class WorkersController {
  constructor(private readonly workers: WorkersService) {}

  @Post()
  @ApiOperation({ summary: "Yangi ishchi (foydalanuvchi) yaratish" })
  @ApiCreatedResponse({ type: WorkerResponseDto })
  create(@Body() dto: CreateWorkerDto) {
    return this.workers.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: "Ro‘yxat — pagination, qidiruv, rol va holat bo‘yicha filtr",
  })
  @ApiOkResponse({ type: WorkerListResponseDto })
  findAll(@Query() query: ListWorkersQueryDto) {
    return this.workers.findAll(query);
  }

  @Get("statistics")
  @ApiOperation({ summary: "Ishchilar / foydalanuvchilar statistikasi" })
  @ApiOkResponse({ type: WorkerStatisticsDto })
  getStatistics() {
    return this.workers.getStatistics();
  }

  @Get(":id/tasks")
  @ApiOperation({ summary: "Berilgan ishchining vazifalari" })
  @ApiOkResponse({ type: WorkerTaskListResponseDto })
  getTasks(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() query: WorkerTasksQueryDto,
  ) {
    return this.workers.tasksForWorker(id, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Bitta ishchi" })
  @ApiOkResponse({ type: WorkerResponseDto })
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.workers.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Ishchini yangilash" })
  @ApiOkResponse({ type: WorkerResponseDto })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWorkerDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.workers.update(id, dto, actor);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Foydalanuvchini soft-delete (faqat ADMIN)" })
  @ApiNoContentResponse()
  remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthUser,
  ): Promise<void> {
    return this.workers.remove(id, actor);
  }
}
