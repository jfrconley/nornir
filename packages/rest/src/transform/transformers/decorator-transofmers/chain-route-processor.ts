import { isTypeReference } from "tsutils";
import ts from "typescript";
import { ValidateProgrammer } from "typia/lib/programmers/ValidateProgrammer";
import { getStringLiteralOrConst, isNornirLib } from "../../lib";
import { IProject } from "../../project";
import { RouteMeta } from "../../route-meta";
import { FileTransformer } from "../file-transformer";

export abstract class ChainRouteProcessor {
  public static transform(
    method: string,
    project: IProject,
    node: ts.MethodDeclaration,
    decorator: ts.Decorator,
  ): void {
    if (!ts.isClassDeclaration(node.parent)) {
      throw new Error("Chain decorator can only be used in a class");
    }
    const routeMeta = RouteMeta.getAssert(node.parent);

    const expression = decorator.expression;
    if (!ts.isCallExpression(expression)) {
      throw new Error(`Handler chain decorator is not a call expression`);
    }
    const args = expression.arguments;
    if (args.length !== 1) {
      throw new Error("Handler chain decorator must have 1 argument");
    }

    const [pathArg] = args;
    const path = ChainRouteProcessor.getPath(project, pathArg);
    const methodSignature = project.checker.getSignatureFromDeclaration(node);
    if (!methodSignature) throw new Error("Method signature not found");

    const inputType = ChainRouteProcessor.resolveInputType(project, methodSignature);
    const typiaValidateImport = FileTransformer.getOrCreateImport(node.getSourceFile(), "typia", "validate");
    const validator = ValidateProgrammer.generate(project, typiaValidateImport, false)(inputType);

    // const routeRegisterCall = ts.factory.createCallExpression(
    //   ts.factory.createPropertyAccessExpression(
    //     routeMeta.getRouteHolderIdentifier(),
    //     "route"
    //   ),
    //   [],
    //   [method, path, ]
    // )
  }

  private static generateRouteStatement(routeHolderIdentifier: ts.Identifier, method: string, path: string) {
    return ts.factory.createExpressionStatement(
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(routeHolderIdentifier, "route"),
        [],
        [ts.factory.createStringLiteral(method), ts.factory.createStringLiteral(path)],
      ),
    );
  }

  private static getPath(project: IProject, pathArg: ts.Expression): string {
    const path = getStringLiteralOrConst(project, pathArg);
    if (!path) {
      throw new Error("Handler chain decorator path must be a string literal or const");
    }
    return path;
  }

  private static resolveInputType(project: IProject, methodSignature: ts.Signature): ts.Type {
    const parameters = methodSignature.getParameters();
    if (parameters.length !== 1) {
      throw new Error("Handler chain method must have 1 parameter");
    }
    const [inputParameter] = parameters;
    const declaration = inputParameter.declarations?.[0];
    if (!declaration) {
      throw new Error("Handler chain input parameter declaration not found");
    }
    const initialType = project.checker.getTypeAtLocation(declaration);
    const initialTypeDeclaration = initialType.symbol?.declarations?.[0];
    if (!initialTypeDeclaration) {
      throw new Error("Handler chain input parameter type declaration not found");
    }
    if (!isNornirLib(initialTypeDeclaration.getSourceFile().fileName)) {
      throw new Error("Handler chain input must be a Nornir class");
    }
    if (!isTypeReference(initialType)) {
      throw new Error("Handler chain input must use a type reference");
    }
    const typeArguments = project.checker.getTypeArguments(initialType);
    const [inputType] = typeArguments;
    return inputType;
  }
}
