import { rmSync } from "fs";
import ts from "typescript";
import { ControllerMeta, OpenApiSpecHolder } from "../controller-meta";
import { TransformationError } from "../error";
import { log } from "../lib";
import { Project } from "../project.js";
import { NodeTransformer } from "./node-transformer";

export abstract class FileTransformer {
  public static transform(project: Project, context: ts.TransformationContext, file: ts.SourceFile): ts.SourceFile {
    if (file.isDeclarationFile) return file;
    // return file;
    const transformed = FileTransformer.iterateNode(project, context, file, file);

    const outputFileNames = ts.getOutputFileNames(project.parsedCommandLine, file.fileName, false);
    const schemaFileName = `${outputFileNames[0]}.nornir.oas.json`;

    const { compilerHost } = project;
    const nodesToAdd = FileTransformer.getStatementsForFile(file);
    if (nodesToAdd == undefined) {
      // delete schema file if it exists
      if (compilerHost.fileExists(schemaFileName)) {
        rmSync(schemaFileName);
      }
      return transformed;
    }

    const updated = ts.factory.updateSourceFile(
      transformed,
      [
        ...nodesToAdd.start,
        ...transformed.statements,
        ...nodesToAdd.end,
      ],
      file.isDeclarationFile,
      file.referencedFiles,
      file.typeReferenceDirectives,
      file.hasNoDefaultLib,
      file.libReferenceDirectives,
    );

    const mergedSpec = OpenApiSpecHolder.getSpecForFile(file);

    compilerHost.writeFile(schemaFileName, JSON.stringify(mergedSpec, null, 2), false, undefined, []);

    FileTransformer.FILE_NODE_MAP.delete(file.fileName);
    FileTransformer.IMPORT_MAP.delete(file.fileName);
    ControllerMeta.clearCache();
    return updated;
  }

  private static FILE_NODE_MAP = new Map<string, {
    start: ts.Statement[];
    end: ts.Statement[];
  }>();

  private static iterateNode<T extends ts.Node>(
    project: Project,
    context: ts.TransformationContext,
    source: ts.SourceFile,
    node: T,
  ): T {
    return ts.visitEachChild(
      FileTransformer.tryTransformNode(project, source, node, context),
      (child) => FileTransformer.iterateNode(project, context, source, child),
      context,
    ) as T;
  }

  private static tryTransformNode(
    project: Project,
    source: ts.SourceFile,
    node: ts.Node,
    context: ts.TransformationContext,
  ): ts.Node {
    try {
      return NodeTransformer.transform(project, source, node, context);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error instanceof TransformationError) throw error;
      log(error);

      const file: ts.SourceFile = node.getSourceFile();
      const {
        line,
        character,
      } = file.getLineAndCharacterOfPosition(
        node.pos,
      );
      error.message += ` - ${file.fileName}:${line + 1}:${character + 1}`;
      throw error;
    }
  }

  public static addStatementToFile(file: ts.SourceFile, statement: ts.Statement, type: "start" | "end") {
    const nodes = FileTransformer.FILE_NODE_MAP.get(file.fileName) || {
      start: [],
      end: [],
    };
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
