import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

import {expect, it} from 'vite-plus/test';

const packageVerifier = fileURLToPath(new URL('./verify-package-files.ts', import.meta.url));
const packageDirectory = fileURLToPath(new URL('../packages/cookiebot/', import.meta.url));
const expectedFiles = [
    'LICENSE',
    'README.md',
    'dist/browser.d.ts',
    'dist/browser.js',
    'dist/browser.js.map',
    'dist/browser.mjs',
    'dist/browser.mjs.map',
    'package.json',
];

const runVerifier = (files: unknown[]) =>
    spawnSync(process.execPath, [packageVerifier], {
        cwd: packageDirectory,
        encoding: 'utf8',
        input: JSON.stringify([{files}]),
    });

it('rejects a pnpm pack payload containing a malformed file entry', () => {
    const result = runVerifier([...expectedFiles.map(path => ({path})), null]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('pnpm pack returned an unexpected payload.');
});

it('reports missing package files without mislabeling present files', () => {
    const result = runVerifier(expectedFiles.filter(path => path !== 'README.md').map(path => ({path})));

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Missing package files: README.md');
    expect(result.stderr).not.toContain('Unexpected package files:');
});

it('rejects duplicate package files without mislabeling them', () => {
    const result = runVerifier([...expectedFiles, 'README.md'].map(path => ({path})));

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Duplicate package files: README.md');
    expect(result.stderr).not.toContain('Missing package files:');
    expect(result.stderr).not.toContain('Unexpected package files:');
});

it('reports an unexpected package file without reporting missing files', () => {
    const result = runVerifier([...expectedFiles, 'notes.txt'].map(path => ({path})));

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Unexpected package files: notes.txt');
    expect(result.stderr).not.toContain('Missing package files:');
    expect(result.stderr).not.toContain('Duplicate package files:');
});

it('reports combined missing and unexpected package files precisely', () => {
    const result = runVerifier([...expectedFiles.filter(path => path !== 'README.md'), 'notes.txt'].map(path => ({path})));

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Missing package files: README.md');
    expect(result.stderr).toContain('Unexpected package files: notes.txt');
    expect(result.stderr).not.toContain('Duplicate package files:');
});
