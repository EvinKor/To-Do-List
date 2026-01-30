// Shared types for the simplified Task List + Whiteboard demo
export interface Task {
  id: string;
  title: string;
  category: 'Deep Work' | 'Product' | 'Admin' | 'Personal' | 'Meeting' | 'Health' | 'Event' | 'Learning';
  type: 'task' | 'event';
  color?: string;
  urgency: 'High' | 'Medium' | 'Low' | 'Normal';
  duration: string;
  date: string; // YYYY-MM-DD
  time?: string;
  status: 'todo' | 'active' | 'completed';
  progress?: number;
}

export interface WhiteboardNote {
  id: string;
  type: 'sticky' | 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  imageUrl?: string;
  title?: string;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'transparent';
  rotation: number;
  zIndex: number;
  fontSize: number;
  createdAt?: number;
}
