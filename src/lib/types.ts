export interface Lead {
  id: number;
  company_name: string;
  website: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  status: 'not_contacted' | 'contacted' | 'responded' | 'closed';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactLog {
  id: number;
  lead_id: number;
  action: string;
  notes: string | null;
  created_at: string;
}

export type LeadStatus = Lead['status'];

export const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  not_contacted: { label: 'New', color: 'text-stone-600', bg: 'bg-stone-100' },
  contacted: { label: 'Sent', color: 'text-accent', bg: 'bg-accent-light' },
  responded: { label: 'Replied', color: 'text-success', bg: 'bg-success-light' },
  closed: { label: 'Closed', color: 'text-text-muted', bg: 'bg-bg-input' }
};

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];
