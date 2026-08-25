import dvdevEslint from '@dvdevcz/eslint';

export default [
    {
        ignores: ['**/*.d.ts', '**/*.d.mts'],
    },
    ...dvdevEslint.configs.base,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
];
