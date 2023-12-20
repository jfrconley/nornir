import { schemaToValidator } from "@nrfcloud/ts-json-schema-transformer/utils";
import tsp from "ts-morph";
import ts from "typescript";
import { ControllerMeta, RouteIndex } from "../../controller-meta";
import { TransformationError } from "../../error";
import { moveRefsToAllOf } from "../../json-schema-utils";
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

    const routeIndex = controller.getRouteIndex({ method, path });

    const { typeNode: inputTypeNode } = ChainRouteProcessor.resolveInputType(project, node, routeIndex);

    const outputType = ChainRouteProcessor.resolveOutputType(project, node, routeIndex);

    const { inputSchema, outputSchema } = ChainRouteProcessor.generateInputOutputSchema(
      project,
      routeIndex,
      inputTypeNode,
      outputType.node,
    );

    const inputValidator = schemaToValidator(moveRefsToAllOf(inputSchema), project.options.validation);

    const parsedDocComments = ChainRouteProcessor.parseJSDoc(project, node);

    controller.registerRoute(node, {
      method,
      path,
      input: inputTypeNode,
      inputSchema,
      outputSchema: outputSchema,
      // FIXME: this should be the output type not the input type
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
    // ts.setOriginalNode(recreatedNode, node);

    return recreatedNode;
  }

  private static generateInputOutputSchema(
    project: Project,
    routeIndex: RouteIndex,
    inputTypeNode: ts.TypeNode,
    outputTypeNode: ts.TypeNode,
  ) {
    try {
      const inputSchema = project.schemaGenerator.createSchemaFromNodes([inputTypeNode]);
      const outputSchema = project.schemaGenerator.createSchemaFromNodes([outputTypeNode]);
      return {
        inputSchema,
        outputSchema,
      };
    } catch (e) {
      console.error(e);
      throw new TransformationError(`Could not generate schema for route`, routeIndex);
    }
  }

  private static parseJSDoc(_project: Project, method: ts.MethodDeclaration): RouteTags {
    const docs = ts.getJSDocCommentsAndTags(method);
    const topLevel = docs[0];
    if (!topLevel) {
      return {};
    }
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

  private static getMethod(_project: Project, methodDecorator: NornirDecoratorInfo): string {
    const name = methodDecorator.symbol.name;
    return ChainMethodDecoratorTypeMap[name as keyof typeof ChainMethodDecoratorTypeMap];
  }

  private static resolveInputType(
    project: Project,
    method: ts.MethodDeclaration,
    routeIndex: RouteIndex,
  ): { type: ts.Type; typeNode: ts.TypeNode } {
    const params = method.parameters;
    if (params.length !== 1) {
      throw new TransformationError("Handler chain must have 1 parameter", routeIndex);
    }
    const [param] = params;
    const paramTypeNode = param.type;
    if (!paramTypeNode || !ts.isTypeReferenceNode(paramTypeNode)) {
      throw new TransformationError("Handler chain parameter must have a type", routeIndex);
    }

    const paramType = project.checker.getTypeFromTypeNode(paramTypeNode);
    const paramDeclaration = paramType.symbol?.declarations?.[0];
    if (!paramDeclaration || !isNornirNode(paramDeclaration)) {
      throw new TransformationError("Handler chain input must be a Nornir class", routeIndex);
    }

    // const paramTypeNode = project.checker.typeToTypeNode(paramType, undefined, undefined) as ts.TypeReferenceNode;
    const [paramTypeArg] = paramTypeNode.typeArguments || [];

    const paramTypeArgType = project.checker.getTypeFromTypeNode(paramTypeArg);

    if (!paramTypeArg) {
      throw new TransformationError("Handler chain input must have a type argument", routeIndex);
    }

    return {
      type: paramTypeArgType,
      typeNode: paramTypeArg,
    };
  }

  private static resolveOutputType(
    project: Project,
    methodDeclaration: ts.MethodDeclaration,
    routeIndex: RouteIndex,
  ): { type: ts.Type; node: ts.TypeNode } {
    const returnedTypeNode = methodDeclaration.type;

    if (returnedTypeNode == null) {
      throw new TransformationError(
        "Endpoint is missing an explicit return type. Explicit return types are required for all endpoints to promote contract stability",
        routeIndex,
      );
    }
    if (!ts.isTypeReferenceNode(returnedTypeNode)) {
      throw new TransformationError("Endpoint return type must be a type reference", routeIndex);
    }

    const returnType = project.checker.getTypeFromTypeNode(returnedTypeNode);
    const returnTypeDeclaration = returnType.symbol.getDeclarations()?.[0];
    if (!returnTypeDeclaration || !isNornirNode(returnTypeDeclaration)) {
      throw new TransformationError("Handler chain output must be a Nornir class", routeIndex);
    }

    const [, returnTypeArg] = returnedTypeNode.typeArguments || [];
    if (returnTypeArg == null) {
      throw new TransformationError("Could not get the output type arguments", routeIndex);
    }

    return {
      type: project.checker.getTypeFromTypeNode(returnTypeArg),
      node: returnTypeArg,
    };
  }
}
