import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

let lastFocusedLocationKey: string | undefined;

export function PageHeading({ children }: { children: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const location = useLocation();

  useEffect(() => {
    document.title = `${children} – Varodd`;
  }, [children]);

  useEffect(() => {
    if (lastFocusedLocationKey === undefined) {
      lastFocusedLocationKey = location.key;
      return;
    }
    if (lastFocusedLocationKey !== location.key) {
      lastFocusedLocationKey = location.key;
      ref.current?.focus();
    }
  }, [location.key]);

  return (
    <h1 ref={ref} tabIndex={-1}>
      {children}
    </h1>
  );
}
