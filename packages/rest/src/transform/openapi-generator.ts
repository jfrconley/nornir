import type { OpenAPIV3 } from "openapi-types";
import { Metadata } from "typia/lib/metadata/Metadata";
import { ApplicationProgrammer } from "typia/lib/programmers/ApplicationProgrammer";
import { ParameterMeta, RequestBody, RouteInfo } from "./controller-meta";
import { IProject } from "./project";

export class OpenapiGenerator {
  constructor(
    private readonly project: IProject,
    private readonly routes: RouteInfo[],
  ) {}

  public generate(): OpenAPIV3.Document {
    const metaSchemaMap: { metadata: Metadata; schema: object }[] = [];
    const openapi: OpenAPIV3.Document = {
      openapi: "3.0.3",
      info: {
        title: "Nornir Rest API",
        version: "1.0.0",
      },
      paths: {},
      components: {},
    };

    for (const route of this.routes) {
      const path = route.path;
      const method = route.method.toLowerCase();
      if (!openapi.paths) {
        openapi.paths = {};
      }
      if (!openapi.paths[path]) {
        openapi.paths[path] = {};
      }
      (openapi.paths[path] as OpenAPIV3.PathItemObject)[method as OpenAPIV3.HttpMethods] = this.generateRoute(
        route,
        metaSchemaMap,
      );
    }

    const jsonApp = ApplicationProgrammer.generate(
      metaSchemaMap.map((metaSchema) => metaSchema.metadata),
      {
        purpose: "swagger",
      },
    );

    metaSchemaMap.forEach(({ schema }, index) => {
      Object.assign(schema, jsonApp.schemas[index]);
    });

    openapi.components = {
      schemas: jsonApp.components.schemas as any,
    };
    return openapi;
  }

  private generateRoute(route: RouteInfo, metaTupleSet: MetaTupleSet): OpenAPIV3.OperationObject {
    const res: OpenAPIV3.OperationObject = {
      parameters: route.requestInfo.parameters.map((parameter) => this.generateParameter(parameter, metaTupleSet)),
      requestBody: this.generateRequestBody(route.requestInfo.body, metaTupleSet),
      responses: this.generateResponse(route, metaTupleSet),
      description: route.description,
      summary: route.summary,
    };

    return res;
  }

  private generateResponse(route: RouteInfo, metaTupleSet: MetaTupleSet): OpenAPIV3.ResponsesObject {
    const res: OpenAPIV3.ResponsesObject = {};
    for (const statusCode in route.responseInfo) {
      const response = route.responseInfo[statusCode];
      res[statusCode] = {
        headers: response.headers.map((header) => this.generateParameter(header, metaTupleSet)).reduce(
          (acc, header) => {
            acc![header.name] = header;
            return acc;
          },
          {} as OpenAPIV3.ResponseObject["headers"],
        ),
        ...this.generateRequestBody(response.body, metaTupleSet),
        description: "",
      };
    }
    return res;
  }

  private generateRequestBody(
    requestBody: RequestBody,
    metaTupleSet: MetaTupleSet,
  ): OpenAPIV3.RequestBodyObject | undefined {
    const contentTypes = Object.keys(requestBody);
    if (contentTypes.length === 0) {
      return undefined;
    }
    const body: OpenAPIV3.RequestBodyObject = {
      content: {},
    };
    for (const contentType of contentTypes) {
      const metaTuple = { metadata: requestBody[contentType], schema: {} };
      body.content[contentType] = {
        schema: metaTuple.schema,
      };
      metaTupleSet.push(metaTuple);
    }
    return body;
  }
  private generateParameter(parameter: ParameterMeta, metaTupleSet: MetaTupleSet): OpenAPIV3.ParameterObject {
    const metaTuple: MetaTuple = { metadata: parameter.meta, schema: {} };
    metaTupleSet.push(metaTuple);
    return {
      name: parameter.name,
      required: parameter.meta.required,
      in: parameter.type,
      schema: metaTuple.schema,
    };
  }
}

interface MetaTuple {
  metadata: Metadata;
  schema: object;
}
type MetaTupleSet = MetaTuple[];
