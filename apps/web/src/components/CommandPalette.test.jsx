import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import CommandPalette from "./CommandPalette";
import { useAppStore } from "../store/appStore";

describe("CommandPalette", () => {
  beforeEach(() => {
    useAppStore.setState({
      activePage: "resume",
      phase4TargetSection: "",
      latestVersionId: ""
    });
  });

  it("opens with Cmd/Ctrl+K and routes actions with numeric shortcuts", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.keyboard("{Control>}k{/Control}");
    expect(screen.getByText("Upload Resume")).toBeInTheDocument();
    expect(screen.getByText("Cmd/Ctrl+4")).toBeInTheDocument();

    await user.keyboard("{Control>}3{/Control}");
    expect(useAppStore.getState().activePage).toBe("versions");
  });
});
