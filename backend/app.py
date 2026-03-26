import os
import sys
from datetime import datetime
from flask import Flask, request, jsonify
import chromadb
from flask_cors import CORS 
from blockchain.health_record_service import (
    store_medical_record,
    grant_access,
    revoke_access,
    reject_access,
    get_medical_records_as_doctor,
    get_patient_medical_conditions,
    request_access_from_doctor
)
from ipfs.ipfs_service import upload_json_to_ipfs, IPFS_PORT
from chroma.herbal_store import add_herbal, search_herbal
from rules.medical_rules import filter_herbs_by_medical_condition
from services.herbal_builder import build_herbs
from services.llm_schema_builder import build_llm_input
from services.llm_generator import generate_herbal_recommendation
from services.herbal_retriever import retrieve_relevant_herbs
from blockchain.contract import web3, contract
from chroma.herbal_store import embedding_functions
from flask_cors import CORS
from dotenv import load_dotenv 
from datetime import datetime
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
import json
import time
from datetime import datetime


load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
base_dir = os.path.dirname(os.path.abspath(__file__))

@app.route("/notifications/log-event", methods=["POST"])
def log_event():
    data = request.json
    patient_address = data.get("address")
    pesan = data.get("pesan")
    
    if not patient_address or not pesan:
        return jsonify({"status": "error", "message": "Data tidak lengkap"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Masukkan ke tabel notifications
        query = "INSERT INTO notifications (address, pesan, is_read, tanggal) VALUES (%s, %s, FALSE, NOW())"
        cursor.execute(query, (patient_address.lower(), pesan))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "message": "Log berhasil dicatat"})
    except Exception as e:
        print(f"Error Logging: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    
@app.route("/notifications/add", methods=["POST"])
def add_notif_api():
    data = request.json
    add_notification(data['address'], data['pesan']) 
    return jsonify({"status": "success"})

def add_notification(address, pesan):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "INSERT INTO notifications (address, pesan, is_read, tanggal) VALUES (%s, %s, FALSE, NOW())"
        cursor.execute(query, (address.lower(), pesan))
        conn.commit()
        cursor.close()
        conn.close()
        print(f"DEBUG: Notif berhasil dikirim ke {address}")
    except Exception as e:
        print(f"ERROR Notif: {e}")

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root", 
        database="ta",
        port=3306,
        collation="utf8mb4_general_ci"
    )
def save_recommendation_to_sql(address, keluhan, hasil_ai, mode):
    print("\n[DIAGNOSA SQL] Memulai proses simpan...")
    if not address: print("[!] ERROR: Address kosong"); return
    if not keluhan: print("[!] ERROR: Keluhan kosong"); return
    if not hasil_ai: print("[!] ERROR: Hasil AI kosong"); return
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        print(f" -> Target Address: {address}")
        print(f" -> Keluhan: {keluhan[:30]}...")
        query = "INSERT INTO riwayat_rekomendasi (address, keluhan, hasil_ai, mode) VALUES (%s, %s, %s, %s)"
        cursor.execute(query, (address.lower(), keluhan, json.dumps(hasil_ai), mode))
        conn.commit()
        print("[SUCCESS] Data berhasil masuk ke SQLyog!")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error Save Rec: {e}")

@app.route("/notifications", methods=["GET"])
def get_notifications():
    address = request.args.get("address", "").lower()
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM notifications WHERE address = %s ORDER BY tanggal DESC"
        cursor.execute(query, (address,))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify([])

@app.route("/notifications/mark-read", methods=["POST"])
def mark_read():
    address = request.json.get("address")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Ubah semua yang FALSE (0) jadi TRUE (1) untuk user ini
        query = "UPDATE notifications SET is_read = TRUE WHERE address = %s"
        cursor.execute(query, (address.lower(),))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/auth/login", methods=["POST"])
def login_api():
    data = request.json
    try:
        address = web3.to_checksum_address(data.get("address"))
    except Exception:
        return jsonify({"error": "Format alamat wallet tidak valid"}), 400

    password = data.get("password")
    print(f"DEBUG: Upaya Login -> {address}")

    # --- 0. CEK ADMIN (Pemilik Kontrak) — Admin bypass password ---
    try:
        contract_admin = contract.functions.admin().call()
    except Exception as e:
        print(f"❌ Kesalahan Kritis Smart Contract: {e}")
        return jsonify({
            "error": "Gagal membaca Smart Contract di jaringan ini.",
            "message": "Pastikan Anda sudah menjalankan 'truffle migrate --reset' di terminal dan memperbarui CONTRACT_ADDRESS di .env"
        }), 500

    if address == contract_admin:
        return jsonify({
            "role": "admin",
            "status": "active",
            "name": "Admin Sistem"
        }), 200

    # --- 1. VERIFIKASI PASSWORD DI DATABASE MYSQL ---
    if not password:
        return jsonify({"error": "Password harus diisi"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT password_hash FROM user_auth WHERE wallet_address = %s", (address,))
        user_record = cursor.fetchone()

        if not user_record:
            cursor.close()
            conn.close()
            return jsonify({
                "role": "none",
                "error": "Wallet belum terdaftar.",
                "message": "Silakan registrasi terlebih dahulu."
            }), 404

        if not check_password_hash(user_record['password_hash'], password):
            cursor.close()
            conn.close()
            return jsonify({"error": "Password salah"}), 401

        # Update last login
        cursor.execute("UPDATE user_auth SET last_login = %s WHERE wallet_address = %s", (datetime.now(), address))
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"❌ Database Error: {e}")
        return jsonify({"error": "Gagal verifikasi basis data"}), 500

    # --- 2. CEK ROLE DI BLOCKCHAIN (Sama seperti alur lama) ---
    # B. CEK DOKTER (Medis & Herbal)
    doctor_info = contract.functions.doctors(address).call()

    if doctor_info[3]:  # isRegistered
        if doctor_info[2]:  # isApproved
            role = "doctor"
            if "herbal" in doctor_info[1].lower():
                role = "herbal_doctor"

            return jsonify({
                "role": role,
                "name": doctor_info[0],
                "specialty": doctor_info[1],
                "status": "approved"
            }), 200
        else:
            return jsonify({
                "role": "doctor",
                "status": "pending_approval",
                "message": "Akun Dokter Anda sedang menunggu verifikasi Admin."
            }), 202

    # C. CEK PASIEN
    patient_name = contract.functions.patientNames(address).call()
    if patient_name != "" and patient_name is not None:
        return jsonify({
            "role": "patient",
            "name": patient_name,
            "status": "active"
        }), 200

    # D. JIKA ALAMAT TIDAK TERDAPAT DI BLOCKCHAIN
    return jsonify({
        "role": "none",
        "error": "Alamat wallet belum terdaftar di Blockchain.",
        "message": "Silakan masuk ke halaman Registrasi terlebih dahulu."
    }), 404


@app.route("/auth/register", methods=["POST"])
def register_api():
    data = request.json
    try:
        address = web3.to_checksum_address(data.get("address"))
    except Exception:
        return jsonify({"error": "Format alamat wallet tidak valid"}), 400

    password = data.get("password")
    name = data.get("name", "")
    role = data.get("role", "patient")

    if not password:
        return jsonify({"error": "Password harus diisi"}), 400

    print(f"DEBUG: Registrasi baru -> {address} ({role})")

    try:
        # --- 1. SIMPAN PASSWORD KE MYSQL ---
        hashed_pw = generate_password_hash(password)

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Cek duplikasi di DB
        cursor.execute("SELECT wallet_address FROM user_auth WHERE wallet_address = %s", (address,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"error": "Wallet sudah terdaftar di basis data"}), 409

        cursor.execute("INSERT INTO user_auth (wallet_address, name, password_hash) VALUES (%s, %s, %s)", (address, name, hashed_pw))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "status": "success",
            "message": "Password tersimpan. Silakan selesaikan transaksi blockchain.",
            "address": address,
            "role": role
        }), 200

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/admin/dashboard/stats", methods=["GET"])
def get_admin_dashboard_stats():
    try:
        # 1. Ambil SEMUA address yang pernah register (Pasien & Dokter) dari Blockchain
        all_user_addrs = contract.functions.getAllUsers().call()
        admin_addr = contract.functions.admin().call()
        
        stats = {
            "total_pengguna": 0, 
            "pending_verif": 0, 
            "pasien": 0, 
            "dokter_medis": 0, 
            "dokter_herbal": 0
        }
        pending_registrations = []

        for addr in all_user_addrs:
            checksum_acc = web3.to_checksum_address(addr)
            if checksum_acc == admin_addr: continue

            # --- CEK APAKAH DIA PASIEN ---
            p_name = contract.functions.patientNames(checksum_acc).call()
            if p_name != "":
                stats["total_pengguna"] += 1
                stats["pasien"] += 1
                # Jika dia pasien, lanjut ke user berikutnya
                continue

            # --- CEK APAKAH DIA DOKTER ---
            doc = contract.functions.doctors(checksum_acc).call()
            # doc structure: [name, specialty, isApproved, isRegistered]
            if doc[3]: # isRegistered
                if doc[2]: # isApproved
                    stats["total_pengguna"] += 1
                    if "herbal" in doc[1].lower():
                        stats["dokter_herbal"] += 1
                    else:
                        stats["dokter_medis"] += 1
                else:
                    # MASUK KE LIST PENDING (Gambar 2 Maria)
                    stats["pending_verif"] += 1
                    pending_registrations.append({
                        "id": checksum_acc,
                        "name": doc[0],
                        "initials": doc[0][:2].upper(),
                        "display_role": "Dokter " + ("Herbal" if "herbal" in doc[1].lower() else "Medis"),
                        "date_string": "Menunggu Verifikasi"
                    })

        return jsonify({
            "status": "success",
            "stats": stats,
            "pending_registrations": pending_registrations
        }), 200
    except Exception as e:
        print(f"Error Admin Stats: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
# =========================
# HERBAL (SEMANTIC SEARCH)
# =========================
@app.route("/herbal/search", methods=["GET"])
def search_herbal_api():
    query = request.args.get("q")
    medical_raw = request.args.get("medical", "")

    if not query:
        return jsonify({"error": "query kosong"}), 400

    medical_conditions = [
        m.strip().lower()
        for m in medical_raw.split(",")
        if m
    ]

    result = search_herbal(query)

    herbs = []
    if result["documents"] and result["documents"][0]:
        for i in range(len(result["documents"][0])):
            herbs.append({
                "id": result["ids"][0][i],
                "name": result["metadatas"][0][i].get("name"),
                "indikasi": result["metadatas"][0][i].get("indikasi"),
                "kontraindikasi": result["metadatas"][0][i].get("kontraindikasi"),
                "deskripsi": result["documents"][0][i],
                "score": result["distances"][0][i]
            })

    if medical_conditions:
        herbs = filter_herbs_by_medical_condition(herbs, medical_conditions)

    return jsonify({
        "query": query,
        "medical_conditions": medical_conditions,
        "results": herbs
    })

# --- ENDPOINT TAMBAHAN UNTUK DASHBOARD DOKTER ---
@app.route("/herbal/all", methods=["GET"])
def get_all_herbs():
    doctor_addr = request.args.get("address")
    try:
        import chromadb
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(base_dir, "chroma_db")
        client = chromadb.PersistentClient(path=db_path)

        target_name = "herbal_collection" 
        collection = client.get_or_create_collection(name=target_name)
        results = collection.get() 
        
        if doctor_addr:
            results = collection.get(where={"doctor_address": doctor_addr.lower()})
        else:
            results = collection.get()

        herbs = []
        if results and "ids" in results:
            for i in range(len(results["ids"])):
                meta = results["metadatas"][i] or {}
                doc = results["documents"][i] or ""
                
                # Sesuaikan key dengan yang ada di metadata kamu
                herbs.append({
                    "id": results["ids"][i],
                    "nama": meta.get("name") or meta.get("nama") or "Tanpa Nama",
                    "indikasi": meta.get("indikasi") or meta.get("kegunaan") or "-",
                    "kontraindikasi": meta.get("kontraindikasi") or "-",
                    "deskripsi": doc,
                    "cid": meta.get("cid") or meta.get("ipfs_cid") or "-"
                })
        
        print(f"✅ Dashboard Berhasil Menarik: {len(herbs)} data dari {target_name}")
        return jsonify(herbs), 200

    except Exception as e:
        print(f"❌ Error tarik data: {e}")
        # Kalau koleksi belum ada, kirim list kosong saja agar frontend tidak crash
        return jsonify([]), 200
    
@app.route("/herbal/delete/<id>", methods=["DELETE"])
def delete_herb(id):
    try:
        import chromadb
        import os
        
        # 1. Inisialisasi ulang client dan collection (Wajib agar tidak Error "not defined")
        base_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(base_dir, "chroma_db")
        client = chromadb.PersistentClient(path=db_path)
        
        collection = client.get_or_create_collection(name="herbal_collection")

        # 2. Hapus data berdasarkan ID di ChromaDB
        collection.delete(ids=[id])
        
        print("\n" + "!"*40)
        print(f"🗑️  DATA DIHAPUS: ID {id}")
        print(f"Status: Berhasil dihapus dari ChromaDB (herbal_collection)")
        print("!"*40 + "\n")
        
        return jsonify({"message": f"Herbal {id} berhasil dihapus"}), 200
    except Exception as e:
        print(f"❌ GAGAL HAPUS: {e}")
        return jsonify({"error": str(e)}), 500
        

@app.route("/herbal/update/<id>", methods=["PUT", "OPTIONS"])
def update_herbal(id):
    if request.method == "OPTIONS":
        return jsonify({"status": "OK"}), 200

    try:
        # 1. Ambil data dari request
        data = request.json
        nama = data.get("name")
        indikasi = data.get("indikasi")
        kontraindikasi = data.get("kontraindikasi")
        deskripsi = data.get("deskripsi")

        # 2. Upload ulang ke IPFS untuk dapat CID baru
        herbal_metadata = {
            "name": nama,
            "indikasi": indikasi,
            "kontraindikasi": kontraindikasi,
            "deskripsi": deskripsi,
            "status": "Updated Version"
        }
        new_ipfs_cid = upload_json_to_ipfs(herbal_metadata)
        print(f"✅ [UPDATE] IPFS Success: {new_ipfs_cid}")

        # 3. KONEKSI KE CHROMADB (Pastikan koleksi didefinisikan di sini)
        import chromadb
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(base_dir, "chroma_db")
        client = chromadb.PersistentClient(path=db_path)
        
        # Ambil koleksi herbal
        target_collection = client.get_or_create_collection(name="herbal_collection")

        # 4. Update di ChromaDB menggunakan .upsert()
        full_text_update = f"Herbal: {nama}. Kegunaan: {indikasi}. Peringatan: {kontraindikasi}. Deskripsi: {deskripsi}"
        
        target_collection.upsert(
            ids=[id],
            metadatas=[{
                "nama": nama,
                "indikasi": indikasi,
                "kontraindikasi": kontraindikasi,
                "ipfs_cid": new_ipfs_cid 
            }],
            documents=[full_text_update]
        )
        print(f"✅ [UPDATE] ChromaDB Indexed untuk ID: {id}")

        # Return CID baru ke Frontend agar bisa di-TTD MetaMask
        return jsonify({
            "status": "Success",
            "ipfs_cid": new_ipfs_cid
        }), 200

    except Exception as e:
        print(f"❌ Gagal Update: {e}")
        return jsonify({"error": str(e)}), 500

def save_recommendation_to_history(address, rekomendasi_data):
    file_path = 'herbal_history.json'
    history = {}
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r') as f:
                history = json.load(f)
        except: history = {}
    
    addr_key = address.lower()
    if addr_key not in history:
        history[addr_key] = []
    
    # Simpan hasil
    history[addr_key].append({
        "timestamp": datetime.now().isoformat(),
        "data": rekomendasi_data
    })
    
    with open(file_path, 'w') as f:
        json.dump(history, f)

@app.route("/herbal/history", methods=["GET"])
def get_herbal_history():
    address = request.args.get("address", "").lower()
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM riwayat_rekomendasi WHERE address = %s ORDER BY tanggal DESC"
        cursor.execute(query, (address,))
        rows = cursor.fetchall()
        
        # Parse string JSON balik ke objek agar bisa dibaca Frontend
        for row in rows:
            row['hasil_ai'] = json.loads(row['hasil_ai'])
            
        cursor.close()
        conn.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/herbal/recommendation-input", methods=["GET"])
def recommendation_input():
    query = request.args.get("q", "").lower() 
    medical = request.args.get("medical", "")
    use_rag = request.args.get("use_rag", "true").lower() == "true"
    address = request.args.get("address", "").lower()
    
    medical_list = [m.strip() for m in medical.split(",") if m.strip()]

    if use_rag:
        # Jalankan Semantic Search
        herbs_from_rag = retrieve_relevant_herbs(query)
        
        # JIKA DATA KOSONG (Bukan berarti Non-RAG, tapi emang gak ketemu di DB)
        if not herbs_from_rag:
            return jsonify({
                "status": "warning",
                "mode": "RAG (Database Kosong)",
                "rekomendasi": [{
                    "nama": "Informasi",
                    "alasan": f"Maaf, tidak ada data herbal di database pakar yang relevan dengan keluhan '{query}'.",
                    "status": "warning"
                }]
            })

        llm_input = {
            "mode": "RAG (Terverifikasi Database)",
            "patient_context": {"keluhan": query, "kondisi_medis": medical_list},
            "safe_herbs": herbs_from_rag 
        }
    else:
        # Mode Non-RAG murni karena user mematikan fitur RAG di UI
        llm_input = {
            "mode": "Non-RAG (Pengetahuan Umum AI)",
            "patient_context": {"keluhan": query, "kondisi_medis": medical_list},
            "safe_herbs": [] 
        }

    try:
        llm_output = generate_herbal_recommendation(llm_input)
        llm_output["mode"] = llm_input["mode"] 
        if address:
                data_simpan = {
                    "keluhan": query,
                    "hasil": llm_output
                }
                save_recommendation_to_sql(address, query, llm_output, llm_input["mode"])

        return jsonify(llm_output)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/herbal/history-count", methods=["GET"])
def get_history_count():
    address = request.args.get("address", "").lower()
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "SELECT COUNT(*) FROM riwayat_rekomendasi WHERE address = %s"
        cursor.execute(query, (address,))
        count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        return jsonify({"count": count})
    except:
        return jsonify({"count": 0})
# =========================
# IPFS  
# =========================
@app.route("/ipfs/upload", methods=["POST"])
def upload_ipfs():
    data = request.json
    cid = upload_json_to_ipfs(data)
    return jsonify({
        "cid": cid
    })

@app.route('/medical/get-content', methods=['GET'])
def get_medical_content():
    cid = request.args.get('cid')
    import requests
    try:
        response = requests.post(f'http://127.0.0.1:{IPFS_PORT}/api/v0/cat?arg={cid}', timeout=5)

        return response.text, 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return jsonify({"diagnosis": "Gagal mengambil data"}), 500

@app.route("/medical/ipfs-only", methods=["POST"])
def upload_to_ipfs_only():
    try:
        data = request.json
        # Kita bungkus data medisnya
        medical_metadata = {
            "diagnosis": data.get("diagnosis"),
            "patient": data.get("patient_address"),
            "timestamp": datetime.now().isoformat()
        }
        
        # Upload ke IPFS
        ipfs_cid = upload_json_to_ipfs(medical_metadata)
        
        # Kirim balik CID-nya ke Frontend
        return jsonify({"ipfs_cid": ipfs_cid}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/medical/list", methods=["GET"])
def get_medical_list_api():
    doctor_login = request.args.get("doctor")
    if not doctor_login:
        return jsonify({"history": [], "error": "Alamat dokter diperlukan"}), 400

    try:
        import chromadb
        client = chromadb.PersistentClient(path="./chroma_db") 
        collection = client.get_or_create_collection(name="medical_records")

        # CONTEK CARA HERBAL: Ambil semua data dari ChromaDB
        results = collection.get()
        print(f"🔍 [DEBUG DATABASE] Total IDs di Chroma: {len(results['ids'])}")
        print(f"🆔 [DEBUG DATABASE] List IDs: {results['ids']}")
        print(f"📄 [DEBUG DATABASE] Metadatas: {results['metadatas']}")
        if not results['ids']:
            return jsonify({"history": []}), 200

        # Kita kelompokkan data berdasarkan alamat pasien
        temp_history = {}

        for i in range(len(results['ids'])):
            meta = results['metadatas'][i]
            p_addr = meta.get('patient_address', '').lower()
            
            # Verifikasi apakah dokter ini punya akses ke pasien tersebut di Blockchain
            # (Ini opsional untuk kecepatan, tapi bagus untuk keamanan)
            try:
                p_checksum = web3.to_checksum_address(p_addr)
                doc_checksum = web3.to_checksum_address(doctor_login)
                
                # Cek izin akses di Blockchain
                has_access = contract.functions.checkAccess(p_checksum, doc_checksum).call()
                if not has_access:
                    continue # Skip jika dokter tidak punya izin lagi
            except:
                continue

            if p_addr not in temp_history:
                temp_history[p_addr] = []

            temp_history[p_addr].append({
                "diagnosis": results['documents'][i].replace("Kondisi Medis Pasien: ", ""),
                "timestamp": meta.get('timestamp', 0),
                "isActive": True,
                "index": meta.get('index'),
                "cid": meta.get('ipfs_cid')
            })

        # Format ulang agar sesuai dengan state 'patients' di React
        history = [{"address": addr, "medicalRecords": recs} for addr, recs in temp_history.items()]
        
        return jsonify({"history": history}), 200

    except Exception as e:
        print(f"Error List Medical: {e}")
        return jsonify({"history": [], "error": str(e)}), 200

@app.route("/medical/store", methods=["POST", "OPTIONS"])
def store_medical_api():
    if request.method == "OPTIONS":
        return jsonify({"status": "OK"}), 200

    data = request.json
    try:
        raw_address = data.get("patient_address")
        pasien_address = web3.to_checksum_address(raw_address)
        diagnosa = data.get("diagnosis")
        
        # 🛡️ TERIMA INDEX DARI FRONTEND (Mencegah Access Denied)
        # Jangan nanya contract.functions lagi di sini!
        blockchain_index = data.get("blockchain_index", 0)

        # 1️⃣ TAHAP IPFS
        medical_metadata = {
            "diagnosis": diagnosa,
            "patient": pasien_address,
            "timestamp": datetime.now().isoformat()
        }
        ipfs_cid = upload_json_to_ipfs(medical_metadata)
        print(f"✅ IPFS Success: {ipfs_cid}")

        # 2️⃣ TAHAP CHROMADB (Simpan ke Memori AI)
        # Menggunakan blockchain_index yang dikirim dari React
        record_id = f"med_{pasien_address.lower()}_{int(time.time())}"
        
        from chroma.herbal_store import add_medical_to_chroma
        add_medical_to_chroma(record_id, pasien_address, diagnosa, ipfs_cid, blockchain_index)
        print(f"✅ ChromaDB Indexed: {record_id}")

        # 3️⃣ RETURN KE REACT
        return jsonify({
            "status": "Success",
            "ipfs_cid": ipfs_cid
        }), 200

    except Exception as e:
        print(f"❌ Error Real: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@app.route("/medical/update", methods=["PUT", "OPTIONS"]) # Tambahkan OPTIONS
def update_medical_record():
    if request.method == "OPTIONS":
        return jsonify({"status": "OK"}), 200

    try:
        data = request.json
        patient_addr = data.get("patient_address").lower().strip()
        new_diagnosis = data.get("diagnosis")
        record_index = data.get("index") # 👈 Kita butuh index dari FE agar tahu mana yang diedit

        # 1. Upload ke IPFS
        new_cid = upload_json_to_ipfs({
            "diagnosis": new_diagnosis, 
            "patient": patient_addr,
            "timestamp": datetime.now().isoformat(),
            "status": "updated"
        })
        
        # 2. Update di ChromaDB (Menimpa ID yang spesifik)
        # ID harus med_alamat_index agar tidak menimpa riwayat penyakit lain
        from chroma.herbal_store import embedding_function
        record_id = f"med_{patient_addr}_{record_index}"
        
        import chromadb
        client = chromadb.PersistentClient(path=os.path.join(os.path.dirname(__file__), "chroma_db"))
        collection = client.get_or_create_collection(name="medical_records")
        
        collection.upsert(
            ids=[record_id],
            documents=[f"Kondisi Medis Pasien: {new_diagnosis}"],
            metadatas=[{
                "patient_address": patient_addr, 
                "ipfs_cid": new_cid,
                "index": record_index, # Simpan kembali indexnya
                "isActive": True
            }]
        )
        
        print(f"✅ ChromaDB Updated: {record_id}")
        return jsonify({
            "status": "Success", 
            "ipfs_cid": new_cid,
            "index": record_index
        }), 200

    except Exception as e:
        print(f" Error Update: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@app.route("/medical/delete-by-cid", methods=["DELETE"])
def delete_medical_by_cid():
    cid = request.args.get("cid")
    patient_address = request.args.get("patient").lower()
    
    try:
        import chromadb
        client = chromadb.PersistentClient(path="./chroma_db")
        collection = client.get_or_create_collection(name="medical_records")
        
        # Cari semua metadata milik pasien ini
        results = collection.get(where={"patient_address": patient_address})
        
        # Cari ID mana yang punya CID tersebut
        target_id = None
        for i, meta in enumerate(results['metadatas']):
            if meta.get('ipfs_cid') == cid:
                target_id = results['ids'][i]
                break
        
        if target_id:
            collection.delete(ids=[target_id])
            return jsonify({"message": "Teks di AI berhasil dihapus"}), 200
        else:
            return jsonify({"error": "Data tidak ditemukan di AI"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# PASIEN
# =========================
# DI DALAM app.py
@app.route("/auth/patients", methods=["GET"]) 
def get_all_patients():
    try:
        all_accounts = web3.eth.accounts
        patient_list = []
        
        for acc in all_accounts:
            checksum_acc = web3.to_checksum_address(acc)
            name = contract.functions.patientNames(checksum_acc).call()
            
            if name != "" and name is not None:
                patient_list.append({
                    "address": checksum_acc,
                    "name": name
                })
        
        return jsonify({"patients": patient_list}), 200
    except Exception as e:
        return jsonify({"patients": [], "error": str(e)}), 500
    
@app.route("/auth/doctors", methods=["GET"])
def get_all_doctors():
    try:
        all_accounts = web3.eth.accounts
        doctor_list = [] # Kita ubah jadi list of objects
        
        for acc in all_accounts:
            checksum_acc = web3.to_checksum_address(acc)
            # 1. Cek apakah dokter terverifikasi
            is_verified = contract.functions.verifiedDoctor(checksum_acc).call()
            
            if is_verified:
                # 2. Ambil info lengkap dokter dari Mapping 'doctors' di Blockchain
                # Biasanya returns: [name, specialty, isApproved, isRegistered]
                doc_info = contract.functions.doctors(checksum_acc).call()
                
                # 3. Masukkan Alamat dan Nama ke dalam list
                doctor_list.append({
                    "address": checksum_acc,
                    "name": doc_info[0] # doctor_info[0] biasanya adalah NAMA
                })
        
        return jsonify({"doctors": doctor_list}), 200
    except Exception as e:
        print(f"❌ Error Detail: {str(e)}")
        return jsonify({"doctors": [], "error": str(e)}), 500
    
@app.route("/patient/grant-access", methods=["POST"])
def grant_access_api():
    data = request.json
    tx_hash = grant_access(
        data["patient_private_key"],
        data["doctor_address"]
    )
    return jsonify({"tx_hash": tx_hash})


@app.route("/patient/revoke-access", methods=["POST"])
def revoke_access_api():
    try:
        data = request.json
        # Ambil data dari body request
        patient_address = data.get("address") # Alamat wallet pasien
        doctor_address = data.get("doctor_address")
        doctor_name = data.get("doctor_name", "Dokter")
        private_key = data.get("patient_private_key")

        # 1. Jalankan fungsi blockchain
        tx_hash = revoke_access(
            private_key,
            doctor_address
        )

        pesan_untuk_pasien = f"Izin akses untuk dr. {doctor_name} telah berhasil dicabut."
        add_notification(patient_address, pesan_untuk_pasien)

        pesan_untuk_dokter = f"Akses Anda ke rekam medis {patient_address[:10]}... telah dicabut oleh pasien."
        add_notification(doctor_address, pesan_untuk_dokter)

        return jsonify({
            "status": "success",
            "tx_hash": tx_hash,
            "message": "Akses berhasil dicabut dan log tersimpan."
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/patient/reject-access", methods=["POST"])
def reject_access_api():
    data = request.json
    try:
        tx_hash = reject_access(
            data["patient_private_key"],
            data["doctor_address"]
        )
        return jsonify({
            "status": "Success",
            "message": "Access request rejected",
            "tx_hash": tx_hash
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/patient/request-recommendation", methods=["POST"])
def patient_request_recommendation():
    data = request.json
    patient_address = data["patient_address"]
    patient_private_key = data["patient_private_key"] 
    keluhan = data["keluhan"]

    # Ambil riwayat (Sudah difilter isActive di service)
    medical_conditions = get_patient_medical_conditions(patient_address, patient_private_key)

    # Pastikan data yang dikirim ke LLM adalah data paling update
    # Kita gunakan list(set()) agar penyakit yang sama tidak muncul double
    llm_input = {
        "patient_context": {
            "keluhan": keluhan, 
            "kondisi_medis": list(set(medical_conditions)) 
        },
        "safe_herbs": retrieve_relevant_herbs(keluhan) 
    }
    
    return jsonify(generate_herbal_recommendation(llm_input))

@app.route("/medical/grant", methods=["POST"])
def grant():
    data = request.json
    tx_hash = grant_access(
        data["patient_private_key"],
        data["doctor_address"]
    )
    return jsonify({"tx_hash": tx_hash})


@app.route("/medical/revoke", methods=["POST"])
def revoke():
    data = request.json
    tx_hash = revoke_access(
        data["patient_private_key"],
        data["doctor_address"]
    )
    return jsonify({"tx_hash": tx_hash})


# =========================
# DOKTER Herbal
# ========================
@app.route("/herbal/store", methods=["POST"])
def store_herbal_api():
    data = request.json
    doctor_address = data.get("doctor_address")
    nama = data.get("name")
    # Ambil data baru dari form
    indikasi = data.get("indikasi")
    kontraindikasi = data.get("kontraindikasi") # Tambahkan ini
    deskripsi = data.get("deskripsi")
    
    
    try:
        # 1. IPFS Upload
        herbal_metadata = {
            "name": nama,
            "indikasi": indikasi,
            "kontraindikasi": kontraindikasi,
            "deskripsi": deskripsi,
            "doctor_address": doctor_address
        }
        ipfs_cid = upload_json_to_ipfs(herbal_metadata)
        print(f"✅ IPFS Success: {ipfs_cid}")

        # 2. ChromaDB (PERBAIKAN DI SINI)
        add_herbal(
            name=nama, 
            indikasi=indikasi, 
            kontraindikasi=kontraindikasi, # Pastikan ini ada!
            cid=ipfs_cid,
            content=deskripsi,
            doctor_address = data.get("doctor_address")

        )
        print("✅ ChromaDB Indexed")
        
        return jsonify({
            "status": "Success", 
            "ipfs_cid": ipfs_cid, 
        }), 201

    except Exception as e:
        print(f"❌ ERROR: {e}")
        return jsonify({"error": str(e)}), 500
# =========================
# DOKTER
# =========================
@app.route("/doctor/request-access", methods=["POST"])
def doctor_request_access_api():
    data = request.json
    doctor_name = data.get("doctor_name", "Dokter")
    patient_address = data.get("patient_address")
    tx_hash = request_access_from_doctor(
        data["doctor_private_key"],
        patient_address
    )
    pesan = f"dr. {doctor_name} meminta izin untuk mengakses rekam medis Anda."
    add_notification(patient_address, pesan)
    return jsonify({"tx_hash": tx_hash, "status": "Request sent to blockchain"})

@app.route("/doctor/medical-records", methods=["GET"])
def get_records():
    patient = request.args.get("patient")
    doctor = request.args.get("doctor")
    records = get_medical_records_as_doctor(patient, doctor)
    return jsonify(records)


if __name__ == "__main__":
    app.run(debug=True)



