'use client';

import React, { useState } from 'react';
import {
  Archive,
  ArrowUpRight,
  CheckSquare,
  Pin,
  Plus,
  RotateCcw,
  Square,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { useV2Store } from '@/v2/store/useV2Store';
import {
  computeNoteChecklistTotals,
  formatINRFromPaise,
} from '@/v2/engine/financialEngine';
import { AnimatedCurrency } from '@/v2/components/AnimatedCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NoteColorTheme, NotePriority, SphereScope } from '@/types/v2';

const NOTE_THEME_STYLES: Record<NoteColorTheme, string> = {
  amber: 'border-amber-200 bg-[#FFFBEB]/85',
  emerald: 'border-emerald-200 bg-[#ECFDF5]/85',
  indigo: 'border-indigo-200 bg-[#EEF2FF]/85',
  rose: 'border-rose-200 bg-[#FFF1F2]/85',
  sky: 'border-sky-200 bg-[#EFF6FF]/85',
  violet: 'border-violet-200 bg-[#F5F3FF]/85',
};

export function DailyNotesModule() {
  const {
    notes,
    accounts,
    scopeFilter,
    addNote,
    toggleNoteChecklistItem,
    addNoteChecklistItem,
    toggleNotePin,
    toggleNoteArchive,
    moveNoteToTrash,
    restoreNoteFromTrash,
    deleteNotePermanently,
    postNoteToLedger,
  } = useV2Store();

  const [viewTab, setViewTab] = useState<'active' | 'archived' | 'trash'>('active');
  const [addOpen, setAddOpen] = useState(false);
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({});
  const [postedBanner, setPostedBanner] = useState<string | null>(null);

  // Add Note Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [checklistRaw, setChecklistRaw] = useState(
    'Supplier carton payment ₹2,400\nCourier dispatch charges ₹650\nStore packaging tape ₹350'
  );
  const [colorTheme, setColorTheme] = useState<NoteColorTheme>('amber');
  const [priority, setPriority] = useState<NotePriority>('high');
  const [scope, setScope] = useState<SphereScope>('business');
  const [reminderDate, setReminderDate] = useState('2026-11-10');
  const [tagsRaw, setTagsRaw] = useState('dispatch, urgent');

  const sphereNotes = notes.filter(
    (n) => scopeFilter === 'all' || n.scope === scopeFilter
  );

  const activeNotes = sphereNotes
    .filter((n) => !n.is_archived && !n.is_trashed)
    .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));

  const archivedNotes = sphereNotes.filter((n) => n.is_archived && !n.is_trashed);
  const trashedNotes = sphereNotes.filter((n) => n.is_trashed);

  const displayedNotes =
    viewTab === 'active'
      ? activeNotes
      : viewTab === 'archived'
      ? archivedNotes
      : trashedNotes;

  const totalCalculatedPaise = activeNotes.reduce(
    (sum, n) => sum + n.calculated_total_paise,
    0
  );

  const totalPendingTasks = activeNotes.reduce(
    (sum, n) => sum + n.checklist_items.filter((i) => !i.checked).length,
    0
  );

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addNote({
      title: title.trim(),
      body: body.trim(),
      checklistTexts: checklistRaw.split('\n'),
      color_theme: colorTheme,
      priority,
      scope,
      reminder_date: reminderDate,
      tags: tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setTitle('');
    setBody('');
    setAddOpen(false);
  };

  const handleQuickInlineAddTask = async (noteId: string) => {
    const text = newTaskInputs[noteId] || '';
    if (!text.trim()) return;
    await addNoteChecklistItem(noteId, text);
    setNewTaskInputs((prev) => ({ ...prev, [noteId]: '' }));
  };

  const handlePostToLedger = async (noteId: string, noteTitle: string) => {
    await postNoteToLedger(noteId, 'expense', accounts[0]?.id);
    setPostedBanner(`Posted "${noteTitle}" total to Income & Expense Ledger.`);
    setTimeout(() => setPostedBanner(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Pastel Warm Amber Header */}
      <div className="rounded-2xl border border-amber-200 bg-[#FFFBEB] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Module 07 · Smart ₹ Auto-Calc Checklists & Notes
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Daily Notes & Live ₹ Checklists
            </h1>
            <p className="mt-1 text-sm text-slate-700">
              Write any ₹ amount inside a checklist line (e.g.{' '}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-amber-900">
                Freight bill ₹3,200
              </code>
              ) to auto-compute note totals and post to Ledger in 1 tap.
            </p>
          </div>
          <Button
            variant="default"
            onClick={() => setAddOpen(true)}
            className="gap-2 bg-amber-600 text-white hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            + New ₹ Checklist Note
          </Button>
        </div>

        {/* 3 Pastel Summary Strip Cards */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-200/90 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Active Notes
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-900">
              {activeNotes.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeNotes.filter((n) => n.is_pinned).length} Pinned on top
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-[#ECFDF5] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
              Pending Checklist Tasks
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-950">
              {totalPendingTasks}
            </p>
            <p className="mt-0.5 text-xs text-emerald-800">
              Tap any task checkbox to mark settled
            </p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-[#FFF1F2] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">
              Calculated Note ₹ Total
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-rose-950">
              <AnimatedCurrency valuePaise={totalCalculatedPaise} />
            </p>
            <p className="mt-0.5 text-xs text-rose-800">
              Live sum of active ₹ checklist items
            </p>
          </div>
        </div>
      </div>

      {postedBanner && (
        <div className="rounded-xl border border-emerald-300 bg-[#ECFDF5] px-4 py-3 text-xs font-semibold text-emerald-900">
          ✓ {postedBanner}
        </div>
      )}

      {/* Active / Archived / Trash Tabs */}
      <div className="flex items-center gap-2">
        {(
          [
            { id: 'active', label: `Active (${activeNotes.length})` },
            { id: 'archived', label: `Archived (${archivedNotes.length})` },
            { id: 'trash', label: `Trash (${trashedNotes.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setViewTab(t.id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              viewTab === t.id
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {displayedNotes.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <StickyNote className="mx-auto h-8 w-8 text-amber-500" />
            <h3 className="mt-3 text-base font-bold text-slate-900">
              No notes in {viewTab} view
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Click &quot;+ New ₹ Checklist Note&quot; above to create a smart financial checklist.
            </p>
          </div>
        ) : (
          displayedNotes.map((note) => {
            const totals = computeNoteChecklistTotals(note.checklist_items);
            return (
              <div
                key={note.id}
                className={`flex flex-col justify-between rounded-2xl border p-6 ${
                  NOTE_THEME_STYLES[note.color_theme] || NOTE_THEME_STYLES.amber
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {note.is_pinned && (
                          <span className="h-2 w-2 rounded-full bg-amber-600" />
                        )}
                        <h3 className="text-base font-bold text-slate-900">
                          {note.title}
                        </h3>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {note.scope.toUpperCase()} · Priority:{' '}
                        {note.priority.toUpperCase()}
                        {note.reminder_date ? ` · Due: ${note.reminder_date}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {!note.is_trashed && (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleNotePin(note.id)}
                            title="Pin Note"
                            className={`rounded-lg p-1.5 ${
                              note.is_pinned
                                ? 'bg-amber-200/70 text-amber-900'
                                : 'text-slate-500 hover:bg-white/70'
                            }`}
                          >
                            <Pin className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleNoteArchive(note.id)}
                            title="Archive / Unarchive"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/70"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveNoteToTrash(note.id)}
                            title="Move to Trash"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-100 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {note.is_trashed && (
                        <>
                          <button
                            type="button"
                            onClick={() => restoreNoteFromTrash(note.id)}
                            title="Restore Note"
                            className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteNotePermanently(note.id)}
                            title="Delete Permanently"
                            className="rounded-lg p-1.5 text-rose-700 hover:bg-rose-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {note.body && (
                    <p className="mt-2 text-xs text-slate-700">{note.body}</p>
                  )}

                  {/* Checklist Items */}
                  <div className="mt-4 space-y-2 rounded-xl border border-slate-200/80 bg-white p-3.5">
                    {note.checklist_items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleNoteChecklistItem(note.id, item.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2.5">
                          {item.checked ? (
                            <CheckSquare className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <Square className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                          <span
                            className={`text-xs ${
                              item.checked
                                ? 'line-through text-slate-400'
                                : 'font-medium text-slate-800'
                            }`}
                          >
                            {item.text}
                          </span>
                        </div>
                        {item.amount_paise > 0 && (
                          <span
                            className={`shrink-0 font-mono text-xs font-semibold tabular-nums ${
                              item.checked ? 'text-emerald-700' : 'text-amber-800'
                            }`}
                          >
                            {formatINRFromPaise(item.amount_paise)}
                          </span>
                        )}
                      </button>
                    ))}

                    {/* Quick Inline Add Task */}
                    {!note.is_trashed && (
                      <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
                        <input
                          type="text"
                          placeholder="Add task e.g. Courier fee ₹450..."
                          value={newTaskInputs[note.id] || ''}
                          onChange={(e) =>
                            setNewTaskInputs((prev) => ({
                              ...prev,
                              [note.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleQuickInlineAddTask(note.id);
                            }
                          }}
                          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-amber-400 focus:bg-white focus:outline-none"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="amber"
                          onClick={() => handleQuickInlineAddTask(note.id)}
                          className="h-7 px-2.5 text-xs"
                        >
                          + Add
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Note Calculated Footer + 1-Tap Post to Ledger */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 pt-3">
                  <div className="text-xs text-slate-700">
                    Total:{' '}
                    <span className="font-mono font-bold text-slate-900">
                      {formatINRFromPaise(totals.totalPaise)}
                    </span>{' '}
                    · Pending:{' '}
                    <span className="font-mono font-semibold text-rose-700">
                      {formatINRFromPaise(totals.pendingPaise)}
                    </span>
                  </div>

                  {!note.is_trashed && totals.totalPaise > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePostToLedger(note.id, note.title)}
                      className="h-8 gap-1 bg-white text-xs font-bold text-slate-900"
                    >
                      Post ₹ to Ledger <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Note Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Smart ₹ Checklist Note</DialogTitle>
            <DialogDescription>
              Include ₹ amounts in any line (e.g., &quot;Stock restock ₹4,500&quot;) for live calculation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateNote} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Note Title *
              </label>
              <Input
                required
                placeholder="Weekly Warehouse & Vendor Payouts"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Summary / Context
              </label>
              <Input
                placeholder="Short description..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Checklist Items (One per line — include ₹ values)
              </label>
              <textarea
                rows={4}
                value={checklistRaw}
                onChange={(e) => setChecklistRaw(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Pastel Card Theme
                </label>
                <select
                  value={colorTheme}
                  onChange={(e) => setColorTheme(e.target.value as NoteColorTheme)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="amber">Warm Amber</option>
                  <option value="emerald">Emerald Mint</option>
                  <option value="indigo">Soft Indigo</option>
                  <option value="rose">Soft Rose</option>
                  <option value="sky">Sky Blue</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as NotePriority)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Reminder Date
                </label>
                <Input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tags (comma-separated)
                </label>
                <Input
                  value={tagsRaw}
                  onChange={(e) => setTagsRaw(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save ₹ Checklist Note</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
