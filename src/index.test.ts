import app from '.'

describe('Test webfinger', () => {
  it('Should return 200 response', async () => {
    const res = await app.request('https://vlad.gg/.well-known/webfinger?resource=acct:hey@vlad.gg')
    expect(res.status).toBe(200)
  })

  it('Should return 200 response when using localhost', async () => {
    const res = await app.request('http://localhost:8787/.well-known/webfinger?resource=acct:hey@vlad.gg')
    expect(res.status).toBe(200)
  })

  it('Should return 400 response when resource is not passed in', async () => {
    const res = await app.request('http://localhost/.well-known/webfinger')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: 'Missing resource parameter' })
  })

  it('Should return 400 response when resource is malformed', async () => {
    const res = await app.request('http://localhost/.well-known/webfinger?resource=acct:something')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: 'Resource must be in form acct:email@domain.com' })
  })

  it('Should return 400 response when domain is not whitelisted', async () => {
    const res = await app.request('http://localhost/.well-known/webfinger?resource=acct:vlad@example.com')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: 'Domain is not whitelisted for Polaris Auth access' })
  })

  it('Should return 400 response when domain does not match', async () => {
    const res = await app.request('http://127.0.0.1/.well-known/webfinger?resource=acct:hey@vlad.gg')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: 'Must access from corresponding domain', url: 'https://vlad.gg/.well-known/webfinger?resource=acct%3Ahey%40vlad.gg' })
  })
})

describe('Test other routes', () => {
  it('Main should return 404 response', async () => {
    const res = await app.request('http://localhost:8787/')
    expect(res.status).toBe(404)
  })

  it('Other .well-known endpoint should return 404 response', async () => {
    const res = await app.request('http://localhost:8787/.well-known/somethingelse')
    expect(res.status).toBe(404)
  })
})

