import {
    Controller,
    GetChain,
    HttpEvent,
    HttpRequest,
    HttpRequestEmpty,
    normalizeEventHeaders,
    NornirRestRequestValidationError,
    PostChain,
    router,
    MimeType,
    HttpStatusCode
} from "../../dist/runtime/index.mjs";
import {nornir, Nornir} from "@nornir/core";
import {describe} from "@jest/globals";
import {NornirRouteNotFoundError} from "../../dist/runtime/router.mjs";

interface RouteGetInput extends HttpRequestEmpty {
}


interface RoutePostInputJSON extends HttpRequest {
    headers: {
        "content-type": MimeType.ApplicationJson;
    };
    body: RoutePostBodyInput;
    query: {
        test: boolean;
    };
}

interface RoutePostInputCSV extends HttpRequest {
    headers: {
        "content-type": MimeType.TextCsv;
        /**
         * This is a CSV header
         * @example "cool,cool2"
         * @pattern ^[a-z]+,[a-z]+$
         * @minLength 5
         */
        "csv-header": string;
    };
    body: TestStringType;
}

type RoutePostInput = RoutePostInputJSON | RoutePostInputCSV;

/**
 * this is a comment
 */
interface RoutePostBodyInput {
    /**
     * This is a cool property
     * @minLength 5
     */
    cool: string;
}

/**
 * Amazing string
 * @pattern ^[a-z]+$
 * @minLength 5
 */
type TestStringType = Nominal<string, "TestStringType">;


declare class Tagged<N extends string> {
    protected _nominal_: N;
}

type Nominal<T, N extends string, E extends T & Tagged<string> = T & Tagged<N>> = (T & Tagged<N>) | E;

const basePath = "/basepath";


@Controller(basePath, "rest")
class TestController {
    /**
     * A simple get route
     * @summary Cool Route
     */
    @GetChain("/route")
    public getRoute(chain: Nornir<RouteGetInput>): Nornir<RouteGetInput, {statusCode: HttpStatusCode.Ok, body: string, headers: {"content-type": MimeType.TextPlain}}> {
        return chain
            .use(console.log)
            .use(() => ({
                statusCode: HttpStatusCode.Ok,
                body: `cool`,
                headers: {
                    "content-type": MimeType.TextPlain
                },
            }));
    }

    @GetChain("/route2")
    public getEmptyRoute(chain: Nornir<RouteGetInput>): Nornir<RouteGetInput, {statusCode: HttpStatusCode.Ok, headers: NonNullable<unknown>}> {
        return chain
            .use(() => {
                return {
                    statusCode: HttpStatusCode.Ok,
                    body: undefined,
                    headers: {},
                }
            });
    }

    @PostChain("/route")
    public postRoute(chain: Nornir<RoutePostInput>): Nornir<RoutePostInput, {statusCode: HttpStatusCode.Ok, body: string, headers: {"content-type": MimeType.TextPlain}}> {
        return chain
            .use(input => input.headers["content-type"])
            .use(contentType => ({
                statusCode: HttpStatusCode.Ok,
                body: `Content-Type: ${contentType}`,
                headers: {
                    "content-type": MimeType.TextPlain
                },
            } as const));
    }
}


const handler = nornir<HttpEvent>()
    .use(normalizeEventHeaders)
    .use(router("rest"))
    .build();

describe("REST tests", () => {
    describe("Valid requests", () => {
        it("Should process a basic GET request", async () => {
            const response = await handler({
                method: "GET",
                path: "/basepath/route",
                headers: {},
                query: {}
            });
            expect(response.statusCode).toEqual("200");
            expect(response.body).toBe("cool");
            expect(response.headers["content-type"]).toBe("text/plain");
        })

        it("Should process a basic POST request", async () => {
            const response = await handler({
                method: "POST",
                path: "/basepath/route",
                headers: {
                    "content-type": "application/json",
                },
                body: {
                    cool: "coolest"
                },
                query: {
                    test: "true"
                }
            });
            expect(response).toEqual({
                statusCode: "200",
                body: "Content-Type: application/json",
                headers: {
                    "content-type": "text/plain"
                }
            })
        })

        it("Should process a GET request with an empty body", async () => {
            const response = await handler({
                method: "GET",
                path: "/basepath/route2",
                headers: {},
                query: {}
            });
            expect(response).toEqual({
                statusCode: "200",
                body: undefined,
                headers: {
                }
            })
        })
    })

    describe("Invalid requests", () => {
        it("Should return a 404 for an invalid path", async () => {
            await expect(handler({
                method: "GET",
                path: "/basepath/invalid",
                headers: {
                    "content-type": "text/plain",
                },
                query: {}
            })).rejects.toBeInstanceOf(NornirRouteNotFoundError)
        })

        it("Should return a 422 for an invalid body", async () => {
            const request = {
                method: "POST",
                path: "/basepath/route",
                headers: {
                    "content-type": MimeType.ApplicationJson,
                },
                body: {
                    cool: "cool"
                },
                query: {
                    test: "true"
                }
            } as const;
            await expect(handler(request)).rejects.toMatchObject(new NornirRestRequestValidationError(
                {
                    ...request,
                    pathParams: {},
                },
                expect.arrayContaining([
                    {
                        instancePath: "/body/cool",
                        keyword: "minLength",
                        message: "must NOT have fewer than 5 characters",
                        params: {
                            limit: 5
                        },
                        schemaPath: "#/anyOf/0/properties/body/properties/cool/minLength"
                    },
                    {
                        instancePath: "",
                        keyword: "anyOf",
                        message: "must match a schema in anyOf",
                        params: {},
                        schemaPath: "#/anyOf"
                    }
                ])
            ));
        });
    });
});

