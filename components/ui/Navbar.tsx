'use client';

import { ArrowUpDown, Home, Layers, Menu, Tags, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from './button';
import Link from 'next/link';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Handle navigation with loading state
  const handleNavigation = useCallback((view: string, callback: () => void) => {
    setIsNavigating(true);
    const params = new URLSearchParams();
    if (view !== 'home') {
      params.set('view', view);
    }
    router.replace(view === 'home' ? '/' : `/?${params.toString()}`, { scroll: false });
    callback();
    // Shorter timeout for more responsive feel
    setTimeout(() => setIsNavigating(false), 50);
  }, [router]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('.mobile-menu') && !target.closest('.mobile-menu-button')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'genres' || view === 'combinations' || !view) {
      setIsMobileMenuOpen(false);
    }
  }, [searchParams]);

  // removed unused toggleMobileMenu

  const NavLinks = () => (
    <>
      <Link
        href="/"
        onClick={(e) => {
          e.preventDefault();
          handleNavigation('home', () => {
            onHomeClick();
            setIsMobileMenuOpen(false);
          });
        }}
        className={`inline-flex items-center px-1 md:px-2 pt-1 pb-2 border-b-2 text-base md:text-lg font-medium transition-all duration-300 ease-out ${
          currentView === 'home'
            ? 'border-primary text-foreground'
            : 'border-transparent text-foreground/70 hover:border-foreground/50 hover:text-foreground'
        } ${isNavigating ? 'opacity-70' : ''}`}
      >
        <Home className="h-5 w-5 md:h-6 md:w-6 mr-1 md:mr-2" />
        <span>Home</span>
      </Link>
      <Link
        href="/"
        onClick={(e) => {
          e.preventDefault();
          handleNavigation('genres', () => {
            onGenresClick();
            setIsMobileMenuOpen(false);
          });
        }}
        className={`inline-flex items-center px-1 md:px-2 pt-1 pb-2 border-b-2 text-base md:text-lg font-medium transition-all duration-300 ease-out ${
          currentView === 'genres'
            ? 'border-primary text-foreground'
            : 'border-transparent text-foreground/70 hover:border-foreground/50 hover:text-foreground'
        } ${isNavigating ? 'opacity-70' : ''}`}
      >
        <Tags className="h-5 w-5 md:h-6 md:w-6 mr-1 md:mr-2" />
        <span>Genres</span>
      </Link>
      <Link
        href="/"
        onClick={(e) => {
          e.preventDefault();
          handleNavigation('combinations', () => {
            onCombinationsClick();
            setIsMobileMenuOpen(false);
          });
        }}
        className={`inline-flex items-center px-1 md:px-2 pt-1 pb-2 border-b-2 text-base md:text-lg font-medium transition-all duration-300 ease-out ${
          currentView === 'combinations'
            ? 'border-primary text-foreground'
            : 'border-transparent text-foreground/70 hover:border-foreground/50 hover:text-foreground'
        } ${isNavigating ? 'opacity-70' : ''}`}
      >
        <Layers className="h-5 w-5 md:h-6 md:w-6 mr-1 md:mr-2" />
        <span>Combinations</span>
      </Link>
    </>
  );

  const ControlButtons = () => (
    <div className="flex items-center space-x-3 lg:space-x-4">
      <button
        onClick={() => setShowSortMenu(true)}
        className="inline-flex items-center justify-center px-3 lg:px-4 py-2 rounded-md text-base lg:text-lg font-medium text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors duration-200"
      >
        <ArrowUpDown className="h-5 w-5 lg:h-6 lg:w-6 mr-2" />
        <span>Sort</span>
      </button>
      <Button
        onClick={onSubmitClick}
        className="bg-primary hover:bg-primary/90 text-primary-foreground text-base lg:text-lg px-3 lg:px-4 py-2 transition-colors duration-200"
      >
        <span>Submit Track</span>
      </Button>
    </div>
  );

  return (
    <nav className="navbar sticky top-0 z-50">
      <div className="w-full px-4 md:px-5 lg:px-10 xl:px-12">
        <div className="flex justify-center h-16">
          {/* Main Content: Logo, Nav Links, Controls */}
          <div className="flex items-center justify-between w-full">

            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-mono text-foreground tracking-wider font-light">
                Music4Study
              </h1>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
              <NavLinks />
            </div>

            {/* Desktop Controls */}
            <div className="hidden md:flex items-center">
              <ControlButtons />
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                className="mobile-menu-button inline-flex items-center justify-center p-2 rounded-md text-foreground hover:bg-accent/50 transition"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="mobile-menu md:hidden border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="px-4 py-3 space-y-3">
            <div className="flex flex-col space-y-2">
              {/* Mobile Nav Links */}
              <div className="flex flex-col space-y-1">
                <NavLinks />
              </div>
            </div>
            {/* Mobile Controls */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowSortMenu(true)}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  <ArrowUpDown className="h-5 w-5 mr-2" />
                  <span>Sort</span>
                </button>
                <Button
                  onClick={onSubmitClick}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-3 py-2"
                >
                  Submit Track
                </Button>
              </div>
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
            <div className="grid gap-2">
              {[
                { value: 'date', label: 'Date Added' },
                { value: 'genre', label: 'Genre' },
                { value: 'username', label: 'Uploader' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value);
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-left rounded-md transition-colors duration-200 text-base ${
                    currentSort === option.value
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
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
            <div className="grid gap-2">
              {[
                { id: 'coffee', name: 'Coffee', icon: '☕' },
                { id: 'dracula', name: 'Dracula', icon: '🎨' },
                { id: 'catppuccin', name: 'Catppuccin', icon: '🍵' },
                { id: 'solarized', name: 'Solarized', icon: '☀️' },
                { id: 'monokai', name: 'Monokai', icon: '🎯' },
                { id: 'gruvbox', name: 'Gruvbox', icon: '🌳' }
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    onThemeChange(theme.id);
                    setShowThemeMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-left rounded-md transition-colors duration-200 text-base flex items-center ${
                    currentTheme === theme.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <span className="mr-2">{theme.icon}</span>
                  {theme.name}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </nav>
  );
} 