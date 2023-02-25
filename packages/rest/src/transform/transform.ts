import ts from "typescript";
import { IOptions } from "./options.js";
import { IProject } from "./project.js";
import { FileTransformer } from "./transformers/file-transformer.js";
export function transform(program: ts.Program, options?: IOptions): ts.TransformerFactory<ts.SourceFile> {
  const project: IProject = {
    program,
    compilerOptions: program.getCompilerOptions(),
    checker: program.getTypeChecker(),
    printer: ts.createPrinter(),
    options: options || {},
  };
  return (context) => (file) => FileTransformer.transform(project, context, file);
}

export default transform;
