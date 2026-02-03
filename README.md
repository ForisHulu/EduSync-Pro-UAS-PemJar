# EduSync Pro - Real-time Virtual Classroom Suite

[cite_start]**EduSync Pro** adalah aplikasi pembelajaran online berbasis web yang dirancang untuk memenuhi kriteria Ujian Akhir Semester mata kuliah Pemrograman Jaringan 2026 di Universitas Katolik Darma Cendika[cite: 8, 9, 36]. [cite_start]Aplikasi ini mengintegrasikan protokol komunikasi modern untuk menciptakan interaksi dua arah yang efektif antara pengajar dan peserta didik secara real-time[cite: 30].

## 👥 Kelompok & Kontribusi
[cite_start]Proyek ini dikerjakan oleh kelompok yang terdiri dari[cite: 18, 44]:
* **Foris Juniawan Hulu**: Project Leader & WebRTC Core Engineer (Video, Screen Sharing, & Mirror-Fix Logic).
* **Valentio Davinci Putra**: WebSocket Specialist (Signaling, Real-time Chat, & Server-side Logic).
* **Daud Aldo Santoso**: UI/UX Designer & Logic Developer (Cek Pemahaman & Queue System).

## 🚀 Fitur Utama & Implementasi Teknologi

### [cite_start]1. WebRTC (Peer-to-Peer Media) [cite: 22, 32]
* [cite_start]**Video Conference**: Transmisi stream video/audio berkualitas tinggi secara langsung antar browser[cite: 32].
* [cite_start]**Smart Screen Sharing**: Fitur berbagi layar yang dioptimalkan dengan logika *mirror-fix*, memastikan teks pada presentasi dosen terbaca dengan benar oleh mahasiswa[cite: 32, 33].
* [cite_start]**No-Mirror Camera**: Implementasi CSS transformasi untuk memastikan tampilan kamera mahasiswa dan dosen tidak terbalik, meningkatkan kenyamanan visual[cite: 33].

### [cite_start]2. WebSocket (Real-time Data) [cite: 21, 31]
* [cite_start]**Cek Pemahaman (Barometer)**: Fitur monitoring di mana dosen dapat memicu sesi feedback untuk mengetahui tingkat pemahaman mahasiswa secara instan[cite: 31].
* [cite_start]**Sistem Antrian (Queue Control)**: Mengelola hak bicara mahasiswa secara tertib untuk sesi tanya jawab yang lebih terorganisir[cite: 31].
* [cite_start]**Interactive Chat with Status**: Komunikasi tekstual yang dilengkapi dengan label otomatis (PAHAM/BINGUNG) berdasarkan feedback mahasiswa[cite: 31].

## [cite_start]🛠️ Cara Menjalankan Aplikasi [cite: 47]

### Prasyarat
- Node.js (Versi 16 ke atas).
- Koneksi internet (untuk library PeerJS via CDN).

### Langkah Instalasi
1. [cite_start]**Clone Repository**[cite: 46]:
   ```bash
   git clone [URL-Repository-Anda]
   cd edusync-pro

2. Instal Dependensi:

    Bash
    npm install ws

3. Jalankan Signaling Server:

    Bash
    node server.js
   
4. Akses Aplikasi: Buka browser dan akses http://localhost:8080.

📐 Arsitektur Sistem 

Aplikasi ini menggunakan model Hybrid Architecture:

- Signaling Layer (WebSocket): Digunakan untuk handshaking WebRTC, pertukaran data chat, dan sinkronisasi fitur Cek Pemahaman.

- Media Layer (WebRTC): Digunakan untuk transmisi video, audio, dan screen sharing secara peer-to-peer guna meminimalkan latency.