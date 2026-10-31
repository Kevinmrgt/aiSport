# Compatibility for pinned development tools

GHSA-g3hv-75wg-m249 requires a patched minimatch engine. The workspace uses
minimatch 11.0.3 for every consumer; no advisory exception is configured.

The pinned ESLint 8 plugins and glob 7 expect the old CommonJS callable export.
This private adapter provides those inspected interfaces using the modern
engine. For glob 7 it preserves unmerged pattern rows and supplies `_glob` and
`Symbol.match` on the modern matcher objects. It never builds legacy regular
expressions. `makeRe()` supplies only the `.test()` interface consumed by the
pinned eslint-plugin-import rule, not a general RegExp replacement.

The adapter is limited to these locked development dependencies. Reassess it
when upgrading ESLint, its plugins or glob; remove it when their legacy API is
no longer needed. `scripts/minimatch-compat.test.mjs` exercises the actual glob
dependency, not a replacement fixture. Docker builds include the adapter before
installing dependencies.

Upstream sources:

- https://github.com/advisories/GHSA-g3hv-75wg-m249
- https://github.com/isaacs/minimatch/tree/v11.0.3
