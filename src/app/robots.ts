import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/admin/', '/test-upload/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/admin/', '/test-upload/'],
        crawlDelay: 0,
      },
    ],
    sitemap: 'https://skyzonebd.com/sitemap.xml',
  }
}
