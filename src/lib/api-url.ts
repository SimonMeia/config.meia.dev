import { z } from 'zod'

export const configApiUrlSchema = z.string().url().regex(/^https?:\/\//i).refine((value) => {
    try {
        const url = new URL(value)
        const localHosts = ['localhost', '127.0.0.1', '[::1]']
        return (
            !url.username &&
            !url.password &&
            !url.hash &&
            (url.protocol === 'https:' ||
                (url.protocol === 'http:' && localHosts.includes(url.hostname)))
        )
    } catch {
        return false
    }
}, 'PUBLIC_CONFIG_API_URL must be an HTTPS URL (HTTP is allowed on localhost only), without credentials or a fragment.')
