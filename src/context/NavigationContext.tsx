"use client";

import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from "react";

export type ActiveView = "gates" | "analytics" | "logs" | "settings";

interface NavigationState {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
}

const NavigationContext = createContext<NavigationState | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveViewState] = useState<ActiveView>("gates");

  const setActiveView = useCallback((view: ActiveView) => {
    setActiveViewState(view);
  }, []);

  const value = useMemo(
    () => ({ activeView, setActiveView }),
    [activeView, setActiveView]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useViewNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useViewNavigation must be used within a NavigationProvider");
  }
  return context;
}

/** @deprecated Use useViewNavigation — this name collides with the nav-items hook. */
export const useNavigation = useViewNavigation;

export default NavigationProvider;