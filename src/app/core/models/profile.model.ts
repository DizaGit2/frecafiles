export type UserRole = 'administrator' | 'client';

export interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}