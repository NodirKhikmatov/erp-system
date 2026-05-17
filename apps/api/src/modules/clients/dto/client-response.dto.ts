import { ApiProperty } from "@nestjs/swagger";
import { OrderStatus } from "@prisma/client";

export class ClientOrderSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ nullable: true })
  totalAmount!: number | null;

  @ApiProperty({ nullable: true, description: "Oldindan to‘lov" })
  prepayment!: number | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  dueDate!: Date | null;
}

export class ClientResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: "To‘liq ism / mijoz nomi" })
  fullName!: string;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty({ nullable: true })
  createdById!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({
    type: [ClientOrderSummaryDto],
    description: "So‘nggi buyurtmalar (oxirgi 5 ta)",
  })
  latestOrders!: ClientOrderSummaryDto[];
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

export class ClientListResponseDto {
  @ApiProperty({ type: [ClientResponseDto] })
  data!: ClientResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
