import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Beranda from './menus/BerandaPasien';
import MintaRekomendasi from './menus/MintaRekomendasi';
import RiwayatMedis from './menus/RiwayatMedis';
import AksesDokter from './menus/AksesDokter';
import RiwayatRekomendasi from './menus/RiwayatRekomendasi';
import NotifikasiPasien from './menus/NotifikasiPasien';
import ProfilSaya from '../../components/ProfilSaya';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import { CONTRACT_ADDRESS, HEALTH_RECORD_ABI } from '../../api/contract_abi';
import { ethers } from 'ethers';

export default function PatientDashboard() {
  const { address, role, status, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('beranda');
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [approvedDocs, setApprovedDocs] = useState([]);
  const [rekomendasiCount, setRekomendasiCount] = useState(0);
  const [keluhan, setKeluhan] = useState('');
  const [rekomendasi, setRekomendasi] = useState(null);
  const [isRecommending, setIsRecommending] = useState(false);
  const [useRag, setUseRag] = useState(true); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [notifs, setNotifs] = useState([]); 

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (role !== 'patient') {
      router.replace('/login');
      return;
    }
  }, [loading, isAuthenticated, role, status, router]);

 const loadRekomendasiCount = async () => {
    if (!address || address === "null") {
        console.log("wallet belum terdeteksi...");
        return; 
    }

    try {
        const res = await fetch(`http://localhost:5000/herbal/history-count?address=${address}`);
        
        if (!res.ok) {
            console.error("Server Flask bermasalah atau endpoint tidak ditemukan");
            return;
        }

        const data = await res.json();
        setRekomendasiCount(data.count);
    } catch (err) {
        console.error("Gagal ambil history count:", err);
    }
};
  const loadRequests = async () => {
    if (!window.ethereum || !address || role !== 'patient') return;
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, provider.getSigner());
      const patientChecksum = ethers.utils.getAddress(address.toLowerCase());

      const records = await contract.getMedicalRecords(patientChecksum);
      
const formattedRecords = await Promise.all(records.map(async (r, index) => {
    const isActuallyActive = r.isActive !== undefined ? r.isActive : r[3];

    console.log(`📡 [DEBUG PASIEN] Data Index ${index}:`, {
        diagnosis: r.diagnosis,
        isActiveRaw: isActuallyActive,
        type: typeof isActuallyActive
    });

    try {
        const res = await fetch(`http://localhost:5000/medical/get-content?cid=${r.cid}&patient=${address}`);
        if (!res.ok) return null;
        
        const textData = await res.text();
        let diagnosisText;
        try {
            const json = JSON.parse(textData);
            diagnosisText = json.diagnosis || textData;
        } catch {
            diagnosisText = textData;
        }

        return {
            cid: r.cid,
            doctor: r.doctor || r[2],
            timestamp: r.timestamp.toNumber ? r.timestamp.toNumber() : r.timestamp,
            diagnosis: diagnosisText,
            isActive: isActuallyActive 
        };
    } catch (err) { return null; }
}));

     const finalData = formattedRecords
    .filter(r => 
        r !== null && 
        (r.isActive === true || r.isActive === 1) 
    )
    .sort((a, b) => b.timestamp - a.timestamp);
    console.log("📊 [DEBUG PASIEN] TOTAL DATA DARI BLOCKCHAIN:", formattedRecords.length);
console.log("🎯 [DEBUG PASIEN] TOTAL DATA LOLOS FILTER (AKTIF):", finalData.length);
console.log("📋 [DEBUG PASIEN] ISI DATA YANG AKAN TAMPIL:", finalData);

setMedicalRecords(finalData);

      const resDocs = await fetch("http://127.0.0.1:5000/auth/doctors");
      const dataDocs = await resDocs.json();
      const allDoctors = dataDocs.doctors || [];

      let pending = [];
      let approved = [];

      for (let docObj of allDoctors) { 
        try {
          const rawAddr = typeof docObj === 'object' ? docObj.address : docObj;
          const docChecksum = ethers.utils.getAddress(rawAddr);
          
          const isAuth = await contract.checkAccess(patientChecksum, docChecksum);
          const isPending = await contract.pendingRequests(patientChecksum, docChecksum);
          
          const docName = docObj.name || "Dokter";

          if (isAuth) {
            approved.push({ name: docName, address: docChecksum });
          } else if (isPending) {
            pending.push({ name: docName, address: docChecksum });
          }
        } catch (err) { 
          console.error("Error pada dokter:", docObj, err); 
        }
      }

      setApprovedDocs(approved);
      setPendingDocs(pending);

    } catch (error) {
      console.error("Gagal load data:", error);
    }
  };
    const handleRevoke = async (docAddr) => {
        setIsProcessing(true);
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);
            
            const tx = await contract.revokeAccess(ethers.utils.getAddress(docAddr.toLowerCase()));
            await tx.wait();
            await fetch("http://127.0.0.1:5000/notifications/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    address: docAddr.toLowerCase(), // Target DOKTER
                    pesan: `Akses Dicabut: Pasien ${address.substring(0, 6)}... telah mencabut izin akses Anda.`
                })
            });
            alert("Izin dokter telah dicabut!");
            await loadRequests(); // Refresh data
        } catch (error) { console.error(error); }
        finally { setIsProcessing(false); }
    };

    const handleOpenNotifications = async () => {
    setActiveTab('notifikasi');
    
    try {
      await fetch('http://localhost:5000/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address })
      });
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };
  const handleGetAIRecommendation = async () => {
    if (!keluhan) return alert("Silakan isi keluhan Anda.");
    setRekomendasi(null);
    setIsRecommending(true);

    try {
        const kondisiMedis = medicalRecords.map(r => r.diagnosis).join(', ');

        const response = await fetch(
            `http://localhost:5000/herbal/recommendation-input?q=${keluhan}&medical=${kondisiMedis}&use_rag=${useRag}&address=${address}`
        );
        const data = await response.json();
        
        setRekomendasi(data);
        
        loadRekomendasiCount(); 
        
    } catch (error) {
        console.error("Gagal ambil rekomendasi:", error);
        alert("Gagal terhubung ke Server Flask.");
    } finally {
        setIsRecommending(false);
    }
};
  const handleGrant = async (docAddr) => {
    setIsProcessing(true);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, provider.getSigner());
      const tx = await contract.grantAccess(ethers.utils.getAddress(docAddr.toLowerCase()));
      alert("Transaksi dikirim, tunggu konfirmasi...");
      await tx.wait();
      await fetch("http://127.0.0.1:5000/notifications/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                address: docAddr.toLowerCase(), 
                pesan: `✅ Akses Disetujui: Pasien ${address.substring(0, 6)}... telah memberikan Anda izin akses.`
            })
        });
      alert("Akses berhasil diberikan!");
      loadRequests(); 
    } catch (error) { console.error(error); }
    finally { setIsProcessing(false); }
  };

  const handleReject = async (docAddr) => {
    setIsProcessing(true);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, provider.getSigner());
      const tx = await contract.rejectAccess(ethers.utils.getAddress(docAddr.toLowerCase()));
      await tx.wait();
      await fetch("http://127.0.0.1:5000/notifications/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                address: docAddr.toLowerCase(), 
                pesan: `❌ Akses Ditolak: Permintaan Anda ke pasien ${address.substring(0, 6)}... ditolak.`
            })
        });
      alert("Permintaan ditolak!");
      loadRequests();
    } catch (error) { 
      console.error("Gagal menolak akses:", error);
      const errorMsg = error?.data?.message || error?.message || "Terjadi kesalahan";
      alert("Gagal menolak permintaan: " + errorMsg);
    }
    finally { setIsProcessing(false); }
  };

    const handleTabChange = async (newTab) => {
      setActiveTab(newTab);

      if (newTab === 'notifikasi') {
          try {
              await fetch('http://127.0.0.1:5000/notifications/mark-read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ address: address })
              });

              loadNotifications(); 
              
          } catch (err) {
              console.error("Gagal update status baca:", err);
          }
      }
  };
    const loadNotifications = async () => {
    if (!address) return;
    try {
      const res = await fetch(`http://127.0.0.1:5000/notifications?address=${address}`);
      if (res.ok) {
        const data = await res.json();
        setNotifs(data);
      }
    } catch (err) {
      console.error("Gagal load notifikasi:", err);
    }
  };

  useEffect(() => { 
    if (!loading && address && role === 'patient') {
      loadRequests();
      loadRekomendasiCount();
      loadNotifications();
    }
  }, [address, loading, role]);

  if (loading) return <p style={{textAlign: 'center', padding: '50px'}}>Memverifikasi Blockchain...</p>;

  return (
    <div className="layout-container">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} dokterCount={pendingDocs.length} notifications={{ notifCount: notifs.filter(n => !n.is_read).length }}/>
      <main className="main-content">
        <section className="page-body">
          {activeTab === 'beranda' && (
            <Beranda 
              medicalRecords={medicalRecords}
              pendingDocs={pendingDocs}
              approvedDocs={approvedDocs}
              changeTab={setActiveTab}
              onGrant={handleGrant}   
              onReject={handleReject}
            />
          )}
          {activeTab === 'rekomendasi' && (
            <MintaRekomendasi 
              keluhan={keluhan}
              setKeluhan={setKeluhan}
              useRag={useRag}
              setUseRag={setUseRag}
              handleGetAIRecommendation={handleGetAIRecommendation}
              isRecommending={isRecommending}
              rekomendasi={rekomendasi}
            />
          )}
          {activeTab === 'riwayat_medis' && (
            <RiwayatMedis 
              medicalRecords={medicalRecords} 
            />
          )}
          {activeTab === 'akses_dokter' && (
            <AksesDokter 
              pendingDocs={pendingDocs}
              approvedDocs={approvedDocs}
              onGrant={handleGrant}
              onReject={handleReject}
              onRevoke={handleRevoke}
              isProcessing={isProcessing}
            />
          )}
          {activeTab === 'riwayat_rekomendasi' && (
          <RiwayatRekomendasi 
            address={address} 
          />
        )}
        {activeTab === 'notifikasi' && (
          <NotifikasiPasien 
            address={address} 
          />
        )}
        {activeTab === 'profil' && (
          <ProfilSaya />
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