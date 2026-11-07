'use client';

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { motion } from 'framer-motion';
import { formatINRFromPaise } from '@/v2/engine/financialEngine';
import { TabularNums } from '@/components/ui/TabularNums';

const COLORS = {
  indigo: '#4F46E5',
  emerald: '#059669',
  rose: '#E11D48',
  amber: '#D97706',
  sky: '#0284C7',
  teal: '#0D9488',
  violet: '#7C3AED',
  pink: '#DB2777',
};

const PASTEL_FILL = {
  indigo: 'rgba(79, 70, 229, 0.12)',
  emerald: 'rgba(5, 150, 105, 0.12)',
  rose: 'rgba(225, 29, 72, 0.12)',
  amber: 'rgba(217, 119, 6, 0.12)',
  sky: 'rgba(2, 132, 199, 0.12)',
  teal: 'rgba(13, 148, 136, 0.12)',
  violet: 'rgba(124, 58, 237, 0.12)',
  pink: 'rgba(219, 39, 119, 0.12)',
};

const PASTEL_STROKE = {
  indigo: 'rgba(79, 70, 229, 0.6)',
  emerald: 'rgba(5, 150, 105, 0.6)',
  rose: 'rgba(225, 29, 72, 0.6)',
  amber: 'rgba(217, 119, 6, 0.6)',
  sky: 'rgba(2, 132, 199, 0.6)',
  teal: 'rgba(13, 148, 136, 0.6)',
  violet: 'rgba(124, 58, 237, 0.6)',
  pink: 'rgba(219, 39, 119, 0.6)',
};

interface NetWorthTrendProps {
  data: Array<{ month: string; netWorth: number; liquid: number; receivable: number; payable: number }>;
  privacyMasked: boolean;
  colorKey: keyof typeof COLORS;
  title?: string;
}

export function NetWorthTrendChart({ data, privacyMasked, colorKey = 'indigo', title = 'Net Worth Trend' }: NetWorthTrendProps) {
  const color = COLORS[colorKey];
  const fill = PASTEL_FILL[colorKey];
  const stroke = PASTEL_STROKE[colorKey];

  if (!data.length) {
    return (
      <div className="glass-card p-6 border border-indigo-200/60 bg-white/80">
        <p className="text-sm text-slate-500 text-center py-8">No trend data available</p>
      </div>
    );
  }

  const maxY = Math.max(...data.map(d => Math.abs(d.netWorth)));
  const tickFormatter = (val: number) => privacyMasked ? '••••••' : formatINRFromPaise(val, { showDecimals: false });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass-card p-4 border border-indigo-200/60 bg-white/80"
    >
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              dy={4}
            />
            <YAxis
              tickFormatter={tickFormatter}
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.98)',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
                backdropFilter: 'blur(12px)',
              }}
              formatter={(value: number) => [privacyMasked ? '••••••' : formatINRFromPaise(value, { showDecimals: true }), '']}
              labelFormatter={(label) => <span className="font-mono text-xs text-slate-600">{label}</span>}
            />
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: 4 }}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              name="Net Worth"
              stroke={color}
              strokeWidth={2}
              fill={fill}
              fillOpacity={1}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              animationDuration={800}
              animationEasing="easeOut"
            />
            <Line
              type="monotone"
              dataKey="liquid"
              name="Liquid Cash"
              stroke={COLORS.emerald}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              animationDuration={800}
              animationEasing="easeOut"
            />
            <Line
              type="monotone"
              dataKey="receivable"
              name="Receivables"
              stroke={COLORS.sky}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              animationDuration={800}
              animationEasing="easeOut"
            />
            <Line
              type="monotone"
              dataKey="payable"
              name="Payables"
              stroke={COLORS.rose}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              animationDuration={800}
              animationEasing="easeOut"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

interface ExpenseBreakdownProps {
  data: Array<{ category: string; amount: number; color: string }>;
  privacyMasked: boolean;
  title?: string;
}

export function ExpenseBreakdownChart({ data, privacyMasked, title = 'Expense Breakdown' }: ExpenseBreakdownProps) {
  if (!data.length) {
    return (
      <div className="glass-card p-6 border border-rose-200/60 bg-white/80">
        <p className="text-sm text-slate-500 text-center py-8">No expense data</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass-card p-4 border border-rose-200/60 bg-white/80"
    >
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={2}
              dataKey="amount"
              nameKey="category"
              label={({ category, percent }) => (
                <span className="font-mono text-[10px] text-slate-700">
                  {category} {(percent * 100).toFixed(0)}%
                </span>
              )}
              labelLine={false}
              startAngle={90}
              endAngle={450}
              animationDuration={1000}
              animationEasing="easeOut"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.98)',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
                backdropFilter: 'blur(12px)',
              }}
              formatter={(value: number) => [privacyMasked ? '••••••' : formatINRFromPaise(value, { showDecimals: true }), '']}
              labelFormatter={(label) => <span className="font-medium text-slate-800">{label}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-right font-mono text-sm font-semibold text-slate-900">
        {privacyMasked ? '••••••' : formatINRFromPaise(total, { showDecimals: false })}
      </p>
    </motion.div>
  );
}

interface CashFlowComparisonProps {
  data: Array<{ period: string; income: number; expense: number; net: number }>;
  privacyMasked: boolean;
  title?: string;
}

export function CashFlowComparisonChart({ data, privacyMasked, title = 'Cash Flow' }: CashFlowComparisonProps) {
  if (!data.length) {
    return (
      <div className="glass-card p-6 border border-emerald-200/60 bg-white/80">
        <p className="text-sm text-slate-500 text-center py-8">No cash flow data</p>
      </div>
    );
  }

  const tickFormatter = (val: number) => privacyMasked ? '••••••' : formatINRFromPaise(val, { showDecimals: false });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-card p-4 border border-emerald-200/60 bg-white/80"
    >
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              dy={4}
            />
            <YAxis
              tickFormatter={tickFormatter}
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.98)',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
                backdropFilter: 'blur(12px)',
              }}
              formatter={(value: number) => [privacyMasked ? '••••••' : formatINRFromPaise(value, { showDecimals: true }), '']}
              labelFormatter={(label) => <span className="font-mono text-xs text-slate-600">{label}</span>}
            />
            <Legend layout="horizontal" align="center" verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 4 }} />
            <Bar
              dataKey="income"
              name="Income"
              fill={COLORS.emerald}
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
              animationDuration={600}
            />
            <Bar
              dataKey="expense"
              name="Expense"
              fill={COLORS.rose}
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
              animationDuration={600}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net"
              stroke={COLORS.indigo}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
              animationDuration={600}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

interface CardUtilizationProps {
  cards: Array<{ name: string; utilized: number; limit: number; network: string }>;
  privacyMasked: boolean;
  title?: string;
}

export function CardUtilizationChart({ cards, privacyMasked, title = 'Card Utilization' }: CardUtilizationProps) {
  if (!cards.length) {
    return (
      <div className="glass-card p-6 border border-violet-200/60 bg-white/80">
        <p className="text-sm text-slate-500 text-center py-8">No credit cards</p>
      </div>
    );
  }

  const networkColors: Record<string, string> = {
    visa: '#1A1F71',
    mastercard: '#EB001B',
    rupay: '#0066CC',
    amex: '#006FCF',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="glass-card p-4 border border-violet-200/60 bg-white/80"
    >
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="space-y-3">
        {cards.map((card, i) => {
          const pct = card.limit > 0 ? (card.utilized / card.limit) * 100 : 0;
          const color = networkColors[card.network.toLowerCase()] || COLORS.violet;
          const isHigh = pct > 70;
          const isModerate = pct > 30;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-slate-700 truncate">{card.name} · {card.network.toUpperCase()}</span>
                <span className={`text-xs font-mono font-semibold ${isHigh ? 'text-rose-600' : isModerate ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {privacyMasked ? '•••%' : `${pct.toFixed(0)}%`}
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pct, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                    boxShadow: `0 0 8px ${color}66`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>{privacyMasked ? '••••••' : formatINRFromPaise(card.utilized, { showDecimals: false })} used</span>
                <span>of {privacyMasked ? '••••••' : formatINRFromPaise(card.limit, { showDecimals: false })} limit</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

interface KPIStripProps {
  metrics: {
    liquidCash: number;
    receivable: number;
    payable: number;
    cardUtilized: number;
    netWorth: number;
  };
  privacyMasked: boolean;
}

export function KPIStrip({ metrics, privacyMasked }: KPIStripProps) {
  const items = [
    { key: 'liquidCash', label: 'Liquid Cash', color: 'emerald', value: metrics.liquidCash, positive: true },
    { key: 'receivable', label: 'You Will Get', color: 'sky', value: metrics.receivable, positive: true },
    { key: 'payable', label: 'You Will Give', color: 'rose', value: metrics.payable, positive: false },
    { key: 'cardUtilized', label: 'Card Used', color: 'violet', value: metrics.cardUtilized, positive: false },
    { key: 'netWorth', label: 'Net Worth', color: 'indigo', value: metrics.netWorth, positive: metrics.netWorth >= 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-2 md:grid-cols-5 gap-3"
      role="list"
      aria-label="Financial KPIs"
    >
      {items.map((item, i) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
          className={`glass-card p-3 border border-${item.color}-200/80 bg-white/90 group relative overflow-hidden`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-${item.color}-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-${item.color}-900">{item.label}</p>
              <TabularNums
                className={`text-lg font-extrabold tracking-tight ${
                  item.positive ? 'text-${item.color}-800' : 'text-rose-800'
                }`}
                value={item.value}
                masked={privacyMasked}
              />
            </div>
            <div className={`w-8 h-8 rounded-xl bg-${item.color}-50/80 flex items-center justify-center`}>
              <div className={`w-2 h-2 rounded-full bg-${item.color}-500`} />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}