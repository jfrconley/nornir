import { Swagger } from "atlassian-openapi";
import _ from "lodash";
import { isPresent } from "ts-is-present";
import { MergeInput, SingleMergeInput } from "./data";

function getInfoDescriptionWithHeading(mergeInput: SingleMergeInput): string | undefined {
  const { description } = mergeInput.oas.info;

  if (description === undefined) {
    return undefined;
  }

  const trimmedDescription = description.trimRight();

  if (mergeInput.description === undefined || mergeInput.description.title === undefined) {
    return trimmedDescription;
  }

  const { title } = mergeInput.description;

  const headingLevel = title.headingLevel || 1;

  return `${"#".repeat(headingLevel)} ${title.value}\n\n${trimmedDescription}`;
}

export function mergeInfos(mergeInput: MergeInput): Swagger.Info {
  const finalInfo = _.cloneDeep(mergeInput[0].oas.info);

  const appendedDescriptions = mergeInput
    .filter(i => i.description && i.description.append)
    .map(getInfoDescriptionWithHeading)
    .filter(isPresent);

  if (appendedDescriptions.length > 0) {
    finalInfo.description = appendedDescriptions.join("\n\n");
  }

  return finalInfo;
}
