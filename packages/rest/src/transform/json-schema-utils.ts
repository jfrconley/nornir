// Traverses the schema and extracts a unified definitions for the properties under the given path
import $RefParser from "@apidevtools/json-schema-ref-parser";
import dereference from "@apidevtools/json-schema-ref-parser/dist/lib/dereference.js";
import { JSONSchema7 } from "json-schema";
import traverse from "json-schema-traverse";
import { cloneDeep } from "lodash";
import { OpenAPIV3_1 } from "openapi-types";

const refParser = new $RefParser();

export function dereferenceSchema(schema: JSONSchema7) {
  const clonedSchema = cloneDeep(schema);
  refParser.parse(clonedSchema);
  refParser.schema = clonedSchema;
  dereference(refParser, {
    dereference: {
      circular: true,
      onDereference(path: string, value: JSONSchema7) {
        (value as { "x-resolved-ref": string })["x-resolved-ref"] = path;
      },
    },
  });
  return clonedSchema;
}

interface UnifiedPropertySchema {
  schemaSet: JSONSchema7[];
  required: boolean;
}

export function joinSchemas(schemaSet: JSONSchema7[]): JSONSchema7 {
  if (schemaSet.length === 0) {
    return {};
  }
  if (schemaSet.length === 1) {
    return schemaSet[0];
  }

  const joinedSchema: JSONSchema7 = {
    allOf: schemaSet,
  };

  return joinedSchema;
}

export function getUnifiedPropertySchemas(
  schema: JSONSchema7,
  parentPath: string,
): Record<string, UnifiedPropertySchema> {
  // Take a path from the json schema and convert it to a path in validated object

  const convertJsonSchemaPathIfPropertyPath = (path: string) => {
    if (path.split("/").at(-2) !== "properties") {
      return undefined;
    }

    return path
      // replace properties
      .replace(/\/properties\//g, "/")
      // replace items and index
      .replace(/\/items\/(\d+)(\/|$)/g, "$2")
      // replace anyOf and index
      .replace(/\/anyOf\/(\d+)(\/|$)/g, "$2")
      // replace oneOf and index
      .replace(/\/oneOf\/(\d+)(\/|$)/g, "$2")
      // replace allOf and index
      .replace(/\/allOf\/(\d+)(\/|$)/g, "$2");
  };

  const isUnifiedSchemaEmpty = (unifiedSchema: UnifiedPropertySchema) => {
    return !unifiedSchema.required && (
      unifiedSchema.schemaSet.length === 0
      || unifiedSchema.schemaSet.every(schema => isSchemaEmpty(schema))
    );
  };

  const isDirectChildPath = (childPath: string, parentPath: string) => {
    const childPathParts = childPath.split("/").filter(part => part !== "");
    const parentPathParts = parentPath.split("/").filter(part => part !== "");

    if (childPathParts.length !== parentPathParts.length + 1) {
      return false;
    }

    return parentPathParts.every((part, index) => part === childPathParts[index]);
  };

  const schemas: Record<string, {
    schemaSet: JSONSchema7[];
    required: boolean;
  }> = {};
  let parentSchemas = 0;

  traverse(schema, {
    allKeys: false,
    cb: {
      pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
        const convertedPath = convertJsonSchemaPathIfPropertyPath(jsonPtr);
        if (convertedPath === parentPath && parentJsonPtr != "") {
          parentSchemas++;
        }
      },
      post: (schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) => {
        const convertedPath = convertJsonSchemaPathIfPropertyPath(jsonPtr);

        const convertedParentPath = convertJsonSchemaPathIfPropertyPath(parentJsonPtr || "/");

        if (convertedPath != null && isDirectChildPath(convertedPath, parentPath)) {
          const schemaSet = schemas[keyIndex || ""] || {
            schemaSet: [],
            required: true,
          };
          schemaSet.required = !schemaSet.required ? false : parentSchema?.required?.includes(keyIndex) ?? false;
          schemaSet.schemaSet.push(schema);
          schemas[keyIndex || ""] = schemaSet;
        }
      },
    },
  });

  return Object.fromEntries(
    Object.entries(schemas).map(([key, value]) => {
      return [key, {
        schemaSet: value.schemaSet,
        required: value.required ? (parentSchemas) <= value.schemaSet.length : false,
      }];
    }).filter(([, value]) => !isUnifiedSchemaEmpty(value as UnifiedPropertySchema)),
  );
}

export function unresolveRefs(schema: JSONSchema7) {
  const clonedSchema = cloneDeep(schema);
  traverse(clonedSchema, {
    cb: {
      pre: (subSchema) => {
        if (subSchema["x-resolved-ref"]) {
          const ref = subSchema["x-resolved-ref"];
          Object.keys(subSchema).forEach(key => delete subSchema[key]);
          subSchema.$ref = ref;
        }
      },
    },
  });

  return clonedSchema;
}

const MOVED_REF_MARKER = Symbol("moved-ref-marker");
export function moveRefsToAllOf(schema: JSONSchema7, markMovedRef = true) {
  const clonedSchema = cloneDeep(schema);
  traverse(clonedSchema, {
    cb: {
      pre: (schema) => {
        if (schema.$ref && !(schema as { [MOVED_REF_MARKER]: unknown })[MOVED_REF_MARKER]) {
          const allOf = schema.allOf || [];
          const ref = schema.$ref; // schema.$ref.replace("#/definitions/", "#/components/schemas/");
          delete schema.$ref;
          schema.allOf = [
            ...allOf,
            {
              $ref: ref,
              [MOVED_REF_MARKER]: true,
            },
          ];
        }
      },
    },
  });

  return clonedSchema;
}

export function rewriteRefsForOpenApi(schema: JSONSchema7) {
  const clonedSchema = cloneDeep(schema);
  traverse(clonedSchema, {
    cb: {
      pre: (schema) => {
        if (schema.$ref) {
          schema.$ref = schema.$ref.replace("#/definitions/", "#/components/schemas/");
        }
      },
    },
  });

  return clonedSchema;
}

export function getSchemaOrAllOf(schema: JSONSchema7): JSONSchema7 {
  if (schema.allOf != null && schema.allOf.length === 1) {
    return schema.allOf[0] as JSONSchema7;
  }

  return schema;
}

export function getFirstExample(schema: JSONSchema7): unknown {
  schema = getSchemaOrAllOf(schema);
  if ((schema as { example?: string }).example != null) {
    return (schema as { example?: string }).example;
  }
  if (schema.examples != null) {
    return Array.isArray(schema.examples) ? schema.examples[0] : schema.examples;
  }
  return undefined;
}

export function resolveDiscriminantProperty(schema: JSONSchema7, propertyPath: string) {
  type SchemaBranch = { discriminatorValue: string | number; branchSchema: JSONSchema7 };
  if (schema.allOf != null && Object.keys(schema.allOf).length === 1) {
    return resolveDiscriminantProperty(schema.allOf[0] as JSONSchema7, propertyPath);
  }

  const discriminatorMap: Record<string | number, JSONSchema7> = {};
  const addToDiscriminatorMap = (branch: SchemaBranch): boolean => {
    if (discriminatorMap[branch.discriminatorValue] != null) {
      return false;
    }
    discriminatorMap[branch.discriminatorValue] = branch.branchSchema;
    return true;
  };

  const addManyToDiscriminatorMap = (discriminatorValues: string[], schema: JSONSchema7): boolean => {
    return discriminatorValues.every(value =>
      addToDiscriminatorMap({ discriminatorValue: value, branchSchema: schema })
    );
  };

  const analyzeBranch = (branchSchema: JSONSchema7, propertyPath: string): void | string[] => {
    const parentPath = propertyPath.split("/").slice(0, -1).join("/");
    const propertyName = propertyPath.split("/").at(-1);

    if (propertyName == null) {
      return;
    }

    const branchSchemaProperties = getUnifiedPropertySchemas(branchSchema as JSONSchema7, parentPath);
    const discriminantProperty = branchSchemaProperties[propertyName];
    if (discriminantProperty == null) {
      return;
    }
    if (!discriminantProperty.required) {
      return;
    }
    const discriminatorValues: string[] = [];

    for (const schema of discriminantProperty.schemaSet) {
      if (
        !(schema.type === "string" || schema.type === "number")
        || (schema.const == null && schema.enum == null)
      ) {
        return;
      }

      if (schema.const != null) {
        discriminatorValues.push(schema.const as string);
      }
      if (schema.enum != null) {
        discriminatorValues.push(...(schema.enum as string[]));
      }
    }

    return discriminatorValues;
  };

  if (schema.anyOf == null) {
    const result = analyzeBranch(schema, propertyPath);
    if (result == null || !addManyToDiscriminatorMap(result, schema)) {
      return;
    }
    return discriminatorMap;
  }

  for (const branchSchema of schema.anyOf) {
    const result = analyzeBranch(branchSchema as JSONSchema7, propertyPath);
    if (result == null || !addManyToDiscriminatorMap(result, branchSchema as JSONSchema7)) {
      return;
    }
  }

  return discriminatorMap;
}

export function isSchemaEmpty(schema: JSONSchema7): boolean {
  const keys = Object.keys(schema);
  for (const key of keys) {
    if (key.startsWith("x-") || key.startsWith("$")) {
      continue;
    }
    if (key === "not" && isSchemaEmpty(schema.not as JSONSchema7)) {
      continue;
    }
    return false;
  }
  return true;
}
