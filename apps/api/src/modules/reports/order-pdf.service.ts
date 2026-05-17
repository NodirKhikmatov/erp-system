import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import puppeteer from "puppeteer-core";

import type { Env } from "../../config/env";
import { OrdersService } from "../orders/orders.service";
import { renderOrderInvoiceHtml } from "./order-pdf.renderer";

@Injectable()
export class OrderPdfService {
  private readonly logger = new Logger(OrderPdfService.name);

  constructor(
    private readonly orders: OrdersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async renderOrderPdf(orderId: string): Promise<Buffer> {
    const model = await this.orders.buildPdfModel(orderId);
    const html = renderOrderInvoiceHtml(model);
    const executablePath =
      this.config.get("PUPPETEER_EXECUTABLE_PATH", { infer: true })?.trim() ??
      undefined;
    if (!executablePath) {
      throw new ServiceUnavailableException(
        "PDF uchun PUPPETEER_EXECUTABLE_PATH sozlang (Google Chrome yoki Chromium).",
      );
    }
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      const bytes = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "16mm",
          bottom: "16mm",
          left: "12mm",
          right: "12mm",
        },
      });
      return Buffer.from(bytes);
    } finally {
      await browser.close().catch((err: unknown) => {
        this.logger.warn(
          "Puppeteer browser.close xato",
          err instanceof Error ? err.message : String(err),
        );
      });
    }
  }
}
