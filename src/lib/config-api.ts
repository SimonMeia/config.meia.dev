import { configApiUrlSchema } from './api-url.ts'
import { configResponseSchema, type ConfigResponse } from './config-schema.ts'

export const CONFIG_REQUEST_TIMEOUT_MS = 10_000

export async function fetchConfig(
    apiUrl: string,
    { fetchImpl = fetch, timeoutMs = CONFIG_REQUEST_TIMEOUT_MS }:
        { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<ConfigResponse> {
    const url = configApiUrlSchema.parse(apiUrl)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetchImpl(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            credentials: 'omit',
            cache: 'no-store',
            signal: controller.signal,
        })

        if (response.status !== 200) {
            throw new Error(`Configuration API returned HTTP ${response.status}`)
        }

        const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
        if (contentType !== 'application/json') {
            throw new Error('Configuration API must return application/json')
        }

        return configResponseSchema.parse(await response.json())
    } finally {
        clearTimeout(timeout)
    }
}
