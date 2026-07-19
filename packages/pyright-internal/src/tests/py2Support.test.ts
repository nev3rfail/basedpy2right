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
