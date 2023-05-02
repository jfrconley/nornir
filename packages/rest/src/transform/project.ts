import type { Options } from "ajv";
import { Config, NodeParser, SchemaGenerator, TypeFormatter } from "ts-json-schema-generator";
import ts from "typescript";

export interface IProject {
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
}

export type AJVOptions = Pick<
  Options,
  "useDefaults" | "removeAdditional" | "loopRequired" | "loopEnum" | "allErrors"
>;
export type SchemaConfig = Pick<
  Config,
  "sortProps" | "expose" | "jsDoc" | "strictTuples" | "encodeRefs" | "additionalProperties"
>;

export const AJV_DEFAULTS: Options = {
  useDefaults: true,
  coerceTypes: true,
  loopRequired: 20,
  allErrors: true,
  removeAdditional: true,
};

export const SCHEMA_DEFAULTS: Config = {
  expose: "export",
  jsDoc: "extended",
  sortProps: true,
  strictTuples: false,
  encodeRefs: true,
  additionalProperties: false,
  topRef: false,
};

export type IOptions = AJVOptions & SchemaConfig;
