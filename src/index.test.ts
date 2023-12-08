import app from ".";

jest.mock("./utils/config", () => {
  return {
    getConfig: jest.fn(),
  };
});

import { Config, getConfig } from "./utils/config";
import exampleConfig from "../config/config.example.json";
import { WebfingerResponse } from "./utils/webfinger";

const setConfig = (config: Config = exampleConfig) => {
  const mockedGetConfig = getConfig as jest.MockedFn<typeof getConfig>;
  mockedGetConfig.mockReturnValue(config);
};

describe("Webfinger tests", () => {
  describe("Basic webfinger tests", () => {
    it("Should return 200 response", async () => {
      setConfig();

      const res = await app.request(
        "https://some-domain.com/.well-known/webfinger?resource=acct:hey@some-domain.com",
      );
      expect(res.status).toBe(200);
    });

    it("Should return 200 response when using localhost", async () => {
      setConfig();

      const res = await app.request(
        "http://localhost:8787/.well-known/webfinger?resource=acct:hey@some-domain.com",
      );
      expect(res.status).toBe(200);
    });

    it("Should return 400 response when resource is not passed in", async () => {
      setConfig();

      const res = await app.request("http://localhost/.well-known/webfinger");
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: "Missing resource parameter",
      });
    });

    it("Should return 400 response when resource doesn't have acct", async () => {
      setConfig();

      const res = await app.request(
        "http://localhost/.well-known/webfinger?resource=something",
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: "Resource must be in form acct:email@domain.com",
      });
    });

    it("Should return 400 response when resource is malformed", async () => {
      setConfig();

      const res = await app.request(
        "http://localhost/.well-known/webfinger?resource=acct:something",
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: "Resource must be in form acct:email@domain.com",
      });
    });

    it("Should return 400 response when no domains are whitelisted", async () => {
      setConfig({
        oauth: {
          issuer: "https://some-domain.com/oauth",
        },
        domains: {},
        users: {},
      });

      const res = await app.request(
        "http://localhost/.well-known/webfinger?resource=acct:example@example.com",
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: "No domains are whitelisted for access",
      });
    });

    it("Should return 400 response when domains is empty", async () => {
      setConfig({
        oauth: {
          issuer: "https://some-domain.com/oauth",
        },
      } as any);

      const res = await app.request(
        "http://localhost/.well-known/webfinger?resource=acct:example@example.com",
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: "No domains are whitelisted for access",
      });
    });

    it("Should return 400 response when domain is not whitelisted", async () => {
      setConfig();

      const res = await app.request(
        "http://localhost/.well-known/webfinger?resource=acct:example@example.com",
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: "Domain is not whitelisted for access",
      });
    });

    it("Should return 400 response when domain does not match", async () => {
      setConfig();

      const res = await app.request(
        "http://127.0.0.1/.well-known/webfinger?resource=acct:hey@some-domain.com",
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: "Must access from corresponding domain",
        url: "https://some-domain.com/.well-known/webfinger?resource=acct%3Ahey%40some-domain.com",
      });
    });

    it("Should return 400 response when no users are whitelisted", async () => {
      setConfig({
        oauth: {
          issuer: "https://some-domain.com/oauth",
        },
        domains: {
          "some-domain.com": {},
        },
        users: {},
      });

      const res = await app.request(
        "http://localhost/.well-known/webfinger?resource=acct:hey@some-domain.com",
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: "No users are whitelisted for access",
      });
    });

    it("Should return 400 response when users is undefined", async () => {
      setConfig({
        oauth: {
          issuer: "https://some-domain.com/oauth",
        },
        domains: {
          "some-domain.com": {},
        },
      } as any);

      const res = await app.request(
        "http://localhost/.well-known/webfinger?resource=acct:hey@some-domain.com",
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: "No users are whitelisted for access",
      });
    });

    it("Should return 400 response when user is not whitelisted", async () => {
      setConfig();

      const res = await app.request(
        "http://localhost/.well-known/webfinger?resource=acct:nonexistent-user@some-domain.com",
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: "User is not whitelisted for access",
      });
    });
  });

  describe("Subject tests", () => {
    it.each(
      Object.keys(exampleConfig.domains).flatMap((domain) =>
        Object.keys(exampleConfig.users).flatMap((user) => [
          [`acct:${user}@${domain}`, domain],
          ...(exampleConfig.users[user].aliases || []).map((alias) => [
            `acct:${alias}`,
            alias.split("@")[1],
          ]),
        ]),
      ),
    )("Should return subject passed in (%p)", async (resource, domain) => {
      setConfig();

      const res = await app.request(
        `https://${domain}/.well-known/webfinger?resource=${resource}`,
      );
      const json = await res.json<WebfingerResponse>();
      expect(json.subject).toBe(resource);
    });
  });

  describe("Oauth issuer tests", () => {
    it.each(
      Object.keys(exampleConfig.domains).map((domain) => [
        domain,
        (exampleConfig as Config).domains[domain].oauth?.issuer ||
          exampleConfig.oauth.issuer,
      ]),
    )("Should return issuer from config (%p)", async (domain, issuer) => {
      setConfig();

      const res = await app.request(
        `https://${domain}/.well-known/webfinger?resource=acct:example@${domain}`,
      );
      const json = await res.json<WebfingerResponse>();
      expect(json.links[0].rel).toBe(
        "http://openid.net/specs/connect/1.0/issuer",
      );
      expect(json.links[0].href).toBe(issuer);
    });
  });
});

describe("Other route tests", () => {
  it("Main should return 404 response", async () => {
    const res = await app.request("http://localhost:8787/");
    expect(res.status).toBe(404);
  });

  it("Other .well-known endpoint should return 404 response", async () => {
    const res = await app.request(
      "http://localhost:8787/.well-known/somethingelse",
    );
    expect(res.status).toBe(404);
  });
});
