import { useAuth } from '../../context/AuthContext';
import { CONTRACT_ADDRESS, HEALTH_RECORD_ABI } from '../../api/contract_abi';
import { ethers } from 'ethers';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';


export default function DoctorDashboard() {
    const { address, role, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('request');
    const [patientAddr, setPatientAddr] = useState('');
    const [medicalData, setMedicalData] = useState('');
    const [txLoading, setTxLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedRecordIndex, setSelectedRecordIndex] = useState(null); 
    const [patients, setPatients] = useState([]); 
    const router = useRouter();

    
    const fetchMedicalHistory = useCallback(async () => {
        if (!address || role !== 'doctor') return; 

        try {
            const response = await fetch(`http://127.0.0.1:5000/medical/list?doctor=${address}&t=${Date.now()}`);
            const data = await response.json();

            if (response.ok && data.history) {
                setPatients(data.history);
            }
        } catch (error) {
            console.error("Gagal menarik data:", error);
        }
    }, [address, role]); 

    useEffect(() => {
        if (!loading) {
            if (role === 'doctor' && address) {
                fetchMedicalHistory();
            } else if (role !== 'doctor') {
                router.push('/');
            }
        }
    }, [loading, address, role, fetchMedicalHistory, router]);

    // ===========================
    // 3. Persiapkan edit rekam medis
    // ===========================
    const prepareEdit = (p, originalIndex) => {
        setPatientAddr(p.address);
        setMedicalData(p.diagnosis);
        setSelectedRecordIndex(originalIndex); 
        setIsEditMode(true);
        setActiveTab('input'); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ===========================
    // 4. Nonaktifkan rekam medis di blockchain
    // ===========================
    const handleDeleteMedical = async (patientAddress, index, cid) => {
        if (!window.confirm("Hapus data ini?")) return;
        setTxLoading(true);

        try {
            // 1. Hapus di AI menggunakan CID (Anti-Tukar)
            const resAI = await fetch(`http://127.0.0.1:5000/medical/delete-by-cid?cid=${cid}&patient=${patientAddress}`, {
                method: "DELETE"
            });

            // 2. Hapus di Blockchain menggunakan Index
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);

            const tx = await contract.deactivateMedicalRecord(patientAddress, index);
            await tx.wait(); // Tunggu sampai benar-benar masuk blok

            alert("Berhasil dihapus di Blockchain dan AI!");
            fetchMedicalHistory();
        } catch (error) {
            alert("Gagal menghapus: " + error.message);
        } finally {
            setTxLoading(false);
        }
    };

    const handleRequestAccess = async (e) => {
        e.preventDefault();
        setTxLoading(true);
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);
            const tx = await contract.requestAccess(patientAddr);
            await tx.wait();
            alert("Permintaan akses berhasil dikirim!");
        } catch (error) { 
            console.error(error);
            alert("Gagal meminta akses."); 
        } finally { setTxLoading(false); }
    };

   
    const handleSaveMedicalData = async (e) => {
        e.preventDefault();
        setTxLoading(true);
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);
            const patientChecksum = ethers.utils.getAddress(patientAddr.toLowerCase().trim());

            let currentCid = "";

            if (isEditMode) {
                // JIKA MODE EDIT: Panggil API Update
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
                // JIKA DATA BARU: Ambil index dari blockchain
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

            // Tanda tangan ke Blockchain (Sertifikat bukti sah)
            const tx = isEditMode 
                ? await contract.updateMedicalRecord(patientChecksum, selectedRecordIndex, currentCid)
                : await contract.storeMedicalRecord(patientChecksum, currentCid);
            
            await tx.wait();

            alert(`Diagnosa Berhasil ${isEditMode ? 'Diperbarui' : 'Disimpan'}!`);
            setMedicalData('');
            setIsEditMode(false);
            fetchMedicalHistory();
        } catch (error) {
            alert("Gagal menyimpan: " + error.message);
        } finally {
            setTxLoading(false);
        }
    };
    if (loading) return <p>Memverifikasi...</p>;

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h1>Dashboard Dokter Medis</h1>
            
            <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                <p>Wallet Dokter: <code>{address}</code></p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => setActiveTab('request')} style={{ background: activeTab === 'request' ? '#0070f3' : '#ccc', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Minta Akses</button>
                <button onClick={() => {setActiveTab('input'); setIsEditMode(false); setMedicalData('');}} style={{ background: activeTab === 'input' ? '#dc3545' : '#ccc', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Input Diagnosa</button>
                <button onClick={() => setActiveTab('list')} style={{ background: activeTab === 'list' ? '#28a745' : '#ccc', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Daftar Pasien</button>
            </div>

            {activeTab === 'request' && (
                <form onSubmit={handleRequestAccess} style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <h3>Minta Izin Akses Pasien</h3>
                    <input type="text" value={patientAddr} onChange={(e) => setPatientAddr(e.target.value)} placeholder="0x... (Alamat Wallet Pasien)" style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} required />
                    <button type="submit" disabled={txLoading} style={{ width: '100%', padding: '10px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px' }}>
                        {txLoading ? "Memproses..." : "Kirim Request"}
                    </button>
                </form>
            )}

            {activeTab === 'input' && (
                <form onSubmit={handleSaveMedicalData} style={{ padding: '20px', border: '2px solid #dc3545', borderRadius: '8px' }}>
                    <h3>Input Diagnosa Baru (Bebas)</h3>
                    <input 
                        type="text" 
                        value={patientAddr} 
                        onChange={(e) => setPatientAddr(e.target.value)} 
                        placeholder="Alamat Wallet Pasien (0x...)" 
                        style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ddd' }} 
                        required 
                    />
                    
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Tuliskan diagnosa atau keluhan pasien secara mendetail:</p>
                    <textarea 
                        value={medicalData}
                        onChange={(e) => setMedicalData(e.target.value)}
                        placeholder="Contoh: Pasien mengeluh pusing di bagian belakang kepala dan memiliki riwayat kencing manis selama 2 tahun..."
                        style={{ 
                            width: '100%', 
                            height: '150px', 
                            padding: '12px', 
                            marginBottom: '15px', 
                            borderRadius: '5px', 
                            border: '1px solid #ddd',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                        }}
                        required
                    />

                    <button type="submit" disabled={txLoading} style={{ width: '100%', padding: '10px', background: isEditMode ? '#ffc107' : '#dc3545', color: 'white', border: 'none', borderRadius: '5px' }}>
                        {txLoading ? "Menyimpan..." : (isEditMode ? "Perbarui Data" : "Simpan ke Smart Contract")}
                    </button>
                </form>
            )}

            {activeTab === 'list' && (
                <div style={{ padding: '20px', border: '1px solid #28a745', borderRadius: '8px' }}>
                <h3>Riwayat Diagnosa Anda</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Pasien</th>
                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Diagnosa</th>
                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Waktu</th>
                    <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                {patients.length > 0 ? patients.map((p) => (
                    p.medicalRecords && p.medicalRecords.length > 0 ? (
                        p.medicalRecords
                            .map((rec, i) => ({ ...rec, originalIndex: i })) 
                            .filter(r => r.isActive)
                            .map((rec, idx) => (
                                <tr key={`${p.address}-${idx}`}>
                                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{p.address.substring(0, 10)}...</td>
                                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{rec.diagnosis}</td>
                                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{new Date(rec.timestamp * 1000).toLocaleString()}</td>
                                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', gap: '5px' }}>
                                        {/* TOMBOL EDIT - Memanggil prepareEdit */}
                                        <button 
                                            onClick={() => prepareEdit(p, rec.originalIndex)}
                                            style={{ background: '#ffc107', color: 'black', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
                                        >
                                            Edit
                                        </button>
                                        {/* TOMBOL NONAKTIFKAN */}
                                        <button 
                                            onClick={() => handleDeleteMedical(p.address, rec.index, rec.cid)}
                                            style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
                                        >
                                            Nonaktifkan
                                        </button>
                                    </td>
                                </tr>
                            ))
                    ) : null
                )) : (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Belum ada data.</td></tr>
                )}
            </tbody>
                </table>
            </div>
            )}
        </div>
    );
}