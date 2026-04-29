import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase.client';
import { Profile } from '../models/profile.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  private profileSubject = new BehaviorSubject<Profile | null>(null);
  private readySubject = new BehaviorSubject<boolean>(false);

  session$ = this.sessionSubject.asObservable();
  profile$ = this.profileSubject.asObservable();
  ready$ = this.readySubject.asObservable();

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    this.sessionSubject.next(data.session ?? null);

    if (data.session?.user) {
      await this.loadProfile(data.session.user.id);
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionSubject.next(session);
      if (session?.user) {
        void this.loadProfile(session.user.id);
      } else {
        this.profileSubject.next(null);
      }
    });

    this.readySubject.next(true);
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    if (data.session?.user) {
      await this.loadProfile(data.session.user.id);
    }
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    this.sessionSubject.next(null);
    this.profileSubject.next(null);
  }

  async setSession(accessToken: string, refreshToken: string): Promise<void> {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (error) {
      throw error;
    }
    if (data.session?.user) {
      await this.loadProfile(data.session.user.id);
    }
  }

  async exchangeCodeForSession(code: string): Promise<void> {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    if (data.session?.user) {
      await this.loadProfile(data.session.user.id);
    }
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw error;
    }
  }

  async resetPasswordForEmail(email: string, redirectTo: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      throw error;
    }
  }

  async getHomeRoute(): Promise<string> {
    const profile = this.profileSubject.value;
    if (!profile) {
      return '/login';
    }
    return profile.role === 'administrator' ? '/admin/clientes' : '/client/archivos';
  }

  async getAccessToken(): Promise<string> {
    const session = this.sessionSubject.value;
    if (session?.access_token) {
      return session.access_token;
    }
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }

  getCurrentUserId(): string | null {
    return this.sessionSubject.value?.user?.id ?? null;
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      await this.signOut();
      return;
    }

    if (!data.is_active) {
      await this.signOut();
      return;
    }

    this.profileSubject.next(data as Profile);
  }
}
