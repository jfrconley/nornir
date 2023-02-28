import ts from 'typescript';
export class TransformationError extends Error {
  constructor(message: string, node: ts.Node) {
    super(message);
    const file: ts.SourceFile = node.getSourceFile();
    const { line, character } = file.getLineAndCharacterOfPosition(
      node.pos,
    );
    this.message += ` - ${file.fileName}:${line + 1}:${character + 1}`;
  }
}
