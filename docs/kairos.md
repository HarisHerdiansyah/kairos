# Brief Fitur dan Data: Web Penjadwal Meet Kelompok

Draf final alur fitur, kebutuhan data, dan alur data. Mengikuti outline proyek yang sudah final, tanpa penambahan fitur.

## 1. Ringkasan dan asumsi

Web tools untuk merencanakan jadwal meet kelompok. Pengguna menyimpan rutinitas mingguan sekali, lalu setiap rencana meet cukup membagikan satu tautan publik. Sistem menumpuk jadwal semua peserta dan menampilkan irisan waktu luang sebagai rekomendasi.

Asumsi teknis:

- Satu zona waktu (WIB) untuk semua peserta.
- Resolusi waktu 30 menit.
- Status room hanya dua: **Open** dan **Confirmed**.
- Semua pengecekan hak akses dilakukan di server.

## 2. Keputusan yang sudah ditetapkan

| Hal | Keputusan |
|---|---|
| Inisiator room | Wajib user terdaftar (login Google) |
| Grid user terdaftar | Selalu terisi dari jadwal pribadi, tidak ada grid kosong; disunting dari situ |
| Arah penyuntingan user terdaftar | Hanya dari sibuk menjadi hadir |
| Pembatalan penyesuaian | Satu tombol "kembalikan ke jadwal pribadi" per room |
| Grid guest | Kosong, diisi manual |
| Identitas rahasia | Hanya guest token; inisiator dikenali lewat `owner_id` |
| Urutan Best Time | Peserta hadir terbanyak, lalu durasi luang terpanjang, lalu waktu paling awal |
| Jumlah Best Time | 5 teratas |
| Durasi luang | Panjang jendela bebas yang berurutan |
| Deadlock, peserta parsial | Maksimal 3 opsi, hanya yang hadir minimal separuh peserta, urut dari jumlah hadir terbanyak |
| Deadlock, durasi lebih singkat | Maksimal 3 opsi, urut dari durasi terpanjang |
| Kalkulasi | Dihitung ulang setiap room dibuka, tanpa cache |
| Setelah dikunci | Tidak ada tombol buka kunci |
| Guest ganti browser | Akses edit hilang (token hanya di browser) |
| Label kegiatan | Tidak pernah dikirim ke peserta lain |

## 3. Alur fitur

### F1. Autentikasi dan sesi

1. Pengunjung memilih **Masuk dengan Google**.
2. Jika belum ada di sistem, akun dibuat otomatis; jika sudah ada, langsung masuk.
3. Pengunjung tanpa login yang membuka tautan room menjadi **Guest**, dengan hak akses hanya pada room itu dan isiannya sendiri.
4. User terdaftar mendapat dashboard jadwal pribadi dan bisa membuat room. Guest tidak punya dashboard.

### F2. Jadwal rutin (Baseline)

1. User memilih **Tambah jadwal rutin**, lalu mengisi hari (Senin-Minggu), jam mulai, jam selesai, dan nama kegiatan.
2. Sistem memvalidasi: jam selesai setelah jam mulai, dan tidak bertumpuk dengan slot lain di hari yang sama.
3. Slot berlaku berulang tiap minggu tanpa batas.
4. User dapat mengedit dan menghapus slot, dengan validasi yang sama.

### F3. Jadwal insidental (Override)

**Eventual Block** (menambah kesibukan):

1. User mengisi tanggal atau rentang tanggal, jam, dan nama kegiatan.
2. Sistem menyimpan sebagai override bertipe `block`. Setelah rentangnya lewat, override tidak berpengaruh lagi.

**Eventual Unblock** (meliburkan rutinitas):

1. User memilih rentang tanggal dan slot rutin yang diliburkan (atau seluruh hari).
2. Sistem menyimpan sebagai override bertipe `unblock`. Baseline tidak diubah, hanya diabaikan pada tanggal itu.

User dapat menghapus override.

### F4. Membuat room

1. User terdaftar memilih **Buat ruang temu**.
2. User mengisi judul, rentang tanggal pencarian, dan target durasi rapat.
3. Sistem membuat room berstatus Open dengan tautan publik berisi ID acak.
4. Inisiator otomatis menjadi peserta, lalu membagikan tautan.

### F5. Mengisi ketersediaan di room

Semua peserta memakai grid tanggal dan jam yang sama (mirip Timeful), dibatasi pada rentang tanggal room.

**User terdaftar:**

1. Membuka tautan, login Google bila belum, lalu otomatis menjadi peserta.
2. Grid langsung terisi dari jadwal pribadi (baseline, dikurangi unblock, ditambah block).
3. User dapat menghapus atau mengubah blok sibuk di grid untuk menandai "saya tetap hadir" (**Room-Level Override**). Efeknya hanya di room ini; jadwal pribadi tidak berubah. Arahnya hanya satu: sibuk menjadi hadir.
4. Tombol **Kembalikan ke jadwal pribadi** membatalkan semua penyesuaian di room itu.

**Guest:**

1. Membuka tautan, memilih **Lanjut tanpa akun**, dan memasukkan nama.
2. Grid kosong. Guest menandai slot kosongnya secara manual.
3. Guest dapat membuka kembali tautan dari browser yang sama untuk memperbarui isiannya.

Selama room Open, semua peserta dapat mengubah isiannya.

### F6. Tampilan kesibukan anonim

1. Grid room menampilkan warna per slot sesuai **jumlah peserta yang sibuk**.
2. Tidak ada nama kegiatan dan tidak ada identitas per slot.

### F7. Rekomendasi (Best Time)

1. Sistem menghitung irisan waktu luang semua peserta.
2. Daftar **5 Best Time teratas** ditampilkan dengan dua metrik: jumlah peserta hadir dan durasi luang.
3. Urutan: peserta hadir terbanyak, lalu durasi luang terpanjang, lalu waktu paling awal.
4. Daftar dihitung ulang setiap room dibuka.

### F8. Deadlock Handling

Dipicu bila tidak ada slot yang cocok untuk semua peserta selama target durasi penuh. Sistem menampilkan opsi toleransi dengan metrik yang sama seperti F7:

- **Peserta parsial**: durasi penuh, tetapi hanya sebagian peserta yang hadir (misalnya 4 dari 5). Hanya yang hadir minimal separuh peserta, maksimal 3 opsi, urut dari jumlah hadir terbanyak.
- **Durasi lebih singkat**: semua peserta hadir, tetapi durasi kurang dari target. Maksimal 3 opsi, urut dari durasi terpanjang.

### F9. Lock Schedule

1. Inisiator memilih satu slot dari F7 atau F8, lalu menekan **Kunci jadwal**.
2. Sistem menyimpan slot pemenang dan mengubah status room menjadi **Confirmed**.
3. Semua peserta yang membuka room melihat tampilan Confirmed berisi jadwal terpilih. Isian tidak bisa diubah lagi dan tidak ada tombol buka kunci.

Status room: `Open` -> (Lock Schedule oleh inisiator) -> `Confirmed`.

## 4. Kebutuhan data

Tiga tabel utama (seperti di Supabase), dengan jadwal disimpan sebagai JSON.

### Tabel `users`

| Kolom | Keterangan |
|---|---|
| id | primary key |
| google_id, email, name | dari Google OAuth |
| baseline | JSON array slot rutin |
| overrides | JSON array override |
| created_at | |

```json
"baseline": [
  {"id": "b1", "day": 1, "start": "08:00", "end": "10:00", "label": "Kuliah"}
],
"overrides": [
  {"id": "o1", "type": "block", "date_from": "2026-11-10", "date_to": "2026-11-10",
   "start": "13:00", "end": "15:00", "label": "Rapat"},
  {"id": "o2", "type": "unblock", "date_from": "2026-11-17", "date_to": "2026-11-19",
   "baseline_id": "b1"}
]
```

### Tabel `sessions` (room)

| Kolom | Keterangan |
|---|---|
| id | ID acak yang muncul di tautan publik |
| owner_id | FK ke users (inisiator, wajib) |
| title, date_from, date_to, duration_min | parameter pencarian |
| status | `open` atau `confirmed` |
| locked_slot | JSON slot pemenang, null selama open |
| created_at | |

### Tabel `session_participants`

| Kolom | Keterangan |
|---|---|
| id, session_id, joined_at | |
| user_id | FK ke users, null untuk guest |
| guest_name | dipakai bila user_id null |
| guest_token_hash | hash token acak, hanya guest |
| room_input | JSON, maknanya tergantung jenis peserta |

Makna `room_input`:

- **Guest**: daftar slot kosong yang ditandai manual (disalin ke peserta, *pass by value*).
- **User terdaftar**: daftar slot yang ditandai "hadir" untuk mengesampingkan jadwal pribadi; jadwal pribadinya sendiri dibaca dari `users` (*pass by reference*).

Aturan: satu peserta pasti memiliki `user_id` atau `guest_name`, tidak keduanya.

## 5. Alur data

### Alur tulis

| Aksi | Dibaca | Ditulis |
|---|---|---|
| Login Google | `users` (cari google_id) | `users` (buat bila baru) |
| Baseline: tambah, edit, hapus | `users.baseline` | `users.baseline` |
| Override: tambah, hapus | `users.overrides` | `users.overrides` |
| Buat room | sesi login | `sessions` (open), `session_participants` (inisiator) |
| User bergabung | `sessions` | `session_participants` |
| User menyunting grid atau mereset | baris peserta sendiri | `room_input` |
| Guest bergabung | `sessions` | `session_participants`; token dikirim ke browser |
| Guest mengisi atau mengubah | cocokkan token | `room_input` |
| Lock schedule | cek owner dan status open | `locked_slot`, `status = confirmed` |

### Alur kalkulasi (server, setiap room dibuka)

```
1. Ambil room dan semua peserta
2. Untuk setiap peserta, tentukan interval sibuk per tanggal dalam rentang room:
   - user terdaftar:
       a. baseline untuk hari-dalam-minggu tanggal itu
       b. buang slot yang tercakup override 'unblock'
       c. tambahkan override 'block'
       d. kurangi dengan room_input (slot "hadir" tidak dianggap sibuk)
   - guest: sibuk = kebalikan dari room_input
3. Pecah ke slot 30 menit, hitung jumlah peserta bebas per slot
4. Gabungkan slot berurutan menjadi jendela waktu
5. Hasilkan:
   - peta kesibukan anonim: (tanggal, jam, jumlah_sibuk), tanpa label
   - Best Time: jendela dengan semua peserta bebas >= duration_min, 5 teratas
   - bila kosong: opsi deadlock (peserta parsial, durasi lebih singkat)
```

Urutan langkah 2 penting: unblock diterapkan sebelum block, agar kesibukan dadakan tidak ikut terhapus oleh libur.

### Privasi

Label kegiatan dan identitas per slot tidak pernah dikirim ke peserta lain. Klien hanya menerima angka agregat per slot. Pemilik jadwal melihat labelnya sendiri di dashboard pribadi dan di gridnya sendiri.

### Setelah dikunci

Klien hanya membaca `locked_slot` dan tidak menghitung ulang. Server menolak semua penulisan ke `room_input`.

## 6. Hak akses

| Aksi | Inisiator | Peserta terdaftar | Guest |
|---|---|---|---|
| Melihat room dan hasil | ya | ya | ya |
| Mengubah isian sendiri | ya | ya | ya (token cocok) |
| Mengunci jadwal | ya | tidak | tidak |
| Mengubah atau menghapus room | ya | tidak | tidak |

Semua pengecekan dilakukan di server, bukan di frontend. ID room dan guest token harus acak dan panjang, bukan auto-increment.

## 7. Batas cakupan

Dokumen ini hanya mencakup fitur yang ada di outline final: autentikasi Google OAuth, jadwal rutin, jadwal insidental, room publik dengan input manual untuk semua peserta dan Room-Level Override untuk user terdaftar, tampilan anonim, rekomendasi Best Time, Deadlock Handling, dan Lock Schedule. Tidak ada fitur tambahan.
