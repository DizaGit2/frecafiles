import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';
import { FileRecord } from '../models/file.model';
import { PageResult } from '../models/pagination.model';
import { MAX_FILE_SIZE_BYTES, SIGNED_URL_EXPIRY_SECONDS, STORAGE_BUCKET } from '../constants/app.constants';

export interface FileFilters {
  name?: string;
  clientIds?: string[];
  categoryId?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  async listFiles(filters: FileFilters, pageIndex: number, pageSize: number): Promise<PageResult<FileRecord>> {
    // Use INNER join when filtering by clients to exclude files without matching clients
    const selectQuery = filters.clientIds?.length
      ? '*, categories(id, name), file_clients!inner(client_user_id, profiles(full_name, email))'
      : '*, categories(id, name), file_clients(client_user_id, profiles(full_name, email))';

    let query = supabase
      .from('files')
      .select(selectQuery, { count: 'exact' });

    if (filters.name) {
      query = query.ilike('name', `%${filters.name}%`);
    }
    if (filters.clientIds?.length) {
      query = query.in('file_clients.client_user_id', filters.clientIds);
    }
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return {
      data: (data || []).map((row: any) => this.mapFileRow(row)),
      total: count ?? 0
    };
  }

  async listFilesForClient(clientUserId: string, filters: FileFilters, pageIndex: number, pageSize: number): Promise<PageResult<FileRecord>> {
    let query = supabase
      .from('files')
      .select('*, categories(id, name), file_clients!inner(client_user_id)', { count: 'exact' })
      .eq('file_clients.client_user_id', clientUserId);

    if (filters.name) {
      query = query.ilike('name', `%${filters.name}%`);
    }
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return {
      data: (data || []).map((row: any) => this.mapFileRow(row)),
      total: count ?? 0
    };
  }

  private mapFileRow(row: any): FileRecord {
    const { categories, file_clients, ...rest } = row;
    return {
      ...rest,
      category: categories ?? null,
      clients: file_clients?.map((fc: any) => fc.profiles).filter(Boolean) ?? []
    };
  }

  async uploadFile(file: File, displayName: string, clientIds: string[], createdBy: string, categoryId: string): Promise<void> {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('El archivo supera el tamano maximo permitido.');
    }

    const fileId = crypto.randomUUID();
    const storagePath = `files/${fileId}/${file.name}`;
    const publicUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      throw uploadError;
    }

    const { error: insertError } = await supabase.from('files').insert({
      id: fileId,
      name: displayName,
      file_url: publicUrl,
      storage_path: storagePath,
      created_by: createdBy,
      category_id: categoryId
    });

    if (insertError) {
      throw insertError;
    }

    const links = clientIds.map((clientId) => ({
      file_id: fileId,
      client_user_id: clientId
    }));

    if (links.length) {
      const { error: linkError } = await supabase.from('file_clients').insert(links);
      if (linkError) {
        throw linkError;
      }
    }
  }

  async createSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

    if (error || !data?.signedUrl) {
      throw error ?? new Error('No se pudo generar el enlace firmado.');
    }

    return data.signedUrl;
  }
}