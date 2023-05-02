# nornir

## Description
What this service does.
Talk about the outputs it provides and the inputs it consumes.
A service shouldn't know about its consumers, so don't talk about them here.

## Structure

### File Structure
```
.
├── packages - The packages that make up the service are stored here/
│   ├── scripts - Packages that holds repo wide scripts
│   ├── deployment - Package that actually deploys the service
│   └── ...
├── .github - Github actions and workflows/
│   ├── CODEOWNERS - Controls who is responsible for what parts of the service
│   ├── labeler.yml - Automatically labels pull requests based on changes files
│   └── workflows - Workflow configurations/
│       ├── lint.yml - Lints the repo on pull request
│       ├── release.yml - Automatically creates releases on push to main or release branches
│       ├── slacknotify.yml - Sends a slack notification on pull request
│       ├── stop-no-merge-labels.yml - Prevents merging PR's with a no-merge label
│       └── test.yml - Runs tests and coverage on pull request
├── _global_templates - Global Nrfcloud service templates/
│   └── ...
├── .eslintignore - Files to ignore from linting
├── .npmrc - Package manage configuration
├── .releaserc.json - semantic-release configuration
├── .syncpackrc.yml - sync-pack configuration (Dependency version sync)
├── babel.config.js - babel configuration (for coverage)
├── commitlint.config.js - commitlint configuration
├── dprint.json - dprint configuration (formatter)
├── eslint.config.js - Base eslint config (linter)
├── jest.config.cjs - Base jest config
├── pnpm-workspace.yml - pnpm workspace config (analagous to package.json/workspaces)
├── pull_request_template.md - Template for github pull requests
├── tsconfig.base.json - Base typescript configuration
└── turbo.json - turbo configuration (build tool)
```

### Common Operations

#### Adding a new package
Run `pnpm plop` and you'll get a list of options. Select the one you want and follow the prompts.

#### Build
```bash
# Builds either the whole repo, or the current package (including dependencies).
pnpm build

# Clean artifacts and caches.
pnpm clean

# Clean artifacts and caches, then build.
pnpm build:clean
```

#### Testing
```bash
# Runs the tests for either the whole repo, or the current package.
# Additionally, generate coverage and reports when run from root.
pnpm tests

# Performs a clean build before running tests.
pnpm tests:clean
```

```bash
# Generate a library package. Holds utilities, types, and cdk constructs.
pnpm plop library

# Generate a lambda handler package.
pnpm plop lambda-handler

# Generate a deployment package. Provides the CDK deployment scripts.
pnpm plop deployment
```
#### Linting
```bash
# Runs the linter for either the whole repo, or the current package.
pnpm lint

# Runs the linter and fixes any issues it can.
pnpm lint:fix
```

### Release Process
This repo uses `multi-semantic-release` to support multiple independent monorepo releases.
Commit history is scanned for each individual package and a release is created for each package that has changes.
`dev` releases are created from the `main` branch, and mainline releases are created from the `release` branch.
Changelogs and appropriate tags are automatically created for each release.

### Tooling Choices

#### Build Tool: [turbo](https://turbo.build/)
Provides build pipeline and workspace dependency management.

#### Package Manager: [pnpm](https://pnpm.io/)
Replacement for yarn and npm. Provides faster installs and better package management.

#### Linter: [eslint](https://eslint.org/)
Provides linting. Slow, but highly configurable and widely supported.

#### Formatter: [dprint](https://dprint.dev/)
Provides formatting. Similar to prettier, but significantly faster.

#### Commit Linter: [commitlint](https://commitlint.js.org/#/)
Enforces conventional style commit messages.

#### Release Tool: [semantic-release](https://semantic-release.gitbook.io/semantic-release/)
Automatically creates releases based on commit messages.
Used in conjunctions with [multi-semanti-release](https://github.com/dhoulb/multi-semantic-release) to support multiple independant releases.

#### Testing: [jest](https://jestjs.io/)
Provides testing and coverage. Slow, but widely supported and familiar.

#### Code Generation: [plop](https://plopjs.com/)
Provides code generation. Used to generate new packages and services.

#### Dependency Version Sync: [sync-pack](https://github.com/JamieMason/syncpack)
Syncs dependency versions across packages.
