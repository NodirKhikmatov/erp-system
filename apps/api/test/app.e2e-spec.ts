import type { Server } from "node:http";

import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "./../src/app.module";
import { i18nMiddleware } from "./../src/i18n/i18n.middleware";

describe("App (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(i18nMiddleware);
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    await app.close();
  });

  it("/ (GET)", async () => {
    const res = await request(httpServer).get("/").expect(200);
    const body = res.body as { nomi: string };
    expect(body.nomi).toContain("ERP");
  });

  it("live health endpoints (GET)", async () => {
    const paths = ["/salomatlik/jonli", "/health/live"];
    for (const path of paths) {
      const res = await request(httpServer).get(path).expect(200);
      const body = res.body as { holat: string; xabar: string };
      expect(body.holat).toBe("yaroqli");
      expect(body.xabar.length).toBeGreaterThan(0);
    }
  });

  it("/ (GET) prefers English when Accept-Language: en", async () => {
    const res = await request(httpServer)
      .get("/")
      .set("Accept-Language", "en-US,en;q=0.9")
      .expect(200);
    const body = res.body as { nomi: string };
    expect(body.nomi).toContain("Furniture");
  });
});
