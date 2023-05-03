import ts from "typescript";
import { separateNornirDecorators } from "../lib";
import { Project } from "../project";
import { ChainRouteProcessor } from "./decorator-transofmers/chain-route-processor";

export abstract class MethodTransformer {
  public static transform(project: Project, node: ts.MethodDeclaration): ts.MethodDeclaration {
    const originalDecorators = ts.getDecorators(node) || [];
    if (!originalDecorators) return node;
    const modifiers = ts.getModifiers(node) || [];

    const { otherDecorators, nornirDecorators } = separateNornirDecorators(project, originalDecorators);

    for (const { decorator, declaration } of nornirDecorators) {
      const { name } = project.checker.getTypeAtLocation(declaration.parent).symbol;
      const processor = METHOD_DECORATOR_PROCESSORS[name];
      if (!processor) throw new Error(`No processor for decorator ${name}`);
      processor(project, node, decorator);
    }

    return ts.factory.createMethodDeclaration(
      [...modifiers, ...otherDecorators],
      node.asteriskToken,
      node.name,
      node.questionToken,
      node.typeParameters,
      node.parameters,
      node.type,
      node.body,
    );
  }
}

type Task = (project: Project, node: ts.MethodDeclaration, decorator: ts.Decorator) => void;

const METHOD_DECORATOR_PROCESSORS: Record<string, Task> = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "GetChain": ChainRouteProcessor.transform.bind(undefined, "GET"),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "PostChain": ChainRouteProcessor.transform.bind(undefined, "POST"),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "PutChain": ChainRouteProcessor.transform.bind(undefined, "PUT"),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "DeleteChain": ChainRouteProcessor.transform.bind(undefined, "DELETE"),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "PatchChain": ChainRouteProcessor.transform.bind(undefined, "PATCH"),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "OptionsChain": ChainRouteProcessor.transform.bind(undefined, "OPTIONS"),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "HeadChain": ChainRouteProcessor.transform.bind(undefined, "HEAD"),
};
