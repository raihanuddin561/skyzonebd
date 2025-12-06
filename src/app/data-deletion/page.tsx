import { Metadata } from 'next';
import Header from '../components/Header';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Data Deletion Request | SkyzoneBD',
  description: 'Request deletion of your account and personal data from SkyzoneBD platform.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Data Deletion Request</h1>
          <p className="text-sm text-gray-600 mb-8">Request removal of your personal data from SkyzoneBD</p>

          <div className="prose prose-blue max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Account & Data Deletion</h2>
              <p className="text-gray-700 mb-4">
                We respect your right to privacy and data control. If you wish to delete your SkyzoneBD account 
                and all associated personal data, you can submit a deletion request using the form below.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Account deletion is permanent and cannot be undone. All your data, 
                  including order history, saved addresses, and preferences will be permanently removed.
                </p>
              </div>
            </section>

            {/* What Gets Deleted */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">What Data Will Be Deleted?</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Account Information:</strong> Name, email, phone number, password</li>
                <li><strong>Profile Data:</strong> Profile picture, preferences, settings</li>
                <li><strong>Business Information:</strong> Company details (for wholesale accounts)</li>
                <li><strong>Addresses:</strong> Shipping and billing addresses</li>
                <li><strong>Order History:</strong> Past orders and transaction details</li>
                <li><strong>Payment Information:</strong> Saved payment methods</li>
                <li><strong>Communications:</strong> Email correspondence and support tickets</li>
                <li><strong>App Data:</strong> Mobile app data and preferences</li>
              </ul>
            </section>

            {/* What Gets Retained */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">What Data We Must Keep?</h2>
              <p className="text-gray-700 mb-4">
                For legal, tax, and fraud prevention purposes, we may retain some data in anonymized form:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Transaction Records:</strong> Required for tax compliance (7 years, anonymized)</li>
                <li><strong>Legal Documents:</strong> Invoices and receipts for accounting purposes</li>
                <li><strong>Fraud Prevention:</strong> Anonymized logs to prevent abuse</li>
                <li><strong>Dispute Resolution:</strong> Records related to ongoing legal matters</li>
              </ul>
              <p className="text-gray-700 text-sm">
                All retained data will be completely anonymized and not linked to your identity.
              </p>
            </section>

            {/* Request Form Info */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">How to Request Deletion</h2>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Option 1: Online Request Form (Recommended)</h3>
                <p className="text-gray-700 mb-4">
                  Submit your deletion request using our secure online form. This is the fastest way to process your request.
                </p>
                <Link 
                  href="/data-deletion/request" 
                  className="inline-block px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                >
                  Submit Deletion Request
                </Link>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Option 2: Email Request</h3>
                <p className="text-gray-700 mb-4">
                  Send an email to our support team with your deletion request:
                </p>
                <div className="mb-4">
                  <p className="text-gray-700 mb-2"><strong>Email To:</strong></p>
                  <a 
                    href="mailto:privacy@skyzonebd.com?subject=Data%20Deletion%20Request&body=I%20would%20like%20to%20request%20the%20deletion%20of%20my%20SkyzoneBD%20account%20and%20all%20associated%20personal%20data.%0A%0AAccount%20Email%3A%20%5Byour-email%40example.com%5D%0APhone%20Number%3A%20%5Byour-phone%5D%0AReason%20(optional)%3A%20%5Byour-reason%5D"
                    className="text-blue-600 hover:underline text-lg"
                  >
                    privacy@skyzonebd.com
                  </a>
                </div>
                <div className="bg-white p-4 rounded border">
                  <p className="text-sm text-gray-700 mb-2"><strong>Email Template:</strong></p>
                  <div className="text-sm text-gray-600 font-mono bg-gray-50 p-3 rounded">
                    <p><strong>Subject:</strong> Data Deletion Request</p>
                    <p className="mt-2"><strong>Body:</strong></p>
                    <p className="mt-1">I would like to request the deletion of my SkyzoneBD account and all associated personal data.</p>
                    <p className="mt-2">Account Email: [your-email@example.com]</p>
                    <p>Phone Number: [your-phone]</p>
                    <p>Reason (optional): [your-reason]</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Timeline */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Deletion Timeline</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Request Submission</h3>
                    <p className="text-gray-600 text-sm">Submit your deletion request via form or email</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Identity Verification</h3>
                    <p className="text-gray-600 text-sm">We verify your identity within 2-3 business days</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Data Deletion</h3>
                    <p className="text-gray-600 text-sm">Complete data removal within 7 business days</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-green-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Confirmation</h3>
                    <p className="text-gray-600 text-sm">You receive email confirmation of deletion</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Important Notes */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Important Notes</h2>
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                <h3 className="font-semibold text-yellow-800 mb-2">Before You Delete:</h3>
                <ul className="list-disc pl-5 text-sm text-yellow-800 space-y-1">
                  <li>Download any order receipts or invoices you may need</li>
                  <li>Cancel any pending orders</li>
                  <li>Clear any outstanding payments or refunds</li>
                  <li>Remove saved payment methods</li>
                  <li>Uninstall the mobile app after deletion</li>
                </ul>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <h3 className="font-semibold text-red-800 mb-2">Deletion Cannot Be Undone:</h3>
                <ul className="list-disc pl-5 text-sm text-red-800 space-y-1">
                  <li>You will lose access to your account permanently</li>
                  <li>All order history will be deleted</li>
                  <li>Loyalty points and store credit will be forfeited</li>
                  <li>You cannot recover your account after deletion</li>
                  <li>You may create a new account, but past data will not be restored</li>
                </ul>
              </div>
            </section>

            {/* Contact */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Need Help?</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about data deletion or need assistance:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2"><strong>Privacy Team</strong></p>
                <p className="text-gray-700 mb-2">Email: <a href="mailto:privacy@skyzonebd.com" className="text-blue-600 hover:underline">privacy@skyzonebd.com</a></p>
                <p className="text-gray-700 mb-2">Support: <a href="mailto:support@skyzonebd.com" className="text-blue-600 hover:underline">support@skyzonebd.com</a></p>
                <p className="text-gray-700 mb-2">Phone: +880-1700-000000</p>
                <p className="text-gray-700">Hours: 9 AM - 6 PM (Saturday - Thursday)</p>
              </div>
            </section>

            {/* Related Links */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-gray-700 mb-4">Related Information:</p>
              <div className="flex flex-wrap gap-4">
                <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
                <Link href="/terms-of-service" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>
                <Link href="/data-deletion/request" className="text-blue-600 hover:underline">
                  Submit Deletion Request
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
