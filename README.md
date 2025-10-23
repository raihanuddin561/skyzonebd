````markdown
# SkyzoneBD - B2B & B2C E-Commerce Platform

This is a comprehensive B2B and B2C e-commerce platform built with Next.js, featuring dual pricing models, wholesale tiers, and verified business accounts.

## Features

- 🛍️ B2C (Retail) & B2B (Wholesale) Support
- 📦 Product Management with Categories
- 🏷️ Smart MOQ (Minimum Order Quantity) Logic
- 💰 Wholesale Pricing Tiers
- 🔐 User Authentication & Business Verification
- 🛒 Shopping Cart & Wishlist
- 📊 Order Management
- 🔍 Product Search & Filters
- 💳 Payment Integration
- 📱 Responsive Design

## Tech Stack

- **Framework:** Next.js 15.3.2 (App Router)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with bcrypt
- **Styling:** Tailwind CSS
- **Deployment:** Vercel (with Postgres & Blob Storage)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Database Setup

Set up the database using one of the following methods:

```bash
# Option 1: Push schema to database
npm run db:push

# Option 2: Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Open Prisma Studio to view data
npm run db:studio
```

See [DATABASE_SETUP_INSTRUCTIONS.md](./DATABASE_SETUP_INSTRUCTIONS.md) for detailed setup instructions.

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://postgres:123@localhost:5432/sagor_db"
DIRECT_URL="postgresql://postgres:123@localhost:5432/sagor_db"
JWT_SECRET="your-secret-key-here"
```

## Project Structure

- `/src/app` - Next.js App Router pages and layouts
- `/src/components` - Reusable React components
- `/src/contexts` - React Context providers (Auth, Cart, Wishlist)
- `/src/hooks` - Custom React hooks
- `/src/services` - API service layer
- `/src/types` - TypeScript type definitions
- `/prisma` - Database schema and seed files
- `/public` - Static assets

## Key Features Documentation

- [B2B & B2C Implementation](./B2B_B2C_IMPLEMENTATION.md)
- [Smart MOQ Logic](./MOQ_SMART_IMPLEMENTATION.md)
- [Admin Panel](./ADMIN_PANEL_DOCUMENTATION.md)
- [Vercel Deployment](./VERCEL_DEPLOYMENT_GUIDE.md)
- [Database Integration](./DATABASE_INTEGRATION_SUMMARY.md)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

See [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) for complete deployment instructions with Vercel Postgres and Blob Storage.

## License

© 2025 SkyzoneBD. All rights reserved.

````
