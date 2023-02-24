import ts from "typescript";
import { IOptions } from "./options.js";

export interface IProject {
  program: ts.Program;
  compilerOptions: ts.CompilerOptions;
  checker: ts.TypeChecker;
  printer: ts.Printer;
  options: IOptions;
}
