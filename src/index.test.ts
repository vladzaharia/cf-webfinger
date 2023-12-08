import app from ".";
import { Config, User } from "./types/config";
import { WebfingerResponse } from "./types/webfinger";
import exampleConfig from "../config/config.example.json";

jest.mock("./utils/config", () => {
  return {
    getConfig: jest.fn(),
  };
});

import { getConfig } from "./utils/config";

const setConfig = (config: Config = exampleConfig) => {
  const mockedGetConfig = getConfig as jest.MockedFn<typeof getConfig>;
  mockedGetConfig.mockReturnValue(config);
};

const userMatrix = Object.keys(exampleConfig.users).map((user) => [
  `acct:${user}@${Object.keys(exampleConfig.domains)[0]}`,
  (exampleConfig as Config).users[user],
]);

describe("Webfinger tests", () => {
  describe("HTTP status code", () => {
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
        oidc: {
          issuer: "https://some-domain.com/oidc",
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
        oidc: {
          issuer: "https://some-domain.com/oidc",
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
        oidc: {
          issuer: "https://some-domain.com/oidc",
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
        oidc: {
          issuer: "https://some-domain.com/oidc",
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

  describe("subject", () => {
    it.each(
      Object.keys(exampleConfig.domains).flatMap((domain) =>
        Object.keys(exampleConfig.users).flatMap((user) => [
          [
            `acct:${user}@${domain}`,
            domain,
            ...(exampleConfig.users[user].usernames || []).map((alias) => [
              `acct:${alias}`,
              alias.split("@")[1],
            ]),
          ],
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

  describe("aliases", () => {
    it.each(userMatrix)(
      "Should return aliases for user (%p)",
      async (resource, user) => {
        setConfig();

        const res = await app.request(
          `https://localhost/.well-known/webfinger?resource=${resource}`,
        );
        const json = await res.json<WebfingerResponse>();
        expect(json.aliases).toBeDefined();

        if ((user as User).email) {
          expect(json.aliases).toContain(`mailto:${(user as User).email}`);
        } else {
          expect(json.aliases).toBeUndefined();
        }
      },
    );

    it("Should return email", async () => {
      setConfig({
        oidc: {
          issuer: "https://some-domain.com/oidc",
        },
        domains: {
          "some-domain.com": {},
        },
        users: {
          example: {
            email: "example@example.com",
          },
        },
      });

      const res = await app.request(
        `https://localhost/.well-known/webfinger?resource=acct:example@some-domain.com`,
      );
      const json = await res.json<WebfingerResponse>();
      expect(json.aliases).toContain(`mailto:example@example.com`);
    });

    it("Should not return email", async () => {
      setConfig({
        oidc: {
          issuer: "https://some-domain.com/oidc",
        },
        domains: {
          "some-domain.com": {},
        },
        users: {
          example: {},
        },
      });

      const res = await app.request(
        `https://localhost/.well-known/webfinger?resource=acct:example@some-domain.com`,
      );
      const json = await res.json<WebfingerResponse>();
      expect(json.aliases).toBeUndefined();
    });
  });

  describe("properties", () => {
    describe("name", () => {
      it.each(userMatrix)(
        "Should return name for user (%p)",
        async (resource, user) => {
          setConfig();

          const res = await app.request(
            `https://localhost/.well-known/webfinger?resource=${resource}`,
          );
          const json = await res.json<WebfingerResponse>();

          if ((user as User).name) {
            expect(json.properties).toBeDefined();
            expect(json.properties["http://packetizer.com/ns/name"]).toBe(
              (user as User).name,
            );
          } else {
            expect(json.properties).toBeUndefined();
          }
        },
      );

      it("Should return name if set", async () => {
        setConfig({
          oidc: {
            issuer: "https://some-domain.com/oidc",
          },
          domains: {
            "some-domain.com": {},
          },
          users: {
            example: {
              name: "Example User",
            },
          },
        });

        const res = await app.request(
          `https://localhost/.well-known/webfinger?resource=acct:example@some-domain.com`,
        );
        const json = await res.json<WebfingerResponse>();
        expect(json.properties).toBeDefined();
            expect(json.properties["http://packetizer.com/ns/name"]).toBe(
              "Example User",
            );
      });

      it("Should not return name if unset", async () => {
        setConfig({
          oidc: {
            issuer: "https://some-domain.com/oidc",
          },
          domains: {
            "some-domain.com": {},
          },
          users: {
            example: {},
          },
        });

        const res = await app.request(
          `https://localhost/.well-known/webfinger?resource=acct:example@some-domain.com`,
        );
        const json = await res.json<WebfingerResponse>();
        expect(json.properties).toBeUndefined();
      });
    });
  });

  describe("links", () => {
    describe("avatar", () => {
      it.each(userMatrix)(
        "Should return avatar link for user (%p)",
        async (resource, user) => {
          setConfig();

          const res = await app.request(
            `https://localhost/.well-known/webfinger?resource=${resource}`,
          );
          const json = await res.json<WebfingerResponse>();
          const avatarLink = json.links?.find(
            (link) => link.rel === "http://webfinger.net/rel/avatar",
          );

          if ((user as User).image) {
            expect(avatarLink).toBeDefined();
            expect(avatarLink.href).toBe((user as User).image);
            expect(avatarLink.type).toBe("image/jpeg");
          } else {
            expect(avatarLink).toBeUndefined();
          }
        },
      );

      it("Should return avatar", async () => {
        setConfig({
          oidc: {
            issuer: "https://some-domain.com/oidc",
          },
          domains: {
            "some-domain.com": {},
          },
          users: {
            example: {
              image: "https://example.com/image.jpg",
            },
          },
        });

        const res = await app.request(
          `https://localhost/.well-known/webfinger?resource=acct:example@some-domain.com`,
        );
        const json = await res.json<WebfingerResponse>();
        const avatarLink = json.links?.find(
          (link) => link.rel === "http://webfinger.net/rel/avatar",
        );

        expect(avatarLink).toBeDefined();
        expect(avatarLink.href).toBe("https://example.com/image.jpg");
        expect(avatarLink.type).toBe("image/jpeg");
      });

      it("Should not return avatar", async () => {
        setConfig({
          oidc: {
            issuer: "https://some-domain.com/oidc",
          },
          domains: {
            "some-domain.com": {},
          },
          users: {
            example: {},
          },
        });

        const res = await app.request(
          `https://localhost/.well-known/webfinger?resource=acct:example@some-domain.com`,
        );
        const json = await res.json<WebfingerResponse>();
        const avatarLink = json.links?.find(
          (link) => link.rel === "http://webfinger.net/rel/avatar",
        );

        expect(avatarLink).toBeUndefined();
      });
    });

    describe("profile page", () => {
      it.each(userMatrix)(
        "Should return profile page link for user (%p)",
        async (resource, user) => {
          setConfig();

          const res = await app.request(
            `https://localhost/.well-known/webfinger?resource=${resource}`,
          );
          const json = await res.json<WebfingerResponse>();
          const profileLink = json.links?.find(
            (link) => link.rel === "http://webfinger.net/rel/profile-page",
          );

          if ((user as User).website) {
            expect(profileLink).toBeDefined();
            expect(profileLink.href).toBe((user as User).website);
          } else {
            expect(profileLink).toBeUndefined();
          }
        },
      );

      it("Should return profile page", async () => {
        setConfig({
          oidc: {
            issuer: "https://some-domain.com/oidc",
          },
          domains: {
            "some-domain.com": {},
          },
          users: {
            example: {
              website: "https://example.com/",
            },
          },
        });

        const res = await app.request(
          `https://localhost/.well-known/webfinger?resource=acct:example@some-domain.com`,
        );
        const json = await res.json<WebfingerResponse>();
        const profileLink = json.links?.find(
          (link) => link.rel === "http://webfinger.net/rel/profile-page",
        );

        expect(profileLink).toBeDefined();
        expect(profileLink.href).toBe("https://example.com/");
      });

      it("Should not return profile page", async () => {
        setConfig({
          oidc: {
            issuer: "https://some-domain.com/oidc",
          },
          domains: {
            "some-domain.com": {},
          },
          users: {
            example: {},
          },
        });

        const res = await app.request(
          `https://localhost/.well-known/webfinger?resource=acct:example@some-domain.com`,
        );
        const json = await res.json<WebfingerResponse>();
        const profileLink = json.links?.find(
          (link) => link.rel === "http://webfinger.net/rel/profile-page",
        );

        expect(profileLink).toBeUndefined();
      });
    });

    describe("OIDC issuer", () => {
      it.each(
        Object.keys(exampleConfig.domains).map((domain) => [
          domain,
          (exampleConfig as Config).domains[domain].oidc?.issuer ||
            exampleConfig.oidc.issuer,
        ]),
      )("Should return issuer from config (%p)", async (domain, issuer) => {
        setConfig();

        const res = await app.request(
          `https://${domain}/.well-known/webfinger?resource=acct:example@${domain}`,
        );
        const json = await res.json<WebfingerResponse>();
        const oidcLink = json.links?.find(
          (link) => link.rel === "http://openid.net/specs/connect/1.0/issuer",
        );
        expect(oidcLink).toBeDefined();
        expect(oidcLink.href).toBe(issuer);
      });

      it("Should return only issuer link if rel is set", async () => {
        setConfig();

        const res = await app.request(
          `https://some-domain.com/.well-known/webfinger?resource=acct:example@some-domain.com&rel=http://openid.net/specs/connect/1.0/issuer`,
        );
        const json = await res.json<WebfingerResponse>();
        expect(json.links?.length).toBe(1);
        const oidcLink = json.links?.find(
          (link) => link.rel === "http://openid.net/specs/connect/1.0/issuer",
        );
        expect(oidcLink).toBeDefined();
      });

      it("Should return issuer from domain config if global is unset", async () => {
        setConfig({
          domains: {
            "some-domain.com": {
              oidc: {
                issuer: "https://some-other-domain.com/oidc",
              },
            },
          },
          users: {
            example: {},
          },
        });

        const res = await app.request(
          `https://some-domain.com/.well-known/webfinger?resource=acct:example@some-domain.com`,
        );
        const json = await res.json<WebfingerResponse>();
        const oidcLink = json.links?.find(
          (link) => link.rel === "http://openid.net/specs/connect/1.0/issuer",
        );
        expect(oidcLink).toBeDefined();
        expect(oidcLink.href).toBe("https://some-other-domain.com/oidc");
      });

      it("Should return no issuer link if unset", async () => {
        setConfig({
          domains: {
            "some-domain.com": {},
          },
          users: {
            example: {},
          },
        });

        const res = await app.request(
          `https://some-domain.com/.well-known/webfinger?resource=acct:example@some-domain.com`,
        );
        const json = await res.json<WebfingerResponse>();
        const oidcLink = json.links?.find(
          (link) => link.rel === "http://openid.net/specs/connect/1.0/issuer",
        );
        expect(oidcLink).toBeUndefined();
      });
    });

    it("Should return no links if none are set", async () => {
      setConfig({
        domains: {
          "some-domain.com": {},
        },
        users: {
          example: {},
        },
      });

      const res = await app.request(
        `https://some-domain.com/.well-known/webfinger?resource=acct:example@some-domain.com&rel=sosme-unexistent-ref`,
      );
      const json = await res.json<WebfingerResponse>();
      expect(json.links).toBeUndefined();
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
