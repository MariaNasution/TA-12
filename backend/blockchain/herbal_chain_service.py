from blockchain.contract import web3, contract
from dotenv import load_dotenv
import os

load_dotenv()

PRIVATE_KEY = os.getenv("SYSTEM_PRIVATE_KEY") or os.getenv("ETH_STORAGE_KEY")
if PRIVATE_KEY:
    ACCOUNT_ADDRESS = web3.eth.account.from_key(PRIVATE_KEY).address
else:
    ACCOUNT_ADDRESS = web3.eth.accounts[0] if web3.eth.accounts else None

def store_herbal_cid_to_blockchain(cid: str):
    if not PRIVATE_KEY or not ACCOUNT_ADDRESS:
        raise Exception("❌ SYSTEM_PRIVATE_KEY tidak ditemukan di .env")

    nonce = web3.eth.get_transaction_count(ACCOUNT_ADDRESS)

    tx = contract.functions.storeHerbalData(cid).build_transaction({
        "from": ACCOUNT_ADDRESS,
        "nonce": nonce,
        "gas": 300000,
        "gasPrice": web3.to_wei("20", "gwei")
    })

    signed_tx = web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)

    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    return receipt.transactionHash.hex()
