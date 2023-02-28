import { IProject } from './project';
import { ControllerMeta, ParameterMeta, RouteInfo } from './controller-meta';
import type {OpenAPIV3_1} from 'openapi-types'
import { Metadata } from 'typia/lib/metadata/Metadata';
import { ApplicationProgrammer } from 'typia/lib/programmers/ApplicationProgrammer';

export class OpenapiGenerator {
  constructor(
    private readonly project: IProject,
    private readonly routes: RouteInfo[],
  ) {}

  public generate(): OpenAPIV3_1.Document {
    const metaSchemaMap: {metadata: Metadata, schema: object}[] = []
    const openapi: OpenAPIV3_1.Document = {
      openapi: "3.1.0",
      info: {
        title: "Nornir Rest API",
        version: "1.0.0",
      },
      paths: {},
      components: {}
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
      openapi.paths[path]![method as OpenAPIV3_1.HttpMethods] = this.generateRoute(route, metaSchemaMap) as any;
    }

    const jsonApp = ApplicationProgrammer.generate(
      metaSchemaMap.map((metaSchema) => metaSchema.metadata),
      {
        purpose: "swagger"
      }
    )

    metaSchemaMap.forEach(({schema}, index) => {
      Object.assign(schema, jsonApp.schemas[index])
    });

    return openapi;
  }

  private generateRoute(route: RouteInfo, metaTupleSet: MetaTupleSet): OpenAPIV3_1.OperationObject {
    const res: OpenAPIV3_1.OperationObject = {
      parameters: route.requestInfo.parameters.map((parameter) => this.generateParameter(parameter, metaTupleSet)),
      requestBody: this.generateRequestBody(route, metaTupleSet),
      responses: {
      }
    }

    return res;
  }

  private generateRequestBody(route: RouteInfo, metaTupleSet: MetaTupleSet): OpenAPIV3_1.RequestBodyObject {
    const contentTypes = Object.keys(route.requestInfo.body);
    const body: OpenAPIV3_1.RequestBodyObject = {
      content: {}
    };
    for (const contentType of contentTypes) {
      const metaTuple = {metadata: route.requestInfo.body[contentType], schema: {}};
      body.content[contentType] = {
        schema: metaTuple.schema
      }
      metaTupleSet.push(metaTuple);
    }
    return body;
  }
  private generateParameter(parameter: ParameterMeta, metaTupleSet: MetaTupleSet): OpenAPIV3_1.ParameterObject {
    const metaTuple: MetaTuple = {metadata: parameter.meta, schema: {}};
    metaTupleSet.push(metaTuple);
    return {
      name: parameter.name,
      required: parameter.meta.required,
      in: parameter.type,
      schema: metaTuple.schema,
    }
  }
}

interface MetaTuple {metadata: Metadata, schema: object}
type MetaTupleSet = MetaTuple[]
