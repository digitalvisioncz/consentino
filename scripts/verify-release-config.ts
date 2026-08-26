import {readFile} from 'node:fs/promises';

interface PackageJson {
    repository?: {
        directory?: string;
        type?: string;
        url?: string;
    };
    version?: string;
}

interface ReleaseConfig {
    packages?: Record<
        string,
        {
            'bump-minor-pre-major'?: boolean;
            'extra-files'?: Array<{jsonpath?: string; path?: string; type?: string}>;
            'include-component-in-tag'?: boolean;
            'initial-version'?: string;
            'release-type'?: string;
        }
    >;
}

const readJson = async <T>(path: string): Promise<T> => {
    return JSON.parse(await readFile(path, 'utf8')) as T;
};

const [root, cookiebot, cookieyes, config, manifest] = await Promise.all([
    readJson<PackageJson>('package.json'),
    readJson<PackageJson>('packages/cookiebot/package.json'),
    readJson<PackageJson>('packages/cookieyes/package.json'),
    readJson<ReleaseConfig>('release-please-config.json'),
    readJson<Record<string, string>>('.release-please-manifest.json'),
]);

const versions = [root.version, cookiebot.version, cookieyes.version];

if (versions.some(version => typeof version !== 'string') || new Set(versions).size !== 1) {
    throw new Error(`Release versions must match: ${versions.join(', ')}.`);
}

const release = config.packages?.['.'];

if (
    release?.['release-type'] !== 'node' ||
    release['initial-version'] !== '0.1.0' ||
    release['bump-minor-pre-major'] !== true ||
    release['include-component-in-tag'] !== false
) {
    throw new Error('Root Release Please component does not match the shared-version contract.');
}

const extraFiles = release['extra-files'] ?? [];
const expectedExtraFiles = ['packages/cookiebot/package.json', 'packages/cookieyes/package.json'];

const actualExtraFiles = extraFiles
    .filter(file => file.type === 'json' && file.jsonpath === '$.version')
    .map(file => file.path)
    .sort((a, b) => (a ?? '').localeCompare(b ?? ''));

if (JSON.stringify(actualExtraFiles) !== JSON.stringify(expectedExtraFiles)) {
    throw new Error(`Release Please version targets do not match: ${actualExtraFiles.join(', ')}.`);
}

if (Object.keys(manifest).length !== 0) {
    throw new Error('The first release must start from an empty Release Please manifest.');
}

const repositoryUrl = 'git+https://github.com/digitalvisioncz/consentino.git';

for (const [name, packageJson, directory] of [
    ['cookiebot', cookiebot, 'packages/cookiebot'],
    ['cookieyes', cookieyes, 'packages/cookieyes'],
] as const) {
    if (packageJson.repository?.type !== 'git' || packageJson.repository.url !== repositoryUrl || packageJson.repository.directory !== directory) {
        throw new Error(`${name} npm repository metadata does not match its trusted-publishing source.`);
    }
}

console.log(`Shared release ${versions[0]} configuration verified.`);
