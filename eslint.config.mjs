import config from "@iobroker/eslint-config";
import globals from "globals";

export default [
  ...config,
  {
    ignores: ["node_modules/**"],
  },
  {
    files: ["**/*.js"],
    rules: {
      curly: "off",
      "jsdoc/require-jsdoc": "off",
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: globals.mocha,
    },
  },
];
