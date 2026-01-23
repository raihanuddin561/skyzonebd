// Structured Data Components for SEO
// Use these throughout your app to add JSON-LD schemas

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SkyzoneBD',
    url: 'https://skyzonebd.shop',
    logo: 'https://skyzonebd.shop/logo.png',
    description: 'Bangladesh\'s leading B2B wholesale marketplace for electrical hardware',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'BD',
      addressRegion: 'Dhaka',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      areaServed: 'BD',
      availableLanguage: ['English', 'Bengali'],
    },
    sameAs: [
      // Add your actual social media links here
      'https://facebook.com/skyzonebd',
      'https://twitter.com/skyzonebd',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebSiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SkyzoneBD',
    url: 'https://skyzonebd.shop',
    description: 'Bangladesh B2B wholesale marketplace for electrical hardware',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://skyzonebd.shop/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
