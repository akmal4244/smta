# Restore Runtime ThreadsMe

ThreadsMe kini menyediakan restore CLI yang selamat untuk backup folder `runtime-cli-*` dan snapshot JSON `threadsme-backup-*.json`.

## Sebelum restore

1. Hentikan AI server atau worker ThreadsMe supaya runtime tidak ditulis semasa restore.
2. Kenal pasti backup yang hendak digunakan.
3. Jalankan dry-run dahulu. Dry-run tidak mengubah sebarang fail.

```bash
npm run restore:runtime -- --from latest
```

Atau gunakan folder/fail tertentu:

```bash
npm run restore:runtime -- --from work/backups/runtime-cli-2026-06-18T10-00-00-000Z
npm run restore:runtime -- --from work/backups/threadsme-backup-2026-06-18T10-00-00-000Z.json
```

## Apply restore

Selepas output dry-run menunjukkan kiraan post, status, story run dan cache yang betul:

```bash
npm run restore:runtime -- --apply --from latest
```

Sebelum menulis runtime baharu, ThreadsMe akan mencipta backup keselamatan automatik:

```text
work/backups/runtime-pre-restore-*
```

Restore hanya menulis lima fail runtime berikut:

- `threads-schedule.json`
- `status.json`
- `story-runs.json`
- `publish-log.json`
- `product-intel-cache.json`

Fail private seperti password, token, API key dan cookie tidak dipulihkan. Backup yang mengandungi nilai secret dalam payload runtime akan ditolak.

## Selepas restore

1. Hidupkan semula AI server.
2. Semak `/api/ops-health` dan `/api/automation-health`.
3. Pastikan jumlah Pending, Blocked, story run dan Product Intel cache kelihatan betul.
4. Kekalkan publisher dalam `Dry-run` sehingga satu siri diuji.

## QA

```bash
npm run qa:restore
```
