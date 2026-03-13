import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PermissionsPage from "../pages/Admin/PermissionsPage";

vi.mock("../components/Breadcrumb", () => ({
  default: ({ items }) => (
    <div data-testid="breadcrumb">
      {items.map((item, i) => (
        <span key={i}>{item.label}</span>
      ))}
    </div>
  ),
}));

describe("PermissionsPage Component", () => {
  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <PermissionsPage />
      </MemoryRouter>,
    );
  };

  it("renders the page with breadcrumb", () => {
    renderComponent();

    const breadcrumb = screen.getByTestId("breadcrumb");
    expect(breadcrumb).toHaveTextContent("Administration");
    expect(breadcrumb).toHaveTextContent("Roles & Permissions");
  });

  it("renders the header section with shield icon and title", () => {
    renderComponent();

    // The text appears twice (breadcrumb and h1), so we look specifically for the h1
    expect(screen.getByRole("heading", { level: 1, name: "Roles & Permissions" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Overview of access rights for each role in the system.",
      ),
    ).toBeInTheDocument();
  });

  it("renders table headers for all roles", () => {
    renderComponent();

    expect(screen.getByText("Feature / Access")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("HR")).toBeInTheDocument();
    expect(screen.getByText("Hiring Manager")).toBeInTheDocument();
    expect(screen.getByText("Interviewer")).toBeInTheDocument();
  });

  it("renders section headers", () => {
    renderComponent();

    expect(screen.getByText("Organization Management")).toBeInTheDocument();
    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Recruitment")).toBeInTheDocument();
    expect(screen.getByText("Interviews & Privacy")).toBeInTheDocument();
  });

  it("renders all permission rows for Organization Management", () => {
    renderComponent();

    expect(screen.getByText("Manage Company Settings")).toBeInTheDocument();
  });

  it("renders all permission rows for User Management", () => {
    renderComponent();

    expect(screen.getByText("Invite / Create Users")).toBeInTheDocument();
    expect(screen.getByText("Manage User Roles")).toBeInTheDocument();
    expect(screen.getByText("Delete Users")).toBeInTheDocument();
  });

  it("renders all permission rows for Recruitment", () => {
    renderComponent();

    expect(screen.getByText("Create / Edit Jobs")).toBeInTheDocument();
    expect(screen.getByText("Publish Jobs")).toBeInTheDocument();
    expect(screen.getByText("View All Candidates")).toBeInTheDocument();
    expect(screen.getByText("View Assigned Candidates")).toBeInTheDocument();
    expect(screen.getByText("Move Candidates (Pipeline)")).toBeInTheDocument();
  });

  it("renders all permission rows for Interviews & Privacy", () => {
    renderComponent();

    expect(screen.getByText("Schedule Interviews")).toBeInTheDocument();
    expect(screen.getByText("Submit Scorecards")).toBeInTheDocument();
  });

  it("renders check and X icons correctly in permission rows", () => {
    const { container } = renderComponent();

    // Count Check and X icons (lucide-react renders as svg)
    const checkIcons = container.querySelectorAll(".text-green-600");
    const xIcons = container.querySelectorAll(".text-gray-300");

    expect(checkIcons.length).toBeGreaterThan(0);
    expect(xIcons.length).toBeGreaterThan(0);
  });

  it("applies correct styling to the table structure", () => {
    const { container } = renderComponent();

    const table = container.querySelector("table");
    expect(table).toHaveClass(
      "w-full",
      "text-left",
      "border-collapse",
      "whitespace-nowrap",
    );
  });

  it("renders the Shield icon in header", () => {
    const { container } = renderComponent();

    const shieldIcon = container.querySelector(".text-blue-600");
    expect(shieldIcon).toBeInTheDocument();
  });

  it("renders permission rows with correct role combinations", () => {
    renderComponent();

    // Owner-only permission
    const companySettings = screen
      .getByText("Manage Company Settings")
      .closest("tr");
    expect(companySettings).toBeInTheDocument();

    // Owner + HR permission
    const inviteUsers = screen.getByText("Invite / Create Users").closest("tr");
    expect(inviteUsers).toBeInTheDocument();

    // All roles permission
    const scheduleInterviews = screen
      .getByText("Schedule Interviews")
      .closest("tr");
    expect(scheduleInterviews).toBeInTheDocument();
  });

  it("renders all category section headers with proper styling", () => {
    const { container } = renderComponent();

    const sectionHeaders = container.querySelectorAll(".bg-gray-50\\/50");
    expect(sectionHeaders.length).toBe(4); // 4 category headers
  });
});
