'use client'

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Bird, 
  Menu, 
  Home, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  LogOut,
  Ticket,
  HandHeart,
  FileText,
  BarChart3,
  Tag,
  Truck,
  MessageCircle,
  Percent,
  QrCode,
  Bell,
  CreditCard,
  Speech,
  SearchCode,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import AdminSupportChat from './admin-support-chat';
import ChatNotifications from './chat-notifications';
import { useResponsive } from '@/hooks/use-responsive';

// Import responsive utilities
import '../../styles/dashboard-responsive.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: User; // Make user optional
}

export default function DashboardLayout({ children, user: propUser }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(propUser || null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(!propUser);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // Auto-collapse sidebar on smaller screens
  useEffect(() => {
    if (isTablet && !isMobile) {
      setIsSidebarCollapsed(true);
    } else if (isDesktop) {
      setIsSidebarCollapsed(false);
    }
  }, [isMobile, isTablet, isDesktop]);

  // Fetch user if not provided
  useEffect(() => {
    if (!propUser) {
      const fetchCurrentUser = async () => {
        try {
          setIsLoading(true);
          const response = await fetch('/api/auth/me');
          if (!response.ok) throw new Error('Unauthorized');

          const userData = await response.json();
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          toast.error('Please login to continue');
          router.push('/auth/login');
        } finally {
          setIsLoading(false);
        }
      };

      fetchCurrentUser();
    }
  }, [propUser, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const getNavigationItems = () => {
    if (!user) return [];

    const baseItems = [
      { name: 'Dashboard', href: `/${user.role.toLowerCase()}/dashboard`, icon: Home },
    ];

    switch (user.role) {
      case 'ADMIN':
        return [
          ...baseItems,
          { name: 'Users', href: '/admin/users', icon: Users },
          { name: 'Products', href: '/admin/products', icon: Package },
          { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
		  { name: 'Payment Approvals', href: '/admin/payment-approvals', icon: CreditCard },
          { name: 'Applications', href: '/admin/applications', icon: FileText },
          { name: 'Delivery Data', href: '/admin/delivery-management', icon: FileText },
          { name: 'Sponsorships', href: '/admin/sponsorships', icon: HandHeart },
          { name: 'Delivery', href: '/admin/delivery-agents', icon: BarChart3 },
          { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
          { name: 'Blog Management', href: '/admin/blog', icon: BookOpen },
          // { name: 'Support Chats', href: '/admin/chats', icon: MessageCircle },
          { name: 'Manage Chats', href: '/chats', icon: MessageCircle },
          { name: 'Announcements', href: '/admin/announcements', icon: Speech },
          { name: 'Blog Posts', href: '/blog', icon: BookOpen },
          { name: 'Use AI', href: '/chatbot', icon: SearchCode },
        ];
      case 'SELLER':
        return [
          ...baseItems,
          { name: 'Products', href: '/seller/products', icon: Package },
          { name: 'Analytics', href: '/seller/analytics', icon: Package },
          { name: 'Orders', href: '/seller/orders', icon: ShoppingCart },
          { name: 'Vouchers', href: '/seller/vouchers', icon: Ticket },
          { name: 'Discounts', href: '/seller/discounts', icon: Percent },
          { name: 'Sponsorships', href: '/seller/sponsorships', icon: HandHeart },
          { name: 'Profile', href: '/seller/profile', icon: Settings },
          { name: 'Share', href: '/seller/qr-code', icon: Settings },
          { name: 'Chats', href: '/seller/chats', icon: MessageCircle },
          { name: 'Manage Chats', href: '/chats', icon: MessageCircle },
          { name: 'Announcements', href: '/announcements', icon: Speech },
          { name: 'Blog Posts', href: '/blog', icon: BookOpen },
          { name: 'My Blogs', href: '/my-blogs', icon: BookOpen },
          { name: 'Use AI', href: '/chatbot', icon: SearchCode },
        ];
      case 'COMPANY':
        return [
          ...baseItems,
          { name: 'Products', href: '/company/products', icon: Package },
          { name: 'Orders', href: '/company/orders', icon: ShoppingCart },
          { name: 'Vouchers', href: '/company/vouchers', icon: Tag },
          { name: 'Discounts', href: '/company/discounts', icon: Percent },
          { name: 'Sponsorships', href: '/company/sponsorships', icon: HandHeart },
          { name: 'Analytics', href: '/company/analytics', icon: BarChart3 },
          { name: 'QR Code', href: '/company/qr-code', icon: QrCode },
          { name: 'Profile', href: '/company/profile', icon: Settings },
          { name: 'Chats', href: '/company/chats', icon: MessageCircle },
          { name: 'Manage Chats', href: '/chats', icon: MessageCircle },
          { name: 'Announcements', href: '/announcements', icon: Speech },
          { name: 'Blog Posts', href: '/blog', icon: BookOpen },
          { name: 'My Blogs', href: '/my-blogs', icon: BookOpen },
          { name: 'Use AI', href: '/chatbot', icon: SearchCode },
        ];
      case 'CUSTOMER':
        return [
          ...baseItems,
          { name: 'Browse Products', href: '/customer/products', icon: Package },
          { name: 'My Orders', href: '/customer/orders', icon: ShoppingCart },
          { name: 'Applications', href: '/customer/applications', icon: FileText },
          { name: 'Track deliveries', href: '/customer/deliveries', icon: FileText },
          { name: 'Profile', href: '/customer/profile', icon: Settings },
          { name: 'Chats', href: '/customer/chats', icon: MessageCircle },
          { name: 'Cart', href: '/customer/cart', icon: MessageCircle },
          { name: 'Vouchers', href: '/customer/vouchers', icon: Ticket },
          { name: 'Manage Chats', href: '/chats', icon: MessageCircle },
          { name: 'Announcements', href: '/announcements', icon: Speech },
          { name: 'Blog Posts', href: '/blog', icon: BookOpen },
          { name: 'Use AI', href: '/chatbot', icon: SearchCode },
        ];
      case 'DELIVERY_AGENT':
        return [
          ...baseItems,
          { name: 'Delivery Orders', href: '/delivery-agent/orders', icon: Package },
          { name: 'My Deliveries', href: '/delivery-agent/deliveries', icon: ShoppingCart },
          { name: 'Delivery History', href: '/delivery-agent/history', icon: FileText },
          { name: 'Profile', href: '/delivery-agent/profile', icon: Settings },
          { name: 'Chats', href: '/chats', icon: MessageCircle },
          { name: 'Announcements', href: '/announcements', icon: Speech },
          { name: 'Blog Posts', href: '/blog', icon: BookOpen },
          { name: 'Use AI', href: '/chatbot', icon: SearchCode },
        ];
      case 'STAKEHOLDER':
        return [
          ...baseItems,
          { name: 'Analytics', href: '/stakeholder/analytics', icon: BarChart3 },
          { name: 'Reports', href: '/stakeholder/reports', icon: FileText },
          { name: 'Performance', href: '/stakeholder/performance', icon: TrendingUp },
          { name: 'Profile', href: '/stakeholder/profile', icon: Settings },
          { name: 'Chats', href: '/chats', icon: MessageCircle },
          { name: 'Announcements', href: '/announcements', icon: Speech },
          { name: 'Blog Posts', href: '/blog', icon: BookOpen },
          { name: 'Use AI', href: '/chatbot', icon: SearchCode },
        ];
      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  const NavigationContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <motion.div 
      className="flex flex-col h-full bg-gradient-to-br from-white via-gray-50 to-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Logo Section */}
      <div className={`flex items-center space-x-3 p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-500 to-teal-600 text-white ${
        isSidebarCollapsed && !isMobile ? 'justify-center px-3' : ''
      }`}>
        <motion.div
          whileHover={{ scale: 1.1, rotate: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <Bird className="h-8 w-8 drop-shadow-md" />
        </motion.div>
        <AnimatePresence>
          {(!isSidebarCollapsed || isMobile) && (
            <motion.span 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-xl font-bold tracking-wide drop-shadow-sm"
            >
              PoultryHub
            </motion.span>
          )}
        </AnimatePresence>
        
        {/* Mobile Close Button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(false)}
            className="ml-auto text-white hover:bg-white/20 p-1"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={item.href}
                className={`group relative flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                    : 'text-gray-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:text-emerald-700 hover:shadow-md'
                } ${isSidebarCollapsed && !isMobile ? 'justify-center px-2' : ''}`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'drop-shadow-sm' : 'group-hover:scale-110 transition-transform'}`} />
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute -inset-1 bg-white/20 rounded-lg"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.div>
                
                <AnimatePresence>
                  {(!isSidebarCollapsed || isMobile) && (
                    <motion.span 
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className={`font-medium truncate ${isActive ? 'drop-shadow-sm' : ''}`}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute right-2 w-2 h-2 bg-white rounded-full shadow-sm"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* User Info Section */}
      <div className={`p-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white ${
        isSidebarCollapsed && !isMobile ? 'px-2' : ''
      }`}>
        <div className={`flex items-center space-x-3 p-3 rounded-xl bg-white shadow-sm border border-gray-100 ${
          isSidebarCollapsed && !isMobile ? 'justify-center' : ''
        }`}>
          <Avatar className="h-8 w-8 ring-2 ring-emerald-200">
            <AvatarImage src={user?.avatar || undefined} alt={user?.name || 'User Avatar'} />
            <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {(!isSidebarCollapsed || isMobile) && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{user?.role?.toLowerCase()}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col z-30 transition-all duration-300 ${
        isSidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        <div className="flex flex-col flex-grow bg-white/80 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl shadow-emerald-500/10 overflow-hidden relative">
          <NavigationContent />
          
          {/* Collapse Toggle Button */}
          <motion.button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-full p-1.5 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-emerald-50 hover:border-emerald-200 z-40"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={{ rotate: isSidebarCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </motion.div>
          </motion.button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent 
          side="left" 
          className="p-0 w-72 sm:w-80 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 overflow-hidden"
        >
          <NavigationContent isMobile={true} />
        </SheetContent>
      </Sheet>

      {/* Main Content Area - Enhanced Responsiveness */}
      <div className={`flex flex-col transition-all duration-300 min-h-screen ${
        // Dynamic margin adjustment for collapsed/expanded sidebar
        isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        {/* Enhanced Top Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-4 sm:px-6 lg:px-8 xl:px-12 py-3 sm:py-4 shadow-sm sticky top-0 z-20"
        >
          <div className="flex items-center justify-between min-h-[2.5rem] sm:min-h-[3rem]">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <motion.div whileTap={{ scale: 0.95 }}>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="lg:hidden hover:bg-emerald-50 hover:text-emerald-600 transition-colors duration-300 rounded-xl"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent 
                    side="left" 
                    className="p-0 w-80 bg-white/95 backdrop-blur-xl border-r border-gray-200/50"
                  >
                    <NavigationContent isMobile={true} />
                  </SheetContent>
                </Sheet>
              </motion.div>

              {/* Page Title */}
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent capitalize"
              >
                <span className="hidden sm:inline">{user.role.toLowerCase()} Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </motion.h1>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="hidden sm:block">
                <ChatNotifications />
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative hover:bg-emerald-50 hover:text-emerald-600 transition-colors duration-300 rounded-xl p-2"
                >
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  <motion.span 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2, delay: 1 }}
                    className="absolute -top-1 -right-1 h-2 w-2 sm:h-3 sm:w-3 bg-red-500 rounded-full"
                  />
                </Button>
              </motion.div>

              {/* Enhanced User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full ring-2 ring-transparent hover:ring-emerald-200 transition-all duration-300 p-0">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarImage src={user?.avatar || undefined} alt={user?.name || 'User Avatar'} />
                        <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-xs sm:text-sm">
                          {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-white/95 backdrop-blur-xl border border-gray-200/50 shadow-xl" align="end" forceMount>
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col space-y-2 p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12 ring-2 ring-emerald-200">
                        <AvatarImage src={user?.avatar || undefined} alt={user?.name || 'User Avatar'} />
                        <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold">
                          {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <p className="text-xs text-emerald-600 font-medium capitalize">{user.role.toLowerCase()}</p>
                      </div>
                    </div>
                  </motion.div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="focus:bg-emerald-50 focus:text-emerald-700">
                    <Link href={`/${user.role.toLowerCase()}/profile`} className="flex items-center">
                      <Settings className="mr-3 h-4 w-4" />
                      Settings & Profile
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
            </div>
          </div>
        </motion.header>

        {/* Enhanced Page Content */}
        <motion.main 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 overflow-hidden"
        >
          {/* Responsive Container */}
          <div className="h-full overflow-auto">
            <div className="min-h-full">
              {/* Responsive Content Wrapper */}
              <div className="dashboard-content-responsive dashboard-spacing-responsive">
                <div className="dashboard-container-responsive px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8">
                  {/* Enhanced Children Container */}
                  <div className="w-full dashboard-section-responsive">
                    {children}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.main>

        {/* Admin Support Chat - Enhanced positioning */}
        {user.role !== 'ADMIN' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
          >
            <AdminSupportChat />
          </motion.div>
        )}
      </div>
    </div>
  );
}