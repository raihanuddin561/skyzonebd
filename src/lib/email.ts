// lib/email.ts - Email notification system
// Supports multiple email providers (Resend, SendGrid, NodeMailer)

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * Resend Email Provider (Recommended for Next.js)
 * Install: npm install resend
 */
class ResendProvider implements EmailProvider {
  private apiKey: string;
  private baseUrl = 'https://api.resend.com/emails';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(options: EmailOptions) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from || 'SkyzoneBD <noreply@skyzonebd.com>',
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
          cc: options.cc,
          bcc: options.bcc,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to send email'
        };
      }

      return {
        success: true,
        messageId: data.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Console Email Provider (Development/Testing)
 * Logs emails to console instead of sending
 */
class ConsoleProvider implements EmailProvider {
  async sendEmail(options: EmailOptions) {
    console.log('\n📧 Email Preview (Development Mode)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('From:', options.from || 'SkyzoneBD <noreply@skyzonebd.com>');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('HTML:', options.html.substring(0, 200) + '...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      success: true,
      messageId: `dev-${Date.now()}`
    };
  }
}

/**
 * Email Service - Main class
 */
class EmailService {
  private provider: EmailProvider;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment || !apiKey) {
      this.provider = new ConsoleProvider();
    } else {
      this.provider = new ResendProvider(apiKey);
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions) {
    return this.provider.sendEmail(options);
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(to: string, userName: string, userType: 'RETAIL' | 'WHOLESALE') {
    const subject = 'Welcome to SkyzoneBD!';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to SkyzoneBD!</h1>
            </div>
            <div class="content">
              <h2>Hi ${userName},</h2>
              <p>Thank you for registering as a ${userType === 'WHOLESALE' ? 'Wholesale Business' : 'Retail'} customer!</p>
              
              ${userType === 'WHOLESALE' ? `
                <p><strong>What's Next?</strong></p>
                <ul>
                  <li>Complete your business verification to unlock wholesale pricing</li>
                  <li>Browse our product catalog with competitive bulk pricing</li>
                  <li>Place your first wholesale order with minimum order quantities</li>
                </ul>
              ` : `
                <p><strong>Start Shopping Today!</strong></p>
                <p>Explore our wide range of products at competitive retail prices.</p>
              `}
              
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://skyzonebd.com'}" class="button">
                Start Shopping
              </a>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} SkyzoneBD. All rights reserved.</p>
              <p>If you have any questions, contact us at support@skyzonebd.com</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(to: string, orderNumber: string, orderTotal: number, items: any[]) {
    const subject = `Order Confirmation - ${orderNumber}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
              <h1>Order Confirmed!</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb;">
              <p>Thank you for your order!</p>
              <p><strong>Order Number:</strong> ${orderNumber}</p>
              <p><strong>Total:</strong> ৳${orderTotal.toLocaleString()}</p>
              
              <h3>Order Items:</h3>
              <ul>
                ${items.map(item => `
                  <li>${item.name} - Qty: ${item.quantity} - ৳${item.price.toLocaleString()}</li>
                `).join('')}
              </ul>
              
              <p>We'll send you another email once your order ships.</p>
            </div>
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
              <p>© ${new Date().getFullYear()} SkyzoneBD. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, resetToken: string) {
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request';
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Click the button below to proceed:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              Reset Password
            </a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send business verification email
   */
  async sendBusinessVerificationStatus(to: string, userName: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const subject = status === 'APPROVED' ? 'Business Account Approved!' : 'Business Account Update';
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Hi ${userName},</h2>
            ${status === 'APPROVED' ? `
              <p style="color: #059669; font-weight: bold;">Your business account has been approved! 🎉</p>
              <p>You now have access to wholesale pricing and bulk order features.</p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}/products" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                Browse Products
              </a>
            ` : `
              <p style="color: #dc2626;">We're unable to approve your business account at this time.</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              <p>Please contact our support team for more information.</p>
            `}
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send a low-stock alert to admins (Amazon-style gap-closure Phase 1) —
   * previously the only way to learn a product had crossed its reorder
   * point was to manually visit the reorder-alerts admin page.
   */
  async sendLowStockAlert(to: string, product: { name: string; sku: string | null; stockQuantity: number; reorderLevel: number }) {
    const subject = product.stockQuantity === 0
      ? `OUT OF STOCK: ${product.name}`
      : `Low Stock Alert: ${product.name}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: ${product.stockQuantity === 0 ? '#dc2626' : '#d97706'};">
              ${product.stockQuantity === 0 ? 'Out of Stock' : 'Low Stock'}
            </h2>
            <p><strong>${product.name}</strong> ${product.sku ? `(SKU: ${product.sku})` : ''}</p>
            <p>Current stock: <strong>${product.stockQuantity}</strong> units (reorder level: ${product.reorderLevel})</p>
            <p>Consider creating a purchase order to restock this product.</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/admin/inventory" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              View Inventory
            </a>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send an order shipped/delivered status-update email (Amazon-style
   * gap-closure Phase 4 part 1) — previously no such email existed at
   * all; a customer had no way to learn their order shipped or arrived
   * except by manually checking the order page.
   */
  async sendOrderStatusUpdate(to: string, orderNumber: string, status: 'SHIPPED' | 'DELIVERED') {
    const subject = status === 'SHIPPED'
      ? `Your order ${orderNumber} has shipped!`
      : `Your order ${orderNumber} has been delivered`;
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
              <h1>${status === 'SHIPPED' ? 'Order Shipped' : 'Order Delivered'}</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb;">
              <p><strong>Order Number:</strong> ${orderNumber}</p>
              ${status === 'SHIPPED'
                ? '<p>Your order is on its way!</p>'
                : '<p>Your order has been delivered. We hope you\'re happy with your purchase!</p>'}
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/orders" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                View Order
              </a>
            </div>
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
              <p>© ${new Date().getFullYear()} SkyzoneBD. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send a customer their RFQ quote (Amazon-Style Wholesale Platform Gap
   * Closure — Phase 4 part 3) — previously the admin's quote was accepted
   * by the respond API and then silently discarded, so no such email
   * could ever have existed until the quote itself was actually persisted.
   */
  async sendRFQQuote(to: string, rfqNumber: string, quotedPrice: number | null, responseMessage: string) {
    const subject = `Your quote for RFQ ${rfqNumber} is ready`;
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
              <h1>Quote Ready</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb;">
              <p><strong>RFQ Number:</strong> ${rfqNumber}</p>
              ${quotedPrice != null ? `<p><strong>Quoted Price:</strong> ৳${quotedPrice.toLocaleString()} per unit</p>` : ''}
              <p><strong>Message from our team:</strong></p>
              <p style="background: white; padding: 12px; border-radius: 5px;">${responseMessage}</p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/rfq" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                View Quote
              </a>
            </div>
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
              <p>© ${new Date().getFullYear()} SkyzoneBD. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send a return-status update (Amazon-Style Wholesale Platform Gap
   * Closure — Phase 4 part 5) — approved/rejected/refunded are each their
   * own notification, since a return's state machine is independent of the
   * order's own status.
   */
  async sendReturnStatusUpdate(
    to: string,
    returnNumber: string,
    status: 'APPROVED' | 'REJECTED' | 'REFUNDED',
    details: { refundAmount?: number; rejectionReason?: string }
  ) {
    const subjectByStatus: Record<typeof status, string> = {
      APPROVED: `Your return ${returnNumber} has been approved`,
      REJECTED: `Your return ${returnNumber} could not be approved`,
      REFUNDED: `Your refund for return ${returnNumber} has been processed`,
    };
    const bodyByStatus: Record<typeof status, string> = {
      APPROVED: `<p>Your return request has been approved. We'll process your refund shortly.</p>`,
      REJECTED: `<p>We're unable to approve this return request.</p>${details.rejectionReason ? `<p><strong>Reason:</strong> ${details.rejectionReason}</p>` : ''}`,
      REFUNDED: `<p>Your refund has been processed.</p>${details.refundAmount != null ? `<p><strong>Refund Amount:</strong> ৳${details.refundAmount.toLocaleString()}</p>` : ''}`,
    };
    const subject = subjectByStatus[status];
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
              <h1>Return ${status === 'REFUNDED' ? 'Refunded' : status === 'APPROVED' ? 'Approved' : 'Update'}</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb;">
              <p><strong>Return Number:</strong> ${returnNumber}</p>
              ${bodyByStatus[status]}
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/orders" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                View Order
              </a>
            </div>
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
              <p>© ${new Date().getFullYear()} SkyzoneBD. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send data deletion confirmation email
   */
  async sendDataDeletionConfirmation(to: string, userName: string) {
    const subject = 'Data Deletion Request Received';
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Hi ${userName},</h2>
            <p>We've received your request to delete your account and associated data.</p>
            <p>Your data will be deleted within 30 days as per our privacy policy.</p>
            <p>If you didn't request this, please contact us immediately.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export for testing
export { ConsoleProvider, ResendProvider };
