# Backlog Tambah Baik SMTA

Fail ini menyimpan cadangan tambah baik yang sudah dikenal pasti supaya kerja seterusnya boleh disambung dengan jelas.

## P0 - Kualiti Produk dan Story

### Product Audit

Masalah:

- Ada siri generated lama yang belum ada metadata `productTitle`.
- Story lama boleh tersasar daripada produk sebenar.

Cadangan:

- Tambah modul `Product Audit`.
- Paparkan batch yang tiada `productTitle`.
- Benarkan user set tajuk produk dan kategori secara batch.
- Tambah tindakan `Regenerate story` untuk siri yang tidak relevan.

### Quality Gate

Masalah:

- Story yang lulus format belum tentu sedap dibaca atau relevan.

Cadangan:

- Semak setiap siri sebelum masuk jadual.
- Skor minimum:
  - relevan dengan produk,
  - hook kuat,
  - BM Malaysia natural,
  - tidak claim berlebihan,
  - Reply 2 ada link,
  - semua bahagian bawah 300 aksara.
- Jika gagal, statuskan sebagai `Perlu Semak`.

## P1 - Automasi Produk Shopee

### Auto Product Intelligence

Masalah:

- Link gambar Shopee tidak cukup untuk AI tahu produk.
- Kadang imej ialah banner promosi, bukan gambar produk.

Cadangan:

- Bila user paste link Shopee/affiliate, SMTA cuba cari tajuk produk, kategori, dan manfaat asas.
- Paparkan cadangan kepada user untuk confirm sebelum generate.
- Simpan metadata dalam `story-runs.json` dan `threads_flexi_marble_schedule.json`.

## P1 - Keselamatan Frontend

### Ganti Render `innerHTML`

Masalah:

- Beberapa bahagian UI render data dinamik menggunakan `innerHTML`.
- Ini boleh merosakkan layout jika teks AI/user mengandungi HTML.

Cadangan:

- Tukar render data dinamik kepada DOM builder dan `textContent`.
- Kekalkan `innerHTML` hanya untuk template statik yang tidak memuatkan input user/AI.
- Tambah helper kecil untuk cipta badge/status dengan selamat.

## P2 - Data dan Repo Hygiene

### Pisahkan Runtime Data

Masalah:

- `status.json` berubah setiap 60 saat bila automation hidup.
- Git worktree jadi dirty walaupun sistem normal.

Cadangan:

- Pindahkan runtime state ke `work/runtime/` atau `data/runtime/`.
- Commit hanya template/example JSON.
- Tambah export/import backup melalui GUI.

## P2 - Dashboard Operasi

### Automation Health

Cadangan panel:

- AI server OK.
- DeepSeek key OK.
- Pending aktif `25/25`.
- Blocked/Remaining.
- Publisher mode.
- Last sync.
- Next due.
- Last error.

### Usage Dashboard

Cadangan panel:

- Token DeepSeek per run.
- Jumlah story dijana hari ini.
- Anggaran kos AI.
- Jumlah siri dijadualkan hari ini.
- Nota manual untuk usage Codex jika user mahu rekod sendiri.

## P3 - Pengalaman Pengguna

### Preview Netizen

Cadangan:

- Paparkan siri seperti thread sebenar.
- Highlight ayat terlalu iklan, terlalu generik, atau tidak kena produk.
- Tambah butang `Baiki tone`, `Lebih deep story`, `Lebih soft sell`, dan `Lebih direct CTA`.

### Mobile Navigation

Cadangan:

- Pada skrin kecil, sidebar boleh jadi collapsible atau bottom nav.
- Matlamat: lebih ruang untuk form Jana Story dan Jadual Threads.
