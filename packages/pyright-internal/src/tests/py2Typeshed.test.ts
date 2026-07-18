/*
 * py2Typeshed.test.ts
 *
 * Tests for auto-selection of the bundled py2-typeshed stdlib under Python 2.x.
 */

import assert from 'assert';

import { ImportResolver } from '../analyzer/importResolver';
import { getPy2TypeShedFallbackPath } from '../analyzer/pythonPathUtils';
import { ConfigOptions } from '../common/configOptions';
import { lib, py2TypeshedFallback, sitePackages, typeshedFallback } from '../common/pathConsts';
import { combinePaths, getDirectoryPath, normalizeSlashes } from '../common/pathUtils';
import { pythonVersion2_7, pythonVersion3_11 } from '../common/pythonVersion';
import { createServiceProvider } from '../common/serviceProviderExtensions';
import { UriEx } from '../common/uri/uriUtils';
import { PartialStubService } from '../partialStubService';
import { PyrightFileSystem } from '../pyrightFileSystem';
import { TestAccessHost } from './harness/testAccessHost';
import { TestFileSystem } from './harness/vfs/filesystem';

const libraryRoot = combinePaths(normalizeSlashes('/'), lib, sitePackages);

// A minimal set of files that recreates the bundled layout inside the (virtual)
// module directory: a py3 typeshed-fallback (which does NOT ship StringIO) sitting
// beside a py2-typeshed (which does). StringIO is thus a reliable py2-only marker.
function py2LayoutFiles(): { path: string; content: string }[] {
    return [
        // py3 fallback stdlib — has os, no StringIO.
        { path: combinePaths('/', typeshedFallback, 'stdlib', 'VERSIONS'), content: 'os: 3.0-\n' },
        { path: combinePaths('/', typeshedFallback, 'stdlib', 'os', '__init__.pyi'), content: '# empty' },
        // py2 fallback stdlib — has StringIO (py2-only) + os.
        { path: combinePaths('/', py2TypeshedFallback, 'stdlib', 'VERSIONS'), content: 'StringIO: 2.7-2.7\nos: 2.7-\n' },
        { path: combinePaths('/', py2TypeshedFallback, 'stdlib', 'StringIO.pyi'), content: 'class StringIO: ...' },
        { path: combinePaths('/', py2TypeshedFallback, 'stdlib', 'os', '__init__.pyi'), content: '# empty' },
    ];
}

function createTestFileSystem(files: { path: string; content: string }[]): TestFileSystem {
    const fs = new TestFileSystem(/* ignoreCase */ false, { cwd: normalizeSlashes('/') });
    for (const file of files) {
        const path = normalizeSlashes(file.path);
        fs.mkdirpSync(getDirectoryPath(path));
        fs.writeFileSync(UriEx.file(path), file.content);
    }
    return fs;
}

function createServiceProviderFromFiles(files: { path: string; content: string }[]) {
    const testFS = createTestFileSystem(files);
    const fs = new PyrightFileSystem(testFS);
    const partialStubService = new PartialStubService(fs);
    return createServiceProvider(testFS, fs, partialStubService);
}

function resolveModule(
    files: { path: string; content: string }[],
    nameParts: string[],
    setup: (c: ConfigOptions) => void
) {
    const sp = createServiceProviderFromFiles(files);
    const configOptions = new ConfigOptions(UriEx.file('/'));
    setup(configOptions);
    const importResolver = new ImportResolver(
        sp,
        configOptions,
        new TestAccessHost(sp.fs().getModulePath(), [UriEx.file(libraryRoot)])
    );
    const uri = UriEx.file(combinePaths('/', 'src', 'test.py'));
    return importResolver.resolveImport(uri, configOptions.findExecEnvironment(uri), {
        leadingDots: 0,
        nameParts,
        importedSymbols: new Set<string>(),
    });
}

describe('py2-typeshed auto-select', () => {
    // --- Task 1: resolver ---
    describe('getPy2TypeShedFallbackPath resolver', () => {
        test('resolves py2-typeshed root relative to module dir', () => {
            const fs = createTestFileSystem(py2LayoutFiles());
            const result = getPy2TypeShedFallbackPath(fs);
            assert(result !== undefined, 'expected a Uri for the py2-typeshed root');
            assert(
                fs.existsSync(result!.combinePaths('stdlib', 'StringIO.pyi')),
                'expected py2-typeshed/stdlib/StringIO.pyi to exist under the resolved root'
            );
        });

        test('returns undefined when no py2-typeshed dir is present', () => {
            const fs = createTestFileSystem([
                { path: combinePaths('/', typeshedFallback, 'stdlib', 'os', '__init__.pyi'), content: '# empty' },
            ]);
            assert.strictEqual(getPy2TypeShedFallbackPath(fs), undefined);
        });
    });

    // --- Task 2: gate ---
    describe('stdlib gate', () => {
        test('py2.7 with no typeshedPath resolves py2-only stdlib module from py2-typeshed', () => {
            const result = resolveModule(py2LayoutFiles(), ['StringIO'], (c) => {
                c.defaultPythonVersion = pythonVersion2_7;
            });
            assert(result.isImportFound, `StringIO should resolve under py2: ${result.importFailureInfo?.join('\n')}`);
            assert.strictEqual(
                result.resolvedUris[result.resolvedUris.length - 1].getFilePath(),
                combinePaths('/', py2TypeshedFallback, 'stdlib', 'StringIO.pyi')
            );
        });

        test('py2.7 WITH explicit typeshedPath does NOT substitute py2-typeshed', () => {
            const files = [
                ...py2LayoutFiles(),
                // An explicit typeshed root that has a stdlib but no StringIO.
                { path: combinePaths('/', 'custom', 'stdlib', 'VERSIONS'), content: 'os: 2.7-\n' },
                { path: combinePaths('/', 'custom', 'stdlib', 'os', '__init__.pyi'), content: '# empty' },
            ];
            const result = resolveModule(files, ['StringIO'], (c) => {
                c.defaultPythonVersion = pythonVersion2_7;
                c.typeshedPath = UriEx.file(combinePaths('/', 'custom'));
            });
            assert(!result.isImportFound, 'explicit typeshedPath must win; StringIO must NOT resolve from py2-typeshed');
        });

        test('py3 with no typeshedPath uses py3 fallback (py2-only module not found)', () => {
            const result = resolveModule(py2LayoutFiles(), ['StringIO'], (c) => {
                c.defaultPythonVersion = pythonVersion3_11;
            });
            assert(!result.isImportFound, 'StringIO must NOT resolve under py3 (proves version-gating)');
        });

        test('py3 default path unaffected: py3 stdlib module still resolves', () => {
            const result = resolveModule(py2LayoutFiles(), ['os'], (c) => {
                c.defaultPythonVersion = pythonVersion3_11;
            });
            assert(result.isImportFound, 'os should resolve under py3 from the py3 fallback');
            assert.strictEqual(
                result.resolvedUris[result.resolvedUris.length - 1].getFilePath(),
                combinePaths('/', typeshedFallback, 'stdlib', 'os', '__init__.pyi')
            );
        });
    });
});
