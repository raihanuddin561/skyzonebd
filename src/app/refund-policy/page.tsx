import { Metadata } from 'next';
import Header from '../components/Header';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Refund & Return Policy | SkyzoneBD',
  description: 'SkyzoneBD Refund and Return Policy - Learn about our 7-day return policy, refund process, and conditions.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Refund & Return Policy</h1>
          <p className="text-sm text-gray-600 mb-8">Last Updated: December 3, 2025</p>

          <div className="prose prose-blue max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Return Policy Overview</h2>
              <p className="text-gray-700 mb-4">
                At SkyzoneBD, we want you to be completely satisfied with your purchase. If you&apos;re not happy with 
                your order, we offer a 7-day return policy for most products, subject to the conditions outlined below.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Return Eligibility</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Eligible Returns</h3>
              <p className="text-gray-700 mb-4">You may return a product if:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>The product is defective or damaged upon arrival</li>
                <li>You received the wrong product or incorrect item</li>
                <li>The product does not match the description on our website</li>
                <li>The product has manufacturing defects</li>
                <li>Within 7 days of delivery date</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Return Conditions</h3>
              <p className="text-gray-700 mb-4">To be eligible for return, products must meet these conditions:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Unused and Unworn:</strong> Products must be in original, unused condition</li>
                <li><strong>Original Packaging:</strong> Items must be in original packaging with all tags attached</li>
                <li><strong>Complete Set:</strong> All accessories, manuals, and free gifts must be included</li>
                <li><strong>Proof of Purchase:</strong> Valid order number or invoice required</li>
                <li><strong>Return Window:</strong> Requested within 7 days from delivery date</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Non-Returnable Items</h3>
              <p className="text-gray-700 mb-4">The following items cannot be returned:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Perishable goods (food items, flowers, etc.)</li>
                <li>Personalized or customized products</li>
                <li>Intimate or sanitary goods (underwear, cosmetics, etc.)</li>
                <li>Opened software, digital downloads, or gift cards</li>
                <li>Products without original packaging or tags</li>
                <li>Products damaged due to misuse or neglect</li>
                <li>Final sale or clearance items (marked as non-returnable)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How to Request a Return</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Step 1: Contact Customer Support</h3>
              <p className="text-gray-700 mb-4">Within 7 days of receiving your order, contact us:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Email: <a href="mailto:support@skyzonebd.com" className="text-blue-600 hover:underline">support@skyzonebd.com</a></li>
                <li>Phone: +880-1700-000000</li>
                <li>Mobile App: Go to Orders → Select Order → Request Return</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Step 2: Provide Required Information</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Order number</li>
                <li>Product name and SKU</li>
                <li>Reason for return</li>
                <li>Photos of the product and packaging (if defective or damaged)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Step 3: Return Authorization</h3>
              <p className="text-gray-700 mb-4">
                Our team will review your request and provide a Return Authorization (RA) number within 24-48 hours.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Step 4: Ship the Product Back</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Pack the product securely in original packaging</li>
                <li>Include the RA number on the package</li>
                <li>Ship to the address provided by our support team</li>
                <li>Keep the tracking number for your records</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Return Shipping Costs</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Our Responsibility</h3>
              <p className="text-gray-700 mb-4">We cover return shipping costs if:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Product is defective or damaged</li>
                <li>Wrong item was sent</li>
                <li>Product does not match description</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Customer Responsibility</h3>
              <p className="text-gray-700 mb-4">You are responsible for return shipping if:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>You changed your mind</li>
                <li>You ordered the wrong size or color</li>
                <li>Personal preference or buyer&apos;s remorse</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Refund Process</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Inspection</h3>
              <p className="text-gray-700 mb-4">
                Once we receive your returned item, our team will inspect it to verify it meets return conditions. 
                This process typically takes 2-3 business days.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Refund Approval</h3>
              <p className="text-gray-700 mb-4">
                If your return is approved, we will notify you via email and initiate the refund to your original 
                payment method.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 Refund Timeline</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>bKash/Nagad:</strong> 3-5 business days</li>
                <li><strong>Bank Transfer:</strong> 7-10 business days</li>
                <li><strong>Cash on Delivery:</strong> Bank transfer or mobile payment within 7-10 business days</li>
                <li><strong>Store Credit:</strong> Instant (if you choose this option)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.4 Partial Refunds</h3>
              <p className="text-gray-700 mb-4">Partial refunds may be granted in these cases:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Item shows signs of use</li>
                <li>Missing parts or accessories</li>
                <li>Damaged packaging (not due to shipping)</li>
                <li>Product returned more than 7 days after delivery</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Exchanges</h2>
              <p className="text-gray-700 mb-4">
                We currently do not offer direct exchanges. If you want a different size, color, or product:
              </p>
              <ol className="list-decimal pl-6 mb-4 text-gray-700 space-y-2">
                <li>Return the original product following our return process</li>
                <li>Place a new order for the desired item</li>
                <li>Once your return is processed, you&apos;ll receive a refund</li>
              </ol>
              <p className="text-gray-700">
                This ensures faster processing and avoids stock availability issues.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Wholesale Orders</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 Bulk Order Returns</h3>
              <p className="text-gray-700 mb-4">
                For wholesale or bulk orders (10+ units), special return conditions apply:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Returns must be requested within 7 days</li>
                <li>Restocking fee may apply (10-20% of order value)</li>
                <li>All items must be in resalable condition</li>
                <li>Original packaging and documentation required</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 Defective Bulk Orders</h3>
              <p className="text-gray-700">
                If a significant portion of a bulk order is defective (more than 5%), contact us immediately. 
                We will arrange pickup and full refund or replacement at no cost to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Damaged or Defective Items</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.1 Reporting Damage</h3>
              <p className="text-gray-700 mb-4">
                If you receive a damaged or defective product:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Report within 24 hours of delivery</li>
                <li>Take clear photos of damage (product and packaging)</li>
                <li>Do not discard the packaging</li>
                <li>Contact customer support immediately</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.2 Resolution Options</h3>
              <p className="text-gray-700 mb-4">For damaged or defective items, we offer:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Full Refund:</strong> Complete refund to original payment method</li>
                <li><strong>Replacement:</strong> Send a new product at no charge</li>
                <li><strong>Repair:</strong> Free repair for items under warranty</li>
                <li><strong>Store Credit:</strong> Credit for future purchases (with bonus credit)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Late or Missing Refunds</h2>
              <p className="text-gray-700 mb-4">
                If you haven&apos;t received your refund within the stated timeline:
              </p>
              <ol className="list-decimal pl-6 mb-4 text-gray-700 space-y-2">
                <li>Check your bank account or mobile wallet again</li>
                <li>Contact your payment provider (processing delays can occur)</li>
                <li>Contact us at <a href="mailto:refunds@skyzonebd.com" className="text-blue-600 hover:underline">refunds@skyzonebd.com</a> with your order number</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Cancellations</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">10.1 Before Shipment</h3>
              <p className="text-gray-700 mb-4">
                You can cancel your order free of charge before it ships. Contact customer support immediately 
                with your order number. Full refund will be processed within 3-5 business days.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">10.2 After Shipment</h3>
              <p className="text-gray-700">
                Once shipped, orders cannot be cancelled. You must wait to receive the product and then follow 
                our return process if needed.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Warranty Claims</h2>
              <p className="text-gray-700 mb-4">
                For products with manufacturer warranties:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Warranty period varies by product (check product details)</li>
                <li>Valid warranty card must be provided</li>
                <li>Damage due to misuse is not covered</li>
                <li>Contact us for warranty service coordination</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                For return or refund inquiries:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2"><strong>Returns Department</strong></p>
                <p className="text-gray-700 mb-2">Email: <a href="mailto:returns@skyzonebd.com" className="text-blue-600 hover:underline">returns@skyzonebd.com</a></p>
                <p className="text-gray-700 mb-2">Email: <a href="mailto:support@skyzonebd.com" className="text-blue-600 hover:underline">support@skyzonebd.com</a></p>
                <p className="text-gray-700 mb-2">Phone: +880-1700-000000</p>
                <p className="text-gray-700">Hours: 9 AM - 6 PM (Saturday - Thursday)</p>
              </div>
            </section>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-gray-700 mb-4">Related Policies:</p>
              <div className="flex flex-wrap gap-4">
                <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
                <Link href="/terms-of-service" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>
                <Link href="/shipping-policy" className="text-blue-600 hover:underline">
                  Shipping Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
