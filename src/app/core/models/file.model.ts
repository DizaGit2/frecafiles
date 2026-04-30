import { Category } from './category.model';

export interface FileClient {
  full_name: string;
  email: string;
}

export interface FileRecord {
  id: string;
  name: string;
  file_url: string;
  storage_path: string;
  size_bytes?: number | null;
  created_by: string;
  created_at: string;
  category_id?: string | null;
  category?: Pick<Category, 'id' | 'name'> | null;
  clients?: FileClient[];
}

export interface FileClientLink {
  file_id: string;
  client_user_id: string;
}