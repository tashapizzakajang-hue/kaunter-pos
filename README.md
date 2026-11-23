# Kaunter POS

Sistem kaunter (POS) untuk kedai F&B kecil. Ia berjalan dalam pelayar pada tablet, telefon atau komputer, dan menyimpan semua data dalam Google Sheet anda sendiri.

**Alamat kaunter:** https://tashapizzakajang-hue.github.io/kaunter-pos/

## Apa yang ada

- **Jualan:** menu ikut kategori, troli, pesanan Kedai / Pickup / Apps (Grab, Shopee, Foodpanda), diskaun, caj delivery, simpan pesanan untuk bayar kemudian.
- **Bayaran:** Tunai (dengan baki dan pembundaran 5 sen), Kad, DuitNow QR, e-Wallet, Apps.
- **Resit:** cetak, salin teks atau simpan sebagai fail .txt.
- **Pesanan:** sejarah ikut tarikh, batal pesanan.
- **Laporan:** kutipan ikut jam atau hari, saluran jualan, kaedah bayaran, item terlaris, ringkasan tutup kedai, eksport CSV.
- **Menu dan Tetapan:** tambah dan ubah item, tanda habis stok, susun kategori dan item, tema warna.

## Di mana data disimpan

Semua data ada dalam Google Sheet **Jualan Kaunter POS**:

| Tab | Isi | Boleh diubah terus dalam sheet? |
|---|---|---|
| Jualan | Satu baris setiap pesanan | Jangan. Batal pesanan melalui kaunter. |
| Item | Satu baris setiap item yang dijual | Jangan |
| Ringkasan harian | Jumlah setiap hari (formula) | Jangan |
| Item terlaris | Kedudukan item (formula) | Jangan |
| Ikut staf | Jumlah item setiap staf ikut kategori, untuk kiraan gaji (formula) | Ya, tarikh di **B1** dan **B2** sahaja |
| Menu | Senarai menu | Ya: nama, harga, kategori, pilihan, stok |
| Tetapan | Nama kedai, alamat, SST dan lain-lain | Ya, lajur **Nilai** sahaja |
| Tertangguh | Pesanan yang belum dibayar | Jangan |

Jangan tukar nama tab atau susunan lajur. Kaunter bergantung padanya.

Perubahan yang dibuat terus dalam sheet muncul di kaunter dalam masa 5 minit. Untuk melihatnya serta-merta, tekan **Tetapan → Segerak sekarang** atau muat semula kaunter.

Lajur **Pilihan** dalam tab Menu ditulis begini: `Ais, 0.30; Kurang manis; Tambah telur, 1.50`. Pilihan dipisahkan dengan `;`, dan harga tambahan (jika ada) diletak selepas koma.

## Persediaan (sekali sahaja)

### 1. Pasang skrip dalam Google Sheet

1. Buka Google Sheet **Jualan Kaunter POS**.
2. Pilih menu **Extensions → Apps Script**. Tab baharu akan terbuka.
3. Padam semua kod yang ada dalam fail `Code.gs`.
4. Buka fail [`apps-script/Code.gs`](apps-script/Code.gs) dalam repo ini, tekan butang **Copy raw file**, dan tampal ke dalam editor Apps Script.
5. Cari baris ini di bahagian atas:
   ```
   const PIN = 'TUKAR-PIN-INI';
   ```
   Tukar `TUKAR-PIN-INI` kepada PIN rahsia anda, contohnya `const PIN = '482915';`. Gunakan sekurang-kurangnya 6 digit.
6. Tekan ikon **Save** (cakera).
7. Tekan **Deploy → New deployment**.
8. Tekan ikon gear di sebelah **Select type** dan pilih **Web app**. Isi:
   - **Description:** Kaunter POS
   - **Execute as:** Me
   - **Who has access:** Anyone
9. Tekan **Deploy**. Google akan minta kebenaran:
   - Tekan **Authorize access** dan pilih akaun Google anda.
   - Jika keluar amaran "Google hasn't verified this app", tekan **Advanced**, kemudian **Go to … (unsafe)**. Skrip ini milik anda sendiri, jadi ia selamat.
   - Tekan **Allow**.
10. Salin **Web app URL**. Ia bermula dengan `https://script.google.com/macros/s/` dan berakhir dengan `/exec`.

### 2. Sambungkan kaunter

1. Buka https://tashapizzakajang-hue.github.io/kaunter-pos/
2. Pergi ke **Tetapan → Sambungan Google Sheets**.
3. Tampal **URL skrip** dan masukkan **PIN**, kemudian tekan **Sambung**.

### 3. Peranti lain (tablet atau telefon pekerja)

Pada peranti yang sudah bersambung, pergi ke **Tetapan → Sambungan Google Sheets → Salin pautan untuk peranti lain**. Hantar pautan itu ke peranti lain dan buka di sana. Peranti itu akan bersambung secara automatik.

Pautan ini mengandungi URL skrip dan PIN, jadi hantar hanya kepada pekerja kedai anda. Jika pautan terlepas ke orang lain, tukar PIN dalam skrip dan buat **New version** (lihat di bawah).

### 4. Pasang sebagai aplikasi di Android

1. Hantar pautan persediaan ke peranti Android. Buka pautan itu dalam **Chrome**, bukan dalam WhatsApp atau aplikasi lain. Jika pautan terbuka dalam WhatsApp, tekan menu ⋮ dan pilih **Open in Chrome**.
2. Pastikan status di penjuru atas kaunter menunjukkan **Disegerakkan**.
3. Dalam Chrome, tekan menu ⋮ dan pilih **Add to Home screen**, kemudian **Install**.
4. Ikon **Kaunter** akan muncul di skrin utama. Kaunter dibuka skrin penuh tanpa bar alamat.

Untuk tablet di kaunter, panjangkan masa skrin padam: **Settings → Display → Screen timeout**.

Di iPhone atau iPad, gunakan Safari: butang **Share → Add to Home Screen**.

## Staf dan kiraan gaji

1. Tambah nama staf di kaunter: **Tetapan → Staf → Tambah**.
2. Sebelum bayar, pilih staf di troli. Butang Bayar terkunci sehingga staf dipilih. Pilihan diingat pada peranti itu untuk pesanan seterusnya, jadi tukar bila staf lain mengambil alih.
3. Nama staf dicetak pada resit, dan disimpan dalam lajur **Staf** di tab Jualan dan Item.
4. Untuk gaji, buka tab **Ikut staf** dalam Google Sheet. Tukar tarikh di **B1** (dari) dan **B2** (hingga). Jadual kiri menunjukkan jumlah item dan jualan setiap staf. Jadual kanan memecahkan jumlah item ikut kategori, contohnya Special Pizza, Classic dan Premium. Hanya pesanan yang dibayar dikira.

Dalam kaunter, tab **Laporan** juga menunjukkan kad **Ikut staf** untuk tempoh yang dipilih.

## Mengemas kini skrip

Jika anda menukar PIN atau saya hantar versi baharu `Code.gs`:

1. Tampal kod baharu (atau tukar PIN) dalam Apps Script, kemudian tekan **Save**.
2. Tekan **Deploy → Manage deployments**, kemudian ikon pensel (**Edit**).
3. Pada **Version**, pilih **New version**, kemudian tekan **Deploy**.

URL kekal sama, jadi peranti tidak perlu disambung semula. Hanya jika PIN ditukar, masukkan PIN baharu di setiap peranti.

## Cetak resit

Tekan **Cetak** pada resit. Pelayar akan membuka tetingkap cetak. Untuk printer thermal, pilih saiz kertas 58 mm atau 80 mm dalam tetingkap cetak, dan tetapkan lebar yang sama di **Tetapan → Resit**.

Logo kedai dicetak di atas resit. Untuk menukarnya, ganti fail `logo.png` dalam repo ini dengan logo baharu (hitam di atas latar telus atau putih, lebar sekitar 480 piksel).

Di Android, tetingkap cetak menggunakan khidmat cetak Android. Printer thermal Bluetooth biasanya perlukan aplikasi khidmat cetak daripada jenama printer itu, atau aplikasi khidmat cetak umum seperti RawBT dari Play Store. Selepas dipasang, printer itu akan muncul dalam senarai printer di tetingkap cetak.

## Had

- Kaunter perlukan internet untuk menyimpan jualan. Jika internet terputus, jualan tidak dapat disimpan sehingga sambungan pulih.
- Setiap simpanan mengambil masa 1 hingga 3 saat kerana ia melalui Google.
- Peranti lain menerima perubahan dalam masa 30 saat.

## Fail dalam repo

- `index.html`: aplikasi kaunter.
- `manifest.webmanifest` dan ikon `*.png`: membolehkan kaunter dipasang sebagai aplikasi di telefon dan tablet.
- `apps-script/Code.gs`: skrip untuk Google Sheet.
