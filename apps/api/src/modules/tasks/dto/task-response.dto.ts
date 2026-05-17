import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OrderStatus, TaskActivityType, TaskStatus } from "@prisma/client";

export class TaskWorkerSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;
}

export class TaskOrderSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;
}

export class TaskResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty({ nullable: true, description: "assigneeId" })
  workerId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true, description: "startedAt" })
  startDate!: Date | null;

  @ApiProperty({ nullable: true, description: "dueDate" })
  endDate!: Date | null;

  @ApiProperty({ nullable: true })
  completedAt!: Date | null;

  @ApiProperty({ enum: TaskStatus })
  status!: TaskStatus;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class TaskDetailResponseDto extends TaskResponseDto {
  @ApiProperty({ type: TaskOrderSummaryDto })
  order!: TaskOrderSummaryDto;

  @ApiProperty({ type: TaskWorkerSummaryDto, nullable: true })
  worker!: TaskWorkerSummaryDto | null;
}

export class TaskCommentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: TaskWorkerSummaryDto })
  author!: TaskWorkerSummaryDto;
}

export class TaskTimelineActivityDto {
  @ApiProperty({ enum: ["activity"] })
  kind!: "activity";

  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: TaskActivityType })
  type!: TaskActivityType;

  @ApiProperty({ nullable: true })
  meta!: unknown;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ type: TaskWorkerSummaryDto, nullable: true })
  actor!: TaskWorkerSummaryDto | null;
}

export class TaskTimelineCommentDto {
  @ApiProperty({ enum: ["comment"] })
  kind!: "comment";

  @ApiProperty()
  id!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: TaskWorkerSummaryDto })
  author!: TaskWorkerSummaryDto;
}

export class TaskTimelineResponseDto {
  @ApiProperty({
    description: "Vaqt bo‘yicha kamayish tartibida",
    type: "array",
    items: {
      oneOf: [
        { $ref: "#/components/schemas/TaskTimelineActivityDto" },
        { $ref: "#/components/schemas/TaskTimelineCommentDto" },
      ],
    },
  })
  items!: (TaskTimelineActivityDto | TaskTimelineCommentDto)[];
}

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class TaskListResponseDto {
  @ApiProperty({ type: [TaskResponseDto] })
  data!: TaskResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class TaskListWithOrderResponseDto {
  @ApiProperty({ type: [TaskDetailResponseDto] })
  data!: TaskDetailResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
