import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityForm } from "./ActivityForm";
import { db, DEFAULT_CATEGORIES, saveActivity } from "../../db";
beforeEach(async () => {
  await db.open();
});
afterEach(async () => {
  await db.activities.clear();
  await db.events.clear();
});
describe("Accessible activity form", () => {
  it("creates an unknown-date activity through the labeled form without making up history", async () => {
    const user = userEvent.setup(),
      saved = vi.fn();
    render(
      <ActivityForm
        categories={DEFAULT_CATEGORIES}
        onClose={vi.fn()}
        onSaved={saved}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      "A little thing to remember",
    );
    await user.type(screen.getByLabelText(/Activity name/), "Called grandma");
    await user.click(screen.getByRole("button", { name: "Add activity" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(await db.activities.count()).toBe(1);
    expect(await db.events.count()).toBe(0);
  });
  it("edits the existing activity without creating a second one", async () => {
    const a = await saveActivity({
      name: "Plants",
      emoji: "🪴",
      categoryId: "home",
      notes: "",
      reminder: null,
    });
    const user = userEvent.setup(),
      saved = vi.fn();
    render(
      <ActivityForm
        activity={a}
        categories={DEFAULT_CATEGORIES}
        onClose={vi.fn()}
        onSaved={saved}
      />,
    );
    const field = screen.getByLabelText(/Activity name/);
    await user.clear(field);
    await user.type(field, "Watered my plants");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(await db.activities.count()).toBe(1);
    expect((await db.activities.get(a.id))?.name).toBe("Watered my plants");
  });
  it("shows friendly validation when a duplicate name is submitted", async () => {
    await saveActivity({
      name: "Plants",
      emoji: "🪴",
      categoryId: "home",
      notes: "",
      reminder: null,
    });
    const user = userEvent.setup();
    render(
      <ActivityForm
        categories={DEFAULT_CATEGORIES}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText(/Activity name/), "Plants");
    await user.click(screen.getByRole("button", { name: "Add activity" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already");
    expect(await db.activities.count()).toBe(1);
  });
  it("keeps advanced fields hidden until requested", async () => {
    const user = userEvent.setup();
    render(
      <ActivityForm
        categories={DEFAULT_CATEGORIES}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Personal notes")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /A few more details/ }),
    );
    expect(screen.getByLabelText("Personal notes")).toBeVisible();
    expect(screen.getByLabelText(/A gentle reminder/)).toHaveValue("none");
  });
});
