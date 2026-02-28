/**
 * Unit tests for src/components/Navbar.tsx
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { Navbar } from "@/components/Navbar";

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe("Navbar", () => {
  it("renders the PaperBlog brand link pointing to the home page", () => {
    render(<Navbar />);

    const brandLink = screen.getByRole("link", { name: /PaperBlog/i });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute("href", "/");
  });

  it("renders the Latest navigation link", () => {
    render(<Navbar />);

    const latestLink = screen.getByRole("link", { name: /Latest/i });
    expect(latestLink).toHaveAttribute("href", "/");
  });

  it("renders the MCP API link", () => {
    render(<Navbar />);

    const mcpLink = screen.getByRole("link", { name: /MCP API/i });
    expect(mcpLink).toHaveAttribute("href", "/api/mcp");
    expect(mcpLink).toHaveAttribute("target", "_blank");
  });

  it("renders the HF Papers external link", () => {
    render(<Navbar />);

    const hfLink = screen.getByRole("link", { name: /HF Papers/i });
    expect(hfLink).toHaveAttribute("href", "https://huggingface.co/papers");
    expect(hfLink).toHaveAttribute("target", "_blank");
  });

  it("does not show Archive link when availableDates is undefined", () => {
    render(<Navbar />);

    expect(screen.queryByRole("link", { name: /Archive/i })).not.toBeInTheDocument();
  });

  it("does not show Archive link when there is only one date", () => {
    render(<Navbar availableDates={["2025-02-01"]} />);

    expect(screen.queryByRole("link", { name: /Archive/i })).not.toBeInTheDocument();
  });

  it("shows Archive link when there are multiple dates", () => {
    render(<Navbar availableDates={["2025-02-01", "2025-02-02"]} />);

    const archiveLink = screen.getByRole("link", { name: /Archive/i });
    expect(archiveLink).toHaveAttribute("href", "/archive");
  });
});
