import base from "@furniture/eslint-config/base";

export default [
  ...base,
  { ignores: ["node_modules/**", "dist/**"] },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
];
