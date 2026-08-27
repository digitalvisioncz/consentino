import {expect, it} from 'vite-plus/test';

it('can be imported without DOM globals', async () => {
    expect(globalThis).not.toHaveProperty('document');
    expect(globalThis).not.toHaveProperty('window');

    await expect(import('./index')).resolves.toBeDefined();
});
