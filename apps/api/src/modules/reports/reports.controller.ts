import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import type { Response } from "express";

import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { OrderPdfService } from "./order-pdf.service";

@ApiTags("Hisobotlar (PDF)")
@ApiBearerAuth("kirish-jetoni")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller("reports")
export class ReportsController {
  constructor(private readonly orderPdfService: OrderPdfService) {}

  @Get("orders/:orderId/pdf")
  @ApiOperation({
    summary:
      "Buyurtma bo‘yicha PDF: mijoz, buyurtma, vazifalar/ishchilar, xarajatlar, foyda",
  })
  @ApiProduces("application/pdf")
  @ApiOkResponse({ description: "application/pdf binary" })
  async getOrderPdf(
    @Param("orderId", new ParseUUIDPipe()) orderId: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.orderPdfService.renderOrderPdf(orderId);
    const name = `order-${orderId.slice(0, 8)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${name}"`);
    res.setHeader("Content-Length", String(buffer.length));
    res.send(buffer);
  }
}
