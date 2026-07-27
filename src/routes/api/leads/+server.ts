import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLeads, createLead, getStats, type CreateLeadInput } from '$lib/db';

export const GET: RequestHandler = ({ url }) => {
  const search = url.searchParams.get('search') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const state = url.searchParams.get('state') || undefined;
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '25');
  const statsOnly = url.searchParams.get('stats') === 'true';

  if (statsOnly) {
    return json(getStats());
  }

  const result = getLeads({ search, status, state, page, limit });
  return json(result);
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json() as CreateLeadInput;

    if (!body.company_name || !body.website) {
      return json({ error: 'company_name and website are required' }, { status: 400 });
    }

    const lead = createLead(body);
    return json(lead, { status: 201 });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint')) {
      return json({ error: 'A lead with this website already exists' }, { status: 409 });
    }
    return json({ error: e.message || 'Failed to create lead' }, { status: 500 });
  }
};
