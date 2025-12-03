import { Metadata } from 'next';
import Header from '../components/Header';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy | SkyzoneBD',
  description: 'SkyzoneBD Shipping and Delivery Policy - Learn about shipping costs, delivery times, and coverage areas across Bangladesh.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Shipping & Delivery Policy</h1>
          <p className="text-sm text-gray-600 mb-8">Last Updated: December 3, 2025</p>

          <div className="prose prose-blue max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Delivery Coverage</h2>
              <p className="text-gray-700 mb-4">
                We deliver products across Bangladesh to ensure you receive your orders wherever you are located.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">1.1 Major Cities</h3>
              <p className="text-gray-700 mb-4">Fast delivery available in:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Dhaka (Dhaka Metro, Gazipur, Narayanganj, Savar)</li>
                <li>Chittagong</li>
                <li>Sylhet</li>
                <li>Rajshahi</li>
                <li>Khulna</li>
                <li>Barisal</li>
                <li>Rangpur</li>
                <li>Mymensingh</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">1.2 Other Areas</h3>
              <p className="text-gray-700">
                We also deliver to districts and sub-districts across Bangladesh. Some remote areas may have 
                extended delivery times or additional charges.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Delivery Times</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Standard Delivery</h3>
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <table className="w-full text-gray-700">
                  <thead>
                    <tr className="border-b border-blue-200">
                      <th className="text-left py-2">Location</th>
                      <th className="text-left py-2">Delivery Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-blue-100">
                      <td className="py-2">Inside Dhaka</td>
                      <td className="py-2">1-3 business days</td>
                    </tr>
                    <tr className="border-b border-blue-100">
                      <td className="py-2">Dhaka Suburbs</td>
                      <td className="py-2">2-4 business days</td>
                    </tr>
                    <tr className="border-b border-blue-100">
                      <td className="py-2">Major Cities</td>
                      <td className="py-2">3-5 business days</td>
                    </tr>
                    <tr>
                      <td className="py-2">Other Areas</td>
                      <td className="py-2">5-7 business days</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Express Delivery</h3>
              <p className="text-gray-700 mb-4">Available for select areas:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Inside Dhaka:</strong> Same-day or next-day delivery (order before 2 PM)</li>
                <li><strong>Major Cities:</strong> 1-2 business days</li>
                <li><strong>Additional Charge:</strong> BDT 100-200 depending on location</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Bulk/Wholesale Orders</h3>
              <p className="text-gray-700">
                Large wholesale orders may require 2-3 additional days for processing and packaging. We&apos;ll 
                coordinate with you for convenient delivery scheduling.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Shipping Costs</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Standard Shipping Rates</h3>
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <table className="w-full text-gray-700">
                  <thead>
                    <tr className="border-b border-green-200">
                      <th className="text-left py-2">Location</th>
                      <th className="text-left py-2">Shipping Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-green-100">
                      <td className="py-2">Inside Dhaka</td>
                      <td className="py-2">BDT 60</td>
                    </tr>
                    <tr className="border-b border-green-100">
                      <td className="py-2">Dhaka Suburbs</td>
                      <td className="py-2">BDT 100</td>
                    </tr>
                    <tr className="border-b border-green-100">
                      <td className="py-2">Major Cities</td>
                      <td className="py-2">BDT 120</td>
                    </tr>
                    <tr>
                      <td className="py-2">Other Areas</td>
                      <td className="py-2">BDT 150</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Free Shipping</h3>
              <p className="text-gray-700 mb-4">Enjoy free shipping when:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Order Value:</strong> Orders above BDT 2,000 (inside Dhaka)</li>
                <li><strong>Order Value:</strong> Orders above BDT 3,000 (outside Dhaka)</li>
                <li><strong>Wholesale Orders:</strong> All wholesale orders with minimum order quantity (MOQ)</li>
                <li><strong>Promotional Campaigns:</strong> During special promotions and sales events</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Weight-Based Charges</h3>
              <p className="text-gray-700">
                For heavy or bulky items (over 5kg), additional shipping charges may apply based on weight 
                and dimensions. You&apos;ll see the exact cost at checkout.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Order Processing</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Processing Time</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Standard Orders:</strong> 1-2 business days</li>
                <li><strong>Wholesale Orders:</strong> 2-3 business days</li>
                <li><strong>Custom/Pre-order Items:</strong> As specified on product page</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Order Confirmation</h3>
              <p className="text-gray-700 mb-4">After placing an order, you will receive:</p>
              <ol className="list-decimal pl-6 mb-4 text-gray-700 space-y-2">
                <li>Order confirmation email within 30 minutes</li>
                <li>SMS confirmation with order number</li>
                <li>Processing update when order is packed</li>
                <li>Shipping notification with tracking number</li>
                <li>Delivery confirmation after successful delivery</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Order Tracking</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 How to Track</h3>
              <p className="text-gray-700 mb-4">Track your order using:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Website:</strong> Login → My Orders → Track Order</li>
                <li><strong>Mobile App:</strong> Orders section with real-time updates</li>
                <li><strong>Email:</strong> Click tracking link in shipping notification</li>
                <li><strong>SMS:</strong> Reply to tracking SMS for status update</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Tracking Information</h3>
              <p className="text-gray-700">
                Tracking numbers are provided once your order ships. It may take 24 hours for tracking 
                information to update in the courier system.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Delivery Process</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Delivery Attempt</h3>
              <p className="text-gray-700 mb-4">Our delivery partner will:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Contact you 30 minutes before delivery (when possible)</li>
                <li>Make up to 3 delivery attempts</li>
                <li>Leave a notice if you&apos;re unavailable</li>
                <li>Coordinate re-delivery at your convenience</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 Receiving Your Order</h3>
              <p className="text-gray-700 mb-4">Upon delivery:</p>
              <ol className="list-decimal pl-6 mb-4 text-gray-700 space-y-2">
                <li>Verify the package is sealed and undamaged</li>
                <li>Check the order number matches your order</li>
                <li>For COD orders, make payment to the delivery person</li>
                <li>Sign the delivery confirmation</li>
                <li>Inspect items immediately and report any issues within 24 hours</li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.3 Contactless Delivery</h3>
              <p className="text-gray-700">
                For safety, we offer contactless delivery. The package will be left at your doorstep with 
                photo confirmation. Add delivery instructions at checkout.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cash on Delivery (COD)</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 COD Availability</h3>
              <p className="text-gray-700 mb-4">Cash on Delivery is available:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>For orders up to BDT 10,000</li>
                <li>For verified customer accounts</li>
                <li>In all delivery areas across Bangladesh</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 COD Charges</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Inside Dhaka:</strong> BDT 20 COD fee</li>
                <li><strong>Outside Dhaka:</strong> BDT 30 COD fee</li>
                <li><strong>Orders above BDT 5,000:</strong> No COD fee</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.3 Payment Options</h3>
              <p className="text-gray-700">
                You can pay the delivery person with cash or mobile payment (bKash, Nagad) during delivery.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Failed Deliveries</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.1 Reasons for Failure</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Recipient unavailable</li>
                <li>Incorrect or incomplete address</li>
                <li>Phone number not reachable</li>
                <li>Customer refused delivery</li>
                <li>Area inaccessible</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.2 Re-delivery</h3>
              <p className="text-gray-700 mb-4">
                If delivery fails, we will:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Contact you to reschedule delivery</li>
                <li>Attempt delivery up to 3 times</li>
                <li>Return item to warehouse if all attempts fail</li>
                <li>Charge return shipping fee if order is returned</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.3 Package Hold</h3>
              <p className="text-gray-700">
                You can request to hold your package at the nearest courier office for pickup. Contact 
                customer support to arrange.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Shipping</h2>
              <p className="text-gray-700">
                Currently, we only ship within Bangladesh. International shipping is not available at this time. 
                We are working to expand our delivery network in the future.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Damaged or Lost Packages</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">10.1 Damaged Packages</h3>
              <p className="text-gray-700 mb-4">
                If your package arrives damaged:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Do not accept the delivery if package is visibly damaged</li>
                <li>Take photos of the damage immediately</li>
                <li>Contact us within 24 hours</li>
                <li>We will arrange replacement or refund</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">10.2 Lost Packages</h3>
              <p className="text-gray-700">
                If your package is lost in transit, contact us immediately. We will investigate with our 
                courier partner and either resend the order or provide a full refund within 7-10 business days.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Holidays and Weekends</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Friday:</strong> Limited delivery services</li>
                <li><strong>Public Holidays:</strong> No deliveries (Eid, Victory Day, etc.)</li>
                <li><strong>Order Processing:</strong> May be delayed during holidays</li>
                <li><strong>Customer Support:</strong> Available Saturday to Thursday</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Special Delivery Instructions</h2>
              <p className="text-gray-700 mb-4">
                You can add special instructions at checkout:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Preferred delivery time window</li>
                <li>Gate code or building access instructions</li>
                <li>Contactless delivery preference</li>
                <li>Leave with security/neighbor</li>
                <li>Call before delivery</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Delivery Support</h2>
              <p className="text-gray-700 mb-4">
                For shipping and delivery inquiries:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2"><strong>Shipping Department</strong></p>
                <p className="text-gray-700 mb-2">Email: <a href="mailto:delivery@skyzonebd.com" className="text-blue-600 hover:underline">delivery@skyzonebd.com</a></p>
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
                <Link href="/refund-policy" className="text-blue-600 hover:underline">
                  Refund Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
