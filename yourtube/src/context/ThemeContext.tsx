import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  detectUserState,
  resolveThemeFromState,
} from "@/lib/southIndia";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  detectedState: string | null;
  locationChecked: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [detectedState, setDetectedState] = useState<string | null>(null);
  const [locationChecked, setLocationChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initTheme = async () => {
      const state = await detectUserState();
      if (!mounted) return;

      setDetectedState(state);
      setTheme(resolveThemeFromState(state));
      setLocationChecked(true);
    };

    initTheme();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      detectedState,
      locationChecked,
      toggleTheme,
    }),
    [theme, detectedState, locationChecked, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
