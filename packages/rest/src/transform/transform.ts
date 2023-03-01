import { OpenAPIV3 } from "openapi-types";
import ts from "typescript";
import { ControllerMeta } from "./controller-meta";
import { OpenapiGenerator } from "./openapi-generator";
import { IOptions } from "./options.js";
import { IProject } from "./project.js";
import { SpecFile } from "./spec-file";
import { FileTransformer } from "./transformers/file-transformer.js";

let project: IProject;
let files: string[] = [];
let openapi: OpenAPIV3.Document;
export function transform(program: ts.Program, options?: IOptions): ts.TransformerFactory<ts.SourceFile> {
  project = {
    transformOnly: false,
    program,
    compilerOptions: program.getCompilerOptions(),
    checker: program.getTypeChecker(),
    printer: ts.createPrinter(),
    options: options || {},
    compilerHost: program.getCompilerOptions().incremental
      ? ts.createIncrementalCompilerHost(program.getCompilerOptions())
      : ts.createCompilerHost(program.getCompilerOptions()),
  };

  return (context) => {
    return (file) => {
      if (openapi == null) {
        files = program.getRootFileNames().filter((file) =>
          !(file.endsWith(".d.ts") || file.endsWith(".d.mts") || file.endsWith(".d.cts"))
        );
        const sources = files.map((file) => program.getSourceFile(file)).filter((file) =>
          file != null
        ) as ts.SourceFile[];
        sources.forEach((file) => {
          FileTransformer.transform(project, context, file);
        });
        openapi = new OpenapiGenerator(project, ControllerMeta.getAndClearRoutes()).generate();
      }
      project.transformOnly = true;

      return FileTransformer.transform(project, context, file);
    };
  };
}

process.on("exit", () => {
  if (openapi != null) {
    SpecFile.setSpecFile(project, openapi);
  }
});

export default transform;
