/**
 * Focus Blocker — Native Messaging Host
 * Modifies the Windows hosts file so blocks work in ALL browsers, not just Chrome.
 *
 * Chrome communicates via stdin/stdout using a 4-byte LE length prefix + JSON body.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOSTS_PATH   = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts');
const MARK_START   = '# --- Focus Blocker START ---';
const MARK_END     = '# --- Focus Blocker END ---';

// ---- Native messaging I/O ----

function respond(obj) {
  const json    = JSON.stringify(obj);
  const jsonBuf = Buffer.from(json, 'utf8');
  const lenBuf  = Buffer.alloc(4);
  lenBuf.writeUInt32LE(jsonBuf.length, 0);
  process.stdout.write(Buffer.concat([lenBuf, jsonBuf]));
}

let buf = Buffer.alloc(0);

process.stdin.on('data', chunk => {
  buf = Buffer.concat([buf, chunk]);
  while (buf.length >= 4) {
    const msgLen = buf.readUInt32LE(0);
    if (buf.length < 4 + msgLen) break;
    const raw = buf.slice(4, 4 + msgLen).toString('utf8');
    buf = buf.slice(4 + msgLen);
    let msg;
    try { msg = JSON.parse(raw); } catch (_) { continue; }
    handleMessage(msg);
  }
});

process.stdin.on('end', () => process.exit(0));

// ---- Message handler ----

function handleMessage(msg) {
  try {
    if (msg.type === 'ping') {
      respond({ ok: true, version: '2.0.0' });
      return;
    }
    if (msg.type === 'sync') {
      const domains  = [...new Set([...(msg.staticDomains || []), ...(msg.customSites || [])])];
      const enabled  = msg.enabled !== false;
      syncHostsFile(domains, enabled);
      flushDns();
      respond({ ok: true });
      return;
    }
    respond({ ok: false, error: 'Unknown message type' });
  } catch (err) {
    respond({ ok: false, error: err.message });
  }
}

// ---- Hosts file ----

function syncHostsFile(domains, enabled) {
  let content = '';
  try { content = fs.readFileSync(HOSTS_PATH, 'utf8'); } catch (_) {}

  // Strip any existing Focus Blocker section
  const s = content.indexOf(MARK_START);
  const e = content.indexOf(MARK_END);
  if (s !== -1 && e !== -1) {
    content = content.slice(0, s).trimEnd() + '\n' + content.slice(e + MARK_END.length).replace(/^\n+/, '');
  }
  content = content.trimEnd();

  if (enabled && domains.length > 0) {
    // Add both bare domain and www. variant
    const lines = [...new Set(
      domains.flatMap(d => {
        const bare = d.replace(/^www\./, '');
        return [`127.0.0.1 ${bare}`, `127.0.0.1 www.${bare}`];
      })
    )].join('\n');

    content += `\n\n${MARK_START}\n${lines}\n${MARK_END}`;
  }

  fs.writeFileSync(HOSTS_PATH, content + '\n', 'utf8');
}

// ---- DNS cache flush (no admin needed on Win 10/11) ----

function flushDns() {
  try { execSync('ipconfig /flushdns', { stdio: 'ignore' }); } catch (_) {}
}
