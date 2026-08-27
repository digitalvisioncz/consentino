import {readFile} from 'node:fs/promises';

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};
const isPackFile = (value: unknown): value is {path: string} => {
    return isRecord(value) && typeof value.path === 'string';
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
const files: unknown[] | undefined = isRecord(payload) && Array.isArray(payload.files) ? payload.files : undefined;

if (files === undefined || !files.every(isPackFile)) {
    throw new Error('pnpm pack returned an unexpected payload.');
}

const counts = new Map<string, number>();

for (const file of files) {
    counts.set(file.path, (counts.get(file.path) ?? 0) + 1);
}

const actual = [...counts.keys()].sort((a, b) => a.localeCompare(b));
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

const missing = expected.filter(path => !actual.includes(path));
const unexpected = actual.filter(path => !expected.includes(path));
const duplicates = actual.filter(path => (counts.get(path) ?? 0) > 1);

if (missing.length > 0 || unexpected.length > 0 || duplicates.length > 0) {
    const details = [
        missing.length > 0 ? `Missing package files: ${missing.join(', ')}` : undefined,
        unexpected.length > 0 ? `Unexpected package files: ${unexpected.join(', ')}` : undefined,
        duplicates.length > 0 ? `Duplicate package files: ${duplicates.join(', ')}` : undefined,
    ].filter((clause): clause is string => clause !== undefined);

    throw new Error(details.join('\n'));
}

const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as unknown;

if (!isRecord(packageJson) || packageJson.jsdelivr !== './dist/browser.js') {
    throw new Error('Package jsdelivr entrypoint must resolve the bare CDN URL to ./dist/browser.js.');
}

console.log('Package dist contents verified.');
