'use client';

import { Button } from './button';
import { Moon, Sun, Monitor, Palette } from 'lucide-react';
import { useState } from 'react';

interface ThemeSelectorProps {
  onThemeChange: (theme: string) => void;
  currentTheme: string;
}

export default function ThemeSelector({ onThemeChange, currentTheme }: ThemeSelectorProps) {
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const themes = [
    { id: 'dracula', name: 'Dracula', icon: '🎨' },
    { id: 'catppuccin', name: 'Catppuccin', icon: '🍵' },
    { id: 'solarized', name: 'Solarized', icon: '☀️' },
    { id: 'monokai', name: 'Monokai', icon: '🎯' },
    { id: 'gruvbox', name: 'Gruvbox', icon: '🌳' },
  ];

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="bg-[#e6e2d9]/10 text-[#e6e2d9] hover:bg-[#e6e2d9]/20 hover:text-indigo-400 transition-all duration-200 text-base"
        onClick={() => setShowThemeMenu(!showThemeMenu)}
      >
        <Palette className="h-5 w-5 mr-2" />
        Theme
      </Button>
      {showThemeMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-[#1a1814] rounded-lg shadow-lg z-10 border border-[#e6e2d9]/10">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                onThemeChange(theme.id);
                setShowThemeMenu(false);
              }}
              className={`block px-4 py-2 w-full text-left hover:bg-[#e6e2d9]/10 transition-colors duration-150 text-base ${
                currentTheme === theme.id ? 'bg-[#e6e2d9]/10 text-[#e6e2d9]' : 'text-[#e6e2d9]/70'
              }`}
            >
              <div className="flex items-center">
                <span className="mr-2">{theme.icon}</span>
                {theme.name}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 