import { ApiProperty } from "@nestjs/swagger";
import { TaskStatus, UserRole } from "@prisma/client";

export class WorkerResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ description: "To‘liq ism" })
  fullName!: string;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true, description: "Oylik (UZS)" })
  salary!: number | null;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
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

export class WorkerListResponseDto {
  @ApiProperty({ type: [WorkerResponseDto] })
  data!: WorkerResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class WorkerRoleCountDto {
  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  count!: number;
}

export class WorkerStatisticsDto {
  @ApiProperty({ description: "Jami foydalanuvchilar (o‘chirilmagan)" })
  total!: number;

  @ApiProperty({ type: [WorkerRoleCountDto] })
  byRole!: WorkerRoleCountDto[];

  @ApiProperty()
  active!: number;

  @ApiProperty()
  inactive!: number;

  @ApiProperty({
    nullable: true,
    description: "Oylik ko‘rsatilgan foydalanuvchilar o‘rtacha oyligi (UZS)",
  })
  averageSalary!: number | null;

  @ApiProperty({
    description:
      "Kamida bitta ochiq vazifasi bor ishchilar soni (PENDING yoki WORKING)",
  })
  workersWithOpenTasks!: number;
}

export class WorkerTaskItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: TaskStatus })
  status!: TaskStatus;

  @ApiProperty({ nullable: true })
  dueDate!: Date | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;
}

export class WorkerTaskListResponseDto {
  @ApiProperty({ type: [WorkerTaskItemDto] })
  data!: WorkerTaskItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
