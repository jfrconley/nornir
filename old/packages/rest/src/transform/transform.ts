import { createFormatter, createParser, SchemaGenerator } from "ts-json-schema-generator";
import ts from "typescript";
import { AJV_DEFAULTS, AJVOptions, IOptions, IProject, SCHEMA_DEFAULTS, SchemaConfig } from "./project.js";
import { FileTransformer } from "./transformers/file-transformer.js";

let project: IProject;
// let files: string[] = [];
// let openapi: OpenAPIV3.Document;
export function transform(program: ts.Program, options?: IOptions): ts.TransformerFactory<ts.SourceFile> {
  const {
    loopEnum,
    loopRequired,
    additionalProperties,
    encodeRefs,
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
    encodeRefs: encodeRefs || SCHEMA_DEFAULTS.encodeRefs,
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
  });
  const typeFormatter = createFormatter({
    ...schemaConfig,
  });

  const schemaGenerator = new SchemaGenerator(
    program as unknown as ConstructorParameters<typeof SchemaGenerator>[0],
    nodeParser,
    typeFormatter,
    schemaConfig,
  );

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
    compilerHost: program.getCompilerOptions().incremental
      ? ts.createIncrementalCompilerHost(program.getCompilerOptions())
      : ts.createCompilerHost(program.getCompilerOptions()),
  };

  return (context) => {
    return (file) => {
      return FileTransformer.transform(project, context, file);
    };
  };
}

export default transform;
