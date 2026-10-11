// @ts-check
import { defineConfig, envField } from 'astro/config'

import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
    vite: {
        plugins: [tailwindcss()],
    },
    site: 'https://config.meia.dev',
    env: {
        schema: {
            PUBLIC_CONFIG_API_URL: envField.string({
                context: 'client',
                access: 'public',
                url: true,
            }),
        },
    },
})
