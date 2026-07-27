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

export const STATUS_CONFIG: Record<LeadStatus, { label: string; cls: string }> = {
  not_contacted: { label: 'New', cls: 'badge-new' },
  contacted: { label: 'Sent', cls: 'badge-sent' },
  responded: { label: 'Replied', cls: 'badge-replied' },
  closed: { label: 'Closed', cls: 'badge-closed' }
};

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];
