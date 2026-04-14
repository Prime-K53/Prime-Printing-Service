// Revised Margin Performance Dashboard – modern UI with charts and KPI cards
import React, { useState, useMemo } from 'react';
import { useData, REFRESH_INTERVAL } from '../../context/DataContext';
import { useModuleRefresh } from '../../hooks/useModuleRefresh';
import { format, differenceInDays } from 'date-fns';
import { calculateMarginAnalysis, calculateAdjustmentStatistics } from '../../services/reportService';
import {
  BarChart3,
  Filter,
  Printer,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Lightbulb,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

type DateRange = 'all' | 'week' | 'month' | 'quarter' | 'year';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const MarginPerformancePage: React.FC = () => {
  const { sales = [], invoices = [], customers = [], companyConfig, refreshAllData } = useData();
  useModuleRefresh(refreshAllData, { interval: REFRESH_INTERVAL });

  const currency = companyConfig?.currencySymbol || '$';
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const formatCurrency = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return `${currency}0.00`;
    return `${currency}${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  // ----- Data preparation -------------------------------------------------
  const invoicesAsSales = useMemo(() =>
    (invoices || []).map((inv: any) => ({
      ...inv,
      id: inv.id,
      date: inv.date,
      customerName: inv.customerName,
      totalAmount: inv.totalAmount,
      items: inv.items,
      adjustmentSnapshots: inv.adjustmentSnapshots || [],
      adjustmentTotal: inv.adjustmentTotal || 0,
      transactionAdjustments: inv.transactionAdjustments || [],
      adjustmentSummary: inv.adjustmentSummary || [],
    })),
    [invoices]
  );

  const allTransactions = useMemo(() => [...(sales || []), ...invoicesAsSales], [sales, invoicesAsSales]);
  const marginData = useMemo(() => calculateMarginAnalysis(allTransactions), [allTransactions]);

  // Filter helpers
  const now = new Date();
  const filterByDate = (dateStr: string) => {
    if (selectedDateRange === 'all') return true;
    const date = new Date(dateStr);
    const diffDays = differenceInDays(now, date);
    switch (selectedDateRange) {
      case 'week': return diffDays <= 7;
      case 'month': return diffDays <= 30;
      case 'quarter': return diffDays <= 90;
      case 'year': return diffDays <= 365;
      default: return true;
    }
  };

  const filteredData = useMemo(() =>
    marginData.filter(d => {
      if (selectedCustomerId && d.customerName !== customers.find(c => c.id === selectedCustomerId)?.name) return false;
      if (!filterByDate(d.date)) return false;
      return true;
    }),
    [marginData, selectedCustomerId, selectedDateRange, customers]
  );

  const adjustmentStats = useMemo(() => calculateAdjustmentStatistics(allTransactions), [allTransactions]);

  // ----- Chart data -------------------------------------------------------
  const dailyChartData = useMemo(() => {
    const groups: Record<string, { grossMargin: number; adjustments: number }> = {};
    filteredData.forEach(d => {
      const key = format(new Date(d.date), 'yyyy-MM-dd');
      if (!groups[key]) groups[key] = { grossMargin: 0, adjustments: 0 };
      groups[key].grossMargin += d.grossMargin;
      groups[key].adjustments += d.totalAdjustments;
    });
    const entries = Object.entries(groups)
      .map(([date, vals]) => ({ date, ...vals }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30);
    return entries;
  }, [filteredData]);

  const monthlyChartData = useMemo(() => {
    const groups: Record<string, { grossMargin: number; adjustments: number }> = {};
    filteredData.forEach(d => {
      const key = format(new Date(d.date), 'yyyy-MM');
      if (!groups[key]) groups[key] = { grossMargin: 0, adjustments: 0 };
      groups[key].grossMargin += d.grossMargin;
      groups[key].adjustments += d.totalAdjustments;
    });
    const entries = Object.entries(groups)
      .map(([month, vals]) => ({ month, ...vals }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-12);
    return entries;
  }, [filteredData]);

  // ----- Render -----------------------------------------------------------
  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] font-sans text-[13px] leading-[1.5] text-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-2xl text-slate-900 tracking-tight">Margin Performance</h2>
            <p className="text-slate-500 text-sm font-medium">Snapshot‑based margin audit and adjustment performance</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
            <Target size={16} className="text-blue-500" />
            <span className="text-xs font-semibold text-slate-600">Live Data</span>
          </div>
        </div>
        {/* Filters */}
        <div className="flex gap-3 mt-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'week', 'month', 'quarter', 'year'] as const).map(range => (
              <button
                key={range}
                onClick={() => setSelectedDateRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedDateRange === range ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          <select
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600"
          >
            <option value="">All Customers</option>
            {(customers || []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
            <button
              onClick={() => window.print()}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Print report"
            >
              <Printer size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Primary KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Avg Gross Margin</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">
                {(filteredData.reduce((s, d) => s + d.marginPercent, 0) / (filteredData.length || 1)).toFixed(1)}%
              </h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Total Adjustments</p>
              <h3 className="text-2xl font-black text-blue-600 mt-1 tabular-nums">
                {formatCurrency(filteredData.reduce((s, d) => s + d.totalAdjustments, 0))}
              </h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Total Gross Profit</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                {formatCurrency(filteredData.reduce((s, d) => s + d.grossMargin, 0))}
              </h3>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Trend */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                Daily Margin Trend (Last 30 Days)
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyChartData}>
                  <defs>
                    <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="adjGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${currency}${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), '']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="grossMargin" stroke="#10b981" fill="url(#grossGrad)" name="Gross Margin" />
                  <Area type="monotone" dataKey="adjustments" stroke="#3b82f6" fill="url(#adjGrad)" name="Adjustments" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Monthly Trend */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-blue-500" />
                Monthly Margin Trend (Last 12 Months)
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${currency}${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), '']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="grossMargin" fill="#10b981" name="Gross Margin" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="adjustments" fill="#3b82f6" name="Adjustments" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Adjustment Stats Table */}
          {adjustmentStats.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-x-auto">
              <h3 className="font-black text-slate-800 text-sm mb-4">Adjustment Performance Summary</h3>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-400 font-black text-[10px] tracking-widest border-b border-slate-100">
                    <th className="px-4 py-3">Adjustment Name</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3 text-right">Transactions</th>
                    <th className="px-4 py-3 text-right">Items Affected</th>
                    <th className="px-4 py-3 text-right">Avg per Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {adjustmentStats.map((stat, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-bold text-slate-800">{stat.adjustmentName}</td>
                      <td className="px-4 py-4 text-right font-mono text-blue-600 font-bold">{formatCurrency(stat.totalAmount)}</td>
                      <td className="px-4 py-4 text-right font-mono text-slate-600">{stat.transactionCount}</td>
                      <td className="px-4 py-4 text-right font-mono text-slate-600">{stat.itemCount}</td>
                      <td className="px-4 py-4 text-right font-mono text-slate-500">{formatCurrency(stat.avgPerTransaction)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sales Margin Audit Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-x-auto">
            <h3 className="font-black text-slate-800 text-sm mb-4">Sales Margin Audit (Snapshot‑based)</h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400 font-black text-[10px] tracking-widest border-b border-slate-100">
                  <th className="px-4 py-3">Sale ID / Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Production cost</th>
                  <th className="px-4 py-3 text-right">Cost (pre‑wastage)</th>
                  <th className="px-4 py-3 text-right">Cost (pre‑transport)</th>
                  <th className="px-4 py-3 text-right">Cost (pre‑profit)</th>
                  <th className="px-4 py-3 text-right">Net margin</th>
                  <th className="px-4 py-3 text-right">Final price</th>
                  <th className="px-4 py-3 text-right">Gross margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map(d => (
                  <React.Fragment key={d.saleId}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-800">{d.saleId}</div>
                        <div className="text-[11px] text-slate-400">{format(new Date(d.date), 'MMM dd, yyyy')}</div>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-600">{d.customerName}</td>
                      <td className="px-4 py-4 text-right font-mono text-slate-500">{formatCurrency(d.totalCost)}</td>
                      <td className="px-4 py-4 text-right font-mono text-slate-600">{formatCurrency(d.costBeforeWastage)}</td>
                      <td className="px-4 py-4 text-right font-mono text-slate-600">{formatCurrency(d.costBeforeTransport)}</td>
                      <td className="px-4 py-4 text-right font-mono text-slate-600">{formatCurrency(d.costBeforeProfit)}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-bold text-emerald-600">{formatCurrency(d.netMarginPerSale)}</div>
                        <div className="text-[9px] text-slate-400 font-bold">Profit component</div>
                      </td>
                      <td className="px-4 py-4 text-right font-black text-slate-900">{formatCurrency(d.finalPrice)}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-black text-slate-900">{formatCurrency(d.grossMargin)}</div>
                        <div className="text-[10px] font-bold text-emerald-500">{d.marginPercent.toFixed(1)}%</div>
                      </td>
                    </tr>
                    {d.adjustmentBreakdown && d.adjustmentBreakdown.length > 0 && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={9} className="px-4 py-3">
                          <div className="text-[10px] font-bold text-slate-400 mb-2">ADJUSTMENT BREAKDOWN</div>
                          <div className="flex flex-wrap gap-3">
                            {d.adjustmentBreakdown.map((adj, i) => (
                              <div key={i} className="bg-white px-3 py-2 rounded-lg border border-slate-200 text-[11px]">
                                <span className="font-bold text-slate-700">{adj.adjustmentName}:</span>{' '}
                                <span className="text-blue-600 font-mono">{formatCurrency(adj.totalAmount)}</span>
                                <span className="text-slate-400 ml-1">({adj.itemCount} items)</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarginPerformancePage;

