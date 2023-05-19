import ts from "typescript";
import { ControllerMeta } from "../controller-meta";
import { NornirDecoratorInfo, separateNornirDecorators } from "../lib";
import { Project } from "../project";
import { ChainMethodDecoratorTypes, ChainRouteProcessor } from "./processors/chain-route-processor";
import { ProviderProcessor } from "./processors/provider-processor";

export abstract class ControllerMethodTransformer {
  private static transform(
    project: Project,
    node: ts.MethodDeclaration,
    controller: ControllerMeta,
  ): ts.MethodDeclaration {
    const originalDecorators = ts.getDecorators(node) || [];
    if (!originalDecorators) return node;
    const { nornirDecorators } = separateNornirDecorators(project, originalDecorators);

    if (nornirDecorators.length === 0) return node;
    const methodDecorator = nornirDecorators.find(decorator => {
      const name = project.checker.getTypeAtLocation(decorator.declaration.parent).symbol.name;
      return METHOD_DECORATOR_PROCESSORS[name] != undefined;
    });

    if (!methodDecorator) return node;

    const method = project.checker.getTypeAtLocation(methodDecorator.declaration.parent).symbol.name;

    if (!method) return node;

    return METHOD_DECORATOR_PROCESSORS[method](methodDecorator, project, node, controller);
  }

  public static transformControllerMethods(
    project: Project,
    node: ts.ClassDeclaration,
    controller: ControllerMeta,
    context: ts.TransformationContext,
  ) {
    return ts.visitEachChild(node, (child) => {
      if (ts.isMethodDeclaration(child)) {
        return ControllerMethodTransformer.transform(project, child, controller);
      }
      return child;
    }, context);
  }
}

type Task = (
  methodDecorator: NornirDecoratorInfo,
  project: Project,
  node: ts.MethodDeclaration,
  controller: ControllerMeta,
) => ts.MethodDeclaration;

const METHOD_DECORATOR_PROCESSORS: Record<string, Task> = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ...Object.fromEntries(ChainMethodDecoratorTypes.map(type => [type, ChainRouteProcessor.transform])),
  Provider: ProviderProcessor.transform,
};
