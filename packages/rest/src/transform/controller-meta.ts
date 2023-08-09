import ts from "typescript";
import { Project } from "./project";
import { FileTransformer } from "./transformers/file-transformer";

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

  public registerRoute(node: ts.Node, routeInfo: {
    method: string;
    path: string;
    description?: string;
    summary?: string;
    input: ts.Type;
    output: ts.Type;
    filePath: string;
  }) {
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

    methods.set(index.method, {
      method: routeInfo.method,
      path: this.basePath + routeInfo.path.toLowerCase(),
      description: routeInfo.description,
      // requestInfo: this.buildRequestInfo(index, routeInfo.input),
      // responseInfo: this.buildResponseInfo(index, routeInfo.output),
      filePath: routeInfo.filePath,
      summary: routeInfo.summary,
    });
  }

  // private buildRequestInfo(routeIndex: RouteIndex, inputType: ts.Type): RequestInfo {
  //   const paramterData: { [key in ParameterType]: { [name: string]: ParameterMeta } } = {
  //     path: {},
  //     header: {},
  //     query: {},
  //   };
  //   const body: { [contentType: string]: Metadata } = {};
  //
  //   const meta = MetadataFactory.generate(
  //     this.project.checker,
  //     ControllerMeta.metadataCollection,
  //     inputType,
  //     { resolve: false, constant: true },
  //   );
  //   for (const object of meta.objects) {
  //     for (const property of object.properties) {
  //       const key = MetadataUtils.getSoleLiteral(property.key);
  //       if (key != null && !isRequestTypeField(key)) {
  //         throw new Error(`Invalid request field: ${key}`);
  //       }
  //       switch (key) {
  //         case "query":
  //           this.buildParameterInfo(property.value, "query", paramterData);
  //           break;
  //         case "pathParams":
  //           this.buildParameterInfo(property.value, "path", paramterData);
  //           break;
  //         case "headers":
  //           this.buildParameterInfo(property.value, "header", paramterData);
  //           break;
  //       }
  //     }
  //     this.buildBodyInfo(routeIndex, object, body);
  //   }
  //
  //   return {
  //     body,
  //     parameters: [
  //       ...Object.values(paramterData.path),
  //       ...Object.values(paramterData.header),
  //       ...Object.values(paramterData.query),
  //     ],
  //   };
  // }

  // private buildResponseInfo(routeIndex: RouteIndex, outputType: ts.Type): ResponseInfo {
  //   const responses: ResponseInfo = {};
  //   const meta = MetadataFactory.generate(
  //     this.project.checker,
  //     ControllerMeta.metadataCollection,
  //     outputType,
  //     { resolve: false, constant: true },
  //   );
  //   for (const object of meta.objects) {
  //     const statusCodeProp = MetadataUtils.getPropertyByStringIndex(object, "statusCode");
  //     if (statusCodeProp == null) {
  //       throw new Error("Response must have a statusCode property");
  //     }
  //     let statusCodes = statusCodeProp.constants.map((c) => c.values).flat().map(v => v.toString());
  //     if (HttpStatusCodes.every((c) => statusCodes.includes(c))) {
  //       strictError(
  //         this.project,
  //         new StrictTransformationError(
  //           "Response status codes must be literal values",
  //           "Defaulting response status code to 200",
  //           routeIndex,
  //         ),
  //       );
  //       statusCodes = ["200"];
  //     }
  //
  //     if (statusCodes.length === 0) {
  //       throw new Error("Literal status codes must be specified");
  //     }
  //
  //     for (const statusCode of statusCodes) {
  //       if (responses[statusCode] != null) {
  //         throw new Error(`Response already defined for status code ${statusCode}`);
  //       }
  //       const headerParamHolder: { [key in ParameterType]: { [name: string]: ParameterMeta } } = {
  //         path: {},
  //         header: {},
  //         query: {},
  //       };
  //       const headerProp = MetadataUtils.getPropertyByStringIndex(object, "headers");
  //       if (headerProp != null) {
  //         this.buildParameterInfo(headerProp, "header", headerParamHolder);
  //       }
  //       const result: ResponseInfo[string] = {
  //         body: {},
  //         headers: Object.values(headerParamHolder.header),
  //       };
  //       this.buildBodyInfo(routeIndex, object, result.body);
  //       responses[statusCode] = result;
  //     }
  //   }
  //   return responses;
  // }

  // private buildBodyInfo(
  //   routeIndex: RouteIndex,
  //   object: MetadataObject,
  //   bodyTypes: { [contentType: string]: Metadata },
  // ) {
  //   let contentType = this.getContentTypeFromObject(object);
  //   const bodyType = MetadataUtils.getPropertyByStringIndex(object, "body");
  //   if (bodyType == null || (bodyType.empty() && !bodyType.nullable)) {
  //     return;
  //   }
  //   if (contentType == null) {
  //     strictError(
  //       this.project,
  //       new StrictTransformationError(
  //         "No content type specified for body",
  //         "No content type specified, defaulting to application/json",
  //         routeIndex,
  //       ),
  //     );
  //   }
  //   contentType = contentType || DEFAULT_CONTENT_TYPE;
  //   const existingBody = bodyTypes[contentType];
  //   if (existingBody != null) {
  //     if (MetadataUtils.equal(existingBody, bodyType)) {
  //       return;
  //     } else {
  //       throw new Error(`Content type ${contentType} already defined`);
  //     }
  //   } else {
  //     bodyTypes[contentType] = bodyType;
  //   }
  // }

  // private getContentTypeFromObject(metaObject: MetadataObject): string | null {
  //   const headers = MetadataUtils.getPropertyByStringIndex(metaObject, "headers");
  //   if (headers == null) {
  //     return null;
  //   }
  //   if (headers.objects.length !== 1) {
  //     return null;
  //   }
  //   const headerObject = headers.objects[0];
  //   const contentType = MetadataUtils.getPropertyByStringIndex(headerObject, "content-type");
  //   if (contentType == null) {
  //     return null;
  //   }
  //   return MetadataUtils.getSoleLiteral(contentType);
  // }

  // private buildParameterInfo(
  //   inputMeta: Metadata,
  //   parameterType: ParameterType,
  //   parameterData: { [key in ParameterType]: { [name: string]: ParameterMeta } },
  // ) {
  //   for (const object of inputMeta.objects) {
  //     for (const property of object.properties) {
  //       const key = MetadataUtils.getSoleLiteral(property.key);
  //       if (key == null) {
  //         continue;
  //       }
  //       const meta = property.value;
  //       const existingParameter = parameterData[parameterType][key];
  //       if (existingParameter != null) {
  //         parameterData[parameterType][key] = {
  //           name: key,
  //           meta: Metadata.merge(existingParameter.meta, meta),
  //           type: parameterType,
  //         };
  //       } else {
  //         parameterData[parameterType][key] = {
  //           name: key,
  //           meta,
  //           type: parameterType,
  //         };
  //       }
  //     }
  //   }
  // }
}

function deparameterizePath(path: string) {
  return path.replaceAll(/:[^/]+/g, ":param");
}

export interface RouteInfo {
  method: string;
  path: string;
  description?: string;
  summary?: string;
  // requestInfo: RequestInfo;
  // responseInfo: ResponseInfo;
  filePath: string;
}

export type RouteIndex = Pick<RouteInfo, "method" | "path">;
