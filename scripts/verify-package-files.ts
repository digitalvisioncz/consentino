import {readFile} from 'node:fs/promises';

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

const input = await new Promise<string>((resolve, reject) => {
    let value = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => {
        value += chunk;
    });
    process.stdin.on('end', () => resolve(value));
    process.stdin.on('error', reject);
});
const packed = JSON.parse(input) as unknown;

if (Array.isArray(packed) && packed.length !== 1) {
    throw new Error('pnpm pack returned an unexpected payload.');
}

const payload: unknown = Array.isArray(packed) ? packed[0] : packed;
const files = isRecord(payload) ? payload.files : undefined;

if (!Array.isArray(files)) {
    throw new Error('pnpm pack returned an unexpected payload.');
}

const actual = (files as unknown[])
    .map(file => (isRecord(file) && typeof file.path === 'string' ? file.path : undefined))
    .filter((path): path is string => path !== undefined)
    .sort();
const expected = [
    'LICENSE',
    'README.md',
    'dist/browser.d.ts',
    'dist/browser.js',
    'dist/browser.js.map',
    'dist/browser.mjs',
    'dist/browser.mjs.map',
    'package.json',
].sort();

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected package files: ${actual.join(', ')}`);
}

const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as unknown;

if (!isRecord(packageJson) || packageJson.jsdelivr !== './dist/browser.js') {
    throw new Error('Package jsdelivr entrypoint must resolve the bare CDN URL to ./dist/browser.js.');
}

console.log('Package dist contents verified.');
