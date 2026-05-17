import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TaskStatus } from "@prisma/client";

export class DailyReportWorkerSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;
}

export class DailyReportTaskSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: TaskStatus })
  status!: TaskStatus;

  @ApiProperty()
  orderId!: string;
}

export class DailyReportResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workerId!: string;

  @ApiProperty({ nullable: true })
  taskId!: string | null;

  @ApiProperty()
  message!: string;

  @ApiProperty({ nullable: true, description: "Asosiy rasm" })
  photoUrl!: string | null;

  @ApiPropertyOptional({
    description: "Barcha rasmlar: photoUrl + qo‘shimchalar",
    type: [String],
  })
  imageUrls?: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: DailyReportWorkerSummaryDto })
  worker!: DailyReportWorkerSummaryDto;

  @ApiProperty({ type: DailyReportTaskSummaryDto, nullable: true })
  task!: DailyReportTaskSummaryDto | null;
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

export class DailyReportListResponseDto {
  @ApiProperty({ type: [DailyReportResponseDto] })
  data!: DailyReportResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
