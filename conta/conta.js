// Conta e acesso da Cinesiomecânica (Supabase)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

export async function usuario() {
  const { data } = await sb.auth.getSession();
  return data.session ? data.session.user : null;
}

// true se a pessoa tem assinatura válida (ou é administradora)
export async function temAcesso() {
  const { data, error } = await sb.rpc('tem_acesso');
  if (error) { console.error(error); return false; }
  return !!data;
}

export async function ehAdmin() {
  const { data, error } = await sb.rpc('eh_admin');
  if (error) return false;
  return !!data;
}

export async function minhaAssinatura() {
  const u = await usuario(); if (!u) return null;
  const { data } = await sb.from('assinantes').select('*').eq('email', (u.email || '').toLowerCase()).maybeSingle();
  return data;
}

// conteúdo protegido (fichas e textos), guardado no cofre privado
export async function carregarDados() {
  const { data, error } = await sb.storage.from('conteudo').download('dados.json');
  if (error) throw error;
  return JSON.parse(await data.text());
}

export async function sair(destino = '/') { await sb.auth.signOut(); location.href = destino; }
