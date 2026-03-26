    import React, { useState, useEffect, useCallback } from 'react';
    import Sidebar from '../../components/Sidebar';
    import { useAuth } from '../../context/AuthContext';
    import { CONTRACT_ADDRESS, HEALTH_RECORD_ABI } from '../../api/contract_abi';
    import { ethers } from 'ethers';
    import BerandaDokter from './BerandaDokter'; 
    import RequestAccess from './RequestAccess';
    import PasienSaya from './PasienSaya';
    import NotifikasiDokter from './NotifikasiDokter';
    import InputDataMedis from './InputDataMedis';
    import RiwayatInput from './RiwayatInput';
    import ProfilSaya from '../../components/ProfilSaya';

    const DoctorDashboard = () => {
      const { address, userName, role, loading } = useAuth();
      const [activeTab, setActiveTab] = useState('dashboard');
      const [patientAddr, setPatientAddr] = useState(''); 
      const [txLoading, setTxLoading] = useState(false);
      const [notifs, setNotifs] = useState([]); 
      const [medicalData, setMedicalData] = useState('');
      const [isEditMode, setIsEditMode] = useState(false);
      const [selectedRecordIndex, setSelectedRecordIndex] = useState(null);
      
      // State Data Real
      const [patientsHistory, setPatientsHistory] = useState([]); // Riwayat dari Flask
      const [approvedDocs, setApprovedDocs] = useState([]); // Pasien Aktif
      const [pendingDocs, setPendingDocs] = useState([]); // Request Menunggu

      const fetchNotifications = useCallback(async () => {
        if (!address) return;
        try {
          const res = await fetch(`http://localhost:5000/notifications?address=${address}`);
          const data = await res.json();
          setNotifs(data); 
        } catch (e) {
          console.error("Gagal ambil notif untuk badge:", e);
        }
      }, [address]);
      const prepareEdit = (record) => {
          setPatientAddr(record.patientAddress);
          setMedicalData(record.diagnosis);
          setSelectedRecordIndex(record.originalIndex); 
          setIsEditMode(true);
          setActiveTab('input'); // Pindah ke tab input otomatis
          window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      const handleDeleteMedical = async (patientAddress, index, cid) => {
        if (!window.confirm("Apakah Anda yakin ingin menonaktifkan data medis ini?")) return;
        setTxLoading(true);

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);

            console.log("📡 Mengirim transaksi ke Blockchain untuk index:", index);
            const tx = await contract.deactivateMedicalRecord(
                ethers.utils.getAddress(patientAddress), 
                index
            );
            
            alert("Sedang memproses di Blockchain... Mohon tunggu.");
            await tx.wait(); 

            const cleanAddr = patientAddress.toLowerCase();
            const url = `http://127.0.0.1:5000/medical/delete-by-cid?cid=${cid}&patient=${cleanAddr}`;
            
            console.log("📡 Menghapus di AI lewat URL:", url);
            
            const resAI = await fetch(url, { method: "DELETE" });
            const resultAI = await resAI.json();

            if (resAI.ok) {
                alert("Berhasil! Data dinonaktifkan di Blockchain & AI.");
            } else {
                // Jika 404, tetap beri tahu sukses di blockchain tapi AI gagal
                alert(`Blockchain Sukses, tapi AI: ${resultAI.error || 'Data tidak ditemukan'}`);
            }

            fetchMedicalHistory(); 
            
        } catch (error) {
            console.error("🔥 Error Detail:", error);
            const msg = error.data?.message || error.message;
            alert("Gagal memproses: " + msg);
        } finally {
            setTxLoading(false);
        }
    };

      {activeTab === 'riwayat' && (
          <RiwayatInput 
              patientsHistory={patientsHistory} 
              onEdit={prepareEdit} 
              onDelete={handleDeleteMedical}
              txLoading={txLoading}
          />
      )}
      const handleSaveMedicalData = async (e) => {
          e.preventDefault();
          if (!patientAddr) return alert("Pilih pasien terlebih dahulu!");
          
          setTxLoading(true);
          try {
              const provider = new ethers.providers.Web3Provider(window.ethereum);
              const signer = provider.getSigner();
              const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);
              const patientChecksum = ethers.utils.getAddress(patientAddr.toLowerCase().trim());

              let currentCid = "";

              if (isEditMode) {
                  // MODE EDIT
                  const res = await fetch(`http://127.0.0.1:5000/medical/update`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                          diagnosis: medicalData,
                          patient_address: patientAddr,
                          index: selectedRecordIndex
                      })
                  });
                  const result = await res.json();
                  currentCid = result.ipfs_cid;
              } else {
                  // DATA BARU
                  const records = await contract.getMedicalRecords(patientChecksum);
                  const nextIndex = records.length;

                  const res = await fetch(`http://127.0.0.1:5000/medical/store`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                          diagnosis: medicalData,
                          patient_address: patientAddr,
                          blockchain_index: nextIndex
                      })
                  });
                  const result = await res.json();
                  currentCid = result.ipfs_cid;
              }

              // Simpan ke Blockchain
              const tx = isEditMode 
                  ? await contract.updateMedicalRecord(patientChecksum, selectedRecordIndex, currentCid)
                  : await contract.storeMedicalRecord(patientChecksum, currentCid);
              
              await tx.wait();

              // Notifikasi ke Pasien
              const ringkasan = medicalData.substring(0, 30) + "...";
              await fetch('http://127.0.0.1:5000/notifications/add', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      address: patientAddr,
                      pesan: `dr. ${userName || 'Dokter'} ${isEditMode ? 'memperbarui' : 'menambahkan'} diagnosa: "${ringkasan}"`
                  })
              });

              alert(`Diagnosa Berhasil ${isEditMode ? 'Diperbarui' : 'Disimpan'}!`);
              setMedicalData('');
              setPatientAddr('');
              setIsEditMode(false);
              fetchMedicalHistory(); // Refresh data
              setActiveTab('dashboard'); // Pindah ke dashboard setelah selesai
          } catch (error) {
              alert("Gagal menyimpan: " + error.message);
          } finally {
              setTxLoading(false);
          }
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
                setNotifs(prevNotifs => 
                    prevNotifs.map(n => ({ ...n, is_read: 1 }))
                );

            } catch (err) {
                console.error("Gagal update status baca:", err);
            }
        }
    };
      const handleRequestAccess = async (e) => {
          if (e) e.preventDefault(); // Mencegah reload halaman
          
          if (!ethers.utils.isAddress(patientAddr)) {
              return alert("Alamat wallet pasien tidak valid!");
          }

          setTxLoading(true);
          try {
              const provider = new ethers.providers.Web3Provider(window.ethereum);
              const signer = provider.getSigner();
              const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);

              // Manggil fungsi requestAccess di Smart Contract
              const tx = await contract.requestAccess(patientAddr);
              
              console.log("Transaksi dikirim:", tx.hash);
              await tx.wait(); // Tunggu sampai transaksi sukses di Blockchain

              alert("Permintaan akses berhasil dikirim ke Pasien!");
              setPatientAddr(''); // Kosongkan input setelah sukses
              
              // Refresh data agar muncul di tabel riwayat request bawah
              loadPatientStatus(); 
              
          } catch (error) {
              console.error("Gagal request akses:", error);
              // Error handling agar pesan lebih jelas
              const errorMessage = error.data?.message || error.message;
              alert("Gagal mengirim permintaan: " + errorMessage);
          } finally {
              setTxLoading(false);
          }
      };

      // ==========================================
      // 1. LOAD STATUS AKSES (BLOCKCHAIN + SQL)
      // ==========================================
    const loadPatientStatus = useCallback(async () => {
    console.log("🔍 [DEBUG] loadPatientStatus dijalankan...");

    if (!window.ethereum || !address || role !== 'doctor') return;

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, provider);
      
      // 1. AMBIL DAFTAR PASIEN (Bukan daftar dokter)
      console.log("📡 [DEBUG] Memanggil API Pasien: http://127.0.0.1:5000/auth/patients");
      const res = await fetch("http://127.0.0.1:5000/auth/patients"); 
      const data = await res.json();
      const allPatients = data.patients || []; 

      console.log(`📊 [DEBUG] Ditemukan ${allPatients.length} Pasien Terdaftar di Blockchain.`);

      let pending = [];
      let approved = [];

      // 2. LOOP DAFTAR PASIEN
      for (let patient of allPatients) {
        try {
          const pAddr = patient.address;
          if (!ethers.utils.isAddress(pAddr)) continue;

          const pChecksum = ethers.utils.getAddress(pAddr);
          
          // 3. CEK HUBUNGAN: Apakah dokter ini punya akses ke pasien ini?
          const isAuth = await contract.checkAccess(pChecksum, address);
          const isPending = await contract.pendingRequests(pChecksum, address);

          console.log(`🧐 [DEBUG] Memeriksa: ${patient.name} (${pChecksum.substring(0, 6)}...)`);
          console.log(`    > Status: Approved=${isAuth}, Pending=${isPending}`);

          const tanggalHariIni = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });

          const mappedData = {
            name: patient.name || "Pasien",
            address: pChecksum,
            date: isAuth ? `${tanggalHariIni}` : tanggalHariIni,
            status: isAuth ? 'Aktif' : 'Menunggu'
          };

          if (isAuth) {
            approved.push(mappedData);
          } else if (isPending) {
            pending.push(mappedData);
          }
        } catch (err) { continue; }
      }

      console.log("[DEBUG] Hasil Akhir Mapping Dokter:", { approved: approved.length, pending: pending.length });
      
      setApprovedDocs(approved);
      setPendingDocs(pending);

    } catch (error) {
      console.error(" [DEBUG] Gagal load status:", error);
    }
  }, [address, role]);

      // ==========================================
      // 2. FETCH RIWAYAT INPUT (FLASK)
      // ==========================================
      const fetchMedicalHistory = useCallback(async () => {
        if (!address) return;
        try {
          const response = await fetch(`http://127.0.0.1:5000/medical/list?doctor=${address}&t=${Date.now()}`);
          const data = await response.json();
          if (response.ok && data.history) {
            setPatientsHistory(data.history);
          }
        } catch (error) {
          console.error("Gagal fetch riwayat:", error);
        }
      }, [address]);

      useEffect(() => {
        if (!loading && address && role === 'doctor') {
          loadPatientStatus();
          fetchMedicalHistory();
          fetchNotifications();
        }
      }, [loading, address, role, loadPatientStatus, fetchMedicalHistory]);

      // ==========================================
      // 3. LOGIKA PENGOLAHAN DATA UNTUK BERANDA
      // ==========================================
      
      // A. Hitung Total Semua Inputan (Bukan cuma jumlah pasien)
      const totalSemuaInputan = patientsHistory.reduce((acc, p) => {
        const activeCount = p.medicalRecords ? p.medicalRecords.filter(r => r.isActive).length : 0;
        return acc + activeCount;
      }, 0);

      // B. Bongkar data (Flatten) agar semua riwayat muncul di list bawah
      const allFormattedInputs = patientsHistory.flatMap(p => 
        (p.medicalRecords || [])
          .filter(r => r.isActive)
          .map(r => ({
            patientName: p.name || `${p.address.substring(0, 6)}...`,
            // Perbaikan Timestamp: dikali 1000 agar jadi milidetik
            date: new Date(r.timestamp * 1000).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric'
            }),
            diagnosis: r.diagnosis,
            tags: [r.diagnosis.substring(0, 15) + "..."],
            rawTimestamp: r.timestamp
          }))
      ).sort((a, b) => b.rawTimestamp - a.rawTimestamp); // Urutkan terbaru di atas

      return (
        <div className="doctor-layout">
          {/* Sidebar Maria yang sudah Paten */}
          <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} notifications={{ notifCount: notifs.filter(n => !n.is_read).length }}/>

          <main className="main-content">
          {activeTab === 'dashboard' && (
          <BerandaDokter 
            stats={{
              active: approvedDocs.length,
              pending: pendingDocs.length,
              totalInput: totalSemuaInputan,
              rejected: 0 
            }}
            // Kolom Kiri: Pasien Aktif
            activePatients={approvedDocs.slice(0, 5)}
            
            // KOLOM KANAN: Status Request (Kita gabungkan Pending + Approved)
            recentRequests={[
              ...pendingDocs.map(r => ({ ...r, status: "Menunggu" })),
              ...approvedDocs.map(a => ({ ...a, status: "Aktif" })),
            ].slice(0, 5)} // Ambil 5 yang terbaru
            
            recentInputs={allFormattedInputs.slice(0, 5)} 
            changeTab={setActiveTab}
          />
        )}
            {activeTab === 'request' && (
              <RequestAccess 
                patientAddr={patientAddr}
                setPatientAddr={setPatientAddr}
                handleRequest={handleRequestAccess}
                txLoading={txLoading}
                pendingRequests={pendingDocs} 
                approvedDocs={approvedDocs}
              />
            )}

            {/* Tab Tambah Data Medis */}
            {activeTab === 'input' && (
                <InputDataMedis 
                    approvedPatients={approvedDocs} // Kirim daftar pasien yang Approved
                    patientAddr={patientAddr}
                    setPatientAddr={setPatientAddr}
                    medicalData={medicalData}
                    setMedicalData={setMedicalData}
                    handleSave={handleSaveMedicalData}
                    txLoading={txLoading}
                    isEditMode={isEditMode}
                />
            )}

            {/* Tab Pasien Saya */}
            {activeTab === 'list' && (
                <PasienSaya 
                    changeTab={setActiveTab} 
                />
            )}

            {/* Tab Notifikasi */}
            {activeTab === 'notifikasi' && (
              <div className="menu-wrapper">
                <NotifikasiDokter address={address} />
              </div>
            )}
            {activeTab === 'riwayat' && (
                <RiwayatInput 
                    patientsHistory={patientsHistory} 
                    onEdit={prepareEdit} 
                    onDelete={handleDeleteMedical}
                    txLoading={txLoading}
                />
            )}
            {activeTab === 'profil' && (
                <ProfilSaya />
            )}
          </main>

          <style jsx>{`
            .doctor-layout { 
              display: flex; 
              min-height: 100vh; 
              background: #fcfcfc; 
              font-family: 'Inter', sans-serif;
            }
            .main-content { 
              flex: 1; 
              margin-left: 260px; 
              padding: 40px; 
              background: transparent;
            }
            .card-white { 
              background: white; 
              padding: 30px; 
              border-radius: 24px; 
              border: 1px solid #eee;
              box-shadow: 0 4px 12px rgba(0,0,0,0.02);
            }
            .tab-title { font-size: 20px; font-weight: 700; color: #333; margin-bottom: 8px; }
            .tab-subtitle { font-size: 14px; color: #888; margin-bottom: 25px; }
          `}</style>
        </div>
      );
    };

    export default DoctorDashboard;