import ts from "typescript";
import { StrictTransformationError } from "./error";
import { Project } from "./project";

export function isNornirNode(node: ts.Node) {
  return hasOriginator(node, "nornir/core");
}

export function isNornirRestNode(node: ts.Node) {
  return hasOriginator(node, "nornir/rest");
}

export function hasOriginator(node: ts.Node, originator: string): boolean {
  const jsdoc = ts.getJSDocTags(node);
  return jsdoc.some((tag) => tag.tagName.getText() === "originator" && tag.comment === originator);
}

export function getStringLiteralOrConst(project: Project, node: ts.Expression): string | undefined {
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

export interface NornirDecoratorInfo {
  decorator: ts.Decorator;
  signature: ts.Signature;
  declaration: ts.Declaration;
}

export function separateNornirDecorators(
  project: Project,
  originalDecorators: Readonly<ts.Decorator[]>,
): {
  otherDecorators: ts.Decorator[];
  nornirDecorators: NornirDecoratorInfo[];
} {
  const nornirDecorators: {
    decorator: ts.Decorator;
    signature: ts.Signature;
    declaration: ts.Declaration;
  }[] = [];
  const decorators: ts.Decorator[] = [];

  for (const decorator of originalDecorators) {
    const signature = project.checker.getResolvedSignature(decorator);
    const parentDeclaration = signature?.getDeclaration()?.parent;
    if (parentDeclaration && signature && signature.declaration && isNornirRestNode(parentDeclaration)) {
      nornirDecorators.push({
        decorator,
        signature,
        declaration: signature.declaration,
      });
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

export function strictError(project: Project, error: StrictTransformationError) {
  throw error;
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
