import path from "path";
import ts from "typescript";
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
