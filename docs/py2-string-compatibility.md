# Python 2 string compatibility for migration

Python 2 string promotion lets the checker accept legacy string contracts and identify the expressions that rely on them.

## Why handle this in the checker?

-   A Python 2 migration needs to know where byte strings pass as Unicode. The pinned stubs sometimes assume mypy will accept these calls. The development corpus reproduces the original false positives on the unmodified checker for byte arguments to `open`, `getattr`, and `unicode.startswith`.
-   The audit found 1,391 candidate parameter occurrences in 123 stdlib files, including aliases, overloads, and unions that already accept bytes. This is an inventory, not a count of defects. A stdlib-only patch also misses third-party signatures and user type comments written with the same assumptions.
-   Apply one Python 2 compatibility policy wherever the checker has a declared type. For dependencies with unknown signatures, there is no declared string contract to check.
-   Keep the pinned stub set as the base. Reserve stub corrections for independently verified signature or return-type defects. Iterator protocol selection is a separate evaluator concern.

## Compatibility and diagnostics

Mypy 0.971 declares three Python 2 string promotion edges and follows them recursively during subtype checks. These are static compatibility decisions. The runtime receives the original object. [Promotion table](https://github.com/python/mypy/blob/v0.971/mypy/semanal_classprop.py#L36-L46) · [Subtype implementation](https://github.com/python/mypy/blob/v0.971/mypy/subtypes.py)

| Actual → required                                         | Python 2 behavior                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `bytes ↔ str`                                             | Python 2 alias. Accept silently, including `b"…"`.                                                                  |
| `str → unicode`                                           | Accept with one promotion diagnostic.                                                                               |
| `bytearray → str`, `memoryview → str`                     | Accept with one promotion diagnostic.                                                                               |
| `bytearray → str → unicode`, `memoryview → str → unicode` | Report the complete path once at the expression.                                                                    |
| `unicode → str` or `bytes`                                | Ordinary type error. A caller can encode explicitly.                                                                |
| `str` or `unicode → basestring`                           | Ordinary inheritance. Accept silently. A value known only as `basestring` needs narrowing in the reverse direction. |
| Legacy `buffer` or abstract `typing.ByteString`           | No new outgoing promotion edge. Evaluate the declared contract and ordinary assignability.                          |

Prefer an exact overload or union match before trying promotion. Preserve the source type and the selected signature’s return type. For example, `"abc".lstrip("a")` infers `str` silently even though an overload accepts `unicode`.

`reportImplicitStringPromotion` defaults to `warning` in enabled checking modes and `none` in off mode. At `error` the reliance on promotion fails checking. At `none` the same call resolves silently. Report only promotions used by the selected check. An unrelated invalid argument retains its own diagnostic at every severity. Python 3 keeps its existing rules.

## Comparison with mypy 0.971

The comparison used CPython 3.9.6 as the host and mypy’s bundled Python 2 stubs. Install `mypy[python2]==0.971` in a temporary virtual environment and run `mypy --py2 --no-incremental --show-error-codes probe.py`. Use typed function parameters for the source values, Python 2 function type comments for the destination contracts, and `reveal_type` for inferred results.

| Probe                                                                         | Observed mypy result                                                                                                                                                             |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overloads `(unicode) -> int`, then `(str) -> float`, called with `str`        | Reports that the second declaration is unreachable and infers `int`. This fork deliberately prefers the exact `str` match.                                                       |
| `s.lstrip(s)` for `s: str`                                                    | Infers `str`. The bundled stub puts the `str` overload first.                                                                                                                    |
| `(AnyStr, AnyStr) -> AnyStr`                                                  | Infers `str` for two `str`, two `bytearray`, or two `memoryview` inputs. A `str` and a `unicode` together infer `unicode`.                                                       |
| Existing `List[str]` passed to `List[unicode]`                                | Rejects the argument because mutable lists are invariant.                                                                                                                        |
| `bytearray` or `memoryview` passed to `str` and `unicode`                     | Accepts all four calls, including the two chained promotions.                                                                                                                    |
| Abstract `typing.ByteString` or legacy `buffer` passed to `str` and `unicode` | Rejects all four calls. Python 2 declares `ByteString` as an abstract class. In the other direction mypy accepts `bytearray` at `ByteString` and rejects `str` and `memoryview`. |
| `unicode` passed to `str`                                                     | Rejects the argument.                                                                                                                                                            |

## Known limits

-   **Wrong inferred return.** On CPython 2.7.18, `xml.sax.saxutils.escape("x")` returns `str`. Its stub promises `Text` (`unicode`). A promotion warning can identify the input assumption, but the inferred result can still pass a later `io.StringIO().write(...)` check and fail at runtime. The corpus keeps this two-call example as a regression case. [CPython SAX implementation](https://github.com/python/cpython/blob/v2.7.18/Lib/xml/sax/saxutils.py)
-   **Genuinely strict input.** Both parameters of `unicodedata.normalize` say `Text`. The form accepts a byte string, the data requires Unicode. A uniform promotion policy warns on both. A warning records uncertainty, not proof that CPython accepts the call. [CPython argument parser](https://github.com/python/cpython/blob/v2.7.18/Modules/unicodedata.c#L785-L787)
-   **Independent defects.** `bytearray.decode()` returns Unicode even though the stub says `str`. Python 2 `unicode_literals` also affects the source literal type before assignability is considered. Track both separately from promotion.

## Verification

The [development corpus](../tools/string-corpus/README.md) checks diagnostic rule, severity, expression range, promotion path, and inferred type. Replay the runnable fixtures with CPython 2.7.18 to compare the actual return values and exceptions. The corpus includes third-party declarations, overloads, unions, mixed valid and invalid arguments, and Python 3 controls.
