// Compatibility only for the pinned ESLint 8 / glob 7 development tools.
// All matching uses patched minimatch 11, never the old regexp engine.
const modern = require('minimatch');

class LegacyMinimatch extends modern.Minimatch {
  // glob 7 indexes globSet and set together. Keep brace alternatives separate.
  mergeRows() {}

  constructor(pattern, options = {}) {
    super(pattern, { ...options, optimizationLevel: 0 });
    this.set.forEach((row, i) => row.forEach((part, j) => {
      if (typeof part === 'string' || part === modern.GLOBSTAR || Object.hasOwn(part, Symbol.match)) return;
      Object.defineProperties(part, {
        _glob: { value: this.globParts[i][j] },
        [Symbol.match]: { value(value) { return this.test(value) ? [value] : null; } },
      });
    }));
  }

  // The pinned eslint-plugin-import only consumes the .test interface.
  // This intentionally does not expose a RegExp or its potentially unsafe source.
  makeRe() { return { test: value => this.match(value) }; }

  static defaults(options) { return legacy.defaults(options).Minimatch; }
}

function legacy(path, pattern, options) { return new LegacyMinimatch(pattern, options).match(path); }
Object.assign(legacy, modern, {
  minimatch: legacy,
  Minimatch: LegacyMinimatch,
  makeRe: (pattern, options) => new LegacyMinimatch(pattern, options).makeRe(),
  filter: (pattern, options) => path => legacy(path, pattern, options),
  match: (paths, pattern, options = {}) => {
    const result = paths.filter(legacy.filter(pattern, options));
    return options.nonull && !result.length ? [pattern] : result;
  },
  defaults: (defaults = {}) => {
    const bound = (path, pattern, options) => legacy(path, pattern, { ...defaults, ...options });
    return Object.assign(bound, legacy, {
      minimatch: bound,
      Minimatch: class extends LegacyMinimatch {
        constructor(pattern, options) { super(pattern, { ...defaults, ...options }); }
        static defaults(options) { return legacy.defaults({ ...defaults, ...options }).Minimatch; }
      },
      makeRe: (pattern, options) => legacy.makeRe(pattern, { ...defaults, ...options }),
      filter: (pattern, options) => legacy.filter(pattern, { ...defaults, ...options }),
      match: (paths, pattern, options) => legacy.match(paths, pattern, { ...defaults, ...options }),
      braceExpand: (pattern, options) => modern.braceExpand(pattern, { ...defaults, ...options }),
      escape: (value, options) => modern.escape(value, { ...defaults, ...options }),
      unescape: (value, options) => modern.unescape(value, { ...defaults, ...options }),
      defaults: options => legacy.defaults({ ...defaults, ...options }),
    });
  },
});
module.exports = legacy;
