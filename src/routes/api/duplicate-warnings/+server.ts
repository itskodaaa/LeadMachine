import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';

// Fetch active duplicate warnings
export const GET: RequestHandler = async () => {
  try {
    const warnings = db.prepare('SELECT * FROM duplicate_warnings WHERE dismissed = 0 ORDER BY created_at DESC').all();
    return json({ warnings });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
};

// Dismiss one or all warnings
export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { id, all = false } = body;

    if (all) {
      db.prepare('DELETE FROM duplicate_warnings').run();
      return json({ message: 'All duplicate warnings cleared' });
    } else if (id != null) {
      db.prepare('DELETE FROM duplicate_warnings WHERE id = ?').run(id);
      return json({ message: `Duplicate warning ${id} dismissed` });
    }

    return json({ error: 'id or all parameter is required' }, { status: 400 });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
};
