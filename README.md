
# Grand Çekiliş (TR)

Sunucu taraflı çekiliş uygulaması: Admin panelinden isim ve tutarları gir, kazanan sayısını belirle, *tek tıkla sonuç sayfası* üret.
Public link açıldığında animasyon oynar; sonuç sabit kalır.

## Özellikler
- Admin login (kullanıcı adı/parola)
- 100+ isim girişi, tutar havuzu (virgülle)
- Her çekilişte değişebilir kazanan sayısı
- Sonuçlar sabit, paylaşılabilir link: `/r/:id`
- TR arayüz
- SQLite dosyası (data/app.db)

## Hızlı Başlangıç (Lokal)
```bash
npm install
# Varsayılan admin: admin / ChangeMe!2025
npm start
# http://localhost:3000
```

## Ortam Değişkenleri
- `ADMIN_USER` (varsayılan: `admin`)
- `ADMIN_PASS_HASH` (bcrypt hash; varsayılan: "ChangeMe!2025")
- `SESSION_SECRET` (rastgele güçlü bir değer önerilir)
- `PORT` (Render için otomatik atanır)

Varsayılan parola hash’i:
- Parola: `ChangeMe!2025`
- Hash: `$2a$10$8r1GxXH6Q1m1Qk2o/b0m3uI2qUX1k4nJ5F1eYpA0seI6ex1x5gM7G`

> Güvenlik için canlıda `ADMIN_PASS_HASH` kullanın (düz metin parola **değil**). Hash üretmek için: https://bcrypt.online veya lokal script.

## Render (Ücretsiz Alt Alan)
1. Bu projeyi GitHub'a gönderin (yeni repo).
2. Render.com > New > Web Service > GitHub repo'yu seçin.
3. Environment: Node 18+ (Render otomatik algılar).
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Environment Variables:
   - `ADMIN_USER=admin`
   - `ADMIN_PASS_HASH=<bcrypt-hash>`
   - `SESSION_SECRET=<güçlü-bir-gizli>`
7. Deploy!
8. Render ücretsiz alt alan üretir: `https://something.onrender.com`.
   - “Custom hostname” ile alt alan adını `grandcekilis.onrender.com` şeklinde seçebilirsiniz (uygunsa).

## Not
- Ücretsiz planlarda disk kalıcılığı deploy sonrası sıfırlanabilir. Kritik veriler için external DB (Render PostgreSQL) önerilir.
- Bu basit sürüm SQLite dosyası ile çalışır; çoğu kullanım için yeterlidir.
