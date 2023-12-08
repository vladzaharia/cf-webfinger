import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";

import { getConfig } from "./utils/config";
import { WebfingerLink, WebfingerResponse } from "./types/webfinger";
import { User } from "./types/config";

const app = new Hono();

app.use("*", prettyJSON());

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
  if (!config.users || Object.keys(config.users).length === 0) {
    return c.json({ message: "No users are whitelisted for access" }, 400);
  }

  let userObject: User = config.users[user];

  if (!Object.keys(config.users).includes(user)) {
    for (const userObj of Object.values(config.users)) {
      if (userObj.usernames?.includes(resource.replace("acct:", ""))) {
        userObject = userObj;
        break;
      }
    }
  }

  if (!userObject) {
    return c.json({ message: "User is not whitelisted for access" }, 400);
  }

  // Build webfinger aliases
  let aliases: string[] = [];

  // Add email if in profile
  if (userObject.email) {
    aliases.push(`mailto:${userObject.email}`);
  }

  if (aliases.length === 0) {
    aliases = undefined;
  }

  // Build webfinger properties
  let properties: Record<string, string> = {};

  // Add name if in profile
  if (userObject.name) {
    properties["http://packetizer.com/ns/name"] = userObject.name;
  }

  if (Object.keys(properties).length === 0) {
    properties = undefined;
  }

  // Build webfinger links
  let links: WebfingerLink[] = [];

  // Add profile picture if provided
  if (userObject.image) {
    links.push({
      rel: "http://webfinger.net/rel/avatar",
      type: "image/jpeg",
      href: userObject.image,
    });
  }

  // Add profile link if provided
  if (userObject.website) {
    links.push({
      rel: "http://webfinger.net/rel/profile-page",
      type: "text/html",
      href: userObject.website,
    });
  }

  // Add OIDC link if issuer is provided
  if (
    (config.oidc && config.oidc.issuer) ||
    config.domains[domain].oidc?.issuer
  ) {
    links.push({
      rel: "http://openid.net/specs/connect/1.0/issuer",
      href: config.domains[domain].oidc?.issuer || config.oidc.issuer,
    });
  }

  // Filter down to requested rels
  const rels = c.req.queries("rel");
  if (rels && rels.length > 0) {
    links = links.filter((link) => rels.includes(link.rel));
  }

  if (links.length === 0) {
    links = undefined;
  }

  // Respond with the webfinger object
  const output: WebfingerResponse = {
    subject: resource,
    aliases,
    properties,
    links,
  };
  return c.json(output);
});

export default app;
