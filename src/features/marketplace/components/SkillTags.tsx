import type { Id } from "../../../domain/frame/types";
import { useDemoState } from "../../../frame/store/store";
import "./SkillTags.css";

export function SkillTags({ skillIds }: { skillIds: Id[] }) {
  const state = useDemoState();
  const names = skillIds.map(
    (id) => state.frame.skills.find((skill) => skill.id === id)?.name ?? id,
  );

  return (
    <ul className="skill-tags">
      {names.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  );
}
