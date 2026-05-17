const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const src = path.join(
  root,
  "src/modules/reports/templates/order-invoice.html",
);
const destDir = path.join(root, "dist/modules/reports/templates");
const dest = path.join(destDir, "order-invoice.html");

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
