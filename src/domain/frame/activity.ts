import { isAdmin } from "./people";
import type { ActivityEntry, DemoState, Person } from "./types";

export type AudienceGroups = Record<
  string,
  (person: Person, state: DemoState) => boolean
>;

export function canSeeEntry(
  entry: ActivityEntry,
  person: Person,
  state: DemoState,
  groups: AudienceGroups,
): boolean {
  if (isAdmin(person)) {
    return true;
  }
  if (entry.audience.personIds.includes(person.id)) {
    return true;
  }
  return entry.audience.groups.some((groupId) => {
    const isMember = groups[groupId];
    return isMember?.(person, state) === true;
  });
}

export function visibleActivity(
  state: DemoState,
  person: Person,
  groups: AudienceGroups,
): ActivityEntry[] {
  return state.frame.activity
    .filter((entry) => canSeeEntry(entry, person, state, groups))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
