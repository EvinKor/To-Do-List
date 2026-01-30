import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { APP_USER_ID } from '@/config/appUser';
import { WhiteboardNote } from '@/hooks/types';


export function useWhiteboard(whiteboardId: string) {
  const [notes, setNotes] = useState<WhiteboardNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Load notes
  useEffect(() => {
    const loadNotes = async () => {
      const { data, error } = await supabase
        .from('whiteboard_notes')
        .select('*')
        .eq('whiteboard_id', whiteboardId)
        .eq('user_id', APP_USER_ID);

      if (!error && data) {
        setNotes(data);
      }
      setLoading(false);
    };

    loadNotes();
  }, [whiteboardId]);

  // Save notes (manual for now)
  const saveNotes = async (notesToSave: WhiteboardNote[]) => {
    await supabase.from('whiteboard_notes').upsert(
      notesToSave.map(n => ({
        id: n.id,
        whiteboard_id: whiteboardId,
        user_id: APP_USER_ID,
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
      })),
      { onConflict: 'id' }
    );
  };


  return { notes, setNotes, saveNotes, loading };
}

