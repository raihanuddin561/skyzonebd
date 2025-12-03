// SEO Configuration for SkyzoneBD
export const seoConfig = {
  siteName: 'SkyzoneBD',
  defaultTitle: 'SkyzoneBD - Your Trusted B2B & B2C Marketplace in Bangladesh',
  defaultDescription: 'SkyzoneBD is Bangladesh\'s leading B2B and B2C marketplace. Connect with verified wholesalers, retailers, and manufacturers. Shop quality products at competitive wholesale and retail prices. Fast delivery across Bangladesh.',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://skyzonebd.com',
  keywords: [
    'B2B marketplace Bangladesh',
    'wholesale Bangladesh',
    'B2C marketplace',
    'online wholesale',
    'bulk buy Bangladesh',
    'retailer marketplace',
    'wholesale products',
    'Bangladesh ecommerce',
    'verified suppliers',
    'bulk order',
    'wholesale price',
    'manufacturer direct',
    'business marketplace',
    'trade marketplace Bangladesh'
  ],
  
  // Social Media
  social: {
    facebook: 'https://facebook.com/skyzonebd',
    twitter: 'https://twitter.com/skyzonebd',
    instagram: 'https://instagram.com/skyzonebd',
    linkedin: 'https://linkedin.com/company/skyzonebd',
  },
  
  // Open Graph defaults
  og: {
    type: 'website',
    locale: 'en_BD',
    siteName: 'SkyzoneBD',
  },
  
  // Twitter Card defaults
  twitter: {
    card: 'summary_large_image',
    site: '@skyzonebd',
  },
  
  // Structured Data Organization
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SkyzoneBD',
    url: 'https://skyzonebd.com',
    logo: 'https://skyzonebd.com/logo.png',
    description: 'Bangladesh\'s leading B2B and B2C marketplace',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+880-1711-000000',
      contactType: 'Customer Service',
      areaServed: 'BD',
      availableLanguage: ['English', 'Bengali']
    },
    sameAs: [
      'https://facebook.com/skyzonebd',
      'https://twitter.com/skyzonebd',
      'https://instagram.com/skyzonebd',
      'https://linkedin.com/company/skyzonebd',
    ]
  }
};

// Page-specific SEO configurations
export const pageSEO = {
  home: {
    title: 'SkyzoneBD - B2B & B2C Marketplace | Wholesale & Retail Products in Bangladesh',
    description: 'Bangladesh\'s trusted B2B and B2C marketplace. Connect with verified wholesalers and manufacturers. Buy quality products at wholesale and retail prices. Fast delivery across Bangladesh.',
    keywords: 'B2B marketplace Bangladesh, wholesale Bangladesh, B2C ecommerce, bulk buy, wholesale products, verified suppliers'
  },
  
  products: {
    title: 'Products - Shop Wholesale & Retail | SkyzoneBD',
    description: 'Browse thousands of quality products from verified suppliers. Best wholesale and retail prices in Bangladesh. Electronics, clothing, baby products, and more. Order now!',
    keywords: 'wholesale products Bangladesh, retail products, bulk buy, electronics wholesale, clothing wholesale'
  },
  
  categories: {
    title: 'Product Categories - Shop by Category | SkyzoneBD',
    description: 'Explore product categories from verified suppliers. Find electronics, fashion, baby products, home & living, and more at competitive prices.',
    keywords: 'product categories, wholesale categories, electronics, fashion, baby products'
  },
  
  search: {
    title: 'Search Products - Find Wholesale Deals | SkyzoneBD',
    description: 'Search for products, categories, and suppliers. Find the best wholesale and retail deals in Bangladesh.',
    keywords: 'search products, find suppliers, product search Bangladesh'
  },
  
  cart: {
    title: 'Shopping Cart - Review Your Order | SkyzoneBD',
    description: 'Review your shopping cart and proceed to checkout. Secure payment and fast delivery across Bangladesh.',
    keywords: 'shopping cart, checkout, buy wholesale, bulk order'
  },
  
  checkout: {
    title: 'Checkout - Complete Your Order | SkyzoneBD',
    description: 'Complete your order securely. Multiple payment options available. Fast delivery across Bangladesh.',
    keywords: 'checkout, secure payment, order now, bulk order Bangladesh'
  },
  
  profile: {
    title: 'My Profile - Account Settings | SkyzoneBD',
    description: 'Manage your SkyzoneBD account, orders, and business profile. Update your information and preferences.',
    keywords: 'account settings, profile, my account'
  },
  
  orders: {
    title: 'My Orders - Order History & Tracking | SkyzoneBD',
    description: 'View your order history, track shipments, and manage returns. Stay updated on all your purchases.',
    keywords: 'order history, track order, my orders, order tracking'
  },
  
  wishlist: {
    title: 'My Wishlist - Saved Products | SkyzoneBD',
    description: 'View and manage your saved products. Add items to cart or share with others.',
    keywords: 'wishlist, saved products, favorites'
  },
  
  auth: {
    login: {
      title: 'Login - Access Your Account | SkyzoneBD',
      description: 'Login to your SkyzoneBD account. Access your orders, wishlist, and business dashboard.',
      keywords: 'login, sign in, account access'
    },
    register: {
      title: 'Register - Create Your Account | SkyzoneBD',
      description: 'Join SkyzoneBD today! Register as a buyer or seller. Connect with verified businesses and grow your sales.',
      keywords: 'register, sign up, create account, join marketplace'
    }
  },
  
  dashboard: {
    title: 'Admin Dashboard - Manage Your Business | SkyzoneBD',
    description: 'Manage products, orders, customers, and analytics. Complete business management solution.',
    keywords: 'admin dashboard, business management, order management'
  }
};

// Helper function to generate full metadata
export function generateSEOMetadata({
  title,
  description,
  keywords,
  path = '',
  image,
  noIndex = false,
}: {
  title?: string;
  description?: string;
  keywords?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}) {
  const fullTitle = title || seoConfig.defaultTitle;
  const fullDescription = description || seoConfig.defaultDescription;
  const fullUrl = `${seoConfig.siteUrl}${path}`;
  const fullImage = image || `${seoConfig.siteUrl}/og-image.jpg`;
  
  return {
    title: fullTitle,
    description: fullDescription,
    keywords: keywords || seoConfig.keywords.join(', '),
    authors: [{ name: 'SkyzoneBD' }],
    creator: 'SkyzoneBD',
    publisher: 'SkyzoneBD',
    metadataBase: new URL(seoConfig.siteUrl),
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url: fullUrl,
      siteName: seoConfig.siteName,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
      locale: 'en_BD',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: fullDescription,
      images: [fullImage],
      creator: '@skyzonebd',
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: 'your-google-verification-code',
      // Add other verification codes as needed
    },
  };
}
