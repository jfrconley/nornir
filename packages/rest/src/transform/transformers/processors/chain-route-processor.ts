import { schemaToValidator } from "@nrfcloud/ts-json-schema-transformer/utils";
import { isTypeReference } from "tsutils";
import ts from "typescript";
import { ControllerMeta } from "../../controller-meta";
import { getStringLiteralOrConst, isNornirNode, NornirDecoratorInfo, separateNornirDecorators } from "../../lib";
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
    source: ts.SourceFile,
    node: ts.MethodDeclaration,
    controller: ControllerMeta,
  ): ts.MethodDeclaration {
    const path = ChainRouteProcessor.getPath(project, methodDecorator);
    const method = ChainRouteProcessor.getMethod(project, methodDecorator);

    // const wrappedNode = createWrappedNode(node, { typeChecker: project.checker }) as MethodDeclaration;

    const inputTypeNode = ChainRouteProcessor.resolveInputType(project, node);
    const inputType = project.checker.getTypeFromTypeNode(inputTypeNode);

    // const outputType = ChainRouteProcessor.resolveOutputType(project, methodSignature);

    const inputSchema = project.schemaGenerator.createSchemaFromNodes([inputTypeNode]);

    const inputValidator = schemaToValidator(inputSchema, project.options.validation);

    controller.registerRoute(node, {
      method,
      path,
      input: inputType,

      // FIXME: this should be the output type not the input type
      output: inputType,
      // description,
      // summary,
      filePath: source.fileName,
    });

    controller.addInitializationStatement(
      ChainRouteProcessor.generateRouteStatement(
        node,
        controller.routeHolderIdentifier,
        controller.routeInstanceIdentifier,
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

  private static resolveInputType(project: Project, method: ts.MethodDeclaration): ts.TypeNode {
    const params = method.parameters;
    if (params.length !== 1) {
      throw new Error("Handler chain must have 1 parameter");
    }
    const [param] = params;
    const paramType = project.checker.getTypeAtLocation(param);
    const paramDeclaration = paramType.symbol?.declarations?.[0];
    if (!paramDeclaration || !isNornirNode(paramDeclaration)) {
      throw new Error("Handler chain input must be a Nornir class");
    }

    // eslint-disable-next-line unicorn/no-useless-undefined
    const paramTypeNode = project.checker.typeToTypeNode(paramType, undefined, undefined) as ts.TypeReferenceNode;
    const [paramTypeArg] = paramTypeNode.typeArguments || [];
    if (!paramTypeArg) {
      throw new Error("Handler chain input must have a type argument");
    }

    return paramTypeArg;
  }

  private static resolveOutputType(project: Project, methodSignature: ts.Signature): ts.Type {
    const returnType = methodSignature.getReturnType();
    const returnTypeDeclaration = returnType.symbol?.declarations?.[0];
    if (!returnTypeDeclaration) {
      throw new Error("Handler chain return type declaration not found");
    }
    if (!isNornirNode(returnTypeDeclaration)) {
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
