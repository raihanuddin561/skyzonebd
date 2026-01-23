require('@testing-library/jest-dom');

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  redirect: jest.fn(),
}));

// Mock Next.js image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    const { alt, ...rest } = props;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return require('react').createElement('img', { ...rest, alt });
  },
}));

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';

// Global test timeout
jest.setTimeout(10000);

