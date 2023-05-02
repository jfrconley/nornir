import ts from "typescript";
import { separateNornirDecorators } from "../lib";
import { IProject } from "../project";
import { ChainRouteProcessor } from "./decorator-transofmers/chain-route-processor";

export abstract class MethodTransformer {
  public static transform(project: IProject, node: ts.MethodDeclaration): ts.MethodDeclaration {
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

type Task = (project: IProject, node: ts.MethodDeclaration, decorator: ts.Decorator) => void;

const METHOD_DECORATOR_PROCESSORS: Record<string, Task> = {
  GetChain: ChainRouteProcessor.transform.bind(null, "GET"),
  PostChain: ChainRouteProcessor.transform.bind(null, "POST"),
  PutChain: ChainRouteProcessor.transform.bind(null, "PUT"),
  DeleteChain: ChainRouteProcessor.transform.bind(null, "DELETE"),
  PatchChain: ChainRouteProcessor.transform.bind(null, "PATCH"),
  OptionsChain: ChainRouteProcessor.transform.bind(null, "OPTIONS"),
  HeadChain: ChainRouteProcessor.transform.bind(null, "HEAD"),
};
