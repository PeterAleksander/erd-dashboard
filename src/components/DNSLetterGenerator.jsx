import React, { useState, useRef } from 'react';

// ── Config ────────────────────────────────────────────────────────────────────
const SENDGRID_ID     = 'u3744841';
const SENDGRID_DOMAIN = 'wl092.sendgrid.net';
const SPF_RECORD      = 'v=spf1 include:sendgrid.net ~all';
const tmTarget = (s) => `vantacaportalmanager-${s.toLowerCase()}.trafficmanager.net`;

const SAMPLE = [
  'testDB\t\t6/1/2026\t\t\tNew\tAddition\tTest Management Group\t\thome-TestMG-001\thome.testmg.com\tTESTKEY',
  'testDB\t\t6/1/2026\t\t\tNew\tAddition\tTest Management Group\t\tportal-Testmg-001\tportal.testmg.com\tTESTKEY',
].join('\n');

// ── Parse ─────────────────────────────────────────────────────────────────────
function parseInput(raw) {
  const lines = raw.split('\n').filter(l => l.trim());
  const errors = [], rows = [];

  lines.forEach((line, idx) => {
    const cols = line.split('\t');
    if (cols.length < 12) {
      errors.push(`Line ${idx + 1}: Expected at least 12 tab-separated columns, got ${cols.length}`);
      return;
    }
    const clientShort = cols[0].trim();
    const goLive      = cols[2].trim();
    const companyName = cols[7].trim();
    const fullDomain  = cols[10].trim();
    const distId      = cols[11].trim();

    if (!clientShort || !fullDomain || !distId) {
      errors.push(`Line ${idx + 1}: Missing required field (client name, domain, or distribution ID)`);
      return;
    }
    const dot = fullDomain.indexOf('.');
    if (dot < 1) { errors.push(`Line ${idx + 1}: Invalid domain "${fullDomain}"`); return; }

    rows.push({
      clientShort, goLive, companyName, distId,
      subdomain:  fullDomain.substring(0, dot),
      baseDomain: fullDomain.substring(dot + 1),
    });
  });

  const groupMap = new Map();
  rows.forEach(r => {
    const key = `${r.clientShort.toLowerCase()}||${r.baseDomain.toLowerCase()}`;
    if (!groupMap.has(key))
      groupMap.set(key, { clientShort: r.clientShort, companyName: r.companyName, goLive: r.goLive, baseDomain: r.baseDomain, entries: [] });
    groupMap.get(key).entries.push({ subdomain: r.subdomain, distId: r.distId });
  });

  return { groups: Array.from(groupMap.values()), errors };
}

// ── Letter HTML (plain HTML string for clipboard) ─────────────────────────────
function buildLetterHTML(g) {
  const tm = tmTarget(g.clientShort);
  const sgId  = SENDGRID_ID;
  const sgDom = SENDGRID_DOMAIN;
  const sgNum = sgId.replace('u', '');

  const tblOpen = (col2Header) =>
    `<table style="border-collapse:collapse;width:100%;margin-bottom:16px;font-size:14px;">
      <thead><tr style="background:#f0f0f0;">
        <th style="border:1px solid #ccc;padding:6px 10px;text-align:left;font-weight:600;">Type</th>
        <th style="border:1px solid #ccc;padding:6px 10px;text-align:left;font-weight:600;">${col2Header}</th>
        <th style="border:1px solid #ccc;padding:6px 10px;text-align:left;font-weight:600;">Value</th>
      </tr></thead><tbody>`;
  const row = (t, n, v) =>
    `<tr><td style="border:1px solid #ccc;padding:6px 10px;">${t}</td>
         <td style="border:1px solid #ccc;padding:6px 10px;">${n}</td>
         <td style="border:1px solid #ccc;padding:6px 10px;">${v}</td></tr>`;

  const portalTables = g.entries.map(e =>
    tblOpen('Name') +
    row('TXT',   '@',          e.distId) +
    row('CNAME', e.subdomain,  tm) +
    '</tbody></table>'
  ).join('');

  return `<p>Hello,</p>
<p>In preparation for your project go-live, please add the following DNS records to <strong>${g.baseDomain}</strong>. Once the records have been added, please let us know so that we can verify the records on our end.</p>
<p><strong>Important Notes:</strong></p>
<ul>
<li>These records must be added and verified within the next two weeks to prevent expiration</li>
<li>Do not delete these records or your portal will become inaccessible to owners</li>
</ul>
<p><strong>Portal Access Records</strong></p>
<p>These paired TXT and CNAME records ensure owners see your familiar domain when making payments on the homeowner portal.</p>
${portalTables}
<p><em>Note: If your organization has an intranet with internal DNS, please add the above CNAME records there as well.</em></p>
<p><strong>Email Management Records</strong></p>
<p>These records allow emails from Vantaca to appear as coming from your domain and provide delivery status information. Without these records, emails may end up in recipients' spam folders.</p>
${tblOpen('Host')}
${row('CNAME', 'em',             `${sgId}.${sgDom}`)}
${row('CNAME', 's1._domainkey',  `s1.domainkey.${sgId}.${sgDom}`)}
${row('CNAME', 's2._domainkey',  `s2.domainkey.${sgId}.${sgDom}`)}
${row('CNAME', 'url',            'sendgrid.net')}
${row('CNAME', sgNum,            'sendgrid.net')}
</tbody></table>
${tblOpen('Host')}
${row('TXT', '@', SPF_RECORD)}
</tbody></table>
<p>If you have an IT resource that manages your domain, you can forward this message to them, and they should be able to add these records for you.</p>`;
}

// ── Copy helpers ──────────────────────────────────────────────────────────────
function copyRichHTML(html) {
  if (navigator.clipboard && window.ClipboardItem) {
    const blob = new Blob([html], { type: 'text/html' });
    return navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]).catch(() => fallbackCopy(html));
  }
  fallbackCopy(html);
  return Promise.resolve();
}

function fallbackCopy(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  el.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
  document.body.appendChild(el);
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand('copy');
  sel.removeAllRanges();
  document.body.removeChild(el);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DNSLetterGenerator() {
  const [input, setInput]       = useState('');
  const [groups, setGroups]     = useState([]);
  const [errors, setErrors]     = useState([]);
  const [copiedIdx, setCopiedIdx] = useState(null); // null | number | 'all'
  const lettersRef = useRef([]);

  function handleGenerate() {
    const { groups: g, errors: e } = parseInput(input);
    setGroups(g);
    setErrors(e);
    lettersRef.current = g.map(buildLetterHTML);
  }

  function handleCopy(idx) {
    copyRichHTML(lettersRef.current[idx]).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }

  function handleCopyAll() {
    const combined = lettersRef.current.join('<hr style="margin:32px 0;border:none;border-top:1px solid #ccc;">');
    copyRichHTML(combined).then(() => {
      setCopiedIdx('all');
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace", color: '#d4d4d8' }}>

      {/* Input label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Input (tab-delimited)
        </span>
        <button
          onClick={() => setInput(SAMPLE)}
          style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 11, color: '#52525b', cursor: 'pointer' }}
          onMouseEnter={e => e.target.style.color = '#f59e0b'}
          onMouseLeave={e => e.target.style.color = '#52525b'}
        >
          Load sample data
        </button>
      </div>

      {/* Textarea */}
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Paste tab-separated rows here…"
        spellCheck={false}
        style={{
          width: '100%', minHeight: 140, resize: 'vertical',
          borderRadius: 6, border: '1px solid #3f3f46', background: '#18181b',
          color: '#d4d4d8', fontFamily: 'inherit', fontSize: 13,
          padding: '12px 16px', outline: 'none',
        }}
      />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 24px', flexWrap: 'wrap' }}>
        <button
          onClick={handleGenerate}
          style={{
            padding: '8px 24px', borderRadius: 6, border: 'none',
            background: '#f59e0b', color: '#18181b', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 700, letterSpacing: '.3px', cursor: 'pointer',
          }}
        >
          Generate Letters
        </button>

        {groups.length > 1 && (
          <button
            onClick={handleCopyAll}
            style={{
              padding: '8px 16px', borderRadius: 6,
              border: `1px solid ${copiedIdx === 'all' ? '#059669' : '#52525b'}`,
              background: copiedIdx === 'all' ? '#059669' : 'transparent',
              color: copiedIdx === 'all' ? '#fff' : '#a1a1aa',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              letterSpacing: '.3px', cursor: 'pointer',
            }}
          >
            {copiedIdx === 'all' ? '✓ Copied' : `Copy All (${groups.length})`}
          </button>
        )}

        {groups.length > 0 && (
          <span style={{ fontSize: 11, color: '#52525b' }}>
            {groups.length} letter{groups.length !== 1 ? 's' : ''} generated
          </span>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{
          borderRadius: 6, border: '1px solid rgba(127,29,29,.5)',
          background: 'rgba(69,10,10,.3)', padding: '12px 16px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#f87171', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4 }}>
            Parse Errors
          </div>
          {errors.map((e, i) => (
            <div key={i} style={{ fontSize: 13, color: 'rgba(252,165,165,.8)' }}>{e}</div>
          ))}
        </div>
      )}

      {/* Letter cards */}
      {groups.map((g, i) => (
        <div key={i} style={{ borderRadius: 8, border: '1px solid #3f3f46', background: '#18181b', overflow: 'hidden', marginBottom: 24 }}>

          {/* Card header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#27272a', borderBottom: '1px solid #3f3f46' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                {g.clientShort}
              </span>
              <span style={{ color: '#52525b' }}>—</span>
              <span style={{ fontSize: 13, color: '#d4d4d8' }}>{g.baseDomain}</span>
              {g.goLive && (
                <span style={{ fontSize: 11, color: '#71717a', marginLeft: 8 }}>Go-live: {g.goLive}</span>
              )}
            </div>
            <button
              onClick={() => handleCopy(i)}
              style={{
                padding: '6px 16px', borderRadius: 4, border: 'none',
                background: copiedIdx === i ? '#059669' : '#f59e0b',
                color: copiedIdx === i ? '#fff' : '#18181b',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                letterSpacing: '.3px', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {copiedIdx === i ? '✓ Copied' : 'Copy to Clipboard'}
            </button>
          </div>

          {/* Company subtitle */}
          {g.companyName && (
            <div style={{ padding: '6px 20px', fontSize: 11, color: '#71717a', borderBottom: '1px solid #27272a' }}>
              {g.companyName}
            </div>
          )}

          {/* Letter body preview */}
          <div
            style={{ padding: '16px 20px', fontSize: 13, color: '#a1a1aa', lineHeight: 1.65, overflowX: 'auto' }}
            dangerouslySetInnerHTML={{ __html: lettersRef.current[i] }}
          />
        </div>
      ))}
    </div>
  );
}
