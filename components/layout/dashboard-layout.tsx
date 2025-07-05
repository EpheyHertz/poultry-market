'use client';

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
  Tag
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: User;
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
          { name: 'Applications', href: '/admin/applications', icon: FileText },
          { name: 'Sponsorships', href: '/admin/sponsorships', icon: HandHeart },
          { name: 'Delivery', href: '/admin/delivery-agents', icon: BarChart3 },
          { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        ];
      case 'SELLER':
        return [
          ...baseItems,
          { name: 'Products', href: '/seller/products', icon: Package },
          { name: 'Orders', href: '/seller/orders', icon: ShoppingCart },
          { name: 'Vouchers', href: '/seller/vouchers', icon: Ticket },
          { name: 'Sponsorships', href: '/seller/sponsorships', icon: HandHeart },
          { name: 'Profile', href: '/seller/profile', icon: Settings },
        ];
      case 'COMPANY':
        return [
          ...baseItems,
          { name: 'Products', href: '/company/products', icon: Package },
          { name: 'Orders', href: '/company/orders', icon: ShoppingCart },
          { name: 'Vouchers', href: '/company/vouchers', icon: Ticket },
          { name: 'Sponsorships', href: '/company/sponsorships', icon: HandHeart },
          { name: 'Profile', href: '/company/profile', icon: Settings },
        ];
      case 'CUSTOMER':
        return [
          ...baseItems,
          { name: 'Browse Products', href: '/customer/products', icon: Package },
          { name: 'My Orders', href: '/customer/orders', icon: ShoppingCart },
          { name: 'Applications', href: '/customer/applications', icon: FileText },
          { name: 'Track deliveries', href: '/customer/deliveries', icon: FileText },
          { name: 'Profile', href: '/customer/profile', icon: Settings },
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
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
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}