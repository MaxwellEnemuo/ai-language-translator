module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json",
  },
  rules: {
    // Add any specific rule overrides here
    // e.g., '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^' }],
  },
  ignorePatterns: ["node_modules/", "dist/", ".eslintrc.js"],
};
