import {OpenAPIV3_1} from "../../dist/runtime/index.mjs";
import {describe, expect} from "@jest/globals";
import {OpenAPIRouter} from "../../dist/runtime/openapi-router/openapi-router.mjs"
import {AttachmentRegistry} from "@nornir/core";

const TestSpec = {
    "openapi": "3.0.3",
    "info": {
        "title": "Nornir API",
        "version": "1.0.0"
    },
    "paths": {
        "/docs": {
            "get": {
                "responses": {
                    "200": {
                        "description": "",
                        "headers": {
                            "content-type": {
                                "required": true,
                                "deprecated": false,
                                "schema": {
                                    "type": "string",
                                    "const": "text/html"
                                }
                            }
                        },
                        "content": {
                            "text/html": {
                                "schema": {
                                    "type": "string"
                                }
                            }
                        }
                    }
                },
                "parameters": []
            }
        },
        "/openapi.json": {
            "get": {
                "responses": {
                    "200": {
                        "description": "",
                        "headers": {
                            "content-type": {
                                "required": true,
                                "deprecated": false,
                                "schema": {
                                    "type": "string",
                                    "const": "application/json"
                                }
                            }
                        },
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "additionalProperties": {}
                                }
                            }
                        }
                    }
                },
                "parameters": []
            }
        },
        "/root/basepath/route/{reallyCool}": {
            "get": {
                "description": "Cool get route",
                "responses": {
                    "200": {
                        "description": "This is a comment",
                        "headers": {
                            "content-type": {
                                "required": true,
                                "deprecated": false,
                                "schema": {
                                    "type": "string",
                                    "const": "application/json"
                                },
                            }
                        },
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "bleep": {
                                            "type": "string"
                                        },
                                        "bloop": {
                                            "type": "number"
                                        }
                                    },
                                    "required": [
                                        "bleep",
                                        "bloop"
                                    ],
                                    "additionalProperties": false
                                }
                            }
                        }
                    },
                    "201": {
                        "description": "This is a comment",
                        "headers": {
                            "content-type": {
                                "required": true,
                                "deprecated": false,
                                "schema": {
                                    "type": "string",
                                    "const": "application/json"
                                }
                            }
                        },
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "bleep": {
                                            "type": "string"
                                        },
                                        "bloop": {
                                            "type": "number"
                                        }
                                    },
                                    "required": [
                                        "bleep",
                                        "bloop"
                                    ],
                                    "additionalProperties": false
                                }
                            }
                        }
                    },
                    "400": {
                        "description": "This is a comment on RouteGetOutputError",
                        "headers": {
                            "content-type": {
                                "required": true,
                                "deprecated": false,
                                "schema": {
                                    "type": "string",
                                    "const": "application/json"
                                }
                            }
                        },
                        "content": {
                            "application/json": {}
                        }
                    }
                },
                "parameters": [
                    {
                        "name": "reallyCool",
                        "in": "path",
                        "required": true,
                        "deprecated": false,
                        "schema": {
                            "pattern": "^[a-z]+$",
                            "allOf": [
                                {
                                    "$ref": "#/components/schemas/TestStringType"
                                }
                            ]
                        }
                    }
                ]
            },
            "post": {
                "deprecated": true,
                "tags": [
                    "cool"
                ],
                "operationId": "coolRoute",
                "summary": "Cool Route",
                "description": "A simple post route",
                "responses": {
                    "200": {
                        "description": "",
                        "headers": {}
                    }
                },
                "requestBody": {
                    "required": true,
                    "content": {
                        "text/csv": {
                            "schema": {
                                "description": "This is a CSV body",
                                "examples": [
                                    "cool,cool2"
                                ],
                                "allOf": [
                                    {
                                        "$ref": "#/components/schemas/TestStringType"
                                    }
                                ]
                            }
                        },
                        "application/json": {
                            "example": {
                                "cool": "stuff"
                            },
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "cool": {
                                        "type": "string",
                                        "description": "This is a cool property",
                                        "minLength": 5
                                    }
                                },
                                "required": [
                                    "cool"
                                ],
                                "additionalProperties": false,
                                "description": "A cool json input",
                                "examples": [
                                    {
                                        "cool": "stuff"
                                    }
                                ]
                            }
                        },
                        "text/plain": {
                            "example": {
                                "cool": "stuff"
                            },
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "cool": {
                                        "type": "string",
                                        "description": "This is a cool property",
                                        "minLength": 5
                                    }
                                },
                                "required": [
                                    "cool"
                                ],
                                "additionalProperties": false,
                                "description": "A cool json input",
                                "examples": [
                                    {
                                        "cool": "stuff"
                                    }
                                ]
                            }
                        }
                    }
                },
                "parameters": [
                    {
                        "name": "reallyCool",
                        "in": "path",
                        "required": true,
                        "description": "Very cool property that does a thing",
                        "example": "true",
                        "deprecated": false,
                        "schema": {
                            "anyOf": [
                                {
                                    "deprecated": true,
                                    "allOf": [
                                        {
                                            "$ref": "#/components/schemas/TestStringType"
                                        }
                                    ]
                                },
                                {
                                    "type": "string",
                                    "enum": [
                                        "true",
                                        "false"
                                    ],
                                    "description": "Very cool property that does a thing",
                                    "examples": [
                                        "true"
                                    ],
                                    "pattern": "^[a-z]+$"
                                }
                            ]
                        }
                    },
                    {
                        "name": "evenCooler",
                        "in": "path",
                        "required": false,
                        "description": "Even cooler property",
                        "deprecated": false,
                        "schema": {
                            "type": "number",
                            "description": "Even cooler property"
                        }
                    },
                    {
                        "name": "test",
                        "in": "query",
                        "required": false,
                        "deprecated": false,
                        "schema": {
                            "type": "string",
                            "const": "boolean"
                        }
                    },
                    // {
                    //     "name": "content-type",
                    //     "in": "header",
                    //     "required": true,
                    //     "deprecated": false,
                    //     "schema": {
                    //         "anyOf": [
                    //             {
                    //                 "type": "string",
                    //                 "const": "text/csv"
                    //             },
                    //             {
                    //                 "type": "string",
                    //                 "const": "application/json"
                    //             },
                    //             {
                    //                 "type": "string",
                    //                 "const": "text/plain"
                    //             }
                    //         ]
                    //     }
                    // },
                    {
                        "name": "csv-header",
                        "in": "header",
                        "required": false,
                        "description": "This is a CSV header",
                        "example": "cool,cool2",
                        "deprecated": false,
                        "schema": {
                            "type": "string",
                            "description": "This is a CSV header",
                            "examples": [
                                "cool,cool2"
                            ],
                            "pattern": "^[a-z]+,[a-z]+$",
                            "minLength": 5
                        }
                    }
                ]
            }
        }
    },
    "components": {
        "schemas": {
            "HttpHeadersWithoutContentType": {
                "type": "object",
                "additionalProperties": {
                    "type": [
                        "number",
                        "string"
                    ]
                },
                "properties": {
                    "content-type": {}
                }
            },
            "TestStringType": {
                "description": "Amazing string",
                "pattern": "^[a-z]+$",
                "minLength": 5,
                "allOf": [
                    {
                        "$ref": "#/components/schemas/Nominal<string,\"TestStringType\">"
                    }
                ]
            },
            "Nominal<string,\"TestStringType\">": {
                "type":
                    "string",
                "description": "Constructs a nominal type of type `T`. Useful to prevent any value of type `T` from being used or modified in places it shouldn't (think `id`s)."
            },
            "RouteGetOutputSuccess": {
                "type": "object",
                "properties": {
                    "statusCode": {
                        "type": "string",
                        "enum": [
                            "200",
                            "201"
                        ],
                        "description": "This is a property"
                    },
                    "headers": {
                        "type": "object",
                        "properties": {
                            "content-type": {
                                "type": "string",
                                "const": "application/json"
                            }
                        },
                        "required": [
                            "content-type"
                        ],
                        "additionalProperties": false
                    },
                    "body": {
                        "type": "object",
                        "properties": {
                            "bleep": {
                                "type": "string"
                            },
                            "bloop": {
                                "type": "number"
                            }
                        },
                        "required": [
                            "bleep",
                            "bloop"
                        ],
                        "additionalProperties": false
                    }
                },
                "required": [
                    "body",
                    "headers",
                    "statusCode"
                ],
                "additionalProperties": false,
                "description": "This is a comment"
            },
            "RouteGetOutputError": {
                "type": "object",
                "properties": {
                    "statusCode": {
                        "type": "string",
                        "const": "400"
                    },
                    "headers": {
                        "type": "object",
                        "properties": {
                            "content-type": {
                                "type": "string",
                                "const": "application/json"
                            }
                        },
                        "required": [
                            "content-type"
                        ],
                        "additionalProperties": false
                    },
                    "body": {}
                },
                "required": [
                    "headers",
                    "statusCode"
                ],
                "additionalProperties": false,
                "description": "This is a comment on RouteGetOutputError"
            },
            "RoutePostInputJSONAlias": {
                "type": "object",
                "properties": {
                    "headers": {
                        "anyOf": [
                            {
                                "type": "object",
                                "properties": {
                                    "content-type": {
                                        "type": "string",
                                        "const": "application/json"
                                    }
                                },
                                "required": [
                                    "content-type"
                                ],
                                "additionalProperties": false
                            },
                            {
                                "type": "object",
                                "properties": {
                                    "content-type": {
                                        "type": "string",
                                        "const": "text/plain"
                                    }
                                },
                                "required": [
                                    "content-type"
                                ],
                                "additionalProperties": false
                            }
                        ]
                    },
                    "query": {
                        "type": "object",
                        "properties": {
                            "test": {
                                "type": "string",
                                "const": "boolean"
                            }
                        },
                        "required": [
                            "test"
                        ],
                        "additionalProperties": false
                    },
                    "body": {
                        "type": "object",
                        "properties": {
                            "cool": {
                                "type": "string",
                                "description": "This is a cool property",
                                "minLength": 5
                            }
                        },
                        "required": [
                            "cool"
                        ],
                        "additionalProperties": false,
                        "description": "A cool json input",
                        "examples": [
                            {
                                "cool": "stuff"
                            }
                        ]
                    },
                    "pathParams": {
                        "type": "object",
                        "properties": {
                            "reallyCool": {
                                "type": "string",
                                "enum": [
                                    "true",
                                    "false"
                                ],
                                "description": "Very cool property that does a thing",
                                "examples": [
                                    "true"
                                ],
                                "pattern": "^[a-z]+$"
                            },
                            "evenCooler": {
                                "type": "number",
                                "description": "Even cooler property"
                            }
                        },
                        "required": [
                            "reallyCool"
                        ],
                        "additionalProperties": false
                    }
                },
                "required": [
                    "body",
                    "headers",
                    "pathParams",
                    "query"
                ],
                "additionalProperties": false
            }
        },
        "parameters": {}
    }
} as const satisfies OpenAPIV3_1.Document;

describe("OpenAPI Router", () => {
    it("Should process a basic request", async () => {
        const router = OpenAPIRouter.fromSpec(TestSpec);

        router.implementRoute("/root/basepath/route/{reallyCool}", "post", chain =>
            chain.use(request => {

                return {
                    statusCode: "200",
                    headers: {
                        reallyCool: request.pathParams.reallyCool
                    }
                } as const
            })
        )

        const chain = router.build();

        const response = await chain({
            method: "POST",
            path: "/root/basepath/route/true",
            headers: {
                "content-type": "application/json"
            },
            query: {},
            body: {
                cool: "truess"
            }
        }, new AttachmentRegistry())

        expect(response).toMatchObject({
            statusCode: "200",
            headers: {
                reallyCool: "true"
            }
        })
    })

    it("Should not process an invalid request", async () => {
        const router = OpenAPIRouter.fromSpec(TestSpec);
        router.implementRoute("/root/basepath/route/{reallyCool}", "post", chain =>
            chain.use(request => {
                return {
                    statusCode: "200",
                    headers: {
                        reallyCool: request.pathParams.reallyCool
                    }
                } as const
            })
        )

        const chain = router.build();

        await expect(chain({
            method: "POST",
            path: "/root/basepath/route/true",
            headers: {
                "content-type": "application/json"
            },
            query: {},
            body: {
                cool: "tr"
            }
        }, new AttachmentRegistry())).rejects.toMatchObject({
            errors: [
                {
                    instancePath: "/contentType",
                    keyword: "const",
                    message: "must be equal to constant",
                    params: {
                        allowedValue: "text/csv"
                    },
                    schemaPath: "#/anyOf/0/properties/contentType/const"
                },
                {
                    instancePath: "/body",
                    keyword: "type",
                    message: "must be string",
                    params: {
                        type: "string"
                    },
                    schemaPath: "#/anyOf/0/properties/body/allOf/0/allOf/0/type"
                },
                {
                    instancePath: "/body/cool",
                    keyword: "minLength",
                    message: "must NOT have fewer than 5 characters",
                    params: {
                        limit: 5
                    },
                    schemaPath: "#/anyOf/1/properties/body/properties/cool/minLength"
                },
                {
                    instancePath: "/contentType",
                    keyword: "const",
                    message: "must be equal to constant",
                    params: {
                        allowedValue: "text/plain"
                    },
                    schemaPath: "#/anyOf/2/properties/contentType/const"
                },
                {
                    instancePath: "/body/cool",
                    keyword: "minLength",
                    message: "must NOT have fewer than 5 characters",
                    params: {
                        limit: 5
                    },
                    schemaPath: "#/anyOf/2/properties/body/properties/cool/minLength"
                },
                {
                    instancePath: "",
                    keyword: "anyOf",
                    message: "must match a schema in anyOf",
                    params: {},
                    schemaPath: "#/anyOf"
                }
            ]
        })
    })

    it("Should support merging routers", async () => {
        const router1 = OpenAPIRouter.fromSpec(TestSpec);
        router1.implementRoute("/root/basepath/route/{reallyCool}", "post", chain =>
            chain.use(request => {
                return {
                    statusCode: "200",
                    headers: {
                        reallyCool: request.pathParams.reallyCool
                    }
                } as const
            })
        )

        const router2 = OpenAPIRouter.fromSpec(TestSpec);

        router2.implementRoute("/root/basepath/route/{reallyCool}", "get", chain =>
            chain.use(_request => {
                return {
                    statusCode: "200",
                    headers: {
                        "content-type": "application/json"
                    },
                    body: {
                        bleep: "bleep",
                        bloop: 5
                    },
                    contentType: "application/json"
                } as const
            })
        )

        const chain = OpenAPIRouter.merge(TestSpec, router1, router2).build();

        await expect(chain({
            method: "POST",
            path: "/root/basepath/route/true",
            headers: {
                "content-type": "application/json"
            },
            query: {},
            body: {
                cool: "truess"
            }
        }, new AttachmentRegistry())).resolves.toMatchObject({
            statusCode: "200",
            headers: {
                reallyCool: "true"
            }
        })

        await expect(chain({
            method: "GET",
            path: "/root/basepath/route/trues",
            headers: {},
            query: {},
            body: {},
        }, new AttachmentRegistry())).resolves.toMatchObject({
            statusCode: "200",
            headers: {
                "content-type": "application/json"
            },
            body: {
                bleep: "bleep",
                bloop: 5
            }
        })
    })

    it("Should not allow implementing the same route twice", () => {
        const router = OpenAPIRouter.fromSpec(TestSpec);

        router.implementRoute("/root/basepath/route/{reallyCool}", "post", chain =>
            chain.use(request => {
                return {
                    statusCode: "200",
                    headers: {
                        reallyCool: request.pathParams.reallyCool
                    }
                } as const
            })
        )

        router.implementRoute("/root/basepath/route/{reallyCool}", "post", chain =>
            chain.use(request => {
                return {
                    statusCode: "200",
                    headers: {
                        reallyCool: request.pathParams.reallyCool
                    }
                } as const
            })
        )

        expect(() => router.build()).toThrow("Route POST:/root/basepath/route/{reallyCool} is implemented more than once")
    })

    it("Should not allow implementing the same route more than once with merge", () => {
        const router1 = OpenAPIRouter.fromSpec(TestSpec);
        router1.implementRoute("/root/basepath/route/{reallyCool}", "post", chain =>
            chain.use(request => {
                return {
                    statusCode: "200",
                    headers: {
                        reallyCool: request.pathParams.reallyCool
                    }
                } as const
            })
        )

        const router2 = OpenAPIRouter.fromSpec(TestSpec);
        router2.implementRoute("/root/basepath/route/{reallyCool}", "post", chain =>
            chain.use(request => {
                return {
                    statusCode: "200",
                    headers: {
                        reallyCool: request.pathParams.reallyCool
                    }
                } as const
            })
        )

        expect(() => OpenAPIRouter.merge(TestSpec, router1, router2).build())
            .toThrow("Route POST:/root/basepath/route/{reallyCool} is implemented more than once")
    })

    it("Should process a basic request with implementRouteFn", async () => {
        const router = OpenAPIRouter.fromSpec(TestSpec);

        router.implementRouteFn("/root/basepath/route/{reallyCool}", "post", (request, _registry) => {
            return {
                statusCode: "200",
                headers: {
                    reallyCool: request.pathParams.reallyCool,
                },
            } as const
        })

        const chain = router.build();

        const response = await chain({
            method: "POST",
            path: "/root/basepath/route/true",
            headers: {
                "content-type": "application/json",
            },
            query: {},
            body: {
                cool: "truess",
            },
        }, new AttachmentRegistry())

        expect(response).toMatchObject({
            statusCode: "200",
            headers: {
                reallyCool: "true",
            },
        })
    })

    it("Should not process an invalid request with implementRouteFn", async () => {
        const router = OpenAPIRouter.fromSpec(TestSpec);
        router.implementRouteFn("/root/basepath/route/{reallyCool}", "post", (request, _registry) => {
            return {
                statusCode: "200",
                headers: {
                    reallyCool: request.pathParams.reallyCool,
                },
            } as const
        })

        const chain = router.build();

        await expect(chain({
            method: "POST",
            path: "/root/basepath/route/true",
            headers: {
                "content-type": "application/json",
            },
            query: {},
            body: {
                cool: "tr",
            },
        }, new AttachmentRegistry())).rejects.toMatchObject({
            errors: expect.arrayContaining([
                expect.objectContaining({
                    instancePath: "/body/cool",
                    keyword: "minLength",
                }),
            ]),
        })
    })

    it("Should pass the attachment registry to implementRouteFn handler", async () => {
        const router = OpenAPIRouter.fromSpec(TestSpec);
        const key = AttachmentRegistry.createKey<string>();

        router.implementRouteFn("/root/basepath/route/{reallyCool}", "post", (request, registry) => {
            registry.put(key, "set-by-handler")
            return {
                statusCode: "200",
                headers: {
                    reallyCool: request.pathParams.reallyCool,
                },
            } as const
        })

        const chain = router.build();
        const registry = new AttachmentRegistry();

        await chain({
            method: "POST",
            path: "/root/basepath/route/true",
            headers: {
                "content-type": "application/json",
            },
            query: {},
            body: {
                cool: "truess",
            },
        }, registry)

        expect(registry.get(key)).toBe("set-by-handler")
    })

    it("Should support implementRouteFn with merge", async () => {
        const router1 = OpenAPIRouter.fromSpec(TestSpec);
        router1.implementRouteFn("/root/basepath/route/{reallyCool}", "post", (request, _registry) => {
            return {
                statusCode: "200",
                headers: {
                    reallyCool: request.pathParams.reallyCool,
                },
            } as const
        })

        const router2 = OpenAPIRouter.fromSpec(TestSpec);
        router2.implementRouteFn("/root/basepath/route/{reallyCool}", "get", (_request, _registry) => {
            return {
                statusCode: "200",
                headers: {
                    "content-type": "application/json",
                },
                body: {
                    bleep: "bleep",
                    bloop: 5,
                },
                contentType: "application/json",
            } as const
        })

        const chain = OpenAPIRouter.merge(TestSpec, router1, router2).build();

        await expect(chain({
            method: "POST",
            path: "/root/basepath/route/true",
            headers: {
                "content-type": "application/json",
            },
            query: {},
            body: {
                cool: "truess",
            },
        }, new AttachmentRegistry())).resolves.toMatchObject({
            statusCode: "200",
            headers: {
                reallyCool: "true",
            },
        })

        await expect(chain({
            method: "GET",
            path: "/root/basepath/route/trues",
            headers: {},
            query: {},
            body: {},
        }, new AttachmentRegistry())).resolves.toMatchObject({
            statusCode: "200",
            headers: {
                "content-type": "application/json",
            },
            body: {
                bleep: "bleep",
                bloop: 5,
            },
        })
    })

    it("Should process a basic request with an async implementRouteFn handler", async () => {
        const router = OpenAPIRouter.fromSpec(TestSpec);

        router.implementRouteFn("/root/basepath/route/{reallyCool}", "post", async (request, _registry) => {
            await new Promise(resolve => setImmediate(resolve));
            return {
                statusCode: "200",
                headers: {
                    reallyCool: request.pathParams.reallyCool,
                },
            } as const
        })

        const chain = router.build();

        const response = await chain({
            method: "POST",
            path: "/root/basepath/route/true",
            headers: {
                "content-type": "application/json",
            },
            query: {},
            body: {
                cool: "truess",
            },
        }, new AttachmentRegistry())

        expect(response).toMatchObject({
            statusCode: "200",
            headers: {
                reallyCool: "true",
            },
        })
    })

    it("Should surface errors thrown from an async implementRouteFn handler", async () => {
        const router = OpenAPIRouter.fromSpec(TestSpec);

        router.implementRouteFn("/root/basepath/route/{reallyCool}", "post", async (_request, _registry) => {
            await new Promise(resolve => setImmediate(resolve));
            throw new Error("async handler boom");
        })

        const chain = router.build();

        await expect(chain({
            method: "POST",
            path: "/root/basepath/route/true",
            headers: {
                "content-type": "application/json",
            },
            query: {},
            body: {
                cool: "truess",
            },
        }, new AttachmentRegistry())).rejects.toThrow("async handler boom")
    })

    it("Should await an async implementRouteFn handler before returning", async () => {
        const router = OpenAPIRouter.fromSpec(TestSpec);
        let completed = false;

        router.implementRouteFn("/root/basepath/route/{reallyCool}", "post", async (request, _registry) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            completed = true;
            return {
                statusCode: "200",
                headers: {
                    reallyCool: request.pathParams.reallyCool,
                },
            } as const
        })

        const chain = router.build();

        const responsePromise = chain({
            method: "POST",
            path: "/root/basepath/route/true",
            headers: {
                "content-type": "application/json",
            },
            query: {},
            body: {
                cool: "truess",
            },
        }, new AttachmentRegistry())

        expect(completed).toBe(false);
        await responsePromise;
        expect(completed).toBe(true);
    })

    it("Should support async implementRouteFn handlers across merged routers", async () => {
        const router1 = OpenAPIRouter.fromSpec(TestSpec);
        router1.implementRouteFn("/root/basepath/route/{reallyCool}", "post", async (request, _registry) => {
            await new Promise(resolve => setImmediate(resolve));
            return {
                statusCode: "200",
                headers: {
                    reallyCool: request.pathParams.reallyCool,
                },
            } as const
        })

        const router2 = OpenAPIRouter.fromSpec(TestSpec);
        router2.implementRouteFn("/root/basepath/route/{reallyCool}", "get", async (_request, _registry) => {
            await new Promise(resolve => setImmediate(resolve));
            return {
                statusCode: "200",
                headers: {
                    "content-type": "application/json",
                },
                body: {
                    bleep: "bleep",
                    bloop: 5,
                },
                contentType: "application/json",
            } as const
        })

        const chain = OpenAPIRouter.merge(TestSpec, router1, router2).build();

        await expect(chain({
            method: "GET",
            path: "/root/basepath/route/trues",
            headers: {},
            query: {},
            body: {},
        }, new AttachmentRegistry())).resolves.toMatchObject({
            statusCode: "200",
            body: {
                bleep: "bleep",
                bloop: 5,
            },
        })
    })

    it("Should not allow implementing the same route twice with implementRouteFn", () => {
        const router = OpenAPIRouter.fromSpec(TestSpec);

        router.implementRouteFn("/root/basepath/route/{reallyCool}", "post", (request, _registry) => {
            return {
                statusCode: "200",
                headers: {
                    reallyCool: request.pathParams.reallyCool,
                },
            } as const
        })

        router.implementRouteFn("/root/basepath/route/{reallyCool}", "post", (request, _registry) => {
            return {
                statusCode: "200",
                headers: {
                    reallyCool: request.pathParams.reallyCool,
                },
            } as const
        })

        expect(() => router.build())
            .toThrow("Route POST:/root/basepath/route/{reallyCool} is implemented more than once")
    })

    // This test never executes its body — it exists purely so the TypeScript
    // compiler asserts that improper handler responses, paths, and methods
    // are rejected via @ts-expect-error directives. If any expected error
    // disappears, compilation will fail.
    it.skip("Should typecheck handler responses for implementRouteFn", () => {
        const router = OpenAPIRouter.fromSpec(TestSpec);

        // Sanity check: a fully valid GET 200 response compiles with no errors.
        router.implementRouteFn("/root/basepath/route/{reallyCool}", "get", (_request, _registry) => {
            return {
                statusCode: "200",
                headers: {
                    "content-type": "application/json",
                },
                body: {
                    bleep: "bleep",
                    bloop: 5,
                },
                contentType: "application/json",
            } as const
        })

        // Sanity check: a valid POST 200 response compiles with no errors.
        router.implementRouteFn("/root/basepath/route/{reallyCool}", "post", (_request, _registry) => {
            return {
                statusCode: "200",
                headers: {},
            } as const
        })

        // @ts-expect-error - statusCode "999" is not declared in the spec
        router.implementRouteFn("/root/basepath/route/{reallyCool}", "post", (_request, _registry) => {
            return {
                statusCode: "999",
                headers: {},
            } as const
        })

        // @ts-expect-error - bloop must be a number per the spec schema
        router.implementRouteFn("/root/basepath/route/{reallyCool}", "get", (_request, _registry) => {
            return {
                statusCode: "200",
                headers: {
                    "content-type": "application/json",
                },
                body: {
                    bleep: "bleep",
                    bloop: "not-a-number",
                },
                contentType: "application/json",
            } as const
        })

        // @ts-expect-error - GET 200 requires a body, omitting it is invalid
        router.implementRouteFn("/root/basepath/route/{reallyCool}", "get", (_request, _registry) => {
            return {
                statusCode: "200",
                headers: {
                    "content-type": "application/json",
                },
                contentType: "application/json",
            } as const
        })

        // @ts-expect-error - content-type response header must be "application/json"
        router.implementRouteFn("/root/basepath/route/{reallyCool}", "get", (_request, _registry) => {
            return {
                statusCode: "200",
                headers: {
                    "content-type": "text/plain",
                },
                body: {
                    bleep: "bleep",
                    bloop: 5,
                },
                contentType: "application/json",
            } as const
        })

        // @ts-expect-error - contentType discriminator must be "application/json"
        router.implementRouteFn("/root/basepath/route/{reallyCool}", "get", (_request, _registry) => {
            return {
                statusCode: "200",
                headers: {
                    "content-type": "application/json",
                },
                body: {
                    bleep: "bleep",
                    bloop: 5,
                },
                contentType: "text/plain",
            } as const
        })

        // @ts-expect-error - "/nonexistent/path" is not a path in the spec
        router.implementRouteFn("/nonexistent/path", "get", (_request, _registry) => {
            return {
                statusCode: "200",
                headers: {},
            } as const
        })

        // @ts-expect-error - "patch" is not declared on this path in the spec
        router.implementRouteFn("/root/basepath/route/{reallyCool}", "patch", (_request, _registry) => {
            return {
                statusCode: "200",
                headers: {},
            } as const
        })

        // Request type narrowing: pathParams.reallyCool exists, foo does not.
        router.implementRouteFn("/root/basepath/route/{reallyCool}", "post", (request, _registry) => {
            // @ts-expect-error - "foo" is not a declared path parameter
            const _foo: string = request.pathParams.foo
            return {
                statusCode: "200",
                headers: {
                    reallyCool: request.pathParams.reallyCool,
                },
            } as const
        })

        // Sanity check: a valid async handler compiles.
        router.implementRouteFn("/root/basepath/route/{reallyCool}", "post", async (request, _registry) => {
            return {
                statusCode: "200",
                headers: {
                    reallyCool: request.pathParams.reallyCool,
                },
            } as const
        })

        // @ts-expect-error - async handler returning an invalid statusCode is also rejected
        router.implementRouteFn("/root/basepath/route/{reallyCool}", "post", async (_request, _registry) => {
            return {
                statusCode: "999",
                headers: {},
            } as const
        })
    })
})
