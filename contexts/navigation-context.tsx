'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface NavigationContextType {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  activeSection: string | null;
  setActiveSection: (section: string | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load persisted state from localStorage on mount
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem('sidebar-collapsed');
      const savedSection = localStorage.getItem('active-section');
      
      if (savedCollapsed !== null) {
        setIsSidebarCollapsed(JSON.parse(savedCollapsed));
      }
      if (savedSection !== null) {
        setActiveSection(JSON.parse(savedSection));
      }
    } catch (error) {
      console.error('Failed to load navigation state:', error);
    }
    setIsHydrated(true);
  }, []);

  // Persist sidebar state to localStorage
  const handleSetCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    try {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
    } catch (error) {
      console.error('Failed to save sidebar state:', error);
    }
  };

  // Persist active section to localStorage
  const handleSetActiveSection = (section: string | null) => {
    setActiveSection(section);
    try {
      localStorage.setItem('active-section', JSON.stringify(section));
    } catch (error) {
      console.error('Failed to save active section:', error);
    }
  };

  return (
    <NavigationContext.Provider
      value={{
        isSidebarCollapsed,
        setIsSidebarCollapsed: handleSetCollapsed,
        activeSection,
        setActiveSection: handleSetActiveSection,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
