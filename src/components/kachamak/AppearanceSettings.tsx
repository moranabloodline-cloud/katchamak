"use client";
import { useEffect } from "react";
import { useAppearancePreferences } from "@/lib/kachamak/appearance-preferences";
export function AppearanceSettings() {
  const { theme, interfaceSize } = useAppearancePreferences();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme !== "light");
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.interfaceSize = interfaceSize;
    document.documentElement.style.fontSize = ({ small: "14px", normal: "16px", large: "18px" })[interfaceSize] || "16px";
    document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
  }, [theme, interfaceSize]);
  return null;
}
