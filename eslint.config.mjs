import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Pragmatic for this codebase: untyped JSON from feeds and LLMs is handled defensively.
      "@typescript-eslint/no-explicit-any": "off",
      "react/no-unescaped-entities": "off",
      // React Compiler-era rules that flag ordinary fetch-on-mount patterns used throughout
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
