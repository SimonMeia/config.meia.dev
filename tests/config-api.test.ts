import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { test } from 'node:test'
import { fetchConfig, CONFIG_REQUEST_TIMEOUT_MS } from '../src/lib/config-api.ts'

const apiUrl = 'https://api.example.com/v1/config'
const emptyCatalogue = { updatedAt: '2026-06-22T00:00:00Z', configs: [] }

function jsonResponse(body: unknown = emptyCatalogue): Response {
    return new Response(JSON.stringify(body), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
}

test('fetches the exact URL without credentials or caching and validates the response', async () => {
    let calls = 0
    const result = await fetchConfig(apiUrl, {
        fetchImpl: async (url, options) => {
            calls++
            assert.equal(url, apiUrl)
            assert.equal(options?.method, 'GET')
            assert.equal(options?.credentials, 'omit')
            assert.equal(options?.cache, 'no-store')
            assert.deepEqual(options?.headers, { Accept: 'application/json' })
            assert.ok(options?.signal instanceof AbortSignal)
            return jsonResponse()
        },
    })
    assert.deepEqual(result, emptyCatalogue)
    assert.equal(calls, 1)
    assert.equal(CONFIG_REQUEST_TIMEOUT_MS, 10_000)
})

test('rejects HTTP failures and unexpected success codes without automatic retries', async () => {
    for (const status of [204, 401, 404, 429, 500, 503]) {
        let calls = 0
        await assert.rejects(fetchConfig(apiUrl, {
            fetchImpl: async () => { calls++; return new Response(null, { status }) },
        }), new RegExp(`HTTP ${status}`))
        assert.equal(calls, 1)
    }
})

test('rejects missing or incorrect Content-Type, malformed JSON and invalid data', async () => {
    for (const response of [
        new Response(JSON.stringify(emptyCatalogue)),
        new Response('{}', { headers: { 'Content-Type': 'text/html' } }),
        new Response('{invalid', { headers: { 'Content-Type': 'application/json' } }),
        jsonResponse({ configs: [] }),
    ]) {
        await assert.rejects(fetchConfig(apiUrl, { fetchImpl: async () => response }))
    }
})

test('rejects an invalid URL before sending a request', async () => {
    let calls = 0
    await assert.rejects(fetchConfig('http://example.com', {
        fetchImpl: async () => { calls++; return jsonResponse() },
    }))
    assert.equal(calls, 0)
})

test('propagates network errors without automatic retries', async () => {
    let calls = 0
    await assert.rejects(fetchConfig(apiUrl, {
        fetchImpl: async () => { calls++; throw new TypeError('Failed to fetch') },
    }), /Failed to fetch/)
    assert.equal(calls, 1)
})

test('aborts a stalled request when the timeout expires', async () => {
    let signal: AbortSignal | null | undefined
    await assert.rejects(fetchConfig(apiUrl, {
        timeoutMs: 20,
        fetchImpl: async (_url, options) => {
            signal = options?.signal
            return new Promise((_resolve, reject) => {
                signal!.addEventListener('abort', () => reject(signal!.reason), { once: true })
            })
        },
    }), { name: 'AbortError' })
    assert.equal(signal?.aborted, true)
})

test('clears the timeout after success or failure', async () => {
    for (const failure of [false, true]) {
        let signal: AbortSignal | null | undefined
        const request = fetchConfig(apiUrl, {
            timeoutMs: 20,
            fetchImpl: async (_url, options) => {
                signal = options?.signal
                if (failure) throw new TypeError('Network failure')
                return jsonResponse()
            },
        })
        if (failure) await assert.rejects(request)
        else await request
        await new Promise((resolve) => setTimeout(resolve, 40))
        assert.equal(signal?.aborted, false)
    }
})

test('the timeout also cancels a response whose body stalls after headers arrive', async () => {
    const server = createServer((_request, response) => {
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.write('{')
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    try {
        await assert.rejects(fetchConfig(`http://127.0.0.1:${address.port}/v1/config`, {
            timeoutMs: 100,
        }), { name: 'AbortError' })
    } finally {
        server.closeAllConnections()
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    }
})
