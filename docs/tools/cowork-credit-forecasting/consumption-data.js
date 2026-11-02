/*
 * ConsumptionData: local-only ingestion and aggregation; no UI or persistence.
 *
 * Browser: load JSZip first, then this script (globalThis.ConsumptionData).
 * CommonJS: require("./consumption-data.js"). ZIP input requires options.JSZip
 * or globalThis.JSZip. No library is bundled or fetched.
 *
 * await inspect(file, options): File/Blob, or {name, text()} for CSV and
 * {name, arrayBuffer()} for ZIP. Returns an opaque source with:
 *   kind, metrics: {headers, rows}, metadata (same or null), candidates.
 * Candidates are arrays of exact header names, not guesses. ZIP selects only
 * exactly one of PersonM365CreditsMetrics.csv or PersonServiceCreditsMetrics.csv
 * and optional PeopleMetaData.csv by case-insensitive basename. The latter must
 * have all ten documented columns, a nonblank service ID and name on every row,
 * and only one distinct service ID/name pair; GitHub-labeled service values or
 * headers are rejected. Service identifiers are not an authoritative credit
 * type registry, so a single non-GitHub-labeled service cannot be verified as
 * non-GitHub. A separate GitHub file and policy files are never ingested.
 * CSV is assumed to be joined M365 data, not GitHub data.
 *
 * build(source, options): options.mapping maps canonical roles to exact metric
 * headers: date, credits, person (required), historicalId, serviceId,
 * serviceName, policyId, organization (optional). Omitted roles auto-resolve
 * only when exactly one alias matches; ambiguous roles must be mapped. Set an
 * optional role to null to ignore its matching metric headers, unless mapped
 * to another role. options.ignoredHeaders can additionally exclude exact metric
 * headers; a header mapped to a role cannot also be explicitly ignored.
 * For ZIP metadata, use
 * options.metadataKey for its historical ID header if ambiguous. All other
 * columns become categorical attributes. Metadata collisions get the prefix
 * "metadata."; any remaining collision is an error. Empty values are null.
 * options.dateOrder is "MDY" or "DMY" for numeric slash/dash dates; no guessing.
 * options.completeMonths is an explicit array of YYYY-MM attested complete by
 * the caller; dates alone cannot establish completeness.
 *
 * GUID identities and explicitly mapped email/UPN identities are case-folded;
 * other opaque identifiers retain their case.
 * Result: {rows, months, groupings, completeness, latestCompleteMonth, stats}.
 * Each row has date, month, credits, personId, serviceId, serviceName, policyId,
 * metadataStatus and attributes. Completeness is "complete" only when attested,
 * otherwise "unknown"; this is not inferred from calendar dates.
 *
 * aggregate(dataset, {groupBy, filters, months}): groupBy is an array of names
 * from dataset.groupings; filters maps those names to a string/null or array of
 * exact values. Returns {months, groups, monthly}; each cell has credits,
 * persons (distinct PersonId), rows and services [{id,name,credits}]. Missing
 * group/month combinations are null, not zero. monthly is the same shape for
 * all filtered rows, so distinct people are not summed across groups.
 * groupings include "$service", "$serviceId", "$serviceName", "$policy",
 * "$metadataStatus" plus attributes.
 * service names and IDs are tracked separately in service totals.
 *
 * forecastInput(dataset, month, options): returns {month, completeness, credits,
 * persons, services}; a missing month throws, and unknown completeness requires
 * options.allowUnknown === true. A genuine zero remains zero.
 * demo(): a deterministic, entirely fictional rollout reaching 1000 users over 5 months.
 * parseCSV(text, options) and mappingCandidates(headers) are also public.
 * Limits: 64 MiB input, 128 MiB extracted ZIP, 200000 data rows total, 100 ZIP
 * entries, 10000 columns, 4000000 CSV fields and joined attribute cells,
 * 600 observed months, 5000 groups and 250000 group/month cells. Options
 * may lower (not raise) limits via options.limits.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ConsumptionData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CAPS = Object.freeze({ inputBytes: 64 * 1024 * 1024, extractedBytes: 128 * 1024 * 1024, rows: 200000, zipEntries: 100, columns: 10000, fields: 4000000, attributeCells: 4000000, months: 600, groups: 5000, groupCells: 250000 });
  const aliases = {
    date: ["metricdate", "date", "usagedate", "month", "period", "billingmonth"],
    credits: ["totalcopilotcreditsused", "copilotcreditsused", "creditsused", "creditused", "credits", "consumption", "totalcreditsused"],
    person: ["personid", "userid", "userprincipalname", "upn", "useremail", "email", "user"],
    historicalId: ["peoplehistoricalid", "personhistoricalid", "historicalid"],
    serviceId: ["serviceid"],
    serviceName: ["servicename", "service"],
    policyId: ["spendingpolicyid", "policyid"],
    organization: ["organization", "organisation", "organisition", "org", "orgname"]
  };
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const blank = s => s == null || String(s).trim() === "";
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function identity(s, email) {
    if (s == null) return null;
    return email || guid.test(s) ? s.toLowerCase() : s;
  }
  function limits(options) {
    const result = {};
    for (const key of Object.keys(CAPS)) {
      const v = options && options.limits && options.limits[key];
      if (v !== undefined && (!Number.isSafeInteger(v) || v < 1 || v > CAPS[key])) throw new Error("Invalid limit: " + key);
      result[key] = v === undefined ? CAPS[key] : v;
    }
    return result;
  }
  function byteLength(text) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text).length;
    return unescape(encodeURIComponent(text)).length;
  }
  function parseCSV(text, options) {
    const cap = limits(options);
    if (typeof text !== "string") throw new Error("CSV must be text");
    if (byteLength(text) > cap.inputBytes) throw new Error("CSV exceeds input byte limit");
    text = text.replace(/^\uFEFF/, "");
    const all = [], record = [];
    let field = "", quoted = false, closed = false, started = false, fields = 0;
    function pushField() {
      if (++fields > cap.fields) throw new Error("CSV exceeds total field limit");
      record.push(field);
      if (record.length > cap.columns) throw new Error("CSV exceeds column limit");
      field = ""; closed = false; started = false;
    }
    function pushRecord() {
      pushField();
      if (!(record.length === 1 && record[0] === "")) {
        all.push(record.slice());
        if (all.length > cap.rows + 1) throw new Error("CSV exceeds row limit");
      }
      record.length = 0;
    }
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { quoted = false; closed = true; }
        } else field += c;
      } else if (c === ",") pushField();
      else if (c === "\r" || c === "\n") {
        pushRecord();
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else if (c === '"') {
        if (started || closed) throw new Error("Invalid quote in CSV");
        quoted = true; started = true;
      } else {
        if (closed) throw new Error("Unexpected character after quoted CSV field");
        field += c; started = true;
      }
    }
    if (quoted) throw new Error("Unterminated quoted CSV field");
    if (started || closed || record.length) pushRecord();
    if (!all.length) throw new Error("CSV is empty");
    const headers = all.shift().map(s => s.trim());
    const seen = new Set();
    for (const h of headers) {
      const k = h.toLowerCase();
      if (!h || seen.has(k)) throw new Error("CSV contains blank or duplicate headers");
      seen.add(k);
    }
    all.forEach((row, i) => { if (row.length !== headers.length) throw new Error("CSV row " + (i + 2) + " has the wrong number of fields"); });
    return { headers, rows: all };
  }
  function mappingCandidates(headers) {
    const result = {};
    for (const role of Object.keys(aliases)) result[role] = headers.filter(h => aliases[role].includes(norm(h)));
    return result;
  }
  function preflightZip(buffer, cap) {
    const bytes = new Uint8Array(buffer), view = new DataView(buffer);
    if (bytes.length > cap.inputBytes) throw new Error("ZIP exceeds input byte limit");
    if (bytes.length < 22) throw new Error("Invalid ZIP");
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
    }
    if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error("Invalid or multi-disk ZIP");
    const count = view.getUint16(end + 10, true), size = view.getUint32(end + 12, true), offset = view.getUint32(end + 16, true);
    if (count === 65535 || size === 0xffffffff || offset === 0xffffffff || view.getUint16(end + 8, true) !== count) throw new Error("ZIP64 and multi-disk ZIPs are not supported");
    if (count > cap.zipEntries || offset + size !== end) throw new Error("ZIP entry limit exceeded or invalid directory");
    let pos = offset, total = 0;
    const names = new Set(), selected = new Set();
    for (let i = 0; i < count; i++) {
      if (pos + 46 > end || view.getUint32(pos, true) !== 0x02014b50) throw new Error("Invalid ZIP directory");
      const flags = view.getUint16(pos + 8, true), method = view.getUint16(pos + 10, true);
      const compressed = view.getUint32(pos + 20, true), uncompressed = view.getUint32(pos + 24, true);
      const nameLen = view.getUint16(pos + 28, true), extraLen = view.getUint16(pos + 30, true), commentLen = view.getUint16(pos + 32, true);
      if ((flags & 1) || (method !== 0 && method !== 8) || compressed === 0xffffffff || uncompressed === 0xffffffff) throw new Error("Encrypted, unsupported or ZIP64 entry");
      if (pos + 46 + nameLen + extraLen + commentLen > end) throw new Error("Invalid ZIP directory");
      const name = new TextDecoder("utf-8").decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
      const parts = name.split(/[\\/]/);
      if (name.startsWith("/") || name.includes("\\") || parts.some(p => p === "." || p === "..") || names.has(name)) throw new Error("Unsafe or duplicate ZIP entry name");
      names.add(name);
      const base = parts[parts.length - 1].toLowerCase();
      if (base === "personm365creditsmetrics.csv" || base === "personservicecreditsmetrics.csv" || base === "peoplemetadata.csv") {
        if (selected.has(base)) throw new Error("ZIP contains duplicate consumption CSVs");
        selected.add(base);
      }
      total += uncompressed;
      if (uncompressed > cap.extractedBytes || total > cap.extractedBytes) throw new Error("ZIP exceeds uncompressed byte limit");
      pos += 46 + nameLen + extraLen + commentLen;
      if (pos > end) throw new Error("Invalid ZIP directory");
    }
    if (pos !== end) throw new Error("Invalid ZIP directory size");
    if (selected.has("personm365creditsmetrics.csv") && selected.has("personservicecreditsmetrics.csv")) throw new Error("ZIP contains both consumption metrics file types");
  }
  function validateServiceMetrics(metrics) {
    const required = ["PersonId", "ServiceId", "ServiceName", "SpendingPolicyId", "MetricDate", "Session count", "Spending policy limit", "Total Copilot Credits used", "User limit", "PeopleHistoricalId"];
    const headers = metrics.headers.map(h => h.toLowerCase());
    for (const h of required) if (!headers.includes(h.toLowerCase())) throw new Error("PersonServiceCreditsMetrics.csv is missing required header: " + h);
    if (headers.some(h => norm(h).includes("github"))) throw new Error("GitHub-labeled columns are not supported in PersonServiceCreditsMetrics.csv");
    const id = headers.indexOf("serviceid"), name = headers.indexOf("servicename");
    let service = null;
    metrics.rows.forEach((row, i) => {
      const serviceId = row[id].trim(), serviceName = row[name].trim();
      if (!serviceId || !serviceName) throw new Error("Missing service ID or name at row " + (i + 2));
      if (norm(serviceId).includes("github") || norm(serviceName).includes("github")) throw new Error("GitHub-labeled service is not supported at row " + (i + 2));
      const pair = JSON.stringify([serviceId.toLowerCase(), serviceName.toLowerCase()]);
      if (service !== null && pair !== service) throw new Error("This query includes multiple services. Filter the Viva Insights query to one Microsoft 365 Copilot service and download it again.");
      service = pair;
    });
  }
  function extract(entry, cap) {
    return new Promise((resolve, reject) => {
      const chunks = []; let size = 0, ended = false;
      const stream = entry.internalStream("uint8array");
      stream.on("data", chunk => {
        if (ended) return;
        size += chunk.length;
        if (size > cap) { ended = true; stream.pause(); reject(new Error("ZIP entry exceeds uncompressed byte limit")); return; }
        chunks.push(chunk);
      }).on("error", err => { if (!ended) { ended = true; reject(err); } })
        .on("end", () => {
          if (ended) return;
          ended = true;
          const bytes = new Uint8Array(size); let offset = 0;
          for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
          try { resolve({ text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), size }); }
          catch (_) { reject(new Error("ZIP CSV must be valid UTF-8")); }
        }).resume();
    });
  }
  async function inspect(file, options) {
    options = options || {};
    const cap = limits(options);
    if (!file || typeof file.name !== "string") throw new Error("Provide a named CSV or ZIP file");
    if (typeof file.size === "number" && file.size > cap.inputBytes) throw new Error("File exceeds input byte limit");
    let metrics, metadata = null, kind, metricFormat;
    if (/\.zip$/i.test(file.name)) {
      kind = "zip";
      const JSZip = options.JSZip || (typeof globalThis !== "undefined" && globalThis.JSZip);
      if (!JSZip || typeof JSZip.loadAsync !== "function") throw new Error("JSZip is required for ZIP files");
      const buffer = await file.arrayBuffer();
      preflightZip(buffer, cap);
      const zip = await JSZip.loadAsync(buffer);
      const names = Object.keys(zip.files).filter(n => !zip.files[n].dir);
      function find(base, required) {
        const found = names.filter(n => n.split(/[\\/]/).pop().toLowerCase() === base.toLowerCase());
        if (found.length > 1) throw new Error("ZIP has multiple " + base + " files");
        if (!found.length && required) throw new Error("ZIP is missing " + base);
        return found.length ? zip.files[found[0]] : null;
      }
      const legacy = find("PersonM365CreditsMetrics.csv", false);
      const service = find("PersonServiceCreditsMetrics.csv", false);
      if (legacy && service) throw new Error("ZIP contains both consumption metrics file types");
      if (!legacy && !service) throw new Error("ZIP is missing PersonM365CreditsMetrics.csv or PersonServiceCreditsMetrics.csv");
      const met = legacy || service;
      if (service) metricFormat = "service";
      const meta = find("PeopleMetaData.csv", false);
      const metricFile = await extract(met, Math.min(cap.inputBytes, cap.extractedBytes));
      metrics = parseCSV(metricFile.text, options);
      if (service) validateServiceMetrics(metrics);
      if (meta) {
        const remaining = cap.extractedBytes - metricFile.size;
        if (remaining < 1) throw new Error("ZIP exceeds uncompressed byte limit");
        metadata = parseCSV((await extract(meta, Math.min(cap.inputBytes, remaining))).text, options);
      }
      if (metrics.rows.length + (metadata ? metadata.rows.length : 0) > cap.rows) throw new Error("ZIP exceeds total row limit");
    } else if (/\.csv$/i.test(file.name)) {
      if (/github/i.test(file.name)) throw new Error("GitHub credits are a separate credit type and cannot be ingested");
      kind = "csv";
      metrics = parseCSV(await file.text(), options);
    } else throw new Error("File must be a CSV or ZIP");
    const result = { kind, metrics, metadata, candidates: mappingCandidates(metrics.headers), metadataCandidates: metadata ? mappingCandidates(metadata.headers) : null };
    if (metricFormat) result.metricFormat = metricFormat;
    return result;
  }
  function resolve(headers, candidates, mapping, role, required) {
    let choice;
    if (own(mapping, role)) choice = mapping[role];
    else {
      const matches = candidates[role];
      if (matches.length > 1) throw new Error("Ambiguous mapping for " + role + "; select a header");
      choice = matches[0];
    }
    if (choice == null || choice === "") {
      if (required) throw new Error("Missing required mapping: " + role);
      return null;
    }
    if (typeof choice !== "string" || !headers.includes(choice)) throw new Error("Invalid header mapping for " + role);
    if (role === "credits" && /github/i.test(choice)) throw new Error("GitHub credits are a separate credit type");
    return headers.indexOf(choice);
  }
  function dateValue(value, order, row) {
    const s = String(value).trim(); let y, m, d, match;
    if ((match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(s))) {
      y = +match[1]; m = +match[2]; d = match[3] ? +match[3] : 1;
    } else if ((match = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(s))) {
      if (order !== "MDY" && order !== "DMY") throw new Error("Numeric date requires dateOrder MDY or DMY at row " + row);
      y = +match[3]; m = +(order === "MDY" ? match[1] : match[2]); d = +(order === "MDY" ? match[2] : match[1]);
    } else throw new Error("Invalid date at row " + row);
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1]) throw new Error("Invalid calendar date at row " + row);
    return String(y).padStart(4, "0") + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }
  function value(row, index) { return index == null || blank(row[index]) ? null : row[index].trim(); }
  function build(source, options) {
    options = options || {};
    const cap = limits(options);
    if (!source || !source.metrics || !Array.isArray(source.metrics.rows)) throw new Error("Invalid inspected source");
    const { headers, rows } = source.metrics;
    if (!rows.length) throw new Error("Metrics CSV has no data rows");
    if (rows.length + (source.metadata ? source.metadata.rows.length : 0) > cap.rows) throw new Error("Dataset exceeds row limit");
    if ((rows.length + 1) * headers.length + (source.metadata ? (source.metadata.rows.length + 1) * source.metadata.headers.length : 0) > cap.fields) throw new Error("Dataset exceeds total field limit");
    const mapping = options.mapping || {}, candidates = mappingCandidates(headers), indexes = {};
    for (const role of Object.keys(aliases)) indexes[role] = resolve(headers, candidates, mapping, role, ["date", "credits", "person"].includes(role));
    if (source.metricFormat === "service") {
      validateServiceMetrics(source.metrics);
      for (const [role, header] of Object.entries({ credits: "total copilot credits used", serviceId: "serviceid", serviceName: "servicename" })) {
        if (indexes[role] == null || headers[indexes[role]].toLowerCase() !== header) throw new Error("PersonServiceCreditsMetrics.csv requires its documented " + role + " mapping");
      }
    }
    const mapped = Object.values(indexes).filter(x => x != null);
    if (new Set(mapped).size !== mapped.length) throw new Error("A metric header cannot serve multiple mapping roles");
    const ignoredHeaders = options.ignoredHeaders === undefined ? [] : options.ignoredHeaders;
    if (!Array.isArray(ignoredHeaders) || ignoredHeaders.some(h => typeof h !== "string" || !headers.includes(h))) throw new Error("ignoredHeaders must contain metric headers");
    const ignored = new Set(ignoredHeaders.map(h => headers.indexOf(h)));
    if (mapped.some(i => ignored.has(i))) throw new Error("A mapped metric header cannot also be ignored");
    for (const role of Object.keys(aliases)) {
      if (own(mapping, role) && mapping[role] === null) {
        for (const h of candidates[role]) {
          const i = headers.indexOf(h);
          if (!mapped.includes(i)) ignored.add(i);
        }
      }
    }
    if (options.dateOrder !== undefined && !["MDY", "DMY"].includes(options.dateOrder)) throw new Error("dateOrder must be MDY or DMY");
    const metadata = source.metadata, lookup = new Map(), metaNames = [], used = new Set();
    const metricAttrs = headers.map((h, i) => ({ h, i })).filter(x => !mapped.includes(x.i) && !ignored.has(x.i));
    if (indexes.organization != null) metricAttrs.push({ h: headers[indexes.organization], i: indexes.organization });
    for (const x of metricAttrs) used.add(x.h);
    if (metadata) {
      if (indexes.historicalId == null) throw new Error("Metrics historicalId mapping is required to join metadata");
      const mc = mappingCandidates(metadata.headers);
      const mi = resolve(metadata.headers, mc, own(options, "metadataKey") ? { historicalId: options.metadataKey } : {}, "historicalId", true);
      metadata.headers.forEach((h, i) => {
        if (i === mi) return;
        const name = used.has(h) ? "metadata." + h : h;
        if (used.has(name)) throw new Error("Attribute name collision: " + name);
        used.add(name); metaNames.push({ name, i });
      });
      metadata.rows.forEach((row, n) => {
        const key = identity(value(row, mi), false);
        if (key == null) throw new Error("Missing metadata join key at row " + (n + 2));
        const attrs = metaNames.map(x => value(row, x.i));
        if (lookup.has(key) && JSON.stringify(lookup.get(key)) !== JSON.stringify(attrs)) throw new Error("Conflicting metadata for a historical ID at row " + (n + 2));
        lookup.set(key, attrs);
      });
    }
    if (rows.length * (metricAttrs.length + metaNames.length) > cap.attributeCells) throw new Error("Dataset exceeds joined attribute cell limit");
    const personHeader = norm(headers[indexes.person]);
    const personIsEmail = ["userprincipalname", "upn", "useremail", "email"].includes(personHeader);
    const output = rows.map((row, n) => {
      const line = n + 2, date = dateValue(row[indexes.date], options.dateOrder, line);
      const personId = identity(value(row, indexes.person), personIsEmail), str = value(row, indexes.credits);
      if (!personId) throw new Error("Missing person ID at row " + line);
      if (str == null || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(str)) throw new Error("Invalid or missing credits at row " + line);
      const credits = Number(str);
      if (!Number.isFinite(credits)) throw new Error("Non-finite credits at row " + line);
      const attrs = Object.create(null);
      for (const x of metricAttrs) attrs[x.h] = value(row, x.i);
      const key = identity(value(row, indexes.historicalId), false);
      const found = metadata && key !== null && lookup.has(key);
      metaNames.forEach((x, i) => { attrs[x.name] = found ? lookup.get(key)[i] : null; });
      return { date, month: date.slice(0, 7), credits, personId,
        serviceId: value(row, indexes.serviceId), serviceName: value(row, indexes.serviceName),
        policyId: value(row, indexes.policyId),
        metadataStatus: metadata ? (key === null ? "missing-key" : found ? "matched" : "unmatched") : "not-provided",
        attributes: attrs };
    });
    const months = Array.from(new Set(output.map(r => r.month))).sort();
    if (months.length > cap.months) throw new Error("Dataset exceeds observed month limit");
    const complete = options.completeMonths || [];
    if (!Array.isArray(complete) || complete.some(m => typeof m !== "string" || !months.includes(m))) throw new Error("completeMonths must contain observed YYYY-MM months");
    const completeness = Object.create(null);
    for (const m of months) completeness[m] = complete.includes(m) ? "complete" : "unknown";
    const groupings = ["$service", "$serviceId", "$serviceName", "$policy", "$metadataStatus"].concat(Array.from(used));
    if (new Set(groupings).size !== groupings.length) throw new Error("Attribute name conflicts with a reserved grouping");
    const stats = { rows: output.length, matched: 0, unmatched: 0, missingKey: 0, notProvided: 0 };
    for (const r of output) stats[{ matched: "matched", unmatched: "unmatched", "missing-key": "missingKey", "not-provided": "notProvided" }[r.metadataStatus]]++;
    return { rows: output, months, groupings, completeness, latestCompleteMonth: months.filter(m => completeness[m] === "complete").pop() || null, stats };
  }
  function groupingValue(row, name) {
    if (name === "$service") return row.serviceName || row.serviceId;
    if (name === "$serviceId") return row.serviceId;
    if (name === "$serviceName") return row.serviceName;
    if (name === "$policy") return row.policyId;
    if (name === "$metadataStatus") return row.metadataStatus;
    return own(row.attributes, name) ? row.attributes[name] : null;
  }
  function accumulator() { return { credits: 0, persons: new Set(), rows: 0, services: new Map() }; }
  function add(a, row) {
    a.credits += row.credits;
    if (!Number.isFinite(a.credits)) throw new Error("Credit aggregate is not finite");
    a.persons.add(row.personId); a.rows++;
    const key = JSON.stringify([row.serviceId, row.serviceName]);
    if (!a.services.has(key)) a.services.set(key, { id: row.serviceId, name: row.serviceName, credits: 0 });
    const service = a.services.get(key); service.credits += row.credits;
    if (!Number.isFinite(service.credits)) throw new Error("Service credit aggregate is not finite");
  }
  function finish(a) { return a ? { credits: a.credits, persons: a.persons.size, rows: a.rows, services: Array.from(a.services.values()) } : null; }
  function aggregate(dataset, options) {
    options = options || {};
    const cap = limits(options);
    const groupBy = options.groupBy || [], filters = options.filters || {};
    if (!Array.isArray(groupBy) || new Set(groupBy).size !== groupBy.length) throw new Error("groupBy must contain unique grouping names");
    for (const g of groupBy.concat(Object.keys(filters))) if (!dataset.groupings.includes(g)) throw new Error("Unknown grouping: " + g);
    if (options.months !== undefined && !Array.isArray(options.months)) throw new Error("months must be unique observed months");
    const months = options.months === undefined ? dataset.months.slice() : options.months.slice();
    if (months.length > cap.months || new Set(months).size !== months.length || months.some(m => !dataset.months.includes(m))) throw new Error("months must be unique observed months within the month limit");
    const selected = new Set(months), groups = new Map(), all = new Map();
    for (const row of dataset.rows) {
      if (!selected.has(row.month) || !Object.keys(filters).every(k => {
        const choices = Array.isArray(filters[k]) ? filters[k] : [filters[k]];
        return choices.includes(groupingValue(row, k));
      })) continue;
      const values = groupBy.map(g => groupingValue(row, g)), key = JSON.stringify(values);
      if (!groups.has(key)) {
        if (groups.size + 1 > cap.groups || (groups.size + 1) * months.length > cap.groupCells) throw new Error("Selection exceeds the group or group/month cell limit; narrow the selection");
        groups.set(key, { values, cells: new Map() });
      }
      const cells = groups.get(key).cells;
      if (!cells.has(row.month)) cells.set(row.month, accumulator());
      if (!all.has(row.month)) all.set(row.month, accumulator());
      add(cells.get(row.month), row); add(all.get(row.month), row);
    }
    return { months, groups: Array.from(groups.values(), g => ({ values: g.values, monthly: months.map(m => finish(g.cells.get(m))) })), monthly: months.map(m => finish(all.get(m))) };
  }
  function forecastInput(dataset, month, options) {
    if (!dataset.months.includes(month)) throw new Error("Forecast month is missing");
    if (dataset.completeness[month] !== "complete" && !(options && options.allowUnknown === true)) throw new Error("Forecast month completeness is unknown; explicitly allow it");
    const cell = aggregate(dataset, { months: [month], filters: options && options.filters }).monthly[0];
    if (!cell) throw new Error("No data for forecast month and filters");
    return { month, completeness: dataset.completeness[month], credits: cell.credits, persons: cell.persons, services: cell.services };
  }
  function demo() {
    const headers = ["PersonId", "MetricDate", "Total Copilot Credits used", "ServiceName", "Organization", "cost_center"];
    const rows = [];
    const active = [960, 970, 980, 990, 1000];
    const maturity = [0.92, 0.94, 0.96, 0.98, 1];
    for (let month = 1; month <= 5; month++) {
      for (let i = 0; i < active[month - 1]; i++) {
        const tier = (i * 487) % 1000;
        const rate = tier < 890 ? 18000 + (i % 15) * 900
          : tier < 994 ? 120000 + (i % 12) * 15000
          : tier < 999 ? 2000000 + (i % 9) * 125000
          : 5500000 + (i % 12) * 250000;
        const variation = 0.94 + ((i * 17) % 13) / 100;
        const credits = Math.round(rate * maturity[month - 1] * variation);
        rows.push(["demo-user-" + String(i + 1).padStart(4, "0"), "2026-" + String(month).padStart(2, "0") + "-01",
          String(credits), "Demo service",
          ["North group", "Central group", "South group", "West group"][i % 4], "Demo-" + String(i % 12 + 1).padStart(2, "0")]);
      }
    }
    return build({ kind: "csv", metrics: { headers, rows }, metadata: null }, { completeMonths: ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"] });
  }
  return Object.freeze({ inspect, parseCSV, mappingCandidates, build, aggregate, forecastInput, demo });
});
