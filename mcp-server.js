import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'data', 'leads.db');

const tools = [
  {
    name: "leadflow__add_lead",
    description: "Add a single new construction lead to LeadFlow. Performs duplicate checking by company name and website domain. Warns the agent if the lead already exists and provides its ID so they can update it.",
    inputSchema: {
      type: "object",
      properties: {
        company_name: { type: "string", description: "The name of the construction company" },
        website: { type: "string", description: "Company website URL (e.g. abcconst.com or https://abcconst.com)." },
        city: { type: "string", description: "City location" },
        state: { type: "string", description: "Two-letter US state code" },
        phone: { type: "string", description: "Phone number" },
        email: { type: "string", description: "Contact email address" },
        contact_person: { type: "string", description: "Primary contact person's name" },
        notes: { type: "string", description: "Any notes or details about the company" }
      },
      required: ["company_name", "website"]
    }
  },
  {
    name: "leadflow__add_leads_batch",
    description: "Add multiple construction leads to LeadFlow in a batch. Performs duplicate checks based on deduplicate_mode.",
    inputSchema: {
      type: "object",
      properties: {
        leads: {
          type: "array",
          items: {
            type: "object",
            properties: {
              company_name: { type: "string", description: "The name of the construction company" },
              website: { type: "string", description: "Company website URL" },
              city: { type: "string", description: "City location" },
              state: { type: "string", description: "Two-letter US state code" },
              phone: { type: "string", description: "Phone number" },
              email: { type: "string", description: "Contact email address" },
              contact_person: { type: "string", description: "Primary contact person's name" },
              notes: { type: "string", description: "Any notes or details about the company" }
            },
            required: ["company_name", "website"]
          }
        },
        deduplicate_mode: { type: "string", enum: ["skip", "update", "error", "off"], description: "Mode for duplicate check handling. 'off' bypasses checks, 'skip' ignores duplicates silently, 'update' upserts fields, 'error' skips and logs warnings.", default: "error" }
      },
      required: ["leads"]
    }
  },
  {
    name: "leadflow__import_csv",
    description: "Bulk import construction leads from a CSV formatted string. Extremely fast and recommended for high-volume adds.",
    inputSchema: {
      type: "object",
      properties: {
        csv_content: { type: "string", description: "The full CSV content string to import." },
        deduplicate_mode: { type: "string", enum: ["skip", "update", "error", "off"], description: "Mode for duplicate check handling. 'off' bypasses checks, 'skip' ignores duplicates silently, 'update' upserts fields, 'error' skips and logs warnings.", default: "error" }
      },
      required: ["csv_content"]
    }
  },
  {
    name: "leadflow__import_from_json",
    description: "Bulk import construction leads from a JSON array or a JSON array string. Extremely fast and recommended for high-volume adds.",
    inputSchema: {
      type: "object",
      properties: {
        json_content: { type: "string", description: "JSON string containing an array of lead objects." },
        deduplicate_mode: { type: "string", enum: ["skip", "update", "error", "off"], description: "Mode for duplicate check handling.", default: "error" }
      },
      required: ["json_content"]
    }
  },
  {
    name: "leadflow__clear_duplicate_warnings",
    description: "Clear/dismiss all active duplicate warning logs in the system.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "leadflow__list_leads",
    description: "Retrieve a paginated list of leads currently stored in the database.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max number of leads to return (default 50, max 100)" },
        offset: { type: "integer", description: "Offset for pagination (default 0)" }
      }
    }
  },
  {
    name: "leadflow__get_lead",
    description: "Retrieve complete details of a specific lead by its ID, including its associated contact logs.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "The unique ID of the lead" }
      },
      required: ["id"]
    }
  },
  {
    name: "leadflow__update_lead",
    description: "Update the fields of an existing lead in the database. Performs duplicate checks if modifying company_name or website.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "The ID of the lead to update" },
        company_name: { type: "string", description: "Updated company name" },
        website: { type: "string", description: "Updated website URL" },
        city: { type: "string", description: "Updated city" },
        state: { type: "string", description: "Updated state (two-letter code)" },
        phone: { type: "string", description: "Updated phone number" },
        email: { type: "string", description: "Updated email address" },
        contact_person: { type: "string", description: "Updated contact person name" },
        notes: { type: "string", description: "Updated notes" },
        status: { type: "string", enum: ["not_contacted", "pending", "contacted", "responded", "unable_to_reach", "won", "closed"], description: "Updated status" }
      },
      required: ["id"]
    }
  },
  {
    name: "leadflow__search_leads",
    description: "Search for leads matching a query term against company name, website, city, state, or notes.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query (term or keyword)" }
      },
      required: ["query"]
    }
  },
  {
    name: "leadflow__delete_lead",
    description: "Permanently delete a lead from the database by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "The ID of the lead to delete" }
      },
      required: ["id"]
    }
  },
  {
    name: "leadflow__export_csv",
    description: "Export leads from the database as a CSV formatted string.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["all", "not_contacted", "pending", "contacted", "responded", "unable_to_reach", "won", "closed"], description: "Optional status filter" }
      }
    }
  },
  {
    name: "leadflow__stats",
    description: "Retrieve database statistics, including lead counts grouped by status and state, and duplicate warnings count.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "leadflow__get_duplicates",
    description: "Retrieve active duplicate warnings logged by the system.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "leadflow__update_leads_batch",
    description: "Update fields of multiple existing leads in a batch. Performs duplicate validation checks.",
    inputSchema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "integer", description: "The unique ID of the lead to update" },
              company_name: { type: "string", description: "Updated company name" },
              website: { type: "string", description: "Updated website URL" },
              city: { type: "string", description: "Updated city" },
              state: { type: "string", description: "Updated state (two-letter code)" },
              phone: { type: "string", description: "Updated phone number" },
              email: { type: "string", description: "Updated email address" },
              contact_person: { type: "string", description: "Updated contact person name" },
              notes: { type: "string", description: "Updated notes" },
              status: { type: "string", enum: ["not_contacted", "pending", "contacted", "responded", "unable_to_reach", "won", "closed"], description: "Updated status" }
            },
            required: ["id"]
          }
        }
      },
      required: ["updates"]
    }
  }
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line);
    handleRequest(request);
  } catch (err) {
    sendError(null, -32700, "Parse error");
  }
});

function sendResponse(id, result) {
  console.log(JSON.stringify({
    jsonrpc: "2.0",
    id,
    result
  }));
}

function sendError(id, code, message) {
  console.log(JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code, message }
  }));
}

function normalizeWebsite(website) {
  if (!website) return '';
  return website.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .split('/')[0];
}

// Custom CSV Parser
function parseCSV(csvText) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    const next = csvText[i+1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  return lines;
}

// Unified high-performance bulk lead import logic supporting different deduplicate modes
function importLeadsBatch(db, leads, deduplicateMode = 'error') {
  let imported = 0;
  let skipped = 0;
  let updated = 0;
  const details = [];

  const insertStmt = db.prepare(`
    INSERT INTO leads (company_name, website, city, state, phone, email, contact_person, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'not_contacted')
  `);

  const updateStmt = db.prepare(`
    UPDATE leads 
    SET company_name = COALESCE(?, company_name),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        contact_person = COALESCE(?, contact_person),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  db.transaction(() => {
    for (const lead of leads) {
      const { company_name, website, city, state, phone, email, contact_person, notes } = lead;
      if (!company_name || !website) {
        skipped++;
        details.push({ company_name: company_name || "Unknown", website: website || "Unknown", status: "skipped", reason: "Missing required fields" });
        continue;
      }

      const normalized = normalizeWebsite(website);

      if (deduplicateMode === 'off') {
        insertStmt.run(
          company_name,
          normalized,
          city || null,
          state ? state.toUpperCase() : null,
          phone || null,
          email || null,
          contact_person || null,
          notes || null
        );
        imported++;
        details.push({ company_name, website: normalized, status: "imported" });
        continue;
      }

      // Check duplicates
      let existingLead = db.prepare('SELECT id, company_name, website FROM leads WHERE website = ?').get(normalized);
      let duplicateType = 'website';
      if (!existingLead) {
        existingLead = db.prepare('SELECT id, company_name, website FROM leads WHERE LOWER(company_name) = ?').get(company_name.toLowerCase());
        duplicateType = 'company_name';
      }

      if (existingLead) {
        if (deduplicateMode === 'skip') {
          skipped++;
          details.push({ company_name, website: normalized, status: "skipped", reason: `Duplicate ${duplicateType} (ID: ${existingLead.id})` });
        } else if (deduplicateMode === 'update') {
          updateStmt.run(
            company_name || null,
            city || null,
            state ? state.toUpperCase() : null,
            phone || null,
            email || null,
            contact_person || null,
            notes || null,
            existingLead.id
          );
          updated++;
          details.push({ company_name, website: normalized, status: "updated", id: existingLead.id });
        } else {
          // 'error' mode: Skips and logs database warning
          skipped++;
          const reason = `Duplicate ${duplicateType} found: '${duplicateType === 'website' ? normalized : company_name}' already exists (ID: ${existingLead.id}, Company: '${existingLead.company_name}').`;
          db.prepare(`
            INSERT INTO duplicate_warnings (company_name, website, reason, source)
            VALUES (?, ?, ?, 'mcp')
          `).run(company_name, normalized, reason);
          details.push({ company_name, website: normalized, status: "skipped", reason: `Duplicate warning created (Existing ID: ${existingLead.id})` });
        }
      } else {
        insertStmt.run(
          company_name,
          normalized,
          city || null,
          state ? state.toUpperCase() : null,
          phone || null,
          email || null,
          contact_person || null,
          notes || null
        );
        imported++;
        details.push({ company_name, website: normalized, status: "imported" });
      }
    }
  })();

  return { imported, skipped, updated, details };
}

function handleAddLead(args) {
  const { company_name, website, city, state, phone, email, contact_person, notes } = args;
  if (!company_name || !website) {
    return {
      isError: true,
      content: [{ type: "text", text: "Error: company_name and website are required." }]
    };
  }

  const normalized = normalizeWebsite(website);

  try {
    const db = new Database(dbPath);
    
    const existingWebsite = db.prepare('SELECT id, company_name FROM leads WHERE website = ?').get(normalized);
    if (existingWebsite) {
      const reason = `Website '${normalized}' already exists (Company: '${existingWebsite.company_name}').`;
      db.prepare(`
        INSERT INTO duplicate_warnings (company_name, website, reason, source)
        VALUES (?, ?, ?, 'mcp')
      `).run(company_name, normalized, reason);

      return {
        content: [{
          type: "text",
          text: `Warning: A lead with website '${normalized}' already exists (ID: ${existingWebsite.id}). Skipped adding.`
        }]
      };
    }

    const existingName = db.prepare('SELECT id, website FROM leads WHERE LOWER(company_name) = ?').get(company_name.toLowerCase());
    if (existingName) {
      const reason = `Company name '${company_name}' already exists (Website: '${existingName.website}').`;
      db.prepare(`
        INSERT INTO duplicate_warnings (company_name, website, reason, source)
        VALUES (?, ?, ?, 'mcp')
      `).run(company_name, normalized, reason);

      return {
        content: [{
          type: "text",
          text: `Warning: A lead with company name '${company_name}' already exists (ID: ${existingName.id}). Skipped adding.`
        }]
      };
    }

    const insert = db.prepare(`
      INSERT INTO leads (company_name, website, city, state, phone, email, contact_person, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'not_contacted')
    `);
    
    const result = insert.run(
      company_name,
      normalized,
      city || null,
      state ? state.toUpperCase() : null,
      phone || null,
      email || null,
      contact_person || null,
      notes || null
    );

    return {
      content: [{
        type: "text",
        text: `Success: Lead '${company_name}' was successfully added with ID ${result.lastInsertRowid}.`
      }]
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error writing to database: ${err.message}` }]
    };
  }
}

function handleAddLeadsBatch(args) {
  const { leads, deduplicate_mode = 'error' } = args;
  if (!Array.isArray(leads) || leads.length === 0) {
    return {
      isError: true,
      content: [{ type: "text", text: "Error: leads array is required and must not be empty." }]
    };
  }

  try {
    const db = new Database(dbPath);
    const result = importLeadsBatch(db, leads, deduplicate_mode);
    return {
      content: [{
        type: "text",
        text: `Batch completed: ${result.imported} leads successfully imported, ${result.updated} updated, ${result.skipped} skipped (duplicates/errors).`
      }]
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error processing batch: ${err.message}` }]
    };
  }
}

function handleImportCsv(args) {
  const { csv_content, deduplicate_mode = 'error' } = args;
  if (!csv_content) {
    return { isError: true, content: [{ type: "text", text: "Error: csv_content is required." }] };
  }

  try {
    const lines = parseCSV(csv_content);
    if (lines.length < 2) {
      return { content: [{ type: "text", text: "CSV is empty or contains no data rows." }] };
    }

    const headers = lines[0].map(h => h.trim().toLowerCase());
    
    const headerMapping = {
      company_name: ['company_name', 'company name', 'company', 'name'],
      website: ['website', 'url', 'domain', 'site'],
      city: ['city'],
      state: ['state'],
      phone: ['phone', 'tel', 'phone_number', 'telephone'],
      email: ['email', 'e-mail', 'email_address', 'mail'],
      contact_person: ['contact_person', 'contact person', 'contact', 'contact_name', 'person'],
      notes: ['notes', 'note', 'description', 'about']
    };

    const indices = {};
    for (const [field, synonyms] of Object.entries(headerMapping)) {
      indices[field] = headers.findIndex(h => synonyms.includes(h));
    }

    if (indices.company_name === -1) indices.company_name = 0;
    if (indices.website === -1) indices.website = 1;

    const leads = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

      const lead = {
        company_name: indices.company_name !== -1 ? row[indices.company_name]?.trim() : '',
        website: indices.website !== -1 ? row[indices.website]?.trim() : '',
        city: indices.city !== -1 ? row[indices.city]?.trim() : '',
        state: indices.state !== -1 ? row[indices.state]?.trim() : '',
        phone: indices.phone !== -1 ? row[indices.phone]?.trim() : '',
        email: indices.email !== -1 ? row[indices.email]?.trim() : '',
        contact_person: indices.contact_person !== -1 ? row[indices.contact_person]?.trim() : '',
        notes: indices.notes !== -1 ? row[indices.notes]?.trim() : ''
      };
      if (lead.company_name || lead.website) {
        leads.push(lead);
      }
    }

    const db = new Database(dbPath);
    const result = importLeadsBatch(db, leads, deduplicate_mode);

    return {
      content: [{
        type: "text",
        text: `CSV Import completed: ${result.imported} leads imported, ${result.updated} leads updated, ${result.skipped} leads skipped.`
      }]
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error importing CSV: ${err.message}` }]
    };
  }
}

function handleImportFromJson(args) {
  const { json_content, deduplicate_mode = 'error' } = args;
  if (!json_content) {
    return { isError: true, content: [{ type: "text", text: "Error: json_content is required." }] };
  }

  try {
    const leads = typeof json_content === 'string' ? JSON.parse(json_content) : json_content;
    if (!Array.isArray(leads)) {
      return { isError: true, content: [{ type: "text", text: "Error: JSON must be an array of lead objects." }] };
    }

    const db = new Database(dbPath);
    const result = importLeadsBatch(db, leads, deduplicate_mode);

    return {
      content: [{
        type: "text",
        text: `JSON Import completed: ${result.imported} leads imported, ${result.updated} leads updated, ${result.skipped} leads skipped.`
      }]
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error importing JSON: ${err.message}` }]
    };
  }
}

function handleClearDuplicateWarnings() {
  try {
    const db = new Database(dbPath);
    const result = db.prepare('UPDATE duplicate_warnings SET dismissed = 1 WHERE dismissed = 0').run();
    return {
      content: [{
        type: "text",
        text: `Success: Dismissed ${result.changes} duplicate warnings.`
      }]
    };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: `Error clearing warnings: ${err.message}` }] };
  }
}

function handleListLeads(args) {
  const limit = Math.min(100, Math.max(1, args.limit || 50));
  const offset = Math.max(0, args.offset || 0);

  try {
    const db = new Database(dbPath);
    const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    return { content: [{ type: "text", text: JSON.stringify(leads) }] };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: `Error listing leads: ${err.message}` }] };
  }
}

function handleGetLead(args) {
  const { id } = args;
  if (id == null) {
    return { isError: true, content: [{ type: "text", text: "Error: id is required." }] };
  }

  try {
    const db = new Database(dbPath);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    if (!lead) {
      return { content: [{ type: "text", text: `Lead with ID ${id} not found.` }] };
    }
    const logs = db.prepare('SELECT * FROM contact_logs WHERE lead_id = ? ORDER BY created_at DESC').all(id);
    return { content: [{ type: "text", text: JSON.stringify({ lead, contact_logs: logs }) }] };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: `Error retrieving lead: ${err.message}` }] };
  }
}

function handleUpdateLead(args) {
  const { id, company_name, website, city, state, phone, email, contact_person, notes, status } = args;
  if (id == null) {
    return { isError: true, content: [{ type: "text", text: "Error: id is required." }] };
  }

  try {
    const db = new Database(dbPath);
    const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    if (!existing) {
      return { isError: true, content: [{ type: "text", text: `Error: Lead with ID ${id} does not exist.` }] };
    }

    const updates = [];
    const params = [];

    if (company_name !== undefined) {
      const duplicateName = db.prepare('SELECT id FROM leads WHERE LOWER(company_name) = ? AND id != ?').get(company_name.toLowerCase(), id);
      if (duplicateName) {
        return { content: [{ type: "text", text: `Warning: Update rejected. Company name '${company_name}' already exists in another lead (ID: ${duplicateName.id}).` }] };
      }
      updates.push('company_name = ?');
      params.push(company_name);
    }

    if (website !== undefined) {
      const normalized = normalizeWebsite(website);
      const duplicateWebsite = db.prepare('SELECT id FROM leads WHERE website = ? AND id != ?').get(normalized, id);
      if (duplicateWebsite) {
        return { content: [{ type: "text", text: `Warning: Update rejected. Website '${normalized}' already exists in another lead (ID: ${duplicateWebsite.id}).` }] };
      }
      updates.push('website = ?');
      params.push(normalized);
    }

    if (city !== undefined) { updates.push('city = ?'); params.push(city || null); }
    if (state !== undefined) { updates.push('state = ?'); params.push(state ? state.toUpperCase() : null); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone || null); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email || null); }
    if (contact_person !== undefined) { updates.push('contact_person = ?'); params.push(contact_person || null); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes || null); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    if (updates.length === 0) {
      return { content: [{ type: "text", text: `No updates provided for Lead ID ${id}.` }] };
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);

    return { content: [{ type: "text", text: `Success: Lead ID ${id} was successfully updated.` }] };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: `Error updating lead: ${err.message}` }] };
  }
}

function handleUpdateLeadsBatch(args) {
  const { updates } = args;
  if (!Array.isArray(updates) || updates.length === 0) {
    return {
      isError: true,
      content: [{ type: "text", text: "Error: updates array is required and must not be empty." }]
    };
  }

  try {
    const db = new Database(dbPath);
    let updated = 0;
    let skipped = 0;
    const details = [];

    db.transaction(() => {
      for (const item of updates) {
        const { id, company_name, website, city, state, phone, email, contact_person, notes, status } = item;
        if (id == null) {
          skipped++;
          details.push({ id: "Unknown", status: "skipped", reason: "Missing lead ID" });
          continue;
        }

        const existing = db.prepare('SELECT id FROM leads WHERE id = ?').get(id);
        if (!existing) {
          skipped++;
          details.push({ id, status: "skipped", reason: "Lead not found" });
          continue;
        }

        const updatesQuery = [];
        const params = [];

        if (company_name !== undefined) {
          const duplicateName = db.prepare('SELECT id FROM leads WHERE LOWER(company_name) = ? AND id != ?').get(company_name.toLowerCase(), id);
          if (duplicateName) {
            skipped++;
            details.push({ id, status: "skipped", reason: `Duplicate company name '${company_name}' in lead ID ${duplicateName.id}` });
            continue;
          }
          updatesQuery.push('company_name = ?');
          params.push(company_name);
        }

        if (website !== undefined) {
          const normalized = normalizeWebsite(website);
          const duplicateWebsite = db.prepare('SELECT id FROM leads WHERE website = ? AND id != ?').get(normalized, id);
          if (duplicateWebsite) {
            skipped++;
            details.push({ id, status: "skipped", reason: `Duplicate website '${normalized}' in lead ID ${duplicateWebsite.id}` });
            continue;
          }
          updatesQuery.push('website = ?');
          params.push(normalized);
        }

        if (city !== undefined) { updatesQuery.push('city = ?'); params.push(city || null); }
        if (state !== undefined) { updatesQuery.push('state = ?'); params.push(state ? state.toUpperCase() : null); }
        if (phone !== undefined) { updatesQuery.push('phone = ?'); params.push(phone || null); }
        if (email !== undefined) { updatesQuery.push('email = ?'); params.push(email || null); }
        if (contact_person !== undefined) { updatesQuery.push('contact_person = ?'); params.push(contact_person || null); }
        if (notes !== undefined) { updatesQuery.push('notes = ?'); params.push(notes || null); }
        if (status !== undefined) { updatesQuery.push('status = ?'); params.push(status); }

        if (updatesQuery.length === 0) {
          skipped++;
          details.push({ id, status: "skipped", reason: "No updates provided" });
          continue;
        }

        updatesQuery.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        const stmt = db.prepare(`UPDATE leads SET ${updatesQuery.join(', ')} WHERE id = ?`);
        stmt.run(...params);
        updated++;
        details.push({ id, status: "updated" });
      }
    })();

    return {
      content: [{
        type: "text",
        text: `Batch update completed: ${updated} leads updated, ${skipped} skipped.`
      }]
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error processing batch update: ${err.message}` }]
    };
  }
}

function handleSearchLeads(args) {
  const { query } = args;
  if (!query) {
    return { isError: true, content: [{ type: "text", text: "Error: query is required." }] };
  }

  try {
    const db = new Database(dbPath);
    const searchVal = `%${query}%`;
    const leads = db.prepare(`
      SELECT * FROM leads 
      WHERE company_name LIKE ? 
         OR website LIKE ? 
         OR city LIKE ? 
         OR state LIKE ? 
         OR notes LIKE ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all(searchVal, searchVal, searchVal, searchVal, searchVal);
    return { content: [{ type: "text", text: JSON.stringify(leads) }] };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: `Error searching leads: ${err.message}` }] };
  }
}

function handleDeleteLead(args) {
  const { id } = args;
  if (id == null) {
    return { isError: true, content: [{ type: "text", text: "Error: id is required." }] };
  }

  try {
    const db = new Database(dbPath);
    const res = db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    if (res.changes === 0) {
      return { content: [{ type: "text", text: `Lead ID ${id} not found.` }] };
    }
    return { content: [{ type: "text", text: `Success: Lead ID ${id} was deleted.` }] };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: `Error deleting lead: ${err.message}` }] };
  }
}

function handleExportCsv(args) {
  const { status } = args;

  try {
    const db = new Database(dbPath);
    let leads;
    if (status && status !== 'all') {
      leads = db.prepare('SELECT * FROM leads WHERE status = ? ORDER BY id ASC').all(status);
    } else {
      leads = db.prepare('SELECT * FROM leads ORDER BY id ASC').all();
    }

    const headers = ['id', 'company_name', 'website', 'city', 'state', 'phone', 'email', 'contact_person', 'status', 'notes', 'created_at'];
    const lines = [headers.join(',')];

    for (const l of leads) {
      const row = [
        l.id,
        l.company_name,
        l.website,
        l.city || '',
        l.state || '',
        l.phone || '',
        l.email || '',
        l.contact_person || '',
        l.status,
        (l.notes || '').replace(/\r?\n/g, ' '),
        l.created_at
      ];
      lines.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }

    return { content: [{ type: "text", text: lines.join('\n') }] };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: `Error exporting CSV: ${err.message}` }] };
  }
}

function handleStats() {
  try {
    const db = new Database(dbPath);
    const total = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status').all();
    const byState = db.prepare('SELECT state, COUNT(*) as count FROM leads WHERE state IS NOT NULL GROUP BY state').all();
    const duplicateWarningsCount = db.prepare('SELECT COUNT(*) as count FROM duplicate_warnings WHERE dismissed = 0').get().count;

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          total_leads: total,
          count_by_status: byStatus,
          count_by_state: byState,
          active_duplicate_warnings: duplicateWarningsCount
        })
      }]
    };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: `Error getting stats: ${err.message}` }] };
  }
}

function handleGetDuplicates() {
  try {
    const db = new Database(dbPath);
    const warnings = db.prepare('SELECT * FROM duplicate_warnings WHERE dismissed = 0 ORDER BY created_at DESC').all();
    return { content: [{ type: "text", text: JSON.stringify(warnings) }] };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: `Error getting duplicates: ${err.message}` }] };
  }
}

function handleRequest(req) {
  const { id, method, params } = req;
  
  switch (method) {
    case 'initialize':
      return sendResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "leadflow-mcp",
          version: "1.0.0"
        }
      });

    case 'tools/list':
      return sendResponse(id, { tools });

    case 'tools/call': {
      if (!params || !params.name) {
        return sendError(id, -32602, "Invalid params");
      }
      const args = params.arguments || {};
      
      switch (params.name) {
        case 'leadflow__add_lead':
          return sendResponse(id, handleAddLead(args));
        case 'leadflow__add_leads_batch':
          return sendResponse(id, handleAddLeadsBatch(args));
        case 'leadflow__import_csv':
          return sendResponse(id, handleImportCsv(args));
        case 'leadflow__import_from_json':
          return sendResponse(id, handleImportFromJson(args));
        case 'leadflow__clear_duplicate_warnings':
          return sendResponse(id, handleClearDuplicateWarnings());
        case 'leadflow__list_leads':
          return sendResponse(id, handleListLeads(args));
        case 'leadflow__get_lead':
          return sendResponse(id, handleGetLead(args));
        case 'leadflow__update_lead':
          return sendResponse(id, handleUpdateLead(args));
        case 'leadflow__update_leads_batch':
          return sendResponse(id, handleUpdateLeadsBatch(args));
        case 'leadflow__search_leads':
          return sendResponse(id, handleSearchLeads(args));
        case 'leadflow__delete_lead':
          return sendResponse(id, handleDeleteLead(args));
        case 'leadflow__export_csv':
          return sendResponse(id, handleExportCsv(args));
        case 'leadflow__stats':
          return sendResponse(id, handleStats());
        case 'leadflow__get_duplicates':
          return sendResponse(id, handleGetDuplicates());
        default:
          return sendError(id, -32601, `Tool not found: ${params.name}`);
      }
    }

    default:
      if (id !== undefined) {
        return sendError(id, -32601, `Method not found: ${method}`);
      }
  }
}
