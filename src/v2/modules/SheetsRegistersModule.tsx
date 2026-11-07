'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import { useV2Store } from '../store/useV2StoreEdge';
import { formatINRFromPaise, rupeesToPaise } from '../engine/financialEngine';
import { SphereScope } from '@/types/v2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PremiumModal } from '@/components/ui/PremiumModal';

export function SheetsRegistersModule() {
  const {
    sheets,
    scopeFilter,
    privacyMasked,
    addSheet,
    addSheetRow,
    updateSheetCell,
    deleteSheetRow,
    deleteSheet,
  } = useV2Store();

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('GST & Tax Register');
  const [scope, setScope] = useState<SphereScope>('business');

  const visibleSheets = sheets.filter((s) =>
    scopeFilter === 'all' ? true : s.scope === scopeFilter
  );

  const [selectedId, setSelectedId] = useState<string>(
    visibleSheets[0]?.id || ''
  );
  const activeSheet =
    visibleSheets.find((s) => s.id === selectedId) || visibleSheets[0];

  const handleCreateSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addSheet({
      title: title.trim(),
      category: category.trim(),
      scope,
    });
    setTitle('');
    setCreateOpen(false);
  };

  const handleExportActiveSheetCsv = () => {
    if (!activeSheet) return;
    const headers = activeSheet.columns.map((c) => `"${c.name}"`);
    const rows = activeSheet.rows.map((r) =>
      activeSheet.columns
        .map((c) => `"${String(r.cells[c.id] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSheet.title.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sky-900">
            Custom Business Registers
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
            Spreadsheets & Registers
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Interactive tabular registers for GST invoices, inventory stock counts, and payroll with automatic column totals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeSheet && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportActiveSheetCsv}
            >
              <Download className="mr-1.5 h-4 w-4 text-slate-600" />
              Export CSV
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Register Sheet
          </Button>
        </div>
      </div>

      {/* Sheet Selector Tabs */}
      {visibleSheets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<string>
            options={visibleSheets.map((s) => ({
              id: s.id,
              label: s.title,
              count: s.rows.length,
              icon: FileSpreadsheet,
            }))}
            value={activeSheet?.id || visibleSheets[0]?.id || ''}
            onChange={(val) => setSelectedId(val)}
            layoutId="sheets-selector-segmented"
            size="sm"
          />
        </div>
      )}

      {/* Active Sheet Grid */}
      {!activeSheet ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <FileSpreadsheet className="mx-auto h-8 w-8 text-sky-600" />
          <p className="mt-2 text-sm font-bold text-slate-800">
            No registers created yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Create a custom register to track GST invoices, stock items, or staff attendance.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-[#EFF6FF]/60 px-5 py-3.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {activeSheet.title}
              </h2>
              <p className="text-xs text-slate-600">
                {activeSheet.category} · Sphere: {activeSheet.scope} ·{' '}
                {activeSheet.rows.length} rows
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const defaultCells: Record<string, string | number> = {};
                  activeSheet.columns.forEach((col, i) => {
                    defaultCells[col.id] =
                      col.type === 'text'
                        ? i === 0
                          ? `Entry #${activeSheet.rows.length + 1}`
                          : ''
                        : 0;
                  });
                  void addSheetRow(activeSheet.id, defaultCells);
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Row
              </Button>
              <button
                type="button"
                onClick={() => deleteSheet(activeSheet.id)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                title="Delete Entire Sheet"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-12 px-4 py-3">#</th>
                  {activeSheet.columns.map((col) => (
                    <th key={col.id} className="px-4 py-3">
                      {col.name}
                    </th>
                  ))}
                  <th className="w-16 px-4 py-3 text-right">Row</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeSheet.rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">
                      {idx + 1}
                    </td>
                    {activeSheet.columns.map((col) => {
                      const rawVal = row.cells[col.id] ?? '';
                      return (
                        <td key={col.id} className="px-4 py-2">
                          <input
                            type={col.type === 'text' ? 'text' : 'number'}
                            value={rawVal}
                            onChange={(e) => {
                              const nextVal =
                                col.type === 'text'
                                  ? e.target.value
                                  : Number(e.target.value || 0);
                              void updateSheetCell(
                                activeSheet.id,
                                row.id,
                                col.id,
                                nextVal
                              );
                            }}
                            className={`h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-xs focus:border-indigo-300 focus:bg-white focus:outline-none ${
                              col.type !== 'text'
                                ? 'font-mono font-semibold text-slate-900'
                                : 'text-slate-800'
                            }`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => deleteSheetRow(activeSheet.id, row.id)}
                        className="rounded-lg p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Automatic Column Sum Footer */}
              <tfoot className="border-t-2 border-slate-200 bg-[#EEF2FF]/60 font-mono text-xs font-bold text-slate-900">
                <tr>
                  <td className="px-4 py-3">Σ</td>
                  {activeSheet.columns.map((col, idx) => {
                    if (col.type === 'text') {
                      return (
                        <td
                          key={col.id}
                          className="px-4 py-3 font-sans text-xs font-bold text-indigo-950"
                        >
                          {idx === 0 ? 'Column Totals' : ''}
                        </td>
                      );
                    }
                    const sum = activeSheet.rows.reduce(
                      (acc, r) => acc + (Number(r.cells[col.id]) || 0),
                      0
                    );
                    return (
                      <td key={col.id} className="px-6 py-3">
                        {col.type === 'currency'
                          ? formatINRFromPaise(rupeesToPaise(sum), {
                              masked: privacyMasked,
                            })
                          : sum}
                      </td>
                    );
                  })}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* New Sheet Modal - Premium */}
      <PremiumModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Custom Register Sheet"
        description="Creates a new spreadsheet with item, quantity, and auto-summed rupee columns."
        size="md"
        variant="dialog"
      >
        <form onSubmit={handleCreateSheet} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Register Title *
            </label>
            <Input
              required
              placeholder="e.g. Q4 GST Dispatch Register"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Category
              </label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Sphere
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as SphereScope)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                <option value="business">Business</option>
                <option value="personal">Personal</option>
                <option value="family">Family</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Sheet</Button>
          </div>
        </form>
      </PremiumModal>
    </div>
  );
}
