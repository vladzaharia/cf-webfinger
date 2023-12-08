import { Hono } from "hono";

import { User, getConfig } from "./utils/config";
import { WebfingerResponse } from "./utils/webfinger";

const app = new Hono();

app.get("/.well-known/webfinger", (c) => {
  const config = getConfig();

  // Check if the resource parameter is provided
  const resource = c.req.query("resource");
  if (!resource) {
    return c.json({ message: "Missing resource parameter" }, 400);
  }

  // Check if the domain can be extracted
  const email = resource.replace("acct:", "");
  const user = email.split("@")[0];
  const domain = email.split("@")[1];

  if (!resource.includes("acct:") || !domain) {
    return c.json(
      { message: "Resource must be in form acct:email@domain.com" },
      400,
    );
  }

  // Check if the domain is whitelisted
  if (!config.domains || Object.keys(config.domains).length === 0) {
    return c.json({ message: "No domains are whitelisted for access" }, 400);
  }
  if (!Object.keys(config.domains).includes(domain)) {
    return c.json({ message: "Domain is not whitelisted for access" }, 400);
  }

  // Check if the request is coming from the corresponding domain
  const url = new URL(c.req.url);
  if (url.hostname !== domain && url.hostname !== "localhost") {
    return c.json(
      {
        message: `Must access from corresponding domain`,
        url: `https://${domain}/.well-known/webfinger?resource=${encodeURIComponent(
          resource,
        )}`,
      },
      400,
    );
  }

  // Check if user is authorized
  let userObject: User;

  if (!config.users || Object.keys(config.users).length === 0) {
    return c.json({ message: "No users are whitelisted for access" }, 400);
  }

  if (!Object.keys(config.users).includes(user)) {
    for (const user of Object.values(config.users)) {
      if (user.aliases?.includes(resource.replace("acct:", ""))) {
        userObject = user;
        break;
      }
    }

    if (!userObject) {
      return c.json({ message: "User is not whitelisted for access" }, 400);
    }
  }

  // Respond with the webfinger object
  const output: WebfingerResponse = {
    subject: resource,
    links: [
      {
        rel: "http://openid.net/specs/connect/1.0/issuer",
        href: config.domains[domain].oauth?.issuer || config.oauth.issuer,
      },
    ],
  };
  return c.json(output);
});

export default app;
