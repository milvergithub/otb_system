{
  "$schema": "https://json.schemastore.org/eslintrc",
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "tsconfig.json",
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint", "prettier"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "root": true,
  "env": {
    "node": true,
    "jest": true
  },
  "ignorePatterns": [".eslintrc.js", "dist", "node_modules"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "prettier/prettier": "warn"
  }
}
