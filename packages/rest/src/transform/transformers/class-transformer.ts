import ts from "typescript";
import { ControllerMeta } from "../controller-meta";
import { separateNornirDecorators } from "../lib";
import { Project } from "../project";
import { ControllerProcessor } from "./decorator-transofmers/controller-processor";

export abstract class ClassTransformer {
  public static transform(project: Project, node: ts.ClassDeclaration): ts.ClassDeclaration {
    const originalDecorators = ts.getDecorators(node) || [];
    if (!originalDecorators) return node;
    const modifiers = ts.getModifiers(node) || [];

    const { otherDecorators, nornirDecorators } = separateNornirDecorators(project, originalDecorators);

    ControllerMeta.create(project, node);

    for (const { decorator, declaration } of nornirDecorators) {
      const { name } = project.checker.getTypeAtLocation(declaration.parent).symbol;
      const processor = CLASS_DECORATOR_PROCESSORS[name];
      if (!processor) throw new Error(`No processor for decorator ${name}`);
      processor(project, node, decorator);
    }

    return ts.factory.createClassDeclaration(
      [...modifiers, ...otherDecorators],
      node.name,
      node.typeParameters,
      node.heritageClauses,
      node.members,
    );
  }
}

type Task = (project: Project, node: ts.ClassDeclaration, decorator: ts.Decorator) => void;

const CLASS_DECORATOR_PROCESSORS: Record<string, Task> = {
  Controller: ControllerProcessor.process,
};
