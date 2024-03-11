import {describe, expect} from "@jest/globals";
import {simpleSpecResolve} from "../../dist/runtime/utils.mjs";

describe("utils", () => {
    describe('simpleSpecResolve function', () => {

        // Test case: When the current object has a $ref property
        test('resolves $ref references', () => {
            // Arrange
            const root = {
                a: {name: 'test'},
                "$ref": '#/a'
            } as const;
            // Act
            const result: {
                readonly name: "test"
            } = simpleSpecResolve(root);
            // Assert
            expect(result).toEqual({name: 'test'});
        });


        // Test case: When the current object does not have a $ref property
        test('resolves object without $ref', () => {
            // Arrange
            const root = {name: 'test'} as const;
            // Act
            const result: {
                readonly name: "test"
            } = simpleSpecResolve(root);
            // Assert
            expect(result).toEqual({name: 'test'});
        });

        // Test case: When the current object is an array
        test('resolves array items', () => {
            // Arrange
            const items = [{
                "$ref": "#/a",
                name: "item1"
            }, {
                "$ref": "#/b",
                name: "item2"
            }] as const;
            const root = {
                items,
                a: "string",
                b: "number"
            } as const;
            // Act
            const result: {
                readonly items: readonly ["string", "number"],
                readonly a: "string",
                readonly b: "number"
            } = simpleSpecResolve(root);
            // Assert
            expect(result).toEqual({
                items: ["string", "number"],
                a: "string",
                b: "number"
            });
        });

        // Test case: When the current object is an nested object
        test('resolves nested objects', () => {
            // Arrange
            const root = {
                "a": {name: 'test'},
                "b": {"$ref": "#/a"}
            } as const;

            // Act
            // const result = simpleSpecResolve(root);
            const result: {
                readonly a: {
                    readonly name: "test"
                },
                readonly b: {
                    readonly name: "test"
                }
            } = simpleSpecResolve(root);
            // Assert
            expect(result).toMatchObject({
                a: {name: 'test'},
                b: {name: 'test'}
            });
        })
    });

    test("resolves nested objects with nested arrays", () => {
        // Arrange
        const root = {
            "a": [{name: 'test'}],
            "b": {"$ref": "#/a"}
        } as const;

        // Act
        const result = simpleSpecResolve(root);
        // Assert
        expect(result).toEqual({
            a: [{name: 'test'}],
            b: [{name: 'test'}]
        });
    })

    test("resolves complex deeply nested objects", () => {
        // Very complex json schema with multiple branches
        const root = {
            "a": {name: 'test'},
            "b": {"$ref": "#/a"},
            "c": {"d": {"$ref": "#/b"}}
        } as const;

        // Act
        // const result = simpleSpecResolve(root);
        const result: {
            readonly a: {
                readonly name: "test"
            },
            readonly b: {
                readonly name: "test"
            },
            readonly c: {
                readonly d: {
                    readonly name: "test"
                }
            }
        } = simpleSpecResolve(root);

        // Assert whole object
        expect(result).toMatchObject({
            a: {name: 'test'},
            b: {name: 'test'},
            c: {d: {name: 'test'}}
        });
    })

    test("Handles multiple references to the same object", () => {
        // Arrange
        const root = {
            "a": {name: 'test'},
            "b": {"$ref": "#/a"},
            "c": {"$ref": "#/a"}
        } as const;

        // Act
        const result: {
            readonly a: {
                readonly name: "test"
            },
            readonly b: {
                readonly name: "test"
            },
            readonly c: {
                readonly name: "test"
            }
        } = simpleSpecResolve(root);

        // Assert
        expect(result).toEqual({
            a: {name: 'test'},
            b: {name: 'test'},
            c: {name: 'test'}
        });
    })

    test("Handles circular references", () => {
        // Arrange
        const root = {
            "a": {"$ref": "#/b"},
            "b": {"$ref": "#/a"}
        } as const;

        // Act
        const result: {
            readonly a: {
                readonly $ref: "#/b"
            },
            readonly b: {
                readonly $ref: "#/a"
            }
        } = simpleSpecResolve(root);
        // Assert
        expect(result).toEqual({
            a: {"$ref": "#/b"},
            b: {"$ref": "#/a"}
        });
    })

    test("Does not mutate the input object", () => {
        // Arrange
        const root = {
            "a": {name: 'test'},
            "b": {"$ref": "#/a"}
        } as const;
        const original = {...root};
        // Act
        simpleSpecResolve(root);
        // Assert
        expect(root).toEqual(original);
    })
})
