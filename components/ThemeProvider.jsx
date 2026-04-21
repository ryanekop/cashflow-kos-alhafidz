"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ isDark: false, toggleTheme: () => { } });

export function useTheme() {
    return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const prefersDark = localStorage.getItem("theme") === "dark";
            setIsDark(prefersDark);
            document.documentElement.classList.toggle("dark", prefersDark);
            setMounted(true);
        }, 0);

        return () => clearTimeout(timeoutId);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        document.documentElement.classList.toggle("dark", isDark);
    }, [isDark, mounted]);

    const toggleTheme = () => {
        setIsDark(prev => {
            const next = !prev;
            if (next) {
                document.documentElement.classList.add("dark");
                localStorage.setItem("theme", "dark");
            } else {
                document.documentElement.classList.remove("dark");
                localStorage.setItem("theme", "light");
            }
            return next;
        });
    };

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, mounted }}>
            {children}
        </ThemeContext.Provider>
    );
}
