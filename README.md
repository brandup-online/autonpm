# autonpm

Automation of running NPM scripts across multiple packages that live in a single repository.

`autonpm` treats a directory of packages as a small monorepo: it discovers every package, figures out the dependency order between them (via local `file:` links), and runs an npm command in each one. Build-type commands run **sequentially in dependency order** (dependencies first), while `watch` runs all packages **concurrently**.

## Installation

```bash
npm install --save-dev @brandup/autonpm
```

Requires Node.js 16 or newer.

## Project layout

By default `autonpm` looks for packages in the `./npm` directory. Every immediate subdirectory that contains a `package.json` is treated as a package:

```
my-repo/
├── package.json          # your workspace root (defines npm:* scripts)
└── npm/
    ├── core/
    │   └── package.json   # name: "core"
    └── ui/
        └── package.json   # name: "ui", depends on "core"
```

Dependencies **between** packages are declared with a local `file:` path. For example `ui/package.json`:

```json
{
  "name": "ui",
  "version": "1.0.0",
  "dependencies": {
    "core": "file:../core"
  }
}
```

`autonpm` reads these `file:../` links to build a dependency graph and process packages in the correct order (`core` before `ui`). If a circular dependency is detected, it fails fast with a clear error instead of looping forever.

## Commands

Each command runs the corresponding npm command inside every discovered package. Any extra arguments you pass are forwarded to npm.

| Command | Runs in each package | Notes |
| --- | --- | --- |
| `autonpm install [--nofix]` | `npm install` | Sequential; auto-runs `npm audit fix` after install. Pass `--nofix` to skip. |
| `autonpm update` | `npm update` | Sequential, dependency order |
| `autonpm build` | `npm run build` | Sequential, dependency order |
| `autonpm pack` | `npm pack` | Sequential, dependency order |
| `autonpm version <v>` | `npm version <v>` | Sequential, dependency order |
| `autonpm audit [fix] [--force]` | `npm audit …` | Sequential, dependency order |
| `autonpm watch` | `npm run watch` | Runs all packages concurrently |

Examples:

```bash
autonpm install
autonpm update --save
autonpm build
autonpm watch
autonpm audit
autonpm audit fix
autonpm audit fix --force
```

### Sequential vs. concurrent

- `install`, `update`, `build`, `pack`, `version`, `audit` run **one package at a time** in dependency order and stop on the first failure (non-zero exit). This guarantees a dependency is built before the packages that consume it.
- `watch` starts a long-running watcher for **every package at once**. Output from each watcher is prefixed with the package name so you can tell them apart. Pressing `Ctrl+C` forwards `SIGINT` to all child processes so they shut down cleanly.

### Audit and auto-fix after install

After `autonpm install` completes, `npm audit` is run silently in each package. A summary is printed, then fixes are applied automatically:

- If a package has fixable vulnerabilities → `npm audit fix` runs in that package.
- If a fix requires a breaking (semver-major) upgrade → `npm audit fix --force` runs instead.

```
-------audit summary-------

  core: no vulnerabilities
  ui: 2 high, 1 moderate [fixable]
  widgets: 1 critical [requires --force]

-------auto audit fix-------

  ui: npm audit fix
  ...
  widgets: npm audit fix --force
  ...
```

Pass `--nofix` to skip the automatic fix and only print the summary with a recommendation:

```bash
autonpm install --nofix
```

Each package line in the summary shows vulnerability counts by severity and one of three fix notes:

| Note | Meaning |
| --- | --- |
| `[fixable]` | Fixed by `npm audit fix` |
| `[requires --force]` | Fix involves a semver-major upgrade; fixed by `npm audit fix --force` |
| `[no fix available]` | No automated fix exists yet |

If no vulnerabilities are found across all packages, `No vulnerabilities found.` is printed instead.

## Publishing helpers

Two extra binaries help prepare packages for publishing. Both operate on every package in the packages directory.

### `autonpm-version <version>`

Sets the `version` field of each package's `package.json`, and rewrites every local `file:../` dependency to a versioned range (`^<version>`). This turns intra-repo links into real version ranges before publishing.

```bash
autonpm-version 1.2.3
```

> **`autonpm version` vs `autonpm-version` — these are different.**
>
> - `autonpm version <v>` (a subcommand) runs npm's own `npm version <v>` inside each package. It uses npm's versioning machinery (bumps `version`, and by default creates a git commit and tag) and does **not** touch dependency ranges.
> - `autonpm-version <v>` (a separate binary) edits each `package.json` directly: it sets the `version` field **and** rewrites local `file:../` dependencies to `^<v>`. It does not invoke npm or create git tags.
>
> Use `autonpm-version` when preparing packages for publishing; use `autonpm version` when you want npm's standard version-bump behavior.

### `autonpm-cleanup`

Removes `devDependencies` and `scripts` from each package's `package.json`, producing a leaner manifest for publishing.

```bash
autonpm-cleanup
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `NPM_PATH` | `npm` | Directory (relative to the current working directory) that contains the packages. |

To use a different directory, set `NPM_PATH`:

```json
{
  "scripts": {
    "npm:install": "cross-env NPM_PATH=custom_dir autonpm install"
  }
}
```

## Recommended npm scripts

Add these to your workspace root `package.json` so the whole repo is driven through the root:

```json
{
  "scripts": {
    "npm:install": "autonpm install",
    "npm:update": "autonpm update --save",
    "npm:build": "autonpm build",
    "npm:watch": "autonpm watch",
    "npm:audit": "autonpm audit",
    "npm:audit:fix": "autonpm audit fix",
    "npm:version": "autonpm-version",
    "npm:pack": "autonpm pack",
    "npm:cleanup": "autonpm-cleanup"
  }
}
```

A working setup is available in the [`example`](example) directory of this repository.

## License

Apache-2.0
