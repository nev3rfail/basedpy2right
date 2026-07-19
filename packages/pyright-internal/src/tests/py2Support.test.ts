/*
 * py2Support.test.ts
 * Tests for the Python 2.7 support fork. All py2 tests live here (greppable).
 */
import {
    isPython2,
    pythonVersion2_7,
    pythonVersion3_0,
    pythonVersion3_10,
    pythonVersion3_14,
} from '../common/pythonVersion';
import * as fs from 'fs';
import * as path from 'path';
import * as TestUtils from './testUtils';
import { ConfigOptions } from '../common/configOptions';
import { DiagnosticRule } from '../common/diagnosticRules';
import { Uri } from '../common/uri/uri';
import { UriEx } from '../common/uri/uriUtils';

test('pythonVersion2_7 constant is (2, 7)', () => {
    expect(pythonVersion2_7.major).toBe(2);
    expect(pythonVersion2_7.minor).toBe(7);
});

test('isPython2 discriminator', () => {
    expect(isPython2(pythonVersion2_7)).toBe(true);
    expect(isPython2(pythonVersion3_0)).toBe(false);
    expect(isPython2(pythonVersion3_14)).toBe(false);
});

test('pyrightconfig schema pythonVersion pattern accepts 2.7', () => {
    const schemaPath = path.resolve(
        __dirname,
        '../../../vscode-pyright/schemas/pyrightconfig.schema.json'
    );
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const pattern: string = schema.definitions.pythonVersion.pattern;
    expect(new RegExp(pattern).test('2.7')).toBe(true);
    expect(new RegExp(pattern).test('3.14')).toBe(true);
    expect(new RegExp(pattern).test('nonsense')).toBe(false);
});

test('py2 builtins resolve under python 2.7 + py2 typeshed', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    // Point analysis at the py2 stub set (replaces the bundled typeshed root).
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2builtins.py'], configOptions);
    TestUtils.validateResults(results, 0);
});

test('py2 builtins are undefined under the default (py3) target', () => {
    // No py2 typeshed, default version -> xrange/unicode/basestring are unknown.
    const results = TestUtils.typeAnalyzeSampleFiles(['py2builtins.py']);
    // 3 undefined names (xrange, unicode, basestring).
    TestUtils.validateResults(results, 3);
});

test('sys.version_info pruning keeps py2 branch live under 2.7', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2VersionInfo.py'], configOptions);
    // The else (py3) branch is statically dead under 2.7 -> its type error is not reported.
    TestUtils.validateResults(results, 0);
});

test('# type: comment is honored under 2.7', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2TypeComment.py'], configOptions);
    TestUtils.validateResults(results, 1);
});

test('py2 except-comma binds name under 2.7', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    // The bundled (py3) typeshed excludes `builtins` for versions < 3.0 (VERSIONS: "builtins: 3.0-"),
    // so ValueError would be unresolved without pointing at the py2 stub set, as other 2.7-target
    // tests in this file already do.
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2ExceptComma.py'], configOptions);
    TestUtils.validateResults(results, 0);
});

test('except-comma is an error under py3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const results = TestUtils.typeAnalyzeSampleFiles(['py2ExceptComma.py'], configOptions);
    // Under 3.10 `except ValueError, e:` is `except (ValueError, e):` with `e` undefined ->
    // at least one error. Observe the real count and set it; assert it is > 0 (non-zero).
    expect(results[0].errors.length).toBeGreaterThan(0);
});

test('py2 backtick desugars to repr under 2.7', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2Backtick.py'], configOptions);
    TestUtils.validateResults(results, 0);
});

test('backtick is an error under py3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const results = TestUtils.typeAnalyzeSampleFiles(['py2Backtick.py'], configOptions);
    TestUtils.validateResults(results, 1); // backticksIllegal
});

test('py2 print statement parses under 2.7', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2Print.py'], configOptions);
    TestUtils.validateResults(results, 0);
});

test('py2 exec statement parses under 2.7', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2Exec.py'], configOptions);
    TestUtils.validateResults(results, 0);
});

test('py2 raise-comma parses under 2.7', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2Raise.py'], configOptions);
    TestUtils.validateResults(results, 0);
});

test('print statement is an error under py3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const results = TestUtils.typeAnalyzeSampleFiles(['py2Print.py'], configOptions);
    expect(results[0].errors.length).toBeGreaterThan(0);
});

test('exec statement is an error under py3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const results = TestUtils.typeAnalyzeSampleFiles(['py2Exec.py'], configOptions);
    expect(results[0].errors.length).toBeGreaterThan(0);
});

test('raise-comma is an error under py3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const results = TestUtils.typeAnalyzeSampleFiles(['py2Raise.py'], configOptions);
    expect(results[0].errors.length).toBeGreaterThan(0);
});

test('py2 user class instances type correctly under 2.7 (object.__new__ -> Self)', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2ClassInstance.py'], configOptions);
    TestUtils.validateResultsButBased(results, {
        errors: [],
        infos: [
            { line: 11, message: 'Type of "w" is "Widget"' },
            { line: 12, message: 'Type of "w.name" is "str"' },
            { line: 13, message: 'Type of "w.label()" is "str"' },
        ],
    });
});

test('py2 __metaclass__ sets the effective metaclass under 2.7', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2Metaclass.py'], configOptions);
    TestUtils.validateResultsButBased(results, {
        errors: [],
        infos: [{ line: 8, message: 'Type of "C.flavor" is "str"' }],
    });
});

test('py2 classic division: int/int is int under 2.7', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2Division.py'], configOptions);
    TestUtils.validateResultsButBased(results, {
        errors: [],
        infos: [
            { line: 2, message: 'Type of "a" is "int"' },
            { line: 4, message: 'Type of "b" is "float"' },
        ],
    });
});

test('py2 __future__ division restores true division under 2.7', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2DivisionFuture.py'], configOptions);
    TestUtils.validateResultsButBased(results, {
        errors: [],
        infos: [{ line: 3, message: 'Type of "c" is "float"' }],
    });
});

test("py2 u'...' literals type as unicode; str/unicode implicit concat promotes under 2.7", () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2UnicodeLiteral.py'], configOptions);
    // Ground truth: mypy v0.971 --py2. u'x'->unicode; 'x'/b'x'->str (py2 bytes==str);
    // any unicode piece promotes the whole implicit concatenation to unicode; mixing
    // bytes and str/unicode is legal under py2 (no mixingBytesAndStr diagnostic).
    TestUtils.validateResultsButBased(results, {
        errors: [],
        infos: [
            { line: 6, message: 'Type of "type(u\'x\')" is "type[unicode]"' },
            { line: 7, message: 'Type of "type(\'x\')" is "type[str]"' },
            { line: 8, message: 'Type of "type(b\'x\')" is "type[str]"' },
            { line: 9, message: 'Type of "type(\'a\' \'b\')" is "type[str]"' },
            { line: 10, message: 'Type of "type(\'a\' u\'b\')" is "type[unicode]"' },
            { line: 11, message: 'Type of "type(u\'a\' \'b\')" is "type[unicode]"' },
            { line: 12, message: 'Type of "type(b\'x\' u\'y\')" is "type[unicode]"' },
        ],
    });
});

test("py3 unchanged: u'...' is a legacy no-op (str), b'...' stays bytes", () => {
    // Default (py3) target. The py2 unicode path must not leak into py3 analysis.
    const results = TestUtils.typeAnalyzeSampleFiles(['py2UnicodeLiteralPy3.py']);
    TestUtils.validateResultsButBased(results, {
        errors: [],
        infos: [
            { line: 2, message: 'Type of "type(u\'x\')" is "type[str]"' },
            { line: 3, message: 'Type of "type(\'x\')" is "type[str]"' },
            { line: 4, message: 'Type of "type(b\'x\')" is "type[bytes]"' },
        ],
    });
});

test('py2 old-style diamond uses classic DFS MRO under 2.7', () => {
    // Ground truth: the Python 2.7 runtime (NOT mypy, which wrongly uses C3 here).
    // Old-style diamond D(B,C)/B(A)/C(A): classic MRO [D,B,A,C] -> A wins -> int.
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2OldStyleMro.py'], configOptions);
    TestUtils.validateResultsButBased(results, {
        errors: [],
        infos: [
            { line: 27, message: 'Type of "d" is "D"' },
            { line: 28, message: 'Type of "d.x" is "int"' },
            { line: 29, message: 'Type of "d.who()" is "Literal[1]"' },
        ],
    });
});

test('py3 unchanged: the same diamond uses C3 MRO (str), still object-derived', () => {
    // Default (py3) target, same source. Under py3 every class is new-style, so
    // C3 applies: MRO [D,B,C,A,object] -> C wins -> str. Proves py3 is untouched.
    const results = TestUtils.typeAnalyzeSampleFiles(['py2OldStyleMro.py']);
    TestUtils.validateResultsButBased(results, {
        errors: [],
        infos: [
            { line: 27, message: 'Type of "d" is "D"' },
            { line: 28, message: 'Type of "d.x" is "str"' },
            { line: 29, message: 'Type of "d.who()" is "Literal[\'c\']"' },
        ],
    });
});

test('py2 explicit object base keeps C3 MRO under 2.7 (new-style)', () => {
    // An explicit `object` base makes the class new-style even under 2.7 -> C3 -> str.
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2OldStyleMroNewStyle.py'], configOptions);
    TestUtils.validateResultsButBased(results, {
        errors: [],
        infos: [
            { line: 26, message: 'Type of "d.x" is "str"' },
            { line: 27, message: 'Type of "d.who()" is "Literal[\'c\']"' },
        ],
    });
});

test('py2 old-style detection: 3-level chain=classic; builtin/mixed base=C3 under 2.7', () => {
    // Chain A->B->B2 / A->C->C2 stays old-style (flag propagates) -> classic -> int.
    // A builtin (dict) base or a new-style mixin flips the class to new-style -> C3 -> str.
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2OldStyleDetect.py'], configOptions);
    TestUtils.validateResultsButBased(results, {
        errors: [],
        infos: [
            { line: 31, message: 'Type of "D().x" is "int"' },
            { line: 52, message: 'Type of "Dd().x" is "str"' },
            { line: 76, message: 'Type of "Dm().x" is "str"' },
        ],
    });
});

test('py2 old-style instance: object at MRO tail resolves ==/!= and __dict__/__class__', () => {
    // FIX 1: excluding object from the old-style MRO flooded ordinary code with
    // false positives. object is now kept at the MRO tail (classic ordering among
    // real bases preserved), so ==/!= and .__dict__/.__class__ resolve via object.
    // (Python 2's default total ordering for </> is a separate, pre-existing,
    // out-of-MRO-scope concern -- see the sample header.)
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2OldStyleObjectTail.py'], configOptions);
    TestUtils.validateResultsButBased(results, {
        errors: [],
        infos: [
            { line: 16, message: 'Type of "a == b" is "bool"' },
            { line: 17, message: 'Type of "a != b" is "bool"' },
            { line: 18, message: 'Type of "a.__dict__" is "dict[str, Any]"' },
            { line: 19, message: 'Type of "a.__class__" is "type[A]"' },
        ],
    });
});

test('py2 old-style class takes no constructor args (object.__init__ reachable)', () => {
    // FIX 1 / R2 MEDIUM: with object at the MRO tail, object.__init__/__new__ are
    // reachable, so extra constructor arguments are rejected -- matching the
    // Python 2.7 runtime "TypeError: this constructor takes no arguments".
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2OldStyleCtor.py'], configOptions);
    TestUtils.validateResultsButBased(results, {
        errors: [{ line: 9, code: DiagnosticRule.reportCallIssue }],
    });
});

test('py2 __metaclass__ = type (class body) makes the class new-style (C3, str)', () => {
    // FIX 2: `__metaclass__ = type` is new-style at runtime even without an
    // explicit object base, so the diamond uses C3 -> str (not classic DFS -> int).
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2MetaclassTypeNewStyle.py'], configOptions);
    TestUtils.validateResultsButBased(results, {
        errors: [],
        infos: [{ line: 21, message: 'Type of "D().x" is "str"' }],
    });
});

test('py2 module-level __metaclass__ = type makes base-less classes new-style (C3, str)', () => {
    // FIX 2 (module-level form): a module-level `__metaclass__ = type` makes the
    // base-less root class new-style, so the diamond uses C3 -> str.
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion2_7;
    configOptions.typeshedPath = UriEx.file(path.resolve(__dirname, '../../py2-typeshed'));
    const results = TestUtils.typeAnalyzeSampleFiles(['py2MetaclassTypeModule.py'], configOptions);
    TestUtils.validateResultsButBased(results, {
        errors: [],
        infos: [{ line: 23, message: 'Type of "D().x" is "str"' }],
    });
});
