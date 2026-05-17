process.env["NODE_ENV"] ??= "test";
process.env["DATABASE_URL"] ??=
  "postgresql://furniture:furniture@localhost:5433/furniture_erp?schema=public";
process.env["PORT"] ??= "4000";
process.env["JWT_ACCESS_SECRET"] ??=
  "test-access-secret-please-use-32-chars-min";
process.env["JWT_ACCESS_EXPIRES"] ??= "900s";
process.env["JWT_REFRESH_EXPIRES_DAYS"] ??= "7";
