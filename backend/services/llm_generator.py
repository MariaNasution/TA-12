import json
from langchain.prompts import PromptTemplate
from services.qwen_model import generate_qwen
import time
from prompts.herbal_prompt import SAFETY_PROMPT, RELEVANCE_PROMPT, REASONER_PROMPT

def extract_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()
    return text

def normalize_llm_output(parsed):
    if isinstance(parsed, list):
        return {"rekomendasi": parsed}
    if isinstance(parsed, dict) and "rekomendasi" in parsed:
        return parsed
    return {"rekomendasi": []}

def validate_recommendation(parsed, safe_herbs):
    allowed = {h["id"]: h["nama"] for h in safe_herbs}
    valid = []

    for r in parsed.get("rekomendasi", []):
        rid = r.get("id")
        if rid in allowed and isinstance(r.get("alasan"), str):
            valid.append({
                "id": rid,
                "nama": allowed[rid],
                "alasan": r["alasan"]
            })
    return valid

def expand_query_internal(keluhan: str) -> str:
    """Menggunakan LLM untuk mencari istilah medis/sinonim secara dinamis"""
    expansion_prompt = f"Ubah keluhan '{keluhan}' menjadi 3-4 kata kunci medis/sinonim dipisahkan koma. Hanya kata kunci."
    
    # Kita panggil generate_qwen dengan prompt singkat
    expanded = generate_qwen(
        system_prompt="Anda adalah kamus medis cerdas.",
        user_prompt=expansion_prompt
    )
    # Bersihkan jika ada teks tambahan dari AI
    return f"{keluhan}, {expanded.strip()}"

def is_medical_clash(kondisi_pasien, kontraindikasi):

    if not kontraindikasi or str(kontraindikasi).lower() in ["tidak ada", "-", "none"]:
        return False

    k1 = kondisi_pasien.lower().strip()
    k2 = kontraindikasi.lower().strip()

    # 1️⃣ Exact match
    if k1 == k2:
        return True

    # 2️⃣ Embedding similarity
    sim = get_similarity(k1, k2)

    if sim > 0.80:   # threshold bentrok
        return True
    if sim < 0.40:   # jelas tidak mirip
        return False

    # 3️⃣ Ambiguous → tanya AI
    prompt = f"Istilah 1: {kondisi_pasien}\nIstilah 2: {kontraindikasi}"
    jawaban = generate_qwen(SAFETY_PROMPT, prompt).upper()

    return "YA" in jawaban

def is_medical_relevant(keluhan, indikasi):
    if not indikasi or str(indikasi).lower() in ["tidak ada", "-", "none"]:
        return False

    prompt = f"Istilah 1: {keluhan}\nIstilah 2: {indikasi}"

    jawaban = generate_qwen(RELEVANCE_PROMPT, prompt).upper()
    return "YA" in jawaban  # YA = cocok

import json
from langchain.prompts import PromptTemplate
from services.qwen_model import generate_qwen
from prompts.herbal_prompt import REASONER_PROMPT

def generate_herbal_recommendation(llm_input):
    try:
        patient_context = llm_input.get("patient_context", {})
        safe_herbs = llm_input.get("safe_herbs", []) 

        keluhan = patient_context.get("keluhan", "Umum")
        riwayat_medis = patient_context.get("kondisi_medis", [])
        riwayat_medis_str = ", ".join(riwayat_medis) if riwayat_medis else "Tidak ada riwayat medis tercatat"

        print("\n" + "="*50)
        print("🛡️  MEMULAI AUDIT KEAMANAN HYBRID (BLOCKCHAIN + AI)")
        print("="*50)
        
        final_rekomendasi = []

        for herb in safe_herbs:
            nama_herb = herb.get("nama") or herb.get("name") or "Herbal Tanpa Nama"
            kontra = herb.get("kontraindikasi", "").lower()
            deskripsi = herb.get("deskripsi") or ""
            indikasi = herb.get("indikasi") or ""

            print(f"\n🔍 Mengevaluasi: {nama_herb}")

            # ==========================================================
            # 1️⃣ VERIFIKASI KEAMANAN BLOCKCHAIN (Audit Kritis)
            # ==========================================================
            # --- BAGIAN AUDIT KEAMANAN ---
            is_bahaya = False
            penyakit_pemicu = ""
            for kondisi in riwayat_medis:
                if kondisi.lower().strip() in kontra:
                    print(f"🛑 BLOKIR OTOMATIS: Kontraindikasi riwayat {kondisi}")
                    is_bahaya = True
                    penyakit_pemicu = kondisi 
                    break
            
            if is_bahaya:
                prompt_penolakan = f"""
                Jelaskan secara profesional mengapa herbal {nama_herb} dilarang bagi pasien 
                dengan riwayat medis {penyakit_pemicu}. Hubungkan dengan keluhan pasien yaitu {keluhan}.
                """
                
                alasan_ai = generate_qwen(
                    system_prompt="Anda adalah Pakar Keamanan Herbal Medis.",
                    user_prompt=prompt_penolakan
                )

                final_rekomendasi.append({
                    "id": herb.get("id"),
                    "nama": "Tidak ada herbal yang direkomendasikan",
                    "alasan": 
                    f"Berdasarkan analisis keluhan ({keluhan}) dan audit riwayat medis pasien ({riwayat_medis_str}), "
                    f"sistem berhasil mengevaluasi satu kandidat herbal yang paling relevan yaitu {nama_herb}. "
                    f"Namun, {alasan_ai.strip()} "
                    f"Sehingga kandidat tersebut dinyatakan TIDAK AMAN untuk dikonsumsi saat ini.",
                    "status": "danger"
                })
                continue 
            # ==========================================================
            # 2️⃣ EDUKASI & REASONING AI (LLM Qwen LoRA)
            # ==========================================================
            print(f" {nama_herb} Aman. AI sedang menyusun analisis medis...")

            REASONER_PROMPT = f"""
            Tugas: Anda adalah Pakar Herbal Medis yang terintegrasi dengan data Rekam Medis Blockchain.
            
            DATA PASIEN:
            - Keluhan: {keluhan}
            - Riwayat (Blockchain): {riwayat_medis_str}
            
            DATA HERBAL:
            - Nama: {nama_herb}
            - Khasiat: {indikasi}
            - Deskripsi: {deskripsi}

            INSTRUKSI JAWABAN:
            1. EDUKASI: Jelaskan secara singkat apa itu {keluhan} di paragraf pertama.
            2. ALASAN: Jelaskan mengapa {nama_herb} cocok membantu kondisi tersebut.
            3. KONFIRMASI: Tegaskan bahwa herbal ini aman dikonsumsi meskipun pasien memiliki riwayat {riwayat_medis_str}.
            4. SARAN: Berikan cara penggunaan singkat.

            Format jawaban: Paragraf profesional dan edukatif.
            """

            alasan_ai = generate_qwen(
                system_prompt="Anda adalah Spesialis Medis Herbal AI.",
                user_prompt=REASONER_PROMPT
            )

            final_rekomendasi.append({
                "id": herb.get("id"),
                "nama": nama_herb,
                "alasan": alasan_ai.strip(),
                "cara_penggunaan": herb.get("cara_penggunaan") or "Gunakan sesuai takaran yang disarankan."
            })

        return {
            "status": "success",
            "rekomendasi": final_rekomendasi,
            "catatan_keamanan": "Data telah divalidasi silang dengan riwayat medis Anda yang tersimpan di Blockchain."
        }

    except Exception as e:
        print(f"❌ ERROR GENERATOR: {str(e)}")
        return {"error": str(e)}, 500