import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GalleryImageCard } from "./gallery-image-card";

describe("GalleryImageCard", () => {
  it("renders the image when the src loads successfully", () => {
    render(
      <GalleryImageCard src="/api/storage/objects/uploads/sample.png" alt="sample.png" />
    );
    const img = screen.getByRole("img", { name: "sample.png" });
    expect(img).toBeInTheDocument();
    expect(img.tagName).toBe("IMG");
    expect(screen.queryByTestId("broken-image-fallback")).toBeNull();
  });

  it("shows a broken-image fallback and no JS error when the image fails to load", () => {
    render(
      <GalleryImageCard src="/api/storage/objects/uploads/missing.png" alt="missing.png" />
    );

    // Before the error — the real <img> element should be present
    const img = screen.getByRole("img", { name: "missing.png" });
    expect(img.tagName).toBe("IMG");

    // Simulate the browser failing to load the image (storage object missing)
    fireEvent.error(img);

    // After the error — raw <img> is replaced by the fallback; no JS exception thrown
    expect(document.querySelector("img")).toBeNull();

    const fallback = screen.getByTestId("broken-image-fallback");
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveAttribute(
      "aria-label",
      "missing.png (image unavailable)"
    );
    expect(fallback).toHaveAttribute("role", "img");
  });
});
