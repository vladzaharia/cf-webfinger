import { Hono } from 'hono'

const app = new Hono()

const ACCEPTED_DOMAINS = ['polaris.rest', 'vlad.gg', 'vlad.lgbt', 'zhr.one']

app.get('/.well-known/webfinger', (c) => {
  // Check if the resource parameter is provided
  const resource = c.req.query('resource')
  if (!resource) {
    return c.json({ message: 'Missing resource parameter' }, 400)
  }

  // Check if the domain is whitelisted
  const domain = resource.split('@')[1]

  if (!resource.includes("acct:") || !domain) {
    return c.json({ message: 'Resource must be in form acct:email@domain.com' }, 400)
  }

  if (!ACCEPTED_DOMAINS.includes(domain)) {
    return c.json({ message: 'Domain is not whitelisted for Polaris Auth access' }, 400)
  }

  // Check if the request is coming from the corresponding domain
  const url = new URL(c.req.url)
  if (url.hostname !== domain && url.hostname !== 'localhost') {
    return c.json({ message: `Must access from corresponding domain`, url: `https://${domain}/.well-known/webfinger?resource=${encodeURIComponent(resource)}` }, 400)
  }

  // Set output domain
  let outputDomain = 'auth.polaris.rest'
  if (domain === 'zhr.one') {
    outputDomain = 'auth.zhr.one'
  }

  // Respond with the webfinger object
  const output = {
    "subject": resource,
    "links": [
      {
        "rel": "http://openid.net/specs/connect/1.0/issuer",
        "href": `https://${outputDomain}/application/o/tailscale/`
      }
    ]
  }  
  return c.json(output)
})

export default app
