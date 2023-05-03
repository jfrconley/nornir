import { describe, expect, jest } from "@jest/globals";
import { nornir, Result } from "../../dist/index.js";

describe("Nornir Tests", () => {
  describe("use()", () => {
    it("Should add basic middleware", async () => {
      const middlewareMock = jest.fn((input: { test: string; other: true }) => input.other);
      const chain: (input: { test: string; other: true }) => Promise<boolean> = nornir<{ test: string; other: true }>()
        .use(middlewareMock)
        .build();

      await expect(chain({ test: "test", other: true })).resolves.toBe(true);

      expect(middlewareMock).toHaveBeenCalledTimes(1);
      expect(middlewareMock).toHaveBeenCalledWith({ test: "test", other: true }, expect.anything());
    });

    it("Should throw when middleware throws", async () => {
      const middlewareMock = jest.fn(() => {
        throw new Error("boom");
      });
      const chain: (input: { test: string; other: true }) => Promise<boolean> = nornir<{ test: string; other: true }>()
        .use(middlewareMock)
        .build();

      await expect(chain({ test: "test", other: true })).rejects.toThrow("boom");

      expect(middlewareMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("useResult()", () => {
    it("Should add basic middleware", async () => {
      const middlewareMock = jest.fn((input: Result<{ test: string; other: true }>) => input.unwrap().other);
      const chain: (input: { test: string; other: true }) => Promise<boolean> = nornir<{ test: string; other: true }>()
        .useResult(middlewareMock)
        .build();

      await expect(chain({ test: "test", other: true })).resolves.toBe(true);

      expect(middlewareMock).toHaveBeenCalledTimes(1);
      expect(middlewareMock).toHaveBeenCalledWith(Result.ok({ test: "test", other: true }), expect.anything());
    });

    it("Should handle previous error result", async () => {
      const middlewareMock = jest.fn((result: Result<{ test: string; other: true }>) =>
        result
          .chain(() => Result.ok(false), () => Result.ok(true)).unwrap()
      );
      const chain: (input: { test: string; other: true }) => Promise<boolean> = nornir<{ test: string; other: true }>()
        .use(() => {
          throw new Error("boom");
        })
        .useResult(middlewareMock)
        .build();

      await expect(chain({ test: "test", other: true })).resolves.toBe(true);
      expect(middlewareMock).toHaveBeenCalledTimes(1);
      expect(middlewareMock).toHaveBeenCalledWith(Result.err(new Error("boom")), expect.anything());
    });
  });

  describe("useChain()", () => {
    it("Should compose chain", async () => {
      const nestedMiddlewareMock = jest.fn((input: string) => input.length);
      const middlewareMock = jest.fn((input: number) => input === 4);
      const chain: (input: { test: string; other: true }) => Promise<boolean> = nornir<{ test: string; other: true }>()
        .use(input => input.test)
        .useChain(
          nornir<string>()
            .use(nestedMiddlewareMock),
        )
        .use(middlewareMock)
        .build();

      await expect(chain({ test: "test", other: true })).resolves.toBe(true);
      expect(nestedMiddlewareMock).toHaveBeenCalledTimes(1);
      expect(nestedMiddlewareMock).toHaveBeenCalledWith("test", expect.anything());
      expect(middlewareMock).toHaveBeenCalledTimes(1);
      expect(middlewareMock).toHaveBeenCalledWith(4, expect.anything());
    });
  });

  describe("split()", () => {
    it("Should split items", async () => {
      const splitMiddlewareMock = jest.fn((input: { test: string; other: true }) => input.test);
      const middlewareMock = jest.fn((items: Result<string, Error>[]) => items.map(item => item.unwrap()));
      const chain: (input: { test: string; other: true }[]) => Promise<string[]> = nornir<
        { test: string; other: true }[]
      >()
        .split(nested => nested.use(splitMiddlewareMock))
        .use(middlewareMock)
        .build();

      await expect(chain([{ test: "test", other: true }, { test: "test2", other: true }])).resolves.toEqual([
        "test",
        "test2",
      ]);
      expect(splitMiddlewareMock).toHaveBeenCalledTimes(2);
      expect(splitMiddlewareMock).toHaveBeenCalledWith({ test: "test", other: true }, expect.anything());
      expect(splitMiddlewareMock).toHaveBeenCalledWith({ test: "test2", other: true }, expect.anything());
      expect(middlewareMock).toHaveBeenCalledTimes(1);
      expect(middlewareMock).toHaveBeenCalledWith([Result.ok("test"), Result.ok("test2")], expect.anything());
    });

    it("Should handle errors", async () => {
      const splitMiddlewareMock = jest.fn<(input: { test: string; other: true }) => string>();
      splitMiddlewareMock
        .mockImplementationOnce(input => input.test)
        .mockRejectedValueOnce(new Error("boom") as never);

      const middlewareMock = jest.fn((items: Result<string, Error>[]) =>
        items.map(item => item.isOk ? item.unwrap() : item.error.message)
      );
      const chain: (input: { test: string; other: true }[]) => Promise<string[]> = nornir<
        { test: string; other: true }[]
      >()
        .split(nested => nested.use(splitMiddlewareMock))
        .use(middlewareMock)
        .build();

      await expect(chain([{ test: "test", other: true }, { test: "test2", other: true }])).resolves.toEqual([
        "test",
        "boom",
      ]);
      expect(splitMiddlewareMock).toHaveBeenCalledTimes(2);
      expect(splitMiddlewareMock).toHaveBeenCalledWith({ test: "test", other: true }, expect.anything());
      expect(splitMiddlewareMock).toHaveBeenCalledWith({ test: "test2", other: true }, expect.anything());
      expect(middlewareMock).toHaveBeenCalledTimes(1);
      expect(middlewareMock).toHaveBeenCalledWith(
        [Result.ok("test"), Result.err(new Error("boom"))],
        expect.anything(),
      );
    });
  });

  describe("match()", () => {
    it("Should run the correct match", async () => {
      interface Test1 {
        type: "test1";
        value: string;
      }

      interface Test2 {
        type: "test2";
        stuff: number;
      }

      type Test = Test1 | Test2;

      const test1MiddlewareMock = jest.fn((input: Test1) => input.value);
      const test2MiddlewareMock = jest.fn((input: Test2) => input.stuff.toString());

      const chain = nornir<Test>()
        .match("type", {
          test1: nested => nested.use(test1MiddlewareMock),
          test2: nested => nested.use(test2MiddlewareMock),
        })
        .build();

      await expect(chain({ type: "test1", value: "test" })).resolves.toBe("test");
      expect(test1MiddlewareMock).toHaveBeenCalledTimes(1);
      expect(test1MiddlewareMock).toHaveBeenCalledWith({ type: "test1", value: "test" }, expect.anything());
      expect(test2MiddlewareMock).not.toHaveBeenCalled();
    });
  });
});
