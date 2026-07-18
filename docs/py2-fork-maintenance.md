# Python 2.7 fork — maintenance rules

This fork adds Python 2.7 support to basedpyright. Upstream will never merge it,
so we optimize for the smallest, most rebase-friendly diff — and we split the work
into a cold (auto-rebasable) layer and a hot (soundness) layer.

## Branch model (3 tiers)

```
main       – pure mirror of basedpyright upstream. Never edited by us; auto-advances
             to each new upstream release tag.
  └ py2-base – main + the surgical, auto-rebasable changes: version representation,
               config schema, py2 stub set (@python2 data fork), and parser desugars
               (print/exec/backtick/except-comma/raise). Regions here are frozen upstream
               (see the churn spike), so CI rebases py2-base onto each new main release.
      └ py2   – py2-base + soundness: changes that must touch the hot files
               (binder.ts / typeEvaluator.ts) — metaclass (__metaclass__), and later
               old-style classes / MRO / classic division. Rebased MANUALLY onto py2-base
               (it edits code upstream churns constantly). THIS is the branch the parent
               `statanal` repo tracks and that users check out — a cold-only LSP gives
               confidently-wrong types on __metaclass__/old-style classes, so soundness
               is part of the product, not optional polish.
```

Rebase cadence: on each upstream release, CI rebases `py2-base` onto `main`; then `py2`
is manually rebased onto the new `py2-base`.

## Rules (enforced in review)
1. Every py2 behavior is gated on `isPython2()` / `PythonVersion.isLessThan(v, pythonVersion3_0)`.
2. No in-place edits to `tokenizer.ts` hot functions (`_tryNumber`, `_getStringPrefixLength`,
   `_tryIdentifier`) — upstream rewrites them wholesale (see the churn spike). Lexical py2
   quirks are shimmed, not patched in.
3. On `py2-base`: no `binder.ts` / `typeEvaluator.ts` edits — semantics that can't be done via
   parser desugar or the py2 stub set (`py2-typeshed/`, a data fork) belong on `py2`.
4. On `py2`: keep hot-file edits minimal, additive, gated, and cloned from an existing
   upstream pattern (e.g. metaclass mirrors `__slots__` wiring). Each hot-file edit is a
   per-merge review checkpoint and a known merge-conflict liability.
5. The except-clause region (`_parseTryStatement`) is a per-merge review checkpoint.
6. New py2 diagnostics go through the existing localization machinery.

## Acceptance gate
The exit criterion for `py2-base` is the oracle-diff harness (`statanal/tools/oracle-harness/`)
against a py2 corpus that includes classes/`__metaclass__`: the divergences vs. mypy v0.971
define the `py2` soundness backlog (metaclass first).
