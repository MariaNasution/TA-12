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
from ipfs.ipfs_service import upload_json_to_ipfs, get_json_from_ipfs, IPFS_PORT
from chroma.herbal_store import add_herbal, search_herbal
from rules.medical_rules import filter_herbs_by_medical_condition
from services.herbal_builder import build_herbs
from services.llm_schema_builder import build_llm_input
from services.llm_generator import generate_herbal_recommendation
from services.herbal_retriever import retrieve_relevant_herbs
from services.security_service import encrypt_data, decrypt_data, encrypt_herbal, decrypt_herbal
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
CORS(app, resources={r"/.*": {"origins": "*"}}, supports_credentials=False)
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

        for row in rows:
            if row.get("tanggal") and isinstance(row["tanggal"], datetime):
                row["tanggal"] = row["tanggal"].strftime('%Y-%m-%dT%H:%M:%S')

        return jsonify(rows)
    except Exception as e:
        return jsonify([])

@app.route("/notifications/mark-read", methods=["POST"])
def mark_read():
    address = request.json.get("address")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "UPDATE notifications SET is_read = TRUE WHERE address = %s"
        cursor.execute(query, (address.lower(),))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/auth/login", methods=["POST", "OPTIONS"])
def login_api():
    if request.method == "OPTIONS":
        return jsonify({"status": "OK"}), 200
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
        cursor.execute("SELECT password_hash, verification_status FROM user_auth WHERE LOWER(wallet_address) = LOWER(%s)", (address,))
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

        # --- 1b. CEK STATUS DEAKTIVASI (SEBELUM cek blockchain) ---
        if user_record.get('verification_status') == 'deactivated':
            cursor.close()
            conn.close()
            return jsonify({
                "role": "none",
                "status": "deactivated",
                "error": "Akun Anda telah dinonaktifkan Admin.",
                "message": "Silakan masuk ke halaman Registrasi untuk mendaftar ulang (mengulang dari awal)."
            }), 403

        # Update last login
        cursor.execute("UPDATE user_auth SET last_login = %s WHERE wallet_address = %s", (datetime.now(), address))
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"❌ Database Error: {e}")
        return jsonify({"error": "Gagal verifikasi basis data"}), 500

    # B. CEK DOKTER (Medis & Herbal)
    doctor_info = contract.functions.doctors(address).call()

    if doctor_info[3]:  
        if doctor_info[2]: 
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
    try:
        conn2 = get_db_connection()
        cur2 = conn2.cursor(dictionary=True)
        cur2.execute("SELECT verification_status FROM user_auth WHERE LOWER(wallet_address) = LOWER(%s)", (address,))
        db_check = cur2.fetchone()
        cur2.close()
        conn2.close()
        if db_check:
            if db_check['verification_status'] == 'deactivated':
                return jsonify({
                    "role": "none",
                    "status": "deactivated",
                    "error": "Akun Anda telah dinonaktifkan Admin.",
                    "message": "Silakan masuk ke halaman Registrasi untuk mendaftar ulang (mengulang dari awal)."
                }), 403
            return jsonify({
                "role": "none",
                "status": "incomplete",
                "error": "Registrasi belum lengkap.",
                "message": "Akun Anda ditemukan di database, tetapi transaksi blockchain belum selesai. Silakan registrasi ulang."
            }), 202
    except Exception:
        pass

    return jsonify({
        "role": "none",
        "error": "Alamat wallet belum terdaftar.",
        "message": "Silakan masuk ke halaman Registrasi terlebih dahulu."
    }), 404

@app.route("/admin/view-document/<address>", methods=["GET"])
def admin_view_doc(address):
    try:
        checksum_addr = web3.to_checksum_address(address)
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT document_cid FROM user_auth WHERE LOWER(wallet_address) = LOWER(%s)", (checksum_addr,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row or not row['document_cid']:
            return jsonify({"error": "Dokumen tidak ditemukan"}), 404

        from services.security_service import decrypt_file
        from flask import Response
        
        # Ambil dari IPFS
        encrypted_doc = get_json_from_ipfs(row['document_cid'])
        if not encrypted_doc:
            return jsonify({"error": "Gagal mengambil dokumen dari IPFS"}), 500

        # Dekripsi
        file_bytes, mime_type = decrypt_file(encrypted_doc, checksum_addr)
        
        return Response(file_bytes, mimetype=mime_type)
    except Exception as e:
        print(f"❌ Error View Doc: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/admin/verify/approve", methods=["POST"])
def admin_approve_doctor():
    try:
        data = request.json
        doctor_addr = data.get("address")
        if not doctor_addr:
            return jsonify({"error": "Alamat wallet diperlukan"}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        # Menggunakan LOWER untuk keamanan case-sensitivity
        cursor.execute("UPDATE user_auth SET verification_status = 'verified', rejection_reason = NULL WHERE LOWER(wallet_address) = LOWER(%s)", (doctor_addr,))
        conn.commit()
        cursor.close()
        conn.close()

        # Catat notifikasi sukses
        add_notification(doctor_addr, "Akun Anda telah berhasil diverifikasi oleh Admin. Selamat bekerja!")
        
        return jsonify({"status": "success", "message": "Dokter berhasil diverifikasi"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/admin/verify/reject", methods=["POST"])
def admin_reject_doctor():
    try:
        data = request.json
        doctor_addr = data.get("address")
        reason = data.get("reason", "Dokumen tidak valid, silakan upload ulang")
        if not doctor_addr:
            return jsonify({"error": "Alamat wallet diperlukan"}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE user_auth SET verification_status = 'rejected', rejection_reason = %s WHERE LOWER(wallet_address) = LOWER(%s)", (reason, doctor_addr))
        conn.commit()
        cursor.close()
        conn.close()

        # Catat notifikasi
        add_notification(doctor_addr, f"Verifikasi ditolak: {reason}. Silakan upload ulang dokumen Anda.")
        
        return jsonify({"status": "success", "message": "Dokter berhasil ditolak"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/admin/deactivate-doctor", methods=["POST"])
def admin_deactivate_doctor():
    """Nonaktifkan dokter secara total.
    Menghapus data autentikasi dari DB user_auth agar dokter harus registrasi ulang dari awal.
    Di Blockchain, admin sudah menghapusnya dari daftar `doctors` mapping via rejectDoctor.
    """
    try:
        data = request.json
        doctor_addr = data.get("address")
        if not doctor_addr:
            return jsonify({"error": "Alamat wallet diperlukan"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE user_auth SET verification_status = 'deactivated' WHERE LOWER(wallet_address) = LOWER(%s)",
            (doctor_addr,)
        )
        conn.commit()
        cursor.close()
        conn.close()

        add_notification(doctor_addr, "Akun Dokter Anda telah dinonaktifkan oleh Admin. Silakan lakukan registrasi ulang untuk mengaktifkannya kembali.")
        
        return jsonify({"status": "success", "message": "Dokter berhasil dinonaktifkan secara total"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/auth/status/<address>", methods=["GET"])
def get_user_status(address):
    try:
        checksum_addr = web3.to_checksum_address(address)
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT verification_status, rejection_reason FROM user_auth WHERE LOWER(wallet_address) = LOWER(%s)", (checksum_addr,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if row:
            return jsonify(row), 200
        return jsonify({"error": "User tidak ditemukan"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/auth/check-role/<address>", methods=["GET"])
def check_role(address):
    """Cek role dari blockchain tanpa autentikasi password.
    Digunakan oleh checkStatus di AuthContext untuk dokter yang baru di-approve."""
    try:
        checksum_addr = web3.to_checksum_address(address)
        doc_info = contract.functions.doctors(checksum_addr).call()
        # doc_info: [name, specialty, isApproved, isRegistered]
        if doc_info[3] and doc_info[2]:  # isRegistered AND isApproved
            role = "herbal_doctor" if "herbal" in doc_info[1].lower() else "doctor"
            return jsonify({"role": role, "name": doc_info[0], "specialty": doc_info[1]}), 200
        return jsonify({"role": "doctor", "name": doc_info[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/auth/register", methods=["POST", "OPTIONS"])
def register_api():
    if request.method == "OPTIONS":
        return jsonify({"status": "OK"}), 200
    if request.is_json:
        data = request.json
    else:
        data = request.form

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
        cursor.execute("SELECT * FROM user_auth WHERE LOWER(wallet_address) = LOWER(%s)", (address,))
        existing_user = cursor.fetchone()
        
        is_re_registration = False
        if existing_user:
            if existing_user.get('verification_status') in ('deactivated', 'rejected'):
                is_re_registration = True
                print(f"DEBUG: Dokter {address} melakukan registrasi ulang setelah dinonaktifkan/ditolak")
            else:
                cursor.close()
                conn.close()
                return jsonify({"error": "Wallet sudah terdaftar di basis data"}), 409

        # Handle Document Upload for Doctors
        doc_cid = None
        if role == "doctor":
            file = request.files.get("document")
            if file:
                from services.security_service import encrypt_file
                file_bytes = file.read()
                mime_type = file.content_type
                encrypted_doc = encrypt_file(file_bytes, address, mime_type)
                doc_cid = upload_json_to_ipfs(encrypted_doc)
                print(f"🔐 Doctor document encrypted & uploaded: {doc_cid}")

        new_status = 'pending' if role == 'doctor' else 'verified'
        
        if is_re_registration:
            cursor.execute(
                "UPDATE user_auth SET name = %s, password_hash = %s, document_cid = %s, verification_status = %s WHERE LOWER(wallet_address) = LOWER(%s)",
                (name, hashed_pw, doc_cid, new_status, address)
            )
        else:
            cursor.execute(
                "INSERT INTO user_auth (wallet_address, name, password_hash, document_cid, verification_status) VALUES (%s, %s, %s, %s, %s)", 
                (address, name, hashed_pw, doc_cid, new_status)
            )
            
        conn.commit()
        cursor.close()
        conn.close()

        # Tambahkan notifikasi verifikasi otomatis untuk PASIEN baru
        if role == 'patient' and not is_re_registration:
            add_notification(address.lower(), "✨ Selamat Datang! Akun Pasien Anda telah diverifikasi otomatis oleh sistem. Anda bebas memberikan atau mencabut izin rekam medis ke dokter, serta menggunakan asisten AI peresepan.")

        return jsonify({
            "status": "success",
            "message": "Data tersimpan. Silakan selesaikan transaksi blockchain.",
            "address": address,
            "role": role
        }), 200

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/auth/reupload-document", methods=["POST", "OPTIONS"])
def reupload_document():
    """Endpoint untuk dokter yang ditolak agar bisa upload ulang dokumen STR/SIP.
    Berbeda dengan /register yang akan 409 jika wallet sudah ada.
    """
    if request.method == "OPTIONS":
        return jsonify({"status": "OK"}), 200
    try:
        address = web3.to_checksum_address(request.form.get("address"))
    except Exception:
        return jsonify({"error": "Format alamat wallet tidak valid"}), 400

    file = request.files.get("document")
    if not file:
        return jsonify({"error": "File dokumen diperlukan"}), 400

    try:
        from services.security_service import encrypt_file
        file_bytes = file.read()
        mime_type = file.content_type
        encrypted_doc = encrypt_file(file_bytes, address, mime_type)
        doc_cid = upload_json_to_ipfs(encrypted_doc)
        print(f"🔐 Re-upload dokumen dokter terenkripsi: {doc_cid}")

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE user_auth SET document_cid = %s, verification_status = 'pending', rejection_reason = NULL WHERE LOWER(wallet_address) = LOWER(%s)",
            (doc_cid, address)
        )
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"status": "success", "message": "Dokumen berhasil diunggah ulang. Menunggu verifikasi."}), 200
    except Exception as e:
        print(f"❌ Error re-upload: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/admin/dashboard/stats", methods=["GET"])
def get_admin_dashboard_stats():
    try:
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
                continue

            # --- CEK APAKAH DIA DOKTER ---
            doc = contract.functions.doctors(checksum_acc).call()
            if doc[3]:
                if doc[2]:
                    stats["total_pengguna"] += 1
                    if "herbal" in doc[1].lower():
                        stats["dokter_herbal"] += 1
                    else:
                        stats["dokter_medis"] += 1
                else:
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

@app.route("/admin/users", methods=["GET"])
def get_all_users_admin():
    """Endpoint untuk menampilkan semua pengguna terdaftar (pasien & dokter) di halaman Kelola Pengguna."""
    try:
        all_user_addrs = contract.functions.getAllUsers().call()
        admin_addr = contract.functions.admin().call()

        users = []
        for addr in all_user_addrs:
            checksum_acc = web3.to_checksum_address(addr)
            if checksum_acc == admin_addr:
                continue  

            p_name = contract.functions.patientNames(checksum_acc).call()
            if p_name != "":
                users.append({
                    "name": p_name,
                    "address": checksum_acc,
                    "role": "Pasien",
                    "status": "active"  
                })
                continue

            doc = contract.functions.doctors(checksum_acc).call()

            db_conn = get_db_connection()
            db_cursor = db_conn.cursor(dictionary=True)
            db_cursor.execute("SELECT * FROM user_auth WHERE LOWER(wallet_address) = LOWER(%s)", (checksum_acc,))
            db_user = db_cursor.fetchone()
            db_cursor.close()
            db_conn.close()

            if doc[3]: 
                role_label = "Dokter Herbal" if "herbal" in doc[1].lower() else "Dokter Medis"
                
                status = "pending"
                rejection_reason = None
                doc_cid = None
                if db_user:
                    status = db_user.get('verification_status', 'pending')
                    rejection_reason = db_user.get('rejection_reason')
                    doc_cid = db_user.get('document_cid')

                    if status == 'pending' and doc[2]:
                        status = 'verified'
                        
                elif doc[2]:
                    status = "active"

                users.append({
                    "name": doc[0] or "Tanpa Nama",
                    "address": checksum_acc,
                    "role": role_label,
                    "status": status,
                    "rejection_reason": rejection_reason,
                    "document_cid": doc_cid
                })
            else:
                if db_user and db_user.get('verification_status') == 'deactivated':
                    users.append({
                        "name": db_user.get('name', 'Tanpa Nama'),
                        "address": checksum_acc,
                        "role": "Dokter (Nonaktif)", 
                        "status": "deactivated",
                        "rejection_reason": db_user.get('rejection_reason'),
                        "document_cid": db_user.get('document_cid')
                    })

        return jsonify({"status": "success", "users": users, "total": len(users)}), 200

    except Exception as e:
        print(f"Error Get All Users: {e}")
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
        return jsonify([]), 200
    
@app.route("/herbal/delete/<id>", methods=["DELETE"])
def delete_herb(id):
    try:
        import chromadb
        import os
        
        # 1. Inisialisasi ulang client dan collection
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

        # 3. KONEKSI KE CHROMADB
        import chromadb
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(base_dir, "chroma_db")
        client = chromadb.PersistentClient(path=db_path)
        
        # Ambil koleksi herbal
        target_collection = client.get_or_create_collection(name="herbal_collection")

        # 4. Update di ChromaDB
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
        herbs_from_rag = retrieve_relevant_herbs(query)
        
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
    wallet = request.args.get('patient', '')  
    import requests
    try:
        response = requests.post(f'http://127.0.0.1:{IPFS_PORT}/api/v0/cat?arg={cid}', timeout=5)
        raw_json = response.json()

        try:
            decrypted = decrypt_data(raw_json, wallet)
        except Exception:
            decrypted = raw_json 

        return jsonify(decrypted), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return jsonify({"diagnosis": "Gagal mengambil data"}), 500

@app.route("/medical/ipfs-only", methods=["POST"])
def upload_to_ipfs_only():
    try:
        data = request.json
        medical_metadata = {
            "diagnosis": data.get("diagnosis"),
            "patient": data.get("patient_address"),
            "timestamp": datetime.now().isoformat()
        }
        
        ipfs_cid = upload_json_to_ipfs(medical_metadata)
        
        return jsonify({"ipfs_cid": ipfs_cid}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/medical/list", methods=["GET"])
def get_medical_list_api():
    doctor_login = request.args.get("doctor")
    if not doctor_login:
        return jsonify({"history": [], "error": "Alamat dokter diperlukan"}), 400

    try:
        doc_checksum = web3.to_checksum_address(doctor_login)

        # 1. Ambil semua pasien yang sudah memberikan akses ke dokter ini
        import requests as req
        all_patients = []
        try:
            res_patients = req.get("http://127.0.0.1:5000/auth/patients", timeout=5)
            data_patients = res_patients.json()
            all_patients = data_patients.get("patients", [])
        except Exception as e:
            print(f"⚠️ Gagal ambil daftar pasien: {e}")
            return jsonify({"history": [], "error": str(e)}), 500

        history = []

        for patient in all_patients:
            try:
                p_addr = patient.get("address", "")
                p_checksum = web3.to_checksum_address(p_addr)

                # 2. Cek akses dokter ke pasien ini
                has_access = contract.functions.checkAccess(p_checksum, doc_checksum).call()
                if not has_access:
                    continue

                # 3. Baca SEMUA records dari BLOCKCHAIN (source of truth)
                bc_records = contract.functions.getMedicalRecords(p_checksum).call({"from": doc_checksum})

                patient_records = []

                for j, bc_rec in enumerate(bc_records):
                    cid = bc_rec[0] if isinstance(bc_rec, (list, tuple)) else getattr(bc_rec, 'cid', '')
                    ts  = bc_rec[1] if isinstance(bc_rec, (list, tuple)) else getattr(bc_rec, 'timestamp', 0)
                    created_by = bc_rec[2] if isinstance(bc_rec, (list, tuple)) else getattr(bc_rec, 'createdBy', '')
                    is_active = bool(bc_rec[3] if isinstance(bc_rec, (list, tuple)) else getattr(bc_rec, 'isActive', False))

                    # 4: Filter hanya record yang DIBUAT oleh dokter yang login
                    try:
                        if web3.to_checksum_address(created_by) != doc_checksum:
                            continue
                    except Exception:
                        continue  

                    print(f"📋 [LIST] Patient={p_addr[:8]}... | idx={j} | CID={cid[:12]}... | isActive={is_active} | by={str(created_by)[:8]}...")

                    diagnosis_text = ""
                    try:
                        raw_json = get_json_from_ipfs(cid)
                        if raw_json:
                            try:
                                from services.security_service import decrypt_data
                                decrypted = decrypt_data(raw_json, p_checksum)
                            except Exception:
                                decrypted = raw_json
                            diagnosis_text = decrypted.get("diagnosis", "")
                        else:
                            diagnosis_text = ""
                    except Exception as e:
                        print(f"⚠️ Gagal ambil IPFS CID={cid}: {e}")
                        diagnosis_text = ""

                    patient_records.append({
                        "diagnosis": diagnosis_text,
                        "timestamp": datetime.fromtimestamp(int(ts)).isoformat() if ts else datetime.now().isoformat(),
                        "isActive": is_active,  
                        "index": j,           
                        "cid": cid
                    })

                if patient_records:
                    patient_name = patient.get("name", "")
                    if not patient_name:
                        try:
                            patient_name = contract.functions.patientNames(p_checksum).call()
                        except:
                            patient_name = f"{p_addr[:6]}...{p_addr[-4:]}"

                    history.append({
                        "address": p_addr.lower(),
                        "name": patient_name,
                        "medicalRecords": patient_records
                    })

            except Exception as e:
                print(f"⚠️ Error untuk pasien {p_addr}: {e}")
                continue

        return jsonify({"history": history}), 200

    except Exception as e:
        print(f"Error List Medical: {e}")
        return jsonify({"history": [], "error": str(e)}), 500


@app.route("/medical/store", methods=["POST", "OPTIONS"])
def store_medical_api():
    if request.method == "OPTIONS":
        return jsonify({"status": "OK"}), 200

    data = request.json
    try:
        raw_address = data.get("patient_address")
        pasien_address = web3.to_checksum_address(raw_address)
        diagnosa = data.get("diagnosis")
        
        blockchain_index = data.get("blockchain_index", 0)

        medical_metadata = {
            "diagnosis": diagnosa,
            "patient": pasien_address,
            "timestamp": datetime.now().isoformat()
        }
        encrypted_payload = encrypt_data(medical_metadata, pasien_address)
        ipfs_cid = upload_json_to_ipfs(encrypted_payload)
        print(f"🔐 IPFS encrypted upload: {ipfs_cid}")
        print(f"✅ IPFS Success: {ipfs_cid}")

        record_id = f"med_{pasien_address.lower()}_{blockchain_index}"
        
        from chroma.herbal_store import add_medical_to_chroma
        add_medical_to_chroma(record_id, pasien_address, diagnosa, ipfs_cid, blockchain_index)
        print(f"✅ ChromaDB Indexed: {record_id}")

        return jsonify({
            "status": "Success",
            "ipfs_cid": ipfs_cid
        }), 200

    except Exception as e:
        print(f"❌ Error Real: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@app.route("/medical/update", methods=["PUT", "OPTIONS"]) 
def update_medical_record():
    if request.method == "OPTIONS":
        return jsonify({"status": "OK"}), 200

    try:
        data = request.json
        patient_addr = data.get("patient_address").lower().strip()
        new_diagnosis = data.get("diagnosis")
        record_index = data.get("index") 

        # 1. Upload ke IPFS — Enkripsi AES-256-GCM sebelum upload
        raw_payload = {
            "diagnosis": new_diagnosis,
            "patient": patient_addr,
            "timestamp": datetime.now().isoformat(),
            "status": "updated"
        }
        encrypted_update = encrypt_data(raw_payload, patient_addr)
        new_cid = upload_json_to_ipfs(encrypted_update)
        print(f"🔐 IPFS encrypted update: {new_cid}")
        
        # 2. Update di ChromaDB
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
                "isActive": True,
                "timestamp": datetime.now().isoformat()
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
        
        results = collection.get(where={"patient_address": patient_address})
        
        target_id = None
        for i, meta in enumerate(results['metadatas']):
            if meta.get('ipfs_cid') == cid:
                target_id = results['ids'][i]
                break
        
        if target_id:
            collection.delete(ids=[target_id])
            print(f"✅ ChromaDB record dihapus: {target_id}")
            return jsonify({"message": "Teks di AI berhasil dihapus"}), 200
        else:
            print(f"⚠️ CID {cid[:12]}... tidak ditemukan di ChromaDB — Blockchain sudah nonaktif, tidak apa-apa.")
            return jsonify({"message": "Blockchain berhasil dinonaktifkan (ChromaDB tidak terpengaruh)"}), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# PASIEN
# =========================
# DI DALAM app.py
@app.route("/auth/patients", methods=["GET"]) 
def get_all_patients():
    try:
        all_user_addrs = contract.functions.getAllUsers().call()
        admin_addr = contract.functions.admin().call()
        patient_list = []
        
        for acc in all_user_addrs:
            checksum_acc = web3.to_checksum_address(acc)
            if checksum_acc == admin_addr:
                continue
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
        all_user_addrs = contract.functions.getAllUsers().call()
        admin_addr = contract.functions.admin().call()
        doctor_list = []
        
        for acc in all_user_addrs:
            checksum_acc = web3.to_checksum_address(acc)
            if checksum_acc == admin_addr:
                continue
            doc_info = contract.functions.doctors(checksum_acc).call()
            if doc_info[3] and doc_info[2]:  # isRegistered AND isApproved
                doctor_list.append({
                    "address": checksum_acc,
                    "name": doc_info[0]
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
        patient_address = data.get("address") 
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

    medical_conditions = get_patient_medical_conditions(patient_address, patient_private_key)

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
    indikasi = data.get("indikasi")
    kontraindikasi = data.get("kontraindikasi")
    deskripsi = data.get("deskripsi") or indikasi
    
    try:
        # 1. IPFS Upload — Enkripsi AES-256-GCM dengan kunci global herbal
        herbal_metadata = {
            "name": nama,
            "indikasi": indikasi,
            "kontraindikasi": kontraindikasi,
            "doctor_address": doctor_address
        }
        encrypted_herbal = encrypt_herbal(herbal_metadata)
        ipfs_cid = upload_json_to_ipfs(encrypted_herbal)
        print(f"🔐 IPFS herbal encrypted upload: {ipfs_cid}")

        # 2. ChromaDB — gunakan indikasi sebagai content embedding jika deskripsi tidak ada
        add_herbal(
            name=nama, 
            indikasi=indikasi, 
            kontraindikasi=kontraindikasi,
            cid=ipfs_cid,
            content=deskripsi,
            doctor_address=doctor_address


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
