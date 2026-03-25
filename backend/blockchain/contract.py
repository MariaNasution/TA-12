import json
import os
from web3 import Web3
from dotenv import load_dotenv

# 1. Ambil path dasar folder backend
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# 2. Koneksi ke Ganache
web3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

if not web3.is_connected():
    raise Exception("❌ Web3 tidak terhubung! Pastikan Ganache sudah jalan.")

# 3. PATH ABI: Diubah dari "abi" ke "build/contracts" (Hasil Truffle)
ABI_PATH = os.path.join(BASE_DIR, "build", "contracts", "StorageHealthRecords.json")

try:
    with open(ABI_PATH, "r") as f:
        artifact = json.load(f)
        # Ambil bagian 'abi' dari file JSON hasil compile Truffle
        contract_abi = artifact["abi"]
except FileNotFoundError:
    raise Exception(f"❌ File ABI tidak ditemukan di {ABI_PATH}. Jalankan 'truffle compile' dulu!")

# 4. ALAMAT KONTRAK: Diambil otomatis dari file .env
raw_address = os.getenv("CONTRACT_ADDRESS")
if not raw_address:
    raise Exception("❌ CONTRACT_ADDRESS tidak ditemukan di file .env!")

CONTRACT_ADDRESS = web3.to_checksum_address(raw_address)

# 5. Inisialisasi Kontrak
contract = web3.eth.contract(
    address=CONTRACT_ADDRESS,
    abi=contract_abi
)

print(f"✅ Blockchain terhubung ke: {CONTRACT_ADDRESS}")