import ts from "typescript";
import { ControllerMeta } from "../../controller-meta";
import { getStringLiteralOrConst, NornirDecoratorInfo, separateNornirDecorators } from "../../lib";
import { Project } from "../../project";
import { ControllerMethodTransformer } from "../controller-method-transformer";

export abstract class ControllerProcessor {
  public static process(
    project: Project,
    source: ts.SourceFile,
    node: ts.ClassDeclaration,
    nornirDecorators: NornirDecoratorInfo[],
    context: ts.TransformationContext,
  ): ts.Node {
    const { basePath, apiId } = ControllerProcessor.getArguments(project, nornirDecorators);
    const routeMeta = ControllerMeta.create(project, source, node, basePath, apiId);

    const transformedNode = ControllerMethodTransformer.transformControllerMethods(
      project,
      source,
      node,
      routeMeta,
      context,
    );

    const transformedModifiers = ts.getModifiers(transformedNode) || [];

    const { otherDecorators } = separateNornirDecorators(project, ts.getDecorators(transformedNode) || []);

    const recreatedNode = ts.factory.createClassDeclaration(
      [...transformedModifiers, ...otherDecorators],
      transformedNode.name,
      transformedNode.typeParameters,
      transformedNode.heritageClauses,
      [
        ...transformedNode.members,
        ...routeMeta.getGeneratedMembers(),
      ],
    );

    ts.setTextRange(recreatedNode, node);
    ts.setOriginalNode(recreatedNode, node);

    return recreatedNode;
  }

  private static getArguments(project: Project, nornirDecorators: NornirDecoratorInfo[]): {
    basePath: string;
    apiId: string;
  } {
    const basePathDecorator = nornirDecorators.find((decorator) => decorator.symbol.name === "Controller");
    if (basePathDecorator == undefined) throw new Error("Controller must have a controller decorator");
    if (!ts.isCallExpression(basePathDecorator.decorator.expression)) {
      throw new Error("Controller decorator is not a call expression");
    }
    const args = basePathDecorator.decorator.expression.arguments;
    if (args.length !== 1 && args.length !== 2) throw new Error("Controller decorator must have 1 or 2 arguments");
    const [basePathArg, apiIdArg] = args;
    const basePath = getStringLiteralOrConst(project, basePathArg);
    let apiId = "default";

    if (!basePath) {
      throw new Error("Base path must resolve to a literal string");
    }

    if (apiIdArg) {
      const specifiedApiId = getStringLiteralOrConst(project, apiIdArg);
      if (!specifiedApiId) {
        throw new Error("ApiId must resolve to a literal string");
      }
      apiId = specifiedApiId;
    }

    return {
      basePath,
      apiId,
    };
  }
}
