import ts from "typescript";
import { IProject } from "../project";
import { ClassTransformer } from "./class-transformer";
import { MethodTransformer } from "./method-transformer";

export abstract class NodeTransformer {
  public static transform(project: IProject, node: ts.Node): ts.Node {
    if (ts.isClassDeclaration(node)) {
      return ClassTransformer.transform(project, node);
    }

    if (ts.isMethodDeclaration(node)) {
      return MethodTransformer.transform(project, node);
    }
    return node;
  }
}
