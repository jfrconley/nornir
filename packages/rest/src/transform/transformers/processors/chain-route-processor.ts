import { schemaToValidator } from "@nrfcloud/ts-json-schema-transformer/utils";
import { createWrappedNode } from "ts-morph";
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

const TagMapper = {
  summary: (value?: string) => value,
  description: (value?: string) => value,
  deprecated: (value?: string) => value != "false",
  operationId: (value?: string) => value,
  tags: (value?: string) => value?.split(",").map(tag => tag.trim()) || [],
} as const;

const SupportedTags = Object.keys(TagMapper) as (keyof typeof TagMapper)[];

type RouteTags = {
  -readonly [K in keyof typeof TagMapper]?: Exclude<ReturnType<typeof TagMapper[K]>, undefined>;
};

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

    const { typeNode: inputTypeNode, type: inputType } = ChainRouteProcessor.resolveInputType(project, node);

    // const outputType = ChainRouteProcessor.resolveOutputType(project, methodSignature);

    const inputSchema = project.schemaGenerator.createSchemaFromNodes([inputTypeNode]);

    const inputValidator = schemaToValidator(inputSchema, project.options.validation);

    const parsedDocComments = ChainRouteProcessor.parseJSDoc(project, node);

    controller.registerRoute(node, {
      method,
      path,
      input: inputTypeNode,

      // FIXME: this should be the output type not the input type
      output: inputTypeNode,
      description: parsedDocComments.description,
      summary: parsedDocComments.summary,
      filePath: source.fileName,
      deprecated: parsedDocComments.deprecated,
      operationId: parsedDocComments.operationId,
      tags: parsedDocComments.tags,
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
    const recreatedNode = ts.factory.createMethodDeclaration(
      [...(ts.getModifiers(node) || []), ...otherDecorators],
      node.asteriskToken,
      node.name,
      node.questionToken,
      node.typeParameters,
      node.parameters,
      node.type,
      node.body,
    );

    ts.setTextRange(recreatedNode, node);
    ts.setOriginalNode(recreatedNode, node);

    return recreatedNode;
  }

  private static parseJSDoc(project: Project, method: ts.MethodDeclaration): RouteTags {
    const docs = ts.getJSDocCommentsAndTags(ts.getOriginalNode(method));
    const topLevel = docs[0];
    const description = ts.getTextOfJSDocComment(topLevel.comment);
    if (!ts.isJSDoc(topLevel)) {
      return {};
    }

    const tagSet = (topLevel.tags || [])
      .map(tag => [tag.tagName.escapedText as string, ts.getTextOfJSDocComment(tag.comment)] as const)
      .filter(tag => SupportedTags.includes(tag[0] as keyof typeof TagMapper))
      .map(tag => [tag[0], TagMapper[tag[0] as keyof typeof TagMapper](tag[1])]);

    tagSet.push(["description", description]);
    return Object.fromEntries(tagSet) as RouteTags;
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
    const name = methodDecorator.symbol.name;
    return ChainMethodDecoratorTypeMap[name as keyof typeof ChainMethodDecoratorTypeMap];
  }

  private static resolveInputType(
    project: Project,
    method: ts.MethodDeclaration,
  ): { type: ts.Type; typeNode: ts.TypeNode } {
    const params = method.parameters;
    if (params.length !== 1) {
      throw new Error("Handler chain must have 1 parameter");
    }
    const [param] = params;
    const paramTypeNode = param.type;
    if (!paramTypeNode || !ts.isTypeReferenceNode(paramTypeNode)) {
      throw new Error("Handler chain parameter must have a type");
    }

    const paramType = project.checker.getTypeFromTypeNode(paramTypeNode);
    const paramDeclaration = paramType.symbol?.declarations?.[0];
    if (!paramDeclaration || !isNornirNode(paramDeclaration)) {
      throw new Error("Handler chain input must be a Nornir class");
    }

    // const paramTypeNode = project.checker.typeToTypeNode(paramType, undefined, undefined) as ts.TypeReferenceNode;
    const [paramTypeArg] = paramTypeNode.typeArguments || [];

    const paramTypeArgType = project.checker.getTypeFromTypeNode(paramTypeArg);

    if (!paramTypeArg) {
      throw new Error("Handler chain input must have a type argument");
    }

    return {
      type: paramTypeArgType,
      typeNode: paramTypeArg,
    };
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
