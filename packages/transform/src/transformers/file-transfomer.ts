import ts from "typescript";
import { IProject } from "../project.js";
import { NodeTransformer } from "./node-transformer";

export namespace FileTransfomer {
  export function tranform(
    project: IProject,
    context: ts.TransformationContext,
    file: ts.SourceFile,
  ): ts.SourceFile {
    if (file.isDeclarationFile) return file;

    const updated = ts.visitEachChild(
      file,
      (node) => iterate_node(project, context, node),
      context,
    );

    if (TYPIA_IMPORTS[updated.fileName]) {
      return ts.factory.updateSourceFile(updated, [
        ts.factory.createImportDeclaration(
          undefined,
          ts.factory.createImportClause(
            false,
            TYPIA_IMPORTS[updated.fileName],
            undefined,
          ),
          ts.factory.createStringLiteral("typia"),
        ),
        ...updated.statements,
      ]);
    }

    return updated;
  }
}

function iterate_node(
  project: IProject,
  context: ts.TransformationContext,
  node: ts.Node,
): ts.Node {
  return ts.visitEachChild(
    try_transform_node(project, node),
    (child) => iterate_node(project, context, child),
    context,
  );
}

function try_transform_node(project: IProject, node: ts.Node): ts.Node {
  try {
    return NodeTransformer.transform(project, node);
  } catch (exp) {
    if (!(exp instanceof Error)) throw exp;

    const file: ts.SourceFile = node.getSourceFile();
    const { line, character } = file.getLineAndCharacterOfPosition(
      node.pos,
    );
    exp.message += ` - ${file.fileName}:${line + 1}:${character + 1}`;
    throw exp;
  }
}

const TYPIA_IMPORTS: Record<string, ts.Identifier> = {};
export function getOrCreateTypiaImport(sourceFile: ts.SourceFile) {
  if (TYPIA_IMPORTS[sourceFile.fileName]) return TYPIA_IMPORTS[sourceFile.fileName];

  const identifier = ts.factory.createUniqueName("typia");
  TYPIA_IMPORTS[sourceFile.fileName] = identifier;
  return identifier;
}
