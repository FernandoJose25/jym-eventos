import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  const data = await req.json();
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return NextResponse.json({ ok: false });
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'J&M Admin <notificaciones@resend.dev>',
        to: [process.env.ADMIN_EMAIL || 'djjofer.25@gmail.com'],
        subject: `📩 Nueva cotización — ${data.nombre} — ${data.tipoEvento || 'Sin especificar'}`,
        html: `<div style="font-family:sans-serif;max-width:520px"><h2 style="color:#1e3a5f">Nueva cotización J&M</h2><table>${Object.entries(data).filter(([k])=>!['fechaEnvio','estado','leido','origen'].includes(k)).map(([k,v])=>`<tr><td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px">${k}</td><td style="font-weight:600;font-size:13px">${v}</td></tr>`).join('')}</table><a href="https://wa.me/${(data.telefono||'').replace(/\D/g,'')}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#25d366;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">Responder WhatsApp</a></div>`,
      }),
    });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: false }); }
}
