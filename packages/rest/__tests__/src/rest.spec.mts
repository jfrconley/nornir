import router, {
    Controller,
    GetChain,
    HttpEvent,
    HttpRequest,
    HttpRequestEmpty,
    HttpResponse,
    HttpStatusCode,
    PostChain
} from "../../dist/runtime/index.mjs";
import {nornir, Nornir} from "@nornir/core";

interface RouteGetInput extends HttpRequestEmpty {
    headers: {
        // eslint-disable-next-line sonarjs/no-duplicate-string
        "content-type": "text/plain";
    };
}

interface RoutePostInputJSON extends HttpRequest {
    headers: {
        "content-type": "application/json";
    };
    body: RoutePostBodyInput;
    query: {
        test: "boolean";
    };
}

interface RoutePostInputCSV extends HttpRequest {
    headers: {
        "content-type": "text/csv";
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


@Controller(basePath)
class TestController {
    /**
     * A simple get route
     * @summary Cool Route
     */
    @GetChain("/route")
    public getRoute(chain: Nornir<RouteGetInput>) {
        return chain
            .use(input => input.headers["content-type"])
            .use(contentType => ({
                statusCode: HttpStatusCode.Ok,
                body: `Content-Type: ${contentType}`,
                headers: {
                    // eslint-disable-next-line sonarjs/no-duplicate-string
                    "content-type": "text/plain" as const,
                },
            }));
    }

    @PostChain("/route")
    public postRoute(chain: Nornir<RoutePostInput>) {
        return chain
            .use(contentType => ({
                statusCode: HttpStatusCode.Ok,
                body: `Content-Type: ${contentType}`,
                headers: {
                    "content-type": "text/plain" as const,
                },
            }));
    }
}


const handler: (event: HttpEvent) => Promise<HttpResponse> = nornir<HttpEvent>()
    .use(router())
    .build();

describe("REST tests", () => {
    describe("Valid requests", () => {
        it("Should process a basic GET request", async () => {
            const response = await handler({
                method: "GET",
                path: "/basepath/route",
                headers: {
                    "content-type": "text/plain",
                },
                query: {}
            });
            expect(response.statusCode).toEqual(HttpStatusCode.Ok);
            expect(response.body).toBe("Content-Type: text/plain");
            expect(response.headers["content-type"]).toBe("text/plain");
        })
    })
});

