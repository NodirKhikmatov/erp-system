import nestjs from "@furniture/eslint-config/nestjs";

export default [
  ...nestjs,
  { ignores: ["node_modules/**", "dist/**", "coverage/**"] },
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ["**/*.module.ts"],
    rules: { "@typescript-eslint/no-extraneous-class": "off" },
  },
];
