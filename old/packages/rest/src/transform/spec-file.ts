import { OpenAPIV3 } from "openapi-types";
import path from "path";
import { IProject } from "./project";

export abstract class SpecFile {
  public static getSpecFilePath(project: IProject) {
    const tsconfigPath = project.compilerOptions.configFilePath;
    return `${path.dirname(tsconfigPath as string)}/openapi.json`;
  }

  public static getSpecFile(project: IProject): OpenAPIV3.Document | undefined {
    const specFilePath = this.getSpecFilePath(project);
    const specFile = project.compilerHost.readFile(specFilePath);
    if (!specFile) {
      return;
    }
    return JSON.parse(specFile);
  }

  public static setSpecFile(project: IProject, specFile: OpenAPIV3.Document) {
    const specFilePath = this.getSpecFilePath(project);
    project.compilerHost.writeFile(specFilePath, JSON.stringify(specFile, null, 2), false);
  }
}
