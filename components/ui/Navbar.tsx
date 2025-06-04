'use client';

import { ArrowUpDown, Home, Layers, Menu, Sun, Tags, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./dialog";

import { Button } from './button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavbarProps {
  currentView: 'home' | 'genres' | 'combinations';
  onGenresClick: () => void;
  onHomeClick: () => void;
  onSubmitClick: () => void;
  onCombinationsClick: () => void;
  onSortChange: (sort: string) => void;
  currentSort: string;
  onThemeChange: (theme: string) => void;
  currentTheme: string;
}

export default function Navbar({
  currentView,
  onGenresClick,
  onHomeClick,
  onSubmitClick,
  onCombinationsClick,
  onSortChange,
  currentSort,
  onThemeChange,
  currentTheme,
}: NavbarProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const NavLinks = () => (
    <>
      <Link
        href="/"
        onClick={() => {
          onHomeClick();
          setIsMobileMenuOpen(false);
        }}
        className={`inline-flex items-center px-1 pt-1 border-b-2 text-base font-medium ${
          currentView === 'home'
            ? 'border-primary text-foreground'
            : 'border-transparent text-foreground/70 hover:border-foreground/50 hover:text-foreground'
        }`}
      >
        <Home className="h-5 w-5 mr-2" />
        Home
      </Link>
      <Link
        href="/genres"
        onClick={() => {
          onGenresClick();
          setIsMobileMenuOpen(false);
        }}
        className={`inline-flex items-center px-1 pt-1 border-b-2 text-base font-medium ${
          currentView === 'genres'
            ? 'border-primary text-foreground'
            : 'border-transparent text-foreground/70 hover:border-foreground/50 hover:text-foreground'
        }`}
      >
        <Tags className="h-5 w-5 mr-2" />
        Genres
      </Link>
      <Link
        href="/combinations"
        onClick={() => {
          onCombinationsClick();
          setIsMobileMenuOpen(false);
        }}
        className={`inline-flex items-center px-1 pt-1 border-b-2 text-base font-medium ${
          currentView === 'combinations'
            ? 'border-primary text-foreground'
            : 'border-transparent text-foreground/70 hover:border-foreground/50 hover:text-foreground'
        }`}
      >
        <Layers className="h-5 w-5 mr-2" />
        Combinations
      </Link>
    </>
  );

  const ControlButtons = () => (
    currentView === 'home' && (
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setShowSortMenu(true)}
          className="inline-flex items-center px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:text-foreground hover:bg-accent/50"
        >
          <ArrowUpDown className="h-5 w-5 mr-2" />
          Sort
        </button>
        <button
          onClick={() => setShowThemeMenu(true)}
          className="inline-flex items-center px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:text-foreground hover:bg-accent/50"
        >
          <Sun className="h-5 w-5 mr-2" />
          Theme
        </button>
        <Button
          onClick={onSubmitClick}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-base1 sm:text-base px-3 sm:px-4 py-1.5 sm:py-2"
        >
          <span className="sm:hidden">+</span>
          <span className="hidden sm:inline">Submit Track</span>
        </Button>
      </div>
    )
  );

  return (
    <nav className="navbar border-b border-border/10">
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between h-16 border-b">
          <div className="flex">
            {/* Mobile menu button */}
            <div className="sm:hidden flex items-center">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
            {/* Desktop menu */}
            <div className="hidden sm:flex sm:space-x-8">
              <NavLinks />
            </div>
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-2xl sm:text-3xl font-mono text-foreground tracking-wider pt-4 font-light">Music4Study</h1>
          </div>
          <div className="hidden sm:flex">
            <ControlButtons />
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <NavLinks />
            <div className="mt-4">
              <ControlButtons />
            </div>
          </div>
        </div>
      )}

      {/* Sort Menu Dialog */}
      {showSortMenu && (
        <Dialog open={showSortMenu} onOpenChange={setShowSortMenu}>
          <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-sm border-border/10">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif">Sort by</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <button
                onClick={() => {
                  onSortChange('date');
                  setShowSortMenu(false);
                }}
                className={`w-full px-4 py-3 text-left rounded-md transition-colors duration-150 text-base ${
                  currentSort === 'date'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                Date Added
              </button>
              <button
                onClick={() => {
                  onSortChange('genre');
                  setShowSortMenu(false);
                }}
                className={`w-full px-4 py-3 text-left rounded-md transition-colors duration-150 text-base ${
                  currentSort === 'genre'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                Genre
              </button>
              <button
                onClick={() => {
                  onSortChange('username');
                  setShowSortMenu(false);
                }}
                className={`w-full px-4 py-3 text-left rounded-md transition-colors duration-150 text-base ${
                  currentSort === 'username'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                Uploader
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Theme Menu Dialog */}
      {showThemeMenu && (
        <Dialog open={showThemeMenu} onOpenChange={setShowThemeMenu}>
          <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-sm border-border/10">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif">Theme</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <button
                onClick={() => {
                  onThemeChange('coffee');
                  setShowThemeMenu(false);
                }}
                className={`w-full px-4 py-3 text-left rounded-md transition-colors duration-150 text-base ${
                  currentTheme === 'coffee'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                Coffee
              </button>
              <button
                onClick={() => {
                  onThemeChange('dracula');
                  setShowThemeMenu(false);
                }}
                className={`w-full px-4 py-3 text-left rounded-md transition-colors duration-150 text-base ${
                  currentTheme === 'dracula'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                Dracula
              </button>
              <button
                onClick={() => {
                  onThemeChange('catppuccin');
                  setShowThemeMenu(false);
                }}
                className={`w-full px-4 py-3 text-left rounded-md transition-colors duration-150 text-base ${
                  currentTheme === 'catppuccin'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                Catppuccin
              </button>
              <button
                onClick={() => {
                  onThemeChange('solarized');
                  setShowThemeMenu(false);
                }}
                className={`w-full px-4 py-3 text-left rounded-md transition-colors duration-150 text-base ${
                  currentTheme === 'solarized'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                Solarized
              </button>
              <button
                onClick={() => {
                  onThemeChange('monokai');
                  setShowThemeMenu(false);
                }}
                className={`w-full px-4 py-3 text-left rounded-md transition-colors duration-150 text-base ${
                  currentTheme === 'monokai'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                Monokai
              </button>
              <button
                onClick={() => {
                  onThemeChange('gruvbox');
                  setShowThemeMenu(false);
                }}
                className={`w-full px-4 py-3 text-left rounded-md transition-colors duration-150 text-base ${
                  currentTheme === 'gruvbox'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                Gruvbox
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </nav>
  );
} 