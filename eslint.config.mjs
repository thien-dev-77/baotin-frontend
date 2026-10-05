import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: [".next*/**", "node_modules/**", "test-results/**", "playwright-report/**", "next-env.d.ts"] },
  ...nextVitals,
  { rules: { "react-hooks/set-state-in-effect": "off", "react-hooks/refs": "off", "react-hooks/purity": "off" } }
];
export default config;
