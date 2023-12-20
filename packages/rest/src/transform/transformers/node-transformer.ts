import ts from "typescript";
import { Project } from "../project";
import { ClassTransformer } from "./class-transformer";

export abstract class NodeTransformer {
  public static transform(
    project: Project,
    source: ts.SourceFile,
    node: ts.Node,
    context: ts.TransformationContext,
  ): ts.Node {
    if (ts.isClassDeclaration(node)) {
      return ClassTransformer.transform(project, source, node as ts.ClassDeclaration, context);
    }

    return node;
  }
}
