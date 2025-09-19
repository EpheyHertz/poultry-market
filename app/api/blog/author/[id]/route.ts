import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const author = await prisma.user.findUnique({
      where: { id },
      include: {
        blogPosts: {
          where: {
            status: {
              in: ['PUBLISHED', 'APPROVED']
            }
          },
          include: {
            tags: true,
            _count: {
              select: {
                likedBy: true,
                comments: true
              }
            }
          },
          orderBy: {
            publishedAt: 'desc'
          }
        },
        _count: {
          select: {
            blogPosts: {
              where: {
                status: {
                  in: ['PUBLISHED', 'APPROVED']
                }
              }
            },
            followers: true,
            following: true
          }
        }
      }
    });

    if (!author) {
      return NextResponse.json(
        { error: 'Author not found' },
        { status: 404 }
      );
    }

    // Remove sensitive information
    const { password, email, ...safeAuthor } = author;

    return NextResponse.json(safeAuthor);
  } catch (error) {
    console.error('Error fetching author:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}