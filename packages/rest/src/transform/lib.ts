import path from "path";
import ts from "typescript";
import { Metadata } from "typia/lib/metadata/Metadata";
import { MetadataObject } from "typia/lib/metadata/MetadataObject";
import { StrictTransformationError } from "./error";
import { IProject } from "./project";

const LIB_PATHS = [
  path.join("node_modules", "@nornir/rest", "dist", "runtime"),
  path.join("node_modules", "@nornir/core", "dist"),
  path.join("packages", "rest", "dist", "runtime"),
  path.join("packages", "core", "dist"),
];

export function isNornirLib(file: string) {
  return LIB_PATHS.some(libPath => file.indexOf(libPath) !== -1);
}

export function getStringLiteralOrConst(project: IProject, node: ts.Expression): string | undefined {
  if (ts.isStringLiteral(node)) {
    return node.text;
  } else if (ts.isIdentifier(node)) {
    const type = project.checker.getTypeAtLocation(node);
    if (type.isStringLiteral()) {
      return type.value;
    }
  }
  return undefined;
}

export function separateNornirDecorators(
  project: IProject,
  originalDecorators: Readonly<ts.Decorator[]>,
): {
  otherDecorators: ts.Decorator[];
  nornirDecorators: { decorator: ts.Decorator; signature: ts.Signature; declaration: ts.Declaration }[];
} {
  const nornirDecorators: { decorator: ts.Decorator; signature: ts.Signature; declaration: ts.Declaration }[] = [];
  const decorators: ts.Decorator[] = [];

  for (const decorator of originalDecorators) {
    const signature = project.checker.getResolvedSignature(decorator);
    const fileName = signature?.declaration?.getSourceFile().fileName || "";
    if (isNornirLib(fileName) && signature && signature.declaration) {
      nornirDecorators.push({ decorator, signature, declaration: signature.declaration });
    } else {
      decorators.push(decorator);
    }
  }

  return {
    otherDecorators: decorators,
    nornirDecorators,
  };
}

export function generateDescription(comments: ts.SymbolDisplayPart[]): string {
  return comments
    .map((part) => part.text)
    .map((str) => str.split("\r\n").join("\n"))
    .join("");
}

export function strictError(project: IProject, error: StrictTransformationError) {
  if (project.options.strict) {
    throw error;
  } else {
    console.warn(error.warningMessage);
  }
}

export namespace MetadataUtils {
  export function getSoleLiteral(meta: Metadata): string | null {
    if (
      meta.size() === 1
      && meta.constants.length === 1
      && meta.constants[0].type === "string"
      && meta.constants[0].values.length === 1
    ) {
      return meta.constants[0].values[0] as string;
    } else return null;
  }

  export function getPropertyByStringIndex(metaObject: MetadataObject, index: string): Metadata | null {
    const properties = metaObject.properties;
    for (const property of properties) {
      const key = getSoleLiteral(property.key);
      if (key == null) {
        return null;
      }
      if (key === index) {
        return property.value;
      }
    }
    return null;
  }

  export function equal(a: Metadata, b: Metadata) {
    if (a.size() !== b.size()) return false;
    return Metadata.covers(a, b) && Metadata.covers(b, a);
  }
}

export const HttpStatusCodes = [
  "100",
  "101",
  "102",
  "200",
  "201",
  "202",
  "203",
  "204",
  "205",
  "206",
  "207",
  "208",
  "226",
  "300",
  "301",
  "302",
  "303",
  "304",
  "305",
  "306",
  "307",
  "308",
  "400",
  "401",
  "402",
  "403",
  "404",
  "405",
  "406",
  "407",
  "408",
  "409",
  "410",
  "411",
  "412",
  "413",
  "414",
  "415",
  "416",
  "417",
  "418",
  "421",
  "422",
  "423",
  "424",
  "426",
  "428",
  "429",
  "431",
  "451",
  "500",
  "501",
  "502",
  "503",
  "504",
  "505",
  "506",
  "507",
  "508",
  "510",
] as const;
