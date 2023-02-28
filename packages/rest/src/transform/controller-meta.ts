import { isLiteralType, isTypeFlagSet, isUnionOrIntersectionType } from "tsutils";
import ts from "typescript";
import { MetadataCollection } from "typia/lib/factories/MetadataCollection";
import { MetadataFactory } from "typia/lib/factories/MetadataFactory";
import { Metadata } from "typia/lib/metadata/Metadata";
import { MetadataObject } from "typia/lib/metadata/MetadataObject";
import { TransformationError } from "./error";
import { MetadataUtils, strictError } from "./lib";
import { IProject } from "./project";

const DEFAULT_CONTENT_TYPE = "application/json";
export class ControllerMeta {
  private static cache = new Map<ts.Identifier, ControllerMeta>();
  private static routes = new Map<string, Map<string, RouteInfo>>();

  public static readonly metadataCollection = new MetadataCollection({
    replace: MetadataCollection.replace,
  });

  private routeHolderIdentifier?: ts.Identifier;
  private controllerInstanceIdentifier?: ts.Identifier;
  private basePath?: string;

  public static getRoutes(): RouteInfo[] {
    const methods = ControllerMeta.routes.values();
    const routes = Array.from(methods).map((method) => Array.from(method.values()));
    return routes.flat();
  }

  public static getAndClearRoutes(): RouteInfo[] {
    const routes = this.getRoutes();
    this.routes.clear();
    return routes;
  }

  public static clearCache() {
    this.cache.clear();
  }

  public static create(project: IProject, route: ts.ClassDeclaration): ControllerMeta {
    const name = route.name;
    if (!name) {
      throw new Error("Route class must have a name");
    }
    if (this.cache.has(name)) {
      throw new Error("Route already exists: " + name.getText());
    }
    const meta = new ControllerMeta(project, route, name);
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
    private readonly project: IProject,
    public readonly route: ts.ClassDeclaration,
    public readonly identifier: ts.Identifier,
  ) {}

  public getRouteHolderIdentifier(): ts.Identifier {
    if (!this.isRegistered) {
      throw new Error("Route not registered");
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.routeHolderIdentifier!;
  }

  public getControllerInstanceIdentifier(): ts.Identifier {
    if (!this.isRegistered) {
      throw new Error("Route not registered");
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.controllerInstanceIdentifier!;
  }

  public get isRegistered(): boolean {
    return (this.basePath != null && this.routeHolderIdentifier != null);
  }

  public registerRouteHolder(
    routeHandlerIdentifier: ts.Identifier,
    routeControllerIdentifier: ts.Identifier,
    basePath: string,
  ) {
    if (this.isRegistered) {
      throw new Error("Route already registered");
    }
    this.basePath = basePath.toLowerCase();
    this.controllerInstanceIdentifier = routeControllerIdentifier;
    this.routeHolderIdentifier = routeHandlerIdentifier;
  }

  private getRouteIndex(info: { method: string; path: string }) {
    return {
      method: info.method,
      path: this.basePath + deparameterizePath(info.path).toLowerCase(),
    };
  }

  public registerRoute(routeInfo: {
    method: string;
    path: string;
    description?: string;
    input: ts.Type,
    output: ts.Type,
    filePath: string
  }) {
    if (!this.isRegistered) {
      throw new Error("Route not registered");
    }
    const index = this.getRouteIndex(routeInfo);
    const methods = ControllerMeta.routes.get(index.path) || new Map<string, RouteInfo>();
    ControllerMeta.routes.set(index.path, methods);
    const route = methods.get(index.method);
    if (route != null) {
      throw new Error(`Route already registered: ${index.method} ${index.path}`);
    }

    methods.set(index.method, {
      method: routeInfo.method,
      path: this.basePath + routeInfo.path.toLowerCase(),
      description: routeInfo.description,
      requestInfo: this.buildRequestInfo(routeInfo.input),
      filePath: routeInfo.filePath,
    });
  }

  private buildRequestInfo(inputType: ts.Type): RequestInfo {
    const paramterData: { [key in ParameterType]: { [name: string]: ParameterMeta } } = {
      path: {},
      header: {},
      query: {},
    };
    const body: { [contentType: string]: Metadata } = {};

    const meta = MetadataFactory.generate(
      this.project.checker,
      ControllerMeta.metadataCollection,
      inputType,
      { resolve: false, constant: true },
    );
    for (const object of meta.objects) {
      for (const property of object.properties) {
        const key = MetadataUtils.getSoleLiteral(property.key);
        if (key != null && !isRequestTypeField(key)) {
          throw new Error(`Invalid request field: ${key}`);
        }
        switch (key) {
          case "query":
            this.buildParameterInfo(property.value, "query", paramterData);
            break;
          case "pathParams":
            this.buildParameterInfo(property.value, "path", paramterData);
            break;
          case "headers":
            this.buildParameterInfo(property.value, "header", paramterData);
            break;
        }
      }
      this.buildBodyInfo(object, body);
    }

    return {
      body,
      parameters: [
        ...Object.values(paramterData.path),
        ...Object.values(paramterData.header),
        ...Object.values(paramterData.query),
      ],
    };
  }

  private buildBodyInfo(object: MetadataObject, bodyTypes: {[contentType: string]: Metadata}) {
    let contentType = this.getContentTypeFromObject(object);
    const bodyType = MetadataUtils.getPropertyByStringIndex(object, "body");
    if (bodyType == null || (bodyType.empty() && !bodyType.nullable)) {
      return;
    }
    if (contentType == null) {
      strictError(this.project, new Error("No content type specified for body"));
      console.warn("No content type specified, defaulting to application/json");
    }
    contentType = contentType || DEFAULT_CONTENT_TYPE;
    const existingBody = bodyTypes[contentType];
    if (existingBody != null) {
      if (MetadataUtils.equal(existingBody, bodyType)) {
        return;
      } else {
        bodyTypes[contentType] = Metadata.merge(existingBody, bodyType);
      }
    } else {
      bodyTypes[contentType] = bodyType;
    }
  }

  private getContentTypeFromObject(metaObject: MetadataObject): string | null {
    const headers = MetadataUtils.getPropertyByStringIndex(metaObject, "headers");
    if (headers == null) {
      return null;
    }
    if (headers.objects.length !== 1) {
      return null;
    }
    const headerObject = headers.objects[0];
    const contentType = MetadataUtils.getPropertyByStringIndex(headerObject, "content-type");
    if (contentType == null) {
      return null;
    }
    return MetadataUtils.getSoleLiteral(contentType);
  }

  private buildParameterInfo(
    inputMeta: Metadata,
    parameterType: ParameterType,
    parameterData: { [key in ParameterType]: { [name: string]: ParameterMeta } },
  ) {
    for (const object of inputMeta.objects) {
      for (const property of object.properties) {
        const key = MetadataUtils.getSoleLiteral(property.key);
        if (key == null) {
          continue;
        }
        const meta = property.value;
        const existingParameter = parameterData[parameterType][key];
        if (existingParameter != null) {
          parameterData[parameterType][key] = {
            name: key,
            meta: Metadata.merge(existingParameter.meta, meta),
            type: parameterType
          };
        } else {
          parameterData[parameterType][key] = {
            name: key,
            meta,
            type: parameterType
          };
        }
      }
    }
  }
}

function isRequestTypeField(name: string): name is RequestTypeField {
  return RequestTypeFields.includes(name as RequestTypeField);
}

function deparameterizePath(path: string) {
  return path.replace(/:[^/]+/g, ":param");
}

const RequestTypeFields = ["pathParams", "query", "headers", "body"] as const;
type RequestTypeField = typeof RequestTypeFields[number];

type ParameterType = "path" | "query" | "header";

export interface ParameterMeta {
  name: string;
  meta: Metadata;
  type: ParameterType;
}

export interface RouteInfo {
  method: string;
  path: string;
  description?: string;
  requestInfo: RequestInfo;

  filePath: string;
}

interface RequestInfo {
  parameters: ParameterMeta[];
  body: { [contentType: string]: Metadata };
}
