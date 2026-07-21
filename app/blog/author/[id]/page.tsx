import { permanentRedirect, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function BlogAuthorRedirect({ params }: PageProps) {
  const { id } = params;

  // Look up the author profile by userId to get the canonical username
  const authorProfile = await prisma.authorProfile.findUnique({
    where: { userId: id },
    select: { username: true, isPublic: true },
  });

  // If author has a public profile, 301 redirect to canonical /author/[username]
  if (authorProfile && authorProfile.isPublic) {
    permanentRedirect(`/author/${authorProfile.username}`);
  }

  // Otherwise redirect to blog listing (temporary)
  redirect('/blog');
}
