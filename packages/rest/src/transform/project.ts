import ts from "typescript";
import { IOptions } from "./options.js";
import {IProject as ITypiaProject} from 'typia/lib/transformers/IProject'

export interface IProject {
  program: ts.Program;
  compilerOptions: ts.CompilerOptions;
  checker: ts.TypeChecker;
  printer: ts.Printer;
  options: IOptions;
  compilerHost: ts.CompilerHost;
}

export function convertToTypiaProject(project: IProject): ITypiaProject {
  return {
    program: project.program,
    compilerOptions: project.compilerOptions,
    checker: project.checker,
    printer: project.printer,
    options: {},
  };
}
