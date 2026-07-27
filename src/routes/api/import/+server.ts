import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { importLeads, type CreateLeadInput } from '$lib/db';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { leads } = body as { leads: CreateLeadInput[] };

    if (!Array.isArray(leads) || leads.length === 0) {
      return json({ error: 'leads array is required and must not be empty' }, { status: 400 });
    }

    const validLeads = leads.filter(l => l.company_name && l.website);
    if (validLeads.length === 0) {
      return json({ error: 'No valid leads found (each lead needs company_name and website)' }, { status: 400 });
    }

    const result = importLeads(validLeads);
    return json({
      message: `Import complete: ${result.imported} imported, ${result.skipped} skipped (duplicates)`,
      ...result
    });
  } catch (e: any) {
    return json({ error: e.message || 'Failed to import leads' }, { status: 500 });
  }
};
