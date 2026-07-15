// CRUD de compromissos escopados por usuário (isolamento no servidor).
// GET    /api/appointments        → lista do usuário logado
// POST   /api/appointments        → cria
// PUT    /api/appointments/:id    → atualiza (só do próprio usuário)
// DELETE /api/appointments/:id    → remove (só do próprio usuário)
const { getSql, isConfigured } = require('./_lib/db');
const { requireAuth } = require('./_lib/auth');
const { readJsonBody } = require('./_lib/http');

// Campos editáveis (whitelist — user_id nunca vem do corpo).
const FIELDS = [
  'title', 'specialty', 'date_iso', 'time',
  'location', 'notes', 'status', 'category', 'color', 'initials',
];

// Coluna quoteada quando necessário (a coluna "time" é palavra-reservada no SQL).
function col(f) {
  return f === 'time' ? '"time"' : f;
}

// Extrai o :id da URL (req.query.id na Vercel ou do path /api/appointments/:id).
function getIdFromReq(req) {
  if (req.query && req.query.id) return String(req.query.id);
  const url = req.url ? req.url.split('?')[0] : '';
  const m = url.match(/\/api\/appointments\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

module.exports = async function handler(req, res) {
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  if (!isConfigured()) {
    return res.status(500).json({ error: 'Banco de dados não configurado no servidor.' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const sql = getSql();

    if (req.method === 'GET') {
      const rows = await sql`
        select id, title, specialty, date_iso, "time", location, notes,
               status, category, color, initials
        from appointments
        where user_id = ${user.id}
        order by date_iso asc, "time" asc`;
      return res.status(200).json({ appointments: rows });
    }

    if (req.method === 'POST') {
      let body;
      try {
        body = await readJsonBody(req);
      } catch {
        return res.status(400).json({ error: 'Corpo da requisição inválido.' });
      }

      const title = String(body?.title || '').trim();
      if (!title) {
        return res.status(400).json({ error: 'O título é obrigatório.' });
      }

      const rows = await sql`
        insert into appointments (
          user_id, title, specialty, date_iso, "time", location, notes,
          status, category, color, initials
        ) values (
          ${user.id},
          ${title},
          ${String(body?.specialty || '')},
          ${String(body?.date_iso || '')},
          ${String(body?.time || '')},
          ${String(body?.location || '')},
          ${String(body?.notes || '')},
          ${String(body?.status || '')},
          ${String(body?.category || '')},
          ${String(body?.color || '')},
          ${String(body?.initials || '')}
        )
        returning id, title, specialty, date_iso, "time", location, notes,
                  status, category, color, initials`;
      return res.status(201).json({ appointment: rows[0] });
    }

    // PUT e DELETE precisam do :id.
    const id = getIdFromReq(req);
    if (!id) {
      return res.status(400).json({ error: 'ID do compromisso não informado.' });
    }

    if (req.method === 'PUT') {
      let body;
      try {
        body = await readJsonBody(req);
      } catch {
        return res.status(400).json({ error: 'Corpo da requisição inválido.' });
      }

      // Monta o SET apenas com os campos presentes no corpo (whitelist).
      const updates = [];
      const params = [];
      let idx = 1;
      for (const f of FIELDS) {
        if (Object.prototype.hasOwnProperty.call(body, f)) {
          updates.push(`${col(f)} = $${idx++}`);
          params.push(String(body[f] ?? ''));
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
      }

      // Filtro de segurança: id E user_id (nunca só o id).
      params.push(id);       // $idx
      params.push(user.id);  // $idx+1

      const result = await sql.unsafe(
        `update appointments set ${updates.join(', ')} ` +
        `where id = $${idx} and user_id = $${idx + 1} ` +
        `returning id, title, specialty, date_iso, "time", location, notes, ` +
        `status, category, color, initials`,
        params
      );
      if (!result || result.length === 0) {
        return res.status(404).json({ error: 'Compromisso não encontrado.' });
      }
      return res.status(200).json({ appointment: result[0] });
    }

    // DELETE — também filtra por user_id (segurança).
    const del = await sql`
      delete from appointments
      where id = ${id} and user_id = ${user.id}`;
    if (!del || del.length === 0) {
      return res.status(404).json({ error: 'Compromisso não encontrado.' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(`[appointments] erro: ${e?.message || e}`);
    return res.status(500).json({ error: 'Erro ao processar a requisição.' });
  }
};
