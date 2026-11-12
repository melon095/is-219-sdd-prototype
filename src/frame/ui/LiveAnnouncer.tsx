import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

type Announce = (message: string) => void;

interface Announcement {
  id: number;
  text: string;
}

const AnnounceContext = createContext<Announce | null>(null);

export function LiveAnnouncer({ children }: { children: ReactNode }) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  const announce = useCallback<Announce>((message) => {
    setAnnouncement((previous) => ({
      id: (previous?.id ?? 0) + 1,
      text: message,
    }));
  }, []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div aria-live="polite" className="visually-hidden">
        {announcement && <p key={announcement.id}>{announcement.text}</p>}
      </div>
    </AnnounceContext.Provider>
  );
}

export function useAnnounce(): Announce {
  const announce = useContext(AnnounceContext);
  if (announce === null) {
    throw new Error("useAnnounce må brukes inni LiveAnnouncer");
  }
  return announce;
}
