import consola from 'consola'
import { loadFixture, getPort, Nuxt, rp } from '../utils'

let nuxt, port, options
const url = route => 'http://localhost:' + port + route
const modernUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36'
const modernInfo = mode => `Modern bundles are detected. Modern mode (\`${mode}\`) is enabled now.`

describe('modern client mode (SPA)', () => {
  beforeAll(async () => {
    options = await loadFixture('modern', { render: { ssr: false } })
    nuxt = new Nuxt(options)
    await nuxt.ready()

    port = await getPort()
    await nuxt.server.listen(port, 'localhost')
  })

  test('should detect client modern mode', async () => {
    await nuxt.server.renderAndGetWindow(url('/'))
    expect(consola.info).toHaveBeenCalledWith(modernInfo('client'))
  })

  test('should contain nomodule legacy resources', async () => {
    const response = await rp(url('/'))
    expect(response).toContain('src="/_nuxt/app.js" crossorigin="use-credentials" nomodule')
    expect(response).toContain('src="/_nuxt/commons.app.js" crossorigin="use-credentials" nomodule')
  })

  test('should contain module modern resources', async () => {
    const response = await rp(url('/'))
    expect(response).toContain('<script type="module" src="/_nuxt/modern-app.js" crossorigin="use-credentials"')
    expect(response).toContain('<script type="module" src="/_nuxt/modern-commons.app.js" crossorigin="use-credentials"')
  })

  test('should contain legacy preload resources', async () => {
    const response = await rp(url('/'))
    expect(response).toContain('<link rel="preload" crossorigin="use-credentials" href="/_nuxt/app.js" as="script">')
    expect(response).toContain('<link rel="preload" crossorigin="use-credentials" href="/_nuxt/commons.app.js" as="script">')
  })

  test('should contain legacy http2 pushed resources', async () => {
    const { headers: { link } } = await rp(url('/'), { resolveWithFullResponse: true })
    expect(link).toEqual([
      '</_nuxt/runtime.js>; rel=preload; crossorigin=use-credentials; as=script',
      '</_nuxt/commons.app.js>; rel=preload; crossorigin=use-credentials; as=script',
      '</_nuxt/app.js>; rel=preload; crossorigin=use-credentials; as=script'
    ].join(', '))
  })

  test('should contain modern preload resources', async () => {
    const response = await rp(url('/'), { headers: { 'user-agent': modernUA } })
    expect(response).toContain('<link rel="modulepreload" crossorigin="use-credentials" href="/_nuxt/modern-app.js" as="script">')
    expect(response).toContain('<link rel="modulepreload" crossorigin="use-credentials" href="/_nuxt/modern-commons.app.js" as="script">')
  })

  test('should contain modern http2 pushed resources', async () => {
    const { headers: { link } } = await rp(url('/'), { headers: { 'user-agent': modernUA }, resolveWithFullResponse: true })
    expect(link).toEqual([
      '</_nuxt/modern-runtime.js>; rel=modulepreload; crossorigin=use-credentials; as=script',
      '</_nuxt/modern-commons.app.js>; rel=modulepreload; crossorigin=use-credentials; as=script',
      '</_nuxt/modern-app.js>; rel=modulepreload; crossorigin=use-credentials; as=script'
    ].join(', '))
  })

  // Close server and ask nuxt to stop listening to file changes
  afterAll(async () => {
    await nuxt.close()
  })
})
