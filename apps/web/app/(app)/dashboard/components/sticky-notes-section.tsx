'use client';

import { useEffect, useState } from 'react';
import { Archive, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const STORAGE_KEY = 'dashboard-sticky-notes';

const NOTE_COLORS = [
  'bg-yellow-300',
  'bg-green-300',
  'bg-blue-300',
  'bg-red-300',
] as const;

const ARCHIVE_COLOR = 'bg-gray-300';

type NoteColor = (typeof NOTE_COLORS)[number] | typeof ARCHIVE_COLOR;

interface StickyNote {
  id: number;
  title: string;
  content: string;
  color: NoteColor;
}

function loadNotesFromStorage(): StickyNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StickyNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotesToStorage(notes: StickyNote[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // ignore storage errors
  }
}

const DEFAULT_NOTES: StickyNote[] = [
  {
    id: 1,
    title: 'Site Safety',
    content: 'Daily toolbox talk, PPE check, barricade zones',
    color: 'bg-yellow-300',
  },
];

export function StickyNotesSection() {
  const [notes, setNotes] = useState<StickyNote[]>(DEFAULT_NOTES);
  const [isHydrated, setIsHydrated] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    color: 'bg-yellow-300' as NoteColor,
  });

  useEffect(() => {
    const stored = loadNotesFromStorage();
    setNotes(stored.length > 0 ? stored : DEFAULT_NOTES);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveNotesToStorage(notes);
  }, [isHydrated, notes]);

  const createNote = () => {
    const title = newNote.title.trim();
    const content = newNote.content.trim();
    if (!title || !content) return;
    setNotes((prev) => {
      const nextId =
        prev.length > 0 ? Math.max(...prev.map((n) => n.id)) + 1 : 1;
      return [...prev, { id: nextId, title, content, color: newNote.color }];
    });
    setNewNote({ title: '', content: '', color: 'bg-yellow-300' });
  };

  const deleteNote = (id: number) => {
    setNotes(notes.filter((note) => note.id !== id));
  };

  const archiveNote = (id: number) => {
    setNotes(
      notes.map((note) =>
        note.id === id ? { ...note, color: ARCHIVE_COLOR } : note
      )
    );
  };

  const changeColor = (id: number, color: NoteColor) => {
    setNotes(notes.map((note) => (note.id === id ? { ...note, color } : note)));
  };

  return (
    <section className='flex flex-col rounded-lg border bg-muted/30 p-4 lg:p-6'>
      <header className='mb-4 flex items-center justify-between'>
        <h2 className='text-xl font-semibold'>Sticky Notes</h2>
      </header>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
        {notes.map((note) => (
          <div
            key={note.id}
            className={`rounded-md p-4 shadow-md transition-transform duration-300 hover:rotate-0 ${note.color} ${note.color === ARCHIVE_COLOR ? '' : 'rotate-[2deg]'}`}
          >
            <div className='mb-2 flex items-center justify-between'>
              <h3 className='text-lg font-bold'>{note.title}</h3>
              <div className='flex gap-1'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-8'
                  onClick={() => archiveNote(note.id)}
                  aria-label='Archive note'
                >
                  <Archive className='size-4' />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-8'
                  onClick={() => deleteNote(note.id)}
                  aria-label='Delete note'
                >
                  <Trash2 className='size-4' />
                </Button>
              </div>
            </div>
            <p className='text-gray-700'>{note.content}</p>
            <div className='mt-4 flex gap-2'>
              {NOTE_COLORS.map((color) => (
                <Button
                  key={color}
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-8'
                  onClick={() => changeColor(note.id, color)}
                  aria-label={`Set color ${color}`}
                >
                  <span className={`size-4 rounded-full ${color}`} />
                </Button>
              ))}
            </div>
          </div>
        ))}
        <div className='rotate-[-2deg] rounded-md border bg-background p-4 shadow-md transition-transform duration-300 hover:rotate-0'>
          <div className='mb-2'>
            <Input
              placeholder='Title'
              value={newNote.title}
              onChange={(e) =>
                setNewNote((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>
          <div className='mb-4'>
            <Textarea
              placeholder='Content'
              value={newNote.content}
              onChange={(e) =>
                setNewNote((prev) => ({ ...prev, content: e.target.value }))
              }
            />
          </div>
          <div className='mb-4 flex gap-2'>
            {NOTE_COLORS.map((color) => (
              <Button
                key={color}
                type='button'
                variant='ghost'
                size='icon'
                className={`size-8 shrink-0 ${newNote.color === color ? 'ring-2 ring-primary ring-offset-2 rounded-full' : ''}`}
                onClick={() => setNewNote((prev) => ({ ...prev, color }))}
                aria-label={`Choose ${color}`}
                aria-pressed={newNote.color === color}
              >
                <span className={`size-4 rounded-full ${color}`} />
              </Button>
            ))}
          </div>
          <Button type='button' onClick={createNote} className='w-full'>
            <Plus className='mr-2 size-4' />
            Add note
          </Button>
        </div>
      </div>
    </section>
  );
}
