import ts from "typescript";
import { ControllerMeta } from "../controller-meta";
import { TransformationError } from "../error";
import { NornirDecoratorInfo, separateNornirDecorators } from "../lib";
import { Project } from "../project";
import { ChainMethodDecoratorTypes, ChainRouteProcessor } from "./processors/chain-route-processor";
import { ProviderProcessor } from "./processors/provider-processor";

export abstract class ControllerMethodTransformer {
  private static transform(
    project: Project,
    source: ts.SourceFile,
    node: ts.MethodDeclaration,
    controller: ControllerMeta,
  ): ts.MethodDeclaration {
    const originalDecorators = ts.getDecorators(node) || [];
    if (!originalDecorators) return node;
    const { nornirDecorators } = separateNornirDecorators(project, originalDecorators);

    if (nornirDecorators.length === 0) return node;
    const methodDecorator = nornirDecorators.find(decorator => {
      const name = decorator.symbol.name;
      return METHOD_DECORATOR_PROCESSORS[name] != undefined;
    });

    if (!methodDecorator) return node;

    const method = methodDecorator.symbol.name;

    if (!method) return node;

    try {
      return METHOD_DECORATOR_PROCESSORS[method](methodDecorator, project, source, node, controller);
    } catch (e) {
      throw e;
      console.error(e);
      if (e instanceof TransformationError) {
        throw e;
      }
      return node;
    }
  }

  public static transformControllerMethods(
    project: Project,
    source: ts.SourceFile,
    node: ts.ClassDeclaration,
    controller: ControllerMeta,
    context: ts.TransformationContext,
  ) {
    return ts.visitEachChild(node, (child) => {
      if (ts.isMethodDeclaration(child)) {
        return ControllerMethodTransformer.transform(project, source, child, controller);
      }
      return child;
    }, context);
  }
}

type Task = (
  methodDecorator: NornirDecoratorInfo,
  project: Project,
  source: ts.SourceFile,
  node: ts.MethodDeclaration,
  controller: ControllerMeta,
) => ts.MethodDeclaration;

const METHOD_DECORATOR_PROCESSORS: Record<string, Task> = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ...Object.fromEntries(ChainMethodDecoratorTypes.map(type => [type, ChainRouteProcessor.transform])),
  Provider: ProviderProcessor.transform,
};
