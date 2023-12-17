import type { Options as AJVBaseOptions } from "ajv";
import {
  BaseType,
  Config,
  createParser,
  NodeParser,
  ReferenceType,
  SchemaGenerator,
  StringType,
  SubNodeParser,
  TypeFormatter,
  UndefinedType,
  UnknownType,
} from "ts-json-schema-generator";
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
  encodeRefs: false,
  additionalProperties: false,
  topRef: false,
  discriminatorType: "open-api",
};

export type Options = AJVOptions & SchemaConfig;

export class TemplateExpressionNodeParser implements SubNodeParser {
  supportsNode(node: ts.Node): boolean {
    return ts.isTemplateExpression(node);
  }

  createType(): BaseType {
    return new StringType();
  }
}

export class UndefinedIdentifierParser implements SubNodeParser {
  supportsNode(node: ts.Node): boolean {
    return ts.isIdentifier(node) && node.text === "undefined";
  }

  createType(): BaseType {
    return new UndefinedType();
  }
}

export class NornirIgnoreParser implements SubNodeParser {
  supportsNode(node: ts.Node): boolean {
    // check if the ignore tag is present
    return ts.getJSDocTags(node).some(tag => tag.tagName.getText() === "ignore");
  }

  createType(): BaseType {
    return new UnknownType();
  }
}

export class NornirParserThrow implements SubNodeParser {
  supportsNode(node: ts.Node) {
    return ts.getJSDocTags(node).some(tag => tag.tagName.getText() === "nodeParseThrow");
  }

  createType(node: ts.Node): BaseType {
    const throwTagText = ts.getJSDocTags(node).find(tag => tag.tagName.getText() === "nodeParseThrow")?.comment;
    throw new Error(`ParserFailure: ${throwTagText}`);
  }
}

export function getSchemaNodeParser(program: ts.Program, config: Config): NodeParser {
  return createParser(program as unknown as Parameters<typeof createParser>[0], config, prs => {
    prs.addNodeParser(new TemplateExpressionNodeParser());
    prs.addNodeParser(new UndefinedIdentifierParser());
    prs.addNodeParser(new NornirIgnoreParser());
    prs.addNodeParser(new NornirParserThrow());
  });
}
