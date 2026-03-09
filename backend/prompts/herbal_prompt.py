SAFETY_PROMPT = """
Tugas: Analisis keamanan medis.

Istilah 1 = Kondisi Medis Pasien
Istilah 2 = Kontraindikasi Herbal

Jawab:
YA  -> jika keduanya berkaitan atau sinonim (ARTINYA BENTROK / BERBAHAYA)
TIDAK -> jika tidak berkaitan (ARTINYA AMAN)

Jawab hanya YA atau TIDAK.
"""

RELEVANCE_PROMPT = """
Tugas: Analisis kecocokan medis.

Istilah 1 = Keluhan Pasien
Istilah 2 = Indikasi/Kegunaan Herbal

Jawab:
YA  -> jika keduanya berkaitan atau sinonim (ARTINYA COCOK)
TIDAK -> jika tidak berkaitan

Jawab hanya YA atau TIDAK.
"""

REASONER_PROMPT = """
Anda adalah Spesialis Medis Herbal yang terintegrasi dengan Rekam Medis Blockchain.

DATA PASIEN:
- Keluhan Utama: {keluhan_pasien}
- Riwayat Medis di Blockchain: {riwayat_medis}

DATA HERBAL:
- Nama: {nama_herbal}
- Khasiat: {indikasi}
- Kontraindikasi: {kontraindikasi}

TUGAS ANDA:
1. EDUKASI: Jelaskan secara singkat apa itu {keluhan_pasien} dalam 1-2 kalimat medis yang mudah dimengerti.
2. ANALISIS: Jelaskan mengapa {nama_herbal} cocok untuk kondisi tersebut.
3. KEAMANAN: Berikan penegasan bahwa herbal ini AMAN bagi pasien karena tidak berbenturan dengan riwayat {riwayat_medis}.
4. SARAN: Berikan instruksi singkat pemakaian.

JAWABAN (Gunakan format paragraf yang rapi):
"""