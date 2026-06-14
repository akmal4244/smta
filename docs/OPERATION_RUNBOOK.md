# Runbook Operasi ThreadsMe

Runbook ini menerangkan cara menjalankan, menyemak, dan memulihkan ThreadsMe.

## URL Penting

| Tujuan | URL |
| --- | --- |
| GUI rasmi | `http://localhost/threadsme/` |
| AI health | `http://127.0.0.1:8788/api/health` |
| Node dev fallback | `http://localhost:8791/threadsme/` |

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

Jika mahu Product Intelligence cuba endpoint Shopee yang memerlukan sesi login, simpan cookie login sebagai salah satu pilihan berikut:

- Env var `SHOPEE_COOKIE`.
- Fail private `work/private/shopee-cookie.txt`.

Jangan commit cookie Shopee. Jika `hasShopeeCookie:false`, ThreadsMe masih akan cuba redirect metadata + DeepSeek tetapi mungkin label produk sebagai `story_inferred`.

## Workflow Jana Story Produk

1. Isi link affiliate produk.
2. Masukkan link gambar atau upload/paste gambar jika ada.
3. Klik `Auto semak produk Shopee` jika mahu semak sebelum generate, atau terus klik `Auto cipta & jadualkan`.
4. ThreadsMe akan cuba isi `Tajuk produk` dan `Kategori / kegunaan produk` daripada link Shopee, metadata, dan DeepSeek.
5. Edit tajuk/kategori jika mahu override manual.
6. Pilih jumlah posting sehari, default semasa ialah `25 posting / hari`.
7. Klik `Auto cipta & jadualkan`.
8. Semak output dan status di Jadual Threads.

Jika produk masih tidak dapat dikenal pasti dengan yakin, sistem mesti menolak generate dan minta tajuk produk sebenar. Jika produk cuma `story_inferred`, siri ditahan sebagai `Perlu Semak` sehingga disahkan.

## Product Audit dan Quality Gate

- `Auto Audit Produk` berjalan bersama sync automation 60 saat. Ia re-check metadata, Quality Gate, dan tahan siri yang belum sah produk.
- Auto Audit cuba auto isi metadata produk daripada link affiliate Shopee sebelum meminta tindakan manual.
- Auto Audit hanya anggap produk sah jika `link_verified` atau `manual_verified`; `story_inferred` kekal perlu semak.
- Guna menu `Tindakan Saya` untuk lihat hanya tindakan yang memerlukan input manusia, bukan semua log automation.
- Siri yang tidak cukup relevan akan ditahan sebagai `Perlu Semak`.
- `Perlu Semak` tidak patut masuk Pending atau publisher live.
- Guna menu `Audit Produk` untuk pilih batch seperti `26-35`, isi tajuk/kategori produk sebenar, kemudian klik `Simpan metadata` atau `Regenerate story`.
- Bila pilih satu siri, semak panel `Ayat semasa untuk semakan` dahulu. Panel ini memaparkan `[POST UTAMA]`, `[REPLY 1]`, dan `[REPLY 2]` bersama kiraan aksara supaya copywriting lama boleh dinilai sebelum regenerate.
- Selepas story dibaiki, automation sync seterusnya akan kira semula slot Pending.

## Runtime Data

Runtime aktif berada dalam `work/runtime/`:

```text
work/runtime/threads-schedule.json
work/runtime/status.json
work/runtime/story-runs.json
work/runtime/publish-log.json
```

Fail root `threads_flexi_marble_schedule.json`, `status.json` dan `story-runs.json` kekal sebagai snapshot/fallback static. Jangan risau jika `work/runtime/` berubah ketika server hidup; folder itu diabaikan git.

## Status Queue

- `Pending`: queue aktif.
- `Blocked`: belum gagal, menunggu slot kosong.
- `Perlu Semak`: story ditahan Quality Gate dan perlu audit produk.
- `Lulus`: posted/passed.
- `Gagal`: gagal diproses atau ditanda gagal.

Queue aktif maksimum ialah `25`. Jika ada lebih banyak siri, baki akan kekal `Blocked` sehingga slot kosong.

## Pulihkan Blocked

ThreadsMe patut auto promote `Blocked` kepada `Pending` bila slot scheduled kosong. Jika tidak berlaku:

1. Semak AI server masih hidup.
2. Semak `work/runtime/status.json` valid jika server sudah pernah hidup.
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

Nota: runtime yang berubah setiap 60 saat sepatutnya berada dalam `work/runtime/`, bukan root repo.
