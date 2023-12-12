import {
  BaseType,
  createFormatter,
  createParser,
  Definition,
  SchemaGenerator,
  StringType,
  SubNodeParser,
  SubTypeFormatter,
  UndefinedType,
} from "ts-json-schema-generator";
import ts from "typescript";
import { AJV_DEFAULTS, AJVOptions, Options, Project, SCHEMA_DEFAULTS, SchemaConfig } from "./project.js";
import { FileTransformer } from "./transformers/file-transformer.js";

let project: Project;

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

export class UndefinedFormatter implements SubTypeFormatter {
  public supportsType(type: BaseType): boolean {
    return type instanceof UndefinedType;
  }

  getChildren(): BaseType[] {
    return [];
  }

  getDefinition(): Definition {
    return {};
  }
}

export function transform(program: ts.Program, options?: Options): ts.TransformerFactory<ts.SourceFile> {
  const {
    loopEnum,
    loopRequired,
    additionalProperties,
    strictTuples,
    jsDoc,
    removeAdditional,
    useDefaults,
    allErrors,
    sortProps,
    expose,
  } = options ?? {};

  const schemaConfig: SchemaConfig = {
    ...SCHEMA_DEFAULTS,
    jsDoc: jsDoc || SCHEMA_DEFAULTS.jsDoc,
    strictTuples: strictTuples || SCHEMA_DEFAULTS.strictTuples,
    additionalProperties: additionalProperties || SCHEMA_DEFAULTS.additionalProperties,
    sortProps: sortProps || SCHEMA_DEFAULTS.sortProps,
    expose,
  };

  const validationConfig: AJVOptions = {
    ...AJV_DEFAULTS,
    loopRequired: loopRequired || AJV_DEFAULTS.loopRequired,
    loopEnum: loopEnum || AJV_DEFAULTS.loopEnum,
    removeAdditional: removeAdditional || AJV_DEFAULTS.removeAdditional,
    useDefaults: useDefaults || AJV_DEFAULTS.useDefaults,
    allErrors: allErrors || AJV_DEFAULTS.allErrors,
  };

  const nodeParser = createParser(program as unknown as Parameters<typeof createParser>[0], {
    ...schemaConfig,
  }, (prs) => {
    // prs.addNodeParser(new NornirIgnoreParser());
    prs.addNodeParser(new TemplateExpressionNodeParser());
    prs.addNodeParser(new UndefinedIdentifierParser());
  });
  const typeFormatter = createFormatter({
    ...schemaConfig,
  }, frm => {
    frm.addTypeFormatter(new UndefinedFormatter());
  });

  const schemaGenerator = new SchemaGenerator(
    program as unknown as ConstructorParameters<typeof SchemaGenerator>[0],
    nodeParser,
    typeFormatter,
    schemaConfig,
  );

  const compilerHost = program.getCompilerOptions().incremental
    ? ts.createIncrementalCompilerHost(program.getCompilerOptions())
    : ts.createCompilerHost(program.getCompilerOptions());

  const configPath = program.getCompilerOptions().configFilePath as string;

  const parseConfigHost: ts.ParseConfigFileHost = {
    useCaseSensitiveFileNames: true,
    fileExists: fileName => compilerHost!.fileExists(fileName),
    readFile: fileName => compilerHost!.readFile(fileName),
    directoryExists: f => compilerHost!.directoryExists!(f),
    getDirectories: f => compilerHost!.getDirectories!(f),
    realpath: compilerHost.realpath,
    readDirectory: (...args) => compilerHost!.readDirectory!(...args),
    trace: compilerHost.trace,
    getCurrentDirectory: compilerHost.getCurrentDirectory,
    onUnRecoverableConfigFileDiagnostic: () => {},
  };

  project = {
    transformOnly: false,
    program,
    compilerOptions: program.getCompilerOptions(),
    checker: program.getTypeChecker(),
    printer: ts.createPrinter(),
    options: {
      schema: schemaConfig,
      validation: validationConfig,
    },
    schemaGenerator,
    nodeParser,
    typeFormatter,
    compilerHost,
    parsedCommandLine: ts.getParsedCommandLineOfConfigFile(
      configPath,
      program.getCompilerOptions(),
      parseConfigHost,
    )!,
  };

  return (context) => {
    return (file) => {
      return FileTransformer.transform(project, context, file);
    };
  };
}

export default transform;
