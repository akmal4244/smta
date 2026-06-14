# Runbook Operasi SMTA

Runbook ini menerangkan cara menjalankan, menyemak, dan memulihkan Sistem Marvis Threads Auto (SMTA).

## URL Penting

| Tujuan | URL |
| --- | --- |
| GUI rasmi | `http://localhost/smta/` |
| AI health | `http://127.0.0.1:8788/api/health` |
| Node dev fallback | `http://localhost:8791/smta/` |

## Arahan Harian

Jalankan semakan asas:

```bash
npm run check
```

Semak JSON utama:

```bash
node -e "for (const f of ['threads_flexi_marble_schedule.json','story-runs.json','status.json']) { JSON.parse(require('fs').readFileSync(f,'utf8')); console.log(f + ' ok'); }"
```

Hidupkan AI server:

```bash
npm run ai:hidden
```

Deploy semula ke XAMPP:

```bash
npm run deploy:xampp
```

## Semak AI Server

Health endpoint patut pulang `ok:true` dan `hasKey:true` jika DeepSeek key tersedia.

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8788/api/health -TimeoutSec 10
```

Jika `hasKey:false`, semak salah satu pilihan ini:

- Env var `DEEPSEEK_API_KEY`.
- Fail private `work/private/deepseek.key`.

Jangan commit fail key ke repo.

## Workflow Jana Story Produk

1. Isi `Tajuk produk wajib`.
2. Isi `Kategori / kegunaan produk`.
3. Masukkan link gambar atau upload/paste gambar jika ada.
4. Isi link affiliate produk.
5. Pilih jumlah posting sehari, default semasa ialah `25 posting / hari`.
6. Klik `Auto cipta & jadualkan`.
7. Semak output dan status di Jadual Threads.

Jika tajuk produk kosong, sistem mesti menolak generate.

## Status Queue

- `Pending`: queue aktif.
- `Blocked`: belum gagal, menunggu slot kosong.
- `Lulus`: posted/passed.
- `Gagal`: gagal diproses atau ditanda gagal.

Queue aktif maksimum ialah `25`. Jika ada lebih banyak siri, baki akan kekal `Blocked` sehingga slot kosong.

## Pulihkan Blocked

SMTA patut auto promote `Blocked` kepada `Pending` bila slot scheduled kosong. Jika tidak berlaku:

1. Semak AI server masih hidup.
2. Semak `status.json` valid.
3. Semak `automationMode:true`.
4. Semak `automationLimit:25`.
5. Jalankan semula AI server.

## Publisher Threads

Default publisher mesti kekal `Dry-run`.

Sebelum live:

- Threads User ID diisi.
- Threads access token sah.
- `Dry-run` telah diuji.
- Siri due sudah jelas.
- User faham tindakan live boleh menghantar post public.

Token boleh disimpan melalui GUI Publisher atau env `THREADS_ACCESS_TOKEN`.

## Checklist Sebelum Commit

```bash
npm run check
git diff --check
```

Pastikan fail private tidak staged:

```bash
git status --short
```

Nota: `status.json` boleh berubah setiap 60 saat kerana automation worker. Jika perubahan hanya `lastAutomationAt`, itu runtime normal.
