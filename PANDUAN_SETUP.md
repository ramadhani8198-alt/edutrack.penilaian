# 🚀 Panduan Setup EduTrack + MySQL Database

## 📋 File yang Sudah Dibuat

| File | Keterangan |
|------|-----------|
| `api.php` | Backend baru dengan MySQL (mengganti file lama) |
| `app.js` | Frontend baru dengan session & lupa password yang benar |
| `db_setup.sql` | Script SQL untuk membuat database |

---

## ⚙️ LANGKAH 1 — Install XAMPP

1. **Download XAMPP** (sedang berjalan di browser) dari [apachefriends.org](https://www.apachefriends.org)
2. Jalankan installer (`xampp-windows-x64-xxx-installer.exe`)
3. Pilih komponen: ✅ **Apache**, ✅ **MySQL**, ✅ **PHP** (yang lain boleh diabaikan)
4. Install ke folder default: `C:\xampp`
5. Selesai install → buka **XAMPP Control Panel**

---

## ⚙️ LANGKAH 2 — Jalankan XAMPP

1. Buka **XAMPP Control Panel**  
2. Klik **Start** di baris **Apache**  
3. Klik **Start** di baris **MySQL**  
4. Kedua baris harus berwarna **hijau** ✅

---

## ⚙️ LANGKAH 3 — Pindahkan Folder Aplikasi

Salin folder `aplikasi-penilaian-siswa` ke dalam:
```
C:\xampp\htdocs\aplikasi-penilaian-siswa\
```

> **Penting:** Folder harus berada di dalam `htdocs` agar bisa diakses lewat browser!

---

## ⚙️ LANGKAH 4 — Setup Database

1. Buka browser → ketik: `http://localhost/phpmyadmin`
2. Klik **New** (di sidebar kiri) atau buka tab **SQL**
3. Klik tombol **Import** → pilih file `db_setup.sql` dari folder aplikasi
4. Klik **Go** / **Jalankan**
5. Database `edutrack_db` akan terbuat otomatis ✅

---

## ⚙️ LANGKAH 5 — Buka Aplikasi

Ketik di browser:
```
http://localhost/aplikasi-penilaian-siswa/
```

**Login default:**
- Email: `admin@sekolah.com`
- Password: `admin123`

---

## 🌐 Akses dari Perangkat Lain (HP/Tablet)

Untuk mengakses dari HP/tablet yang terhubung WiFi yang sama:

1. Di komputer server, buka **Command Prompt** → ketik: `ipconfig`
2. Catat **IPv4 Address** (contoh: `192.168.1.5`)
3. Di HP, buka browser → ketik:
   ```
   http://192.168.1.5/aplikasi-penilaian-siswa/
   ```

---

## ✨ Fitur Baru yang Sudah Ditambahkan

### 🔐 Lupa Password (Diperbaiki)
- **Sekarang benar-benar mereset password** ke nilai baru (bukan hanya menampilkan lama)
- Password baru ditampilkan langsung di layar
- Guru: reset via **email**
- Siswa: reset via **NIS** atau **email**

### 💾 Session Permanen (Tidak logout otomatis)
- Login tersimpan di browser → tidak perlu login ulang saat refresh
- Logout manual tetap tersedia

### 🗄️ Database MySQL
- Semua data tersimpan permanen di MySQL
- Bisa diakses dari banyak perangkat sekaligus
- Data tidak hilang meski server di-restart

---

## ❓ Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Halaman tidak bisa dibuka | Pastikan Apache & MySQL di XAMPP sudah **Start** (hijau) |
| "Koneksi database gagal" | Pastikan MySQL sudah Start, dan sudah jalankan `db_setup.sql` |
| Tidak bisa akses dari HP | Pastikan HP dan komputer tersambung ke WiFi yang **sama** |
| Error 404 | Pastikan folder ada di `C:\xampp\htdocs\` |
