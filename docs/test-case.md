# Dokumen Skenario Pengujian Fungsionalitas (Test Cases) — Kairos

Dokumen ini memuat daftar skenario pengujian (*test cases*) fungsional dan keamanan privasi untuk aplikasi **Kairos (Sistem Penjadwal Pertemuan Kelompok Berbasis Rutinitas)** mengacu pada spesifikasi di `docs/kairos.md` dan `docs/tasks.md`.

---

## Panduan Umum Pengujian

- **Lingkungan Uji:**
  - Aplikasi berjalan pada `http://localhost:3000`.
  - Database PostgreSQL aktif dan skema Prisma telah termigrasi.
  - Siapkan minimal **2 sesi peramban (*browser*) untuk User Terdaftar** (misal: **Akun A / Inisiator** di profil utama, **Akun B / Anggota** di profil kedua) dan **1 jendela Incognito / Peramban berbeda untuk Peserta Tamu (Guest C)**.
- **Konvensi Status Uji:**
  - `[ ]` Belum diuji
  - `[x]` Lulus (*Pass*)
  - `[!]` Gagal (*Fail*)

---

## Ringkasan Cakupan Modul

1. **Modul 1 — Autentikasi & Manajemen Identitas (F1)** (`TC-AUTH-01` s/d `TC-AUTH-05`)
2. **Modul 2 — Jadwal Rutin Mingguan / Baseline (F2)** (`TC-BASE-01` s/d `TC-BASE-06`)
3. **Modul 3 — Jadwal Insidental / Override (F3)** (`TC-OVER-01` s/d `TC-OVER-06`)
4. **Modul 4 — Pembuatan & Pengelolaan Ruang Temu / Room (F4)** (`TC-ROOM-01` s/d `TC-ROOM-07`)
5. **Modul 5 — Partisipasi Room & Hierarki Resolusi Ketersediaan (F5)** (`TC-PART-01` s/d `TC-PART-07`)
6. **Modul 6 — Peta Kesibukan Anonim & Privasi Data (F6 & F10)** (`TC-PRIV-01` s/d `TC-PRIV-03`)
7. **Modul 7 — Rekomendasi Waktu Terbaik / Best Time (F7)** (`TC-BEST-01` s/d `TC-BEST-03`)
8. **Modul 8 — Opsi Toleransi & Penanganan Deadlock (F8)** (`TC-DEAD-01` s/d `TC-DEAD-04`)
9. **Modul 9 — Penguncian Jadwal Final & Pemilihan Sub-Slot (F9)** (`TC-LOCK-01` s/d `TC-LOCK-05`)

---

## 1. Modul Autentikasi & Manajemen Identitas (F1)

| ID Test | Nama Skenario | Prasyarat | Langkah Pengujian | Hasil yang Diharapkan (Expected Result) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-AUTH-01** | Login Google OAuth & Auto-Registrasi User Baru | Pengguna belum pernah login sebelumnya. | 1. Buka halaman utama `/`.<br>2. Klik tombol **Masuk dengan Google**.<br>3. Selesaikan autentikasi akun Google. | 1. Pengguna diarahkan ke `/dashboard`.<br>2. Baris baru otomatis tercatat di tabel `users` dengan `baseline: []` dan `overrides: []`.<br>3. Cookie sesi JWT `httpOnly` tersimpan di browser.<br>4. `GET /api/v1/auth/me` mengembalikan profil pengguna (`200 OK`). | [ ] |
| **TC-AUTH-02** | Proteksi Akses Halaman & API Dashboard bagi Pengunjung Anonim | Pengguna belum login (mode Incognito). | 1. Buka langsung URL `/dashboard`.<br>2. Panggil endpoint `GET /api/v1/schedule` dan `GET /api/v1/rooms` tanpa sesi login. | 1. Halaman `/dashboard` menampilkan kartu ajakan **Masuk untuk Mengelola Jadwal Pribadi** (tidak menampilkan data).<br>2. Endpoint API mengembalikan status `401 Unauthorized`. | [ ] |
| **TC-AUTH-03** | Partisipasi Tamu (Guest) Tanpa Login & Penyimpanan Token | Tersedia ruang temu berstatus `Open` (`/room/[id]`). Pengunjung belum login. | 1. Buka `/room/[id]` di jendela Incognito.<br>2. Pada bagian **Lanjut tanpa akun (Tamu)**, ketik nama `"Andi Tamu"` lalu klik **Gabung sebagai tamu**. | 1. `POST /api/v1/rooms/[id]/join` mengembalikan `guest_token` mentah satu kali.<br>2. Browser menyimpan token di `localStorage` dengan kunci `kairos_guest_token_[id]`.<br>3. Di database `session_participants`, hanya nilai hash SHA-256 (`guest_token_hash`) yang tersimpan.<br>4. Grid interaktif terbuka bagi `"Andi Tamu"`. | [ ] |
| **TC-AUTH-04** | Persistensi Sesi Guest di Browser yang Sama | **TC-AUTH-03** selesai dilakukan. | 1. Muat ulang (*refresh* `F5`) halaman `/room/[id]` pada browser yang sama. | 1. Browser mengirimkan header `x-guest-token` saat memanggil `GET /api/v1/rooms/[id]`.<br>2. Server mengenali `"Andi Tamu"` (`actor.actor_type = "guest"`, `actor.is_participant = true`).<br>3. Tamu tetap dapat mengedit slot ketersediaannya. | [ ] |
| **TC-AUTH-05** | Kehilangan Akses Edit Guest jika Token Hilang / Beda Perangkat | **TC-AUTH-03** selesai dilakukan. | 1. Hapus `localStorage` pada browser tamu (atau buka `/room/[id]` di perangkat/profil lain). | 1. Pengunjung dianggap `anonymous` (`actor.is_participant = false`).<br>2. Pengunjung tidak dapat mengubah jadwal milik `"Andi Tamu"` yang sudah ada. | [ ] |

---

## 2. Modul Jadwal Rutin Mingguan / Baseline (F2)

| ID Test | Nama Skenario | Prasyarat | Langkah Pengujian | Hasil yang Diharapkan (Expected Result) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-BASE-01** | Tambah Jadwal Rutin Mingguan Valid | User terdaftar login di `/dashboard`. | 1. Pada kartu **Jadwal Rutin Mingguan**, klik **Tambah kegiatan rutin**.<br>2. Pilih Hari: `Senin`, Jam Mulai: `08:00`, Jam Selesai: `10:00`, Nama Kegiatan: `"Kuliah Algoritma"` (label rahasia).<br>3. Klik **Simpan perubahan**. | 1. `POST /api/v1/schedule/baseline` mengembalikan `201 Created`.<br>2. Item tampil di kolom hari **Senin** (`08:00 – 10:00 · Kuliah Algoritma`).<br>3. Notifikasi sukses muncul. | [ ] |
| **TC-BASE-02** | Validasi Jam Selesai $\le$ Jam Mulai | User terdaftar login di `/dashboard`. | 1. Buka dialog **Tambah kegiatan rutin**.<br>2. Pilih Hari: `Senin`, Jam Mulai: `10:00`, Jam Selesai: `09:00` (atau `10:00`), Nama: `"Rapat"`.<br>3. Klik **Simpan perubahan**. | 1. Sistem menolak penyimpanan dengan pesan validasi bahwa jam selesai harus setelah jam mulai (`400 Bad Request`). | [ ] |
| **TC-BASE-03** | Validasi Anti-Tumpuk (*Overlap*) pada Hari yang Sama | Hari `Senin` sudah memiliki jadwal `08:00 – 10:00` (**TC-BASE-01**). | 1. Buka dialog **Tambah kegiatan rutin**.<br>2. Pilih Hari: `Senin`, Jam Mulai: `09:30`, Jam Selesai: `11:00`, Nama: `"Praktikum"`.<br>3. Klik **Simpan perubahan**. | 1. `POST /api/v1/schedule/baseline` menolak request (`409 Conflict` / `400`).<br>2. Pesan error menampilkan bahwa jadwal bertabrakan dengan kegiatan rutin `"Kuliah Algoritma (08:00–10:00)"`. | [ ] |
| **TC-BASE-04** | Jadwal Berbatasan Langsung (*Adjacent*) Diizinkan | Hari `Senin` sudah memiliki jadwal `08:00 – 10:00`. | 1. Tambah kegiatan rutin baru pada hari `Senin`, Jam Mulai: `10:00`, Jam Selesai: `12:00`, Nama: `"Seminar"`. | 1. Penyimpanan berhasil (`201 Created`) karena batas akhir `10:00` tidak tumpang tindih dengan batas awal `10:00`. | [ ] |
| **TC-BASE-05** | Edit Jadwal Rutin Mingguan | Terdapat item jadwal rutin di `/dashboard`. | 1. Klik ikon **Edit (Pensil)** pada item `"Seminar (10:00–12:00)"`.<br>2. Ubah Jam Selesai menjadi `11:30` dan nama menjadi `"Seminar Riset"`.<br>3. Klik **Simpan perubahan**. | 1. `PUT /api/v1/schedule/baseline/[id]` berhasil (`200 OK`).<br>2. Tampilan kartu hari Senin langsung diperbarui menjadi `10:00 – 11:30 · Seminar Riset`. | [ ] |
| **TC-BASE-06** | Hapus Jadwal Rutin Mingguan | Terdapat item jadwal rutin di `/dashboard`. | 1. Klik ikon **Hapus (Tempat Sampah)** pada item `"Seminar Riset"`. | 1. `DELETE /api/v1/schedule/baseline/[id]` berhasil (`200 OK`).<br>2. Item terhapus dari daftar hari Senin. | [ ] |

---

## 3. Modul Jadwal Insidental / Override (F3)

| ID Test | Nama Skenario | Prasyarat | Langkah Pengujian | Hasil yang Diharapkan (Expected Result) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-OVER-01** | Tambah *Eventual Block* (Tambahan Sibuk Insidental) | User terdaftar login di `/dashboard`. | 1. Pada kartu **Pengecualian & Jadwal Insidental**, klik **Tambah sibuk (Block)**.<br>2. Isi Dari Tanggal: `2026-11-16`, Sampai Tanggal: `2026-11-16`, Jam Mulai: `13:00`, Jam Selesai: `15:00`, Nama: `"Kunjungan Dokter"`.<br>3. Klik **Simpan tambahan sibuk**. | 1. `POST /api/v1/schedule/overrides` (`type: "block"`) berhasil (`201 Created`).<br>2. Item muncul di daftar override dengan badge **Tambahan Sibuk**. | [ ] |
| **TC-OVER-02** | Tambah *Eventual Unblock* pada 1 Kegiatan Rutin Spesifik | User memiliki jadwal rutin Senin `08:00 – 10:00` (`"Kuliah Algoritma"`). | 1. Klik tombol **Liburkan rutin (Unblock)**.<br>2. Pilih Dari & Sampai Tanggal: `2026-11-16` (hari Senin).<br>3. Pada dropdown **Target Jadwal Rutin**, pilih `"Senin: 08:00–10:00 — Kuliah Algoritma"`.<br>4. Klik **Simpan peliburan**. | 1. `POST /api/v1/schedule/overrides` (`type: "unblock"`, `baseline_id: "<id>"`) berhasil (`201 Created`).<br>2. Item muncul dengan badge **Liburkan Rutin** yang merujuk pada kegiatan `"Kuliah Algoritma"`. | [ ] |
| **TC-OVER-03** | Tambah *Eventual Unblock* Seharian Penuh (`baseline_id: null`) | User login di `/dashboard`. | 1. Klik tombol **Liburkan rutin (Unblock)**.<br>2. Pilih rentang tanggal `2026-11-17` s/d `2026-11-18`.<br>3. Pilih opsi **"Liburkan seluruh jadwal rutin seharian penuh"**.<br>4. Klik **Simpan peliburan**. | 1. Tersimpan dengan `baseline_id: null`.<br>2. Seluruh jadwal rutin pada tanggal `17–18 Nov 2026` otomatis dianggap luang. | [ ] |
| **TC-OVER-04** | Validasi Rentang Tanggal Override (`date_to < date_from`) | User login di `/dashboard`. | 1. Buka dialog **Tambah sibuk (Block)**.<br>2. Isi Dari Tanggal: `2026-11-20`, Sampai Tanggal: `2026-11-18`.<br>3. Klik simpan. | 1. Sistem menolak input dengan pesan validasi bahwa tanggal selesai harus sama atau setelah tanggal mulai (`400 Bad Request`). | [ ] |
| **TC-OVER-05** | Pembersihan Otomatis (*Cascade Cleanup*) Override `Unblock` Saat Baseline Dihapus | Terdapat `unblock` yang merujuk ke `"Kuliah Algoritma"` (**TC-OVER-02**). | 1. Hapus item jadwal rutin `"Kuliah Algoritma"` pada kartu **Jadwal Rutin Mingguan**. | 1. Item `"Kuliah Algoritma"` terhapus dari `baseline`.<br>2. Item `unblock` yang memiliki `baseline_id` milik `"Kuliah Algoritma"` **otomatis ikut terhapus** dari daftar `overrides` tanpa menyisakan referensi yatim (*orphan reference*). | [ ] |
| **TC-OVER-06** | Hapus Item Override secara Manual | Terdapat item override di daftar. | 1. Klik ikon **Hapus (Tempat Sampah)** pada salah satu item override. | 1. `DELETE /api/v1/schedule/overrides/[id]` berhasil (`200 OK`) dan item hilang dari daftar. | [ ] |

---

## 4. Modul Pembuatan & Pengelolaan Ruang Temu / Room (F4)

| ID Test | Nama Skenario | Prasyarat | Langkah Pengujian | Hasil yang Diharapkan (Expected Result) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-ROOM-01** | Buat Ruang Temu Baru & Auto-Join Inisiator | Akun A login di `/dashboard`. | 1. Klik tombol **Buat ruang temu** di kanan atas `/dashboard`.<br>2. Isi Judul: `"Sinkronisasi Sprint"`, Dari Tanggal: `2026-11-16`, Sampai Tanggal: `2026-11-17`, Jam Operasional: `08:00` s/d `15:00`, Durasi: `60 menit`, Kuorum: `2`.<br>3. Klik **Buat ruang temu**. | 1. `POST /api/v1/rooms` berhasil (`201 Created`).<br>2. Inisiator (Akun A) otomatis terdaftar di `session_participants`.<br>3. Browser otomatis mengarahkan ke `/room/[id]`. | [ ] |
| **TC-ROOM-02** | Validasi Durasi Rapat Melebihi Rentang Jam Operasional Harian | Akun A membuka dialog **Buat ruang temu**. | 1. Pilih Jam Mulai Grid: `08:00`, Jam Selesai Grid: `09:00` (rentang 60 menit).<br>2. Pilih Target Durasi Rapat: `120 menit` (2 jam).<br>3. Klik **Buat ruang temu**. | 1. Sistem menolak pembuatan room (`400 Bad Request`) dengan pesan bahwa durasi rapat tidak boleh melebihi rentang jam operasional harian. | [ ] |
| **TC-ROOM-03** | Daftar Riwayat Room (*Dibuat oleh Saya* vs *Diikuti*) | Akun A telah membuat room; Akun B telah bergabung ke room milik Akun A. | 1. Buka `/dashboard` pada Akun A dan periksa tab **Dibuat oleh Saya**.<br>2. Buka `/dashboard` pada Akun B dan periksa tab **Diikuti**. | 1. Room `"Sinkronisasi Sprint"` muncul di tab **Dibuat oleh Saya** milik Akun A.<br>2. Room yang sama muncul di tab **Diikuti** milik Akun B lengkap dengan nama inisiatornya. | [ ] |
| **TC-ROOM-04** | Edit Parameter Room Saat Status `Open` & Belum Ada Peserta Lain | Room baru dibuat oleh Akun A (jumlah peserta masih `1` orang, yaitu Akun A sendiri). | 1. Di `/dashboard` Akun A, klik tombol **Edit** pada kartu room.<br>2. Ubah Judul menjadi `"Sinkronisasi Sprint #2"` dan Durasi menjadi `90 menit`.<br>3. Klik **Simpan perubahan**. | 1. `PATCH /api/v1/rooms/[id]` mengembalikan `200 OK`.<br>2. Parameter room berhasil diperbarui. | [ ] |
| **TC-ROOM-05** | Penolakan Edit Parameter Room Setelah Ada Peserta Lain Bergabung | Akun B atau Guest C telah bergabung ke room (jumlah peserta $\ge 2$). | 1. Periksa kartu room di `/dashboard` Akun A.<br>2. Coba kirim request `PATCH /api/v1/rooms/[id]` secara langsung ke API. | 1. Di UI `/dashboard`, tombol **Edit** otomatis disembunyikan.<br>2. Di level API, `PATCH /api/v1/rooms/[id]` ditolak dengan status `403 Forbidden` / `400 Bad Request`. | [ ] |
| **TC-ROOM-06** | Salin Tautan Undangan Room | Room tersedia di `/dashboard` atau `/room/[id]`. | 1. Klik tombol **Salin tautan** pada kartu room atau header `/room/[id]`. | 1. URL lengkap `http://localhost:3000/room/[id]` tersalin ke *clipboard* dan toast konfirmasi tampil. | [ ] |
| **TC-ROOM-07** | Hapus Ruang Temu oleh Inisiator | Room dibuat oleh Akun A. | 1. Pada `/dashboard` Akun A, klik ikon **Hapus (Tempat Sampah)** pada kartu room. | 1. `DELETE /api/v1/rooms/[id]` berhasil (`200 OK`).<br>2. Room beserta seluruh baris `session_participants` terkait terhapus secara *cascade*. | [ ] |

---

## 5. Modul Partisipasi Room & Hierarki Resolusi Ketersediaan (F5)

| ID Test | Nama Skenario | Prasyarat | Langkah Pengujian | Hasil yang Diharapkan (Expected Result) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-PART-01** | Auto-Join Peserta Terdaftar & Sinkronisasi Jadwal Otomatis | Akun B memiliki jadwal pribadi dan membuka tautan `/room/[id]` yang berstatus `Open`. | 1. Login sebagai Akun B.<br>2. Buka `/room/[id]`. | 1. Akun B otomatis didaftarkan ke room tanpa perlu menekan tombol gabung manual.<br>2. Grid ketersediaan Akun B langsung terisi sesuai jadwal rutin & insidental miliknya. | [ ] |
| **TC-PART-02** | Pengujian Urutan Hierarki Kalkulasi User Terdaftar (`Baseline` $\rightarrow$ `Unblock` $\rightarrow$ `Block`) | Pada tanggal Senin `2026-11-16`, Akun A memiliki:<br>- `Baseline`: Senin `08:00–12:00` (`"Kuliah"`).<br>- `Unblock`: `2026-11-16` untuk `"Kuliah"`.<br>- `Block`: `2026-11-16` pukul `09:00–10:00` (`"Ujian Dadakan"`). | 1. Buka `/room/[id]` yang mencakup tanggal `2026-11-16` sebagai Akun A.<br>2. Amati status tiap slot 30 menit antara `08:00–12:00`. | 1. Slot `08:00–09:00` dan `10:00–12:00` berstatus **Luang** (karena `Baseline` diliburkan oleh `Unblock`).<br>2. Slot `09:00–10:00` berstatus **Sibuk** dengan label `"Ujian Dadakan"` (karena `Block` dieksekusi setelah `Unblock`). | [ ] |
| **TC-PART-03** | *Room-Level Override* oleh User Terdaftar (`Sibuk` $\rightarrow$ `Tetap Hadir`) | Akun A memiliki slot **Sibuk** pada `2026-11-16` pukul `09:00–09:30` di dalam `/room/[id]`. | 1. Di halaman `/room/[id]`, klik sel slot `09:00–09:30` milik Akun A.<br>2. Amati perubahan status sel dan angka pada heatmap. | 1. `PUT /api/v1/rooms/[id]/availability` menyimpan slot tersebut ke `room_input`.<br>2. Status sel berubah menjadi badge **Hadir (Override)** (`overridden_free`).<br>3. Jumlah peserta sibuk (`busy_count`) pada slot tersebut berkurang 1 secara *real-time*.<br>4. Jadwal pribadi Akun A di `/dashboard` **tidak berubah**. | [ ] |
| **TC-PART-04** | Pembatasan Satu Arah pada User Terdaftar (Slot Luang Tidak Bisa Di-klik Jadi Sibuk di Room) | Akun A memiliki slot **Luang** pada `2026-11-16` pukul `08:00–08:30` di `/room/[id]`. | 1. Coba klik sel slot `08:00–08:30` yang sudah berstatus **Luang** di grid `/room/[id]`. | 1. Sel slot luang tidak berubah menjadi sibuk (interaksi override di dalam room bagi user terdaftar hanya mengizinkan arah `Sibuk` $\rightarrow$ `Hadir` sesuai spesifikasi F5). | [ ] |
| **TC-PART-05** | Fitur Reset **"Kembalikan ke jadwal pribadi"** | Akun A memiliki minimal 1 *Room-Level Override* aktif (**TC-PART-03**). | 1. Klik tombol **Kembalikan ke jadwal pribadi** di bagian atas matriks `/room/[id]`. | 1. `POST /api/v1/rooms/[id]/reset` mengosongkan `room_input` (`[]`) milik Akun A.<br>2. Seluruh slot Akun A di room tersebut kembali mengikuti jadwal pribadinya. | [ ] |
| **TC-PART-06** | Pengisian Ketersediaan Manual oleh Guest | Guest C telah bergabung ke `/room/[id]` (**TC-AUTH-03**). | 1. Pada awalnya seluruh slot Guest C berstatus **Sibuk** (`room_input: []`).<br>2. Klik slot `10:00–10:30` dan `10:30–11:00` pada tanggal `2026-11-16`. | 1. Kedua slot berubah menjadi **Luang** bagi Guest C.<br>2. `available_count` kelompok pada pukul `10:00–11:00` bertambah 1.<br>3. Jika diklik kembali, slot berubah kembali menjadi **Sibuk**. | [ ] |
| **TC-PART-07** | Propagasi Real-Time Perubahan Jadwal Dashboard ke Seluruh Room `Open` | Akun B tergabung di Room X (status `Open`). | 1. Akun B membuka `/dashboard` dan menambahkan *Eventual Block* baru pada tanggal `2026-11-16` pukul `13:00–14:00`.<br>2. Buka kembali halaman Room X (`/room/[id]`). | 1. Tanpa perlu aksi tambahan di dalam room, kalkulasi Room X langsung memperhitungkan blok baru milik Akun B pada pukul `13:00–14:00`. | [ ] |

---

## 6. Modul Peta Kesibukan Anonim & Privasi Data (F6 & F10)

| ID Test | Nama Skenario | Prasyarat | Langkah Pengujian | Hasil yang Diharapkan (Expected Result) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-PRIV-01** | Visualisasi Gradasi Heatmap Anonim & Mode Tampilan | Room diikuti oleh minimal 2 peserta dengan variasi slot luang dan sibuk. | 1. Buka `/room/[id]`.<br>2. Amati indikator warna dan angka pada setiap sel matriks.<br>3. Klik tombol pengalih mode **Murni Anonim** di kanan atas matriks. | 1. Setiap sel hanya menampilkan rasio agregat (contoh: `0/3 sibuk`, `1/3 sibuk`, `3/3 sibuk`) beserta gradasi warna.<br>2. Mode **Murni Anonim** menyembunyikan indikator status pribadi dan menampilkan peta kesibukan kelompok secara bersih. | [ ] |
| **TC-PRIV-02** | Audit Privasi Payload Jaringan (`GET /api/v1/rooms/[id]`) | Akun A memiliki label kegiatan rahasia `"Konsultasi Medis Pribadi"` di jadwalnya. Pengguna lain (Akun B / Guest C) membuka `/room/[id]`. | 1. Buka *Browser DevTools* $\rightarrow$ tab **Network** pada browser Akun B atau Guest C.<br>2. Muat `/room/[id]` dan periksa JSON response dari `GET /api/v1/rooms/[id]`. | 1. Objek `calculation.heatmap` **hanya** berisi `{ date, start, end, busy_count, available_count, total_participants }`.<br>2. **Tidak ada** string `"Konsultasi Medis Pribadi"` di bagian mana pun dari JSON response yang diterima Akun B / Guest C.<br>3. **Tidak ada** daftar nama peserta yang sibuk maupun yang hadir pada tiap slot di dalam payload. | [ ] |
| **TC-PRIV-03** | Isolasi `personal_grid` Hanya untuk Pemanggil Sendiri | Akun A dan Akun B berada di room yang sama. | 1. Periksa properti `personal_grid` dari response `GET /api/v1/rooms/[id]` saat dipanggil oleh Akun A vs saat dipanggil oleh Guest C. | 1. Saat dipanggil oleh Akun A, `personal_grid` berisi label kegiatan milik Akun A sendiri.<br>2. Saat dipanggil oleh Guest C, `personal_grid` hanya berisi status `free`/`busy` milik Guest C dengan `label: null`. | [ ] |

---

## 7. Modul Rekomendasi Waktu Terbaik / Best Time (F7)

| ID Test | Nama Skenario | Prasyarat | Langkah Pengujian | Hasil yang Diharapkan (Expected Result) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-BEST-01** | Kalkulasi & Urutan Prioritas *Best Time* | Room memiliki `duration_min: 60`, `quorum: 2`, dan diikuti 3 peserta.<br>- Jendela A (`2026-11-16 10:00–11:00`): 3/3 hadir (60 mnt).<br>- Jendela B (`2026-11-16 13:00–15:00`): 2/3 hadir (120 mnt).<br>- Jendela C (`2026-11-16 08:00–09:00`): 2/3 hadir (60 mnt). | 1. Buka `/room/[id]` dan amati panel **Rekomendasi Waktu** di sebelah kanan. | 1. Ketiga jendela memenuhi syarat `durasi >= 60` dan `hadir >= 2`.<br>2. Urutan rekomendasi yang tampil:<br>   - **#1:** Jendela A (`3/3 hadir`, 60 mnt) — *unggul jumlah hadir*.<br>   - **#2:** Jendela B (`2/3 hadir`, 120 mnt) — *unggul durasi luang*.<br>   - **#3:** Jendela C (`2/3 hadir`, 60 mnt). | [ ] |
| **TC-BEST-02** | Pengurutan Waktu Paling Awal (*Tie-Breaker*) | Terdapat 2 jendela waktu dengan jumlah hadir dan durasi yang persis sama:<br>- `2026-11-16 14:00–15:00` (3/3 hadir, 60 mnt).<br>- `2026-11-16 09:00–10:00` (3/3 hadir, 60 mnt). | 1. Periksa urutan kartu pada panel **Rekomendasi Waktu**. | 1. Jendela `09:00–10:00` muncul di urutan **#1** sebelum `14:00–15:00`. | [ ] |
| **TC-BEST-03** | Pembatasan Maksimal 5 Rekomendasi *Best Time* Teratas | Terdapat lebih dari 5 jendela waktu terpisah yang memenuhi syarat durasi dan kuorum. | 1. Periksa jumlah kartu rekomendasi *Best Time* yang ditampilkan. | 1. Sistem hanya mengembalikan dan menampilkan maksimal **5 rekomendasi terbaik**. | [ ] |

---

## 8. Modul Opsi Toleransi & Penanganan Deadlock (F8)

| ID Test | Nama Skenario | Prasyarat | Langkah Pengujian | Hasil yang Diharapkan (Expected Result) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-DEAD-01** | Status Menunggu Peserta (`waiting_for_participants`) Saat Peserta = 1 | Room baru dibuat oleh Inisiator (total peserta = 1 orang, belum ada peserta lain bergabung). | 1. Buka `/room/[id]` sebagai Inisiator. | 1. Panel kanan menampilkan informasi **Menunggu Peserta Lain**.<br>2. Belum menampilkan Best Time maupun peringatan Deadlock. | [ ] |
| **TC-DEAD-02** | Opsi Toleransi 1: *Peserta Parsial* (`2 <= hadir < quorum`) | Room memiliki `duration_min: 60`, `quorum: 3`, diikuti 3 peserta.<br>Tidak ada waktu di mana 3 orang luang bersamaan, tetapi ada jendela `10:00–11:30` (90 mnt) di mana **2 dari 3 peserta** luang. | 1. Buka `/room/[id]` dan amati panel kanan. | 1. Daftar *Best Time* kosong.<br>2. Muncul bagian **Opsi Toleransi — Peserta Parsial (Di Bawah Kuorum)** yang menampilkan jendela `10:00–11:30` (`2/3 hadir · 90 mnt`, maksimal 3 opsi).<br>3. Inisiator tetap dapat memilih opsi ini untuk dikunci. | [ ] |
| **TC-DEAD-03** | Opsi Toleransi 2: *Durasi Lebih Singkat* (`30 <= durasi < duration_min`) | Room memiliki `duration_min: 90`, `quorum: 2`, diikuti 2 peserta.<br>Kedua peserta hanya luang bersama selama **60 menit** (`10:00–11:00`). | 1. Buka `/room/[id]` dan amati panel kanan. | 1. Daftar *Best Time* kosong.<br>2. Muncul bagian **Opsi Toleransi — Durasi Lebih Singkat** yang menampilkan jendela `10:00–11:00` (`2/2 hadir · 60 mnt`, maksimal 3 opsi).<br>3. Inisiator tetap dapat mengunci opsi durasi 60 menit tersebut. | [ ] |
| **TC-DEAD-04** | Kondisi *Deadlock Mutlak* (Seluruh Slot Dihadiri $\le 1$ Orang) | Room diikuti $\ge 2$ peserta, namun di seluruh slot tidak ada satu pun waktu di mana minimal 2 orang luang bersamaan (semua slot hanya `0` atau `1` orang luang). | 1. Buka `/room/[id]` dan amati panel kanan. | 1. `calculation.deadlock.is_deadlock` bernilai `true`.<br>2. Tampil kotak peringatan merah **Deadlock Mutlak — Tidak Ada Irisan Waktu**.<br>3. Tidak ada tombol **Pilih & kunci jadwal** yang aktif hingga ada peserta yang melonggarkan jadwalnya. | [ ] |

---

## 9. Modul Penguncian Jadwal Final & Pemilihan Sub-Slot (F9)

| ID Test | Nama Skenario | Prasyarat | Langkah Pengujian | Hasil yang Diharapkan (Expected Result) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-LOCK-01** | Pemilihan Sub-Slot Spesifik Saat Jendela Rekomendasi $>$ `duration_min` | Room memiliki target `duration_min: 60` menit.<br>Terdapat rekomendasi *Best Time* pukul `11:00–15:00` (`240 menit`). | 1. Login sebagai Inisiator (Akun A) dan buka `/room/[id]`.<br>2. Klik tombol **Pilih & kunci jadwal** pada kartu rekomendasi `11:00–15:00`.<br>3. Amati dialog **Kunci Jadwal Pertemuan**. | 1. Dialog menampilkan dropdown **Pilih Sub-Slot Spesifik (60 menit)** dengan 7 pilihan berurutan pergeseran 30 menit:<br>   - `11:00 – 12:00`<br>   - `11:30 – 12:30`<br>   - `12:00 – 13:00`<br>   - `12:30 – 13:30`<br>   - `13:00 – 14:00`<br>   - `13:30 – 14:30`<br>   - `14:00 – 15:00` | [ ] |
| **TC-LOCK-02** | Eksekusi Kunci Jadwal oleh Inisiator (`Open` $\rightarrow$ `Confirmed`) | Dialog **Kunci Jadwal Pertemuan** terbuka (**TC-LOCK-01**). | 1. Pilih sub-slot `11:30 – 12:30 WIB`.<br>2. Klik tombol **Kunci jadwal**. | 1. `POST /api/v1/rooms/[id]/lock` mengembalikan `200 OK`.<br>2. Status room berubah menjadi badge **Confirmed (Terkunci)**.<br>3. Banner **Jadwal Pertemuan Final Terkunci** tampil di bagian atas halaman `/room/[id]` dengan detail tanggal, pukul `11:30 – 12:30 WIB`, durasi `60 menit`, dan tingkat kehadiran. | [ ] |
| **TC-LOCK-03** | Proteksi Otorisasi Penguncian Jadwal (Non-Inisiator Ditolak) | Room berstatus `Open`. Pengunjung adalah Akun B (Anggota) atau Guest C. | 1. Buka `/room/[id]` sebagai Akun B atau Guest C.<br>2. Coba panggil `POST /api/v1/rooms/[id]/lock` secara langsung. | 1. Di UI, tombol **Pilih & kunci jadwal** tidak ditampilkan bagi non-inisiator.<br>2. Di API, request ditolak dengan status `403 Forbidden`. | [ ] |
| **TC-LOCK-04** | Sifat Permanen Room `Confirmed` (Imutabilitas Grid & Tanpa Kalkulasi Ulang) | Room sudah berstatus `Confirmed` (**TC-LOCK-02**). | 1. Buka `/room/[id]` sebagai peserta.<br>2. Coba ubah jadwal pribadi di `/dashboard`, atau coba panggil `PUT /api/v1/rooms/[id]/availability` dan `POST /api/v1/rooms/[id]/reset`. | 1. Halaman `/room/[id]` langsung menampilkan kartu jadwal final tanpa memuat grid interaktif dan tanpa menjalankan ulang `scheduler-engine`.<br>2. Seluruh endpoint mutasi partisipasi (`/availability`, `/reset`, `/join`, `/lock`) pada room tersebut menolak perubahan (`400 Bad Request`). | [ ] |
| **TC-LOCK-05** | Tidak Ada Fitur Buka Kunci (*Unlock*) | Room sudah berstatus `Confirmed`. | 1. Periksa halaman `/room/[id]` dan `/dashboard` milik Inisiator. | 1. Tidak ada tombol *Unlock* atau pengeditan jadwal final; jadwal yang telah dikunci bersifat permanen sesuai spesifikasi F9. | [ ] |

