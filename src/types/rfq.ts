// types/rfq.ts - Request for Quote (B2B Feature)

export type RFQStatus = 'pending' | 'quoted' | 'accepted' | 'rejected' | 'expired';

export interface RFQItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  notes?: string;
}

export interface RFQ {
  id: string;
  rfqNumber: string;
  userId: string;
  subject: string;
  message?: string;
  targetPrice?: number;
  status: RFQStatus;
  items: RFQItem[];
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRFQData {
  subject: string;
  message?: string;
  targetPrice?: number;
  items: {
    productId: string;
    quantity: number;
    notes?: string;
  }[];
}

export interface RFQResponse {
  rfq: RFQ;
  message: string;
}
