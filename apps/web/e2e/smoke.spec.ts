import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("home loads", async ({ page }) => {
    const res = await page.goto("/uz", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    if (!res) {
      throw new Error("javob yoʻq — dev server ishlayaptimi?");
    }
    expect(
      res.status(),
      `HTTP ${String(res.status())}. ≥500 boʻlsa, koʻpincha chalkash apps/web/.next ({ pnpm dev } ustida ham { pnpm build } qilgan): .next papkasini oʻchirib servisni qayta ishga tushiring.`,
    ).toBeLessThan(400);
  });
});
