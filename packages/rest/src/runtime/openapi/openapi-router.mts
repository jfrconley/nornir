import {AttachmentRegistry, Nornir, Result} from "@nornir/core";
import {OpenAPIV3_1} from "./spec.mjs"
import {
    DereferenceSpec,
    OpenAPIHttpMethods,
    OperationFromDocument,
    RequestTypeFromOperation,
    ResponseTypeFromOperation,
    UnionIntersection,
} from "./openapi-typelib.mjs";
import _Ajv, {ValidateFunction} from "ajv";
import Trouter from 'trouter';
import {JSONSchema} from "json-schema-to-ts";
import {OpenAPIHttpRequest, OpenAPIHttpResponse} from "./openapi-http-event.mjs";
import {HttpEvent, HttpMethod, HttpResponse} from "../http-event.mjs";
import {NornirRestRequestValidationError} from "../route-holder.mjs";

import {NornirRouteNotFoundError} from "../error.mjs";
import {debugLog, simpleSpecResolve} from "../utils.mjs";

const Ajv = _Ajv as unknown as typeof import("ajv").default;

type GenericRouteBuilder = (chain: Nornir<OpenAPIHttpRequest>) => Nornir<OpenAPIHttpRequest, OpenAPIHttpResponse>;

type RouteKey = `${HttpMethod}:${string}`


export class OpenAPIRouter<
    const InputSpec,
    const Spec extends OpenAPIV3_1.Document = DereferenceSpec<InputSpec>
> {
    private static validator = new Ajv({
        allErrors: true,
        coerceTypes: true,
        strict: false
    });
    private routes: {
        path: string,
        method: HttpMethod,
        handler: GenericRouteBuilder,
    }[] = [];

    private operationCache: Map<string, {
        operation: OpenAPIV3_1.OperationObject,
        requestSchema: JSONSchema,
        requestValidator: ValidateFunction
    }> = new Map()

    private _resolvedSpec: Spec | undefined;

    public get resolvedSpec() {
        if (this._resolvedSpec == null) {
            this._resolvedSpec = simpleSpecResolve(this.spec) as Spec;
        }
        return this._resolvedSpec;
    }

    private getOperation(path: string, method: HttpMethod): {
        operation: OpenAPIV3_1.OperationObject,
        requestSchema: JSONSchema,
        requestValidator: ValidateFunction
    }{
        const key = `${method}:${path}`;
        if (this.operationCache.has(key)) {
            return this.operationCache.get(key)!;
        }

        const operation = this.resolvedSpec.paths?.[path as keyof Spec["paths"]]?.[method.toLowerCase() as OpenAPIHttpMethods];

        if (operation == null) {
            throw new Error(`Operation ${method}:${path} not found`);
        }

        const requestSchema = this.buildOperationRequestSchema(operation);
        const requestValidator = OpenAPIRouter.validator.compile(requestSchema);

        const result = {
            operation,
            requestSchema,
            requestValidator
        }
        this.operationCache.set(key, result);

        return result;
    }

    private constructor(
        private readonly spec: InputSpec,
        existingRoutes: {
            path: string,
            method: HttpMethod,
            handler: GenericRouteBuilder,
        }[] = [],
    ) {
        this.routes = existingRoutes;
    }

    public static fromSpec<T extends OpenAPIV3_1.Document>(spec: T) {
        return new OpenAPIRouter<T>(spec);
    }

    public static merge<T extends OpenAPIV3_1.Document>(spec: T, ...routers: OpenAPIRouter<T>[]) {
        const routes = routers.flatMap(router => router.routes);
        return new OpenAPIRouter<T>(spec, routes);
    }

    private buildOperationRequestSchema(operation: OpenAPIV3_1.OperationObject): JSONSchema {
        type Params = {
            type: "object",
            properties: Record<string, JSONSchema>,
            required: string[]
        };

        const createParams = (): Params => ({
            type: "object",
            properties: {} as Record<string, JSONSchema>,
            required: [] as string[]
        });

        const pathParams = createParams();
        const query = createParams();
        const headers = createParams();
        let requestBodySchemas: JSONSchema[] = [];

        if (operation.parameters != null) {
            (operation.parameters as OpenAPIV3_1.ParameterObject[]).forEach(param => {
                let selectedParam: Params;

                switch (param.in) {
                    case "path":
                        selectedParam = pathParams;
                        break;
                    case "query":
                        selectedParam = query;
                        break;
                    case "header":
                        selectedParam = headers;
                        break;
                    default:
                        return;
                }

                selectedParam.properties[param.name] = param.schema;

                if (param.required) {
                    selectedParam.required.push(param.name);
                }
            });
        }

        if (operation.requestBody != null) {
            requestBodySchemas = Object.entries((operation.requestBody as OpenAPIV3_1.RequestBodyObject).content)
                .map(([contentType, requestBody]) => {
                    return {
                        type: "object",
                        properties: {
                            contentType: {
                                type: "string",
                                const: contentType
                            },
                            ...(requestBody.schema != null ? {body: requestBody.schema} : {})
                        },
                        required: ["contentType", ...(requestBody.schema != null ? ["body"] : [])]
                    }
                })
        }

        return {
            type: "object",
            properties: {
                pathParams: pathParams,
                query: query,
                headers: headers,
            },
            required: ["pathParams", "query", "headers"],
            ...(requestBodySchemas.length > 0 ? {anyOf: requestBodySchemas} : {})
        }
    }

    public implementRoute<
        const Path extends keyof NonNullable<Spec["paths"]>,
        const Method extends UnionIntersection<keyof NonNullable<NonNullable<Spec["paths"]>[Path]>, OpenAPIHttpMethods>,
        Operation extends OpenAPIV3_1.OperationObject = OperationFromDocument<Spec, Path, Method>,
        InputType = RequestTypeFromOperation<Operation>,
        ResponseType = ResponseTypeFromOperation<Operation>,
        Handler extends (chain: Nornir<NoInfer<InputType>>) => Nornir<NoInfer<InputType>, NoInfer<ResponseType>> = (chain: Nornir<NoInfer<InputType>>) => Nornir<NoInfer<InputType>, NoInfer<ResponseType>>
    >(path: Path, method: Method, handler: NoInfer<Handler>) {
        const route = {
            path: path as string,
            method: method.toUpperCase() as HttpMethod,
            handler: handler as unknown as GenericRouteBuilder,
        };
        debugLog(`Implemented route ${route.method}:${route.path}`);
        this.routes.push(route);
    }

    private convertOpenAPIPathToTrouterPath(path: string) {
        return path.replace(/\{([^}]+)\}/g, ":$1");
    }

    private getSpecRouteKeys(): Set<RouteKey> {
        const result = new Set<RouteKey>();

        for (const path in this.resolvedSpec.paths) {
            for (const method in this.resolvedSpec.paths[path]) {
                switch (method) {
                    case "get":
                    case "post":
                    case "put":
                    case "delete":
                    case "patch":
                    case "head":
                    case "options":
                        result.add(`${method.toUpperCase() as HttpMethod}:${path}`);
                        break;
                }
            }
        }
        return result;
    }

    private validateRoutes() {
        const specRoutes = this.getSpecRouteKeys();
        const implementedRoutes = new Set<RouteKey>();

        for (const {path, method} of this.routes) {
            const key = `${method}:${path}` as const;
            if (implementedRoutes.has(key)) {
                throw new Error(`Route ${key} is implemented more than once`);
            }
            if (!specRoutes.has(key)) {
                throw new Error(`Route ${key} is not in the spec`);
            }
            implementedRoutes.add(`${method}:${path}`);
        }

        for (const key of specRoutes) {
            if (!implementedRoutes.has(key)) {
                debugLog(`Route ${key} is in the spec but not implemented`);
            }
        }
    }

    public build(): (request: HttpEvent, registry: AttachmentRegistry) => Promise<HttpResponse> {
        const trouterInstance = new Trouter<
            (input: Result<OpenAPIHttpRequest>, registry: AttachmentRegistry) => Promise<Result<OpenAPIHttpResponse>>
        >();
        this.validateRoutes();

        for (const {path, method, handler} of this.routes) {
            const chain = new Nornir<OpenAPIHttpRequest>()
            const requestChain = chain.use(request => {
                const operation = this.getOperation(path, method);
                if (operation.requestValidator(request) === false) {
                    throw new NornirRestRequestValidationError(request, operation.requestValidator.errors || []);
                }
                return request;
            })

            const routeChain = handler(requestChain);

            trouterInstance.add(method, this.convertOpenAPIPathToTrouterPath(path), routeChain.buildWithContext());
        }

        return async (event, registry): Promise<HttpResponse> => {
            const {params, handlers: [handler]} = trouterInstance.find(event.method, event.path);

            const request = {
                ...event,
                headers: {
                    ...event.headers,
                },
                pathParams: params,
                contentType: event.headers["content-type"] as string,
            } as OpenAPIHttpRequest;

            if (handler == undefined) {
                throw new NornirRouteNotFoundError(request);
            }

            const response = (await handler(Result.ok(request), registry)).unwrap();
            if (response.contentType) {
                response.headers["content-type"] = response.contentType;
            }
            return response
        }
    }
}
