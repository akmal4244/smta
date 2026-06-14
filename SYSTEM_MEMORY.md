# Ingatan Sistem SMTA

Fail ini ialah rujukan tetap untuk Sistem Marvis Threads Auto (SMTA). Tujuannya supaya tetapan, keputusan terdahulu, dan prinsip operasi tidak hilang apabila kerja disambung semula.

## Identiti Sistem

| Item | Tetapan |
| --- | --- |
| Nama rasmi | Sistem Marvis Threads Auto (SMTA) |
| Repo slug | `smta` |
| Localhost rasmi | `http://localhost/smta/` |
| Bahasa UI | Bahasa Melayu Malaysia |
| Zon masa | `Asia/Kuala_Lumpur` |
| Kredit | Sistem Dibangunkan Sepenuhnya Oleh Akmal Marvis |
| Stack | Vanilla HTML, CSS, JavaScript, Node.js |
| Data storage | JSON file database |

## Tetapan Operasi Semasa

- Default jadual ialah `25 posting / hari`.
- Had queue aktif ialah maksimum `25` siri `Pending`.
- Siri selebihnya kekal `Blocked` atau `Remaining` sehingga slot kosong.
- Auto sync server berjalan setiap `60 saat`.
- AI server berjalan di `http://127.0.0.1:8788`.
- Model AI semasa ialah `deepseek-v4-flash`.
- Publisher Threads default mesti kekal `Dry-run` sehingga token dan User ID disahkan.
- Token dan API key tidak boleh di-commit ke repo.

## Peraturan Story Produk

- `Tajuk produk wajib` mesti diisi sebelum jana story.
- `Kategori / kegunaan produk` sangat digalakkan supaya story tidak lari produk.
- Link gambar Shopee sahaja tidak cukup untuk kenal produk kerana URL imej tidak semestinya membawa nama produk.
- Setiap siri mesti ada tiga bahagian:
  - `[POST UTAMA]`
  - `[REPLY 1]`
  - `[REPLY 2]`
- Setiap bahagian maksimum `300 aksara`.
- `Reply 2` mesti berakhir dengan link affiliate yang tepat.
- Gaya copywriting: santai, personal, deep storytelling, Bahasa Melayu Malaysia, sesuai dengan netizen Malaysia di Threads.
- Elakkan claim berlebihan, ayat terlalu iklan, typo keterlaluan, dan manfaat yang tidak berkaitan dengan produk sebenar.

## Makna Status

| Status UI | Makna Sistem |
| --- | --- |
| `Pending` | Siri sudah masuk queue aktif dan menunggu slot publish. |
| `Lulus` | Siri sudah dianggap posted/passed oleh sistem. |
| `Blocked` | Siri belum gagal; ia cuma menunggu slot queue kosong. |
| `Gagal` | Siri gagal diproses atau ditanda gagal. |
| `Disediakan` | Siri disimpan tetapi belum aktif dalam queue. |

## Fail Data Penting

| Fail | Fungsi |
| --- | --- |
| `threads_flexi_marble_schedule.json` | Jadual semua siri posting, slot, copy, affiliate link, dan metadata produk. |
| `status.json` | Runtime status queue: scheduled, posted, failed, remaining, publisher config ringkas. |
| `story-runs.json` | Rekod output AI dan metadata run. |
| `publish-log.json` | Log publisher runtime; tidak di-commit. |
| `work/private/` | Lokasi private untuk API key dan token; tidak di-commit. |

## Snapshot Audit Terakhir

Snapshot ini dibuat pada `2026-06-14` dan boleh berubah apabila automasi berjalan.

- Total siri dalam jadual: `121`.
- Pending aktif: `25`.
- Posted/Lulus: `9`.
- Failed/Gagal: `0`.
- Remaining/Blocked: `87`.
- Batch terbaru `#97-#121` ditetapkan kepada produk `Sambal Nyet Berapi by Khairulaming 180g`.
- Batch terbaru sudah bawah `300 aksara` untuk setiap post.
- Ada `61` siri generated lama yang belum ada metadata `productTitle`; ini patut diaudit kemudian.

## Prinsip Design

- UI mesti profesional, tenang, dan tidak sakit mata.
- Font tidak perlu besar-besar; keutamaan ialah kebolehbacaan dan density yang kemas.
- Gunakan sidebar seperti sistem pentadbir, bukan landing page.
- Modul mesti dipisahkan: Ringkasan, Jana Story, Jadual Threads, Automasi/Publisher.
- Status automation mesti sentiasa jelas pada pengguna.
- Gunakan gaya Kumo UI dan taste-skill sebagai arah visual: surface hierarchy, token warna semantik, spacing kemas, dan micro-motion ringan.

## Keutamaan Naik Taraf Seterusnya

1. Product Audit untuk betulkan siri lama yang story-nya tidak kena produk.
2. Quality Gate sebelum story masuk jadual.
3. Auto ekstrak tajuk/kategori produk daripada link Shopee atau affiliate.
4. Tukar render dinamik daripada `innerHTML` kepada DOM builder dan `textContent`.
5. Pisahkan runtime data daripada repo supaya `status.json` tidak sentiasa dirty.
6. Tambah Automation Health Dashboard.
7. Tambah Preview Netizen sebelum publish live.

## Larangan Penting

- Jangan commit API key, Threads token, atau data private.
- Jangan palsukan status `Pending`; status itu hanya sah selepas sistem benar-benar masukkan siri ke queue aktif.
- Jangan jadikan `Blocked` sebagai gagal. Ia cuma menunggu slot.
- Jangan publish live ke Threads tanpa confirmation dan tanpa semakan token/User ID.
