export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  created_at: string;
}

export interface Trip {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  cover_image?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Step {
  id: number;
  trip_id: number;
  title: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  start_date?: string;
  end_date?: string;
  order_index: number;
  created_at: string;
}

export interface JournalEntry {
  id: number;
  trip_id: number;
  type: 'text' | 'photo' | 'audio';
  content: string;
  file_path?: string;
  entry_date?: string;
  created_at: string;
}

export interface ChecklistItem {
  id: number;
  trip_id: number;
  title: string;
  is_checked: boolean;
  created_at: string;
}