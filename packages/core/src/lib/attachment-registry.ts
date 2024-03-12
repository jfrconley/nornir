import { NornirMissingAttachmentException } from "./error.js";

export interface AttachmentKey<T> {
  readonly id: symbol;
  readonly marker: T;
}

interface ConstantRegistryItem<T = unknown> {
  type: "constant";
  value: T;
}

export type RegistryFactory<T> = (registry: AttachmentRegistry) => T;

interface FactoryRegistryItem<T = unknown> {
  type: "factory";
  factory: RegistryFactory<T>;
  value?: T;
}

type RegistryItem<T = unknown> = ConstantRegistryItem<T> | FactoryRegistryItem<T>;

export class AttachmentRegistry {
  private attachments = new Map<symbol, RegistryItem>();

  public static createKey<T>(): AttachmentKey<T> {
    return {
      id: Symbol(),
      marker: 0 as never,
    };
  }

  public register<T>(value: T) {
    const key = AttachmentRegistry.createKey<T>();
    this.put(key, value);
    return key;
  }

  public registerFactory<T>(factory: RegistryFactory<T>) {
    const key = AttachmentRegistry.createKey<T>();
    this.putFactory(key, factory);
    return key;
  }

  public put<T>(key: AttachmentKey<T>, value: T): void {
    this.attachments.set(key.id, {
      type: "constant",
      value,
    });
  }

  public putFactory<T>(key: AttachmentKey<T>, factory: RegistryFactory<T>): void {
    this.attachments.set(key.id, {
      type: "factory",
      factory,
    });
  }

  public delete<T>(key: AttachmentKey<T>): void {
    this.attachments.delete(key.id);
  }

  public get<T>(key: AttachmentKey<T>): T | null {
    if (this.has(key)) {
      return this.resolveItem(this.attachments.get(key.id) as RegistryItem<T>);
    }
    return null;
  }

  private resolveItem<T>(item: RegistryItem<T>): T {
    if (item.type === "constant") {
      return item.value;
    }
    if (item.value === undefined) {
      item.value = item.factory(this);
    }
    return item.value;
  }

  public getAssert<T>(key: AttachmentKey<T>): T {
    if (!this.has(key)) {
      throw new NornirMissingAttachmentException();
    }
    return this.resolveItem(this.attachments.get(key.id)! as RegistryItem<T>);
  }

  public has<T>(key: AttachmentKey<T>): boolean {
    return this.attachments.has(key.id);
  }

  public hasAll(keys: AttachmentKey<unknown>[]): boolean {
    const size = keys.length;
    for (let i = 0; i < size; i++) {
      if (!this.attachments.has(keys[i].id)) {
        return false;
      }
    }
    return true;
  }

  public hasAny(keys: AttachmentKey<unknown>[]): boolean {
    const size = keys.length;
    for (let i = 0; i < size; i++) {
      if (this.attachments.has(keys[i].id)) {
        return true;
      }
    }
    return false;
  }

  public merge(...registries: AttachmentRegistry[]) {
    for (const registry of registries) {
      for (const [key, value] of registry.attachments) {
        this.attachments.set(key, value);
      }
    }
  }
}
