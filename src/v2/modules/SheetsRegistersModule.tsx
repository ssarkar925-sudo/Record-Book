'use client';

import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
} from 'lucide-react';
import { useV2Store } from '@/v2/store/useV2Store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SphereScope } from '@/types/v2';

export function SheetsRegistersModule() {
  const {
    sheets,
    scopeFilter,
    addSheet,
    addSheetRow,
    updateSheetCell,
    deleteSheetRow,
    deleteSheet,
  } = useV2Store();

  const visibleSheets = sheets.filter(
    (s) => scopeFilter === 'all' || s.scope === scopeFilter
  );

  const [selectedId, setSelectedId] = useState<string>(
    visibleSheets[0]?.id || sheets[0]?.id || ''
  );
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('GST & Stock Register');
  const [scope, setScope] = useState<SphereScope>('business');

  const activeSheet =
    visibleSheets.find((s) => s.id === selectedId) || visibleSheets[0] || sheets[0];

  const handleCreateSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addSheet({
      title: title.trim(),
      category: category.trim(),
      scope,
    });
    setTitle('');
    setAddSheetOpen(false);
  };

  const handleAddBlankRow = async () => {
    if (!activeSheet) return;
    const defaultCells: Record<string, string | number> = {};
    activeSheet.columns.forEach((col, idx) => {
      defaultCells[col.id] =
        col.type === 'number' || col.type === 'currency'
          ? 0
          : idx === 0
          ? `Entry #${activeSheet.rows.length + 1}`
          : '';
    });
    await addSheetRow(activeSheet.id, defaultCells);
  };

  const handleExportSheetCsv = () => {
    if (!activeSheet) return;
    const headers = activeSheet.columns.map((c) => `"${c.name}"`).join(',');
    const rows = activeSheet.rows.map((r) =>
      activeSheet.columns
        .map((c) => `"${String(r.cells[c.id] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSheet.title.toLowerCase().replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Pastel Sky Header */}
      <div className="rounded-2xl border border-sky-200 bg-[#EFF6FF] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">
              Module 06 · Custom Tabular Spreadsheets & Registers
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Sheets & Business Registers
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Inline spreadsheet cells with automatic numeric & currency column summation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {activeSheet && (
              <Button
                variant="outline"
                onClick={handleExportSheetCsv}
                className="gap-2 bg-white"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
            <Button
              variant="default"
              onClick={() => setAddSheetOpen(true)}
              className="gap-2 bg-sky-700 text-white hover:bg-sky-800"
            >
              <Plus className="h-4 w-4" />
              + New Register Sheet
            </Button>
          </div>
        </div>
      </div>

      {/* Sheet Selector Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {visibleSheets.map((s) => {
          const isSelected = activeSheet?.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(s.id)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors ${
                isSelected
                  ? 'border-sky-300 bg-[#EFF6FF] text-sky-950'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 text-sky-700" />
              <span>{s.title}</span>
              <span className="font-mono text-[11px] text-slate-400">
                ({s.rows.length})
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Spreadsheet Grid */}
      {activeSheet ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {activeSheet.title}
              </h2>
              <p className="text-xs text-slate-500">
                {activeSheet.category} · Scope: {activeSheet.scope.toUpperCase()} ·{' '}
                {activeSheet.rows.length} rows
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="emerald" onClick={handleAddBlankRow}>
                + Add Row
              </Button>
              {sheets.length > 1 && (
                <Button
                  size="sm"
                  variant="rose"
                  onClick={() => deleteSheet(activeSheet.id)}
                >
                  Delete Sheet
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <th className="w-12 px-4 py-3 text-center">#</th>
                  {activeSheet.columns.map((col) => (
                    <th key={col.id} className="px-4 py-3">
                      {col.name}
                    </th>
                  ))}
                  <th className="w-16 px-4 py-3 text-right">Row</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activeSheet.rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 text-center font-mono text-xs text-slate-400">
                      {idx + 1}
                    </td>
                    {activeSheet.columns.map((col) => {
                      const val = row.cells[col.id] ?? '';
                      const isNumeric =
                        col.type === 'number' || col.type === 'currency';
                      return (
                        <td key={col.id} className="px-3 py-2">
                          <input
                            type={isNumeric ? 'number' : 'text'}
                            value={val}
                            onChange={(e) =>
                              updateSheetCell(
                                activeSheet.id,
                                row.id,
                                col.id,
                                isNumeric
                                  ? Number(e.target.value || 0)
                                  : e.target.value
                              )
                            }
                            className={`w-full rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm text-slate-900 transition-colors focus:border-sky-400 focus:bg-white focus:outline-none ${
                              isNumeric ? 'font-mono tabular-nums' : ''
                            }`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => deleteSheetRow(activeSheet.id, row.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-[#EFF6FF]/60 font-mono text-xs font-bold text-slate-900">
                  <td className="px-4 py-3 text-center">Σ</td>
                  {activeSheet.columns.map((col, idx) => {
                    if (col.type === 'currency' || col.type === 'number') {
                      const colSum = activeSheet.rows.reduce(
                        (acc, r) => acc + (Number(r.cells[col.id]) || 0),
                        0
                      );
                      return (
                        <td key={col.id} className="px-5 py-3 tabular-nums">
                          {col.type === 'currency'
                            ? `₹${colSum.toLocaleString('en-IN')}`
                            : colSum.toLocaleString('en-IN')}
                        </td>
                      );
                    }
                    return (
                      <td key={col.id} className="px-5 py-3 text-slate-500">
                        {idx === 0 ? 'Column Totals' : '—'}
                      </td>
                    );
                  })}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : null}

      {/* New Sheet Modal */}
      <Dialog open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Register Sheet</DialogTitle>
            <DialogDescription>
              Create a spreadsheet register with automatic numeric and currency summation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSheet} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Register Title *
              </label>
              <Input
                required
                placeholder="December Warehouse Dispatch Sheet"
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
                  Sphere Scope
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
                onClick={() => setAddSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Sheet</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
