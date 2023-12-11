import { readFileSync, writeFileSync } from "fs";
import { merge } from "lodash";
import path from "path";
import yargs from "yargs";
import { isErrorResult } from "../transform/openapi-merge";
import { getMergedSpec, getSpecFiles } from "./lib/collect";
import { resolveTsConfigOutdir } from "./lib/ts-utils";

yargs
  .scriptName("nornir-oas")
  .command("collect", "Build OpenAPI spec from collected spec files", args =>
    args
      .option("output", {
        default: path.join(process.cwd(), "openapi.json"),
        alias: "o",
        type: "string",
        description: "Output file for the generated OpenAPI spec",
      })
      .option("scanDirectory", {
        default: resolveTsConfigOutdir() ?? path.join(process.cwd(), "dist"),
        type: "string",
        alias: "s",
        description:
          "Directory to scan for spec files. This is probably the directory where your compiled typescript files are.",
      })
      .option("overrideSpec", {
        type: "string",
        alias: "b",
        description: "Path to an openapi JSON file to deeply merge with collected specification",
      }), args => {
    const mergedSpec = getMergedSpec(args.scanDirectory);
    if (isErrorResult(mergedSpec)) {
      throw new Error("Failed to merge spec files");
    }
    let spec = mergedSpec.output;
    if (args.overrideSpec) {
      const overrideSpec = JSON.parse(readFileSync(args.overrideSpec, "utf-8"));
      spec = merge(spec, overrideSpec);
    }

    writeFileSync(args.output, JSON.stringify(spec, null, 2));
  }).strictCommands().demandCommand().parse();
