import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://skyzonebd.shop';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/refund-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/shipping-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  try {
    // Fetch all active products
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Fetch all active categories
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true,
      },
    });

    // Generate product URLs
    const productPages: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${baseUrl}/products/${product.id}`,
      lastModified: product.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Generate category URLs
    const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${baseUrl}/products/category/${category.id}`,
      lastModified: category.updatedAt || new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.85,
    }));

    return [...staticPages, ...categoryPages, ...productPages];

  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    // Return static pages if DB fails
    return staticPages;
  }
}

