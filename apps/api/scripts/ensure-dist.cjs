"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const mainJs = path.join(root, "dist", "main.js");

if (!fs.existsSync(mainJs)) {
  execSync("pnpm exec nest build", { cwd: root, stdio: "inherit", env: process.env });
}
