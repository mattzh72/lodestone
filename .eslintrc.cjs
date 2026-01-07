module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    es2022: true,
    node: true,
    browser: true,
  },
  ignorePatterns: ["dist/", "lib/", "node_modules/"],
  rules: {
    "@typescript-eslint/adjacent-overload-signatures": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-extra-semi": "off",
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/no-namespace": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ],
    "no-case-declarations": "off",
    "no-constant-condition": "off",
    "no-empty": "off",
    "no-inner-declarations": "off",
    "no-var": "off",
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
};
