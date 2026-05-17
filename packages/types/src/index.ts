/** Mebel ERP uchun umumiy domen enumlari (Prisma `schema.prisma` bilan mos). */

export const UserRole = {
  Admin: "ADMIN",
  Manager: "MANAGER",
  Worker: "WORKER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OrderStatus = {
  New: "NEW",
  InProgress: "IN_PROGRESS",
  Ready: "READY",
  Delivered: "DELIVERED",
  Cancelled: "CANCELLED",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const TaskStatus = {
  Pending: "PENDING",
  Working: "WORKING",
  Done: "DONE",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const ExpenseCategory = {
  Material: "MATERIAL",
  Salary: "SALARY",
  Transport: "TRANSPORT",
  Other: "OTHER",
} as const;

export type ExpenseCategory =
  (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

/** Interfeysda ko‘rsatish uchun (ma’lumotlar bazasi qiymatlari o‘zgarmaydi). */
export const orderStatusLabelsUz: Record<OrderStatus, string> = {
  [OrderStatus.New]: "Yangi",
  [OrderStatus.InProgress]: "Jarayonda",
  [OrderStatus.Ready]: "Tayyor",
  [OrderStatus.Delivered]: "Yetkazilgan",
  [OrderStatus.Cancelled]: "Bekor qilingan",
};

export const taskStatusLabelsUz: Record<TaskStatus, string> = {
  [TaskStatus.Pending]: "Kutilmoqda",
  [TaskStatus.Working]: "Bajarilmoqda",
  [TaskStatus.Done]: "Tugallangan",
};

export const expenseCategoryLabelsUz: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Material]: "Materiallar",
  [ExpenseCategory.Salary]: "Ish haqi",
  [ExpenseCategory.Transport]: "Transport",
  [ExpenseCategory.Other]: "Boshqa",
};

export const userRoleLabelsUz: Record<UserRole, string> = {
  [UserRole.Admin]: "Administrator",
  [UserRole.Manager]: "Menejer",
  [UserRole.Worker]: "Ishchi",
};

export const orderStatusLabelsEn: Record<OrderStatus, string> = {
  [OrderStatus.New]: "New",
  [OrderStatus.InProgress]: "In progress",
  [OrderStatus.Ready]: "Ready",
  [OrderStatus.Delivered]: "Delivered",
  [OrderStatus.Cancelled]: "Cancelled",
};

export const taskStatusLabelsEn: Record<TaskStatus, string> = {
  [TaskStatus.Pending]: "Pending",
  [TaskStatus.Working]: "Working",
  [TaskStatus.Done]: "Done",
};

export const expenseCategoryLabelsEn: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Material]: "Materials",
  [ExpenseCategory.Salary]: "Salary",
  [ExpenseCategory.Transport]: "Transport",
  [ExpenseCategory.Other]: "Other",
};

export const userRoleLabelsEn: Record<UserRole, string> = {
  [UserRole.Admin]: "Administrator",
  [UserRole.Manager]: "Manager",
  [UserRole.Worker]: "Worker",
};

export type AppLocale = "uz" | "en";

export interface HealthResponse {
  /** Tizim yaroqli ekanligi. */
  holat: "yaroqli";
  /** Xizmat nomi. */
  xizmat: string;
  /** ISO-8601 vaqt belgisi. */
  vaqt: string;
  /** Inson o‘qishi uchun qisqa xabar (til `Accept-Language` ga qarab). */
  xabar: string;
}

export interface PaginatedQuery {
  cursor?: string;
  limit?: number;
}

/** API xatolik javobi (oldingi sarlavha va xabarlar — o‘zbekcha bo‘lishi mumkin). */
export interface ApiErrorBody {
  statusCode: number;
  message: string;
  code?: string;
  details?: unknown;
}
