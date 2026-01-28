export interface FileRecord {
  id: string;
  name: string;
  file_url: string;
  storage_path: string;
  created_by: string;
  created_at: string;
}

export interface FileClientLink {
  file_id: string;
  client_user_id: string;
}