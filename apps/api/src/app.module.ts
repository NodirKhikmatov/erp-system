import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { validateEnv } from "./config/env";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { DailyReportsModule } from "./modules/daily-reports/daily-reports.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ActivityLogModule } from "./modules/activity-log/activity-log.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { TelegramModule } from "./modules/telegram/telegram.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { WorkersModule } from "./modules/workers/workers.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    WorkersModule,
    ClientsModule,
    ActivityLogModule,
    OrdersModule,
    TasksModule,
    DailyReportsModule,
    UploadsModule,
    TelegramModule,
    ReportsModule,
    ExpensesModule,
    AnalyticsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
