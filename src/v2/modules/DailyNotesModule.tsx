'use client';

import React, { useMemo, useState } from 'react';
import {
  Archive,
  ArrowUpRight,
  Calendar,
  CheckSquare,
  Pin,
  Plus,
  RotateCcw,
  Square,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { useV2Store } from '../store/useV2Store';
import {
  computeNoteChecklistTotals,
  formatINRFromPaise,
} from '../engine/financialEngine';
import { NoteColorTheme, SphereScope, V2Note } from '@/types/v2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { toast } from '@/components/ui/toastStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const THEME_CLASSES: Record<NoteColorTheme, string> = {
  amber: 'border-slate-200/80 border-t-2 border-t-amber-500 bg-white/95 hover:border-amber-300',
  indigo: 'border-slate-200/80 border-t-2 border-t-indigo-500 bg-white/95 hover:border-indigo-300',
  emerald: 'border-slate-200/80 border-t-2 border-t-emerald-500 bg-white/95 hover:border-emerald-300',
  rose: 'border-slate-200/80 border-t-2 border-t-rose-500 bg-white/95 hover:border-rose-300',
  sky: 'border-slate-200/80 border-t-2 border-t-sky-500 bg-white/95 hover:border-sky-300',
  violet: 'border-slate-200/80 border-t-2 border-t-violet-500 bg-white/95 hover:border-violet-300',
};

export function DailyNotesModule() {
  const {
    notes,
    scopeFilter,
    searchQuery,
    privacyMasked,
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

  const [viewMode, setViewMode] = useState<'active' | 'archived' | 'trash'>(
    'active'
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [quickItemInputs, setQuickItemInputs] = useState<
    Record<string, string>
  >({});

  // Create Note State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [checklistRaw, setChecklistRaw] = useState(
    'Supplier advance ₹4,500\nPackaging boxes ₹850\nStore freight ₹400'
  );
  const [colorTheme, setColorTheme] = useState<NoteColorTheme>('amber');
  const [priority, setPriority] = useState<V2Note['priority']>('high');
  const [scope, setScope] = useState<SphereScope>('business');
  const [tagsRaw, setTagsRaw] = useState('procurement, daily');
  const [reminderDate, setReminderDate] = useState('2026-11-10');

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes
      .filter((n) => (scopeFilter === 'all' ? true : n.scope === scopeFilter))
      .filter((n) => {
        if (viewMode === 'trash') return n.is_trashed;
        if (viewMode === 'archived') return !n.is_trashed && n.is_archived;
        return !n.is_trashed && !n.is_archived;
      })
      .filter((n) =>
        !q
          ? true
          : n.title.toLowerCase().includes(q) ||
            n.body.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q))
      )
      .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));
  }, [notes, scopeFilter, searchQuery, viewMode]);

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
      tags: tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      reminder_date: reminderDate || undefined,
    });
    toast.success('Note Created', `${title.trim() || 'Daily Note'} saved`);
    setTitle('');
    setBody('');
    setCreateOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-900">
            Smart Notes & Auto-Summed Checklists
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
            Daily Notes & Financial Tasks
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Write rupee amounts inside checklist items (e.g. &ldquo;Courier ₹450&rdquo;) to automatically calculate live totals and post to Cashbook.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<'active' | 'archived' | 'trash'>
            options={[
              {
                id: 'active',
                label: 'Active',
                count: notes.filter((n) => !n.is_trashed && !n.is_archived)
                  .length,
              },
              {
                id: 'archived',
                label: 'Archive',
                count: notes.filter((n) => !n.is_trashed && n.is_archived)
                  .length,
              },
              {
                id: 'trash',
                label: 'Trash',
                count: notes.filter((n) => n.is_trashed).length,
              },
            ]}
            value={viewMode}
            onChange={(val) => setViewMode(val)}
            layoutId="notes-view-mode-segmented"
            size="sm"
          />

          <Button variant="amber" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Smart Note
          </Button>
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <StickyNote className="mx-auto h-8 w-8 text-amber-500" />
          <p className="mt-2 text-sm font-bold text-slate-800">
            No {viewMode} notes in this view
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Create a note with a financial checklist to automatically calculate live rupee totals.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredNotes.map((note) => {
            const totals = computeNoteChecklistTotals(note.checklist_items);
            const doneCount = note.checklist_items.filter(
              (i) => i.checked
            ).length;
            const totalCount = note.checklist_items.length;

            return (
              <div
                key={note.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 shadow-2xs transition-all ${
                  THEME_CLASSES[note.color_theme] || THEME_CLASSES.amber
                }`}
              >
                <div>
                  {/* Card Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {note.is_pinned && (
                          <span className="rounded-md bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-950">
                            Pinned
                          </span>
                        )}
                        <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                          {note.priority}
                        </span>
                        <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-600">
                          {note.scope}
                        </span>
                        {totalCount > 0 && (
                          <span className="rounded-md bg-white/90 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                            {doneCount}/{totalCount} Done
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-base font-bold text-slate-900">
                        {note.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      {!note.is_trashed && (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleNotePin(note.id)}
                            className={`rounded-lg p-1.5 ${
                              note.is_pinned
                                ? 'bg-amber-200/70 text-amber-950'
                                : 'text-slate-500 hover:bg-white'
                            }`}
                            title="Pin Note"
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleNoteArchive(note.id)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-white"
                            title="Archive Note"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveNoteToTrash(note.id)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            title="Move to Trash"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {note.is_trashed && (
                        <>
                          <button
                            type="button"
                            onClick={() => restoreNoteFromTrash(note.id)}
                            className="rounded-lg p-1.5 text-emerald-700 hover:bg-white"
                            title="Restore Note"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteNotePermanently(note.id)}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-white"
                            title="Delete Permanently"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {note.body && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-700">
                      {note.body}
                    </p>
                  )}

                  {/* Checklist Items */}
                  <div className="mt-4 space-y-1.5">
                    {note.checklist_items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          toggleNoteChecklistItem(note.id, item.id)
                        }
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200/70 bg-white/85 px-3 py-2 text-left text-xs transition-colors hover:bg-white"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {item.checked ? (
                            <CheckSquare className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <Square className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                          <span
                            className={`truncate ${
                              item.checked
                                ? 'line-through text-slate-400'
                                : 'font-medium text-slate-800'
                            }`}
                          >
                            {item.text}
                          </span>
                        </span>
                        {item.amount_paise > 0 && (
                          <span className="ml-2 shrink-0 font-mono text-[11px] font-bold text-slate-700">
                            {formatINRFromPaise(item.amount_paise, {
                              masked: privacyMasked,
                            })}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Quick Add Checklist Line */}
                  {!note.is_trashed && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const val = quickItemInputs[note.id] || '';
                        if (!val.trim()) return;
                        void addNoteChecklistItem(note.id, val);
                        setQuickItemInputs((prev) => ({
                          ...prev,
                          [note.id]: '',
                        }));
                      }}
                      className="mt-2.5 flex gap-1.5"
                    >
                      <input
                        type="text"
                        placeholder="+ Add item e.g. Courier ₹350"
                        value={quickItemInputs[note.id] || ''}
                        onChange={(e) =>
                          setQuickItemInputs((prev) => ({
                            ...prev,
                            [note.id]: e.target.value,
                          }))
                        }
                        className="h-8 flex-1 rounded-xl border border-slate-200/80 bg-white/90 px-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Add
                      </button>
                    </form>
                  )}
                </div>

                {/* Auto-Calculated ₹ Footer & Post to Cashbook Action */}
                <div className="mt-4 border-t border-slate-200/70 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Checklist Total
                      </p>
                      <p className="font-mono text-base font-extrabold text-slate-900">
                        {formatINRFromPaise(totals.totalPaise, {
                          masked: privacyMasked,
                        })}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Done:{' '}
                        {formatINRFromPaise(totals.settledPaise, {
                          masked: privacyMasked,
                        })}{' '}
                        · Pending:{' '}
                        {formatINRFromPaise(totals.pendingPaise, {
                          masked: privacyMasked,
                        })}
                      </p>
                    </div>

                    {totals.totalPaise > 0 && !note.is_trashed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          postNoteToLedger(note.id, 'expense')
                        }
                        className="bg-white/90 text-xs"
                      >
                        Post to Cashbook
                        <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {(note.tags.length > 0 || note.reminder_date) && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-600">
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-white/80 px-1.5 py-0.5 font-medium text-slate-700"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      {note.reminder_date && (
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <Calendar className="h-3 w-3" /> {note.reminder_date}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Smart Note Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Smart Note & Financial Checklist</DialogTitle>
            <DialogDescription>
              Any rupee amount in your checklist lines is automatically extracted and summed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateNote} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Note Title *
              </label>
              <Input
                required
                placeholder="e.g. Friday Market Stock & Transport List"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Summary / Description
              </label>
              <Input
                placeholder="Brief context..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Checklist Items (One per line — include ₹ amounts)
              </label>
              <textarea
                rows={4}
                value={checklistRaw}
                onChange={(e) => setChecklistRaw(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Pastel Card Theme
                </label>
                <select
                  value={colorTheme}
                  onChange={(e) =>
                    setColorTheme(e.target.value as NoteColorTheme)
                  }
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="amber">Warm Amber</option>
                  <option value="indigo">Soft Indigo</option>
                  <option value="emerald">Mint Emerald</option>
                  <option value="rose">Blush Rose</option>
                  <option value="sky">Sky Blue</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tags (comma separated)
                </label>
                <Input
                  value={tagsRaw}
                  onChange={(e) => setTagsRaw(e.target.value)}
                />
              </div>
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
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="amber">
                Save Note
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
