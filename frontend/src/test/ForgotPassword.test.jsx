import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ForgotPassword from "../pages/ForgotPassword";
import client from "../api/client";

vi.mock("../api/client");

describe("ForgotPassword Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );
  };

  it("renders the initial form correctly", () => {
    renderComponent();

    expect(screen.getByText("Forgot your password?")).toBeInTheDocument();
    expect(
      screen.getByText("Enter your email and we'll send you a reset link.")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Send Reset Link/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Back to login/i)).toBeInTheDocument();
  });

  it("updates email input on change", () => {
    renderComponent();

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    expect(emailInput).toHaveValue("test@example.com");
  });

  it("disables submit button when email is empty", () => {
    renderComponent();

    const submitButton = screen.getByRole("button", {
      name: /Send Reset Link/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when email is entered", () => {
    renderComponent();

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: /Send Reset Link/i,
    });
    expect(submitButton).not.toBeDisabled();
  });

  it("shows loading state while submitting", async () => {
    // Use a pending promise so loading state stays true
    client.post.mockReturnValue(new Promise(() => { }));
    renderComponent();

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: /Send Reset Link/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Sending…")).toBeInTheDocument();
    });

    expect(submitButton).toBeDisabled();
  });

  it("shows success state after successful submission", async () => {
    client.post.mockResolvedValue({});
    renderComponent();

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: /Send Reset Link/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/If that email is registered, a reset link has been sent/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/The link expires in 1 hour/i)
      ).toBeInTheDocument();
    });

    expect(client.post).toHaveBeenCalledWith("/forgot-password", {
      email: "test@example.com",
    });
  });

  it("shows error message from response.data.detail", async () => {
    const errorMessage = "Email not found in system";
    client.post.mockRejectedValue({
      response: {
        data: {
          detail: errorMessage,
        },
      },
    });

    renderComponent();

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "notfound@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: /Send Reset Link/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("shows error message from err.message when response.data.detail is not available", async () => {
    const errorMessage = "Network error";
    client.post.mockRejectedValue(new Error(errorMessage));

    renderComponent();

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: /Send Reset Link/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("shows default error message when both detail and message are unavailable", async () => {
    client.post.mockRejectedValue({});

    renderComponent();

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: /Send Reset Link/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    });
  });

  it("has a link back to login page", () => {
    renderComponent();

    const backLink = screen.getByText(/Back to login/i);
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest("a")).toHaveAttribute("href", "/login");
  });

  it("clears error on new submission", async () => {
    client.post.mockRejectedValueOnce(new Error("First error"));
    renderComponent();

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: /Send Reset Link/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("First error")).toBeInTheDocument();
    });

    // Now submit again with success
    client.post.mockResolvedValue({});
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText("First error")).not.toBeInTheDocument();
    });
  });
});
