import ts from "typescript";
import { getStringLiteralOrConst, isNornirLib } from "../../lib";
import { IProject } from "../../project";
import { RouteMeta } from "../../route-meta";
import { FileTransformer } from "../file-transformer";

export abstract class RouteProcessor {
  public static process(project: IProject, node: ts.ClassDeclaration, decorator: ts.Decorator): void {
    const routeMeta = RouteMeta.getAssert(node);

    const expression = decorator.expression;
    if (!ts.isCallExpression(expression)) {
      throw new Error("Route decorator is not a call expression");
    }
    const args = expression.arguments;
    if (args.length !== 2) {
      throw new Error("Route decorator must have 2 arguments");
    }
    const [routerArg, basePathArg] = args;
    const routerIdentifier = RouteProcessor.getRouterIdentifier(project, routerArg);
    const basePath = RouteProcessor.getBasePath(project, basePathArg);
    const routeHolderIdentifier = ts.factory.createUniqueName("route_handler");
    const routeInstanceIdentifier = ts.factory.createUniqueName("route_class");

    FileTransformer.addStatementToFile(
      node.getSourceFile(),
      RouteProcessor.generateRouteHolderCreateStatement(node, basePath, routeHolderIdentifier),
      "end",
    );
    FileTransformer.addStatementToFile(
      node.getSourceFile(),
      RouteProcessor.generateRegisterRouteHolderStatement(routerIdentifier, routeHolderIdentifier),
      "end",
    );
    FileTransformer.addStatementToFile(
      node.getSourceFile(),
      RouteProcessor.generateRouteClassInstantiationStatement(node, routeInstanceIdentifier),
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
    const callExpression = ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(routerIdentifier, "register"),
      [],
      [routeHolderIdentifier],
    );

    return ts.factory.createExpressionStatement(callExpression);
  }

  private static getRouterIdentifier(project: IProject, routerArg: ts.Expression): ts.Identifier {
    if (!ts.isIdentifier(routerArg)) {
      throw new Error("Route decorator first argument must be an identifier");
    }

    const type = project.checker.getTypeAtLocation(routerArg);
    const declarations = type.symbol.declarations;
    if (declarations?.length !== 1) {
      throw new Error("Router type has multiple declarations");
    }
    const declaration = declarations[0];
    if (!isNornirLib(declaration.getSourceFile().fileName)) {
      throw new Error("Router must be from @nornir/rest");
    }

    if (type.symbol.name !== "Router") {
      throw new Error("Router argument has incorrect type");
    }

    return routerArg as ts.Identifier;
  }

  private static getBasePath(project: IProject, basePathArg: ts.Expression): string {
    const basePath = getStringLiteralOrConst(project, basePathArg);

    if (!basePath) {
      throw new Error("Base path must resolve to a literal string");
    }
    return basePath;
  }
}
