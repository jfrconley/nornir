import { schemaToValidator } from "@nrfcloud/ts-json-schema-transformer/utils";
import { createWrappedNode, MethodDeclaration, TypeNode, TypeReferenceNode } from "ts-morph";
import { isTypeReference } from "tsutils";
import ts from "typescript";
import { ControllerMeta } from "../../controller-meta";
import { getStringLiteralOrConst, isNornirLib } from "../../lib";
import { IProject } from "../../project";
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

    const wrappedNode = createWrappedNode(node, { typeChecker: project.checker }) as MethodDeclaration;

    const inputType = ChainRouteProcessor.resolveInputType(wrappedNode);

    // const outputType = ChainRouteProcessor.resolveOutputType(project, methodSignature);

    const inputSchema = project.schemaGenerator.createSchemaFromNodes([inputType.compilerNode as any]);

    console.log(inputType.getKindName());

    const inputValidator = schemaToValidator(inputSchema, project.options.validation);

    routeMeta.registerRoute(node, {
      method,
      path,
      input: inputType.getType().compilerType,
      output: {} as any,
      // description,
      // summary,
      filePath: node.getSourceFile().fileName,
    });

    FileTransformer.addStatementToFile(
      node.getSourceFile(),
      ChainRouteProcessor.generateRouteStatement(
        node,
        routeMeta.getRouteHolderIdentifier(),
        routeMeta.getControllerInstanceIdentifier(),
        inputValidator,
        method,
        path,
      ),
      "end",
    );
  }

  private static generateRouteStatement(
    methodDeclaration: ts.MethodDeclaration,
    routeHolderIdentifier: ts.Identifier,
    routeInstanceIdentifier: ts.Identifier,
    validator: ts.Expression,
    method: string,
    path: string,
  ) {
    const methodName = methodDeclaration.name as ts.MemberName;
    const methodAccess = ts.factory.createPropertyAccessExpression(routeInstanceIdentifier, methodName);
    const methodBinding = ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(methodAccess, "bind"),
      [],
      [routeInstanceIdentifier],
    );

    return ts.factory.createExpressionStatement(
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(routeHolderIdentifier, "route"),
        [],
        [
          ts.factory.createStringLiteral(method),
          ts.factory.createStringLiteral(path),
          methodBinding,
          validator,
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

  private static resolveInputType(method: MethodDeclaration): TypeNode {
    const params = method.getParameters();
    if (params.length !== 1) {
      throw new Error("Handler chain must have 1 parameter");
    }
    const [param] = params;
    const paramTypePath = param.getType().getSymbol()?.getDeclarations()?.[0].getSourceFile().getFilePath();
    if (!isNornirLib(paramTypePath || "")) {
      throw new Error("Handler chain input must be a Nornir class");
    }
    const paramTypeNode = param.getTypeNodeOrThrow() as TypeReferenceNode;
    const paramTypeArgs = paramTypeNode.getTypeArguments();
    if (paramTypeArgs.length !== 1) {
      throw new Error("Handler chain input must have a type argument");
    }

    return paramTypeArgs[0];
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
    const [outputType] = typeArguments;
    return outputType;
  }
}
