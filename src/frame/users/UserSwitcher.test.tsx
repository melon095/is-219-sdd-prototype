import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { createTestStore, renderFrame, testSeedState } from "../test-utils";
import { accessibleLabelOf } from "../ui/test-helpers";
import { UserSwitcher } from "./UserSwitcher";

const seed = testSeedState();

describe("UserSwitcher", () => {
  it("viser navn og beskrivelse for den valgte personen", () => {
    renderFrame(<UserSwitcher />, {
      store: createTestStore({ userId: "person-1" }),
    });

    const trigger = screen.getByRole("button", { name: /Bytt bruker/ });
    expect(trigger.textContent).toContain("Kari Nordmann");
    expect(trigger.textContent).toContain("Eier av Fjordlys Keramikk");
  });

  it("grupperer alternativene i riktig rekkefølge", async () => {
    const user = userEvent.setup();
    renderFrame(<UserSwitcher />);

    await user.click(screen.getByRole("button", { name: /Bytt bruker/ }));
    const groups = await screen.findAllByRole("group");

    expect(groups.map(accessibleLabelOf)).toEqual([
      "Bedriftseiere",
      "Ansatte",
      "Arbeidssøkere",
      "Varodd",
    ]);
    const owners = seed.frame.businesses.map((business) =>
      seed.frame.people.find((person) => person.id === business.ownerId),
    );
    const first = groups[0] as HTMLElement;
    const options = within(first).getAllByRole("option");
    expect(options).toHaveLength(owners.length);
    owners.forEach((owner, index) => {
      const label = accessibleLabelOf(options[index] as HTMLElement);
      expect(label).toContain(owner?.name);
      expect(label).toContain(owner?.description);
    });
  });

  it("viser hver person én gang", async () => {
    const user = userEvent.setup();
    renderFrame(<UserSwitcher />);

    await user.click(screen.getByRole("button", { name: /Bytt bruker/ }));
    await screen.findByRole("listbox");
    const names = screen.getAllByRole("option").map(accessibleLabelOf);

    expect(names).toHaveLength(seed.frame.people.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("bytter bruker, beholder siden og leser opp byttet", async () => {
    const user = userEvent.setup();
    const { store, router } = renderFrame(<UserSwitcher />, {
      route: "/oppdrag",
      pages: [{ path: "/oppdrag", element: <p>Oppdrag-siden</p> }],
    });

    await user.click(screen.getByRole("button", { name: /Bytt bruker/ }));
    await user.click(await screen.findByRole("option", { name: /Marte Vik/ }));

    expect(store.getSelectedUserId()).toBe("person-15");
    expect(router.state.location.pathname).toBe("/oppdrag");
    expect(
      await screen.findByText("Du ser nå prototypen som Marte Vik"),
    ).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = renderFrame(<UserSwitcher />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
