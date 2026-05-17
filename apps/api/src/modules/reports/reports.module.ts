import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { OrdersModule } from "../orders/orders.module";
import { OrderPdfService } from "./order-pdf.service";
import { ReportsController } from "./reports.controller";

@Module({
  imports: [AuthModule, OrdersModule],
  controllers: [ReportsController],
  providers: [OrderPdfService],
  exports: [OrderPdfService],
})
export class ReportsModule {}
