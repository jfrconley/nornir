import { schemaToValidator } from "@nrfcloud/ts-json-schema-transformer/utils";
import { createWrappedNode, MethodDeclaration, TypeNode, TypeReferenceNode } from "ts-morph";
import { isTypeReference } from "tsutils";
import ts from "typescript";
import { ControllerMeta } from "../../controller-meta";
import { getStringLiteralOrConst, isNornirLib, NornirDecoratorInfo, separateNornirDecorators } from "../../lib";
import { Project } from "../../project";

export const ChainMethodDecoratorTypeMap = {
  GetChain: "GET",
  PostChain: "POST",
  PutChain: "PUT",
  DeleteChain: "DELETE",
  PatchChain: "PATCH",
  OptionsChain: "OPTIONS",
  HeadChain: "HEAD",
} as const;

export const ChainMethodDecoratorTypes = Object.keys(
  ChainMethodDecoratorTypeMap,
) as (keyof typeof ChainMethodDecoratorTypeMap)[];

export abstract class ChainRouteProcessor {
  public static transform(
    methodDecorator: NornirDecoratorInfo,
    project: Project,
    node: ts.MethodDeclaration,
    nornirDecorators: NornirDecoratorInfo[],
    controller: ControllerMeta,
  ): ts.MethodDeclaration {
    const path = ChainRouteProcessor.getPath(project, methodDecorator);
    const method = ChainRouteProcessor.getMethod(project, methodDecorator);

    const wrappedNode = createWrappedNode(node, { typeChecker: project.checker }) as MethodDeclaration;

    const inputType = ChainRouteProcessor.resolveInputType(wrappedNode);

    // const outputType = ChainRouteProcessor.resolveOutputType(project, methodSignature);

    const inputSchema = project.schemaGenerator.createSchemaFromNodes([inputType.compilerNode as never]);

    const inputValidator = schemaToValidator(inputSchema, project.options.validation);

    controller.registerRoute(node, {
      method,
      path,
      input: inputType.getType().compilerType,
      output: inputType.getType().compilerType,
      // description,
      // summary,
      filePath: node.getSourceFile().fileName,
    });

    controller.addInitializationStatement(
      ChainRouteProcessor.generateRouteStatement(
        node,
        controller.getRouteHolderIdentifier(),
        controller.getControllerInstanceIdentifier(),
        inputValidator,
        method,
        path,
      ),
    );
    const { otherDecorators } = separateNornirDecorators(project, ts.getDecorators(node) || []);
    return ts.factory.createMethodDeclaration(
      [...(ts.getModifiers(node) || []), ...otherDecorators],
      node.asteriskToken,
      node.name,
      node.questionToken,
      node.typeParameters,
      node.parameters,
      node.type,
      node.body,
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

  private static getPath(project: Project, methodDecorator: NornirDecoratorInfo): string {
    const methodDecoratorExpression = methodDecorator.decorator.expression;
    if (!ts.isCallExpression(methodDecoratorExpression)) {
      throw new Error(`Handler chain decorator is not a call expression`);
    }
    const args = methodDecoratorExpression.arguments;
    if (args.length !== 1) {
      throw new Error("Handler chain decorator must have 1 argument");
    }

    const [pathArg] = args;
    const path = getStringLiteralOrConst(project, pathArg);
    if (!path) {
      throw new Error("Handler chain decorator path must be a string literal or const");
    }
    return path;
  }

  private static getMethod(project: Project, methodDecorator: NornirDecoratorInfo): string {
    const name = project.checker.getTypeAtLocation(methodDecorator.declaration.parent).symbol.name;
    return ChainMethodDecoratorTypeMap[name as keyof typeof ChainMethodDecoratorTypeMap];
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

  private static resolveOutputType(project: Project, methodSignature: ts.Signature): ts.Type {
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
