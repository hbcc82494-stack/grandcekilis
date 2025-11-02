// server.js — Grand Çekiliş (sqlite3 ile tam sürüm)

// --- Core imports ---
import fs from 'fs';
import path from 'path';
import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

// --- Resolve __dirname (ESM) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Express app + port ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- Environment variables ---
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const DEFAULT_HASH = '$2a$10$8r1GxXH6Q1m1Qk2o/b0m3uI2qUX1k4nJ5F1eYpA0seI6ex1x5gM7G'; // "ChangeMe!2025"
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || DEFAULT_HASH;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-this';

// --- Ensure data folder exists ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// --- Static / body parsing / cookies ---
app.use(cookieParser());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// --- sqlite3 setup (with Promise helpers) ---
sqlite3.verbose();
const dbFile = path.join(dataDir, 'app.db');
const db = new sqlite3.Database(dbFile);

const run = (sql, params = []) =>
  new Promise((resolve, reject) => db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve(this);
  }));

const get = (sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  }));

const all = (sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  }));

// --- DB Initialization ---
await run(`
  CREATE TABLE IF NOT EXISTS draws (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at TEXT,
    winners_count INTEGER,
    result_json TEXT
  )
`);

await run(`
  CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_id TEXT,
    action TEXT,
    ts TEXT
  )
`);
// --- Layout helper for HTML ---
function layout(title, body, extraHead=''){
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<link rel="stylesheet" href="/public/style.css"/>
${extraHead}
</head>
<body>
<div class="container">
  <header><h1>${title}</h1></header>
  ${body}
  <footer><p class="muted">Grand Çekiliş • ${new Date().getFullYear()}</p></footer>
</div>
<script src="/public/app.js"></script>
</body>
</html>`;
}

// --- Auth middleware ---
function requireAuth(req, res, next){
  if(req.session && req.session.authed){ return next(); }
  res.redirect('/admin/login');
}

// --- Admin Login Page ---
app.get('/admin/login', (req,res)=>{
  const body = `
  <form method="post" action="/admin/login" class="card">
    <label>Kullanıcı adı</label>
    <input name="username" required placeholder="admin"/>
    <label>Şifre</label>
    <input name="password" type="password" required placeholder="••••••••"/>
    <button type="submit">Giriş Yap</button>
  </form>`;
  res.send(layout('Yönetici Girişi', body));
});

// --- Admin Login POST ---
app.post('/admin/login', async (req,res)=>{
  const { username, password } = req.body;
  if(username === ADMIN_USER){
    const ok = await bcrypt.compare(password, ADMIN_PASS_HASH);
    if(ok){
      req.session.authed = true;
      return res.redirect('/admin');
    }
  }
  res.send(layout('Yönetici Girişi', `<div class="alert">Hatalı kullanıcı adı/şifre</div><a href="/admin/login">Tekrar dene</a>`));
});

// --- Admin Logout ---
app.get('/admin/logout', (req,res)=>{
  req.session.destroy(()=> res.redirect('/admin/login'));
});
// --- Admin Dashboard (after login) ---
app.get('/admin', requireAuth, async (req,res)=>{
  const draws = await all(
    SELECT id,title,created_at,winners_count FROM draws ORDER BY created_at DESC LIMIT 50
  );
  const body = `
  <div class="card">
    <h2>Yeni Çekiliş Oluştur</h2>
    <form method="post" action="/admin/create">
      <label>Başlık (isteğe bağlı)</label>
      <input name="title" placeholder="Örn: Kasım 2025 Büyük Çekiliş"/>
      <div class="grid">
        <div>
          <label>İsimler (her satıra 1)</label>
          <textarea name="names" rows="10" required placeholder="Ad Soyad"></textarea>
        </div>
        <div>
          <label>Tutarlar (virgülle ayır)</label>
          <input name="amounts" placeholder="50,100,200,500"/>
          <p class="muted">Boş bırakılırsa her kazanana 100₺ atanır.</p>
          <label>Kazanan sayısı</label>
          <input name="winners" type="number" min="1" max="1000" value="15"/>
        </div>
      </div>
      <button type="submit">Çekilişi Başlat</button>
    </form>
  </div>

  <div class="card">
    <h2>Son Çekilişler</h2>
    <table>
      <thead><tr><th>Tarih</th><th>Başlık</th><th>Kazanan</th><th>Link</th></tr></thead>
      <tbody>
        ${draws.map(d=>`
          <tr>
            <td>${d.created_at}</td>
            <td>${d.title || '-'}</td>
            <td>${d.winners_count}</td>
            <td><a href="/r/${d.id}" target="_blank">Aç</a></td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <p><a href="/admin/logout">Çıkış yap</a></p>`;
  res.send(layout('Yönetim Paneli', body));
});

// --- Helpers: parse input & random shuffle ---
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
}
function parseNames(text){
  return text.split('\n').map(s=>s.trim()).filter(Boolean);
}
function parseAmounts(text){
  if(!text) return [];
  return text.split(',').map(s=>s.trim()).filter(Boolean).map(x=>parseInt(x.replace(/[^\d]/g,''),10)).filter(x=>!isNaN(x));
}
// --- Create Draw (POST) ---
app.post('/admin/create', requireAuth, async (req,res)=>{
  try{
    const title = (req.body.title||'').trim();
    const names = parseNames(req.body.names||'');
    const amounts = parseAmounts(req.body.amounts||'');
    let winnersCount = parseInt(req.body.winners, 10);

    if(!Array.isArray(names) || names.length === 0){
      throw new Error('İsim listesi boş olamaz');
    }
    if(!Number.isFinite(winnersCount) || winnersCount < 1) winnersCount = 1;
    if(winnersCount > names.length) winnersCount = names.length;

    // pick winners
    const pool = names.slice();
    shuffle(pool);
    const winners = pool.slice(0, winnersCount);

    // amounts (default 100)
    let amtPool = amounts.length ? amounts.slice() : [100];
    shuffle(amtPool);

    const final = winners.map((n,i)=>({
      name: n,
      amount: amtPool[i % amtPool.length]
    }));

    const id = nanoid(8);
    const created_at = new Date().toISOString().replace('T',' ').slice(0,19);

    await run(
      INSERT INTO draws (id,title,created_at,winners_count,result_json) VALUES (?,?,?,?,?),
      [id, title, created_at, winnersCount, JSON.stringify(final)]
    );
    await run(
      INSERT INTO audit(draw_id, action, ts) VALUES (?,?,?),
      [id,'create', created_at]
    );

    res.redirect('/r/'+id);
  }catch(e){
    res.status(400).send(
      layout('Hata', `<div class="alert">Hata: ${e.message}</div><a href="/admin">Geri dön</a>`)
    );
  }
});

// --- Public Result Page ---
app.get('/r/:id', async (req,res)=>{
  const id = req.params.id;
  const row = await get(`SELECT * FROM draws WHERE id=?`, [id]);
  if(!row){
    return res.status(404).send(layout('Bulunamadı', `<div class="alert">Çekiliş bulunamadı</div>`));
  }
  const title = row.title || 'Çekiliş Sonucu';
  const winners = JSON.parse(row.result_json);

  const body = `
  <div class="card">
    <h2>${title}</h2>
    <p class="muted">Açılışta animasyon oynar, fakat sonuç sabittir.</p>
    <div class="anim" id="animBox">Çekiliş başlıyor...</div>
    <div id="tableBox" style="display:none">
      <table>
        <thead><tr><th>#</th><th>İsim</th><th>Kazandığı Tutar</th></tr></thead>
        <tbody id="rows"></tbody>
      </table>
    </div>
  </div>
  <script>
    const winners = ${JSON.stringify(winners)};
    const animBox = document.getElementById('animBox');
    const tableBox = document.getElementById('tableBox');
    const rowsEl = document.getElementById('rows');

    function reveal(){
      rowsEl.innerHTML = winners.map((w,i)=>\`
        <tr>
          <td>\${i+1}</td>
          <td>\${escapeHtml(w.name)}</td>
          <td>\${escapeHtml(String(w.amount))} ₺</td>
        </tr>
      \`).join('');
      tableBox.style.display = 'block';
    }

    function escapeHtml(s){
      return String(s).replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c]);
    }

    const names = winners.map(w => w.name + ' — ' + w.amount + '₺');

    const spin = setInterval(()=>{
      const idx = Math.floor(Math.random()*names.length);
      animBox.textContent = names[idx];
    }, 90);

    setTimeout(()=>{
      clearInterval(spin);
      animBox.textContent = 'Kazananlar görüntüleniyor...';
      setTimeout(()=>{
        animBox.style.display = 'none';
        reveal();
      }, 600);
    }, 3200 + Math.floor(Math.random()*1200));
  </script>
  `;
  res.send(layout('Çekiliş Sonucu', body));
});

// --- Root redirect ---
app.get('/', (req,res)=> res.redirect('/admin/login'));

// --- Start server ---
app.listen(PORT, ()=> console.log('Grand Çekiliş çalışıyor → http://localhost:'+PORT));
