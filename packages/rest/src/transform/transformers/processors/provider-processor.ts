import ts from "typescript";
import { ControllerMeta } from "../../controller-meta";
import { NornirDecoratorInfo, separateNornirDecorators } from "../../lib";
import { Project } from "../../project";

export abstract class ProviderProcessor {
  public static transform(
    methodDecorator: NornirDecoratorInfo,
    project: Project,
    node: ts.MethodDeclaration,
    controller: ControllerMeta,
  ): ts.MethodDeclaration {
    const instantiateExpression = ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        controller.identifier,
        node.name.getText(),
      ),
      undefined,
      [],
    );

    controller.setInstanceProviderExpression(instantiateExpression);

    const { otherDecorators } = separateNornirDecorators(project, ts.getDecorators(node) || []);
    return ts.factory.createMethodDeclaration(
      [...(ts.getModifiers(node) || []), ...otherDecorators],
      node.asteriskToken,
      node.name,
      node.questionToken,
      node.typeParameters,
      node.parameters,
      node.type,
      node.body,
    );
  }
}
