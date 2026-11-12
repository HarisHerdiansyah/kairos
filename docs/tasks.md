# Rancangan Urutan Kerja Sistem Penjadwal Meet Kelompok (Kairos)

Dokumen ini merumuskan tahapan kerja secara sistematis dan bertahap berdasarkan spesifikasi di `docs/kairos.md`, aturan arsitektur di `AGENTS.md`, panduan desain di `.agents/skills/frontend-design/SKILL.md`, serta seluruh keputusan teknis yang telah disepakati.

---

## Ringkasan Keputusan Teknis Final

1. **Arsitektur & Tech Stack:**
   - **Monolith Next.js (App Router):** Frontend dan Backend dalam satu repositori, terhubung murni melalui **REST API dengan prefix `/api/v1/*`** (tanpa *Server Actions*).
   - **Database & ORM:** PostgreSQL + Prisma ORM (3 tabel utama: `users`, `sessions`, `session_participants`).
   - **Autentikasi:** NextAuth (Auth.js) menggunakan provider Google OAuth dengan strategi sesi **JWT (`httpOnly` cookie)** tanpa tabel sesi tambahan di database.
   - **UI & Styling:** Komponen `shadcn/ui` (`base-luma`), token warna/radius/font murni dari `src/app/globals.css` (tanpa *custom hex* di kode, tanpa *glassmorphism*).

2. **Aturan Bisnis & Logika Kalkulasi:**
   - **Zona Waktu & Resolusi:** WIB (UTC+7), resolusi slot **30 menit**.
   - **Jam Operasional Grid:** Ditentukan oleh inisiator saat membuat room (`time_from` s/d `time_to`).
   - **Eventual Unblock (F3):** Mendukung peliburan 1 slot rutin spesifik (`baseline_id: "<id>"`) atau seluruh jadwal rutin seharian (`baseline_id: null`) pada rentang tanggal `date_from` s/d `date_to`. Penghapusan item `baseline` otomatis membersihkan `unblock` yang merujuk ke ID tersebut.
   - **Pengaturan Kuorum (5A - Opsi A):** Inisiator menentukan kuorum berupa **angka pasti** jumlah peserta minimal (`quorum >= 2`).
   - **Best Time (F7):** Jendela waktu berurutan dengan `durasi >= duration_min` dan `jumlah_hadir >= quorum` (maksimal 5 teratas; urutan: jumlah hadir terbanyak $\rightarrow$ durasi luang terpanjang $\rightarrow$ waktu paling awal).
   - **Opsi Toleransi / Alternatif (5B - Opsi 1 & 5C - Opsi 2):** Dipicu apabila daftar Best Time kosong, selama masih ada irisan waktu yang dihadiri **lebih dari 1 orang ($\ge 2$ peserta)**:
     1. *Peserta Parsial:* `durasi >= duration_min` dan `2 <= jumlah_hadir < quorum` (maksimal 3 opsi; urutan: hadir terbanyak $\rightarrow$ durasi terpanjang $\rightarrow$ waktu paling awal).
     2. *Durasi Lebih Singkat:* `30 <= durasi < duration_min` dan `jumlah_hadir >= 2` (maksimal 3 opsi; urutan: durasi terpanjang $\rightarrow$ hadir terbanyak $\rightarrow$ waktu paling awal).
   - **Deadlock Mutlak (5C - Opsi 2):** Terjadi apabila di seluruh slot tidak ada satu pun waktu yang dihadiri $\ge 2$ orang (maksimal hanya $\le 1$ orang per slot). Pada kondisi ini tombol kunci jadwal dinonaktifkan hingga ada peserta yang menyesuaikan ketersediaannya.
   - **Lock Schedule Sub-Slot (Poin 4 - Opsi B):** Jika jendela rekomendasi yang dipilih memiliki durasi lebih panjang dari `duration_min`, inisiator memilih sub-slot spesifik sepanjang `duration_min` (pergeseran 30 menit) sebelum mengunci jadwal.
   - **Hak Edit Room (Poin 6):** Inisiator hanya dapat mengubah parameter room selama status room masih `open` **dan** belum ada peserta lain yang bergabung/mengisi.

---

## Tahapan Pelaksanaan Kerja

### Tahap 1: Setup Infrastruktur, Database (Prisma), dan Utilitas Dasar

#### Prerequisites
- Database PostgreSQL aktif dan URL koneksi (`DATABASE_URL`) tersedia di `.env`.
- Node.js & `pnpm` terpasang di lingkungan kerja.

#### Alur Kerja
1. Menginstal dependensi backend dasar: `prisma`, `@prisma/client`, `zod` (untuk validasi payload API), dan `nanoid` (atau `crypto` bawaan Node untuk ID room acak & token guest).
2. Menginisialisasi Prisma dan menyusun skema `prisma/schema.prisma` untuk 3 tabel utama:
   - `User` (`users`): `id`, `google_id` (unique), `email` (unique), `name`, `baseline` (Json, default `[]`), `overrides` (Json, default `[]`), `created_at`.
   - `Session` (`sessions`): `id` (string acak), `owner_id` (FK ke `users.id`), `title`, `date_from`, `date_to`, `time_from`, `time_to`, `duration_min`, `quorum`, `status` (`open` | `confirmed`), `locked_slot` (Json nullable), `created_at`.
   - `SessionParticipant` (`session_participants`): `id`, `session_id` (FK ke `sessions.id`, cascade delete), `user_id` (nullable FK ke `users.id`), `guest_name` (nullable), `guest_token_hash` (nullable), `room_input` (Json, default `[]`), `joined_at`.
3. Menjalankan migrasi database (`prisma migrate dev`) dan men-generate Prisma Client.
4. Membuat singleton Prisma Client di `src/lib/prisma.ts`, helper standar respons/error API di `src/lib/api-response.ts`, serta tipe TypeScript dan skema validasi Zod untuk struktur JSON (`BaselineItem`, `OverrideItem`, `LockedSlot`, `RoomInput`) di `src/types/kairos.ts`.

#### Output
- File `prisma/schema.prisma` dan folder migrasi SQL terbentuk di database PostgreSQL.
- File `src/lib/prisma.ts`, `src/lib/api-response.ts`, dan `src/types/kairos.ts` siap digunakan oleh seluruh endpoint `/api/v1/*`.

---

### Tahap 2: Autentikasi Google OAuth (NextAuth JWT) & Manajemen Identitas Guest

#### Prerequisites
- **Tahap 1** selesai.
- Kredensial `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `NEXTAUTH_SECRET` (atau `AUTH_SECRET`) tersedia di `.env`.

#### Alur Kerja
1. Menginstal `next-auth` dan mengonfigurasi opsi autentikasi di `src/lib/auth.ts`:
   - Menggunakan Google Provider dan strategi sesi `jwt`.
   - Pada callback `signIn` / `jwt`: mencari user di tabel `users` berdasarkan `google_id`; jika belum ada maka otomatis membuat baris baru di `users`, lalu menyematkan `user.id` internal ke dalam token JWT.
2. Membuat route handler autentikasi di bawah prefix `/api/v1/auth/[...nextauth]/route.ts` serta endpoint profil sesi `/api/v1/auth/me/route.ts`.
3. Membuat utilitas kriptografi server-side di `src/lib/guest-token.ts` untuk:
   - Men-generate token acak panjang (32+ byte hex/base64url) bagi Guest.
   - Melakukan hashing SHA-256 (`guest_token_hash`) untuk disimpan dan dicocokkan di server.
4. Membuat helper otorisasi server-side (`requireAuthUser`, `resolveRoomActor`) untuk memverifikasi apakah pemanggil API adalah Inisiator (`owner_id`), Peserta Terdaftar (`user_id`), atau Guest yang sah (`x-guest-token` cocok dengan `guest_token_hash`).

#### Output
- Endpoint `/api/v1/auth/*` berjalan dengan sesi JWT `httpOnly`.
- Helper otorisasi server-side di `src/lib/auth.ts` dan `src/lib/guest-token.ts` siap mengamankan seluruh endpoint API.

---

### Tahap 3: Backend API Jadwal Pribadi (Baseline F2 & Override F3)

#### Prerequisites
- **Tahap 1** dan **Tahap 2** selesai.

#### Alur Kerja
1. Membuat utilitas validasi waktu di `src/lib/time-utils.ts`:
   - Validasi format jam `HH:mm` pada resolusi 30 menit (`:00` atau `:30`).
   - Validasi `end > start` dan deteksi tumpang tindih (*overlap*) antar-slot pada hari yang sama.
   - Validasi format tanggal `YYYY-MM-DD` (WIB) dan `date_to >= date_from`.
2. Membangun endpoint `/api/v1/schedule/route.ts`:
   - `GET`: Mengambil data `baseline` dan `overrides` milik user yang sedang login.
3. Membangun endpoint `/api/v1/schedule/baseline/route.ts` dan `/api/v1/schedule/baseline/[id]/route.ts`:
   - `POST`: Menambah jadwal rutin baru (hari `1–7`, `start`, `end`, `label`) setelah lolos validasi anti-tumpuk.
   - `PUT`: Mengedit jadwal rutin yang sudah ada dengan validasi anti-tumpuk terhadap slot lain di hari yang sama.
   - `DELETE`: Menghapus slot `baseline` sekaligus **membersihkan otomatis** item di `users.overrides` yang bertipe `unblock` dengan `baseline_id` yang dihapus tersebut.
4. Membangun endpoint `/api/v1/schedule/overrides/route.ts` dan `/api/v1/schedule/overrides/[id]/route.ts`:
   - `POST`: Menambah jadwal insidental bertipe `block` (`date_from`, `date_to`, `start`, `end`, `label`) atau `unblock` (`date_from`, `date_to`, `baseline_id: string | null`).
   - `DELETE`: Menghapus item override berdasarkan ID.

#### Output
- Endpoint `/api/v1/schedule`, `/api/v1/schedule/baseline`, dan `/api/v1/schedule/overrides` berfungsi penuh dengan validasi server-side.

---

### Tahap 4: Engine Kalkulasi Ketersediaan, Best Time, Opsi Toleransi, & Deadlock

#### Prerequisites
- **Tahap 1** dan **Tahap 3** (utilitas waktu & tipe data) selesai.

#### Alur Kerja
1. Membangun modul murni (*pure function*) di `src/lib/scheduler-engine.ts` yang menerima parameter room (`date_from`, `date_to`, `time_from`, `time_to`, `duration_min`, `quorum`) dan daftar peserta beserta jadwal mereka.
2. Mengimplementasikan **Resolusi Slot Sibuk per Peserta** (Langkah 2 alur kalkulasi):
   - Membangkitkan daftar slot 30 menit per tanggal dalam rentang `date_from` s/d `date_to` yang berada di antara `time_from` dan `time_to`.
   - **User Terdaftar:**
     1. Ambil `baseline` yang sesuai dengan hari-dalam-minggu tanggal tersebut.
     2. Buang slot yang tercakup oleh `override` bertipe `unblock` pada tanggal tersebut (baik `baseline_id === null` maupun `baseline_id` spesifik).
     3. Tambahkan slot yang tercakup oleh `override` bertipe `block` pada tanggal tersebut.
     4. Kurangi dengan slot yang ada di `room_input` (slot yang ditandai "hadir" di room ini).
   - **Guest:**
     1. Semua slot di luar `room_input` dianggap sibuk (`sibuk = kebalikan dari room_input`).
3. Mengimplementasikan **Peta Kesibukan Anonim (F6)**:
   - Menghitung `busy_count` dan `available_count` untuk setiap slot 30 menit tanpa menyertakan label kegiatan ataupun nama peserta per slot.
4. Mengimplementasikan **Penggabungan Jendela Waktu & Klasifikasi Rekomendasi (F7 & F8)**:
   - Menggabungkan slot 30 menit berurutan pada tanggal yang sama menjadi jendela waktu kontigu berdasarkan tingkat kehadiran peserta.
   - **Best Time (F7):** Filter jendela dengan `duration >= duration_min` dan `available_count >= quorum`. Urutkan berdasarkan `available_count DESC`, `duration DESC`, lalu `waktu paling awal ASC`. Ambil maksimal **5 teratas**.
   - **Kondisi Kompromi / Toleransi (jika Best Time kosong):**
     - *Peserta Parsial (5B Opsi 1):* Filter jendela dengan `duration >= duration_min` dan `2 <= available_count < quorum`. Urutkan berdasarkan `available_count DESC`, `duration DESC`, `waktu paling awal ASC`. Ambil maksimal **3 opsi**.
     - *Durasi Lebih Singkat (5C Opsi 2):* Filter jendela dengan `30 <= duration < duration_min` dan `available_count >= 2` (diutamakan yang memenuhi kuorum lalu jumlah hadir terbanyak). Urutkan berdasarkan `duration DESC`, `available_count DESC`, `waktu paling awal ASC`. Ambil maksimal **3 opsi**.
   - **Status Deadlock Mutlak:** Bernilai `true` apabila Best Time, Peserta Parsial, dan Durasi Lebih Singkat semuanya kosong (tidak ada satu pun slot 30 menit dengan `available_count >= 2`).

#### Output
- File `src/lib/scheduler-engine.ts` yang teruji untuk berbagai skenario jadwal, override, kuorum, kompromi, dan deadlock.

---

### Tahap 5: Backend API Manajemen Room, Partisipasi, & Lock Schedule

#### Prerequisites
- **Tahap 2**, **Tahap 3**, dan **Tahap 4** selesai.

#### Alur Kerja
1. Membangun endpoint koleksi room di `/api/v1/rooms/route.ts`:
   - `GET`: Mengambil daftar riwayat room yang dibuat (`owned`) dan diikuti (`joined`) oleh user terdaftar untuk halaman Dashboard.
   - `POST`: Membuat room baru (`title`, `date_from`, `date_to`, `time_from`, `time_to`, `duration_min`, `quorum`) dan otomatis menambahkan inisiator ke `session_participants`.
2. Membangun endpoint detail & pengelolaan room di `/api/v1/rooms/[id]/route.ts`:
   - `GET`:
     - Jika status `open`: menjalankan `scheduler-engine` secara *real-time* (tanpa cache) dan mengembalikan info room, daftar nama peserta (tanpa detail slot per orang), peta kesibukan anonim, rekomendasi (Best Time / Toleransi / status Deadlock), serta data grid pribadi milik pemanggil sendiri.
     - Jika status `confirmed`: langsung mengembalikan info room dan `locked_slot` tanpa menghitung ulang.
   - `PATCH`: Mengubah parameter room (hanya diizinkan jika pemanggil adalah `owner_id`, status `open`, **dan** jumlah peserta di room masih 1 yaitu inisiator sendiri).
   - `DELETE`: Menghapus room (hanya diizinkan jika pemanggil adalah `owner_id`).
3. Membangun endpoint partisipasi room:
   - `POST /api/v1/rooms/[id]/join/route.ts`:
     - Untuk User Terdaftar: mendaftarkan `user_id` ke `session_participants` jika belum terdaftar (idempoten).
     - Untuk Guest: menerima `guest_name`, membuat baris peserta baru dengan `guest_token_hash`, dan mengembalikan `guest_token` mentah satu kali ke browser guest.
   - `PUT /api/v1/rooms/[id]/availability/route.ts`:
     - Memvalidasi room masih `open`.
     - Bagi User Terdaftar: menyimpan daftar slot *Room-Level Override* (hanya arah sibuk $\rightarrow$ hadir) ke `room_input`.
     - Bagi Guest (verifikasi `guest_token`): menyimpan daftar slot luang ke `room_input`.
   - `POST /api/v1/rooms/[id]/reset/route.ts`:
     - Mengosongkan `room_input` (`[]`) milik user terdaftar pada room tersebut ("Kembalikan ke jadwal pribadi").
   - `POST /api/v1/rooms/[id]/lock/route.ts`:
     - Memvalidasi pemanggil adalah `owner_id` dan room masih `open`.
     - Memvalidasi sub-slot yang dipilih (`date`, `start`, `end`) valid dan memiliki `available_count >= 2`.
     - Menyimpan ke `locked_slot` dan mengubah `status` menjadi `confirmed`.

#### Output
- Seluruh endpoint `/api/v1/rooms/*` berfungsi lengkap dengan proteksi hak akses server-side dan privasi ketat.

---

### Tahap 6: Fondasi UI, Komponen `shadcn/ui`, & Halaman Landing/Autentikasi (F1)

#### Prerequisites
- **Tahap 2** selesai.

#### Alur Kerja
1. Menambahkan komponen `shadcn/ui` yang dibutuhkan (`dialog`, `sheet`, `select`, `input`, `label`, `badge`, `card`, `tabs`, `sonner`, `popover`, `separator`, `skeleton`, `tooltip`, `alert`).
2. Memastikan seluruh styling mematuhi `AGENTS.md` (hanya menggunakan variabel CSS di `src/app/globals.css`, tanpa *custom hex*, tanpa *glassmorphism*) dan menerapkan prinsip `.agents/skills/frontend-design/SKILL.md` (tipografi berkarakter, tata letak bersih, *active voice* pada microcopy).
3. Membangun navigasi Header/Topbar dan Provider sesi di `src/app/layout.tsx`.
4. Membangun halaman utama `src/app/page.tsx`:
   - Menampilkan identitas visual Kairos yang berfokus pada fungsi inti (jadwal rutin satu kali, irisan waktu kelompok instan) dan CTA **"Masuk dengan Google"**.
   - Jika user sudah login, mengarahkan atau menampilkan akses langsung ke Dashboard (`/dashboard`).

#### Output
- Komponen UI dasar siap pakai di `src/components/ui/*`.
- Halaman Landing & alur login Google (`src/app/page.tsx`) berjalan mulus.

---

### Tahap 7: Frontend Dashboard User (Baseline F2, Override F3, Buat & Histori Room F4)

#### Prerequisites
- **Tahap 3**, **Tahap 5**, dan **Tahap 6** selesai.

#### Alur Kerja
1. Membangun halaman `/dashboard` (`src/app/dashboard/page.tsx`) yang terproteksi bagi user terdaftar, terdiri dari 3 area kerja yang terstruktur rapi:
2. **Modul Jadwal Rutin / Baseline (F2):**
   - Visualisasi jadwal mingguan (Senin–Minggu) beserta label kegiatan.
   - Form/Dialog tambah & edit jadwal rutin (pilihan hari, jam mulai, jam selesai dengan step 30 menit, nama kegiatan) dan tombol hapus, terhubung ke `/api/v1/schedule/baseline`.
3. **Modul Jadwal Insidental / Override (F3):**
   - Daftar override aktif (`Eventual Block` & `Eventual Unblock`) beserta tombol hapus.
   - Form tambah **Eventual Block** (rentang tanggal, jam mulai–selesai, nama kegiatan).
   - Form tambah **Eventual Unblock** (rentang tanggal, pilihan **"Liburkan seluruh jadwal rutin di tanggal ini"** atau memilih jadwal rutin spesifik dari daftar baseline).
4. **Modul Ruang Temu / Room (F4 & Histori):**
   - Dialog **"Buat Ruang Temu"** (input Judul, Rentang Tanggal, Jam Operasional Grid `time_from`–`time_to`, Target Durasi Rapat, dan Angka Kuorum Minimal) yang memanggil `POST /api/v1/rooms` lalu mengarahkan ke halaman room.
   - Daftar histori room (*Dibuat oleh Saya* & *Diikuti*) lengkap dengan status (`Open` / `Confirmed`), aksi salin tautan, aksi edit parameter room (aktif jika status `Open` dan belum ada peserta lain), serta aksi hapus room.

#### Output
- Halaman `/dashboard` berfungsi penuh untuk mengelola jadwal pribadi (Baseline & Override) serta membuat dan mengelola room.

---

### Tahap 8: Frontend Halaman Room Publik (Grid F5, Heatmap F6, Rekomendasi F7/F8, & Lock F9)

#### Prerequisites
- **Tahap 5**, **Tahap 6**, dan **Tahap 7** selesai.

#### Alur Kerja
1. Membangun halaman publik `/room/[id]` (`src/app/room/[id]/page.tsx`) yang memuat data dari `GET /api/v1/rooms/[id]` (dengan dukungan pembacaan `guest_token` dari `localStorage` untuk room tersebut).
2. **Komponen Gate / Bergabung ke Room (F1 & F5):**
   - Jika pengunjung adalah User Terdaftar: otomatis didaftarkan ke room (`POST /api/v1/rooms/[id]/join`) dan grid langsung terisi dari jadwal pribadinya.
   - Jika pengunjung belum login dan belum memiliki `guest_token` untuk room ini: menampilkan pilihan **"Masuk dengan Google"** atau **"Lanjut tanpa akun (Guest)"** dengan input nama. Saat Guest bergabung, `guest_token` disimpan di `localStorage` browser untuk room tersebut.
3. **Komponen Grid Ketersediaan & Heatmap Anonim (F5 & F6):**
   - Menampilkan matriks Tanggal (kolom) $\times$ Jam 30-menit (baris, sesuai `time_from`–`time_to`).
   - Mode tampilan Heatmap Anonim: gradasi intensitas warna (menggunakan token tema `globals.css`) berdasarkan jumlah peserta yang sibuk per slot, tanpa membocorkan label atau nama per slot.
   - Mode interaksi Peserta:
     - **User Terdaftar:** melihat blok sibuk pribadinya (beserta label miliknya sendiri), dapat mengeklik blok sibuk untuk mengubahnya menjadi **"Tetap Hadir"** (*Room-Level Override* via `PUT /api/v1/rooms/[id]/availability`), serta tombol **"Kembalikan ke jadwal pribadi"** (`POST /api/v1/rooms/[id]/reset`).
     - **Guest:** mengeklik/drag slot untuk menandai waktu luangnya (`PUT /api/v1/rooms/[id]/availability`).
4. **Panel Rekomendasi, Opsi Toleransi, & Deadlock (F7 & F8):**
   - Menampilkan daftar **5 Best Time Teratas** (lengkap dengan metrik jumlah hadir dari total peserta & total durasi luang).
   - Jika Best Time kosong namun ada irisan $\ge 2$ orang: menampilkan bagian **Opsi Toleransi** (*Peserta Parsial* maks 3 opsi & *Durasi Lebih Singkat* maks 3 opsi).
   - Jika semua slot hanya dihadiri $\le 1$ orang: menampilkan pemberitahuan **Deadlock** yang jelas dan mengarahkan peserta untuk melonggarkan jadwal/override mereka.
5. **Alur Penguncian Jadwal / Lock Schedule (F9):**
   - Khusus Inisiator (`owner_id`): pada setiap kartu rekomendasi (Best Time maupun Opsi Toleransi), terdapat aksi **"Pilih & Kunci Jadwal"**.
   - Jika durasi jendela rekomendasi $>$ `duration_min`, inisiator memilih sub-slot spesifik sepanjang `duration_min` (misal memilih `08:00–09:00` dari jendela `08:00–11:00`), lalu menekan **"Kunci Jadwal"** (`POST /api/v1/rooms/[id]/lock`).
6. **Tampilan Room Terkunci (`Confirmed`):**
   - Menampilkan kartu jadwal final yang telah disepakati (`locked_slot`), menonaktifkan seluruh penyuntingan grid, dan menyembunyikan kontrol kunci (permanen tanpa tombol buka kunci).

#### Output
- Halaman `/room/[id]` berfungsi penuh untuk User Terdaftar, Guest, maupun Inisiator dari kondisi `Open` hingga `Confirmed`.

---

### Tahap 9: Verifikasi Akhir, Uji Kasus Batas (Edge Cases), & Audit Kepatuhan

#### Prerequisites
- **Tahap 1 s/d Tahap 8** selesai.

#### Alur Kerja
1. Menguji urutan kalkulasi override (`unblock` dieksekusi sebelum `block`, lalu dikurangi `room_input` user terdaftar).
2. Menguji privasi payload jaringan pada `GET /api/v1/rooms/[id]` untuk memastikan tidak ada `label` kegiatan atau daftar nama per slot yang terkirim ke peserta lain.
3. Menguji skenario Guest membuka kembali room di browser yang sama (bisa edit) vs browser/incognito berbeda (akses edit hilang).
4. Mengaudit seluruh kode terhadap aturan `AGENTS.md`:
   - Semua endpoint memakai `/api/v1/*` dan tidak ada *Server Actions*.
   - Tidak ada warna hex *hardcoded* atau efek *glassmorphism* di komponen.
5. Menjalankan `pnpm lint` dan `pnpm build` untuk memastikan tidak ada error TypeScript maupun build Next.js.

#### Output
- Aplikasi Kairos siap pakai, lolos build produksi (`pnpm build`), dan memenuhi 100% spesifikasi `docs/kairos.md` serta `AGENTS.md`.

