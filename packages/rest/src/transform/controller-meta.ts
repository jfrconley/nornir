import { JSONSchema7 } from "json-schema";
import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import ts from "typescript";
import { TransformationError } from "./error";
import {
  dereferenceSchema,
  getFirstExample,
  getSchemaOrAllOf,
  getUnifiedPropertySchemas,
  isSchemaEmpty,
  joinSchemas,
  moveRefsToAllOf,
  resolveDiscriminantProperty,
  rewriteRefsForOpenApi,
  unresolveRefs,
} from "./json-schema-utils";
import { isErrorResult, merge, MergeInput } from "./openapi-merge";
import { Project } from "./project";
import { FileTransformer } from "./transformers/file-transformer";

export abstract class OpenApiSpecHolder {
  private static specFileMap = new Map<string, OpenAPIV3_1.Document[]>();

  public static addSpecForFile(file: ts.SourceFile, spec: OpenAPIV3_1.Document) {
    const fileSpecs = this.specFileMap.get(file.fileName) || [];
    fileSpecs.push(spec);
    this.specFileMap.set(file.fileName, fileSpecs);
  }

  public static getSpecForFile(file: ts.SourceFile): OpenAPIV3_1.Document {
    const mergeInputs: MergeInput = (this.specFileMap.get(file.fileName) || [])
      .map((spec) => ({
        oas: spec,
        dispute: {},
      })) as MergeInput;

    const merged = merge(mergeInputs);
    if (isErrorResult(merged)) {
      throw new Error(merged.message);
    }

    return merged.output as OpenAPIV3_1.Document;
  }
}

export class ControllerMeta {
  private static cache = new Map<ts.Identifier, ControllerMeta>();
  private static routes = new Map<string, Map<string, RouteInfo>>();

  public readonly routeHolderIdentifier = ts.factory.createUniqueName("route_handler");
  public readonly routeInstanceIdentifier = ts.factory.createUniqueName("route_instance");
  public readonly initializationStatements: ts.Statement[] = [];
  private instanceProviderExpression: ts.Expression;

  // public static getRoutes(): RouteInfo[] {
  //   const methods = ControllerMeta.routes.values();
  //   const routes = Array.from(methods).map((method) => Array.from(method.values()));
  //   return routes.flat();
  // }

  // public static getAndClearRoutes(): RouteInfo[] {
  //   const routes = this.getRoutes();
  //   this.routes.clear();
  //   return routes;
  // }

  public static clearCache() {
    this.cache.clear();
  }

  public static create(
    project: Project,
    source: ts.SourceFile,
    route: ts.ClassDeclaration,
    basePath: string,
    apiId: string,
  ): ControllerMeta {
    const name = route.name;
    if (!name) {
      throw new Error("Route class must have a name");
    }
    if (this.cache.has(name)) {
      throw new Error("Route already exists: " + name.getText());
    }
    const meta = new ControllerMeta(project, source, route, name, basePath, apiId);
    this.cache.set(name, meta);
    return meta;
  }

  public static get(route: ts.ClassDeclaration): ControllerMeta | undefined {
    const name = route.name;
    if (!name) {
      throw new Error("Route class must have a name");
    }
    return this.cache.get(name);
  }

  public static getAssert(route: ts.ClassDeclaration): ControllerMeta {
    const meta = this.get(route);
    if (!meta) {
      throw new Error("Route not found: " + route.getText());
    }
    return meta;
  }

  private constructor(
    private readonly project: Project,
    public readonly source: ts.SourceFile,
    public readonly route: ts.ClassDeclaration,
    public readonly identifier: ts.Identifier,
    public readonly basePath: string,
    public readonly apiId: string,
  ) {
    this.instanceProviderExpression = ts.factory.createNewExpression(
      this.identifier,
      [],
      [],
    );
  }

  public setInstanceProviderExpression(expression: ts.Expression) {
    this.instanceProviderExpression = expression;
  }

  public addInitializationStatement(statement: ts.Statement) {
    this.initializationStatements.push(statement);
  }

  public getGeneratedMembers(): ts.ClassElement[] {
    return [
      this.getInitializationMethod(),
    ];
  }

  private getInitializationMethod(): ts.ClassStaticBlockDeclaration {
    return ts.factory.createClassStaticBlockDeclaration(ts.factory.createBlock([
      this.generateRouteHolderCreateStatement(),
      this.generateRegisterRouteHolderStatement(),
      this.generateRouteClassInstantiationStatement(),
      ...this.initializationStatements,
    ], true));
  }

  private generateRouteHolderCreateStatement() {
    const nornirRestImport = FileTransformer.getOrCreateImport(
      this.source,
      "@nornir/rest",
      "RouteHolder",
    );

    const routeHolderCreate = ts.factory.createNewExpression(
      nornirRestImport,
      [],
      [ts.factory.createStringLiteral(this.basePath)],
    );
    const routeHolderDeclaration = ts.factory.createVariableDeclaration(
      this.routeHolderIdentifier,
      undefined,
      undefined,
      routeHolderCreate,
    );
    return ts.factory.createVariableStatement(
      ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Const),
      [routeHolderDeclaration],
    );
  }

  private generateRouteClassInstantiationStatement() {
    if (this.route.name == undefined) throw new Error("Class must have a name");

    return ts.factory.createVariableStatement(
      ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Const),
      [
        ts.factory.createVariableDeclaration(
          this.routeInstanceIdentifier,
          undefined,
          undefined,
          this.instanceProviderExpression,
        ),
      ],
    );
  }

  private generateRegisterRouteHolderStatement() {
    const routerIdentifier = FileTransformer.getOrCreateImport(this.source, "@nornir/rest", "Router");
    const routerInstance = ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(routerIdentifier, "get"),
      [],
      [
        ts.factory.createStringLiteral(this.apiId),
      ],
    );

    const callExpression = ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(routerInstance, "register"),
      [],
      [this.routeHolderIdentifier],
    );

    return ts.factory.createExpressionStatement(callExpression);
  }

  private getRouteIndex(info: RouteIndex) {
    return {
      method: info.method,
      path: this.basePath + deparameterizePath(info.path).toLowerCase(),
    };
  }

  public registerRoute(node: ts.Node, routeInfo: RouteInfo) {
    if (this.project.transformOnly) {
      return;
    }
    const index = this.getRouteIndex(routeInfo);
    const methods = ControllerMeta.routes.get(index.path) || new Map<string, RouteInfo>();
    ControllerMeta.routes.set(index.path, methods);
    const route = methods.get(index.method);
    if (route != undefined) {
      throw new Error(`Route already registered: ${index.method} ${index.path}`);
    }

    const modifiedRouteInfo = {
      method: routeInfo.method,
      path: this.basePath + routeInfo.path.toLowerCase(),
      description: routeInfo.description,
      // requestInfo: this.buildRequestInfo(index, routeInfo.input),
      // responseInfo: this.buildResponseInfo(index, routeInfo.output),
      outputSchema: routeInfo.outputSchema,
      inputSchema: routeInfo.inputSchema,
      filePath: routeInfo.filePath,
      summary: routeInfo.summary,
      deprecated: routeInfo.deprecated,
      operationId: routeInfo.operationId,
      tags: routeInfo.tags,
      input: routeInfo.input,
    };

    OpenApiSpecHolder.addSpecForFile(this.source, this.generateRouteSpec(modifiedRouteInfo));

    methods.set(index.method, modifiedRouteInfo);
  }

  private generateRouteSpec(route: RouteInfo): OpenAPIV3_1.Document {
    const inputSchema = moveRefsToAllOf(route.inputSchema);
    const routeIndex = this.getRouteIndex(route);
    const dereferencedInputSchema = dereferenceSchema(inputSchema);
    const outputSchema = moveRefsToAllOf(route.outputSchema);
    const dereferencedOutputSchema = dereferenceSchema(outputSchema);
    return {
      openapi: "3.0.3",
      info: {
        title: "Nornir API",
        version: "1.0.0",
      },
      paths: {
        [route.path]: {
          [route.method.toLowerCase()]: {
            deprecated: route.deprecated,
            tags: route.tags,
            operationId: route.operationId,
            summary: route.summary,
            description: route.description,
            responses: this.generateOutputType(routeIndex, dereferencedOutputSchema),
            requestBody: this.generateRequestBody(routeIndex, dereferencedInputSchema),
            parameters: [
              ...this.generateParametersForSchemaPath(dereferencedInputSchema, "/pathParams", "path"),
              ...this.generateParametersForSchemaPath(dereferencedInputSchema, "/query", "query"),
              ...this.generateParametersForSchemaPath(dereferencedInputSchema, "/headers", "header"),
            ],
          },
        },
      },
      components: {
        schemas: {
          ...rewriteRefsForOpenApi(inputSchema).definitions,
          ...rewriteRefsForOpenApi(outputSchema).definitions,
        },
        parameters: {},
      },
    } as OpenAPIV3_1.Document;
  }

  private generateParametersForSchemaPath(inputSchema: JSONSchema7, schemaPath: string, paramType: string) {
    const propertySchemas = getUnifiedPropertySchemas(inputSchema, schemaPath);

    return Object.entries(propertySchemas).map(([name, schema]) => {
      // Just take the first provided description and example for now
      const description = schema.schemaSet.find((schema) => schema.description)?.description;
      let example = (schema.schemaSet.find((schema) => schema.examples))?.examples;
      if (Array.isArray(example)) {
        example = example[0];
      }

      // If every schema is deprecated, then the parameter is deprecated
      const deprecated = schema.schemaSet.every((schema) =>
        (schema as {
          deprecated?: boolean;
        }).deprecated
      );

      const mergedSchema = schema?.schemaSet.length === 1
        ? schema.schemaSet[0]
        : {
          anyOf: schema.schemaSet,
        };

      const paramObject: OpenAPIV3_1.ParameterObject = {
        name,
        in: paramType,
        required: schema.required,
        description,
        example,
        deprecated,
        schema: rewriteRefsForOpenApi(unresolveRefs(mergedSchema)) as OpenAPIV3.NonArraySchemaObject,
      };

      return paramObject;
    });
  }

  private generateOutputType(routeIndex: RouteIndex, outputSchema: JSONSchema7): OpenAPIV3_1.ResponsesObject {
    const responses: OpenAPIV3_1.ResponsesObject = {};
    const statusCodeDiscriminatedSchemas = resolveDiscriminantProperty(outputSchema, "/statusCode");

    if (statusCodeDiscriminatedSchemas == null) {
      throw new TransformationError("Could not resolve status codes for some responses", routeIndex);
    }

    for (const [statusCode, schema] of Object.entries(statusCodeDiscriminatedSchemas)) {
      const headers = this.generateParametersForSchemaPath(schema, "/headers", "header");
      const contentTypeDiscriminatedSchemas = resolveDiscriminantProperty(schema, "/headers/content-type");
      const bodySchema = getUnifiedPropertySchemas(schema, "/")["body"];
      if (contentTypeDiscriminatedSchemas == null && bodySchema != null) {
        throw new TransformationError(`Could not resolve content types for "${statusCode}" responses`, routeIndex);
      }

      const content = contentTypeDiscriminatedSchemas == null ? undefined : Object.fromEntries(
        Object.entries(contentTypeDiscriminatedSchemas).map(([contentType, schema]) => {
          const branchBodySchemaSet = getUnifiedPropertySchemas(schema, "/")["body"];
          const branchBodySchema = rewriteRefsForOpenApi(
            unresolveRefs(joinSchemas(branchBodySchemaSet.schemaSet)),
          );
          const example = getFirstExample(branchBodySchema);
          return [
            contentType,
            {
              ...(example == null ? {} : { example }),
              schema: branchBodySchema as OpenAPIV3.NonArraySchemaObject,
            },
          ];
        }),
      );

      responses[statusCode] = {
        description: getSchemaOrAllOf(schema).description || "",
        headers: Object.fromEntries(headers.map(header => [header.name, header])),
        content,
      };
    }

    return responses;
  }

  private generateRequestBody(routeIndex: RouteIndex, inputSchema: JSONSchema7): OpenAPIV3_1.RequestBodyObject | void {
    const bodySchema = getUnifiedPropertySchemas(inputSchema, "/")["body"];
    const contentTypeDiscriminatedSchemas = resolveDiscriminantProperty(inputSchema, "/headers/content-type");
    if (bodySchema == null) {
      return;
    }

    if (contentTypeDiscriminatedSchemas == null) {
      throw new TransformationError("Could not resolve content types for request body", routeIndex);
    }

    const content = Object.fromEntries(
      Object.entries(contentTypeDiscriminatedSchemas).map(([contentType, schema]) => {
        const branchBodySchemaSet = getUnifiedPropertySchemas(schema, "/")["body"];
        const branchBodySchema = rewriteRefsForOpenApi(unresolveRefs(joinSchemas(branchBodySchemaSet.schemaSet)));
        const example = getFirstExample(branchBodySchema);

        return [
          contentType,
          {
            ...(example == null ? {} : { example }),
            schema: branchBodySchema,
          },
        ];
      }),
    );

    // If there is exactly one branch, then we can use the description from that branch.
    // Otherwise, don't use a description.
    const description = Object.keys(content).length === 1
      ? getSchemaOrAllOf(Object.values(content)[0].schema).description
      : undefined;

    return {
      description,
      required: bodySchema.required,
      content,
    } as OpenAPIV3_1.RequestBodyObject;
  }
}

function deparameterizePath(path: string) {
  return path.replaceAll(/:[^/]+/g, ":param");
}

export interface RouteInfo {
  method: string;
  path: string;
  description?: string;
  summary?: string;
  input: ts.TypeNode;
  inputSchema: JSONSchema7;
  outputSchema: JSONSchema7;
  filePath: string;
  tags?: string[];
  deprecated?: boolean;
  operationId?: string;
}

export type RouteIndex = Pick<RouteInfo, "method" | "path">;
