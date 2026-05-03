import {describe, expect, it} from "@jest/globals";
import express from "express";
import request from "supertest";
import {Express, expressMiddleware, OpenAPIRouter, OpenAPIV3_1} from "../../dist/runtime/index.mjs";

const TestSpec = {
    openapi: "3.0.3",
    info: {title: "Test", version: "1.0.0"},
    paths: {
        "/echo/{id}": {
            post: {
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: {type: "string"}
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {type: "string", minLength: 1}
                                },
                                required: ["message"],
                                additionalProperties: false
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "echo",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        id: {type: "string"},
                                        message: {type: "string"}
                                    },
                                    required: ["id", "message"]
                                }
                            }
                        }
                    }
                }
            }
        }
    }
} as const satisfies OpenAPIV3_1.Document;

function makeRouter() {
    const router = OpenAPIRouter.fromSpec(TestSpec);
    router.implementRoute("/echo/{id}", "post", chain =>
        chain.use(req => {
            // if (req.contentType !== "application/json") throw new Error("unexpected content type");
            return {
                statusCode: "200",
                contentType: "application/json",
                headers: {
                },
                body: {
                    id: req.pathParams.id,
                    message: req.body.message
                }
            } as const;
        })
    );
    return router;
}

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use(expressMiddleware(makeRouter()));
    return app;
}

describe("Express middleware", () => {
    it("processes a matching request", async () => {
        const res = await request(makeApp())
            .post("/echo/abc?ignored=1")
            .send({message: "hello"});

        expect(res.status).toBe(200);
        expect(res.body).toEqual({id: "abc", message: "hello"});
        expect(res.headers["content-type"]).toMatch(/^application\/json/);
    });

    it("returns 422 for a request that fails validation", async () => {
        const res = await request(makeApp())
            .post("/echo/abc")
            .send({message: ""});

        expect(res.status).toBe(422);
        expect(res.body.errors).toEqual(expect.arrayContaining([
            expect.objectContaining({keyword: "minLength"})
        ]));
    });

    it("returns 404 when no route matches", async () => {
        const res = await request(makeApp())
            .get("/missing");

        expect(res.status).toBe(404);
    });

    it("exposes the underlying req/res via the registry", async () => {
        const router = OpenAPIRouter.fromSpec(TestSpec);
        let observedReq: unknown;
        let observedRes: unknown;
        router.implementRoute("/echo/{id}", "post", chain =>
            chain.use((req, registry) => {
                observedReq = registry.getAssert(Express.ExpressRequestKey);
                observedRes = registry.getAssert(Express.ExpressResponseKey);
                return {
                    statusCode: "200",
                    contentType: "application/json",
                    headers: {},
                    body: {id: req.pathParams.id, message: req.body.message}
                } as const;
            })
        );

        const app = express();
        app.use(express.json());
        app.use(expressMiddleware(router));

        const res = await request(app)
            .post("/echo/xyz")
            .send({message: "ping"});

        expect(res.status).toBe(200);
        expect(observedReq).toBeDefined();
        expect(observedRes).toBeDefined();
        expect((observedReq as express.Request).path).toBe("/echo/xyz");
    });
});