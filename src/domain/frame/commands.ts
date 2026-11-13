import { personById } from "./people";
import type {
  Command,
  CommandContext,
  CommandHandler,
  CommandResult,
  DemoState,
  SystemStep,
} from "./types";

export type ApplyCommand = (
  state: DemoState,
  command: Command,
  context: CommandContext,
) => CommandResult;

export type ApplyCommandOptions = {
  handlers: Record<string, CommandHandler>;
  systemSteps: SystemStep[];
};

export function runSystemSteps(
  state: DemoState,
  systemSteps: SystemStep[],
  now: CommandContext["now"],
): DemoState {
  let current = state;
  for (const step of systemSteps) {
    current = step(current, now);
  }
  return current;
}

export function createApplyCommand({
  handlers,
  systemSteps,
}: ApplyCommandOptions): ApplyCommand {
  return (state, command, context) => {
    const current = runSystemSteps(state, systemSteps, context.now);
    if (personById(context.actorId, current) === undefined) {
      return {
        ok: false,
        error: {
          code: "not-allowed",
          message: "Vi finner ikke personen som prøver å gjøre dette.",
        },
      };
    }
    const handler = handlers[command.type];
    if (handler === undefined) {
      return {
        ok: false,
        error: {
          code: "not-found",
          message: `Vi kjenner ikke handlingen «${command.type}».`,
        },
      };
    }
    return handler(current, command, context);
  };
}
