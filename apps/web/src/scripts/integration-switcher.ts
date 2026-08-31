type ClipboardWriter = (text: string) => Promise<void> | void;

const writeToClipboard: ClipboardWriter = text => navigator.clipboard.writeText(text);

export function setupIntegrationSwitcher(root: ParentNode = document, writeText: ClipboardWriter = writeToClipboard): void {
    for (const switcher of root.querySelectorAll<HTMLElement>('[data-integration-switcher]')) {
        const code = switcher.querySelector<HTMLElement>('[data-integration-code]');
        const copyButton = switcher.querySelector<HTMLButtonElement>('[data-copy-integration]');
        const options = switcher.querySelectorAll<HTMLButtonElement>('[data-integration-option]');

        for (const option of options) {
            option.addEventListener('click', () => {
                if (!code || !option.dataset.snippet) return;

                for (const current of options) {
                    const selected = current === option;
                    current.setAttribute('aria-pressed', String(selected));
                }

                code.textContent = option.dataset.snippet;
            });
        }

        copyButton?.addEventListener('click', async () => {
            if (!code) return;

            try {
                await writeText(code.textContent ?? '');
                copyButton.textContent = 'Copied';
            } catch {
                copyButton.textContent = 'Copy unavailable';
            }
        });
    }
}
