// eslint-config-next 16.x ships a native flat-config array — importing it
// directly avoids the legacy FlatCompat/.eslintrc bridge, which crashes on
// this version's plugin objects (circular structure in eslint-plugin-react's
// config tree trips the old schema validator's JSON.stringify error path).
import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "prisma/migrations/**",
      "components/ui/**", // shadcn-generated — not hand-edited, not hand-linted
    ],
  },
];

export default eslintConfig;
