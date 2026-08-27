import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {chmod, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {expect, it} from 'vite-plus/test';
import {parse} from 'yaml';

interface WorkflowStep {
    id?: string;
    if?: string;
    run?: string;
    uses?: string;
    with?: {ref?: string};
}

interface Workflow {
    jobs: {
        publish: {if?: string; steps: WorkflowStep[]};
        release: {outputs?: Record<string, string>; steps: WorkflowStep[]};
    };
}

const repositoryDirectory = fileURLToPath(new URL('../', import.meta.url));
const workflowPath = join(repositoryDirectory, '.github/workflows/release.yml');

const readWorkflow = async (): Promise<Workflow> => {
    return parse(await readFile(workflowPath, 'utf8')) as Workflow;
};

it('resolves the latest GitHub release for a manual run', async () => {
    const workflow = await readWorkflow();
    const releaseJob = workflow.jobs.release;
    const releasePlease = releaseJob.steps.find(step => step.id === 'release');
    const latest = releaseJob.steps.find(step => step.id === 'latest');

    expect(releasePlease?.if).toBe("github.event_name == 'push'");
    expect(latest?.if).toBe("github.event_name == 'workflow_dispatch'");
    expect(releaseJob.outputs).toMatchObject({
        created: '${{ steps.release.outputs.release_created || steps.latest.outputs.release_created }}',
        tag: '${{ steps.release.outputs.tag_name || steps.latest.outputs.tag }}',
        version: '${{ steps.release.outputs.version || steps.latest.outputs.version }}',
    });

    const fixture = await mkdtemp(join(tmpdir(), 'consentino-latest-release-'));

    try {
        const gh = join(fixture, 'gh');
        const output = join(fixture, 'github-output');
        await writeFile(
            gh,
            `#!/bin/sh
test "$*" = "api repos/digitalvisioncz/consentino/releases/latest --jq .tag_name" || exit 2
printf 'v1.2.3\\n'
`,
        );
        await chmod(gh, 0o755);

        const result = spawnSync('bash', ['-euo', 'pipefail', '-c', latest?.run ?? 'exit 99'], {
            encoding: 'utf8',
            env: {
                ...process.env,
                GITHUB_OUTPUT: output,
                GITHUB_REPOSITORY: 'digitalvisioncz/consentino',
                PATH: `${fixture}:${process.env.PATH}`,
            },
        });

        expect(result.status).toBe(0);
        expect(await readFile(output, 'utf8')).toBe('tag=v1.2.3\nversion=1.2.3\nrelease_created=true\n');
    } finally {
        await rm(fixture, {force: true, recursive: true});
    }
});

it('publishes only package versions missing from npm', async () => {
    const workflow = await readWorkflow();
    const publishJob = workflow.jobs.publish;
    const checkout = publishJob.steps.find(step => step.uses?.startsWith('actions/checkout@'));
    const publish = publishJob.steps.find(step => step.run?.includes('npm publish'));

    expect(publishJob.if).toContain("vars.NPM_PUBLISH_ENABLED == 'true'");
    expect(publishJob.if).toContain("github.ref == 'refs/heads/main'");
    expect(checkout?.with?.ref).toBe('${{ needs.release.outputs.tag }}');

    const fixture = await mkdtemp(join(tmpdir(), 'consentino-npm-publish-'));

    try {
        const npm = join(fixture, 'npm');
        const log = join(fixture, 'npm.log');
        await writeFile(
            npm,
            `#!/bin/sh
printf '%s\\n' "$*" >> "$NPM_TEST_LOG"
case "$*" in
  "view @consentino/cookiebot@1.2.3 version --json") exit 0 ;;
  "view @consentino/cookieyes@1.2.3 version --json")
    printf '{"error":{"code":"E404"}}\\n'
    exit 1
    ;;
  publish*) exit 0 ;;
  *) exit 2 ;;
esac
`,
        );
        await chmod(npm, 0o755);

        const result = spawnSync('bash', ['-euo', 'pipefail', '-c', publish?.run ?? 'exit 99'], {
            encoding: 'utf8',
            env: {
                ...process.env,
                NPM_TEST_LOG: log,
                PATH: `${fixture}:${process.env.PATH}`,
                RELEASE_VERSION: '1.2.3',
                RUNNER_TEMP: fixture,
            },
        });

        expect(result.status).toBe(0);
        expect(await readFile(log, 'utf8')).toBe(
            'view @consentino/cookiebot@1.2.3 version --json\n' +
                'view @consentino/cookieyes@1.2.3 version --json\n' +
                `publish ${fixture}/consentino-packages/consentino-cookieyes-1.2.3.tgz --access public\n`,
        );
    } finally {
        await rm(fixture, {force: true, recursive: true});
    }
});

it('stops when npm lookup fails for a reason other than a missing version', async () => {
    const workflow = await readWorkflow();
    const publish = workflow.jobs.publish.steps.find(step => step.run?.includes('npm publish'));
    const fixture = await mkdtemp(join(tmpdir(), 'consentino-npm-failure-'));

    try {
        const npm = join(fixture, 'npm');
        const log = join(fixture, 'npm.log');
        await writeFile(
            npm,
            `#!/bin/sh
printf '%s\\n' "$*" >> "$NPM_TEST_LOG"
printf '{"error":{"code":"E500"}}\\n'
exit 1
`,
        );
        await chmod(npm, 0o755);

        const result = spawnSync('bash', ['-euo', 'pipefail', '-c', publish?.run ?? 'exit 99'], {
            encoding: 'utf8',
            env: {
                ...process.env,
                NPM_TEST_LOG: log,
                PATH: `${fixture}:${process.env.PATH}`,
                RELEASE_VERSION: '1.2.3',
                RUNNER_TEMP: fixture,
            },
        });

        expect(result.status).toBe(1);
        expect(await readFile(log, 'utf8')).toBe('view @consentino/cookiebot@1.2.3 version --json\n');
    } finally {
        await rm(fixture, {force: true, recursive: true});
    }
});
