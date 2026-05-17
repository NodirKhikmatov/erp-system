import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { t } from "../../i18n/messages";
import { getRequestLocale } from "../../i18n/request-locale.storage";
import { AddTaskCommentDto } from "./dto/add-task-comment.dto";
import { CreateTaskDto } from "./dto/create-task.dto";
import {
  ListMyTasksQueryDto,
  ListTasksQueryDto,
} from "./dto/list-tasks-query.dto";
import {
  TaskCommentResponseDto,
  TaskDetailResponseDto,
  TaskListWithOrderResponseDto,
  TaskTimelineResponseDto,
} from "./dto/task-response.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { UpdateTaskStatusDto } from "./dto/update-task-status.dto";
import { TasksService } from "./tasks.service";

@ApiTags("Vazifalar")
@ApiBearerAuth("kirish-jetoni")
@Controller("tasks")
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Yangi vazifa yaratish va ishchiga biriktirish" })
  @ApiCreatedResponse({ type: TaskDetailResponseDto })
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasks.create(dto, user);
  }

  @Get("my")
  @ApiOperation({ summary: "Joriy foydalanuvchining vazifalari (ishchi)" })
  @ApiOkResponse({ type: TaskListWithOrderResponseDto })
  listMine(@CurrentUser() user: AuthUser, @Query() query: ListMyTasksQueryDto) {
    return this.tasks.listForWorker(user.id, query);
  }

  @Get("by-worker/:workerId")
  @ApiOperation({
    summary: "Berilgan ishchining vazifalari (o‘zi yoki ADMIN/MANAGER)",
  })
  @ApiOkResponse({ type: TaskListWithOrderResponseDto })
  listByWorker(
    @Param("workerId", new ParseUUIDPipe()) workerId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: ListMyTasksQueryDto,
  ) {
    if (user.role === UserRole.WORKER && workerId !== user.id) {
      throw new ForbiddenException(t(getRequestLocale(), "task.forbidden"));
    }
    return this.tasks.listForWorker(workerId, query);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Barcha vazifalar — filtr va pagination" })
  @ApiOkResponse({ type: TaskListWithOrderResponseDto })
  findAll(@Query() query: ListTasksQueryDto) {
    return this.tasks.findAll(query);
  }

  @Get(":id/timeline")
  @ApiOperation({ summary: "Vazifa vaqti chizig‘i (faollar + izohlar)" })
  @ApiOkResponse({ type: TaskTimelineResponseDto })
  getTimeline(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasks.getTimeline(id, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Vazifa tafsilotlari" })
  @ApiOkResponse({ type: TaskDetailResponseDto })
  findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasks.findOne(id, user);
  }

  @Post(":id/comments")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WORKER)
  @ApiOperation({ summary: "Vazifaga izoh qo‘shish" })
  @ApiCreatedResponse({ type: TaskCommentResponseDto })
  addComment(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AddTaskCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasks.addComment(id, dto, user);
  }

  @Patch(":id/status")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WORKER)
  @ApiOperation({ summary: "Vazifa holatini yangilash" })
  @ApiOkResponse({ type: TaskDetailResponseDto })
  updateStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasks.updateStatus(id, dto, user);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WORKER)
  @ApiOperation({
    summary: "Vazifani yangilash (biriktirish — faqat boshqaruvchi)",
  })
  @ApiOkResponse({ type: TaskDetailResponseDto })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasks.update(id, dto, user);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Vazifani soft-delete qilish" })
  @ApiNoContentResponse()
  remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.tasks.remove(id, user);
  }
}
