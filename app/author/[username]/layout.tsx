'use client';

// This layout overrides the parent author layout for public author profile pages
// The public author profile should be accessible without authentication

interface PublicAuthorLayoutProps {
  children: React.ReactNode;
}

export default function PublicAuthorLayout({ children }: PublicAuthorLayoutProps) {
  // Simple passthrough layout - no auth required for public author profiles
  // The page component handles its own layout with PublicNavbar
  return <>{children}</>;
}
