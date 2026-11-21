"""Run with Python 3. Use --help for checker and runtime options."""
import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
STUBS = HERE.parents[1] / "packages/pyright-internal/py2-typeshed"


def promotion_specs(field, statement):
    specs = {}
    for item in field.split(" | ") if field else ():
        expression, path = item.split(" = ")
        if statement.count(expression) != 1:
            raise ValueError(f"Ambiguous promotion location {expression!r} in {statement!r}")
        start = statement.index(expression)
        specs[(start, start + len(expression))] = tuple(sorted(path.split(", ")))
    return specs


def static(args, source, version, work, severity):
    shutil.copy(source, work)
    config = {"pythonVersion": version, "typeCheckingMode": "standard"}
    config["reportImplicitStringPromotion"] = severity
    if version == "2.7":
        config["typeshedPath"] = str(args.stubs.resolve())
    (work / "pyrightconfig.json").write_text(json.dumps(config))
    cmd = [*args.checker, "--outputjson", source.name]
    proc = subprocess.run(cmd, cwd=work, capture_output=True, text=True)
    if proc.returncode not in (0, 1):
        raise RuntimeError(proc.stderr or proc.stdout)
    if proc.stderr.strip():
        raise RuntimeError(proc.stderr)
    result = json.loads(proc.stdout)
    diagnostics = {}
    for d in result["generalDiagnostics"]:
        if Path(d["file"]).resolve() != (work / source.name).resolve():
            raise RuntimeError(str(d))
        line = d["range"]["start"]["line"] + 1
        diagnostics.setdefault(line, []).append(d)
    failures = gaps = 0
    for line, code in enumerate(source.read_text().splitlines(), 1):
        expected = []
        fields = code.lstrip().partition("  # ")[2]
        markers = dict(part.split(": ", 1) for part in fields.split("; ") if part)
        for kind in ("reject", "static-reject"):
            if kind in markers:
                expected.append(("argument", markers[kind]))
        if "type" in markers and "reveal_type(" in code:
            expected.append(("type", markers["type"]))
        known = markers.get("gap", "").split(", ")
        statement = code.partition("  # ")[0]
        promotions = promotion_specs(markers.get("promote"), statement)
        optional = promotion_specs(markers.get("gap-promotion"), statement)
        if severity != "none":
            expected.extend(("promotion", span, path) for span, path in promotions.items())
        if "assignment-error" in markers:
            expected.append(("assignment", markers["assignment-error"]))
        actual = []
        for d in diagnostics.pop(line, []):
            msg = d["message"]
            param = re.search(r'parameter "([^"]+)"', msg)
            if d.get("rule") == "reportArgumentType" and param and d["severity"] == "error":
                name = param[1]
                if name in known and not args.require_fixed:
                    gaps += 1
                    known.remove(name)
                    print(f"GAP {source.name}:{line} {name}")
                else:
                    actual.append(("argument", name))
            elif d.get("rule") == "reportImplicitStringPromotion":
                start, end = d["range"]["start"], d["range"]["end"]
                span = (start["character"], end["character"])
                path = promotions.get(span, optional.get(span))
                actual_paths = tuple(sorted(
                    ">".join(re.findall(r"\b(?:str|unicode|bytearray|memoryview)\b", part))
                    for part in msg.split(", ")
                ))
                if (d["severity"] == severity and start["line"] == end["line"]
                        and path and actual_paths == path):
                    if span in optional and not args.require_fixed:
                        gaps += 1
                        print(f"GAP {source.name}:{line} unicode_literals promotion")
                    else:
                        actual.append(("promotion", span, path))
                else:
                    actual.append(("unexpected", f"{d['severity']} at {span}: {msg}"))
            elif d.get("rule") == "reportAssignmentType" and d["severity"] == "error":
                start, end = d["range"]["start"], d["range"]["end"]
                actual.append(("assignment", code[start["character"]:end["character"]]))
            elif d["severity"] == "information" and msg.startswith('Type of "') and '" is "' in msg:
                inferred = msg.rsplit('" is "', 1)[1].rstrip('"')
                if inferred == markers.get("gap-type") and not args.require_fixed:
                    gaps += 1
                    print(f"GAP {source.name}:{line} inferred {inferred}, expected {markers['type']}")
                    expected.remove(("type", markers["type"]))
                else:
                    actual.append(("type", inferred))
            else:
                actual.append(("unexpected", msg))
        if sorted(actual) != sorted(expected):
            failures += 1
            print(f"FAIL {source.name}:{line} expected {expected}, got {actual}")
    if diagnostics:
        raise RuntimeError(str(diagnostics))
    print(f"{source.name} ({version}, {severity}): {failures} failures, {gaps} known discrepancies")
    return failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checker", nargs="+", default=["basedpyright"],
                        help="checker executable or command, e.g. node /absolute/path/to/index.js")
    parser.add_argument("--stubs", type=Path, default=STUBS, help="Python 2 typeshed root")
    parser.add_argument("--require-fixed", action="store_true", help="fail on remaining known gaps")
    parser.add_argument("--python2", help="also replay the Python 2 corpus with CPython 2.7.18")
    args = parser.parse_args()
    failures = 0
    for filename, version in (("py2.py", "2.7"), ("py2_future.py", "2.7"),
                              ("py2_vendor.py", "2.7"), ("py3.py", "3.11")):
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            if filename == "py2_vendor.py":
                shutil.copytree(HERE / "typings", work / "typings")
                shutil.copy(HERE / "vendor_text.py", work)
            levels = ("warning", "error", "none")
            if filename == "py2_vendor.py":
                # Restore warning in the same project after disabling the rule.
                levels += ("warning",)
            for severity in levels:
                failures += static(args, HERE / filename, version, work, severity)
            if filename in ("py2.py", "py2_future.py") and args.python2:
                subprocess.run([args.python2, str(HERE / "replay.py"), filename], cwd=work, check=True)
    return int(bool(failures))


if __name__ == "__main__":
    sys.exit(main())
