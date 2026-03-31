# from .contract import contract, web3
# from web3.exceptions import ContractLogicError, BadFunctionCallOutput
# from ipfs.ipfs_service import get_json_from_ipfs
# from .contract import contract, web3
from blockchain.contract import web3, contract
from ipfs.ipfs_service import get_json_from_ipfs
from web3.exceptions import ContractLogicError, BadFunctionCallOutput

# Import AES dekripsi untuk decoding data IPFS
try:
    from services.security_service import decrypt_data
    _ENCRYPTION_ENABLED = True
except ImportError:
    _ENCRYPTION_ENABLED = False
    print("⚠️ security_service tidak ditemukan — dekripsi dinonaktifkan")


def store_medical_record(doctor_pk, patient_addr, cid):
    # Ambil alamat dokter dari Private Key
    doctor_account = web3.eth.account.from_key(doctor_pk)
    
    # Pastikan memanggil fungsi addRecord (atau nama fungsi di Solidity kamu)
    # Dan parameter yang dikirim adalah 'cid' (bukan medical_data mentah)
    nonce = web3.eth.get_transaction_count(doctor_account.address)
    
    txn = contract.functions.storeMedicalRecord(patient_addr, cid).build_transaction({
        'from': doctor_account.address,
        'nonce': nonce,
        'gas': 500000,
        'gasPrice': web3.to_wei('50', 'gwei')
    })
    
    signed_txn = web3.eth.account.sign_transaction(txn, private_key=doctor_pk)
    tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
    return web3.to_hex(tx_hash)

def get_patient_medical_conditions(patient_address, doctor_address):
    try:
        # Panggil blockchain hanya menggunakan alamat (tanpa tanda tangan PK)
        records = contract.functions.getMedicalRecords(patient_address).call({
            "from": doctor_address
        })
    except Exception as e:
        print(f"🕵️ Audit Access: Alamat {doctor_address} dilarang akses pasien {patient_address}")
        print("DETAIL ERROR:", e)
        return []

    conditions = []
    for record in records:
        if len(record) > 2 and record[3] is False:
            continue

        cid = record[0]
        raw_data = get_json_from_ipfs(cid)

        if raw_data:
            # Dekripsi data IPFS (legacy plaintext lolos otomatis jika tidak ada field "encrypted")
            try:
                if _ENCRYPTION_ENABLED:
                    data = decrypt_data(raw_data, patient_address)
                else:
                    data = raw_data
            except Exception:
                data = raw_data  # Fallback: gunakan data mentah jika dekripsi gagal

            if data and "diagnosis" in data:
                diag = data["diagnosis"]
                conditions.extend([c.strip().lower() for c in diag.split(",") if c.strip()])

    return list(set(conditions))


def get_medical_records_as_doctor(patient_address, doctor_address):
    try:
        # Pastikan doctor_address yang masuk di sini berasal dari session login React
        records = contract.functions.getMedicalRecords(patient_address).call({
            "from": doctor_address
        })

        return [
            {
                "cid": r[0],
                "timestamp": r[1],
                "isActive": r[3] if len(r) > 3 else True
            }
            for r in records if r[3] is True  # isActive ada di index 3: (cid, timestamp, createdBy, isActive)
        ]

    except Exception as e:
        return {"error": "Access denied", "details": str(e)}

def grant_access(patient_private_key, doctor_address):
    account = web3.eth.account.from_key(patient_private_key)

    tx = contract.functions.grantAccess(doctor_address).build_transaction({
        "from": account.address,
        "nonce": web3.eth.get_transaction_count(account.address),
        "gas": 200000,
        "gasPrice": web3.eth.gas_price
    })

    signed = account.sign_transaction(tx)
    tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()


def revoke_access(patient_private_key, doctor_address):
    account = web3.eth.account.from_key(patient_private_key)

    tx = contract.functions.revokeAccess(doctor_address).build_transaction({
        "from": account.address,
        "nonce": web3.eth.get_transaction_count(account.address),
        "gas": 200000,
        "gasPrice": web3.eth.gas_price
    })

    signed = account.sign_transaction(tx)
    tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()

def reject_access(patient_private_key, doctor_address):
    account = web3.eth.account.from_key(patient_private_key)
    
    tx = contract.functions.rejectAccess(
        web3.to_checksum_address(doctor_address)
    ).build_transaction({
        "from": account.address,
        "nonce": web3.eth.get_transaction_count(account.address),
        "gas": 300000,
        "gasPrice": web3.eth.gas_price
    })
    
    signed = account.sign_transaction(tx)
    tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()

def request_access_from_doctor(doctor_private_key, patient_address):
    account = web3.eth.account.from_key(doctor_private_key)
    
    # Memanggil fungsi requestAccess di Smart Contract
    tx = contract.functions.requestAccess(patient_address).build_transaction({
        "from": account.address,
        "nonce": web3.eth.get_transaction_count(account.address),
        "gas": 200000,
        "gasPrice": web3.eth.gas_price
    })

    signed = account.sign_transaction(tx)
    tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()



