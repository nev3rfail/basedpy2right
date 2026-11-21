# String contract corpus

## What the corpus measures

-   **Python 3 preservation.** Paired cases exercise byte indexing, text methods and type inference against Python 3.11. Keep the upstream analyzer suite as the broader regression check.
-   **Python 2 compatibility.** Each directed mypy edge has a positive example, an expected diagnostic path and a reverse-direction control. Constrained type variables and overloads assert the result type separately from diagnostics.
-   **Existing stub behavior.** Cases that already check correctly retain their original result or error. Explicit exceptions record independently known defects, so an unrelated error on the same line cannot satisfy a promotion expectation.
-   **Runtime behavior.** CPython 2.7.18 establishes concrete return types and exceptions for runnable examples. Mypy 0.971 supplies a separate static comparison. The fork intentionally prefers an exact overload when mypy selects an earlier promoted one.

## Running the checks

Run from the repository root with Python 3. Pass an absolute path to the candidate checker because each run uses a temporary project.

```sh
python3 tools/string-corpus/check.py --checker node "$PWD/packages/pyright/index.js"
python3 tools/string-corpus/check.py --checker /absolute/path/to/basedpyright --python2 /absolute/path/to/python2.7
```

Each fixture runs at warning, error and none for `reportImplicitStringPromotion`. The vendor fixture then restores warning and repeats the checks in the same temporary project. Python 2.7 uses this checkout’s py2-typeshed by default. Override the root with `--stubs`. The Python 3.11 control uses the checker’s bundled Python 3 stubs.

| Inline field                       | Assertion                                                                                                                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `promote: raw = str>unicode`       | One promotion at the exact expression span with the given path and configured severity. At none the expression checks silently. Separate multiple expressions with `\|`. A comma separates paths at one expression, in any order. |
| `reject: name`                     | Static argument error for that parameter and a CPython TypeError.                                                                                                                                                                 |
| `static-reject: name`              | Static argument error for that parameter.                                                                                                                                                                                         |
| `runtime-reject: TypeError`        | CPython raises TypeError. Combine with a promotion when static analysis accepts the call.                                                                                                                                         |
| `assignment-error: expr`           | Static assignment error at the named expression.                                                                                                                                                                                  |
| `type: T` on a reveal              | Checker inference and concrete runtime type, including tuple element types.                                                                                                                                                       |
| `gap`, `gap-type`, `gap-promotion` | Known discrepancy in ByteString registration, stub/literal inference, or promotions caused by incorrect future literal inference.                                                                                                 |

Keep each expectation on one line. Separate fields with a semicolon and a space. Unmarked statements must produce no diagnostics. Normal runs fail for unlisted discrepancies. Use `--require-fixed` to count the remaining known gaps as failures.

The Python 2 runtime replay executes the two runnable fixtures once using CPython 2.7.18. `py2_vendor.py` is static-only and uses the colocated third-party stub in `typings/`. Its overload declares the promoted candidate first to check selection independently of declaration order. The mutable-container case uses an existing list to distinguish invariance from contextual typing of a fresh list literal.

The binary corpus includes aliasing, inheritance, bytearray and memoryview promotions, reverse conversions, constrained AnyStr, and legacy buffer. The `escape` / `StringIO.write` example separately checks the stub’s return type and the runtime mismatch. ByteString runtime registration follows the [Python 2 typing backport](https://github.com/python/typing/blob/3.7.4.3/python2/typing.py). The corpus stays outside CI.
