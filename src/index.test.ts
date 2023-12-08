import app from ".";

jest.mock("./utils/config", () => {
  return {
    getConfig: jest.fn(),
  };
});

import { Config, getConfig } from "./utils/config";

const successfulConfig = {
  oauth: {
    issuer: "https://some-domain.com/oauth",
  },
  domains: {
    "some-domain.com": {},
  },
};

const setConfig = (config: Config = successfulConfig) => {
  const mockedGetConfig = getConfig as jest.MockedFn<typeof getConfig>;
  mockedGetConfig.mockReturnValue(config);
}

describe("Test webfinger", () => {
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
    expect(await res.json()).toEqual({ message: "Missing resource parameter" });
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
      domains: {}
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
      }
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
});

describe("Test other routes", () => {
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
