import { Swagger } from "atlassian-openapi";
import { readFileSync } from "fs";
import { sync } from "glob";
import { OpenAPIV3_1 } from "openapi-types";
import { merge } from "../../transform/openapi-merge/index.js";
import SwaggerV3 = Swagger.SwaggerV3;

export function getSpecFiles(scanDir: string) {
  return sync(`${scanDir}/**/*.nornir.oas.json`);
}

export function readSpecFiles(paths: string[]) {
  return paths.map(path => {
    return JSON.parse(readFileSync(path, "utf-8")) as OpenAPIV3_1.Document;
  });
}

export function getMergedSpec(scanDir: string) {
  const files = getSpecFiles(scanDir);
  const specs = readSpecFiles(files);
  return merge(specs.map(spec => ({
    dispute: {
      // mergeDispute: true,
      // alwaysApply: true,
      // prefix: "",
      // suffix: ""
    },
    oas: spec as SwaggerV3,
  })));
}
