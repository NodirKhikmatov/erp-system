import {
  ExpenseCategory,
  OrderStatus,
  TaskStatus,
  UserRole,
} from "@furniture/types";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DEV_PASSWORD = "ChangeMe!123";

async function upsertUser(
  email: string,
  displayName: string,
  role: (typeof UserRole)[keyof typeof UserRole],
): Promise<{ id: string }> {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);
  let user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        displayName,
        role,
        passwordHash,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName,
        salary: role === UserRole.Worker ? 3_500_000 : null,
        passwordHash,
        isActive: true,
      },
    });
  }
  return user;
}

async function main(): Promise<void> {
  const admin = await upsertUser(
    "admin@mebel-erp.local",
    "Bosh administrator",
    UserRole.Admin,
  );
  const manager = await upsertUser(
    "manager@mebel-erp.local",
    "Ishlab chiqarish boshlig‘i",
    UserRole.Manager,
  );
  const worker = await upsertUser(
    "worker@mebel-erp.local",
    "Sex ustasi",
    UserRole.Worker,
  );

  let client = await prisma.client.findFirst({
    where: { email: "buyurtma@namuna-interyer.example", deletedAt: null },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: "«Namuna interyer» MCHJ",
        companyName: "Namuna interyer mas’uliyati cheklangan jamiyati",
        email: "buyurtma@namuna-interyer.example",
        phone: "+998901234567",
        createdById: admin.id,
      },
    });
  }

  let order = await prisma.order.findFirst({
    where: {
      clientId: client.id,
      title: "Eman ovqat stoli to‘plami — 1-partiya",
      deletedAt: null,
    },
  });
  if (!order) {
    order = await prisma.order.create({
      data: {
        clientId: client.id,
        createdById: manager.id,
        title: "Eman ovqat stoli to‘plami — 1-partiya",
        description: "12 ta stol, 48 ta stul",
        status: OrderStatus.InProgress,
        currency: "UZS",
      },
    });
  }

  const existingTask = await prisma.task.findFirst({
    where: { orderId: order.id, title: "Taxta kesish", deletedAt: null },
  });
  if (!existingTask) {
    await prisma.task.create({
      data: {
        orderId: order.id,
        assigneeId: worker.id,
        title: "Taxta kesish",
        status: TaskStatus.Working,
        sortOrder: 1,
      },
    });
  }

  const existingExpense = await prisma.expense.findFirst({
    where: {
      orderId: order.id,
      description: "Eman taxtalari — boshlang‘ich zaxira",
      deletedAt: null,
    },
  });
  if (!existingExpense) {
    await prisma.expense.create({
      data: {
        orderId: order.id,
        recordedById: manager.id,
        category: ExpenseCategory.Material,
        amount: 15_000_000,
        currency: "UZS",
        description: "Eman taxtalari — boshlang‘ich zaxira",
        incurredOn: new Date(),
      },
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingLog = await prisma.dailyLog.findFirst({
    where: { userId: worker.id, logDate: today, deletedAt: null },
  });
  if (!existingLog) {
    await prisma.dailyLog.create({
      data: {
        userId: worker.id,
        logDate: today,
        summary: "Kesish sexi — kunlik namuna yozuvi",
        hoursWorked: 7.5,
      },
    });
  }

  const demoTelegramId = 99_999_999_999n;
  await prisma.telegramUser.deleteMany({
    where: { userId: admin.id },
  });
  await prisma.telegramUser.deleteMany({
    where: { telegramId: demoTelegramId },
  });
  await prisma.telegramUser.create({
    data: {
      userId: admin.id,
      telegramId: demoTelegramId,
      username: "mebel_erp_namuna_bot",
      firstName: "Namuna",
    },
  });
}

void main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
