import {HttpEvent, HttpHeaders, MimeType, UnparsedHttpEvent} from "./http-event.mjs";
import debug from "debug"

export function getContentType(headers: HttpHeaders): MimeType | undefined {
    return (normalizeHeaders(headers))["content-type"] as MimeType
}

export function normalizeEventHeaders<T extends HttpEvent | UnparsedHttpEvent>(event: T): T {
    return {
        ...event,
        headers: normalizeHeaders(event.headers)
    }
}

export function normalizeHeaders(headers: HttpHeaders): HttpHeaders {
    const lowercaseHeaders = Object.entries(headers)
        .reduce((acc, [key, value]) => {
            acc[key.toLowerCase()] = value
            return acc
        }, {} as Record<string, string | number>)

    return {
        ...headers,
        ...lowercaseHeaders
    }
}

/**
 * @internal
 */
export declare class Tagged<N extends string> {
    protected _nominal_: N;
}

/**
 * @internal
 */
export type Nominal<T, N extends string, E extends T & Tagged<string> = T & Tagged<N>> = (T & Tagged<N>) | E;

export const debugLog = debug("nornir/rest")

type DeepPick<T, P extends string[]> =
    P extends [infer K, ...infer Rest]
        ? K extends keyof T
            ? Rest extends string[]
                ? DeepPick<T[K], Rest>
                : never
            : never
        : T;

type ReferenceToPath<T extends string> = T extends `${infer Start}/${infer Next}`
    ? Start extends '' | '#' ? ReferenceToPath<Next> : [Start, ...ReferenceToPath<Next>]
    : [T];

// /**
//  * Resolves a json schema reference to a type
//  */
type ResolveRefInJsonObject<
    Root,
    Ref extends string,
> = DeepPick<Root, ReferenceToPath<Ref>>

/* eslint-disable @typescript-eslint/ban-types */
export type DeeplyResolveAllRefsInJsonObject<
    Root,
    Object = Root,
    ResolverCache extends unknown[] = [],
> = Object extends string | number | boolean | null | undefined ? Object :
    Object extends (...args: never) => never ? Object :
    Object extends { $ref: string } ? (
        Object["$ref"] extends ResolverCache[number] ? Object : DeeplyResolveAllRefsInJsonObject<Root, ResolveRefInJsonObject<Root, Object["$ref"]>, ResolverCache | [Object["$ref"]]>
    ) : Object extends object ? {
        [K in keyof Object]: DeeplyResolveAllRefsInJsonObject<Root, Object[K], ResolverCache>
    } : Object

export function simpleSpecResolve<
    const Root,
>(root: Root): DeeplyResolveAllRefsInJsonObject<NoInfer<Root>> {
    return simpleSpecResolveInternal(root) as DeeplyResolveAllRefsInJsonObject<NoInfer<Root>>;
}

function simpleSpecResolveInternal<
    const Root,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
>(root: Root, result: any = {}, current: any = root, resolverCache: string[] = []): unknown {
    if (typeof current !== "object") {
        return current;
    }
    if (current["$ref"] !== undefined) {
        if (resolverCache.includes(current["$ref"])) {
            return current;
        }
        return simpleSpecResolveInternal(root, result, resolveRefInJsonObject(root, current["$ref"]), resolverCache.concat(current["$ref"]));
    }
    if (Array.isArray(current)) {
        return current.map((value) => simpleSpecResolveInternal(root, {}, value, resolverCache));
    }
    for (const key in current) {
        result[key] = simpleSpecResolveInternal(root, result[key], current[key], resolverCache);
    }
    return result;
}

function resolveRefInJsonObject<
    Root,
    Ref extends string,
>(root: Root, ref: Ref): DeepPick<Root, ReferenceToPath<Ref>> {
    const path = ref.split("/").slice(1);
    let current = root;
    for (const segment of path) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        current = current[segment as keyof typeof current] as any;
    }
    return current as DeepPick<Root, ReferenceToPath<Ref>>;
}
/* eslint-enable @typescript-eslint/ban-types */
