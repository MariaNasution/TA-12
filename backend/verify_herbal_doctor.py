import os
from dotenv import load_dotenv
from blockchain.contract import web3, contract

load_dotenv()

ADMIN_PK = os.getenv("ADMIN_PRIVATE_KEY")
DOCTOR_HERBAL = os.getenv("HERBAL_DOCTOR_ADDRESS")

def verify():
    if not ADMIN_PK or not DOCTOR_HERBAL:
        print("❌ Error: ADMIN_PRIVATE_KEY atau HERBAL_DOCTOR_ADDRESS tidak ditemukan di .env")
        return

    try:
        # 1. Mendapatkan alamat wallet admin dari Private Key
        admin_addr = web3.eth.account.from_key(ADMIN_PK).address
        print(f"Memverifikasi {DOCTOR_HERBAL} menggunakan Admin {admin_addr}...")

        # 2. Pastikan alamat dalam format Checksum (Penting untuk Web3.py)
        target_doctor = web3.to_checksum_address(DOCTOR_HERBAL)
        admin_addr = web3.to_checksum_address(admin_addr)

        # 3. Bangun Transaksi untuk fungsi verifyDoctor di Smart Contract
        tx = contract.functions.verifyDoctor(target_doctor).build_transaction({
            'from': admin_addr,
            'nonce': web3.eth.get_transaction_count(admin_addr),
            'gas': 100000,
            'gasPrice': web3.to_wei('50', 'gwei')
        })

        # 4. Sign Transaksi menggunakan Private Key Admin
        signed = web3.eth.account.sign_transaction(tx, ADMIN_PK)
        
        # 5. Kirim data transaksi (Handle perbedaan versi Web3.py)
        raw_data = signed.raw_transaction if hasattr(signed, 'raw_transaction') else signed.rawTransaction
        tx_hash = web3.eth.send_raw_transaction(raw_data)
        
        # 6. Tunggu konfirmasi dari Blockchain
        web3.eth.wait_for_transaction_receipt(tx_hash)
        
        print(f"✅ Sukses! Dokter Herbal Berhasil Diverifikasi di Blockchain.")
        print(f"🔗 Hash Transaksi: {web3.to_hex(tx_hash)}")
        
    except Exception as e:
        print(f"❌ Gagal verifikasi: {e}")

if __name__ == "__main__":
    verify()