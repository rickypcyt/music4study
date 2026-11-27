'use client';

import { Compass, Home, Layers, Menu, Tags, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MotionConfig, motion } from 'framer-motion';

import { Button } from './button';
import Link from 'next/link';
import SortMenu from './SortMenu';

interface NavbarProps {
  currentView: 'home' | 'genres' | 'combinations';
  onGenresClick: () => void;
  onHomeClick: () => void;
  onSubmitClick: () => void;
  onCombinationsClick: () => void;
  user?: { name: string; username?: string | null; image: string | null } | null;
  /** true mientras aún no se sabe si hay sesión: evita mostrar "Sign in" por error */
  authLoading?: boolean;
  onLoginClick?: () => void;
  onProfileClick?: () => void;
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
  user,
  authLoading,
  onLoginClick,
  onProfileClick,
  onSortChange,
  currentSort,
  onThemeChange,
  currentTheme,
}: NavbarProps) {
  const searchParams = useSearchParams();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Handle navigation with loading state
  // La URL la actualiza el callback de la página (sin pasar por el servidor)
  const handleNavigation = useCallback((_view: string, callback: () => void) => {
    setIsNavigating(true);
    callback();
    setTimeout(() => setIsNavigating(false), 50);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        isMobileMenuOpen &&
        !target.closest('.mobile-menu') &&
        !target.closest('.mobile-menu-button') &&
        !target.closest('[data-radix-popper-content-wrapper]')
      ) {
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

  // Son elementos JSX y no componentes definidos dentro de Navbar: así React no los desmonta en cada render
  // `indicatorId` distinto en escritorio y móvil: dos elementos con el mismo layoutId se pelearían la animación
  const indicator = (indicatorId: string) => (
    <motion.span
      layoutId={indicatorId}
      aria-hidden
      className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-primary"
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    />
  );

  const renderNavLinks = (indicatorId: string) => (
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
        className={`relative inline-flex items-center px-1 lg:px-2 pt-1 pb-2 border-b-2 text-base lg:text-lg font-medium transition-colors duration-300 ease-out ${
          currentView === 'home'
            ? 'border-transparent text-foreground'
            : 'border-transparent text-foreground/70 hover:border-foreground/50 hover:text-foreground'
        } ${isNavigating ? 'opacity-70' : ''}`}
      >
        <Home className="h-5 w-5 lg:h-6 lg:w-6 mr-1 lg:mr-2" />
        <span>Home</span>
        {currentView === 'home' && indicator(indicatorId)}
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
        className={`relative inline-flex items-center px-1 lg:px-2 pt-1 pb-2 border-b-2 text-base lg:text-lg font-medium transition-colors duration-300 ease-out ${
          currentView === 'genres'
            ? 'border-transparent text-foreground'
            : 'border-transparent text-foreground/70 hover:border-foreground/50 hover:text-foreground'
        } ${isNavigating ? 'opacity-70' : ''}`}
      >
        <Tags className="h-5 w-5 lg:h-6 lg:w-6 mr-1 lg:mr-2" />
        <span>Genres</span>
        {currentView === 'genres' && indicator(indicatorId)}
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
        className={`relative inline-flex items-center px-1 lg:px-2 pt-1 pb-2 border-b-2 text-base lg:text-lg font-medium transition-colors duration-300 ease-out ${
          currentView === 'combinations'
            ? 'border-transparent text-foreground'
            : 'border-transparent text-foreground/70 hover:border-foreground/50 hover:text-foreground'
        } ${isNavigating ? 'opacity-70' : ''}`}
      >
        <Layers className="h-5 w-5 lg:h-6 lg:w-6 mr-1 lg:mr-2" />
        <span>Combinations</span>
        {currentView === 'combinations' && indicator(indicatorId)}
      </Link>
      <Link
        href="/explore"
        className="inline-flex items-center px-1 lg:px-2 pt-1 pb-2 border-b-2 border-transparent text-base lg:text-lg font-medium text-foreground/70 hover:border-foreground/50 hover:text-foreground transition-all duration-300 ease-out"
      >
        <Compass className="h-5 w-5 lg:h-6 lg:w-6 mr-1 lg:mr-2" />
        <span>Explore</span>
      </Link>
    </>
  );

  const controlButtons = (
    <div className="flex items-center space-x-1 lg:space-x-4">
      <SortMenu value={currentSort} onChange={onSortChange} />
      {user ? (
        <button
          onClick={onProfileClick}
          title="Profile"
          aria-label="Profile"
          className="inline-flex items-center justify-center gap-2 px-2 lg:px-4 py-2 rounded-md text-base lg:text-lg font-medium text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors duration-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {user.image && <img src={user.image} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full" />}
          <span className={`${user.image ? "hidden lg:inline" : ""} max-w-[8rem] truncate`}>{user.username ? `@${user.username}` : user.name}</span>
        </button>
      ) : authLoading ? (
        <div className="m4s-shimmer mx-1 h-10 w-24 rounded-md" aria-label="Loading account" role="status" />
      ) : (
        <button
          onClick={onLoginClick}
          className="inline-flex items-center justify-center px-2 lg:px-4 py-2 rounded-md text-base lg:text-lg font-medium text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors duration-200"
        >
          Sign in
        </button>
      )}
      <Button
        onClick={onSubmitClick}
        className="bg-primary hover:bg-primary/90 text-primary-foreground text-base lg:text-lg px-3 lg:px-4 py-2 ml-1 lg:ml-0 transition-colors duration-200"
      >
        <span className="lg:hidden">Submit</span>
        <span className="hidden lg:inline">Submit Track</span>
      </Button>
    </div>
  );

  return (
    <nav className="navbar sticky top-0 z-50">
      <div className="w-full px-4 md:px-4 lg:px-10 xl:px-12">
        <div className="flex justify-center h-16">
          {/* Main Content: Logo, Nav Links, Controls */}
          <div className="flex items-center justify-between w-full md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-2">

            {/* Logo */}
            <div className="flex-shrink-0 md:justify-self-start">
              <h1 className="text-2xl sm:text-3xl md:text-2xl lg:text-4xl font-sans text-foreground tracking-wider font-light">
                Music4Study
              </h1>
            </div>

            {/* Desktop Nav Links */}
            {/* layoutRoot: la barra es sticky; así el indicador no "vuela" si cambia el scroll */}
            <MotionConfig reducedMotion="user">
              <motion.div layoutRoot className="hidden md:flex items-center space-x-2 lg:space-x-6">
                {renderNavLinks('nav-indicator-desktop')}
              </motion.div>
            </MotionConfig>

            {/* Desktop Controls */}
            <div className="hidden md:flex items-center md:justify-self-end">
              {controlButtons}
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
                <MotionConfig reducedMotion="user">{renderNavLinks('nav-indicator-mobile')}</MotionConfig>
              </div>
            </div>
            {/* Mobile Controls */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <SortMenu value={currentSort} onChange={onSortChange} variant="full" />
                <button
                  disabled={authLoading && !user}
                  onClick={user ? onProfileClick : onLoginClick}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  {user ? `Profile (${user.username ? `@${user.username}` : user.name.split(' ')[0]})` : authLoading ? '…' : 'Sign in'}
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