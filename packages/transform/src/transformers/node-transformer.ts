import ts from "typescript";
import { IProject } from "../project";
import { CallExpressionTransformer } from "./call-expression-transformer";

export namespace NodeTransformer {
  export function transform(project: IProject, node: ts.Node): ts.Node {
    if (ts.isCallExpression(node)) {
      return CallExpressionTransformer.transform(project, node);
    }
    return node;
  }
}
