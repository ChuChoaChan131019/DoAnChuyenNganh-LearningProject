"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { TutorContext as TutorScope } from "@/types/context-tutor";

type TutorContextValue = {
  context: TutorScope | null;
  setTutorContext: (value: TutorScope | null) => void;
};

const TutorContextObject = createContext<TutorContextValue | null>(null);

export function TutorContextProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<TutorScope | null>(null);

  const setTutorContext = useCallback((value: TutorScope | null) => {
    setContext(value);
  }, []);

  const value = useMemo(
    () => ({
      context,
      setTutorContext,
    }),
    [context, setTutorContext],
  );

  return (
    <TutorContextObject.Provider value={value}>
      {children}
    </TutorContextObject.Provider>
  );
}

export function useTutorContext() {
  const value = useContext(TutorContextObject);

  if (!value) {
    throw new Error("useTutorContext phải nằm trong TutorContextProvider");
  }

  return value;
}