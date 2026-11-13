import type { Key } from "react-aria-components";
import { switcherSection, switcherSections } from "../../domain/frame/people";
import { useDemoState, useStore } from "../store/store";
import { useAnnounce } from "../ui/LiveAnnouncer";
import { Select, SelectItem, SelectSection } from "../ui/Select";
import { useCurrentPerson } from "./useCurrentPerson";
import "./UserSwitcher.css";

export function UserSwitcher() {
  const state = useDemoState();
  const store = useStore();
  const current = useCurrentPerson();
  const announce = useAnnounce();

  const sections = switcherSections
    .map((title) => ({
      title,
      people: state.frame.people.filter(
        (person) => switcherSection(person, state) === title,
      ),
    }))
    .filter((section) => section.people.length > 0);

  function choose(key: Key | null) {
    const chosen = state.frame.people.find((person) => person.id === key);
    if (chosen === undefined) {
      return;
    }
    store.selectUser(chosen.id);
    announce(`Du ser nå prototypen som ${chosen.name}`);
  }

  return (
    <div className="user-switcher">
      <Select
        label="Bytt bruker"
        selectedKey={current.id}
        onSelectionChange={choose}
      >
        {sections.map((section) => (
          <SelectSection key={section.title} title={section.title}>
            {section.people.map((person) => (
              <SelectItem
                key={person.id}
                id={person.id}
                textValue={person.name}
              >
                <span className="user-option-name">{person.name}</span>{" "}
                <span className="user-option-description">
                  {person.description}
                </span>
              </SelectItem>
            ))}
          </SelectSection>
        ))}
      </Select>
    </div>
  );
}
