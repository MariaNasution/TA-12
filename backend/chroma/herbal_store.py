import os
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "chroma_db"))

embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="intfloat/multilingual-e5-large"
)


chroma_client = chromadb.PersistentClient(
    path=CHROMA_DIR
)

collection = chroma_client.get_or_create_collection(
    name="herbal_collection",
    embedding_function=embedding_function
)


def add_medical_to_chroma(record_id, patient_address, diagnosis, ipfs_cid, index):
    # 1. Hapus dulu koleksi lama yang bermasalah (HANYA JALANKAN SEKALI/SAAT ERROR)
    # try:
    #     chroma_client.delete_collection(name="medical_records")
    #     print("🧹 [ChromaDB] Koleksi lama dihapus untuk reset embedding.")
    # except:
    #     print("ℹ️ [ChromaDB] Koleksi belum ada, lanjut membuat baru.")

    # 2. Buat ulang koleksi dengan konfigurasi yang benar
    medical_coll = chroma_client.get_or_create_collection(
        name="medical_records",
        embedding_function=embedding_function
    )
    
    medical_coll.add(
        ids=[record_id],
        documents=[f"Kondisi Medis Pasien: {diagnosis}"],
        metadatas=[{
            "patient_address": patient_address.lower(),
            "ipfs_cid": ipfs_cid,
            "index": index,
            "isActive": True
        }]
    )
    print(f"✅ [ChromaDB] Berhasil simpan riwayat medis: {record_id}")
    
def add_herbal(name, indikasi, kontraindikasi, cid, content, doctor_address):
    doc_id = f"herb_{name.lower().replace(' ', '_')}_{doctor_address.lower()[:6]}"
    full_text_for_embedding = (
        f"Herbal: {name}. "
        f"Kegunaan dan Indikasi: {indikasi}. "
        f"Peringatan/Kontraindikasi: {kontraindikasi}. "
        f"Penjelasan: {content}"
    )
    # --- TAMBAHKAN PRINT INI UNTUK DEBUGGING ---
    print("\n" + "="*50)
    print("📤 MENGIRIM KE CHROMADB (FORMAT TXT):")
    print(full_text_for_embedding)
    print("="*50 + "\n")
    # -------------------------------------------
    
    collection.add(
        ids=[doc_id],
        documents=[full_text_for_embedding], 
        metadatas=[{                         
            "nama": name,
            "indikasi": indikasi,
            "kontraindikasi": kontraindikasi,
            "ipfs_cid": cid,
            "deskripsi": content,
            "doctor_address": doctor_address.lower()
        }]
    )
def search_herbal(query, n_results=3):
    query_embeddings = embedding_function([query])
    
    print("\n" + "="*50)
    print(f"KELUHAN PASIEN: '{query}'")
    print(f"ANGKA EMBEDDING (Hanya 10 angka pertama dari 384):")
    print(query_embeddings[0][:10]) 
    print(f"... (total ada {len(query_embeddings[0])} angka dalam vektor ini)")
    print("="*50 + "\n")

    return collection.query(
        query_texts=[query],
        n_results=n_results,
    )
def count_herbal():
    return collection.count()

