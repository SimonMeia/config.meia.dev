// 1. Import utilities from `astro:content`
import { file } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

// 2. Import loader(s)

// 3. Define your collection(s)
const config = defineCollection({
    loader: file('src/data/config.json'),
    schema: z.object({
        slug: z.string(),
        name: z.string(),
        components: z.array(
            z.object({
                name: z.string(),
                model: z.string(),
                link: z.string().url(),
                specs: z.array(
                    z.object({
                        name: z.string(),
                        value: z.union([z.string(), z.number()]),
                    })
                ),
            })
        ),
    }),
})

// 4. Export a single `collections` object to register your collection(s)
export const collections = { config }
