const MAX_FRAMES = 90;
const STABLE_FRAMES = 2;

export function focusAfterRender(selector: string): void {
  let frame = 0;
  let stable = 0;
  let reached = false;
  const attempt = () => {
    frame += 1;
    const element = document.querySelector<HTMLElement>(selector);
    const active = document.activeElement;
    if (element !== null && active === element) {
      reached = true;
      stable += 1;
    } else if (reached && active !== null && active !== document.body) {
      return;
    } else if (element !== null) {
      stable = 0;
      element.focus();
      reached = document.activeElement === element;
    }
    if (stable < STABLE_FRAMES && frame < MAX_FRAMES) {
      requestAnimationFrame(attempt);
    }
  };
  requestAnimationFrame(attempt);
}

export function useFocusAfter(): (selector: string) => void {
  return focusAfterRender;
}
