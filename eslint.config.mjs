import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";

const compat = new FlatCompat();

export default [
  js.configs.recommended,
  ...compat.extends("next"),
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
];
