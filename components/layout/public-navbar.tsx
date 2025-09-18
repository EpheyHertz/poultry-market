'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Bird, 
  Menu, 
  Home, 
  Package, 
  LogOut,
  Settings,
  User,
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

interface PublicNavbarProps {
  showAuth?: boolean;
}

export default function PublicNavbar({ showAuth = true }: PublicNavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        // User not logged in, which is fine for public pages
        console.log('User not authenticated');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    return `/${user.role.toLowerCase()}/dashboard`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-12 sm:h-16">
          {/* Logo - Mobile First */}
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Bird className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600" />
            </motion.div>
            <span className="text-base sm:text-lg font-bold text-gray-900">
              PoultryHub
            </span>
          </Link>

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden lg:flex items-center space-x-6">
            <Link 
              href="/" 
              className="text-gray-700 hover:text-emerald-600 transition-colors font-medium"
            >
              Home
            </Link>
            <Link 
              href="/products" 
              className="text-gray-700 hover:text-emerald-600 transition-colors font-medium"
            >
              Products
            </Link>
            <Link 
              href="/blog" 
              className="text-gray-700 hover:text-emerald-600 transition-colors font-medium"
            >
              Blog
            </Link>
            <Link 
              href="/blog/submit" 
              className="text-emerald-600 hover:text-emerald-700 transition-colors font-medium border border-emerald-600 px-3 py-1 rounded-md hover:bg-emerald-50"
            >
              Write Blog
            </Link>
            <Link 
              href="/announcements" 
              className="text-gray-700 hover:text-emerald-600 transition-colors font-medium"
            >
              Announcements
            </Link>
          </div>

          {/* Right Side - Mobile Optimized */}
          <div className="flex items-center space-x-2">
            {/* Desktop Auth */}
            {!isLoading && showAuth && (
              <div className="hidden lg:flex items-center space-x-3">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || undefined} alt={user.name} />
                          <AvatarFallback className="bg-emerald-600 text-white text-xs">
                            {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48" align="end">
                      <DropdownMenuItem asChild>
                        <Link href={getDashboardLink()}>Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/my-blogs">My Blogs</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Link href="/auth/login">
                      <Button variant="ghost" size="sm">Sign In</Button>
                    </Link>
                    <Link href="/auth/register">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu - Full Width */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t border-gray-200 bg-white"
            >
              <div className="px-3 py-4 space-y-2">
                {/* Mobile Navigation Links */}
                <Link 
                  href="/" 
                  className="block px-3 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link 
                  href="/products" 
                  className="block px-3 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Products
                </Link>
                <Link 
                  href="/blog" 
                  className="block px-3 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Blog
                </Link>
                <Link 
                  href="/blog/submit" 
                  className="block px-3 py-3 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors font-medium border border-emerald-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Write Blog
                </Link>
                <Link 
                  href="/announcements" 
                  className="block px-3 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Announcements
                </Link>

                {/* Mobile Auth */}
                {!isLoading && showAuth && (
                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    {user ? (
                      <>
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Signed in as {user.name}
                        </div>
                        <Link 
                          href={getDashboardLink()}
                          className="block px-3 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors font-medium"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                        <Link 
                          href="/my-blogs"
                          className="block px-3 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors font-medium"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          My Blogs
                        </Link>
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="block w-full text-left px-3 py-3 text-red-600 hover:bg-red-50 rounded-md transition-colors font-medium"
                        >
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link 
                          href="/auth/login"
                          className="block px-3 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors font-medium"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Sign In
                        </Link>
                        <Link 
                          href="/auth/register"
                          className="block px-3 py-3 text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors font-medium text-center"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Get Started
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}