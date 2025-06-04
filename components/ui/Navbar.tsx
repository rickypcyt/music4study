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
    setTimeout(() => setIsNavigating(false), 300);
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

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
        className={`inline-flex items-center px-1 pt-1 border-b-2 text-base font-medium transition-colors duration-200 ${
          currentView === 'home'
            ? 'border-primary text-foreground'
            : 'border-transparent text-foreground/70 hover:border-foreground/50 hover:text-foreground'
        } ${isNavigating ? 'pointer-events-none opacity-50' : ''}`}
      >
        <Home className="h-5 w-5 mr-2" />
        <span className="hidden sm:inline">Home</span>
        <span className="sm:hidden">Home</span>
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
        className={`inline-flex items-center px-1 pt-1 border-b-2 text-base font-medium transition-colors duration-200 ${
          currentView === 'genres'
            ? 'border-primary text-foreground'
            : 'border-transparent text-foreground/70 hover:border-foreground/50 hover:text-foreground'
        } ${isNavigating ? 'pointer-events-none opacity-50' : ''}`}
      >
        <Tags className="h-5 w-5 mr-2" />
        <span className="hidden sm:inline">Genres</span>
        <span className="sm:hidden">Genres</span>
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
        className={`inline-flex items-center px-1 pt-1 border-b-2 text-base font-medium transition-colors duration-200 ${
          currentView === 'combinations'
            ? 'border-primary text-foreground'
            : 'border-transparent text-foreground/70 hover:border-foreground/50 hover:text-foreground'
        } ${isNavigating ? 'pointer-events-none opacity-50' : ''}`}
      >
        <Layers className="h-5 w-5 mr-2" />
        <span className="hidden sm:inline">Combinations</span>
        <span className="sm:hidden">Combinations</span>
      </Link>
    </>
  );

  const ControlButtons = () => (
    currentView === 'home' && (
      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <button
          onClick={() => setShowSortMenu(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:text-foreground hover:bg-accent/50 transition-colors duration-200"
        >
          <ArrowUpDown className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">Sort</span>
          <span className="sm:hidden">Sort Tracks</span>
        </button>
        <Button
          onClick={onSubmitClick}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-base px-3 py-2 transition-colors duration-200"
        >
          <span className="sm:hidden">Submit New Track</span>
          <span className="hidden sm:inline">Submit Track</span>
        </Button>
      </div>
    )
  );

  return (
    <nav className="navbar sticky top-0 z-50">
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex justify-center h-16">
          {/* Mobile menu button - remains left aligned */}
          <div className="flex items-center sm:hidden mr-4">
            <button
              onClick={toggleMobileMenu}
              className="mobile-menu-button inline-flex items-center justify-center p-2 rounded-md text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Main Content: Logo, Nav Links, Controls - Centered Group */}
          <div className="flex items-center justify-between w-full max-w-screen-xl">

            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-mono text-foreground tracking-wider font-light">
                Music4Study
              </h1>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden sm:flex sm:space-x-8 items-center">
              <NavLinks />
            </div>

            {/* Desktop Controls */}
            <div className="hidden sm:flex items-center">
              <ControlButtons />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div 
        className={`mobile-menu sm:hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}
        `}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 bg-background/95 backdrop-blur-sm border-t border-border/10">
          <div className="flex flex-col space-y-2">
            <NavLinks />
          </div>
          <div className="mt-4 pt-4 border-t border-border/10">
            <ControlButtons />
          </div>
        </div>
      </div>

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