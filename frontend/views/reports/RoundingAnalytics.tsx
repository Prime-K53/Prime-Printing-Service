import React, { useEffect, useMemo, useState } from 'react';
import {
  getProductPriceHistory,
  getRoundingDashboardData,
  getRoundingMethodPerformance,
  getRoundingPeriodReport,
  getRoundingProductPerformance,
  getRoundingProfitProjection,
  getRoundingProfitSummary,
  getRoundingSmartInsights,
  getTopProductsByRoundingProfit
} from '../../services/roundingAnalyticsService';
import {
  RoundingDashboardData,
  RoundingInsight,
  RoundingMethodPerformanceRow,
  RoundingPeriodReportRow,
  RoundingPriceHistoryEntry,
  RoundingProductPerformanceRow,
  RoundingProfitProjection,
  RoundingProfitSummary,
  RoundingTopProductRow
} from '../../types';
import { useData, REFRESH_INTERVAL } from '../../context/DataContext';
import { useModuleRefresh } from '../../hooks/useModuleRefresh';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, Calendar, 
  Target, Lightbulb, History, BarChart3, PieChart as PieChartIcon,
  ArrowUpRight, ArrowDownRight, Calculator
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const buildHistoryKey = (productId: string, variantId?: string) => `${productId}::${variantId || ''}`;

const parseHistoryKey = (value: string): { productId: string; variantId?: string } => {
  const [productId, variantId] = value.split('::');
  return { productId, variantId: variantId || undefined };
};

const RoundingAnalytics: React.FC = () => {
  const { companyConfig, refreshAllData } = useData();
  useModuleRefresh(refreshAllData, { interval: REFRESH_INTERVAL });
  const currency = companyConfig?.currencySymbol || '$';

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<RoundingProfitSummary | null>(null);
  const [dashboard, setDashboard] = useState<RoundingDashboardData | null>(null);
  const [productRows, setProductRows] = useState<RoundingProductPerformanceRow[]>([]);
  const [dailyRows, setDailyRows] = useState<RoundingPeriodReportRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<RoundingPeriodReportRow[]>([]);
  const [methodRows, setMethodRows] = useState<RoundingMethodPerformanceRow[]>([]);
  const [topProducts, setTopProducts] = useState<RoundingTopProductRow[]>([]);
  const [projection, setProjection] = useState<RoundingProfitProjection | null>(null);
  const [insights, setInsights] = useState<RoundingInsight[]>([]);
  const [selectedHistoryKey, setSelectedHistoryKey] = useState<string>('');
  const [priceHistory, setPriceHistory] = useState<RoundingPriceHistoryEntry[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [summaryData, dashboardData, productPerformance, dailyReport, monthlyReport, methodPerformance, topProductRows, projectionData, insightsData] = await Promise.all([
          getRoundingProfitSummary(),
          getRoundingDashboardData(),
          getRoundingProductPerformance(),
          getRoundingPeriodReport('day'),
          getRoundingPeriodReport('month'),
          getRoundingMethodPerformance(),
          getTopProductsByRoundingProfit(10),
          getRoundingProfitProjection(30, 30),
          getRoundingSmartInsights()
        ]);

        if (!active) return;
        setSummary(summaryData);
        setDashboard(dashboardData);
        setProductRows(productPerformance);
        setDailyRows(dailyReport.slice(-30));
        setMonthlyRows(monthlyReport.slice(-12));
        setMethodRows(methodPerformance);
        setTopProducts(topProductRows);
        setProjection(projectionData);
        setInsights(insightsData);

        if (!selectedHistoryKey && productPerformance.length > 0) {
          setSelectedHistoryKey(buildHistoryKey(productPerformance[0].product_id, productPerformance[0].variant_id));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedHistoryKey) { setPriceHistory([]); return; }
    let active = true;
    const loadHistory = async () => {
      const selected = parseHistoryKey(selectedHistoryKey);
      const history = await getProductPriceHistory(selected.productId, selected.variantId);
      if (!active) return;
      setPriceHistory(history);
    };
    loadHistory();
    return () => { active = false; };
  }, [selectedHistoryKey]);

  const historyOptions = useMemo(() => {
    return productRows.map((row) => ({
      key: buildHistoryKey(row.product_id, row.variant_id),
      label: row.variant_id ? `${row.product_name} (${row.variant_id})` : row.product_name
    }));
  }, [productRows]);

  const formatCurrency = (val: number) => `${currency}${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const dailyChartData = useMemo(() => dailyRows.map(r => ({
    date: r.period?.slice(5) || r.period,
    potential: r.potential_profit || 0,
    realized: r.realized_profit || 0
  })), [dailyRows]);

  const monthlyChartData = useMemo(() => monthlyRows.map(r => ({
    month: r.period?.slice(0, 7) || r.period,
    potential: r.potential_profit || 0,
    realized: r.realized_profit || 0
  })), [monthlyRows]);

  const methodChartData = useMemo(() => methodRows.map(r => ({
    name: r.method,
    potential: r.potential_profit || 0,
    realized: r.realized_profit || 0
  })), [methodRows]);

  const topProductsChartData = useMemo(() => topProducts.slice(0, 8).map(r => ({
    name: r.product_name?.length > 20 ? r.product_name.slice(0, 20) + '...' : r.product_name,
    value: r.realized_profit || 0,
    qty: r.qty_sold || 0
  })), [topProducts]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#f8fafc] font-sans">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <h2 className="font-bold text-2xl text-slate-900 tracking-tight">Rounding Analytics</h2>
          <p className="text-slate-500 text-sm font-medium">Track potential and realized profit from inventory price rounding</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-slate-500 font-medium">Loading rounding analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] font-sans text-[13px] leading-[1.5] text-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-2xl text-slate-900 tracking-tight">Rounding Analytics</h2>
            <p className="text-slate-500 text-sm font-medium">Track potential and realized profit from inventory price rounding</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
            <Calculator size={16} className="text-blue-500" />
            <span className="text-xs font-semibold text-slate-600">Live Data</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Primary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 tablet-auto-fit-250 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Realized Profit (Total)</p>
                  <h3 className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">{formatCurrency(summary?.realized_rounding_profit || 0)}</h3>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <TrendingUp size={24} className="text-emerald-600" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">From all rounded sales</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Potential Profit</p>
                  <h3 className="text-2xl font-black text-blue-600 mt-1 tabular-nums">{formatCurrency(summary?.potential_rounding_profit || 0)}</h3>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Target size={24} className="text-blue-600" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">Available from rounding</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Rounding Impact</p>
                  <h3 className="text-2xl font-black text-violet-600 mt-1 tabular-nums">{Number(summary?.rounding_profit_percentage || 0).toFixed(2)}%</h3>
                </div>
                <div className="p-3 bg-violet-50 rounded-xl">
                  <PieChartIcon size={24} className="text-violet-600" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">% of total revenue</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Products Rounded</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{Number(summary?.products_with_rounding || 0).toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <Package size={24} className="text-amber-600" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">Active rounding items</p>
            </div>
          </div>

          {/* Secondary KPIs - Today/Month/Projections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-emerald-100 tracking-widest uppercase">Profit Today</p>
                  <h3 className="text-2xl font-black mt-1 tabular-nums">{formatCurrency(dashboard?.rounding_profit_today || 0)}</h3>
                  <div className="flex items-center gap-1 mt-2 text-emerald-100">
                    <ArrowUpRight size={14} />
                    <span className="text-xs font-medium">Today's gain</span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <DollarSign size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-blue-100 tracking-widest uppercase">Profit This Month</p>
                  <h3 className="text-2xl font-black mt-1 tabular-nums">{formatCurrency(dashboard?.rounding_profit_this_month || 0)}</h3>
                  <div className="flex items-center gap-1 mt-2 text-blue-100">
                    <Calendar size={14} />
                    <span className="text-xs font-medium">Monthly total</span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <TrendingUp size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-5 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-violet-100 tracking-widest uppercase">30-Day Projection</p>
                  <h3 className="text-2xl font-black mt-1 tabular-nums">{formatCurrency(projection?.projected_realized_profit || 0)}</h3>
                  <div className="flex items-center gap-1 mt-2 text-violet-100">
                    <Target size={14} />
                    <span className="text-xs font-medium">Based on avg {formatCurrency(projection?.average_daily_realized_profit || 0)}/day</span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <BarChart3 size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 1: Daily Trend & Monthly Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                Daily Rounding Trend (Last 30 Days)
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData}>
                    <defs>
                      <linearGradient id="colorPotential" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${currency}${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), '']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="potential" stroke="#3b82f6" strokeWidth={2} fill="url(#colorPotential)" name="Potential" />
                    <Area type="monotone" dataKey="realized" stroke="#10b981" strokeWidth={2} fill="url(#colorRealized)" name="Realized" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-blue-500" />
                Monthly Rounding Trend
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${currency}${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), '']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Bar dataKey="potential" fill="#3b82f6" name="Potential" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="realized" fill="#10b981" name="Realized" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2: Method Performance & Top Products Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-violet-500" />
                Rounding Method Performance
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={methodChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${currency}${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), '']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Bar dataKey="potential" fill="#3b82f6" name="Potential" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="realized" fill="#10b981" name="Realized" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight mb-4 flex items-center gap-2">
                <Package size={18} className="text-amber-500" />
                Top Products by Profit
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topProductsChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {topProductsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Profit']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Smart Insights */}
          {insights.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight mb-4 flex items-center gap-2">
                <Lightbulb size={18} className="text-amber-500" />
                Smart Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.map((insight) => (
                  <div key={insight.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Lightbulb size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{insight.title}</h4>
                        <p className="text-xs text-slate-600 mt-1">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Performance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                <Package size={18} className="text-blue-500" />
                Product Rounding Performance
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-black text-[10px] tracking-widest uppercase">
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4 text-right">Rounding / Unit</th>
                    <th className="px-6 py-4 text-right">Qty Sold</th>
                    <th className="px-6 py-4 text-right">Potential Profit</th>
                    <th className="px-6 py-4 text-right">Realized Profit</th>
                    <th className="px-6 py-4 text-right">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {productRows.slice(0, 15).map((row) => {
                    const conversion = row.potential_profit > 0 ? ((row.realized_profit || 0) / row.potential_profit * 100).toFixed(1) : '0';
                    return (
                      <tr key={buildHistoryKey(row.product_id, row.variant_id)} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{row.product_name}</div>
                          {row.variant_id && <div className="text-xs text-slate-500">{row.variant_id}</div>}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-emerald-600">{formatCurrency(row.rounded_diff_per_unit || 0)}</td>
                        <td className="px-6 py-4 text-right font-mono text-slate-600">{Number(row.qty_sold || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-mono text-blue-600">{formatCurrency(row.potential_profit || 0)}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">{formatCurrency(row.realized_profit || 0)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${Number(conversion) > 50 ? 'bg-emerald-100 text-emerald-700' : Number(conversion) > 20 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {Number(conversion) > 50 ? <ArrowUpRight size={12} /> : <TrendingDown size={12} />}
                            {conversion}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Products List & Price History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-500" />
                  Top Products by Rounding Profit
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {topProducts.slice(0, 8).map((row, idx) => (
                  <div key={buildHistoryKey(row.product_id, row.variant_id)} className="flex items-center justify-between p-4 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${idx < 3 ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-slate-400'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{row.product_name}</div>
                        <div className="text-xs text-slate-500">{Number(row.qty_sold || 0).toLocaleString()} units sold</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600">{formatCurrency(row.realized_profit || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                  <History size={18} className="text-violet-500" />
                  Price History
                </h3>
                <select
                  value={selectedHistoryKey}
                  onChange={(e) => setSelectedHistoryKey(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium"
                >
                  {historyOptions.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-slate-500 font-black text-[10px] tracking-widest uppercase">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Previous</th>
                      <th className="px-4 py-3 text-right">New Price</th>
                      <th className="px-4 py-3 text-right">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {priceHistory.slice(0, 20).map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{entry.date?.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          {entry.previous_rounded_price === null ? '-' : formatCurrency(entry.previous_rounded_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{formatCurrency(entry.rounded_price)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600">{formatCurrency(entry.rounding_difference)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoundingAnalytics;
