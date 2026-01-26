import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


const PAYMENTS_FILE = path.join(process.cwd(), 'data', 'payment-methods.json');

// Default payment methods
const defaultPaymentMethods = {
  bkash: {
    id: 'bkash',
    name: 'bKash',
    enabled: true,
    type: 'mobile_banking',
    accountNumber: '01700000000',
    instructions: 'Send payment to bKash: 01700000000',
  },
  nagad: {
    id: 'nagad',
    name: 'Nagad',
    enabled: true,
    type: 'mobile_banking',
    accountNumber: '01800000000',
    instructions: 'Send payment to Nagad: 01800000000',
  },
  rocket: {
    id: 'rocket',
    name: 'Rocket',
    enabled: false,
    type: 'mobile_banking',
    accountNumber: '019000000001',
    instructions: 'Send payment to Rocket: 019000000001',
  },
  bank: {
    id: 'bank',
    name: 'Bank Transfer',
    enabled: true,
    type: 'bank',
    bankName: 'Dutch Bangla Bank',
    accountName: 'Skyzone BD',
    accountNumber: '1234567890',
    routingNumber: '090123456',
    instructions: 'Transfer to DBBL Account: 1234567890',
  },
  cod: {
    id: 'cod',
    name: 'Cash on Delivery',
    enabled: true,
    type: 'cash',
    fee: 50,
    instructions: 'Pay in cash when you receive your order',
  },
  cards: {
    id: 'cards',
    name: 'Credit/Debit Cards',
    enabled: false,
    type: 'card',
    provider: 'SSLCommerz',
    instructions: 'Pay securely with your credit or debit card',
  },
};

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Read payment methods from file
function readPaymentMethods() {
  try {
    ensureDataDir();
    if (fs.existsSync(PAYMENTS_FILE)) {
      const data = fs.readFileSync(PAYMENTS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return defaultPaymentMethods;
  } catch (error) {
    console.error('Error reading payment methods:', error);
    return defaultPaymentMethods;
  }
}

// Write payment methods to file
function writePaymentMethods(methods: any) {
  try {
    ensureDataDir();
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(methods, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing payment methods:', error);
    return false;
  }
}

// GET payment methods
export async function GET(request: NextRequest) {
  try {
    const methods = readPaymentMethods();
    
    // Convert object to array for frontend
    const methodsArray = Object.values(methods);
    
    return NextResponse.json({
      success: true,
      data: methodsArray,
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

// PUT - Update payment method
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, enabled, ...config } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    const methods = readPaymentMethods();

    if (!methods[id]) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Update method
    methods[id] = {
      ...methods[id],
      enabled: enabled !== undefined ? enabled : methods[id].enabled,
      ...config,
    };

    const success = writePaymentMethods(methods);

    if (success) {
      return NextResponse.json({
        success: true,
        data: methods[id],
        message: `${methods[id].name} updated successfully`,
      });
    } else {
      throw new Error('Failed to write payment methods');
    }
  } catch (error) {
    console.error('Error updating payment method:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payment method' },
      { status: 500 }
    );
  }
}
