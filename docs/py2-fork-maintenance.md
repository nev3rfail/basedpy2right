# Python 2.7 fork — maintenance rules

This fork adds Python 2.7 support to basedpyright. Upstream will never merge it,
so we optimize for the smallest, most rebase-friendly diff.

## Branch model
- `main`: tracks upstream basedpyright.
- `py2`: our support, rebased/merged onto each new upstream **basedpyright release tag**
  (upstream itself merges pyright release tags; we sit one level below).

## Rules (enforced in review)
1. Every py2 behavior is gated on `isPython2()` / `PythonVersion.isLessThan(v, pythonVersion3_0)`.
2. No in-place edits to `tokenizer.ts` hot functions (`_tryNumber`, `_getStringPrefixLength`,
   `_tryIdentifier`) — upstream rewrites them wholesale (see the churn spike). Lexical py2
   quirks are shimmed, not patched in.
3. Semantics live in the py2 stub set (`py2-typeshed/`, a data fork), not in `typeEvaluator.ts`.
4. The except-clause region (`_parseTryStatement`) is a per-merge review checkpoint.
5. New py2 diagnostics go through the existing localization machinery.
