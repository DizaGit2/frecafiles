import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';
import { Profile } from '../models/profile.model';
import { PageResult } from '../models/pagination.model';
import { AuthService } from './auth.service';

export interface ClientFilters {
  name?: string;
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  constructor(private auth: AuthService) {}

  async listClients(filters: ClientFilters, pageIndex: number, pageSize: number): Promise<PageResult<Profile>> {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'client')
      .eq('is_active', true);

    if (filters.name) {
      query = query.ilike('full_name', `%${filters.name}%`);
    }
    if (filters.email) {
      query = query.ilike('email', `%${filters.email}%`);
    }

    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return {
      data: (data || []) as Profile[],
      total: count ?? 0
    };
  }

  async listActiveClients(limit = 50): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .eq('is_active', true)
      .order('full_name')
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data || []) as Profile[];
  }

  async searchClients(term: string, limit = 10): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .eq('is_active', true)
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(limit)
      .order('full_name');

    if (error) {
      throw error;
    }

    return (data || []) as Profile[];
  }

  async updateClient(userId: string, payload: Partial<Profile>): Promise<void> {
    const { error } = await supabase.from('profiles').update(payload).eq('user_id', userId);
    if (error) {
      throw error;
    }
  }

  async softDeleteClient(userId: string): Promise<void> {
    const { error } = await supabase.from('profiles').update({ is_active: false }).eq('user_id', userId);
    if (error) {
      throw error;
    }
  }

  async hasClientFiles(userId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('file_clients')
      .select('*', { count: 'exact', head: true })
      .eq('client_user_id', userId);

    if (error) {
      throw error;
    }

    return (count ?? 0) > 0;
  }

  async inviteClient(fullName: string, email: string): Promise<void> {
    const token = await this.auth.getAccessToken();
    if (!token) {
      throw new Error('No hay sesion activa para invitar clientes.');
    }
    const { error } = await supabase.functions.invoke('invite-client', {
      body: { fullName, email },
      headers: { Authorization: `Bearer ${token}` }
    });
    if (error) {
      throw error;
    }
  }
}
