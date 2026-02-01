export interface FileClient {
  full_name: string;
  email: string;
}

export interface FileRecord {
  id: string;
  name: string;
  file_url: string;
  storage_path: string;
  created_by: string;
  created_at: string;
  clients?: FileClient[];
}

export interface FileClientLink {
  file_id: string;
  client_user_id: string;
}