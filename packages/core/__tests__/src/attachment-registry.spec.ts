import { describe, jest } from "@jest/globals";
import { AttachmentKey, AttachmentRegistry, RegistryFactory } from "../../dist/lib/attachment-registry.js";
import { NornirMissingAttachmentException } from "../../dist/lib/error.js";

describe("AttachmentRegistry", () => {
  let registry: AttachmentRegistry;

  beforeEach(() => {
    registry = new AttachmentRegistry();
  });

  describe("#register", () => {
    it("registers a value and returns a key", () => {
      const key = registry.register("value");
      expect(registry.get(key)).toBe("value");
    });
  });

  describe("#registerFactory", () => {
    it("registers a factory and returns a key", () => {
      const factory: RegistryFactory<string> = jest.fn(() => "value");
      const key = registry.registerFactory(factory);
      expect(registry.get(key)).toBe("value");
    });

    it("caches the result of the factory", () => {
      const factory: RegistryFactory<string> = jest.fn(() => "value");
      const key = registry.registerFactory(factory);
      expect(registry.get(key)).toBe("value");
      expect(registry.get(key)).toBe("value");
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe("#put", () => {
    it("puts a constant value in the registry", () => {
      const key = AttachmentRegistry.createKey<string>();
      registry.put(key, "value");
      expect(registry.get(key)).toBe("value");
    });
  });

  describe("#putFactory", () => {
    it("puts a factory in the registry", () => {
      const factory: RegistryFactory<string> = jest.fn(() => "value");
      const key = AttachmentRegistry.createKey<string>();
      registry.putFactory(key, factory);
      expect(registry.get(key)).toBe("value");
    });
  });

  describe("#delete", () => {
    it("deletes value from the registry by key", () => {
      const key = registry.register("value");
      registry.delete(key);
      expect(registry.get(key)).toBeNull();
    });
  });

  describe("#getAssert", () => {
    it("gets a value from the registry or throws", () => {
      const key = registry.register("value");
      expect(registry.getAssert(key)).toBe("value");
    });

    it("throws NornirMissingAttachmentException if key does not exist in registry", () => {
      const key = AttachmentRegistry.createKey<string>();
      expect(() => registry.getAssert(key)).toThrow(NornirMissingAttachmentException);
    });
  });

  describe("#has", () => {
    it("checks if a key exists in the registry", () => {
      const key = registry.register("value");
      expect(registry.has(key)).toBe(true);
      registry.delete(key);
      expect(registry.has(key)).toBe(false);
    });
  });

  describe("#hasAll", () => {
    it("checks if all keys exist in the registry", () => {
      const keys = [registry.register("value1"), registry.register("value2")];
      expect(registry.hasAll(keys)).toBe(true);
      registry.delete(keys[0]);
      expect(registry.hasAll(keys)).toBe(false);
    });
  });

  describe("#hasAny", () => {
    it("checks if any key exists in the registry", () => {
      const keys = [registry.register("value1"), AttachmentRegistry.createKey<string>()];
      expect(registry.hasAny(keys)).toBe(true);
    });
  });

  describe("#merge", () => {
    it("merges two registries", () => {
      const key = registry.register("value");
      const other = new AttachmentRegistry();
      other.put(key, "other");
      registry.merge(other);
      expect(registry.get(key)).toBe("other");
    });
  });
});
