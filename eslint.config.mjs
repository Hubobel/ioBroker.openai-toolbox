export default [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**"],
    languageOptions: { ecmaVersion: 2022, sourceType: "commonjs" },
    rules: {
      "no-constant-condition": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "error",
    },
  },
];
