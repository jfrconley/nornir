import ts from "typescript";
import { ControllerMeta } from "../controller-meta";
import { TransformationError } from "../error";
import { Project } from "../project.js";
import { NodeTransformer } from "./node-transformer";

export abstract class FileTransformer {
  public static transform(project: Project, context: ts.TransformationContext, file: ts.SourceFile): ts.SourceFile {
    if (file.isDeclarationFile) return file;
    // return file;
    const transformed = FileTransformer.iterateNode(project, context, file);

    const nodesToAdd = FileTransformer.getStatementsForFile(file);
    if (nodesToAdd == undefined) return transformed;

    const updated = ts.factory.updateSourceFile(
      transformed,
      [
        ...nodesToAdd.start,
        ...transformed.statements,
        ...nodesToAdd.end,
      ],
    );

    FileTransformer.FILE_NODE_MAP.delete(file.fileName);
    FileTransformer.IMPORT_MAP.delete(file.fileName);
    ControllerMeta.clearCache();
    return updated;
  }

  private static FILE_NODE_MAP = new Map<string, { start: ts.Statement[]; end: ts.Statement[] }>();

  private static iterateNode<T extends ts.Node>(
    project: Project,
    context: ts.TransformationContext,
    node: T,
  ) {
    const visitor = (child: ts.Node): ts.VisitResult<ts.Node> => {
      const transformed = FileTransformer.tryTransformNode(project, child, context);
      return ts.visitEachChild(transformed, visitor, context);
    };

    return ts.visitEachChild(node, visitor, context);
  }

  private static tryTransformNode(project: Project, node: ts.Node, context: ts.TransformationContext): ts.Node {
    try {
      return NodeTransformer.transform(project, node, context);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error instanceof TransformationError) throw error;
      console.error(error);

      const file: ts.SourceFile = node.getSourceFile();
      const { line, character } = file.getLineAndCharacterOfPosition(
        node.pos,
      );
      error.message += ` - ${file.fileName}:${line + 1}:${character + 1}`;
      throw error;
    }
  }

  public static addStatementToFile(file: ts.SourceFile, statement: ts.Statement, type: "start" | "end") {
    const nodes = FileTransformer.FILE_NODE_MAP.get(file.fileName) || { start: [], end: [] };
    nodes[type].push(statement);
    FileTransformer.FILE_NODE_MAP.set(file.fileName, nodes);
  }

  public static getStatementsForFile(file: ts.SourceFile) {
    return FileTransformer.FILE_NODE_MAP.get(file.fileName) || undefined;
  }

  private static IMPORT_MAP = new Map<string, Map<string, Map<string, ts.Identifier>>>();
  public static getOrCreateImport(file: ts.SourceFile, packageName: string, namedImport: string): ts.Identifier {
    const imports = FileTransformer.IMPORT_MAP.get(file.fileName) || new Map<string, Map<string, ts.Identifier>>();
    FileTransformer.IMPORT_MAP.set(file.fileName, imports);
    const namedImports = imports.get(packageName) || new Map<string, ts.Identifier>();
    imports.set(packageName, namedImports);

    let importIdentifier = namedImports.get(namedImport);
    if (importIdentifier != undefined) return importIdentifier;
    importIdentifier = ts.factory.createUniqueName(namedImport);
    namedImports.set(namedImport, importIdentifier);

    if (file.impliedNodeFormat == undefined || file.impliedNodeFormat === ts.ModuleKind.CommonJS) {
      FileTransformer.addStatementToFile(
        file,
        ts.factory.createVariableStatement(
          undefined,
          [ts.factory.createVariableDeclaration(
            importIdentifier,
            undefined,
            undefined,
            ts.factory.createPropertyAccessExpression(
              ts.factory.createCallExpression(
                ts.factory.createIdentifier("require"),
                undefined,
                [ts.factory.createStringLiteral(packageName)],
              ),
              namedImport,
            ),
          )],
        ),
        "start",
      );
    } else {
      FileTransformer.addStatementToFile(
        file,
        ts.factory.createImportDeclaration(
          undefined,
          ts.factory.createImportClause(
            false,
            undefined,
            ts.factory.createNamedImports([
              ts.factory.createImportSpecifier(false, ts.factory.createIdentifier(namedImport), importIdentifier),
            ]),
          ),
          ts.factory.createStringLiteral(packageName),
        ),
        "start",
      );
    }

    FileTransformer.IMPORT_MAP.set(file.fileName, imports);
    return importIdentifier;
  }
}
