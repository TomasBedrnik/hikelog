import next from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";
import eslint from "@eslint/js";

export default [
  eslint.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": next,
    },
    rules: {
      ...next.configs["core-web-vitals"].rules,
    },
  },

  {
    ignores: [".next/**", "node_modules/**", "out/**"],
  },
];
