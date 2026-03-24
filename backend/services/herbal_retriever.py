from chroma.herbal_store import search_herbal
def retrieve_relevant_herbs(query, k=2):
    result = search_herbal(query, n_results=k)
    herbs = []
    
    if result["documents"] and result["documents"][0]:
        for i in range(len(result["documents"][0])):
            distance = result["distances"][0][i]
            metadata = result["metadatas"][0][i]
            
            indikasi = str(metadata.get("indikasi", "")).lower()
            nama_herb = metadata.get("nama", "Herbal")


            if distance > 0.4: 
                print(f"⏩ SKIP: {metadata.get('nama')} dibuang karena terlalu tidak nyambung (Dist: {distance:.4f})")
                continue

            herbs.append({
                "id": result["ids"][0][i],
                "nama": nama_herb,
                "indikasi": indikasi,
                "kontraindikasi": metadata.get("kontraindikasi", ""),
                "deskripsi": result["documents"][0][i],
                "distance": distance
            })
    return herbs