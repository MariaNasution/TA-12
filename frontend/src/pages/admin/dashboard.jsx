import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import BerandaAdmin from './BerandaAdmin';
import VerifikasiAkun from './VerifikasiAkun';
import KelolaPengguna from './KelolaPengguna';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, HEALTH_RECORD_ABI } from '../../api/contract_abi';
import ProfilSaya from '../../components/ProfilSaya';

export default function AdminDashboard() {
  const { address, role, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // State Data sesuai Gambar 1 & 2
  const [adminData, setAdminData] = useState({
    stats: { total_pengguna: 0, pending_verif: 0, pasien: 0, dokter_medis: 0, dokter_herbal: 0 },
    pending_registrations: []
  });

  const [isLoading, setIsLoading] = useState(true);

  // AUTH GUARD: Pastikan user authenticated dan role admin
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (role !== 'admin') {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, role, router]);

  // --- FUNGSI AMBIL DATA DARI BLOCKCHAIN (VIA FLASK) ---
  const fetchAdminStats = useCallback(async () => {
    try {
      // Endpoint ini memanggil getAllUsers() di Smart Contract
      const res = await fetch("http://localhost:5000/admin/dashboard/stats");
      const data = await res.json();
      
      if (data.status === "success") {
        setAdminData({
          stats: data.stats,
          pending_registrations: data.pending_registrations
        });
      }
    } catch (err) {
      console.error("❌ Gagal tarik data Blockchain:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto Reload saat pertama masuk atau pindah tab
  useEffect(() => {
    if (!authLoading && role === 'admin') {
      fetchAdminStats();
    }
  }, [authLoading, role, activeTab, fetchAdminStats]);

  // --- HANDLE APPROVE (BLOCKCHAIN TRANSACTION + MYSQL SYNC) ---
  const handleApprove = async (targetAddr, name) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);

      console.log(`⏳ Memproses Approve untuk ${name}...`);
      const tx = await contract.approveDoctor(targetAddr);
      await tx.wait(); // Tunggu konfirmasi Blockchain

      // Sinkronisasi ke Database
      const res = await fetch("http://127.0.0.1:5000/admin/verify/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: targetAddr })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal update database");

      alert(`Berhasil! Pendaftaran akun dr. ${name} telah disetujui.`);
      fetchAdminStats(); // Refresh tampilan otomatis
    } catch (error) {
      alert("Gagal Approve: " + (error.data?.message || error.message));
    }
  };

  // --- HANDLE REJECT (BLOCKCHAIN TRANSACTION + MYSQL SYNC) ---
  const handleReject = async (targetAddr, name, reason) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);

      console.log(`⏳ Memproses Reject untuk ${name}...`);
      // Memanggil fungsi rejectDoctor baru di .sol
      const tx = await contract.rejectDoctor(targetAddr);
      await tx.wait();

      // Sinkronisasi ke Database (Menyimpan alasan penolakan)
      const res = await fetch("http://127.0.0.1:5000/admin/verify/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: targetAddr, reason: reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal update database");

      alert(`❌ Pendaftaran dr. ${name} telah ditolak.`);
      fetchAdminStats(); // Refresh tampilan otomatis
    } catch (error) {
      alert("Gagal Reject: " + (error.data?.message || error.message));
    }
  };

  if (authLoading || isLoading) return <div className="loading">Memuat Data Blockchain...</div>;

  return (
    <div className="admin-layout">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        notifications={{ pendingVerifCount: adminData.stats.pending_verif }} 
      />
      
      <main className="admin-main">
        {activeTab === 'dashboard' && (
          <BerandaAdmin 
            stats={adminData.stats} 
            pendingList={adminData.pending_registrations}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
        
        {activeTab === 'verifikasi' && (
          <VerifikasiAkun 
            pendingList={adminData.pending_registrations}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
        {activeTab === 'pengguna' && (
          <KelolaPengguna />
        )}
        {activeTab === 'profil' && (
          <ProfilSaya />
        )}
      </main>

      <style jsx>{`
        .admin-layout { display: flex; background: #fcfcfc; min-height: 100vh; }
        .admin-main { margin-left: 260px; flex: 1; padding: 30px 40px; }
        .loading { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: 600; color: #2e7d32; }
      `}</style>
    </div>
  );
}