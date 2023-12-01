import {httpEventParser, NornirRestParseError, UnparsedHttpEvent} from "../../dist/runtime/index.mjs";

describe("Parsing", () => {
    it("Should throw correct error on failure to parse", () => {
        const parser = httpEventParser()

        const event: UnparsedHttpEvent = {
            headers: {
                "content-type": "application/json"
            },
            rawBody: Buffer.from("not json"),
            method: "GET",
            path: "/",
            rawQuery: ""
        }

        expect(() => parser(event)).toThrow(NornirRestParseError)
    })
})
