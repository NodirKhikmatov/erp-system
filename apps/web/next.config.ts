import * as path from "node:path";

import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /** Dev da `localhost` va `127.0.0.1` boshqa origin hisoblanadi — `/_next/*` bloklanmasligi uchun. */
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  transpilePackages: ["@furniture/ui", "@furniture/types"],
  output: "standalone",
  /** Monoreppo ildizi (tashqi lockfile xatosiz trace). */
  outputFileTracingRoot: path.join(__dirname, "../.."),

  /**
   * Katta kutubxonalar — faqat ishlatilgan modullarni yüklash (dev/build tezligi).
   * https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports
   */
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },

  /**
   * Dev/webpack disk keshi sukut boʻyicha yoqiladi (tez tuzish).
   * `.next` chalkash boʻlgan bo‘lsa: **`pnpm dev:fresh`** yoki **`NEXT_DISABLE_WEBPACK_CACHE=1`** bilan qayta ishga tushing.
   */
  webpack: (config, { dev }) => {
    if (dev && process.env["NEXT_DISABLE_WEBPACK_CACHE"] === "1") {
      config.cache = false;
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
