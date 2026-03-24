import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import BerandaHerbal from './BerandaHerbal';
import KatalogHerbal from './KatalogHerbal'; 
import TambahHerbal from './TambahHerbal'; // Pastikan diimpor
import { useAuth } from '../../context/AuthContext';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, HEALTH_RECORD_ABI } from '../../api/contract_abi';

export default function HerbalDoctorDashboard() {
  const { address, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [herbalList, setHerbalList] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    id: null,
    name: "",
    indikasi: "",
    kontraindikasi: "",
    deskripsi: "",
  });

  const fetchHerbalData = useCallback(async () => {
  if (!address) return; // ⛔ penting

  console.log("🔄 [DEBUG] Memulai Fetch Data Herbal (Auto-Sync)...");

  try {
    const res = await fetch(`http://localhost:5000/herbal/all?address=${address}&t=${Date.now()}`);
    const data = await res.json();

    console.log("📥 [DEBUG] Data segar diterima:", data);
    setHerbalList(Array.isArray(data) ? data : []);

  } catch (err) {
    console.error("❌ [DEBUG] Gagal fetch:", err);
    setHerbalList([]);
  } finally {
    setIsInitialLoading(false);
  }

}, [address]); // ✅ WAJIB ADA
  useEffect(() => {
    if (!loading && address && role === 'herbal_doctor') {
      console.log(" [DEBUG] Auth siap, menarik data untuk:", address);
      fetchHerbalData();
    }
  }, [address, loading, role, activeTab, fetchHerbalData]);

  const handleStoreHerbal = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    console.log("🚀 [DEBUG] Menjalankan Handle Store. Mode:", form.id ? "UPDATE" : "ADD");

    try {
      const isUpdate = !!form.id;
      const url = isUpdate
        ? `http://localhost:5000/herbal/update/${form.id}`
        : "http://localhost:5000/herbal/store";

      // A. Kirim ke Flask
      const response = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...form,
            doctor_address: address 
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal ke server");
      console.log("[DEBUG] Flask & IPFS Berhasil:", result.ipfs_cid);

      if (!window.ethereum) throw new Error("MetaMask tidak ditemukan!");
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);

      alert(`Data AI Berhasil. Konfirmasi MetaMask untuk Blockchain.`);
      const tx = await contract.storeHerbalData(result.ipfs_cid);
      
      console.log("[DEBUG] Menunggu konfirmasi Blockchain...");
      await tx.wait(); 

      alert(`Berhasil! Data ${isUpdate ? "Diperbarui" : "Disimpan"}.`);
      
      await fetchHerbalData(); 
      setForm({ id: null, name: "", indikasi: "", kontraindikasi: "", deskripsi: "" });
      setActiveTab('katalog'); // Otomatis pindah ke tabel setelah simpan
      
    } catch (error) {
      console.error("❌ [DEBUG] Error saat simpan:", error);
      alert(`Gagal: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- 3. HANDLE DELETE (Sesuai Kode Lama) ---
  const handleDelete = async (id) => {
    if (!window.confirm("Hapus data dari AI dan catat di Blockchain?")) return;
    setIsSaving(true);
    console.log("🗑️ [DEBUG] Menghapus data ID:", id);

    try {
      const response = await fetch(`http://localhost:5000/herbal/delete/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Gagal hapus di AI");

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);

      alert("Data AI terhapus. Konfirmasi MetaMask untuk Blockchain.");
      const tx = await contract.storeHerbalData(`DELETED_${id}`);
      await tx.wait();

      alert("✅ Berhasil Dihapus Total!");
      await fetchHerbalData(); 
    } catch (error) {
      console.error("❌ [DEBUG] Error saat hapus:", error);
      alert(`Gagal Hapus: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- 4. HANDLE EDIT (Perbaikan: Isi Form + Pindah Tab) ---
  const prepareEdit = (herb) => {
    console.log("✏️ [DEBUG] Mempersiapkan Edit untuk:", herb.nama);
    setForm({
      id: herb.id,
      name: herb.nama,
      indikasi: herb.indikasi,
      kontraindikasi: herb.kontraindikasi,
      deskripsi: herb.deskripsi,
    });
    
    // KUNCI: Pindah ke tab input agar form muncul di layar
    setActiveTab('input'); 
    
    // Scroll ke atas agar form terlihat jelas
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading || isInitialLoading) return <p style={{textAlign: 'center', padding: '100px'}}>Memverifikasi Otoritas Herbal...</p>;

  return (
    <div className="layout-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} notifications={{ notifCount: 0 }} />
      
      <main className="main-content">
        <section className="page-body">
          {activeTab === 'dashboard' && (
            <BerandaHerbal herbalList={herbalList} onAddClick={() => setActiveTab('input')} />
          )}
          
          {activeTab === 'input' && (
            <TambahHerbal 
              form={form} 
              setForm={setForm} 
              onSave={handleStoreHerbal} 
              isSaving={isSaving}
              onCancel={() => {
                setForm({ id: null, name: "", indikasi: "", kontraindikasi: "", deskripsi: "" });
                setActiveTab('katalog');
              }}
            />
          )}

          {activeTab === 'katalog' && (
             <KatalogHerbal 
                herbalList={herbalList} 
                onEdit={prepareEdit}
                onDelete={handleDelete}
             />
          )}
        </section>
      </main>

      <style jsx>{`
        .layout-container { display: flex; background: #fcfcfc; min-height: 100vh; }
        .main-content { margin-left: 260px; flex: 1; padding: 20px 40px; }
        .page-body { margin-top: 10px; }
      `}</style>
    </div>
  );
}