import { Metadata } from 'next';
import Header from '../components/Header';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | SkyzoneBD',
  description: 'SkyzoneBD Privacy Policy - Learn how we collect, use, and protect your personal information on our website and mobile application.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-600 mb-8">Last Updated: December 3, 2025</p>

          <div className="prose prose-blue max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Welcome to SkyzoneBD (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and 
                ensuring the security of your personal information. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our website (skyzonebd.com) and 
                mobile application (collectively, the &quot;Services&quot;).
              </p>
              <p className="text-gray-700">
                By using our Services, you agree to the collection and use of information in accordance with 
                this policy. If you do not agree with our policies and practices, please do not use our Services.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Personal Information</h3>
              <p className="text-gray-700 mb-4">We collect the following personal information when you:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Register an Account:</strong> Name, email address, phone number, company name (for wholesale accounts), business registration details</li>
                <li><strong>Make a Purchase:</strong> Billing address, shipping address, payment information (processed securely through third-party payment processors)</li>
                <li><strong>Contact Us:</strong> Name, email address, phone number, and any information you provide in your message</li>
                <li><strong>Use Our Mobile App:</strong> Device information, IP address, mobile network information</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Device Information:</strong> Device type, operating system, browser type, unique device identifiers</li>
                <li><strong>Usage Data:</strong> Pages visited, time spent on pages, clicks, search queries, products viewed</li>
                <li><strong>Location Data:</strong> Approximate location based on IP address (precise location only with your permission for delivery purposes)</li>
                <li><strong>Cookies and Tracking:</strong> We use cookies and similar technologies to track activity and improve user experience</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Information from Third Parties</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Payment processors (bKash, Nagad, bank information for transaction processing)</li>
                <li>Social media platforms (if you choose to connect your account)</li>
                <li>Business verification services (for wholesale account verification)</li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use your information for the following purposes:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Order Processing:</strong> To process and fulfill your orders, send order confirmations, and provide customer support</li>
                <li><strong>Account Management:</strong> To create and maintain your account, verify your identity, and manage wholesale account applications</li>
                <li><strong>Communication:</strong> To send transactional emails (order updates, shipping notifications), marketing communications (with your consent), and respond to inquiries</li>
                <li><strong>Payment Processing:</strong> To process payments securely through our payment partners</li>
                <li><strong>Service Improvement:</strong> To analyze usage patterns, improve our Services, develop new features, and personalize your experience</li>
                <li><strong>Security:</strong> To detect and prevent fraud, abuse, and security incidents</li>
                <li><strong>Legal Compliance:</strong> To comply with legal obligations and enforce our Terms of Service</li>
                <li><strong>Marketing:</strong> To send promotional offers, product recommendations, and newsletters (you can opt-out anytime)</li>
              </ul>
            </section>

            {/* Data Sharing and Disclosure */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. How We Share Your Information</h2>
              <p className="text-gray-700 mb-4">We may share your information with:</p>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Service Providers</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Payment Processors:</strong> bKash, Nagad, banks, and other payment gateways to process transactions</li>
                <li><strong>Delivery Partners:</strong> Courier services to deliver your orders</li>
                <li><strong>Cloud Services:</strong> Hosting providers (Vercel, AWS) to store data securely</li>
                <li><strong>Analytics Providers:</strong> Google Analytics and similar services to understand usage patterns</li>
                <li><strong>Email Services:</strong> Email delivery platforms for transactional and marketing emails</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Business Transfers</h3>
              <p className="text-gray-700 mb-4">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred 
                to the acquiring entity.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">
                We may disclose your information if required by law, court order, or government request, or 
                to protect our rights, property, or safety.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.4 With Your Consent</h3>
              <p className="text-gray-700 mb-4">
                We may share your information with third parties when you give us explicit consent to do so.
              </p>
            </section>

            {/* Data Security */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational measures to protect your personal information:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Encryption:</strong> Data transmission is encrypted using SSL/TLS protocols</li>
                <li><strong>Secure Storage:</strong> Personal data is stored in secure, encrypted databases</li>
                <li><strong>Access Controls:</strong> Limited access to personal information on a need-to-know basis</li>
                <li><strong>Password Security:</strong> Passwords are hashed using industry-standard algorithms</li>
                <li><strong>Regular Audits:</strong> We conduct regular security assessments and updates</li>
              </ul>
              <p className="text-gray-700">
                However, no method of transmission over the internet or electronic storage is 100% secure. 
                While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            {/* Data Retention */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your personal information for as long as necessary to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Provide our Services and fulfill orders</li>
                <li>Comply with legal, accounting, or reporting requirements</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Prevent fraud and abuse</li>
              </ul>
              <p className="text-gray-700">
                When your information is no longer needed, we will securely delete or anonymize it. You can 
                request deletion of your account at any time by contacting us.
              </p>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights and Choices</h2>
              <p className="text-gray-700 mb-4">You have the following rights regarding your personal information:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and personal information</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails via the link in the email or account settings</li>
                <li><strong>Data Portability:</strong> Request a copy of your data in a machine-readable format</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where consent was the legal basis</li>
              </ul>
              <p className="text-gray-700">
                To exercise these rights, please contact us at <a href="mailto:privacy@skyzonebd.com" className="text-blue-600 hover:underline">privacy@skyzonebd.com</a>
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children&apos;s Privacy</h2>
              <p className="text-gray-700">
                Our Services are not intended for children under 13 years of age. We do not knowingly collect 
                personal information from children under 13. If you believe we have collected information from 
                a child under 13, please contact us immediately, and we will delete such information.
              </p>
            </section>

            {/* International Data Transfers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700">
                Your information may be transferred to and processed in countries other than Bangladesh. 
                We ensure appropriate safeguards are in place to protect your information in accordance with 
                this Privacy Policy and applicable laws.
              </p>
            </section>

            {/* Cookies Policy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Cookies and Tracking Technologies</h2>
              <p className="text-gray-700 mb-4">We use cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for basic site functionality (login, cart)</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our Services</li>
                <li><strong>Marketing Cookies:</strong> Track visits across websites for advertising purposes</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              </ul>
              <p className="text-gray-700">
                You can control cookies through your browser settings. However, disabling cookies may affect 
                the functionality of our Services.
              </p>
            </section>

            {/* Third-Party Links */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Third-Party Links</h2>
              <p className="text-gray-700">
                Our Services may contain links to third-party websites or services. We are not responsible for 
                the privacy practices of these third parties. We encourage you to review their privacy policies 
                before providing any personal information.
              </p>
            </section>

            {/* Mobile App Specific */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Mobile Application</h2>
              <p className="text-gray-700 mb-4">
                Our Android mobile application may access the following device features (with your permission):
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Camera:</strong> To take photos of products for upload or reviews</li>
                <li><strong>Storage:</strong> To save and upload product images</li>
                <li><strong>Location:</strong> To provide accurate delivery addresses and local product recommendations</li>
                <li><strong>Notifications:</strong> To send order updates and promotional messages</li>
                <li><strong>Internet Access:</strong> Required to connect to our services</li>
              </ul>
              <p className="text-gray-700">
                You can manage these permissions in your device settings at any time.
              </p>
            </section>

            {/* Changes to Policy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to This Privacy Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of significant changes 
                by posting the new policy on this page and updating the &quot;Last Updated&quot; date. For material 
                changes, we may also send an email notification. Your continued use of our Services after 
                changes become effective constitutes acceptance of the revised policy.
              </p>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, 
                please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2"><strong>SkyzoneBD</strong></p>
                <p className="text-gray-700 mb-2">Email: <a href="mailto:privacy@skyzonebd.com" className="text-blue-600 hover:underline">privacy@skyzonebd.com</a></p>
                <p className="text-gray-700 mb-2">Email: <a href="mailto:support@skyzonebd.com" className="text-blue-600 hover:underline">support@skyzonebd.com</a></p>
                <p className="text-gray-700 mb-2">Phone: +880-1700-000000</p>
                <p className="text-gray-700">Address: Dhaka, Bangladesh</p>
              </div>
            </section>

            {/* Google Play Compliance */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Google Play Store Compliance</h2>
              <p className="text-gray-700 mb-4">
                Our Android application complies with Google Play&apos;s Developer Program Policies, including:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Transparency in data collection and usage</li>
                <li>Secure transmission and storage of personal information</li>
                <li>Prominent disclosure of data practices</li>
                <li>User consent for sensitive permissions</li>
                <li>Compliance with applicable data protection laws</li>
              </ul>
            </section>

            {/* Navigation Links */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-gray-700 mb-4">Related Policies:</p>
              <div className="flex flex-wrap gap-4">
                <Link href="/terms-of-service" className="text-blue-600 hover:underline">
                  Terms of Service
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
