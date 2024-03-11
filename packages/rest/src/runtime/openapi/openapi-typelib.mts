import {OpenAPIV3_1} from "./spec.mjs"
import {FromSchema} from "json-schema-to-ts"
import {DeeplyResolveAllRefsInJsonObject} from "../utils.mjs";

export type DereferenceSpec<T> = DeeplyResolveAllRefsInJsonObject<T> & OpenAPIV3_1.Document

export type OpenAPIHttpMethods = "get" | "post" | "put" | "delete" | "options" | "head" | "patch" | "trace"


export type UnionIntersection<
    T,
    U,
> = T extends U ? U extends T ? T : never : never

export type OperationFromDocument<
    Document extends OpenAPIV3_1.Document,
    Path extends DocumentPaths<Document>,
    Method extends DocumentMethods<Document, Path>,
> = NonNullable<NonNullable<NonNullable<Document["paths"]>[Path]>[Method]>

export type DocumentPaths<
    Document extends OpenAPIV3_1.Document
> = keyof NonNullable<Document["paths"]>

export type DocumentMethods<
    Document extends OpenAPIV3_1.Document,
    Path extends keyof NonNullable<Document["paths"]>,
> = UnionIntersection<keyof NonNullable<NonNullable<Document["paths"]>[Path]>, OpenAPIHttpMethods>

type ArrayToUnion<T extends unknown[]> = T[number]

/**
 * Return a type with parameters filtered by the `in` property
 */
type FilterParametersByIn<
    Parameters extends OpenAPIV3_1.ParameterObject | OpenAPIV3_1.ReferenceObject,
    In extends OpenAPIV3_1.ParameterObject["in"]
> = Parameters extends { in: In } ? Parameters : never

type UndefinedProps<T extends object> = {
    [K in keyof T as undefined extends T[K] ? K : never]?: NonNullable<T[K]>
}

// Combine with rest of the required properties
type MakeOptional<T extends object> = UndefinedProps<T> & Omit<T, keyof UndefinedProps<T>>

type RequestParameterObjectKeys<
    Parameters extends OpenAPIV3_1.ParameterObject
> = Parameters extends { name: infer Name } ? Name : never

type RequestRequiredParameters<
    Parameters extends OpenAPIV3_1.ParameterObject
> = Parameters extends { required: true } ? Parameters : never

type RequestOptionalParameters<
    Parameters extends OpenAPIV3_1.ParameterObject
> = Parameters extends { required?: false } ? Parameters : never

type ParameterSchemaToType<
    Parameter extends OpenAPIV3_1.ParameterObject
> = FromSchema<NonNullable<Parameter["schema"]>>

type RequestParameterObject<
    Parameters extends OpenAPIV3_1.ParameterObject,
    RequiredParameters extends OpenAPIV3_1.ParameterObject = RequestRequiredParameters<Parameters>,
    OptionalParameters extends OpenAPIV3_1.ParameterObject = RequestOptionalParameters<Parameters>
> = {
    [K in RequestParameterObjectKeys<RequiredParameters>]: Parameters extends { name: K } ? ParameterSchemaToType<Parameters> : never
} & {
    [K in RequestParameterObjectKeys<OptionalParameters>]?: Parameters extends { name: K } ? ParameterSchemaToType<Parameters> : never
}

type GetParametersFromOperation<
    Operation extends OpenAPIV3_1.OperationObject,
    In extends OpenAPIV3_1.ParameterObject["in"]
> = RequestParameterObject<FilterParametersByIn<ArrayToUnion<NonNullable<Operation["parameters"]>>, In>>


export type BaseRequestTypeFromOperation<
    Operation extends OpenAPIV3_1.OperationObject,
> = {
    headers: GetParametersFromOperation<Operation, "header">,
    query: GetParametersFromOperation<Operation, "query">,
    pathParams: GetParametersFromOperation<Operation, "path">,
}

export type RequestBodyToRequestTypeUnion<
    Operation extends OpenAPIV3_1.OperationObject,
    MappedContent extends MapRequestBodyContentToTypeUnion<NonNullable<Exclude<Operation["requestBody"], OpenAPIV3_1.ReferenceObject>>["content"]> = MapRequestBodyContentToTypeUnion<NonNullable<Exclude<Operation["requestBody"], OpenAPIV3_1.ReferenceObject>>["content"]>
> = NonNullable<Operation["requestBody"]> extends { required: true } ?
    MappedContent extends { "content-type": string, schema: OpenAPIV3_1.SchemaObject } ?
        { contentType: MappedContent["content-type"], body: FromSchema<MakeOptional<MappedContent["schema"]>> } : never :
    MappedContent extends { "content-type": string, schema: OpenAPIV3_1.SchemaObject } ?
        { contentType: MappedContent["content-type"], body?: FromSchema<MakeOptional<MappedContent["schema"]>> } : never

export type RequestTypeFromOperation<
    Operation extends OpenAPIV3_1.OperationObject,
> = RequestBodyToRequestTypeUnion<Operation> extends never ?
    BaseRequestTypeFromOperation<Operation> :
    BaseRequestTypeFromOperation<Operation> & RequestBodyToRequestTypeUnion<Operation>;

type MapRequestBodyContentToTypeUnion<
    RequestBodyContent extends OpenAPIV3_1.RequestBodyObject["content"]
> = {
    [K in keyof RequestBodyContent]: RequestBodyContent[K] & { "content-type": K }
} extends {[K: string]: infer U} ? U : never;

type MapResponseStatusCodesToTypeUnion<
    Responses extends OpenAPIV3_1.ResponsesObject
> = {
    [K in keyof Responses]: Responses[K] & { statusCode: K }
} extends {[K: string]: infer U} ? U : never;

type MapResponseBodyContentToTypeUnion<
    ResponseBodyContent extends OpenAPIV3_1.ResponseObject["content"]
> = {
    [K in keyof ResponseBodyContent]: ResponseBodyContent[K] & { "contentType": K }
} extends {[K: string]: infer U} ? U : never;

type ResponseContentToResponseContentTypeUnion<
    Response extends OpenAPIV3_1.ResponseObject,
    MappedContent extends MapResponseBodyContentToTypeUnion<NonNullable<Response["content"]>> = MapResponseBodyContentToTypeUnion<NonNullable<Response["content"]>>
> = MappedContent extends { "contentType": string, schema: OpenAPIV3_1.SchemaObject } ?
    { contentType: MappedContent["contentType"], body: FromSchema<MakeOptional<MappedContent["schema"]>> } : never

type ResponsesToResponseTypeUnion<
    Responses extends OpenAPIV3_1.ResponsesObject,
    MappedContent extends MapResponseStatusCodesToTypeUnion<Responses> = MapResponseStatusCodesToTypeUnion<Responses>
> = MappedContent extends { statusCode: string } & OpenAPIV3_1.ResponseObject ?
       ResponseContentToResponseContentTypeUnion<MappedContent> extends never ?
           ResponseHeadersToTypeUnion<MappedContent> & { statusCode: MappedContent["statusCode"] } :
       ResponseContentToResponseContentTypeUnion<MappedContent> &
           { statusCode: MappedContent["statusCode"] } &
          ResponseHeadersToTypeUnion<MappedContent>
    : never

export type ResponseTypeFromOperation<
    Operation extends OpenAPIV3_1.OperationObject
> = ResponsesToResponseTypeUnion<NonNullable<Operation["responses"]>>

type ResponseHeadersToTypeUnion<
    Response extends OpenAPIV3_1.ResponseObject
> = Response extends { headers: Record<string, OpenAPIV3_1.HeaderObject>} ? {
    headers: {
        [K in ResponseHeadersRequiredKeys<Response["headers"]>]: FromSchema<MakeOptional<NonNullable<NonNullable<NonNullable<Response["headers"]>[K]>["schema"]>>>
    } & {
        [K in ResponseHeadersOptionalKeys<Response["headers"]>]?: FromSchema<MakeOptional<NonNullable<NonNullable<NonNullable<Response["headers"]>[K]>["schema"]>>>
    }
} : { headers: Record<string, never>};

type ResponseHeadersRequiredKeys<
    Headers extends OpenAPIV3_1.ResponseObject["headers"],
    HeaderKeys extends keyof Headers = keyof Headers
> = Headers[HeaderKeys] extends { required: true } ? HeaderKeys : never

type ResponseHeadersOptionalKeys<
    Headers extends OpenAPIV3_1.ResponseObject["headers"],
    HeaderKeys extends keyof Headers = keyof Headers
> = Headers[HeaderKeys] extends { required?: false } ? HeaderKeys : never
