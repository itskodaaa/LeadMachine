import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { importLeads } from '$lib/db';

const FIELD_MAP: Record<string, string> = {
  company: 'company_name', companyname: 'company_name', company_name: 'company_name',
  name: 'company_name', business: 'company_name', businessname: 'company_name',
  org: 'company_name', organization: 'company_name', firm: 'company_name',
  builder: 'company_name', contractor: 'company_name', construction: 'company_name',

  website: 'website', url: 'website', site: 'website', webpage: 'website',
  homepage: 'website', domain: 'website', web: 'website', link: 'website',
  websiteurl: 'website', companywebsite: 'website', company_url: 'website',

  city: 'city', town: 'city', municipality: 'city', locality: 'city',
  metro: 'city', metroarea: 'city',

  state: 'state', region: 'state', province: 'state', territory: 'state',
  stateprovince: 'state', state_region: 'state',

  phone: 'phone', telephone: 'phone', tel: 'phone', mobile: 'phone',
  cell: 'phone', phone_number: 'phone', phonenumber: 'phone',
  contact_number: 'phone', office_phone: 'phone', officephone: 'phone',

  email: 'email', emailaddress: 'email', email_address: 'email',
  mail: 'email', contact_email: 'email',

  contact: 'contact_person', contactperson: 'contact_person', contact_name: 'contact_person',
  contactname: 'contact_person', person: 'contact_person', owner: 'contact_person',
  manager: 'contact_person', person_name: 'contact_person', fullname: 'contact_person',
  name_contact: 'contact_person', primary_contact: 'contact_person',

  notes: 'notes', note: 'notes', comments: 'notes', description: 'notes',
  details: 'notes', info: 'notes', additional_info: 'notes', remarks: 'notes',

  status: 'status', lead_status: 'status', leadstatus: 'status', stage: 'status',
};

const STATUS_MAP: Record<string, string> = {
  new: 'not_contacted', fresh: 'not_contacted',
  not_contacted: 'not_contacted', untouched: 'not_contacted', inactive: 'not_contacted',
  open: 'not_contacted', lead: 'not_contacted', prospect: 'not_contacted',

  pending: 'pending', snooze: 'pending', snoozed: 'pending',

  contacted: 'contacted', sent: 'contacted', outreach: 'contacted',
  reached_out: 'contacted', emailed: 'contacted', called: 'contacted',
  in_progress: 'contacted', active: 'contacted', working: 'contacted',
  follow_up: 'contacted', followup: 'contacted',

  responded: 'responded', replied: 'responded', interested: 'responded',
  engaged: 'responded', callback: 'responded', meeting: 'responded',
  qualified: 'responded', warm: 'responded', hot: 'responded',
  proposal_sent: 'responded', negotiating: 'responded',

  unreachable: 'unable_to_reach', unable_to_reach: 'unable_to_reach',
  unabletoreach: 'unable_to_reach', no_reply: 'unable_to_reach',
  noreply: 'unable_to_reach', no_response: 'unable_to_reach',
  noresponse: 'unable_to_reach', failed_contact: 'unable_to_reach',
  failed: 'unable_to_reach',

  won: 'won', job_won: 'won', jobwon: 'won', wonjob: 'won',
  won_job: 'won', success: 'won',

  closed: 'closed', lost: 'closed', dead: 'closed',
  done: 'closed', complete: 'closed', completed: 'closed',
  converted: 'closed', customer: 'closed', client: 'closed',
  archived: 'closed', inactive_closed: 'closed',
};

function normalizeValue(v: any): string {
  if (v == null) return '';
  return String(v).trim();
}

function extractDomain(url: string): string {
  let s = url.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
  s = s.replace(/\/+$/, '');
  s = s.split('/')[0];
  s = s.split('?')[0].split('#')[0];
  return s;
}

function isWebsite(s: string): boolean {
  if (!s) return false;
  const d = extractDomain(s);
  return d.includes('.') && d.length > 3 && !d.includes(' ');
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isPhone(s: string): boolean {
  const digits = s.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function isState(s: string): boolean {
  if (!s) return false;
  const up = s.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(up)) return true;
  const states = ['alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia','hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland','massachusetts','michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new hampshire','new jersey','new mexico','new york','north carolina','north dakota','ohio','oklahoma','oregon','pennsylvania','rhode island','south carolina','south dakota','tennessee','texas','utah','vermont','virginia','washington','west virginia','wisconsin','wyoming'];
  return states.includes(up.toLowerCase());
}

function detectField(key: string, value: string): string | null {
  const clean = key.toLowerCase().replace(/[^a-z]/g, '');
  if (FIELD_MAP[clean]) return FIELD_MAP[clean];

  if (isWebsite(value)) return 'website';
  if (isEmail(value)) return 'email';
  if (isPhone(value)) return 'phone';
  if (isState(value)) return 'state';
  return null;
}

function normalizeLead(raw: Record<string, any>): Record<string, string> | null {
  const lead: Record<string, string> = {};
  const values: Record<string, string> = {};

  for (const [k, v] of Object.entries(raw)) {
    values[k] = normalizeValue(v);
  }

  for (const [k, v] of Object.entries(values)) {
    if (!v) continue;
    const clean = k.toLowerCase().replace(/[^a-z]/g, '');
    const mapped = FIELD_MAP[clean] || detectField(k, v);
    if (mapped && !lead[mapped]) {
      lead[mapped] = v;
    }
  }

  for (const [k, v] of Object.entries(values)) {
    if (!v) continue;
    if (!lead.website && isWebsite(v)) lead.website = v;
    else if (!lead.email && isEmail(v)) lead.email = v;
    else if (!lead.phone && isPhone(v)) lead.phone = v;
    else if (!lead.state && isState(v)) lead.state = v;
    else if (!lead.company_name && v.length > 2 && v.length < 100 && !v.includes('@') && !v.includes('://')) {
      lead.company_name = v;
    }
  }

  if (lead.website) {
    lead.website = extractDomain(lead.website);
  }

  if (lead.state) {
    const s = lead.state.trim().toUpperCase();
    if (s.length > 2) {
      const abbrev: Record<string, string> = { alabama:'AL', alaska:'AK', arizona:'AZ', arkansas:'AR', california:'CA', colorado:'CO', connecticut:'CT', delaware:'DE', florida:'FL', georgia:'GA', hawaii:'HI', idaho:'ID', illinois:'IL', indiana:'IN', iowa:'IA', kansas:'KS', kentucky:'KY', louisiana:'LA', maine:'ME', maryland:'MD', massachusetts:'MA', michigan:'MI', minnesota:'MN', mississippi:'MS', missouri:'MO', montana:'MT', nebraska:'NE', nevada:'NV', 'new hampshire':'NH', 'new jersey':'NJ', 'new mexico':'NM', 'new york':'NY', 'north carolina':'NC', 'north dakota':'ND', ohio:'OH', oklahoma:'OK', oregon:'OR', pennsylvania:'PA', 'rhode island':'RI', 'south carolina':'SC', 'south dakota':'SD', tennessee:'TN', texas:'TX', utah:'UT', vermont:'VT', virginia:'VA', washington:'WA', 'west virginia':'WV', wisconsin:'WI', wyoming:'WY' };
      lead.state = abbrev[s.toLowerCase()] || s;
    } else {
      lead.state = s;
    }
  }

  if (lead.status) {
    const s = lead.status.toLowerCase().trim().replace(/[^a-z_]/g, '');
    lead.status = STATUS_MAP[s] || 'not_contacted';
  }

  if (!lead.website && !lead.company_name) return null;

  if (!lead.company_name && lead.website) {
    lead.company_name = lead.website.split('.')[0]
      .replace(/-/g, ' ').replace(/_/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
  }

  if (!lead.website && lead.company_name) {
    const slug = lead.company_name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\s+/g, '');
    lead.website = slug + '.com';
  }

  return lead;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    let rawItems: any[] = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();

      if (Array.isArray(body)) {
        rawItems = body;
      } else if (body && typeof body === 'object') {
        if (body.leads && Array.isArray(body.leads)) {
          rawItems = body.leads;
        } else if (body.data && Array.isArray(body.data)) {
          rawItems = body.data;
        } else if (body.contacts && Array.isArray(body.contacts)) {
          rawItems = body.contacts;
        } else if (body.results && Array.isArray(body.results)) {
          rawItems = body.results;
        } else if (body.companies && Array.isArray(body.companies)) {
          rawItems = body.companies;
        } else if (body.records && Array.isArray(body.records)) {
          rawItems = body.records;
        } else {
          rawItems = [body];
        }
      }
    } else if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      const text = await request.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        return json({ error: 'CSV needs a header row and at least one data row' }, { status: 400 });
      }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
        rawItems.push(row);
      }
    } else {
      const body = await request.json();
      if (Array.isArray(body)) rawItems = body;
      else if (body.leads) rawItems = body.leads;
      else rawItems = [body];
    }

    if (rawItems.length === 0) {
      return json({ error: 'No data found to import' }, { status: 400 });
    }

    const leads = rawItems.map(normalizeLead).filter(Boolean) as Record<string, string>[];

    if (leads.length === 0) {
      return json({ error: 'Could not extract any valid leads. Need at least a company name or website.' }, { status: 400 });
    }

    const result = importLeads(leads);
    return json({
      message: `Import complete: ${result.imported} imported, ${result.skipped} skipped (duplicates)`,
      ...result
    });
  } catch (e: any) {
    return json({ error: e.message || 'Failed to import leads' }, { status: 500 });
  }
};
