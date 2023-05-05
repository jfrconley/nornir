import ts from "typescript";
import { separateNornirDecorators } from "../lib";
import { Project } from "../project";
import { ControllerProcessor } from "./processors/controller-processor";

export abstract class ClassTransformer {
  public static transform(project: Project, node: ts.ClassDeclaration, context: ts.TransformationContext): ts.Node {
    const originalDecorators = ts.getDecorators(node) || [];
    if (!originalDecorators) return node;

    const { nornirDecorators } = separateNornirDecorators(project, originalDecorators);
    if (nornirDecorators.length === 0) return node;

    return ControllerProcessor.process(project, node, nornirDecorators, context);
  }
}
