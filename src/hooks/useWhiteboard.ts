import { useEffect, useState } from 'react';
import { apiFetch } from '@/src/lib/api';
import { WhiteboardNote } from './types';


export function useWhiteboard(whiteboardId: string) {
  const [notes, setNotes] = useState<WhiteboardNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Load notes
  useEffect(() => {
    const loadNotes = async () => {
      const result = await apiFetch(`/whiteboard-notes?whiteboard_id=${whiteboardId}`, {
        method: 'GET',
      });
      const data = result?.notes ?? [];
      setNotes(data);
      setLoading(false);
    };

    loadNotes();
  }, [whiteboardId]);

  // Save notes (manual for now)
  const saveNotes = async (notesToSave: WhiteboardNote[]) => {
    await Promise.all(
      notesToSave.map((n) =>
        apiFetch(`/whiteboard-notes/${n.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            id: n.id,
            whiteboard_id: whiteboardId,
            type: n.type,
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
            rotation: n.rotation,
            z_index: n.zIndex,
            title: n.title,
            content: n.content,
            color: n.color,
            font_size: n.fontSize,
            image_url: n.imageUrl,
          }),
        })
      )
    );
  };


  return { notes, setNotes, saveNotes, loading };
}

