import { z } from 'zod'

const labelSchema = z.string().refine((value) => value.trim().length > 0, {
    message: 'Expected a non-empty label',
})

const productLinkSchema = z.string().url().regex(/^https?:\/\//i).refine((value) => {
    try {
        const protocol = new URL(value).protocol
        return protocol === 'http:' || protocol === 'https:'
    } catch {
        return false
    }
}, 'Expected an absolute HTTP or HTTPS URL')

export const componentSchema = z.object({
    name: labelSchema,
    model: labelSchema,
    link: productLinkSchema,
    specs: z.array(z.object({
        name: labelSchema,
        value: z.union([z.string(), z.number().finite()]),
    })),
})

export const configResponseSchema = z.object({
    updatedAt: z.string().datetime(),
    configs: z.array(z.object({
        slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        name: labelSchema,
        components: z.array(componentSchema),
    })),
}).superRefine(({ configs }, context) => {
    const slugs = new Set<string>()
    configs.forEach((config, index) => {
        if (slugs.has(config.slug)) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['configs', index, 'slug'],
                message: 'Category slugs must be unique',
            })
        }
        slugs.add(config.slug)
    })
})

export type ConfigResponse = z.infer<typeof configResponseSchema>
export type ConfigComponent = z.infer<typeof componentSchema>
