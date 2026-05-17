import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

export class ActivityLogActorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;
}

export class ActivityLogItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  entityType!: string;

  @ApiProperty()
  entityId!: string;

  @ApiPropertyOptional({ nullable: true })
  meta!: unknown;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ type: ActivityLogActorDto, nullable: true })
  actor!: ActivityLogActorDto | null;
}

export class ActivityLogListResponseDto {
  @ApiProperty({ type: [ActivityLogItemDto] })
  data!: ActivityLogItemDto[];
}
