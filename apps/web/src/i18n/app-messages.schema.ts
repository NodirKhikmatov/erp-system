import type auth from "../../messages/en/auth.json";
import type common from "../../messages/en/common.json";
import type dashboard from "../../messages/en/dashboard.json";
import type errors from "../../messages/en/errors.json";
import type expenses from "../../messages/en/expenses.json";
import type orders from "../../messages/en/orders.json";
import type reports from "../../messages/en/reports.json";
import type settings from "../../messages/en/settings.json";
import type tasks from "../../messages/en/tasks.json";
import type validation from "../../messages/en/validation.json";
import type workers from "../../messages/en/workers.json";

/** Shape of all namespaces (mirror `messages/en/*.json`). */
export type AppIntlMessages = {
  auth: typeof auth;
  common: typeof common;
  dashboard: typeof dashboard;
  orders: typeof orders;
  tasks: typeof tasks;
  workers: typeof workers;
  expenses: typeof expenses;
  reports: typeof reports;
  settings: typeof settings;
  validation: typeof validation;
  errors: typeof errors;
};

declare module "next-intl" {
  interface AppConfig {
    Messages: AppIntlMessages;
  }
}
