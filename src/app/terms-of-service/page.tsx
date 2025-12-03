import { Metadata } from 'next';
import Header from '../components/Header';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | SkyzoneBD',
  description: 'SkyzoneBD Terms of Service - Rules and guidelines for using our e-commerce platform and mobile application.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-sm text-gray-600 mb-8">Last Updated: December 3, 2025</p>

          <div className="prose prose-blue max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-700 mb-4">
                Welcome to SkyzoneBD. These Terms of Service (&quot;Terms&quot;) govern your access to and use of 
                our website (skyzonebd.com) and mobile application (collectively, the &quot;Services&quot;). By accessing 
                or using our Services, you agree to be bound by these Terms and our Privacy Policy.
              </p>
              <p className="text-gray-700">
                If you do not agree to these Terms, you must not access or use our Services. We reserve the 
                right to modify these Terms at any time, and your continued use constitutes acceptance of any changes.
              </p>
            </section>

            {/* Eligibility */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Eligibility</h2>
              <p className="text-gray-700 mb-4">To use our Services, you must:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Be at least 18 years old or the age of majority in your jurisdiction</li>
                <li>Have the legal capacity to enter into binding contracts</li>
                <li>Not be prohibited from using our Services under applicable laws</li>
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain the security of your account credentials</li>
              </ul>
              <p className="text-gray-700">
                By creating an account, you represent and warrant that you meet these requirements.
              </p>
            </section>

            {/* Account Registration */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Account Registration</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Account Types</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Retail Account:</strong> For individual customers purchasing products for personal use</li>
                <li><strong>Wholesale Account:</strong> For businesses purchasing products in bulk for resale or business use</li>
                <li><strong>Guest Checkout:</strong> Limited functionality without account registration</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Account Security</h3>
              <p className="text-gray-700 mb-4">You are responsible for:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Maintaining the confidentiality of your password and account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use or security breach</li>
                <li>Ensuring your account information is accurate and up-to-date</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Wholesale Account Verification</h3>
              <p className="text-gray-700">
                Wholesale accounts require business verification, including valid business registration documents. 
                We reserve the right to approve or reject wholesale applications at our discretion.
              </p>
            </section>

            {/* Use of Services */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Use of Services</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Permitted Use</h3>
              <p className="text-gray-700 mb-4">You may use our Services to:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Browse and search for products</li>
                <li>Purchase products for lawful purposes</li>
                <li>Manage your account and orders</li>
                <li>Contact customer support</li>
                <li>Access promotional content and newsletters (with consent)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Prohibited Activities</h3>
              <p className="text-gray-700 mb-4">You agree NOT to:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Scrape, crawl, or automatically extract data without permission</li>
                <li>Impersonate another person or entity</li>
                <li>Engage in fraudulent activities or payment disputes</li>
                <li>Resell products obtained through fraud or abuse</li>
                <li>Use the Services for illegal purposes</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Interfere with the proper functioning of the Services</li>
              </ul>
            </section>

            {/* Products and Pricing */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Products and Pricing</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Product Information</h3>
              <p className="text-gray-700 mb-4">
                We strive to provide accurate product descriptions, images, and specifications. However, we do not 
                warrant that product information is complete, reliable, current, or error-free. Product colors may 
                vary slightly from images due to display settings.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Pricing</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Retail Pricing:</strong> Standard prices for individual customers</li>
                <li><strong>Wholesale Pricing:</strong> Tiered pricing based on order quantity (verified wholesale accounts only)</li>
                <li><strong>Price Changes:</strong> We reserve the right to change prices at any time without notice</li>
                <li><strong>Pricing Errors:</strong> If a product is listed at an incorrect price due to error, we may cancel the order and refund you</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 Product Availability</h3>
              <p className="text-gray-700">
                Product availability is subject to change. We reserve the right to limit quantities, discontinue 
                products, or refuse orders at our discretion.
              </p>
            </section>

            {/* Orders and Payment */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Orders and Payment</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Order Placement</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>All orders are subject to acceptance and availability</li>
                <li>Minimum order quantities (MOQ) apply to certain products and wholesale orders</li>
                <li>We reserve the right to refuse or cancel any order for any reason</li>
                <li>Order confirmation does not guarantee acceptance</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 Payment Methods</h3>
              <p className="text-gray-700 mb-4">We accept the following payment methods:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>bKash</li>
                <li>Nagad</li>
                <li>Bank Transfer</li>
                <li>Cash on Delivery (COD) - subject to order value limits</li>
                <li>Other digital payment methods as available</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.3 Payment Processing</h3>
              <p className="text-gray-700 mb-4">
                Payments are processed through secure third-party payment gateways. We do not store complete 
                payment card information on our servers. You authorize us to charge the provided payment method 
                for the total order amount, including taxes and shipping fees.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.4 Order Cancellation</h3>
              <p className="text-gray-700">
                You may cancel orders before shipment. Once shipped, cancellation is not possible, but you may 
                request a return according to our Return Policy. We reserve the right to cancel orders for 
                fraud prevention, pricing errors, or product unavailability.
              </p>
            </section>

            {/* Shipping and Delivery */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Shipping and Delivery</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Delivery Times:</strong> Estimated delivery times are not guaranteed</li>
                <li><strong>Shipping Costs:</strong> Calculated based on location, order value, and weight</li>
                <li><strong>Free Shipping:</strong> Available for bulk orders and minimum order values</li>
                <li><strong>Delivery Areas:</strong> We deliver within Bangladesh; some remote areas may have restrictions</li>
                <li><strong>Risk of Loss:</strong> Risk of loss and title pass to you upon delivery to the carrier</li>
              </ul>
              <p className="text-gray-700">
                For detailed shipping information, please see our <Link href="/shipping-policy" className="text-blue-600 hover:underline">Shipping Policy</Link>.
              </p>
            </section>

            {/* Returns and Refunds */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Returns and Refunds</h2>
              <p className="text-gray-700 mb-4">Our return policy includes:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Return Window:</strong> 7 days from delivery for defective or incorrect items</li>
                <li><strong>Condition:</strong> Products must be unused, in original packaging, with tags attached</li>
                <li><strong>Non-Returnable Items:</strong> Perishable goods, personalized items, hygiene products</li>
                <li><strong>Refund Method:</strong> Original payment method or store credit</li>
                <li><strong>Processing Time:</strong> 7-14 business days after receiving returned item</li>
              </ul>
              <p className="text-gray-700">
                For complete details, see our <Link href="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link>.
              </p>
            </section>

            {/* Intellectual Property */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Intellectual Property Rights</h2>
              <p className="text-gray-700 mb-4">
                All content on our Services, including text, graphics, logos, images, software, and compilation, 
                is the property of SkyzoneBD or its licensors and is protected by copyright, trademark, and other 
                intellectual property laws.
              </p>
              <p className="text-gray-700 mb-4">You may not:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Copy, modify, distribute, or reproduce any content without permission</li>
                <li>Use our trademarks, logos, or brand names without authorization</li>
                <li>Create derivative works based on our Services</li>
                <li>Reverse engineer or decompile any software or technology</li>
              </ul>
            </section>

            {/* User Content */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. User-Generated Content</h2>
              <p className="text-gray-700 mb-4">
                If you submit content (reviews, photos, comments), you grant us a worldwide, non-exclusive, 
                royalty-free license to use, reproduce, modify, and display such content for business purposes.
              </p>
              <p className="text-gray-700 mb-4">You represent that:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>You own or have rights to the content you submit</li>
                <li>Your content does not infringe on third-party rights</li>
                <li>Your content complies with these Terms and applicable laws</li>
              </ul>
              <p className="text-gray-700">
                We reserve the right to remove any content that violates these Terms or is otherwise objectionable.
              </p>
            </section>

            {/* Disclaimers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Disclaimers</h2>
              <p className="text-gray-700 mb-4">
                OUR SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
                EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR 
                A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p className="text-gray-700 mb-4">WE DO NOT WARRANT THAT:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>The Services will be uninterrupted, secure, or error-free</li>
                <li>Product information is accurate, complete, or current</li>
                <li>Defects will be corrected</li>
                <li>The Services are free of viruses or harmful components</li>
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SKYZONEBD SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, 
                DATA, OR USE, ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICES.
              </p>
              <p className="text-gray-700">
                OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SPECIFIC PRODUCT OR SERVICE 
                GIVING RISE TO THE CLAIM, OR BDT 1,000, WHICHEVER IS LESS.
              </p>
            </section>

            {/* Indemnification */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Indemnification</h2>
              <p className="text-gray-700">
                You agree to indemnify, defend, and hold harmless SkyzoneBD, its affiliates, officers, directors, 
                employees, and agents from any claims, liabilities, damages, losses, costs, or expenses (including 
                reasonable attorneys&apos; fees) arising from:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Your violation of these Terms</li>
                <li>Your use or misuse of the Services</li>
                <li>Your violation of any third-party rights</li>
                <li>Any content you submit or transmit</li>
              </ul>
            </section>

            {/* Dispute Resolution */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Dispute Resolution</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">14.1 Informal Resolution</h3>
              <p className="text-gray-700 mb-4">
                Before filing a formal claim, please contact us at <a href="mailto:support@skyzonebd.com" className="text-blue-600 hover:underline">support@skyzonebd.com</a> to 
                resolve the issue informally.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">14.2 Governing Law</h3>
              <p className="text-gray-700 mb-4">
                These Terms are governed by the laws of Bangladesh, without regard to conflict of law principles.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">14.3 Jurisdiction</h3>
              <p className="text-gray-700">
                Any disputes shall be resolved exclusively in the courts of Dhaka, Bangladesh. You consent to 
                the personal jurisdiction of such courts.
              </p>
            </section>

            {/* Termination */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Termination</h2>
              <p className="text-gray-700 mb-4">
                We may suspend or terminate your account and access to the Services at any time, with or without 
                cause or notice, for violations of these Terms or other reasons at our discretion.
              </p>
              <p className="text-gray-700 mb-4">You may terminate your account by contacting customer support.</p>
              <p className="text-gray-700">
                Upon termination, your right to use the Services will immediately cease. Provisions that by their 
                nature should survive termination shall survive, including ownership, warranty disclaimers, and 
                limitations of liability.
              </p>
            </section>

            {/* Mobile Application */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Mobile Application</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">16.1 License Grant</h3>
              <p className="text-gray-700 mb-4">
                We grant you a limited, non-exclusive, non-transferable, revocable license to use our Android 
                mobile application for personal, non-commercial purposes.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">16.2 App Permissions</h3>
              <p className="text-gray-700 mb-4">The app may request permissions for:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Camera: Product photos and profile pictures</li>
                <li>Storage: Save and upload images</li>
                <li>Location: Delivery address and local recommendations</li>
                <li>Notifications: Order updates and promotions</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">16.3 Updates</h3>
              <p className="text-gray-700">
                We may release updates to improve functionality and security. You agree to download and install 
                updates as they become available.
              </p>
            </section>

            {/* General Provisions */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. General Provisions</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">17.1 Entire Agreement</h3>
              <p className="text-gray-700 mb-4">
                These Terms, together with our Privacy Policy and other referenced policies, constitute the entire 
                agreement between you and SkyzoneBD.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">17.2 Amendments</h3>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these Terms at any time. Continued use after changes constitutes 
                acceptance.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">17.3 Severability</h3>
              <p className="text-gray-700 mb-4">
                If any provision is found invalid or unenforceable, the remaining provisions shall remain in effect.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">17.4 Waiver</h3>
              <p className="text-gray-700 mb-4">
                Our failure to enforce any right or provision shall not constitute a waiver of such right or provision.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">17.5 Assignment</h3>
              <p className="text-gray-700">
                You may not assign or transfer these Terms without our consent. We may assign our rights and 
                obligations without restriction.
              </p>
            </section>

            {/* Contact */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">18. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For questions about these Terms, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2"><strong>SkyzoneBD</strong></p>
                <p className="text-gray-700 mb-2">Email: <a href="mailto:support@skyzonebd.com" className="text-blue-600 hover:underline">support@skyzonebd.com</a></p>
                <p className="text-gray-700 mb-2">Email: <a href="mailto:legal@skyzonebd.com" className="text-blue-600 hover:underline">legal@skyzonebd.com</a></p>
                <p className="text-gray-700 mb-2">Phone: +880-1700-000000</p>
                <p className="text-gray-700">Address: Dhaka, Bangladesh</p>
              </div>
            </section>

            {/* Navigation */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-gray-700 mb-4">Related Policies:</p>
              <div className="flex flex-wrap gap-4">
                <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
                <Link href="/refund-policy" className="text-blue-600 hover:underline">
                  Refund Policy
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
