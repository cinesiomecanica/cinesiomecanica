// Envia o e-mail de boas-vindas quando um administrador libera acesso no /admin.
// Quem ainda não tem conta recebe um convite do Supabase (link para criar a senha).
// Quem já tem conta não recebe nada: basta entrar normalmente.
// Publicar com "Verify JWT" DESLIGADO: a função confere o login do administrador aqui dentro.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SITE = 'https://cinesiomecanica.com.br';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resp = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resp({ erro: 'método' }, 405);

  // 1. quem chamou é administrador?
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: quem } = await db.auth.getUser(jwt);
  const emailAdmin = quem?.user?.email?.toLowerCase();
  if (!emailAdmin) return resp({ erro: 'Faça login de novo.' }, 401);
  const { data: adm } = await db.from('admins').select('email').eq('email', emailAdmin).maybeSingle();
  if (!adm) return resp({ erro: 'Só administradores podem convidar.' }, 403);

  // 2. convida
  let corpo: any = {};
  try { corpo = await req.json(); } catch (_) { /* vazio */ }
  const email = String(corpo.email ?? '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return resp({ erro: 'E-mail inválido.' }, 400);

  const { error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: SITE + '/entrar/?nova=1' });
  if (!error) return resp({ ok: true, status: 'convidado' });
  if (/already|registered|exists/i.test(error.message)) return resp({ ok: true, status: 'ja_tem_conta' });
  console.error('convite', email, error.message);
  return resp({ erro: error.message }, 500);
});
