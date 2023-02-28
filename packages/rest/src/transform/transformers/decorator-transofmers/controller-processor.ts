import ts from "typescript";
import { getStringLiteralOrConst, isNornirLib } from "../../lib";
import { IProject } from "../../project";
import { ControllerMeta } from "../../controller-meta";
import { FileTransformer } from "../file-transformer";

export abstract class ControllerProcessor {
  public static process(project: IProject, node: ts.ClassDeclaration, decorator: ts.Decorator): void {
    const routeMeta = ControllerMeta.getAssert(node);

    const expression = decorator.expression;
    if (!ts.isCallExpression(expression)) {
      throw new Error("Route decorator is not a call expression");
    }
    const args = expression.arguments;
    if (args.length !== 1) {
      throw new Error("Route decorator must have 1 arguments");
    }
    const [basePathArg] = args;
    const routerIdentifier = FileTransformer.getOrCreateImport(node.getSourceFile(), "@nornir/rest", "Router");
    const basePath = ControllerProcessor.getBasePath(project, basePathArg);
    const routeHolderIdentifier = ts.factory.createUniqueName("route_handler");
    const routeInstanceIdentifier = ts.factory.createUniqueName("route_class");

    FileTransformer.addStatementToFile(
      node.getSourceFile(),
      ControllerProcessor.generateRouteHolderCreateStatement(node, basePath, routeHolderIdentifier),
      "end",
    );
    FileTransformer.addStatementToFile(
      node.getSourceFile(),
      ControllerProcessor.generateRegisterRouteHolderStatement(routerIdentifier, routeHolderIdentifier),
      "end",
    );
    FileTransformer.addStatementToFile(
      node.getSourceFile(),
      ControllerProcessor.generateRouteClassInstantiationStatement(node, routeInstanceIdentifier),
      "end",
    );

    routeMeta.registerRouteHolder(routeHolderIdentifier, routeInstanceIdentifier, basePath);
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
    const routeHolderStatement = ts.factory.createVariableStatement(
      ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Const),
      [routeHolderDeclaration],
    );
    return routeHolderStatement;
  }

  private static generateRouteClassInstantiationStatement(
    node: ts.ClassDeclaration,
    routeInstanceIdentifier: ts.Identifier,
  ) {
    if (node.name == null) throw new Error("Class must have a name");

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
    )

    const callExpression = ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(routerInstance, "register"),
      [],
      [routeHolderIdentifier],
    );

    return ts.factory.createExpressionStatement(callExpression);
  }

  private static getBasePath(project: IProject, basePathArg: ts.Expression): string {
    const basePath = getStringLiteralOrConst(project, basePathArg);

    if (!basePath) {
      throw new Error("Base path must resolve to a literal string");
    }
    return basePath;
  }
}
