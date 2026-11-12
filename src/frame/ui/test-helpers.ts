export function accessibleDescription(element: Element): string {
  const ids = element.getAttribute("aria-describedby") ?? "";
  return ids
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => element.ownerDocument.getElementById(id)?.textContent ?? "")
    .join(" ")
    .trim();
}

export function accessibleLabelOf(element: Element): string {
  const ids = element.getAttribute("aria-labelledby") ?? "";
  if (ids) {
    return ids
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
  }
  return element.getAttribute("aria-label") ?? element.textContent ?? "";
}
