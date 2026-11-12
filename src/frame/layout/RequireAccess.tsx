import type { ReactNode } from "react";
import type { DemoState, Person } from "../../domain/frame/types";
import { NoAccessPage } from "../home/NoAccessPage";
import { useDemoState } from "../store/store";
import { useCurrentPerson } from "../users/useCurrentPerson";

export function RequireAccess({
  allowed,
  children,
}: {
  allowed: (person: Person, state: DemoState) => boolean;
  children: ReactNode;
}) {
  const state = useDemoState();
  const person = useCurrentPerson();

  return allowed(person, state) ? <>{children}</> : <NoAccessPage />;
}
