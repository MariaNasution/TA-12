import os
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
from ipfs.ipfs_service import upload_json_to_ipfs
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


load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
base_dir = os.path.dirname(os.path.abspath(__file__))

# --- ENDPOINT UNTUK SMART SEARCH DROPDOWN (ICD-10) ---
# @app.route("/herbal/search-icd", methods=["GET"])
# def search_icd_api():
#     query = request.args.get("q", "")
#     if not query or len(query) < 3:
#         return jsonify([])

#     try:
#         # AI (Embedding) mencari 10 penyakit yang paling mirip maknanya
#         results = collection_icd.query(
#             query_texts=[query],
#             n_results=10
#         )
        
#         formatted_suggestions = []
#         if results and results['ids'] and results['ids'][0]:
#             for i in range(len(results['ids'][0])):
#                 # Kita kirim Label (untuk tampilan) dan Value (Kodenya)
#                 formatted_suggestions.append({
#                     "label": f"{results['ids'][0][i]} - {results['documents'][0][i]}",
#                     "value": results['ids'][0][i] 
#                 })
        
#         return jsonify(formatted_suggestions)
#     except Exception as e:
#         print(f"❌ Error saat mencari di Chroma ICD: {e}")
#         return jsonify([]), 500

@app.route("/auth/login", methods=["POST"])
def login_api():
    data = request.json
    try:
        # 1. Validasi & Konversi ke Checksum Address
        address = web3.to_checksum_address(data.get("address"))
    except Exception:
        return jsonify({"error": "Format alamat wallet tidak valid"}), 400
    
    print(f"DEBUG: Upaya Login -> {address}")

    # A. CEK ADMIN (Pemilik Kontrak)
    # Admin selalu bisa login tanpa perlu registrasi tambahan
    contract_admin = contract.functions.admin().call()
    if address == contract_admin:
        return jsonify({
            "role": "admin", 
            "status": "active", 
            "name": "Admin Sistem"
        }), 200

    # B. CEK DOKTER (Medis & Herbal)
    doctor_info = contract.functions.doctors(address).call()
    
    if doctor_info[3]:  # Jika isRegistered == True
        # CEK APPROVAL: Syarat mutlak login untuk semua dokter
        if doctor_info[2]:  # Jika isApproved == True
            role = "doctor" 
            # Pembedaan role berdasarkan spesialisasi yang dipilih saat daftar
            if "herbal" in doctor_info[1].lower():
                role = "herbal_doctor"
                
            return jsonify({
                "role": role, 
                "name": doctor_info[0], 
                "specialty": doctor_info[1],
                "status": "approved"
            }), 200
        else:
            # DOKTER TERDAFTAR TAPI BELUM DI-APPROVE ADMIN
            return jsonify({
                "role": "doctor", 
                "status": "pending_approval", 
                "message": "Akun Dokter Anda sedang menunggu verifikasi Admin. Silakan hubungi admin untuk aktivasi."
            }), 403

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
    try:
        import chromadb
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(base_dir, "chroma_db")
        client = chromadb.PersistentClient(path=db_path)

        target_name = "herbal_collection" 
        collection = client.get_or_create_collection(name=target_name)
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

@app.route("/herbal/recommendation-input", methods=["GET"])
def recommendation_input():
    query = request.args.get("q", "").lower() 
    medical = request.args.get("medical", "")
    use_rag = request.args.get("use_rag", "true").lower() == "true"
    
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
        return jsonify(llm_output)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
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
        response = requests.post(f'http://127.0.0.1:5001/api/v0/cat?arg={cid}', timeout=5)

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
        record_id = f"med_{pasien_address.lower()}_{blockchain_index}"
        
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
@app.route("/auth/doctors", methods=["GET"])
def get_all_doctors():
    try:
        all_accounts = web3.eth.accounts
        doctor_addresses = []
        
        for acc in all_accounts:
            checksum_acc = web3.to_checksum_address(acc)
            # Sesuaikan: Pakai 'verifiedDoctor' (sesuai ABI yang kamu tunjukkan tadi)
            is_verified = contract.functions.verifiedDoctor(checksum_acc).call()
            
            if is_verified:
                # Kita hanya kirim ALAMATNYA saja (string) agar Frontend bisa melakukan loop
                doctor_addresses.append(checksum_acc)
        
        return jsonify({"doctors": doctor_addresses}), 200
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
    data = request.json
    tx_hash = revoke_access(
        data["patient_private_key"],
        data["doctor_address"]
    )
    return jsonify({"tx_hash": tx_hash})

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
        "safe_herbs": retrieve_relevant_herbs(expand_query_internal(keluhan)) 
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
            "deskripsi": deskripsi
        }
        ipfs_cid = upload_json_to_ipfs(herbal_metadata)
        print(f"✅ IPFS Success: {ipfs_cid}")

        # 2. ChromaDB (PERBAIKAN DI SINI)
        add_herbal(
            name=nama, 
            indikasi=indikasi, 
            kontraindikasi=kontraindikasi, # Pastikan ini ada!
            cid=ipfs_cid,
            content=deskripsi

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
    tx_hash = request_access_from_doctor(
        data["doctor_private_key"],
        data["patient_address"]
    )
    return jsonify({"tx_hash": tx_hash, "status": "Request sent to blockchain"})

@app.route("/doctor/medical-records", methods=["GET"])
def get_records():
    patient = request.args.get("patient")
    doctor = request.args.get("doctor")
    records = get_medical_records_as_doctor(patient, doctor)
    return jsonify(records)


if __name__ == "__main__":
    app.run(debug=True)



