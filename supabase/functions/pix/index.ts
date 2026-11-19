// Gera uma cobrança Pix pré-paga no Mercado Pago (1, 6 ou 12 meses de acesso, sem renovação automática).
// Recebe { email, plano } do site e devolve { url } do checkout do Mercado Pago, que aceita só Pix e saldo da conta.
// Usa o segredo MP_ACCESS_TOKEN, o mesmo da função "mercadopago". Pode ficar com "Verify JWT" ligado:
// o site chama com a chave anon.
const MP = 'https://api.mercadopago.com';
const TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
const SITE = 'https://cinesiomecanica.com.br';
const WEBHOOK = (Deno.env.get('SUPABASE_URL') ?? '') + '/functions/v1/mercadopago';
const PLANOS: Record<string, { nome: string; preco: number }> = {
  mensal: { nome: 'Mensal · 1 mês', preco: 15 },
  semestral: { nome: 'Semestral · 6 meses', preco: 60 },
  anual: { nome: 'Anual · 12 meses', preco: 100 },
};
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resp = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resp({ erro: 'use POST' }, 405);
  let b: any = {};
  try { b = await req.json(); } catch (_) { /* corpo vazio */ }
  const email = String(b.email ?? '').trim().toLowerCase();
  const plano = String(b.plano ?? '');
  const p = PLANOS[plano];
  if (!p) return resp({ erro: 'Plano inválido.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return resp({ erro: 'Digite um e-mail válido.' }, 400);

  const volta = `${SITE}/entrar/?pago=1&pix=1&email=${encodeURIComponent(email)}`;
  const pref = {
    items: [{ id: 'cinesio-' + plano, title: 'Cinesiomecânica ' + p.nome + ' (Pix)', description: 'Acesso ao atlas 3D Cinesiomecânica', category_id: 'learnings', quantity: 1, currency_id: 'BRL', unit_price: p.preco }],
    payer: { email },
    payment_methods: { excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }, { id: 'prepaid_card' }], installments: 1 },
    external_reference: `pix|${plano}|${email}`,
    metadata: { plano, email, origem: 'pix' },
    notification_url: WEBHOOK,
    back_urls: { success: volta, pending: volta, failure: SITE + '/#planos' },
    auto_return: 'approved',
    statement_descriptor: 'CINESIOMECANICA',
  };
  const r = await fetch(MP + '/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(pref),
  });
  if (!r.ok) { console.error('preferência', r.status, await r.text()); return resp({ erro: 'Não foi possível gerar o Pix agora. Tente de novo em instantes.' }, 502); }
  const d = await r.json();
  console.log('pix', plano, email, d.id);
  return resp({ url: d.init_point });
});
