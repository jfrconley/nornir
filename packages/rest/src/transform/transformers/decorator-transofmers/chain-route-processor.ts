import { isTypeReference } from "tsutils";
import ts from "typescript";
import { ValidateProgrammer } from "typia/lib/programmers/ValidateProgrammer";
import { getStringLiteralOrConst, isNornirLib } from "../../lib";
import { convertToTypiaProject, IProject } from "../../project";
import { ControllerMeta } from "../../controller-meta";
import { FileTransformer } from "../file-transformer";
import { MetadataFactory } from 'typia/lib/factories/MetadataFactory';

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
    const routeMeta = ControllerMeta.getAssert(node.parent);

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
    const outputType = ChainRouteProcessor.resolveOutputType(project, methodSignature);
    const typiaValidateImport = FileTransformer.getOrCreateImport(node.getSourceFile(), "typia", "validate");
    const validator = ValidateProgrammer.generate(convertToTypiaProject(project), typiaValidateImport, false)(inputType);

    routeMeta.registerRoute({
      method,
      path,
      input: inputType,
      output: outputType,
      description: "",
      filePath: node.getSourceFile().fileName
    })

    FileTransformer.addStatementToFile(
      node.getSourceFile(),
      ChainRouteProcessor.generateRouteStatement(node, routeMeta.getRouteHolderIdentifier(), routeMeta.getControllerInstanceIdentifier(), validator, method, path),
      'end'
    )
  }

  private static generateRouteStatement(methodDeclaration: ts.MethodDeclaration, routeHolderIdentifier: ts.Identifier, routeInstanceIdentifier: ts.Identifier, validator: ts.ArrowFunction, method: string, path: string) {
    const methodName = methodDeclaration.name as ts.MemberName;
    const methodAccess = ts.factory.createPropertyAccessExpression(routeInstanceIdentifier, methodName);
    const methodBinding = ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(methodAccess, "bind"),
      [],
      [routeInstanceIdentifier]
    )

    return ts.factory.createExpressionStatement(
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(routeHolderIdentifier, "route"),
        [],
        [
          ts.factory.createStringLiteral(method),
          ts.factory.createStringLiteral(path),
          methodBinding,
          validator
        ],
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

  private static resolveOutputType(project: IProject, methodSignature: ts.Signature): ts.Type {
    const returnType = methodSignature.getReturnType();
    const returnTypeDeclaration = returnType.symbol?.declarations?.[0];
    if (!returnTypeDeclaration) {
      throw new Error("Handler chain return type declaration not found");
    }
    if (!isNornirLib(returnTypeDeclaration.getSourceFile().fileName)) {
      throw new Error("Handler chain return must be a Nornir class");
    }
    if (!isTypeReference(returnType)) {
      throw new Error("Handler chain return must use a type reference");
    }
    const typeArguments = project.checker.getTypeArguments(returnType);
    const [, outputType] = typeArguments;
    return outputType;
  }
}
