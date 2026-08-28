import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  // Once the user manually toggles, stop auto-overriding their choice.
  const manualOverrideRef = useRef(false);

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

  // Re-evaluate periodically so the theme automatically flips at the
  // 10:00 AM / 12:00 PM IST boundaries without needing a page reload.
  useEffect(() => {
    if (!locationChecked) return;

    const interval = window.setInterval(() => {
      if (manualOverrideRef.current) return;
      setTheme(resolveThemeFromState(detectedState));
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, [locationChecked, detectedState]);

  const toggleTheme = useCallback(() => {
    manualOverrideRef.current = true;
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
