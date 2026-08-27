import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {expect, it} from 'vite-plus/test';

const releaseVerifier = fileURLToPath(new URL('./verify-release-config.ts', import.meta.url));
const repositoryDirectory = fileURLToPath(new URL('../', import.meta.url));

it('reports only string Release Please version target paths', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'consentino-release-config-'));

    try {
        await mkdir(join(fixture, 'packages/cookiebot'), {recursive: true});
        await mkdir(join(fixture, 'packages/cookieyes'), {recursive: true});

        const repository = {
            type: 'git',
            url: 'git+https://github.com/digitalvisioncz/consentino.git',
        };
        const packageJson = (directory?: string) => ({
            repository: directory === undefined ? repository : {...repository, directory},
            version: '0.1.0',
        });

        await Promise.all([
            writeFile(join(fixture, 'package.json'), JSON.stringify(packageJson())),
            writeFile(join(fixture, 'packages/cookiebot/package.json'), JSON.stringify(packageJson('packages/cookiebot'))),
            writeFile(join(fixture, 'packages/cookieyes/package.json'), JSON.stringify(packageJson('packages/cookieyes'))),
            writeFile(join(fixture, '.release-please-manifest.json'), '{}'),
            writeFile(
                join(fixture, 'release-please-config.json'),
                JSON.stringify({
                    packages: {
                        '.': {
                            'release-type': 'node',
                            'initial-version': '0.1.0',
                            'bump-minor-pre-major': true,
                            'include-component-in-tag': false,
                            'extra-files': [
                                {type: 'json', path: 'packages/cookiebot/package.json', jsonpath: '$.version'},
                                {type: 'json', jsonpath: '$.version'},
                                {type: 'json', path: 'packages/cookieyes/package.json', jsonpath: '$.version'},
                            ],
                        },
                    },
                }),
            ),
        ]);

        const result = spawnSync(process.execPath, [releaseVerifier], {cwd: fixture, encoding: 'utf8'});

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('Release Please version targets do not match: packages/cookiebot/package.json, packages/cookieyes/package.json.');
        expect(result.stderr).not.toContain('Release Please version targets do not match: ,');
    } finally {
        await rm(fixture, {force: true, recursive: true});
    }
});

it('includes package manifests in the resolved root test inputs', () => {
    const result = spawnSync('moon', ['query', 'tasks', '--project', 'root', '--id', 'test'], {
        cwd: repositoryDirectory,
        encoding: 'utf8',
    });

    expect(result.status).toBe(0);

    const query = JSON.parse(result.stdout) as {
        tasks: {root: {test: {inputFiles: Record<string, unknown>}}};
    };

    expect(query.tasks.root.test.inputFiles).toHaveProperty('packages/cookiebot/package.json');
    expect(query.tasks.root.test.inputFiles).toHaveProperty('packages/cookieyes/package.json');
});
