import path from "node:path";
import { OpenAPIV3 } from "openapi-types";
import { Project } from "./project";

export abstract class SpecFile {
  public static getSpecFilePath(project: Project) {
    const tsconfigPath = project.compilerOptions.configFilePath;
    return `${path.dirname(tsconfigPath as string)}/openapi.json`;
  }

  public static getSpecFile(project: Project): OpenAPIV3.Document | undefined {
    const specFilePath = this.getSpecFilePath(project);
    const specFile = project.compilerHost.readFile(specFilePath);
    if (!specFile) {
      return;
    }
    return JSON.parse(specFile);
  }

  public static setSpecFile(project: Project, specFile: OpenAPIV3.Document) {
    const specFilePath = this.getSpecFilePath(project);
    project.compilerHost.writeFile(specFilePath, JSON.stringify(specFile, undefined, 2), false);
  }
}
