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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Bird className="h-8 w-8 text-emerald-600" />
            </motion.div>
            <span className="text-xl font-bold text-gray-900">PoultryHub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-700 hover:text-emerald-600 transition-colors duration-200 font-medium"
            >
              Home
            </Link>
            <Link 
              href="/products" 
              className="text-gray-700 hover:text-emerald-600 transition-colors duration-200 font-medium"
            >
              Products
            </Link>
            <Link 
              href="/blog" 
              className="text-gray-700 hover:text-emerald-600 transition-colors duration-200 font-medium"
            >
              Blog
            </Link>
            <Link 
              href="/blog/submit" 
              className="text-emerald-600 hover:text-emerald-700 transition-colors duration-200 font-medium border border-emerald-600 px-3 py-1 rounded-lg hover:bg-emerald-50"
            >
              Write Blog
            </Link>
            <Link 
              href="/announcements" 
              className="text-gray-700 hover:text-emerald-600 transition-colors duration-200 font-medium"
            >
              Announcements
            </Link>
          </div>

          {/* User Section */}
          <div className="flex items-center space-x-4">
            {!isLoading && showAuth && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          variant="ghost" 
                          className="relative h-10 w-10 rounded-full ring-2 ring-transparent hover:ring-emerald-200 transition-all duration-300 p-0"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar || undefined} alt={user.name} />
                            <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold">
                              {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </motion.div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end">
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center space-x-3 p-3"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar || undefined} alt={user.name} />
                          <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold">
                            {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          <p className="text-xs text-emerald-600 font-medium capitalize">
                            {user.role.toLowerCase()}
                          </p>
                        </div>
                      </motion.div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="focus:bg-emerald-50 focus:text-emerald-700">
                        <Link href={getDashboardLink()} className="flex items-center">
                          <Home className="mr-3 h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="focus:bg-emerald-50 focus:text-emerald-700">
                        <Link href="/my-blogs" className="flex items-center">
                          <FileText className="mr-3 h-4 w-4" />
                          My Blogs
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="focus:bg-emerald-50 focus:text-emerald-700">
                        <Link href={`/${user.role.toLowerCase()}/profile`} className="flex items-center">
                          <Settings className="mr-3 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleLogout}
                        className="focus:bg-red-50 focus:text-red-700 text-red-600"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Link href="/auth/login">
                      <Button 
                        variant="ghost" 
                        className="text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
                      >
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/auth/register">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-200 bg-white"
            >
              <div className="px-4 py-4 space-y-2">
                <Link 
                  href="/" 
                  className="block px-3 py-2 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link 
                  href="/products" 
                  className="block px-3 py-2 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Products
                </Link>
                <Link 
                  href="/blog" 
                  className="block px-3 py-2 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Blog
                </Link>
                <Link 
                  href="/blog/submit" 
                  className="block px-3 py-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors font-medium border border-emerald-600 mx-3 text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Write Blog
                </Link>
                <Link 
                  href="/announcements" 
                  className="block px-3 py-2 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Announcements
                </Link>
                
                {showAuth && !isLoading && (
                  <>
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      {user ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3 px-3 py-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar || undefined} alt={user.name} />
                              <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-xs">
                                {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                              <p className="text-xs text-emerald-600 capitalize">{user.role.toLowerCase()}</p>
                            </div>
                          </div>
                          <Link 
                            href={getDashboardLink()} 
                            className="block px-3 py-2 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Dashboard
                          </Link>
                          <Link 
                            href="/my-blogs" 
                            className="block px-3 py-2 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            My Blogs
                          </Link>
                          <Link 
                            href={`/${user.role.toLowerCase()}/profile`} 
                            className="block px-3 py-2 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Profile
                          </Link>
                          <button 
                            onClick={() => {
                              handleLogout();
                              setIsMobileMenuOpen(false);
                            }}
                            className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            Sign out
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Link 
                            href="/auth/login" 
                            className="block px-3 py-2 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Sign In
                          </Link>
                          <Link 
                            href="/auth/register" 
                            className="block px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Get Started
                          </Link>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}