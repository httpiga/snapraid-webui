import { describe, expect, test } from "bun:test";
import { getAuthGateState } from "./auth-guard";

describe("getAuthGateState", () => {
  test("returns loading when status is missing", () => {
    expect(getAuthGateState(true, undefined)).toBe("loading");
    expect(getAuthGateState(false, null)).toBe("loading");
  });

  test("returns login when auth is enabled but not authenticated", () => {
    expect(
      getAuthGateState(false, { enabled: true, authenticated: false, username: null })
    ).toBe("login");
  });

  test("returns app when auth is disabled", () => {
    expect(
      getAuthGateState(false, { enabled: false, authenticated: false, username: null })
    ).toBe("app");
  });

  test("returns app when authenticated", () => {
    expect(
      getAuthGateState(false, { enabled: true, authenticated: true, username: "admin" })
    ).toBe("app");
  });
});
