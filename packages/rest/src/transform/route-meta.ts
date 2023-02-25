import ts from "typescript";

export class RouteMeta {
  private static cache = new Map<ts.Identifier, RouteMeta>();
  private routeHolderIdentifier?: ts.Identifier;
  private routeInstanceIdentifier?: ts.Identifier;
  private basePath?: string;

  public static create(route: ts.ClassDeclaration): RouteMeta {
    const name = route.name;
    if (!name) {
      throw new Error("Route class must have a name");
    }
    if (this.cache.has(name)) {
      throw new Error("Route already exists: " + name.getText());
    }
    const meta = new RouteMeta(route, name);
    this.cache.set(name, meta);
    return meta;
  }

  public static get(route: ts.ClassDeclaration): RouteMeta | undefined {
    const name = route.name;
    if (!name) {
      throw new Error("Route class must have a name");
    }
    return this.cache.get(name);
  }

  public static getAssert(route: ts.ClassDeclaration): RouteMeta {
    const meta = this.get(route);
    if (!meta) {
      throw new Error("Route not found: " + route.getText());
    }
    return meta;
  }

  private constructor(
    public readonly route: ts.ClassDeclaration,
    public readonly identifier: ts.Identifier,
  ) {}

  public getRouteHolderIdentifier(): ts.Identifier {
    if (!this.isRegistered) {
      throw new Error("Route not registered");
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.routeHolderIdentifier!;
  }

  public get isRegistered(): boolean {
    return (this.basePath != null && this.routeHolderIdentifier != null);
  }
  public registerRouteHolder(
    routeHandlerIdentifier: ts.Identifier,
    routeInstanceIdentifier: ts.Identifier,
    basePath: string,
  ) {
    if (this.isRegistered) {
      throw new Error("Route already registered");
    }
    this.basePath = basePath;
    this.routeInstanceIdentifier = routeInstanceIdentifier;
    this.routeHolderIdentifier = routeHandlerIdentifier;
  }
}
