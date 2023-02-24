import ts from "typescript";
import { AssertProgrammer } from "typia/lib/programmers/AssertProgrammer";
import { IProject } from "../../project";
import { FileTransfomer } from "../file-transfomer";

const MESSAGES = {
  NOT_SPECIFIED: `Error on nornir.assert(): generic argument is not specified.`,
  GENERIC_ARGUMENT: `Error on typia.assert(): non-specified generic argument.`,
};

export namespace AssertTransformer {
  export function transform(project: IProject, expression: ts.CallExpression): ts.Expression {
    if (!expression.typeArguments?.[0]) {
      throw new Error(MESSAGES.NOT_SPECIFIED);
    }

    // GET TYPE INFO
    const type: ts.Type = project.checker.getTypeFromTypeNode(
      expression.typeArguments[0],
    );
    if (type.isTypeParameter()) {
      throw new Error(MESSAGES.GENERIC_ARGUMENT);
    }

    const parentChain = expression.expression.getChildAt(0);
    const typiaImport = FileTransfomer.getOrCreateTypiaImport(expression.getSourceFile());
    const typiaAssert = ts.factory.createPropertyAccessExpression(typiaImport, "assert");
    if (ts.isCallOrNewExpression(parentChain)) {
      return ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(parentChain, "assert"),
        [],
        [
          AssertProgrammer.generate(project, typiaAssert, false)(type),
        ],
      );
    }
    return expression;
  }
}
