/**
 * QUALIA.CODE v1.1 - App Component Test
 * Simple test to verify MainLayout renders
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock MainLayout component
vi.mock("../components/layout/MainLayout", () => ({
  default: () => <div data-testid="main-layout">MainLayout</div>,
}));

describe("App Component", () => {
  it("should render MainLayout", () => {
    const { App } = require("../App");
    render(<App />);
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });
});
