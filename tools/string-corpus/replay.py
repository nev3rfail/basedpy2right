"""Replay top-level corpus statements on CPython 2.7.18 (invoked by check.py)."""
import ast
import platform
import sys

if platform.python_implementation() != 'CPython' or sys.version_info[:3] != (2, 7, 18):
    sys.exit('Runtime reference requires CPython 2.7.18')

filename = sys.argv[1]
source = open(filename).read()
lines = source.splitlines()
namespace = {}


def runtime_type(value):
    if isinstance(value, tuple):
        return 'tuple[' + ', '.join(map(runtime_type, value)) + ']'
    return type(value).__name__


def reveal_type(value):
    actual = runtime_type(value)
    if actual != expected:
        raise AssertionError('line %d: expected %s, got %s' % (line, expected, actual))


namespace['reveal_type'] = reveal_type
for statement in ast.parse(source, filename).body:
    line = statement.lineno
    code = lines[line - 1]
    expected = code.partition('  # type: ')[2].partition(';')[0]
    reject = '  # reject: ' in code or 'runtime-reject: TypeError' in code
    try:
        exec compile(ast.Module([statement]), filename, 'exec') in namespace
    except TypeError:
        if not reject:
            raise
    else:
        if reject:
            raise AssertionError('line %d: expected TypeError' % line)
print('CPython 2.7.18 replay passed')
