'use client';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import SubmitForm from '@/app/submit/SubmitForm';
import { Home, Plus, Music, Menu } from 'lucide-react';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Navbar() {
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  
  const navLinks = [
    { href: '/', icon: <Home className="h-4 w-4" />, label: 'Home' },
    // Add more nav links here as needed
  ];

  const NavContent = () => (
    <>
      {navLinks.map((link) => (
        <Link key={link.href} href={link.href}>
          <Button
            variant="ghost"
            className="text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-all duration-200"
            aria-label={link.label}
          >
            {link.icon}
            <span>{link.label}</span>
          </Button>
        </Link>
      ))}
    </>
  );

  return (
    <>
      <nav className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 backdrop-blur-sm bg-opacity-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-90 transition-all duration-200 group"
              aria-label="Music4Study Home"
            >
              <Music className="h-6 w-6 text-indigo-500 group-hover:text-indigo-400 transition-colors" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent hidden sm:block">
                Music4Study
              </h1>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <NavContent />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button
                className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg transition-all duration-200 hover:shadow-indigo-500/25"
                onClick={() => setShowSubmitForm(true)}
                aria-label="Add new track"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Track</span>
              </Button>

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    className="md:hidden text-slate-300 hover:text-white hover:bg-slate-800"
                    aria-label="Open menu"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-slate-900 border-slate-800">
                  <div className="flex flex-col gap-4 mt-8">
                    <NavContent />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Submit Form Modal */}
      {showSubmitForm && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center transition-all">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg max-w-xl w-full mx-4 shadow-xl">
            <SubmitForm onClose={() => setShowSubmitForm(false)} />
          </div>
        </div>
      )}
    </>
  );
}