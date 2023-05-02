import config from "@nrfcloud/utils-eslint";
import {createRequire} from 'node:module'

const require = createRequire(import.meta.url);

/**
 * @type {import('eslint').Linter.FlatConfig}
 */
export default [
  {
    ignores: ["**/*.{mjs,js,d.ts}"],
  },
  ...config,
  {
    files: ["**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [{
            group: ["@nrfcloud/*-private.*", `!@nrfcloud/${require("./package.json").name.replace('@nrfcloud/', '')}-private.*`],
          }],
        },
      ],
    },
  },
];
