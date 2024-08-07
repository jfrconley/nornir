# @nornir/rest

## 2.3.0

### Minor Changes

- 0fbc538: Refactor exports

## 2.2.0

### Minor Changes

- d07637b: add support for ajv-formats

### Patch Changes

- Updated dependencies [d07637b]
  - @nornir/core@1.5.0

## 2.1.4

### Patch Changes

- 345a030: Fix issue with JSON ref resolver producing duplicate results when root component is an array with subcomponents not containing references
- 620782e: Expose the NornirRouteNotFoundError class

## 2.1.3

### Patch Changes

- 9ad9ce7: Update handler type of implement route to be less persnickety

## 2.1.2

### Patch Changes

- Updated dependencies [d189bd4]
  - @nornir/core@1.4.0

## 2.1.1

### Patch Changes

- 7f87a1c: update schema transformer
- Updated dependencies [7f87a1c]
  - @nornir/core@1.3.1

## 2.1.0

### Minor Changes

- 357b9ac: Added new OpenAPI based router that doesn't need codegen

## 2.0.0

### Major Changes

- 5bcacad: OpenAPI 3 spec generation

## 1.5.2

### Patch Changes

- 6344e35: fix for additionalProps configuration

## 1.5.1

### Patch Changes

- 34c88c2: fix content type for parse error

## 1.5.0

### Minor Changes

- 35c0972: Add toResultUnencoded method.

### Patch Changes

- df1d865: Handle bad content types and invalid payloads

## 1.4.0

### Minor Changes

- cfa8753: support async toHttpEvent with registry

## 1.3.0

### Minor Changes

- 517fb37: added AnyMimeType to replace MimeType.None

### Patch Changes

- e9cd9b1: fix undefined bodies

## 1.2.1

### Patch Changes

- 5cd417a: fix issues with source transformation
- Updated dependencies [5ca7dc3]
  - @nornir/core@1.3.0

## 1.2.0

### Minor Changes

- f22fedf: update typescript

### Patch Changes

- 291041e: switch to changesets
