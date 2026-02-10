import React, { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

type Tool = 'pen' | 'note' | 'select';

type MiniNote = {
  id: string;
  x: number;
  y: number;
  text: string;
};

type MiniStroke = {
  id: string;
  points: { x: number; y: number }[];
  color: string;
};

interface MiniWhiteboardProps {
  width?: number;
  height?: number;
  className?: string;
}

const makeId = () => (crypto?.randomUUID ? crypto.randomUUID() : uuidv4());

const MiniWhiteboard: React.FC<MiniWhiteboardProps> = ({ width = 420, height = 280, className }) => {
  const [tool, setTool] = useState<Tool>('pen');
  const [notes, setNotes] = useState<MiniNote[]>([]);
  const [strokes, setStrokes] = useState<MiniStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#0f172a');

  const boardRef = useRef<HTMLDivElement>(null);
  const currentStrokeRef = useRef<MiniStroke | null>(null);
  const dragNoteRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const toLocal = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const addNoteAt = (x: number, y: number) => {
    const id = makeId();
    setNotes(prev => [
      ...prev,
      { id, x: Math.max(8, x - 60), y: Math.max(8, y - 40), text: '' },
    ]);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!boardRef.current) return;
    if (tool === 'note') {
      const { x, y } = toLocal(e.clientX, e.clientY);
      addNoteAt(x, y);
      return;
    }
    if (tool !== 'pen') return;

    e.preventDefault();
    const { x, y } = toLocal(e.clientX, e.clientY);
    const stroke: MiniStroke = { id: makeId(), points: [{ x, y }], color: penColor };
    currentStrokeRef.current = stroke;
    setStrokes(prev => [...prev, stroke]);
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDrawing && tool === 'pen' && currentStrokeRef.current) {
      const { x, y } = toLocal(e.clientX, e.clientY);
      currentStrokeRef.current.points.push({ x, y });
      setStrokes(prev => {
        const next = [...prev];
        next[next.length - 1] = { ...currentStrokeRef.current! };
        return next;
      });
      return;
    }

    if (dragNoteRef.current) {
      const { x, y } = toLocal(e.clientX, e.clientY);
      const dx = x - dragNoteRef.current.startX;
      const dy = y - dragNoteRef.current.startY;
      setNotes(prev =>
        prev.map(n =>
          n.id === dragNoteRef.current!.id
            ? { ...n, x: dragNoteRef.current!.origX + dx, y: dragNoteRef.current!.origY + dy }
            : n
        )
      );
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    currentStrokeRef.current = null;
    dragNoteRef.current = null;
  };

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTool('pen')}
          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border ${tool === 'pen' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600'}`}
        >
          Pen
        </button>
        <button
          onClick={() => setTool('note')}
          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border ${tool === 'note' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600'}`}
        >
          Note
        </button>
        <button
          onClick={() => setTool('select')}
          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border ${tool === 'select' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600'}`}
        >
          Select
        </button>
        <div className="flex items-center gap-1 ml-auto">
          {['#0f172a', '#ef4444', '#3b82f6', '#22c55e'].map(c => (
            <button
              key={c}
              onClick={() => setPenColor(c)}
              className={`w-5 h-5 rounded-full border ${penColor === c ? 'ring-2 ring-primary ring-offset-2' : 'border-slate-200'}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      <div
        ref={boardRef}
        className="relative bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden select-none touch-none"
        style={{ width, height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {strokes.map(s => (
            <polyline
              key={s.id}
              points={s.points.map(p => `${p.x},${p.y}`).join(' ')}
              stroke={s.color}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        {notes.map(note => (
          <div
            key={note.id}
            className="absolute w-32 min-h-[64px] bg-yellow-100 border border-yellow-200 rounded-md p-2 shadow-sm"
            style={{ left: note.x, top: note.y }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (tool !== 'select') return;
              const { x, y } = toLocal(e.clientX, e.clientY);
              dragNoteRef.current = { id: note.id, startX: x, startY: y, origX: note.x, origY: note.y };
            }}
          >
            <textarea
              value={note.text}
              onChange={(e) => setNotes(prev => prev.map(n => (n.id === note.id ? { ...n, text: e.target.value } : n)))}
              className="w-full h-full bg-transparent border-0 resize-none text-xs text-slate-700 focus:ring-0 outline-none"
              placeholder="Note..."
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MiniWhiteboard;
