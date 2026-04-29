import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';
import { Category } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  async listCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order')
      .order('name');

    if (error) {
      throw error;
    }

    return (data || []) as Category[];
  }

  async createCategory(name: string, displayOrder: number = 0): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, display_order: displayOrder })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Category;
  }

  async updateCategory(id: string, payload: Partial<Pick<Category, 'name' | 'display_order'>>): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  async hasFiles(categoryId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('files')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    if (error) {
      throw error;
    }

    return (count ?? 0) > 0;
  }

  async countFilesByCategoryForClient(clientUserId: string): Promise<Map<string | null, number>> {
    const { data, error } = await supabase
      .from('files')
      .select('category_id, file_clients!inner(client_user_id)')
      .eq('file_clients.client_user_id', clientUserId);

    if (error) {
      throw error;
    }

    const counts = new Map<string | null, number>();
    for (const file of (data || [])) {
      const catId = (file as any).category_id ?? null;
      counts.set(catId, (counts.get(catId) ?? 0) + 1);
    }
    return counts;
  }
}
