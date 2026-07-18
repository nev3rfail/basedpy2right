/*
 * py2Typeshed.test.ts
 *
 * Tests for auto-selection of the bundled py2-typeshed stdlib under Python 2.x.
 */

import assert from 'assert';

import { getPy2TypeShedFallbackPath } from '../analyzer/pythonPathUtils';
import { py2TypeshedFallback, typeshedFallback } from '../common/pathConsts';
import { combinePaths, getDirectoryPath, normalizeSlashes } from '../common/pathUtils';
import { UriEx } from '../common/uri/uriUtils';
import { TestFileSystem } from './harness/vfs/filesystem';

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

describe('py2-typeshed auto-select', () => {
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
});
