import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CONTRACT_ADDRESS, HEALTH_RECORD_ABI } from '../../api/contract_abi';
import { ethers } from 'ethers';

const formatSimpleDate = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
};

const PasienSaya = ({ changeTab }) => {
    const { address, role } = useAuth();
    const [loading, setLoading] = useState(true);
    const [realPatients, setRealPatients] = useState([]); 
    const [searchTerm, setSearchTerm] = useState("");

    // ==========================================
    // FUNGSI LOAD DATA REAL (GABUNGAN SQL + BC + IPFS)
    // ==========================================
    const loadRealPatientsData = async () => {
        console.log("🔍 [DEBUG] Memulai loadRealPatientsData...");
        
        if (!window.ethereum || !address || role !== 'doctor') return;

        setLoading(true);

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner(); 
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer); 
            
            console.log("📡 [DEBUG] Fetching daftar pasien dari Flask...");
            const resPatients = await fetch("http://127.0.0.1:5000/auth/patients"); 
            const dataPatients = await resPatients.json();
            const allRegisteredPatients = dataPatients.patients || []; 

            let activeList = [];

            for (let patient of allRegisteredPatients) {
                try {
                    const pChecksum = ethers.utils.getAddress(patient.address);
                    const docChecksum = ethers.utils.getAddress(address);

                    const isApproved = await contract.checkAccess(pChecksum, docChecksum);

                    if (isApproved) {
    const records = await contract.getMedicalRecords(pChecksum);
    let allDiagnosisTags = [];

    if (records && records.length > 0) {
        for (let rec of records) {
            const rawIsActive = rec.isActive !== undefined ? rec.isActive : rec[3];
            
            const isActive = rawIsActive === true || rawIsActive === 1 || rawIsActive === "true";

            console.log(`📋 [DEBUG] Record CID=${rec.cid?.substring(0,12)}... | rawIsActive=${rawIsActive} | type=${typeof rawIsActive} | isActive=${isActive}`);

            if (!isActive) {
                console.log(`🚫 [DEBUG] Skip record NONAKTIF: CID=${rec.cid?.substring(0,12)}...`);
                continue;
            }

            try {
                const resDiag = await fetch(
                    `http://127.0.0.1:5000/medical/get-content?cid=${rec.cid}&patient=${pChecksum}`
                );
                if (resDiag.ok) {
                    const diagData = await resDiag.json();
                    const cleanDiag = diagData.diagnosis || "";
                    console.log(`✅ [DEBUG] Diagnosa aktif: "${cleanDiag}"`);
                    if (cleanDiag) allDiagnosisTags.push(cleanDiag.trim());
                }
            } catch (err) {
                console.error("Gagal tarik konten IPFS:", rec.cid);
            }
        }
    }

    if (allDiagnosisTags.length === 0) allDiagnosisTags = ["Belum ada diagnosa"];

    activeList.push({
        name: patient.name || "Pasien",
        address: pChecksum,
        initials: (patient.name || "P").substring(0, 2).toUpperCase(),
        tags: allDiagnosisTags
    });
}

                } catch (err) {
                    console.error(`❌ [DEBUG] Error pada pasien ${patient.address}:`, err);
                    continue;
                }
            }

            console.log("🏁 [DEBUG] Hasil Akhir:", activeList);
            setRealPatients(activeList);
        } catch (error) {
            console.error("🔥 [DEBUG] Error Fatal:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRealPatientsData();
    }, [address, role]);

    const filteredPatients = realPatients.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ==========================================
    // RENDER TAMPILAN SESUAI GAMBAR MARIA
    // ==========================================
    return (
        <div className="pasien-saya-container">
            {/* Header Halaman */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Pasien Saya</h1>
                    <p className="page-subtitle">Daftar pasien terverifikasi yang memberikan izin akses rekam medis kepada Anda.</p>
                </div>
                <button className="btn-request-baru" onClick={() => changeTab('request')}>
                    <Plus size={18} />
                    <span>Request Akses Baru</span>
                </button>
            </div>

            {/* Kotak Putih Utama (card-white) */}
            <div className="card-white full-width">
                <div className="card-inner-header">
                    <h3>Pasien dengan akses aktif</h3>
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Cari nama atau wallet..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="patient-list">
                    {loading ? (
                        <p className="loading-text">Sedang memverifikasi Blockchain...</p>
                    ) : filteredPatients.length === 0 ? (
                        <p className="empty-text">Belum ada pasien terverifikasi yang memberikan akses.</p>
                    ) : (
                        filteredPatients.map((p, idx) => (
                            <div key={idx} className="patient-item-row">
                                {/* KOLOM KIRI: Avatar + Info */}
                                <div className="patient-main-info">
                                    <div className="avatar">{p.initials}</div>
                                    <div className="info-text">
                                        <p className="patient-name">{p.name}</p>
                                        <p className="patient-wallet">{p.address.substring(0, 10)}...{p.address.substring(38)}</p>
                                        <div className="tag-container">
                                            {p.tags.map((tag, tIdx) => (
                                                <span key={tIdx} className={`tag ${tag === "Belum ada diagnosa" ? "empty-tag" : ""}`}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* KOLOM KANAN: Tombol Tindakan */}
                                <div className="action-buttons-container">
                                    <button className="btn-action-outline input" onClick={() => changeTab('input')}>
                                        <Plus size={14} />
                                        <span>Input Data</span>
                                    </button>
                                    <button className="btn-action-outline riwayat" onClick={() => changeTab('riwayat')}>
                                        <FileText size={14} />
                                        <span>Lihat Riwayat</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <style jsx>{`
                .pasien-saya-container { padding-top: 10px; font-family: 'Inter', sans-serif; }
                .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
                .page-title { font-size: 24px; font-weight: 700; color: #333; margin: 0; }
                .page-subtitle { font-size: 14px; color: #777; margin: 5px 0 0 0; }
                .btn-request-baru { display: flex; align-items: center; gap: 10px; background: white; border: 1.5px solid #ddd; padding: 12px 20px; border-radius: 14px; font-weight: 600; cursor: pointer; color: #333; }
                
                .card-white { background: white; padding: 30px; border-radius: 24px; border: 1px solid #eee; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
                .full-width { width: 100%; }
                .card-inner-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #fafafa; padding-bottom: 15px; }
                .card-inner-header h3 { font-size: 16px; font-weight: 700; margin: 0; color: #444; }
                .search-box { display: flex; align-items: center; gap: 8px; border: 1px solid #eee; padding: 8px 15px; border-radius: 10px; background: #fcfcfc; }
                .search-box input { border: none; background: transparent; font-size: 13px; color: #333; }
                
                .patient-item-row { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid #fcfcfc; }
                .patient-item-row:last-child { border-bottom: none; }
                .patient-main-info { display: flex; align-items: center; gap: 18px; }
                .avatar { width: 48px; height: 48px; background: #e3f2fd; color: #1565c0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
                .info-text { flex: 1; }
                .patient-name { font-size: 16px; font-weight: 700; color: #333; margin: 0 0 4px 0; }
                .patient-wallet { font-size: 11px; color: #999; font-family: monospace; margin: 0 0 10px 0; }
                
                .tag-container { display: flex; gap: 8px; flex-wrap: wrap; }
                .tag { font-size: 11px; font-weight: 600; color: #666; background: #f5f5f5; padding: 5px 12px; border-radius: 8px; }
                .empty-tag { font-style: italic; color: #aaa; background: #fafafa; }

                .action-buttons-container { display: flex; flex-direction: column; gap: 8px; }
                .btn-action-outline { display: flex; align-items: center; justify-content: center; gap: 6px; background: white; border: 1px solid #ddd; padding: 10px 20px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; color: #555; width: 140px; }
                .btn-action-outline.input { background: #e8f5e9; border: none; color: #2e7d32; }
                .btn-action-outline:hover { background: #fafafa; border-color: #ccc; }
                
                .loading-text, .empty-text { text-align: center; color: #bbb; padding: 40px 0; font-style: italic; }
            `}</style>
        </div>
    );
};

export default PasienSaya;