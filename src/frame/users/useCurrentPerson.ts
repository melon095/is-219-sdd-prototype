import { personById } from "../../domain/frame/people";
import type { Person } from "../../domain/frame/types";
import { useDemoState, useSelectedUserId } from "../store/store";

export function useCurrentPerson(): Person {
  const state = useDemoState();
  const userId = useSelectedUserId();
  const person = personById(userId, state);
  if (person === undefined) {
    throw new Error("Fant ikke personen som er valgt i brukerbytteren.");
  }
  return person;
}
