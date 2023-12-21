import { dirname, resolve } from "node:path";
import ts from "typescript";

export function resolveTsConfigOutdir(searchPath = process.cwd(), configName = "tsconfig.json") {
  const path = ts.findConfigFile(searchPath, ts.sys.fileExists, configName);
  if (path == undefined) {
    return;
  }
  const config = ts.readConfigFile(path, ts.sys.readFile);
  if (config.error) {
    return;
  }
  const compilerOptions = config.config as { compilerOptions: ts.CompilerOptions };

  const pathDir = dirname(path);

  const outDir = compilerOptions.compilerOptions.outDir;

  if (outDir == undefined) {
    return undefined;
  }

  return resolve(pathDir, outDir);
}
