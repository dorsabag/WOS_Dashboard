import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getGetTroopsQueryKey, useGetTroops } from "@workspace/api-client-react";
import type { PropsWithChildren } from "react";

describe("Dashboard API hooks", () => {
  it("uses the dashboard QueryClient provider across workspace packages", () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, unmount } = renderHook(
      () => useGetTroops({
        query: { queryKey: getGetTroopsQueryKey(), enabled: false },
      }),
      { wrapper },
    );
    expect(result.current.isPending).toBe(true);
    unmount();
    queryClient.clear();
  });
});
