import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { requireOwner } from "./ownerAuth";

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@clerk/express", () => ({
  getAuth: mocks.getAuth,
  clerkClient: { users: { getUser: mocks.getUser } },
}));

const app = express();
app.use((req, _res, next) => {
  req.log = { warn: vi.fn() } as unknown as typeof req.log;
  next();
});
app.use(requireOwner);
app.get("/private", (_req, res) => res.json({ authorized: true }));
app.post("/private", (_req, res) => res.json({ authorized: true }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("OWNER_EMAIL", "owner@example.com");
  vi.stubEnv("APP_ORIGIN", "");
  mocks.getAuth.mockReturnValue({ userId: "test-owner" });
  mocks.getUser.mockResolvedValue({
    emailAddresses: [{ emailAddress: "owner@example.com", verification: { status: "verified" } }],
  });
});

describe("Owner authorization", () => {
  it("rejects anonymous requests without fetching identity", async () => {
    mocks.getAuth.mockReturnValue({ userId: null });
    expect((await request(app).get("/private")).status).toBe(401);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it("permits a verified owner and disables caching", async () => {
    const res = await request(app).get("/private");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
  });
  it("matches email case-insensitively", async () => {
    vi.stubEnv("OWNER_EMAIL", " OWNER@EXAMPLE.COM ");
    expect((await request(app).get("/private")).status).toBe(200);
  });
  it("rejects another authenticated account", async () => {
    mocks.getUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: "other@example.com", verification: { status: "verified" } }],
    });
    expect((await request(app).get("/private")).status).toBe(403);
  });
  it("rejects an unverified matching email", async () => {
    mocks.getUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: "owner@example.com", verification: { status: "unverified" } }],
    });
    expect((await request(app).get("/private")).status).toBe(403);
  });
  it("fails closed if owner configuration is absent", async () => {
    vi.stubEnv("OWNER_EMAIL", "");
    expect((await request(app).get("/private")).status).toBe(503);
  });
  it("fails closed if identity lookup fails", async () => {
    mocks.getUser.mockRejectedValue(new Error("unavailable"));
    expect((await request(app).get("/private")).status).toBe(503);
  });
  it("rejects cross-origin writes", async () => {
    expect((await request(app).post("/private").set("Origin", "https://other.example.com")).status).toBe(403);
  });
  it("permits same-origin writes behind the deployment proxy", async () => {
    expect((await request(app).post("/private")
      .set("Origin", "https://dashboard.example.com")
      .set("X-Forwarded-Host", "dashboard.example.com")).status).toBe(200);
  });
  it("uses the configured origin instead of a spoofed forwarded host", async () => {
    vi.stubEnv("APP_ORIGIN", "https://dashboard.example.com");
    const response = await request(app).post("/private")
      .set("Origin", "https://attacker.example.com")
      .set("X-Forwarded-Host", "attacker.example.com");
    expect(response.status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it("allows the configured HTTPS origin behind a local upstream", async () => {
    vi.stubEnv("APP_ORIGIN", "https://dashboard.example.com");
    expect((await request(app).post("/private").set("Origin", "https://dashboard.example.com")).status).toBe(200);
  });

});
