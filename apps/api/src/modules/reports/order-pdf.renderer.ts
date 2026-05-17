import { ExpenseCategory } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { OrderPdfModel } from "../orders/orders.service";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d: Date | null): string {
  if (!d) {
    return "—";
  }
  return d.toLocaleDateString("en-GB", { dateStyle: "medium" });
}

function categoryLabel(c: ExpenseCategory): string {
  const map: Record<ExpenseCategory, string> = {
    [ExpenseCategory.MATERIAL]: "Materials",
    [ExpenseCategory.SALARY]: "Salary",
    [ExpenseCategory.TRANSPORT]: "Transport",
    [ExpenseCategory.OTHER]: "Other",
  };
  return map[c];
}

let templateCache: string | null = null;

function loadTemplate(): string {
  if (templateCache) {
    return templateCache;
  }
  const path = join(__dirname, "templates", "order-invoice.html");
  templateCache = readFileSync(path, "utf-8");
  return templateCache;
}

export function renderOrderInvoiceHtml(model: OrderPdfModel): string {
  const tpl = loadTemplate();
  const fmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const money = (n: number | null, cur: string) =>
    n === null ? "—" : `${fmt.format(n)} ${cur}`;

  const taskRows =
    model.tasks.length === 0
      ? `<tr><td colspan="4" class="muted">No tasks assigned.</td></tr>`
      : model.tasks
          .map(
            (t) => `<tr>
  <td>${escapeHtml(t.title)}</td>
  <td><span class="badge">${escapeHtml(t.status)}</span></td>
  <td>${escapeHtml(t.assigneeName)}</td>
  <td class="right">${escapeHtml(formatDate(t.dueDate))}</td>
</tr>`,
          )
          .join("\n");

  const expenseRows =
    model.expenses.length === 0
      ? `<tr><td colspan="4" class="muted">No expenses recorded.</td></tr>`
      : model.expenses
          .map(
            (e) => `<tr>
  <td>${escapeHtml(formatDate(e.incurredOn))}</td>
  <td>${escapeHtml(categoryLabel(e.category))}</td>
  <td>${e.description ? escapeHtml(e.description) : "—"}</td>
  <td class="right">${escapeHtml(fmt.format(e.amount))}&nbsp;${escapeHtml(e.currency)}</td>
</tr>`,
          )
          .join("\n");

  const profit = model.totals.profit;
  const profitClass =
    profit === null
      ? "neutral"
      : profit > 0
        ? "positive"
        : profit < 0
          ? "negative"
          : "neutral";

  const clientLines = [
    `<strong>${escapeHtml(model.client.name)}</strong>`,
    model.client.companyName
      ? `<div class="sub">${escapeHtml(model.client.companyName)}</div>`
      : "",
    model.client.email
      ? `<div class="line">${escapeHtml(model.client.email)}</div>`
      : "",
    model.client.phone
      ? `<div class="line">${escapeHtml(model.client.phone)}</div>`
      : "",
    model.client.address
      ? `<div class="line addr">${escapeHtml(model.client.address)}</div>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const trimmedDesc = model.order.description?.trim();
  const desc = trimmedDesc
    ? `<div class="order-desc">${escapeHtml(trimmedDesc)}</div>`
    : "";

  const vars: Record<string, string> = {
    DOCUMENT_TITLE: escapeHtml(model.documentTitle),
    GENERATED_AT: escapeHtml(model.generatedAtDisplay),
    ORDER_ID: escapeHtml(model.order.id),
    ORDER_STATUS: escapeHtml(model.order.status),
    ORDER_DEADLINE: escapeHtml(formatDate(model.order.deadline)),
    ORDER_CREATED: escapeHtml(formatDate(model.order.createdAt)),
    ORDER_COMPLETED: escapeHtml(formatDate(model.order.completedAt)),
    CLIENT_BLOCK: clientLines,
    ORDER_DESCRIPTION_BLOCK: desc,
    REVENUE: escapeHtml(money(model.totals.revenue, model.totals.currency)),
    PREPAYMENT: escapeHtml(
      money(model.order.prepayment, model.totals.currency),
    ),
    TOTAL_EXPENSES: escapeHtml(
      money(model.totals.totalExpenses, model.totals.currency),
    ),
    PROFIT: escapeHtml(money(profit, model.totals.currency)),
    PROFIT_ROW_CLASS: profitClass,
    TASK_ROWS: taskRows,
    EXPENSE_ROWS: expenseRows,
  };

  let html = tpl;
  for (const [key, value] of Object.entries(vars)) {
    html = html.split(`{{${key}}}`).join(value);
  }
  return html;
}
