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
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import AdminSupportChat from './admin-support-chat';
import ChatNotifications from './chat-notifications';

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
  const [isLoading, setIsLoading] = useState(!propUser); // Only loading if user wasn't provided

  const router = useRouter();
  const pathname = usePathname();

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
          { name: 'Support Chats', href: '/admin/chats', icon: MessageCircle },
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
        ];
      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  const NavigationContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center space-x-2 p-6 border-b">
        <Bird className="h-8 w-8 text-green-600" />
        <span className="text-xl font-bold">PoultryMarket</span>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // or redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
          <NavigationContent />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <NavigationContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                  <NavigationContent />
                </SheetContent>
              </Sheet>
              <h1 className="text-2xl font-semibold text-gray-900 capitalize">
                {user.role.toLowerCase()} Dashboard
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <ChatNotifications />
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar || undefined} alt={user?.name || 'User Avatar'} />
                        <AvatarFallback>
                          {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/${user.role.toLowerCase()}/profile`}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Admin Support Chat - Show for all users except admin */}
        {user.role !== 'ADMIN' && <AdminSupportChat />}
      </div>
    </div>
  );
}