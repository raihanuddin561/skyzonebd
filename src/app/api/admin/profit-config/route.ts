// app/api/admin/profit-config/route.ts - Admin Profit Sharing Configuration

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * GET /api/admin/profit-config
 * Get all profit sharing configurations
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication middleware
    
    const configs = await prisma.platformConfig.findMany({
      where: {
        category: 'profit'
      },
      orderBy: {
        key: 'asc'
      }
    });

    // Parse JSON values
    const parsedConfigs = configs.map(config => ({
      ...config,
      value: tryParseJSON(config.value)
    }));

    return NextResponse.json({
      success: true,
      configs: parsedConfigs
    });

  } catch (error) {
    console.error('Error fetching profit config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch configurations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/profit-config
 * Create or update profit sharing configuration
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication middleware
    
    const body = await request.json();
    const { key, value, description, category = 'profit' } = body;

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Configuration key is required' },
        { status: 400 }
      );
    }

    // Convert value to JSON string if it's an object
    const valueString = typeof value === 'object' 
      ? JSON.stringify(value) 
      : String(value);

    const config = await prisma.platformConfig.upsert({
      where: { key },
      create: {
        key,
        value: valueString,
        description,
        category
      },
      update: {
        value: valueString,
        description,
        category
      }
    });

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        value: tryParseJSON(config.value)
      }
    });

  } catch (error) {
    console.error('Error saving profit config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/profit-config
 * Update default platform profit percentage
 */
export async function PUT(request: NextRequest) {
  try {
    // TODO: Add admin authentication middleware
    
    const body = await request.json();
    const { platformProfitPercentage } = body;

    if (platformProfitPercentage === undefined || platformProfitPercentage < 0 || platformProfitPercentage > 100) {
      return NextResponse.json(
        { success: false, error: 'Valid profit percentage (0-100) is required' },
        { status: 400 }
      );
    }

    // Get current default before updating
    const currentConfig = await prisma.platformConfig.findUnique({
      where: { key: 'default_platform_profit_percentage' }
    });
    
    const oldDefault = currentConfig ? parseFloat(currentConfig.value) : 15;

    // Update default platform profit percentage
    const config = await prisma.platformConfig.upsert({
      where: { key: 'default_platform_profit_percentage' },
      create: {
        key: 'default_platform_profit_percentage',
        value: String(platformProfitPercentage),
        description: 'Default profit percentage for platform',
        category: 'profit'
      },
      update: {
        value: String(platformProfitPercentage)
      }
    });

    // Update products that still use the old default value
    await prisma.product.updateMany({
      where: {
        platformProfitPercentage: oldDefault
      },
      data: {
        platformProfitPercentage
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Default profit percentage updated',
      config: {
        ...config,
        value: Number(config.value)
      }
    });

  } catch (error) {
    console.error('Error updating profit percentage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profit percentage' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/profit-config?key=<config_key>
 * Delete a configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    // TODO: Add admin authentication middleware
    
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Configuration key is required' },
        { status: 400 }
      );
    }

    await prisma.platformConfig.delete({
      where: { key }
    });

    return NextResponse.json({
      success: true,
      message: 'Configuration deleted'
    });

  } catch (error) {
    console.error('Error deleting profit config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete configuration' },
      { status: 500 }
    );
  }
}

// Helper function to parse JSON safely
function tryParseJSON(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    // If not JSON, try parsing as number
    const num = Number(value);
    return isNaN(num) ? value : num;
  }
}
