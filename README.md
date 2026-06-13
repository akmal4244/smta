# Sistem Marvis Threads Auto (SMTA)

**Sistem Marvis Threads Auto (SMTA)** ialah sistem automasi kandungan Threads untuk affiliate marketing. Sistem ini membantu jana story produk dalam Bahasa Melayu Malaysia, susun jadual 20 posting sehari, pantau status queue, dan sediakan publisher automatik melalui Threads API.

Nama rasmi sistem:

| Item | Maklumat |
| --- | --- |
| Nama sistem | Sistem Marvis Threads Auto (SMTA) |
| Repo slug | smta |
| Versi | v0.7.1 |
| Bahasa UI | Bahasa Melayu Malaysia |
| Zon masa | Asia/Kuala_Lumpur |
| Kredit | Sistem Dibangunkan Sepenuhnya Oleh Akmal Marvis |

## Fungsi Utama

- Jana siri 3 post Threads: `[POST UTAMA]`, `[REPLY 1]`, `[REPLY 2]`.
- Storytelling deep storyline untuk netizen Malaysia.
- Input produk melalui gambar upload, paste gambar, link gambar, nota produk, dan link affiliate.
- Pilihan posting sehari termasuk `20 posting / hari`.
- Auto cipta story dan terus masukkan ke jadual SMTA.
- Kalendar jadual harian dengan semakan 20 slot sehari.
- Status posting: `Lulus`, `Pending`, `Blocked`, `Gagal`, dan `Disediakan`.
- Auto promote `Blocked` kepada `Pending` bila slot schedule kosong.
- Publisher Threads API dengan mode `Dry-run` dan mode live apabila token rasmi sudah diset.
- UI refresh gaya `gpt-tasteskill`: Geist typography, sidebar premium, grid gapless, dan motion GSAP.

## Cara Jalankan

Keperluan:

- Node.js 18 atau lebih baru.
- Akaun DeepSeek jika mahu jana story AI.
- Threads API user ID dan access token jika mahu publish live.

Pasang dan jalan:

```bash
npm install
npm run start
```

Buka:

```text
http://127.0.0.1:8791/smta/
```

Jalankan server AI dalam terminal lain:

```bash
npm run ai
```

Server AI default:

```text
http://127.0.0.1:8788
```

## API Key

SMTA tidak commit API key ke repo.

Pilihan DeepSeek:

```bash
set DEEPSEEK_API_KEY=sk-...
npm run ai
```

Atau simpan dalam fail private:

```text
work/private/deepseek.key
```

Threads access token pula boleh disimpan melalui GUI Publisher atau melalui env:

```bash
set THREADS_ACCESS_TOKEN=...
```

Fail private yang diabaikan git:

```text
work/private/
publish-log.json
.env
```

## Struktur Sistem

```text
smta/
├─ assets/
│  ├─ flexi-marble-sheet.png
│  ├─ smta-favicon.svg
│  └─ smta-logo.svg
├─ ai-server.mjs
├─ app.js
├─ index.html
├─ server.mjs
├─ status.json
├─ story-runs.json
├─ styles.css
├─ threads_flexi_marble_schedule.json
├─ package.json
├─ .env.example
├─ .gitignore
└─ README.md
```

## Database JSON

SMTA menggunakan JSON file database supaya ringan dan mudah audit.

| Fail | Fungsi |
| --- | --- |
| `threads_flexi_marble_schedule.json` | Senarai siri posting, slot jadual, CTA, dan affiliate link. |
| `status.json` | Status queue semasa: scheduled, posted, failed, remaining, publisher config ringkas. |
| `story-runs.json` | Rekod output story yang dijana oleh AI. |
| `publish-log.json` | Log publisher runtime. Fail ini tidak di-commit. |
| `work/private/*.json` dan `work/private/*.txt` | Token/API key private. Fail ini tidak di-commit. |

## Workflow Automation

```mermaid
flowchart TD
  A["Input produk / gambar / link affiliate"] --> B["Jana story AI"]
  B --> C["Validasi format Threads"]
  C --> D["Masuk jadual 20 posting sehari"]
  D --> E["Pending maksimum 25 aktif"]
  E --> F["Blocked menunggu slot kosong"]
  F --> G["Auto promote kepada Pending"]
  E --> H["Publisher dry-run atau live Threads API"]
  H --> I["Status Lulus atau Gagal"]
```

## Nota Had Threads

SMTA mengekalkan queue aktif maksimum 25 siri Pending untuk mengelakkan jadual bertindih. Baki siri akan kekal `Blocked` sehingga slot kosong. Status hanya patut dianggap `Pending` selepas SMTA berjaya memasukkan siri ke queue automation.

## Version Log

### v0.7.1

- Repo rasmi baru untuk **Sistem Marvis Threads Auto (SMTA)**.
- UI refresh gaya `gpt-tasteskill`.
- Nama repo GitHub rasmi: `smta`.
- Server static portable untuk `/smta/` dan masih sokong `/mta/`.
- AI server portable dengan `SMTA_WORKSPACE_ROOT`.

## Kredit

Sistem Dibangunkan Sepenuhnya Oleh **Akmal Marvis**.
