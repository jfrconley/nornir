import {
    Controller,
    GetChain,
    HttpEvent,
    HttpRequest,
    HttpRequestEmpty,
    HttpStatusCode,
    MimeType,
    normalizeEventHeaders,
    PostChain,
    router
} from "../../dist/runtime/index.mjs";
import {nornir, Nornir} from "@nornir/core";
import {describe} from "@jest/globals";

interface RouteGetInput extends HttpRequestEmpty {
    headers: {
        "content-type": MimeType.None;
    };
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
    public getRoute(chain: Nornir<RouteGetInput>) {
        return chain
            .use(input => input.headers["content-type"])
            .use(() => ({
                statusCode: HttpStatusCode.Ok,
                body: `cool`,
                headers: {
                    // eslint-disable-next-line sonarjs/no-duplicate-string
                    "content-type": "text/plain" as const,
                },
            }));
    }

    @PostChain("/route")
    public postRoute(chain: Nornir<RoutePostInput>) {
        return chain
            .use(input => input.headers["content-type"])
            .use(contentType => ({
                statusCode: HttpStatusCode.Ok,
                body: `Content-Type: ${contentType}`,
                headers: {
                    "content-type": "text/plain" as const,
                },
            }));
    }
}


const handler = nornir<HttpEvent>()
    .use(normalizeEventHeaders)
    .use(router(undefined, "rest"))
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
            expect(response.statusCode).toEqual(HttpStatusCode.Ok);
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
                statusCode: HttpStatusCode.Ok,
                body: "Content-Type: application/json",
                headers: {
                    "content-type": "text/plain"
                }
            })
        })
    })

    describe("Invalid requests", () => {
        it("Should return a 404 for an invalid path", async () => {
            const response = await handler({
                method: "GET",
                path: "/basepath/invalid",
                headers: {
                    "content-type": "text/plain",
                },
                query: {}
            });
            expect(response.statusCode).toEqual(HttpStatusCode.NotFound);
        })

        it("Should return a 422 for an invalid body", async () => {
            const response = await handler({
                method: "POST",
                path: "/basepath/route",
                headers: {
                    "content-type": "application/json",
                },
                body: {
                    cool: "cool"
                },
                query: {
                    test: "true"
                }
            });

            expect(response).toEqual({
                statusCode: HttpStatusCode.UnprocessableEntity,
                body: {
                    errors: expect.arrayContaining([
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
                },
                headers: {
                    "content-type": "application/json"
                }
            })
        });
    });
});

