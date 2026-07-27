import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLeadById, updateLead, deleteLead, addContactLog, getContactLogs, type UpdateLeadInput } from '$lib/db';

export const GET: RequestHandler = ({ params }) => {
  const lead = getLeadById(Number(params.id));
  if (!lead) {
    return json({ error: 'Lead not found' }, { status: 404 });
  }
  const logs = getContactLogs(Number(params.id));
  return json({ ...lead, logs });
};

export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const body = await request.json() as UpdateLeadInput;
    const existing = getLeadById(Number(params.id));
    if (!existing) {
      return json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = updateLead(Number(params.id), body);
    return json(lead);
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint')) {
      return json({ error: 'A lead with this website already exists' }, { status: 409 });
    }
    return json({ error: e.message || 'Failed to update lead' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = ({ params }) => {
  const existing = getLeadById(Number(params.id));
  if (!existing) {
    return json({ error: 'Lead not found' }, { status: 404 });
  }
  deleteLead(Number(params.id));
  return json({ success: true });
};
