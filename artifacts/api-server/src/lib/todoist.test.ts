import { afterEach, describe, expect, it, vi } from "vitest";
import { getTodoistProjects } from "./todoist";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Direct Todoist integration", () => {
  it("fails clearly when no independent token is configured", async () => {
    vi.stubEnv("TODOIST_API_TOKEN", "");
    await expect(getTodoistProjects()).rejects.toThrow("not configured");
  });
  it("uses the direct API and follows pagination without a managed connector", async () => {
    vi.stubEnv("TODOIST_API_TOKEN", "test-only-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({results:[{id:"1",name:"first"}],next_cursor:"next"})))
      .mockResolvedValueOnce(new Response(JSON.stringify({results:[{id:"2",name:"second"}],next_cursor:null})));
    vi.stubGlobal("fetch", fetchMock);
    expect(await getTodoistProjects()).toHaveLength(2);
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.todoist.com/api/v1/projects?cursor=next");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-only-token");
  });
});
