import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Whiteboard from '../components/Whiteboard/Whiteboard';
import { WhiteboardNote } from '../hooks/types';
import { apiFetch } from '../lib/api';

export default function ShareWhiteboardPhonePage() {
  const { shareId } = useParams();
  const [guestId, setGuestId] = useState<string | null>(null);
  const [whiteboardId, setWhiteboardId] = useState<string | null>(null);
  const [notes, setNotes] = useState<WhiteboardNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('whiteboard_guest_id');
    if (stored) {
      setGuestId(stored);
    } else {
      const id = crypto.randomUUID();
      localStorage.setItem('whiteboard_guest_id', id);
      setGuestId(id);
    }
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const fetchShare = async () => {
      if (!shareId) {
        setError('Invalid share link.');
        setLoading(false);
        return;
      }
      try {
        const payload = await apiFetch(`/whiteboard-shares/${shareId}`, { method: 'GET' });
        const share = payload?.share;
        if (!share) {
          setError('Share not found.');
          setLoading(false);
          return;
        }

        setWhiteboardId(share.whiteboard_id);
        setLoading(false);
      } catch (e) {
        setError('Failed to load share.');
        setLoading(false);
        return;
      }
    };

    fetchShare();
  }, [shareId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-slate-500">Loading shared whiteboard...</div>
        </div>
      </div>
    );
  }

  if (error || !guestId || !whiteboardId) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-sm text-red-500">{error || 'Unable to load share.'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] h-[100dvh] overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-50">
      <Whiteboard
        toggleTheme={() => {}}
        isDarkMode={false}
        notes={notes}
        setNotes={setNotes}
        userId={guestId}
        whiteboardId={whiteboardId}
        allowShare={false}
        fitToViewport
        minimalUi
        enableRealtime
      />
    </div>
  );
}
