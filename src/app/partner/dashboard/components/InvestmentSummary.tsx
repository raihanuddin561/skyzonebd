'use client'

interface PartnerInfo {
  id: string;
  name: string;
  profitSharePercentage: number;
  isActive: boolean;
  joinDate: string;
  totalProfitReceived: number;
}

interface LedgerSummary {
  totalCredits: number;
  totalDebits: number;
  netBalance: number;
}

interface InvestmentSummaryProps {
  partner: PartnerInfo;
  ledgerSummary?: LedgerSummary;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('BDT', '৳');
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export default function InvestmentSummary({ partner, ledgerSummary }: InvestmentSummaryProps) {
  const daysActive = Math.floor(
    (new Date().getTime() - new Date(partner.joinDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const monthsActive = Math.floor(daysActive / 30);
  const yearsActive = Math.floor(daysActive / 365);

  const getActiveDuration = () => {
    if (yearsActive > 0) {
      const remainingMonths = monthsActive % 12;
      return `${yearsActive} ${yearsActive === 1 ? 'year' : 'years'}${remainingMonths > 0 ? ` ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}` : ''}`;
    } else if (monthsActive > 0) {
      return `${monthsActive} ${monthsActive === 1 ? 'month' : 'months'}`;
    } else {
      return `${daysActive} ${daysActive === 1 ? 'day' : 'days'}`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Investment Summary</h2>

      <div className="space-y-6">
        {/* Partnership Details */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Partnership Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Partner Name</span>
              <span className="text-sm font-medium text-gray-900">{partner.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Profit Share</span>
              <span className="text-sm font-semibold text-green-600">{partner.profitSharePercentage}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Join Date</span>
              <span className="text-sm font-medium text-gray-900">{formatDate(partner.joinDate)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Active Duration</span>
              <span className="text-sm font-medium text-gray-900">{getActiveDuration()}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`text-sm font-medium ${partner.isActive ? 'text-green-600' : 'text-red-600'}`}>
                {partner.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Financial Summary</h3>
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Profit Received</div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(partner.totalProfitReceived)}
              </div>
            </div>

            {ledgerSummary && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Credits</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(ledgerSummary.totalCredits)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Debits</span>
                  <span className="text-sm font-medium text-red-600">
                    {formatCurrency(ledgerSummary.totalDebits)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-semibold text-gray-700">Net Balance</span>
                  <span className={`text-sm font-bold ${ledgerSummary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(ledgerSummary.netBalance)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Info Note */}
        <div className="pt-4 border-t">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">Read-Only Dashboard</p>
                <p className="text-xs text-blue-700 mt-1">
                  This is a view-only dashboard. Contact admin for any changes or inquiries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
