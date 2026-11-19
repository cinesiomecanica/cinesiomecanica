// Webhook do Mercado Pago → libera o acesso na tabela public.assinantes.
// Segredos (Supabase > Edge Functions > Secrets): MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET.
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem em toda Edge Function.
// Publicar com "Verify JWT" DESLIGADO: o Mercado Pago não envia token do Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';

const MP = 'https://api.mercadopago.com';
const TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
const SEGREDO = Deno.env.get('MP_WEBHOOK_SECRET') ?? '';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const DIA = 86_400_000;
const FOLGA = 3 * DIA; // dias extras para o cartão ser cobrado na renovação

async function mp(caminho: string) {
  const r = await fetch(MP + caminho, { headers: { Authorization: 'Bearer ' + TOKEN } });
  if (!r.ok) throw new Error(`MP ${caminho} → ${r.status} ${await r.text()}`);
  return r.json();
}

async function hmac(chave: string, texto: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(chave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(texto));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
async function assinaturaValida(req: Request, dataId: string) {
  if (!SEGREDO) return true;
  const xs = req.headers.get('x-signature') ?? '', rid = req.headers.get('x-request-id') ?? '';
  const partes = Object.fromEntries(xs.split(',').map(p => p.trim().split('=') as [string, string]));
  if (!partes.ts || !partes.v1) return false;
  let manifesto = '';
  if (dataId) manifesto += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (rid) manifesto += `request-id:${rid};`;
  manifesto += `ts:${partes.ts};`;
  return (await hmac(SEGREDO, manifesto)) === partes.v1;
}

function planoPor(meses: number) {
  return meses >= 12 ? 'anual' : meses >= 6 ? 'semestral' : 'mensal';
}
function mesesDe(ar: { frequency?: number; frequency_type?: string } = {}) {
  const f = Number(ar.frequency) || 1;
  return ar.frequency_type === 'days' ? Math.max(1, Math.round(f / 30)) : f;
}

async function emailDoPagador(pre: any): Promise<string> {
  if (pre.payer_email) return String(pre.payer_email).toLowerCase();
  if (pre.payer_id) {
    try {
      const r = await mp(`/v1/payments/search?sort=date_created&criteria=desc&limit=1&payer.id=${pre.payer_id}`);
      const e = r?.results?.[0]?.payer?.email;
      if (e) return String(e).toLowerCase();
    } catch (_) { /* segue sem e-mail */ }
  }
  return '';
}

async function liberar(email: string, plano: string, ate: Date, ref: string, obs: string) {
  if (!email) throw new Error('assinatura sem e-mail do pagador: ' + ref);
  const { data: atual } = await db.from('assinantes').select('valido_ate').eq('email', email).maybeSingle();
  const antes = atual ? new Date(atual.valido_ate).getTime() : 0;
  const novo = new Date(Math.max(antes, ate.getTime())); // nunca encurta um acesso que já existe
  const { error } = await db.from('assinantes').upsert({
    email, plano, valido_ate: novo.toISOString(), origem: 'mercadopago', ref, obs, atualizado_em: new Date().toISOString(),
  });
  if (error) throw error;
  return novo;
}


// Pix pré-pago (função "pix"): soma 1, 6 ou 12 meses ao acesso, a partir de hoje ou do fim do acesso atual.
const PIX: Record<string, { meses: number; preco: number }> = { mensal: { meses: 1, preco: 15 }, semestral: { meses: 6, preco: 60 }, anual: { meses: 12, preco: 100 } };
async function trataPix(pg: any) {
  const [, plano, email] = String(pg.external_reference).split('|');
  const cfg = PIX[plano];
  if (!cfg || !email) return `pix ${pg.id}: referência inválida`;
  if (Number(pg.transaction_amount) + 0.001 < cfg.preco) return `pix ${pg.id}: valor ${pg.transaction_amount} menor que o do plano`;
  const ref = 'pix:' + pg.id;
  const { data: atual } = await db.from('assinantes').select('valido_ate, ref').eq('email', email).maybeSingle();
  if (atual?.ref === ref) return `pix ${pg.id}: já liberado`; // o Mercado Pago avisa mais de uma vez
  const base = new Date(Math.max(Date.now(), atual ? new Date(atual.valido_ate).getTime() : 0));
  base.setMonth(base.getMonth() + cfg.meses);
  const { error } = await db.from('assinantes').upsert({
    email, plano: plano + '-pix', valido_ate: base.toISOString(), origem: 'mercadopago-pix', ref,
    obs: `Pix · ${plano} · R$ ${pg.transaction_amount}`, atualizado_em: new Date().toISOString(),
  });
  if (error) throw error;
  return `ok pix ${email} até ${base.toISOString()}`;
}

async function trataAssinatura(preId: string, pagoAgora = false) {
  const pre = await mp('/preapproval/' + preId);
  if (pre.status !== 'authorized' && !pagoAgora) return `assinatura ${preId}: ${pre.status}`;
  const meses = mesesDe(pre.auto_recurring);
  const email = await emailDoPagador(pre);
  let ate: Date;
  if (pre.next_payment_date) ate = new Date(new Date(pre.next_payment_date).getTime() + FOLGA);
  else { ate = new Date(); ate.setMonth(ate.getMonth() + meses); ate = new Date(ate.getTime() + FOLGA); }
  const fim = await liberar(email, planoPor(meses), ate, preId, `Mercado Pago · ${pre.reason ?? ''}`.trim());
  return `ok ${email} até ${fim.toISOString()}`;
}

Deno.serve(async (req) => {
  if (req.method === 'GET') return new Response('ok');
  const url = new URL(req.url);
  let corpo: any = {};
  try { corpo = await req.json(); } catch (_) { /* notificações antigas vêm só na URL */ }
  const tipo = corpo.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic') ?? '';
  const id = String(corpo?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '');

  // avisos de pagamento são conferidos direto na API do Mercado Pago (com o nosso token), então um aviso falso não libera nada
  if (tipo !== 'payment' && !(await assinaturaValida(req, url.searchParams.get('data.id') ?? id))) {
    console.warn('assinatura inválida', tipo, id);
    return new Response('assinatura inválida', { status: 401 });
  }

  try {
    let msg = 'ignorado: ' + tipo;
    if (tipo === 'subscription_preapproval' || tipo === 'preapproval') {
      msg = await trataAssinatura(id);
    } else if (tipo === 'subscription_authorized_payment' || tipo === 'authorized_payment') {
      const ap = await mp('/authorized_payments/' + id);
      const aprovado = ap?.payment?.status === 'approved' || ap?.status === 'processed';
      msg = aprovado && ap.preapproval_id ? await trataAssinatura(ap.preapproval_id, true) : `cobrança ${id}: ${ap?.payment?.status ?? ap?.status}`;
    } else if (tipo === 'payment') {
      const pg = await mp('/v1/payments/' + id);
      const pre = pg?.metadata?.preapproval_id ?? pg?.point_of_interaction?.transaction_data?.subscription_id;
      if (pg.status === 'approved' && String(pg.external_reference ?? '').startsWith('pix|')) msg = await trataPix(pg);
      else if (pg.status === 'approved' && pre) msg = await trataAssinatura(pre, true);
      else msg = `pagamento ${id}: ${pg.status}`;
    }
    console.log(tipo, id, msg);
    return new Response(msg);
  } catch (e) {
    console.error(tipo, id, String(e));
    return new Response('erro: ' + String(e), { status: 500 }); // 500 faz o Mercado Pago tentar de novo
  }
});
