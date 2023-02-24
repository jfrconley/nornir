import ts from "typescript";
import { IOptions } from "./options.js";
import { IProject } from "./project.js";
import { FileTransfomer } from "./transformers/file-transfomer.js";
export function transform(program: ts.Program, options?: IOptions): ts.TransformerFactory<ts.SourceFile> {
  const project: IProject = {
    program,
    compilerOptions: program.getCompilerOptions(),
    checker: program.getTypeChecker(),
    printer: ts.createPrinter(),
    options: options || {},
  };
  return (context) => (file) => FileTransfomer.tranform(project, context, file);
}

export default transform;
