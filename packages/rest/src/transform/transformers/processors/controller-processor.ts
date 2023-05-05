import ts from "typescript";
import { ControllerMeta } from "../../controller-meta";
import { getStringLiteralOrConst, NornirDecoratorInfo, separateNornirDecorators } from "../../lib";
import { Project } from "../../project";
import { ControllerMethodTransformer } from "../controller-method-transformer";
import { FileTransformer } from "../file-transformer";

export abstract class ControllerProcessor {
  public static process(
    project: Project,
    node: ts.ClassDeclaration,
    nornirDecorators: NornirDecoratorInfo[],
    context: ts.TransformationContext,
  ): ts.Node {
    const routeMeta = ControllerMeta.create(project, node);

    const basePath = ControllerProcessor.getBasePath(project, nornirDecorators);
    const routerIdentifier = FileTransformer.getOrCreateImport(node.getSourceFile(), "@nornir/rest", "Router");
    const routeHolderIdentifier = ts.factory.createUniqueName("route_handler");
    const routeInstanceIdentifier = ts.factory.createUniqueName("route_class");

    routeMeta.addInitializationStatement(
      ControllerProcessor.generateRouteHolderCreateStatement(node, basePath, routeHolderIdentifier),
    );
    routeMeta.addInitializationStatement(
      ControllerProcessor.generateRegisterRouteHolderStatement(routerIdentifier, routeHolderIdentifier),
    );
    routeMeta.addInitializationStatement(
      ControllerProcessor.generateRouteClassInstantiationStatement(node, routeInstanceIdentifier),
    );
    routeMeta.registerRouteHolder(routeHolderIdentifier, routeInstanceIdentifier, basePath);

    const transformedNode = ControllerMethodTransformer.transformControllerMethods(project, node, routeMeta, context);

    const transformedModifiers = ts.getModifiers(transformedNode) || [];

    const { otherDecorators } = separateNornirDecorators(project, ts.getDecorators(transformedNode) || []);

    return ts.factory.createClassDeclaration(
      [...transformedModifiers, ...otherDecorators],
      transformedNode.name,
      transformedNode.typeParameters,
      transformedNode.heritageClauses,
      [
        ...transformedNode.members,
        routeMeta.getInitializationMethod(),
      ],
    );
  }

  private static getBasePath(project: Project, nornirDecorators: NornirDecoratorInfo[]) {
    const basePathDecorator = nornirDecorators.find((decorator) =>
      project.checker.getTypeAtLocation(decorator.declaration.parent).symbol.name === "Controller"
    );
    if (basePathDecorator == undefined) throw new Error("Controller must have a controller decorator");
    if (!ts.isCallExpression(basePathDecorator.decorator.expression)) {
      throw new Error("Controller decorator is not a call expression");
    }
    const args = basePathDecorator.decorator.expression.arguments;
    if (args.length !== 1) throw new Error("Controller decorator must have 1 arguments");
    const [basePathArg] = args;
    const basePath = getStringLiteralOrConst(project, basePathArg);

    if (!basePath) {
      throw new Error("Base path must resolve to a literal string");
    }
    return basePath;
  }

  private static generateRouteHolderCreateStatement(
    node: ts.ClassDeclaration,
    basePath: string,
    routeHolderIdentifier: ts.Identifier,
  ) {
    const nornirRestImport = FileTransformer.getOrCreateImport(node.getSourceFile(), "@nornir/rest", "RouteHolder");

    const routeHolderCreate = ts.factory.createNewExpression(
      nornirRestImport,
      [],
      [ts.factory.createStringLiteral(basePath)],
    );
    const routeHolderDeclaration = ts.factory.createVariableDeclaration(
      routeHolderIdentifier,
      undefined,
      undefined,
      routeHolderCreate,
    );
    return ts.factory.createVariableStatement(
      ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Const),
      [routeHolderDeclaration],
    );
  }

  private static generateRouteClassInstantiationStatement(
    node: ts.ClassDeclaration,
    routeInstanceIdentifier: ts.Identifier,
  ) {
    if (node.name == undefined) throw new Error("Class must have a name");

    return ts.factory.createVariableStatement(
      ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Const),
      [
        ts.factory.createVariableDeclaration(
          routeInstanceIdentifier,
          undefined,
          undefined,
          ts.factory.createNewExpression(
            node.name,
            [],
            [],
          ),
        ),
      ],
    );
  }

  private static generateRegisterRouteHolderStatement(
    routerIdentifier: ts.Identifier,
    routeHolderIdentifier: ts.Identifier,
  ) {
    const routerInstance = ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(routerIdentifier, "get"),
      [],
      [],
    );

    const callExpression = ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(routerInstance, "register"),
      [],
      [routeHolderIdentifier],
    );

    return ts.factory.createExpressionStatement(callExpression);
  }
}
