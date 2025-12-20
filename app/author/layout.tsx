'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme';
import {
  LayoutDashboard,
  FileText,
  User,
  BarChart3,
  Settings,
  ArrowLeft,
  Menu,
  X,
  PenTool,
  LogOut,
  Home,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthorLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/author/dashboard', icon: LayoutDashboard, color: '16, 185, 129' },
  { name: 'My Posts', href: '/author/posts', icon: FileText, color: '59, 130, 246' },
  { name: 'Analytics', href: '/author/analytics', icon: BarChart3, color: '249, 115, 22' },
  { name: 'Profile', href: '/author/profile', icon: User, color: '139, 92, 246' },
];

export default function AuthorLayout({ children }: AuthorLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check if this is a public author profile page (e.g., /author/johndoe)
  // Public profile routes don't need authentication
  const isPublicProfilePage = pathname && 
    pathname.startsWith('/author/') && 
    !pathname.startsWith('/author/dashboard') &&
    !pathname.startsWith('/author/posts') &&
    !pathname.startsWith('/author/analytics') &&
    !pathname.startsWith('/author/profile');

  useEffect(() => {
    // Skip auth check for public profile pages
    if (isPublicProfilePage) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/auth/login?redirect=/author/dashboard');
          return;
        }
        const userData = await response.json();
        setUser(userData);

        // Fetch author profile
        const profileResponse = await fetch('/api/author/profile');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfile(profileData.profile);
        }
      } catch (error) {
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router, isPublicProfilePage]);

  // For public profile pages, just render the children without the dashboard layout
  if (isPublicProfilePage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(249, 115, 22, 0.05) 100%)' }}>
        <div className="flex flex-col items-center gap-6 p-8">
          {/* Animated Logo Container */}
          <div className="relative">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 rounded-full animate-spin" style={{ 
              background: 'conic-gradient(from 0deg, rgba(16, 185, 129, 0.8), rgba(59, 130, 246, 0.8), rgba(249, 115, 22, 0.8), rgba(16, 185, 129, 0.8))',
              width: '80px',
              height: '80px',
              animationDuration: '2s'
            }} />
            {/* Inner circle */}
            <div className="relative w-20 h-20 rounded-full flex items-center justify-center" style={{ 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
              backdropFilter: 'blur(10px)',
              margin: '3px'
            }}>
              <div className="w-[68px] h-[68px] rounded-full bg-white dark:bg-gray-900 flex items-center justify-center shadow-xl">
                <PenTool className="h-8 w-8" style={{ color: 'rgba(16, 185, 129, 0.9)' }} />
              </div>
            </div>
          </div>
          
          {/* Loading Text */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-orange-500 bg-clip-text text-transparent">
              Author Studio
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Loading your workspace</span>
              <span className="flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
              </span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.1)' }}>
            <div className="h-full rounded-full animate-pulse" style={{ 
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.8), rgba(59, 130, 246, 0.8), rgba(249, 115, 22, 0.8))',
              width: '60%',
              animation: 'shimmer 1.5s ease-in-out infinite'
            }} />
          </div>
        </div>
        
        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))', borderColor: 'rgba(16, 185, 129, 0.1)' }}>
        <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.03), rgba(59, 130, 246, 0.03), rgba(249, 115, 22, 0.03))' }} />
        <div className="dark:block hidden absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08), rgba(59, 130, 246, 0.08), rgba(249, 115, 22, 0.08))' }} />
        <div className="relative flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/author/dashboard" className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.15))' }}>
              <PenTool className="h-5 w-5" style={{ color: 'rgba(16, 185, 129, 0.9)' }} />
            </div>
            <span className="font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-orange-500 bg-clip-text text-transparent">Author Studio</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 border-r transition-all duration-300 lg:translate-x-0 shadow-xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ 
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
          borderColor: 'rgba(16, 185, 129, 0.1)'
        }}
      >
        {/* Dark mode background */}
        <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)' }} />
        
        <div className="relative flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 h-16 border-b" style={{ borderColor: 'rgba(16, 185, 129, 0.1)' }}>
            <Link href="/author/dashboard" className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))', filter: 'blur(4px)' }} />
                <div className="relative p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.15))' }}>
                  <PenTool className="h-5 w-5" style={{ color: 'rgba(16, 185, 129, 0.9)' }} />
                </div>
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-emerald-600 via-blue-600 to-orange-500 bg-clip-text text-transparent">Author Studio</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-red-50 dark:hover:bg-red-900/30"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b mx-3 my-2 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(59, 130, 246, 0.05))', borderColor: 'rgba(16, 185, 129, 0.1)' }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))', filter: 'blur(2px)' }} />
                <Avatar className="relative border-2" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                  <AvatarImage src={profile?.avatarUrl || user?.avatar} alt={profile?.displayName || user?.name} />
                  <AvatarFallback className="font-bold" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))' }}>
                    {(profile?.displayName || user?.name)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-gray-900 dark:text-white">{profile?.displayName || user?.name}</p>
                {profile?.username && (
                  <p className="text-sm truncate" style={{ color: 'rgba(16, 185, 129, 0.8)' }}>@{profile.username}</p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item, index) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                      isActive
                        ? "text-white shadow-lg"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
                    )}
                    style={isActive ? { 
                      background: `linear-gradient(135deg, rgba(${item.color}, 0.9), rgba(${item.color}, 0.7))`,
                      boxShadow: `0 4px 15px rgba(${item.color}, 0.3)`
                    } : {}}
                  >
                    <div className={cn(
                      "p-2 rounded-lg transition-all duration-200",
                      !isActive && "group-hover:scale-110"
                    )} style={{ 
                      background: isActive ? 'rgba(255,255,255,0.2)' : `rgba(${item.color}, 0.1)` 
                    }}>
                      <item.icon className="h-4 w-4" style={{ color: isActive ? 'white' : `rgba(${item.color}, 0.9)` }} />
                    </div>
                    <span>{item.name}</span>
                    {isActive && (
                      <motion.div 
                        layoutId="activeIndicator"
                        className="ml-auto w-2 h-2 rounded-full bg-white"
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}

            <div className="pt-4 mt-4 border-t" style={{ borderColor: 'rgba(16, 185, 129, 0.1)' }}>
              <Link
                href="/author/posts/new"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group hover:shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))',
                  border: '1px dashed rgba(16, 185, 129, 0.3)'
                }}
              >
                <div className="p-2 rounded-lg transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.15))' }}>
                  <PenTool className="h-4 w-4" style={{ color: 'rgba(16, 185, 129, 0.9)' }} />
                </div>
                <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent font-semibold">Write New Post</span>
              </Link>
            </div>
          </nav>

          {/* Footer Links */}
          <div className="p-4 border-t space-y-1" style={{ borderColor: 'rgba(16, 185, 129, 0.1)' }}>
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 group"
            >
              <Home className="h-4 w-4 transition-transform group-hover:-translate-x-1" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
              Back to Home
            </Link>
            {profile?.username && (
              <Link
                href={`/author/${profile.username}`}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 group"
              >
                <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" style={{ color: 'rgba(249, 115, 22, 0.8)' }} />
                View Public Profile
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 w-full group"
            >
              <LogOut className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              Sign Out
            </button>
          </div>

          {/* Theme Toggle (Desktop) */}
          <div className="hidden lg:flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'rgba(16, 185, 129, 0.1)' }}>
            <span className="text-sm text-gray-600 dark:text-gray-400">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
