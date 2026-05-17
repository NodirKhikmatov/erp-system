import next from "@furniture/eslint-config/next";

export default [
  ...next,
  { ignores: ["node_modules/**", "dist/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
];
