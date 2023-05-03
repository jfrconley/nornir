import ts from "typescript";
import { RouteIndex } from "./controller-meta";
export class TransformationError extends Error {
  constructor(message: string, public readonly routeIndex: RouteIndex, public readonly node?: ts.Node) {
    super(message);
    this.message += this.getMessageAddendum();
  }

  public getMessageAddendum() {
    const routeMessage = ` - ${this.routeIndex.method} ${this.routeIndex.path}`;
    let message = routeMessage;
    if (this.node) {
      const file: ts.SourceFile = this.node.getSourceFile();
      const { line, character } = file.getLineAndCharacterOfPosition(
        this.node.pos,
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
    this.warningMessage = warningMessage + this.getMessageAddendum();
  }
}
