import { OpenAPIV3_1 } from "@nornir/rest";

export default {
  "openapi": "3.1.0",
  "info": {
    "title": "Message routing API (beta)",
    "version": "0.0.2",
    "description":
      "## Using the Message routing API\n\n ### Managing webhook destinations\n- **Creating destinations:** Use `POST /destination` to register a new webhook destination. See [Create a new destination](#operation/createDestination).\n- **Listing destinations:** Use `GET /destination` to view all your webhook destinations. See [Get all destinations](#operation/getAllDestinations).\n- **Updating destinations:** Use `PATCH /destination/:id` to modify a destination. See [Update an existing destination](#operation/updateDestination).            \n- **Deleting destinations:** Use `DELETE /destination/:id` to remove a specific webhook destination. See [Delete a destination](#operation/deleteDestination).\n\n### Receiving messages\n**Triggering message forwarding**\n- Send a device message from a device to initiate message forwarding.\n- Await messages at your registered webhook destination shortly after sending the device message.\n- Messages arrive in batches to your configured webhook destination.\n- Messages from MQTT topics prefixed with `$ENV/$TEAM_ID/m` are forwarded, with the exception of messages sent to `$ENV/$TEAM_ID/m/d/$DEVICE_ID/d2c/bin`.\n\n### Security and SSL verification\n- **Verifying requests:** Use the `x-nrfcloud-signature` header to verify incoming requests. This signature is an HMAC hex digest of the request payload, hashed using your provided secret. Employ constant-time string comparisons to mitigate timing attacks.\n- **SSL verification:** SSL verification is standard for payload delivery unless you disable it using the `verifySsl` property in your webhook configuration.\n\n### Handling errors\n- Non-2xx responses from your destination webhook are logged as errors. Access the `errors` property of the destination to review the five most recent errors within the past 30 days.\n\n### Access control\n- Full destination management is limited to Admin and Owner roles. Destination viewing is allowed for Editor and Viewer roles.\n\n## Webhook server example\nBelow is an example of a simple Node.js server that receives webhook requests, verifies the `x-nrfcloud-signature`\nheader, and responds with a status code of 200 along with the `x-nrfcloud-team-id` header. This example uses\nExpress, a popular web framework for Node.js, and the crypto module for signature verification. \n\n```javascript\nconst express = require('express');\nconst bodyParser = require('body-parser');\nconst crypto = require('crypto');\n\nconst app = express();\nconst port = 3000;\n\n// Replace this with your actual secret key\nconst secretKey = 'yourSecretKey';\n\napp.use(bodyParser.json());\n\n// Verify nRF Cloud signature\nconst verifySignature = (req) => {\n    const signature = req.headers['x-nrfcloud-signature'];\n    const body = JSON.stringify(req.body);\n\n    // Create HMAC hex digest\n    const hmac = crypto.createHmac('sha256', secretKey);\n    hmac.update(body, 'utf8');\n    const digest = hmac.digest('hex');\n\n    return digest === signature;\n};\n\napp.post('/webhook', (req, res) => {\n    if (verifySignature(req)) {\n        // Your logic here - process the request\n        \n        // Respond with 200 OK and x-nrfcloud-team-id header\n        res.set('x-nrfcloud-team-id', 'yourTeamId');\n        res.status(200).send('Webhook received successfully.');\n    } else {\n        res.status(401).send('Invalid signature.');\n    }\n});\n\napp.listen(port, () => {\n    console.log(`Webhook receiver running on port ${port}`);\n});\n```\n",
  },
  "servers": [
    {
      "url": "https://message-routing.{stage}.nrfcloud.com",
      "description": "Development server",
    },
  ],
  "paths": {
    "/destination": {
      "get": {
        "security": [
          {
            "ApiKey": [],
          },
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "allOf": [
                      {
                        "$ref": "#/components/schemas/DestinationProperties_ReadableConfiguration",
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "post": {
        "security": [
          {
            "ApiKey": [],
          },
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "allOf": [
                  {
                    "$ref": "#/components/schemas/DestinationCreationJson",
                  },
                ],
              },
            },
          },
        },
        "responses": {
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/DestinationProperties_ReadableConfiguration",
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/destination/{destinationId}/test": {
      "post": {
        "security": [
          {
            "ApiKey": [],
          },
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "destination_response": {
                      "allOf": [
                        {
                          "$ref": "#/components/schemas/HttpResponse",
                        },
                      ],
                    },
                  },
                  "required": [
                    "destination_response",
                  ],
                  "additionalProperties": false,
                },
              },
            },
          },
        },
        "parameters": [
          {
            "name": "destinationId",
            "in": "path",
            "required": true,
            "deprecated": false,
            "schema": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/Uuid",
                },
              ],
            },
          },
        ],
      },
    },
    "/destination/{destinationId}": {
      "patch": {
        "security": [
          {
            "ApiKey": [],
          },
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/DestinationProperties_ReadableConfiguration",
                    },
                  ],
                },
              },
            },
          },
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "allOf": [
                  {
                    "$ref": "#/components/schemas/DestinationMutationJson",
                  },
                ],
              },
            },
          },
        },
        "parameters": [
          {
            "name": "destinationId",
            "in": "path",
            "required": true,
            "deprecated": false,
            "schema": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/Uuid",
                },
              ],
            },
          },
        ],
      },
      "delete": {
        "security": [
          {
            "ApiKey": [],
          },
        ],
        "responses": {
          "204": {
            "description": "",
          },
        },
        "parameters": [
          {
            "name": "destinationId",
            "in": "path",
            "required": true,
            "deprecated": false,
            "schema": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/Uuid",
                },
              ],
            },
          },
        ],
      },
    },
  },
  "components": {
    "securitySchemes": {
      "ApiKey": {
        "type": "http",
        "scheme": "Bearer",
        "description":
          "Endpoints that specify Authorizations of \"ApiKey\" require you to send your API key\nin the `Authorization` header, e.g., using cURL: `-H \"Authorization: Bearer\nd8be845e816e45d4a9529a6cfcd459c88e3c22b5\"`. Your API key can be found in\nthe Account section of nRFCloud.com.\n\nFor more information on API keys, see\n[the API Key section](https://docs.nrfcloud.com/APIs/REST/RESTOverview.html#api-key)\nin the nRF Cloud documentation.\n",
      },
    },
    "schemas": {
      "Nominal_HttpConfigurationBase_HttpConfigurationWithoutSecrets": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "type": {
            "type": "string",
            "const": "http",
          },
          "url": {
            "type": "string",
          },
          "verifySsl": {
            "type": "boolean",
          },
        },
        "required": [
          "type",
          "url",
          "verifySsl",
        ],
      },
      "DestinationError": {
        "type": "object",
        "properties": {
          "reason": {
            "type": "string",
          },
          "createdAt": {
            "type": "string",
          },
        },
        "required": [
          "reason",
          "createdAt",
        ],
        "additionalProperties": false,
      },
      "DestinationProperties_ReadableConfiguration": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
          },
          "createdAt": {
            "type": "string",
          },
          "name": {
            "type": "string",
          },
          "config": {
            "$ref": "#/components/schemas/Nominal_HttpConfigurationBase_HttpConfigurationWithoutSecrets",
          },
          "isEnabled": {
            "type": "boolean",
          },
          "errors": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/DestinationError",
            },
          },
        },
        "required": [
          "id",
          "createdAt",
          "name",
          "config",
          "isEnabled",
          "errors",
        ],
        "additionalProperties": false,
      },
      "HttpConfiguration": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "secret": {
            "type": "string",
          },
          "type": {
            "type": "string",
            "const": "http",
          },
          "url": {
            "type": "string",
          },
          "verifySsl": {
            "type": "boolean",
          },
        },
        "required": [
          "type",
          "url",
          "verifySsl",
        ],
      },
      "DestinationCreationJson": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
          },
          "config": {
            "$ref": "#/components/schemas/HttpConfiguration",
          },
          "isEnabled": {
            "type": "boolean",
          },
        },
        "required": [
          "name",
          "config",
          "isEnabled",
        ],
        "additionalProperties": false,
      },
      "Uuid": {
        "description": "Universally unique identifier",
        "examples": [
          "a5592ec1-18ae-4d9d-bc44-1d9bd927bbe9",
        ],
        "format": "uuid",
        "anyOf": [
          {
            "$ref": "#/components/schemas/Nominal_HttpConfigurationBase_HttpConfigurationWithoutSecrets",
          },
        ],
      },
      "HttpResponse": {
        "type": "object",
        "properties": {
          "status": {
            "type": "number",
          },
          "body": {
            "type": "string",
          },
          "headers": {
            "type": "object",
            "additionalProperties": {
              "anyOf": [
                {
                  "type": "array",
                  "items": {
                    "type": "string",
                  },
                },
                {
                  "type": "string",
                },
                {
                  "not": {},
                },
              ],
            },
          },
        },
        "required": [
          "status",
          "body",
          "headers",
        ],
        "additionalProperties": false,
      },
      "DestinationMutationJson": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
          },
          "isEnabled": {
            "type": "boolean",
          },
          "config": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "const": "http",
              },
              "url": {
                "type": "string",
              },
              "verifySsl": {
                "type": "boolean",
              },
              "secret": {
                "type": "string",
              },
            },
            "additionalProperties": false,
          },
        },
        "additionalProperties": false,
      },
    },
    "parameters": {},
  },
} as const satisfies OpenAPIV3_1.Document;
