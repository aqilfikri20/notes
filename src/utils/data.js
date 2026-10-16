import { getSavedAccount } from './auth';

const API_URL = '/api/notes';
const GUEST_NOTES_KEY = 'notes-guest-cache-v1';

async function request(url, options) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Gagal mengakses catatan.');
  }

  return response.status === 204 ? null : response.json();
}

function getGuestNotes() {
  try {
    const notes = JSON.parse(localStorage.getItem(GUEST_NOTES_KEY) || '[]');
    return Array.isArray(notes) ? notes : [];
  } catch {
    return [];
  }
}

function saveGuestNotes(notes) {
  localStorage.setItem(GUEST_NOTES_KEY, JSON.stringify(notes));
}

function isAccountSession() {
  return Boolean(getSavedAccount());
}

const showFormattedDate = (date) => new Date(date).toLocaleDateString('id-ID', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function getData() {
  return isAccountSession()
    ? request(API_URL)
    : Promise.resolve(getGuestNotes().sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)));
}

function getNotes(id) {
  if (isAccountSession()) return request(`${API_URL}/${id}`);
  return Promise.resolve(getGuestNotes().find((note) => note.id === Number(id)) || null);
}

function addNotes(newNote) {
  if (isAccountSession()) {
    return request(API_URL, { method: 'POST', body: JSON.stringify(newNote) });
  }

  const note = {
    id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
    createdAt: new Date().toISOString(),
    archived: false,
    ...newNote,
  };
  saveGuestNotes([note, ...getGuestNotes()]);
  return Promise.resolve(note);
}

function updateNote(id, updatedNote) {
  if (isAccountSession()) {
    return request(`${API_URL}/${id}`, { method: 'PUT', body: JSON.stringify(updatedNote) });
  }

  const notes = getGuestNotes();
  const index = notes.findIndex((note) => note.id === Number(id));
  if (index < 0) return Promise.reject(new Error('Catatan tidak ditemukan.'));
  notes[index] = { ...notes[index], ...updatedNote };
  saveGuestNotes(notes);
  return Promise.resolve(notes[index]);
}

function noteDelete(id) {
  if (isAccountSession()) return request(`${API_URL}/${id}`, { method: 'DELETE' });
  saveGuestNotes(getGuestNotes().filter((note) => note.id !== Number(id)));
  return Promise.resolve();
}

export { addNotes, getData, getGuestNotes, getNotes, noteDelete, showFormattedDate, updateNote };
