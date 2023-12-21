import ts from "typescript";
import { RouteIndex } from "./controller-meta";
export class TransformationError extends Error {
  constructor(message: string, routeIndex: RouteIndex, node?: ts.Node) {
    super(message);
    this.message += this.getMessageAddendum(routeIndex, node);
  }

  public getMessageAddendum(routeIndex: RouteIndex, node?: ts.Node) {
    const routeMessage = ` - ${routeIndex.method} ${routeIndex.path}`;
    let message = routeMessage;
    if (node) {
      const file: ts.SourceFile = node.getSourceFile();
      const { line, character } = file.getLineAndCharacterOfPosition(
        node.pos,
      );
      message += `\n${file.fileName}:${line + 1}:${character + 1}`;
    }
    return message;
  }
}

export class StrictTransformationError extends TransformationError {
  public readonly warningMessage: string;
  constructor(errorMessage: string, warningMessage: string, routeIndex: RouteIndex, node?: ts.Node) {
    super(errorMessage, routeIndex, node);
    this.warningMessage = warningMessage + this.getMessageAddendum(routeIndex, node);
  }
}
