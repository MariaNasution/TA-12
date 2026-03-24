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
        safe_herbs_candidates = llm_input.get("safe_herbs", []) 
        
        keluhan = patient_context.get("keluhan", "Umum")
        riwayat_medis = [str(r).lower().strip() for r in patient_context.get("kondisi_medis", [])]
        riwayat_medis_str = ", ".join(riwayat_medis) if riwayat_medis else "Tidak ada riwayat medis tercatat"

        print("\n" + "="*50)
        print("🛡️  MEMULAI AUDIT KEAMANAN HYBRID (BLOCKCHAIN + AI)")
        print("="*50)
        
        herbs_lolos_audit = []
        herbs_terblokir = []

        # ==========================================================
        # 1️⃣ STAGE 1: DETERMINISTIC RULE-BASED FILTERING
        # ==========================================================
        for herb in safe_herbs_candidates:
            nama_herb = herb.get("nama") or herb.get("name") or "Herbal"
            kontra = str(herb.get("kontraindikasi", "")).lower()
            
            # Cek apakah ada riwayat medis pasien di dalam teks kontraindikasi herbal
            is_bahaya = any(kondisi in kontra for kondisi in riwayat_medis if kondisi)

            if is_bahaya:
                print(f"🛑 BLOKIR: {nama_herb} berisiko untuk riwayat {riwayat_medis_str}")
                herbs_terblokir.append(nama_herb)
            else:
                print(f"✅ LOLOS: {nama_herb} dinyatakan aman untuk diaudit.")
                herbs_lolos_audit.append(herb)

        # ==========================================================
        # 2️⃣ STAGE 2: AI GENERATION & REASONING
        # ==========================================================
        final_rekomendasi = []

        # SKENARIO A: ADA HERBAL YANG LOLOS AUDIT
        if herbs_lolos_audit:
            # Kita hanya ambil maksimal 3 herbal terbaik agar AI tidak overload
            for herb in herbs_lolos_audit[:3]:
                nama_herb = herb.get("nama") or herb.get("name")
                print(f"🧠 AI menyusun edukasi untuk: {nama_herb}")

                REASONER_PROMPT = f"""
                Tugas: Anda adalah Pakar Herbal Medis. Jelaskan manfaat herbal berikut berdasarkan riwayat pasien.
                
                DATA PASIEN:
                - Keluhan: {keluhan}
                - Riwayat Medis: {riwayat_medis_str}
                
                DATA HERBAL:
                - Nama: {nama_herb}
                - Khasiat: {herb.get('indikasi')}
                - Deskripsi: {herb.get('deskripsi')}

                INSTRUKSI:
                1. Jelaskan singkat hubungan {nama_herb} dengan {keluhan}.
                2. Tegaskan keamanan herbal ini terhadap riwayat {riwayat_medis_str}.
                3. Berikan saran penggunaan singkat.
                """

                alasan_ai = generate_qwen(
                    system_prompt="Anda adalah Spesialis Medis Herbal AI.",
                    user_prompt=REASONER_PROMPT
                )

                final_rekomendasi.append({
                    "id": herb.get("id"),
                    "nama": nama_herb,
                    "alasan": alasan_ai.strip(),
                    "status": "success"
                })

            return {
                "status": "success",
                "rekomendasi": final_rekomendasi,
                "catatan_keamanan": f"Telah divalidasi silang. {len(herbs_terblokir)} herbal lain disembunyikan karena tidak aman bagi Anda." if herbs_terblokir else "Semua kandidat divalidasi aman."
            }

        # SKENARIO B: SEMUA TERBLOKIR ATAU TIDAK ADA DATA (FALLBACK)
        else:
            if not safe_herbs_candidates:
                # Ini jalur RAG OFF atau memang tidak ada di DB
                print("⚠️ Mode Non-RAG / Data Kosong")
                prompt_fallback = f"Berikan saran kesehatan umum (bukan resep spesifik) untuk keluhan {keluhan} bagi pasien dengan riwayat {riwayat_medis_str}."
                mode_info = "Pengetahuan Umum AI (Tanpa Database)"
            else:
                # Ini jalur semua herbal di DB ternyata bahaya buat pasien
                print("🛑 Jalur Keamanan: Semua kandidat bahaya")
                prompt_fallback = f"Jelaskan mengapa Anda tidak merekomendasikan herbal {', '.join(herbs_terblokir)} untuk keluhan {keluhan} mengingat pasien memiliki riwayat {riwayat_medis_str}."
                mode_info = "Peringatan Keamanan Medis"

            jawaban_ai = generate_qwen(
                system_prompt="Anda adalah AI Konsultan Medis.",
                user_prompt=prompt_fallback
            )

            return {
                "status": "warning",
                "rekomendasi": [{
                    "nama": mode_info,
                    "alasan": jawaban_ai.strip(),
                    "status": "danger" if herbs_terblokir else "warning"
                }],
                "catatan_keamanan": "Sistem tidak menemukan herbal yang aman dalam database pakar untuk kondisi medis Anda."
            }

    except Exception as e:
        print(f"❌ ERROR GENERATOR: {str(e)}")
        return {"error": str(e)}, 500