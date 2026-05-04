import {OpenAPIV3_1} from "./spec.mjs"
import {FromSchema} from "json-schema-to-ts"
import {DeeplyResolveAllRefsInJsonObject} from "../shared/utils.mjs";

export type DereferenceSpec<T extends OpenAPIV3_1.Document> = DeeplyResolveAllRefsInJsonObject<T>

export type OpenAPIHttpMethods = "get" | "post" | "put" | "delete" | "options" | "head" | "patch" | "trace"


export type UnionIntersection<
    T,
    U,
> = T extends U ? U extends T ? T : never : never

export type OperationFromDocument<
    Document extends { paths?: unknown },
    Path extends DocumentPaths<Document>,
    Method extends DocumentMethods<Document, Path>,
> = NonNullable<NonNullable<NonNullable<Document["paths"]>[Path]>[Method]>

export type DocumentPaths<
    Document extends { paths?: unknown }
> = keyof NonNullable<Document["paths"]>

export type DocumentMethods<
    Document extends { paths?: unknown },
    Path extends keyof NonNullable<Document["paths"]>,
> = keyof NonNullable<NonNullable<Document["paths"]>[Path]>

type ArrayToUnion<T> = T extends readonly (infer U)[] ? U : never

/**
 * Return a type with parameters filtered by the `in` property
 */
type FilterParametersByIn<
    Parameters,
    In extends OpenAPIV3_1.ParameterObject["in"]
> = Parameters extends { in: In } ? Parameters : never

type UndefinedProps<T extends object> = {
    [K in keyof T as undefined extends T[K] ? K : never]?: NonNullable<T[K]>
}

// Combine with rest of the required properties
type MakeOptional<T extends object> = UndefinedProps<T> & Omit<T, keyof UndefinedProps<T>>

type RequestParameterObjectKeys<
    Parameters
> = Parameters extends { name: infer Name } ? Name : never

type RequestRequiredParameters<
    Parameters
> = Parameters extends { required: true } ? Parameters : never

type RequestOptionalParameters<
    Parameters
> = Parameters extends { required?: false } ? Parameters : never

type ParameterSchemaToType<
    Parameter
> = Parameter extends { schema?: infer S } ? FromSchema<NonNullable<S>> : never

type RequestParameterObject<
    Parameters,
    RequiredParameters = RequestRequiredParameters<Parameters>,
    OptionalParameters = RequestOptionalParameters<Parameters>
> = {
    [K in RequestParameterObjectKeys<RequiredParameters> & PropertyKey]: Parameters extends { name: K } ? ParameterSchemaToType<Parameters> : never
} & {
    [K in RequestParameterObjectKeys<OptionalParameters> & PropertyKey]?: Parameters extends { name: K } ? ParameterSchemaToType<Parameters> : never
}

type GetParametersFromOperation<
    Operation,
    In extends OpenAPIV3_1.ParameterObject["in"]
> = Operation extends { parameters?: infer P }
    ? RequestParameterObject<FilterParametersByIn<ArrayToUnion<NonNullable<P>>, In>>
    : RequestParameterObject<never>


export type BaseRequestTypeFromOperation<
    Operation,
> = {
    headers: GetParametersFromOperation<Operation, "header">,
    query: GetParametersFromOperation<Operation, "query">,
    pathParams: GetParametersFromOperation<Operation, "path">,
}

type RequestBodyContent<Operation> =
    Operation extends { requestBody?: infer RB }
        ? RB extends OpenAPIV3_1.ReferenceObject ? never
        : RB extends { content?: infer C } ? C : never
        : never

type IsRequestBodyRequired<Operation> =
    Operation extends { requestBody?: infer RB }
        ? RB extends { required: true } ? true : false
        : false

export type RequestBodyToRequestTypeUnion<
    Operation,
    MappedContent = MapRequestBodyContentToTypeUnion<RequestBodyContent<Operation>>
> = IsRequestBodyRequired<Operation> extends true ?
    MappedContent extends { "content-type": string, schema: OpenAPIV3_1.SchemaObject } ?
        { contentType: MappedContent["content-type"], body: FromSchema<MakeOptional<MappedContent["schema"]>> } : never :
    MappedContent extends { "content-type": string, schema: OpenAPIV3_1.SchemaObject } ?
        { contentType: MappedContent["content-type"], body?: FromSchema<MakeOptional<MappedContent["schema"]>> } : never

export type RequestTypeFromOperation<
    Operation,
> = RequestBodyToRequestTypeUnion<Operation> extends never ?
    BaseRequestTypeFromOperation<Operation> :
    BaseRequestTypeFromOperation<Operation> & RequestBodyToRequestTypeUnion<Operation>;

type MapRequestBodyContentToTypeUnion<
    RequestBodyContent
> = {
    [K in keyof RequestBodyContent]: RequestBodyContent[K] & { "content-type": K }
} extends {[K: string]: infer U} ? U : never;

type MapResponseStatusCodesToTypeUnion<
    Responses
> = {
    [K in keyof Responses]: Responses[K] & { statusCode: K }
} extends {[K: string]: infer U} ? U : never;

type MapResponseBodyContentToTypeUnion<
    ResponseBodyContent
> = {
    [K in keyof ResponseBodyContent]: ResponseBodyContent[K] & { "contentType": K }
} extends {[K: string]: infer U} ? U : never;

type ResponseContentToResponseContentTypeUnion<
    Response,
    MappedContent = Response extends { content?: infer C } ? MapResponseBodyContentToTypeUnion<NonNullable<C>> : never
> = MappedContent extends { "contentType": string, schema: OpenAPIV3_1.SchemaObject } ?
    { contentType: MappedContent["contentType"], body: FromSchema<MakeOptional<MappedContent["schema"]>> } : never

type ResponsesToResponseTypeUnion<
    Responses,
    MappedContent = MapResponseStatusCodesToTypeUnion<Responses>
> = MappedContent extends { statusCode: string } ?
       ResponseContentToResponseContentTypeUnion<MappedContent> extends never ?
           ResponseHeadersToTypeUnion<MappedContent> & { statusCode: MappedContent["statusCode"] } :
       ResponseContentToResponseContentTypeUnion<MappedContent> &
           { statusCode: MappedContent["statusCode"] } &
          ResponseHeadersToTypeUnion<MappedContent>
    : never

export type ResponseTypeFromOperation<
    Operation
> = Operation extends { responses?: infer R } ? ResponsesToResponseTypeUnion<NonNullable<R>> : never

type HeaderSchemaType<H, K extends PropertyKey> =
    H extends Record<PropertyKey, unknown>
        ? K extends keyof H
            ? NonNullable<H[K]> extends { schema?: infer S } ? FromSchema<MakeOptional<NonNullable<S>>> : never
            : never
        : never

type ResponseHeadersToTypeUnion<
    Response
> = Response extends { headers: infer H } ? {
    headers: {
        [K in ResponseHeadersRequiredKeys<H> & PropertyKey]: HeaderSchemaType<H, K>
    } & {
        [K in ResponseHeadersOptionalKeys<H> & PropertyKey]?: HeaderSchemaType<H, K>
    }
} : { headers: Record<string, never>};

type ResponseHeadersRequiredKeys<
    Headers,
    HeaderKeys extends keyof Headers = keyof Headers
> = Headers[HeaderKeys] extends { required: true } ? HeaderKeys : never

type ResponseHeadersOptionalKeys<
    Headers,
    HeaderKeys extends keyof Headers = keyof Headers
> = Headers[HeaderKeys] extends { required?: false } ? HeaderKeys : never
