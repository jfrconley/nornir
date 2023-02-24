import { NornirMissingAttachmentException } from "./error.js";

export interface IAttachmentKey<T> {
  readonly id: symbol;
  readonly marker: T;
}

export class AttachmentRegistry {
  private attachments = new Map<symbol, unknown>();

  public static createKey<T>(): IAttachmentKey<T> {
    return {
      id: Symbol(),
      marker: 0 as never,
    };
  }

  public put<T>(key: IAttachmentKey<T>, value: T): void {
    this.attachments.set(key.id, value);
  }

  public delete<T>(key: IAttachmentKey<T>): void {
    this.attachments.delete(key.id);
  }

  public get<T>(key: IAttachmentKey<T>): T | null {
    return this.attachments.get(key.id) as T;
  }

  public getAssert<T>(key: IAttachmentKey<T>): T {
    if (!this.has(key)) {
      throw new NornirMissingAttachmentException();
    }
    return this.attachments.get(key.id) as T;
  }

  public has<T>(key: IAttachmentKey<T>): boolean {
    return this.attachments.has(key.id);
  }

  public hasAll(keys: IAttachmentKey<unknown>[]): boolean {
    const size = keys.length;
    for (let i = 0; i < size; i++) {
      if (!this.attachments.has(keys[i].id)) {
        return false;
      }
    }
    return true;
  }

  public hasAny(keys: IAttachmentKey<unknown>[]): boolean {
    const size = keys.length;
    for (let i = 0; i < size; i++) {
      if (this.attachments.has(keys[i].id)) {
        return true;
      }
    }
    return false;
  }
}
