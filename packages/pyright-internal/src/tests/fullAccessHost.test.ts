/*
 * fullAccessHost.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Unit tests for FullAccessHost interpreter invocation, in particular the
 * flags used to query the interpreter's version. Regression coverage for the
 * py2 "-I bug": `getPythonVersion` used to run the interpreter with `-I`
 * (isolated mode), which only exists on Python 3.4+. Python 2.7 rejects it
 * ("Unknown option: -I") and exits without running the version script, so the
 * version came back `undefined` and the caller silently fell back to a
 * PATH-discovered Python 3 interpreter -- the source of the py3-stdlib leak.
 */

import * as child_process from 'child_process';

import { NullConsole } from '../common/console';
import { FullAccessHost } from '../common/fullAccessHost';
import { pythonVersion2_7 } from '../common/pythonVersion';
import { createServiceProvider } from '../common/serviceProviderExtensions';
import { UriEx } from '../common/uri/uriUtils';
import { TestFileSystem } from './harness/vfs/filesystem';

jest.mock('child_process');

const mockedExecFileSync = child_process.execFileSync as jest.MockedFunction<typeof child_process.execFileSync>;

describe('FullAccessHost.getPythonVersion interpreter invocation', () => {
    afterEach(() => {
        mockedExecFileSync.mockReset();
    });

    function makeHost() {
        const fs = new TestFileSystem(/* ignoreCase */ true);
        const sp = createServiceProvider(fs, new NullConsole());
        return new FullAccessHost(sp);
    }

    it('queries the interpreter with py2-compatible isolation flags (-E -s), never -I', () => {
        mockedExecFileSync.mockReturnValue(JSON.stringify([2, 7, 18, 'final', 0]) as any);
        const host = makeHost();

        const version = host.getPythonVersion(UriEx.file('/fake/python2.7'));

        // The reported version reflects the configured interpreter (2.7), not a PATH fallback.
        expect(version?.major).toBe(pythonVersion2_7.major);
        expect(version?.minor).toBe(pythonVersion2_7.minor);

        // Exactly one interpreter invocation (the configured pythonPath, no fallback).
        expect(mockedExecFileSync).toHaveBeenCalledTimes(1);
        const args = mockedExecFileSync.mock.calls[0][1] as string[];

        // The bug: `-I` is Python 3.4+ only; Python 2.7 rejects it. It must not be used.
        expect(args).not.toContain('-I');
        // `-E -s` is the py2+py3-compatible replacement (cwd is stripped in-script).
        expect(args).toContain('-E');
        expect(args).toContain('-s');
        // Still executes the version script via -c.
        expect(args).toContain('-c');
    });

    it('returns undefined when the interpreter rejects the query (simulating an unknown flag)', () => {
        mockedExecFileSync.mockImplementation(() => {
            throw new Error('Unknown option: -I');
        });
        const host = makeHost();

        const version = host.getPythonVersion(UriEx.file('/fake/python2.7'));
        expect(version).toBeUndefined();
    });
});
