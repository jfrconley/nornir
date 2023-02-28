import ts from "typescript";
import { IOptions } from "./options.js";
import { IProject } from "./project.js";
import { FileTransformer } from "./transformers/file-transformer.js";
import { OpenapiGenerator } from './openapi-generator';
import { MetadataFile, MetadataFileUtils } from './metadata-file';
import { ControllerMeta, RouteInfo } from './controller-meta';

let project: IProject;
let files: string[] = [];
export function transform(program: ts.Program, options?: IOptions): ts.TransformerFactory<ts.SourceFile> {
  project = {
    program,
    compilerOptions: program.getCompilerOptions(),
    checker: program.getTypeChecker(),
    printer: ts.createPrinter(),
    options: options || {},
    compilerHost: program.getCompilerOptions().incremental ?
      ts.createIncrementalCompilerHost(program.getCompilerOptions()) :
      ts.createCompilerHost(program.getCompilerOptions()),
  };
  files = program.getRootFileNames().filter((file) => !(file.endsWith(".d.ts") || file.endsWith(".d.mts") || file.endsWith(".d.cts")));

  return (context) => {
    let transformedFiles = false;
    return (file) => {
      // We need metadata from every file to generate the openapi spec
      if (!transformedFiles) {
        transformedFiles = true;
        for (const file of files) {
          const source = project.program.getSourceFile(file)!;
          FileTransformer.transform(project, context, source)
        }
        const generator = new OpenapiGenerator(project, ControllerMeta.getAndClearRoutes());
        generator.generate();
      }
      return FileTransformer.transform(project, context, file);
    }
  }
}

process.on("exit", () => {

  console.log()
})

export default transform;
