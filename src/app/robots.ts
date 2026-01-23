import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/account/',
          '/profile/',
          '/auth/',
          '/checkout/',
          '/test-upload/',
          '/orders/',
          '/wishlist/',
          '/partner/',
          '/data-deletion/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/account/',
          '/profile/',
          '/auth/',
          '/checkout/',
          '/test-upload/',
          '/orders/',
          '/wishlist/',
          '/partner/',
          '/data-deletion/',
        ],
        crawlDelay: 0,
      },
    ],
    sitemap: 'https://skyzonebd.shop/sitemap.xml',
  }
}
