import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DiffCard from "./DiffCard";

function makeSuggestion(overrides = {}) {
  return {
    id: "s1",
    original_text: "Built dashboards for recruiting workflows",
    suggested_text: "Built scalable dashboards for recruiting workflows",
    confidence: 0.85,
    keywords_added: ["scalable"],
    reason: "Adds an impact keyword.",
    ...overrides
  };
}

function renderCard(props = {}) {
  return render(
    <DiffCard
      suggestion={makeSuggestion(props.suggestion)}
      index={0}
      decision={props.decision ?? "undecided"}
      label={props.label ?? "Summary"}
      onAccept={props.onAccept ?? vi.fn()}
      onReject={props.onReject ?? vi.fn()}
    />
  );
}

describe("DiffCard word diff", () => {
  it("marks inserted words as additions and keeps shared words plain", () => {
    const { container } = renderCard();

    const inserted = container.querySelectorAll("ins");
    const insertedText = Array.from(inserted).map((node) => node.textContent.trim());
    expect(insertedText).toContain("scalable");

    // "Built" is shared, so it must not be wrapped in ins/del.
    const changed = Array.from(container.querySelectorAll("ins, del")).map((n) => n.textContent.trim());
    expect(changed).not.toContain("Built");
  });

  it("marks removed words as deletions", () => {
    const { container } = renderCard({
      suggestion: { original_text: "Managed legacy systems", suggested_text: "Managed systems" }
    });

    const removed = Array.from(container.querySelectorAll("del")).map((n) => n.textContent.trim());
    expect(removed).toContain("legacy");
  });

  it("derives a confidence label from the score", () => {
    renderCard({ suggestion: { confidence: 0.5 } });
    expect(screen.getByText(/Low confidence/)).toBeInTheDocument();
  });
});

describe("DiffCard interactions", () => {
  it("fires accept/reject on button clicks", async () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    const user = userEvent.setup();
    renderCard({ onAccept, onReject });

    await user.click(screen.getByRole("button", { name: "Accept" }));
    expect(onAccept).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("supports a/r keyboard shortcuts on the focused card", async () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    const user = userEvent.setup();
    const { container } = renderCard({ onAccept, onReject });

    container.querySelector("article").focus();
    await user.keyboard("a");
    expect(onAccept).toHaveBeenCalledTimes(1);
    await user.keyboard("r");
    expect(onReject).toHaveBeenCalledTimes(1);
  });
});
