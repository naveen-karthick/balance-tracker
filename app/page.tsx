import portfolioData from "@/data/portfolio.json";

export default function Home() {
  const { savingsAccount, lentOut } = portfolioData;
  
  // Calculate total lent out money
  const totalLentOut = lentOut.reduce((total, category) => {
    const categoryTotal = category.entries.reduce((sum, entry) => sum + entry.amount, 0);
    return total + categoryTotal;
  }, 0);
  
  // Calculate total portfolio
  const totalPortfolio = savingsAccount + totalLentOut;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-12 mt-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 text-black">
            Balance Tracker
          </h1>
          <p className="text-gray-600 text-lg">
            Your Personal Portfolio Overview
          </p>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Total Portfolio
            </h3>
            <p className="text-4xl font-bold text-black">
              ${totalPortfolio.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Savings Account
            </h3>
            <p className="text-4xl font-bold text-black">
              ${savingsAccount.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Total Lent Out
            </h3>
            <p className="text-4xl font-bold text-black">
              ${totalLentOut.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Lent Out Money by Category */}
        <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-black mb-8">
            Money Lent Out
          </h2>
          
          <div className="space-y-8">
            {lentOut.map((category, idx) => {
              const categoryTotal = category.entries.reduce((sum, entry) => sum + entry.amount, 0);
              
              return (
                <div key={idx} className="border-b border-gray-100 last:border-b-0 pb-8 last:pb-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-black">
                      {category.category}
                    </h3>
                    <span className="text-base font-semibold text-gray-700 bg-gray-50 px-3 py-1 rounded-md">
                      ${categoryTotal.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Entries Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {category.entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 text-sm font-medium text-black">
                              {entry.name}
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                              ${entry.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {new Date(entry.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {entry.notes}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="border-r border-gray-100 last:border-r-0">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">In Bank</p>
              <p className="text-2xl font-bold text-black">${savingsAccount.toLocaleString()}</p>
            </div>
            <div className="border-r border-gray-100 last:border-r-0">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Lent Out</p>
              <p className="text-2xl font-bold text-black">${totalLentOut.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Portfolio</p>
              <p className="text-2xl md:text-3xl font-bold text-black">${totalPortfolio.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
