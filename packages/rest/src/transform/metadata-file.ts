import { IProject } from './project';
import ts from 'typescript';
import { ControllerMeta, RouteInfo } from './controller-meta';
import path from 'path';

const METADATA_FILE_NAME = 'nornir-rest-metadata.json';
const METADATA_VERSION = '1.0.0';

export abstract class MetadataFileUtils {
  private static resolveMetadataFilePath(project: IProject) {
    const outDir = project.compilerOptions.outDir
    return path.join(outDir || "", METADATA_FILE_NAME);
    // const { compilerOptions } = project;
    // const { outDir } = compilerOptions;
    // project.program.getCurrentDirectory()
    // return metadataFilePath;
  }

  public static load(project: IProject) {
    const metadataFilePath = MetadataFileUtils.resolveMetadataFilePath(project);
    const metadataFile = project.compilerHost.readFile(metadataFilePath);
    if (!metadataFile) {
      return;
    }
    const metadata = JSON.parse(metadataFile) as MetadataFile;
    return metadata
  }

  public static loadOrCreate(project: IProject): MetadataFile {
    return MetadataFileUtils.load(project) || { metadataVersion: METADATA_VERSION, routes: {} };
  }

  public static pruneMissing(metadata: MetadataFile, files: Readonly<string[]>) {
    const currentFiles = Object.keys(metadata.routes);
    const missingFiles = currentFiles.filter((file) => !files.includes(file));
    for (const file of missingFiles) {
      delete metadata.routes[file];
    }
  }

  public static setRoutes(metadata: MetadataFile) {
    const routes = ControllerMeta.getRoutes();
    const routesByFile = routes.reduce((acc, route) => {
      const { filePath } = route;
      if (!acc[filePath]) {
        acc[filePath] = [];
      }
      acc[filePath].push(route);
      return acc;
    }, {} as MetadataFile["routes"]);
    Object.assign(metadata.routes, routesByFile);
  }

  public static save(project: IProject, metadata: MetadataFile) {
    const metadataFilePath = MetadataFileUtils.resolveMetadataFilePath(project);
    const metadataFile = JSON.stringify(metadata, null, 2);
    project.compilerHost.writeFile(metadataFilePath, metadataFile, false);
  }
}

export interface MetadataFile {
  metadataVersion: string;
  routes: {[fileName: string]: RouteInfo[]}
}
