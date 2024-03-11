import { OpenAPIV3_1 } from "@nornir/rest";

const Spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Nornir API",
    "version": "1.0.0",
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
                  "const": "text/html",
                },
              },
            },
            "content": {
              "text/html": {
                "schema": {
                  "type": "string",
                },
              },
            },
          },
        },
        "parameters": [],
      },
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
                  "const": "application/json",
                },
              },
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": {},
                },
              },
            },
          },
        },
        "parameters": [],
      },
    },
    "/root/basepath/route/{cool}": {
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
                  "const": "application/json",
                },
              },
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "bleep": {
                      "type": "string",
                    },
                    "bloop": {
                      "type": "number",
                    },
                  },
                  "required": [
                    "bleep",
                    "bloop",
                  ],
                  "additionalProperties": false,
                },
              },
            },
          },
          "201": {
            "description": "This is a comment",
            "headers": {
              "content-type": {
                "required": true,
                "deprecated": false,
                "schema": {
                  "type": "string",
                  "const": "application/json",
                },
              },
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "bleep": {
                      "type": "string",
                    },
                    "bloop": {
                      "type": "number",
                    },
                  },
                  "required": [
                    "bleep",
                    "bloop",
                  ],
                  "additionalProperties": false,
                },
              },
            },
          },
          "400": {
            "description": "This is a comment on RouteGetOutputError",
            "headers": {
              "content-type": {
                "required": true,
                "deprecated": false,
                "schema": {
                  "type": "string",
                  "const": "application/json",
                },
              },
            },
            "content": {
              "application/json": {},
            },
          },
        },
        "parameters": [
          {
            "name": "cool",
            "in": "path",
            "required": true,
            "deprecated": false,
            "schema": {
              "pattern": "^[a-z]+$",
              "allOf": [
                {
                  "$ref": "#/components/schemas/TestStringType",
                },
              ],
            },
          },
        ],
      },
      "post": {
        "deprecated": true,
        "tags": [
          "cool",
        ],
        "operationId": "coolRoute",
        "summary": "Cool Route",
        "description": "A simple post route",
        "responses": {
          "200": {
            "description": "",
            "headers": {},
          },
        },
        "requestBody": {
          "required": true,
          "content": {
            "text/csv": {
              "schema": {
                "description": "This is a CSV body",
                "examples": [
                  "cool,cool2",
                ],
                "allOf": [
                  {
                    "$ref": "#/components/schemas/TestStringType",
                  },
                ],
              },
            },
            "application/json": {
              "example": {
                "cool": "stuff",
              },
              "schema": {
                "type": "object",
                "properties": {
                  "cool": {
                    "type": "string",
                    "description": "This is a cool property",
                    "minLength": 5,
                  },
                },
                "required": [
                  "cool",
                ],
                "additionalProperties": false,
                "description": "A cool json input",
                "examples": [
                  {
                    "cool": "stuff",
                  },
                ],
              },
            },
            "text/plain": {
              "example": {
                "cool": "stuff",
              },
              "schema": {
                "type": "object",
                "properties": {
                  "cool": {
                    "type": "string",
                    "description": "This is a cool property",
                    "minLength": 5,
                  },
                },
                "required": [
                  "cool",
                ],
                "additionalProperties": false,
                "description": "A cool json input",
                "examples": [
                  {
                    "cool": "stuff",
                  },
                ],
              },
            },
          },
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
                      "$ref": "#/components/schemas/TestStringType",
                    },
                  ],
                },
                {
                  "type": "string",
                  "enum": [
                    "true",
                    "false",
                  ],
                  "description": "Very cool property that does a thing",
                  "examples": [
                    "true",
                  ],
                  "pattern": "^[a-z]+$",
                },
              ],
            },
          },
          {
            "name": "evenCooler",
            "in": "path",
            "required": false,
            "description": "Even cooler property",
            "deprecated": false,
            "schema": {
              "type": "number",
              "description": "Even cooler property",
            },
          },
          {
            "name": "test",
            "in": "query",
            "required": false,
            "deprecated": false,
            "schema": {
              "type": "string",
              "const": "boolean",
            },
          },
          {
            "name": "content-type",
            "in": "header",
            "required": true,
            "deprecated": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string",
                  "const": "text/csv",
                },
                {
                  "type": "string",
                  "const": "application/json",
                },
                {
                  "type": "string",
                  "const": "text/plain",
                },
              ],
            },
          },
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
                "cool,cool2",
              ],
              "pattern": "^[a-z]+,[a-z]+$",
              "minLength": 5,
            },
          },
        ],
      },
    },
  },
  "components": {
    "schemas": {
      "HttpHeadersWithoutContentType": {
        "type": "object",
        "additionalProperties": {
          "type": [
            "number",
            "string",
          ],
        },
        "properties": {
          "content-type": {},
        },
      },
      "TestStringType": {
        "description": "Amazing string",
        "pattern": "^[a-z]+$",
        "minLength": 5,
        "allOf": [
          {
            "$ref": "#/components/schemas/Nominal<string,\"TestStringType\">",
          },
        ],
      },
      "Nominal<string,\"TestStringType\">": {
        "type": [
          "string",
        ],
        "description":
          "Constructs a nominal type of type `T`. Useful to prevent any value of type `T` from being used or modified in places it shouldn't (think `id`s).",
      },
      "RouteGetOutputSuccess": {
        "type": "object",
        "properties": {
          "statusCode": {
            "type": "string",
            "enum": [
              "200",
              "201",
            ],
            "description": "This is a property",
          },
          "headers": {
            "type": "object",
            "properties": {
              "content-type": {
                "type": "string",
                "const": "application/json",
              },
            },
            "required": [
              "content-type",
            ],
            "additionalProperties": false,
          },
          "body": {
            "type": "object",
            "properties": {
              "bleep": {
                "type": "string",
              },
              "bloop": {
                "type": "number",
              },
            },
            "required": [
              "bleep",
              "bloop",
            ],
            "additionalProperties": false,
          },
        },
        "required": [
          "body",
          "headers",
          "statusCode",
        ],
        "additionalProperties": false,
        "description": "This is a comment",
      },
      "RouteGetOutputError": {
        "type": "object",
        "properties": {
          "statusCode": {
            "type": "string",
            "const": "400",
          },
          "headers": {
            "type": "object",
            "properties": {
              "content-type": {
                "type": "string",
                "const": "application/json",
              },
            },
            "required": [
              "content-type",
            ],
            "additionalProperties": false,
          },
          "body": {},
        },
        "required": [
          "headers",
          "statusCode",
        ],
        "additionalProperties": false,
        "description": "This is a comment on RouteGetOutputError",
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
                    "const": "application/json",
                  },
                },
                "required": [
                  "content-type",
                ],
                "additionalProperties": false,
              },
              {
                "type": "object",
                "properties": {
                  "content-type": {
                    "type": "string",
                    "const": "text/plain",
                  },
                },
                "required": [
                  "content-type",
                ],
                "additionalProperties": false,
              },
            ],
          },
          "query": {
            "type": "object",
            "properties": {
              "test": {
                "type": "string",
                "const": "boolean",
              },
            },
            "required": [
              "test",
            ],
            "additionalProperties": false,
          },
          "body": {
            "type": "object",
            "properties": {
              "cool": {
                "type": "string",
                "description": "This is a cool property",
                "minLength": 5,
              },
            },
            "required": [
              "cool",
            ],
            "additionalProperties": false,
            "description": "A cool json input",
            "examples": [
              {
                "cool": "stuff",
              },
            ],
          },
          "pathParams": {
            "type": "object",
            "properties": {
              "reallyCool": {
                "type": "string",
                "enum": [
                  "true",
                  "false",
                ],
                "description": "Very cool property that does a thing",
                "examples": [
                  "true",
                ],
                "pattern": "^[a-z]+$",
              },
              "evenCooler": {
                "type": "number",
                "description": "Even cooler property",
              },
            },
            "required": [
              "reallyCool",
            ],
            "additionalProperties": false,
          },
        },
        "required": [
          "body",
          "headers",
          "pathParams",
          "query",
        ],
        "additionalProperties": false,
      },
    },
    "parameters": {},
  },
} as const satisfies OpenAPIV3_1.Document;
export default Spec;