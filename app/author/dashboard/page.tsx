import { Metadata } from 'next';
import AuthorDashboard from '@/components/author/author-dashboard';

export const metadata: Metadata = {
  title: 'Author Dashboard',
  description: 'Manage your blog posts, view analytics, and grow your audience',
};

export default function AuthorDashboardPage() {
  return <AuthorDashboard />;
}
