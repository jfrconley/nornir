import type { Options as AJVBaseOptions } from "ajv";
import { Config, NodeParser, SchemaGenerator, TypeFormatter } from "ts-json-schema-generator";
import ts from "typescript";

export interface Project {
  program: ts.Program;
  compilerOptions: ts.CompilerOptions;
  checker: ts.TypeChecker;
  printer: ts.Printer;
  options: {
    schema: SchemaConfig;
    validation: AJVOptions;
  };
  compilerHost: ts.CompilerHost;
  transformOnly: boolean;
  schemaGenerator: SchemaGenerator;
  typeFormatter: TypeFormatter;
  nodeParser: NodeParser;
  parsedCommandLine: ts.ParsedCommandLine;
}

export type AJVOptions = Pick<
  AJVBaseOptions,
  "useDefaults" | "removeAdditional" | "loopRequired" | "loopEnum" | "allErrors"
>;
export type SchemaConfig = Pick<
  Config,
  "sortProps" | "expose" | "jsDoc" | "strictTuples" | "encodeRefs" | "additionalProperties"
>;

export const AJV_DEFAULTS: AJVBaseOptions = {
  useDefaults: true,
  coerceTypes: true,
  loopRequired: 20,
  allErrors: false,
  removeAdditional: true,
};

export const SCHEMA_DEFAULTS: Config = {
  expose: "export",
  jsDoc: "extended",
  sortProps: true,
  strictTuples: false,
  encodeRefs: true,
  additionalProperties: true,
  topRef: false,
};

export type Options = AJVOptions & SchemaConfig;
