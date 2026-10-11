import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'

const configs = JSON.parse(readFileSync(new URL('./fixtures/config.json', import.meta.url), 'utf8'))
const port = Number(process.env.MOCK_API_PORT ?? 4322)
let retryRequests = 0

const server = createServer((request, response) => {
    const url = new URL(request.url, `http://localhost:${port}`)
    const scenario = url.searchParams.get('scenario') ?? 'success'
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...(scenario === 'no-cors' ? {} : { 'Access-Control-Allow-Origin': '*' }),
    }
    console.log(`${request.method} ${url.pathname}${url.search} (Origin: ${request.headers.origin ?? 'none'})`)

    if (url.pathname !== '/v1/config' || request.method !== 'GET') {
        response.writeHead(404, headers).end(JSON.stringify({ error: 'Not found' }))
        return
    }
    if (scenario === 'timeout') return // The browser will cancel this request after 10 seconds.
    const fail = scenario === 'error' || (scenario === 'retry' && retryRequests++ === 0)
    const payload = { updatedAt: '2026-06-22T23:59:59Z', configs: structuredClone(configs) }
    if (scenario === 'empty') payload.configs = []
    if (scenario === 'invalid-data') delete payload.updatedAt
    if (scenario === 'plain-text') payload.configs[0].name = '<img src=x onerror=alert(1)>'
    const body = fail ? JSON.stringify({ error: 'Simulated outage' })
        : scenario === 'invalid-json' ? '{invalid' : JSON.stringify(payload)

    const delay = Math.min(15_000, Math.max(0, Number(url.searchParams.get('delay')) || 0))
    const timer = setTimeout(() => response.writeHead(fail ? 503 : 200, headers).end(body), delay)
    response.on('close', () => clearTimeout(timer))
})

server.listen(port, '127.0.0.1', () => console.log(`Mock API: http://localhost:${port}/v1/config`))
