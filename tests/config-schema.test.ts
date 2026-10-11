import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { configResponseSchema } from '../src/lib/config-schema.ts'
import { configApiUrlSchema } from '../src/lib/api-url.ts'
import { formatUpdatedAt } from '../src/scripts/config-view.ts'

function catalogue() {
    return {
        updatedAt: '2026-06-22T23:59:59Z',
        configs: JSON.parse(readFileSync(new URL('./fixtures/config.json', import.meta.url), 'utf8')),
    }
}

test('accepts the complete existing catalogue and keeps order and numeric values', () => {
    const input = catalogue()
    const result = configResponseSchema.parse(input)
    assert.deepEqual(result, input)
    assert.deepEqual(result.configs.map(({ slug }) => slug), [
        'gaming-pc', 'gaming-peripherals', 'media-station',
    ])
    assert.equal(result.configs.flatMap(({ components }) => components).length, 20)
    assert.equal(result.configs.flatMap(({ components }) => components)
        .flatMap(({ specs }) => specs).length, 122)
    assert.equal(result.configs[0].components[2].specs[2].value, 6)
})

test('accepts empty catalogues, component lists and specification lists', () => {
    assert.equal(configResponseSchema.parse({ updatedAt: catalogue().updatedAt, configs: [] }).configs.length, 0)
    const input = catalogue()
    input.configs[0].components = []
    input.configs[1].components[0].specs = []
    input.configs[1].components[1].specs[0].value = ''
    assert.ok(configResponseSchema.safeParse(input).success)
})

test('requires every field and rejects null at every level', () => {
    const paths = [
        ['updatedAt'], ['configs'],
        ['configs', 0, 'slug'], ['configs', 0, 'name'], ['configs', 0, 'components'],
        ['configs', 0, 'components', 0, 'name'], ['configs', 0, 'components', 0, 'model'],
        ['configs', 0, 'components', 0, 'link'], ['configs', 0, 'components', 0, 'specs'],
        ['configs', 0, 'components', 0, 'specs', 0, 'name'],
        ['configs', 0, 'components', 0, 'specs', 0, 'value'],
    ]
    for (const path of paths) {
        for (const missing of [true, false]) {
            const input = catalogue()
            let parent: any = input
            for (const key of path.slice(0, -1)) parent = parent[key]
            const key = path.at(-1)!
            if (missing) delete parent[key]
            else parent[key] = null
            assert.equal(configResponseSchema.safeParse(input).success, false, `${path.join('.')} ${missing ? 'missing' : 'null'}`)
        }
    }
})

test('rejects duplicate or malformed slugs', () => {
    const input = catalogue()
    input.configs[1].slug = input.configs[0].slug
    assert.equal(configResponseSchema.safeParse(input).success, false)
    for (const slug of ['', 'Gaming-PC', '-pc', 'pc-', 'pc--gaming', 'gaming_pc', 'pc other']) {
        const input = catalogue()
        input.configs[0].slug = slug
        assert.equal(configResponseSchema.safeParse(input).success, false, slug)
    }
})

test('accepts only absolute HTTP(S) product links', () => {
    for (const link of ['javascript:alert(1)', 'data:text/html,test', 'ftp://example.com', '/product',
        'https:example.com/product', 'not a URL']) {
        const input = catalogue()
        input.configs[0].components[0].link = link
        assert.equal(configResponseSchema.safeParse(input).success, false, link)
    }
    const input = catalogue()
    input.configs[0].components[0].link = 'http://example.com/product'
    assert.ok(configResponseSchema.safeParse(input).success)
})

test('rejects invalid dates, offsets and unsupported spec values', () => {
    for (const updatedAt of ['2026-06-22', '2026-06-22T00:00:00+02:00', '2026-02-30T00:00:00Z', 'bad date']) {
        assert.equal(configResponseSchema.safeParse({ ...catalogue(), updatedAt }).success, false, updatedAt)
    }
    for (const value of [true, {}, [], Infinity, NaN]) {
        const input = catalogue()
        input.configs[0].components[0].specs[0].value = value
        assert.equal(configResponseSchema.safeParse(input).success, false)
    }
    const input = catalogue()
    input.configs[0].components[0].model = '  '
    assert.equal(configResponseSchema.safeParse(input).success, false)
})

test('ignores additional fields and keeps text as plain strings', () => {
    const input = catalogue()
    input.configs[0].name = '<img src=x onerror=alert(1)>'
    const result = configResponseSchema.parse({ ...input, extra: true })
    assert.deepEqual(result, input)
})

test('formats the update date in UTC regardless of the local time zone', () => {
    assert.equal(formatUpdatedAt('2026-06-22T23:59:59Z'), '22.06.2026')
    assert.equal(formatUpdatedAt('2026-01-01T00:00:00Z'), '01.01.2026')
})

test('validates API URLs independently of product links', () => {
    for (const url of ['https://api.example.com/v1/config', 'http://localhost:4322/v1/config',
        'http://127.0.0.1:4322/v1/config', 'http://[::1]:4322/v1/config']) {
        assert.ok(configApiUrlSchema.safeParse(url).success, url)
    }
    for (const url of ['', 'invalid', '/v1/config', 'https:api.example.com/v1/config', 'http://api.example.com/v1/config',
        'ftp://example.com', 'https://user:password@example.com', 'https://example.com/#fragment']) {
        assert.equal(configApiUrlSchema.safeParse(url).success, false, url)
    }
})
