import * as path from "path";
import ts from "typescript";
import { IProject } from "../project";
import { AssertTransformer } from "./features/assert-transformer";

const LIB_PATHS = [
  path.join("node_modules", "@nornir/core", "dist", "lib"),
  path.join("packages", "core", "dist", "lib"),
];

export namespace CallExpressionTransformer {
  export function transform(
    project: IProject,
    expression: ts.CallExpression,
  ): ts.Node {
    const declaration: ts.Declaration | undefined = project.checker.getResolvedSignature(expression)?.declaration;
    if (!declaration) return expression;

    const file = path.resolve(declaration.getSourceFile().fileName);

    if (LIB_PATHS.every(libPath => file.indexOf(libPath) === -1)) return expression;

    const { name } = project.checker.getTypeAtLocation(declaration).symbol;

    const functor: (() => Task) | undefined = FUNCTORS[name];
    if (functor === undefined) return expression;

    expression.expression.getChildren().forEach(child =>
      console.log(`${ts.SyntaxKind[child.kind]}: ${child.getText()}`)
    );
    console.log(`${name}: ${declaration.getSourceFile().fileName}`);
    return functor()(project, expression);
  }
}

type Task = (
  project: IProject,
  expression: ts.CallExpression,
) => ts.Expression;

const FUNCTORS: Record<string, () => Task> = {
  assert: () => AssertTransformer.transform,
};
