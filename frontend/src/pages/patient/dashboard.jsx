import { useAuth } from '../../context/AuthContext';
import { CONTRACT_ADDRESS, HEALTH_RECORD_ABI } from '../../api/contract_abi';
import { ethers } from 'ethers';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PatientDashboard() {
    const { address, role, loading } = useAuth();
    const [pendingDocs, setPendingDocs] = useState([]);
    const [approvedDocs, setApprovedDocs] = useState([]); 
    const [medicalRecords, setMedicalRecords] = useState([]); 
    const [isProcessing, setIsProcessing] = useState(false);
    const router = useRouter();
    const [keluhan, setKeluhan] = useState('');
    const [rekomendasi, setRekomendasi] = useState(null);
    const [isRecommending, setIsRecommending] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (!loading && role !== 'patient') {
            router.push('/'); 
        }
    }, [role, loading, router]);

    const fetchFromIPFS = async (cid) => {
        try {
            const response = await fetch(`http://127.0.0.1:8080/ipfs/${cid}`);
            const data = await response.json();
            return data.diagnosis || data; 
        } catch (error) {
            console.error("Gagal ambil data IPFS:", error);
            return "Gagal memuat teks diagnosa";
        }
    };

const loadRequests = async () => {
    if (!window.ethereum || !address || role !== 'patient') return;

    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);
        const patientChecksum = ethers.utils.getAddress(address.toLowerCase());

        console.log("🔄 --- SINKRONISASI DASHBOARD PASIEN ---");

        // 1. Ambil SEMUA data dari Blockchain (Sekarang mengembalikan data mentah tanpa filter)
        const records = await contract.getMedicalRecords(patientChecksum); 
        
        // 2. Proses dan Filter di sisi Frontend
        const formattedRecords = await Promise.all(records.map(async (r, index) => {
            // --- 🛡️ FILTER STATUS AKTIF ---
            // Karena Smart Contract sekarang mengirim semua, kita filter di sini:
            const isActuallyActive = r.isActive !== undefined ? r.isActive : r[3];
            
            if (isActuallyActive === false) {
                console.log(`Index ${index} adalah data non-aktif, dilewati.`);
                return null; 
            }

            try {
                // Ambil diagnosa dari Flask
                const res = await fetch(`http://localhost:5000/medical/get-content?cid=${r.cid}`);
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
                    timestamp: r.timestamp.toNumber ? r.timestamp.toNumber() : r.timestamp,
                    diagnosis: diagnosisText,
                    blockchainIndex: index // Index ini sekarang tetap konsisten!
                };
            } catch (err) {
                return null; 
            }
        }));

        // 3. Bersihkan data null dan Urutkan
        const finalData = formattedRecords
            .filter(r => r !== null)
            .sort((a, b) => b.timestamp - a.timestamp);

        setMedicalRecords(finalData);
        console.log("Tabel Pasien diperbarui dengan data aktif.");

        // --- 4. AMBIL STATUS PERIZINAN DOKTER ---
        const resDocs = await fetch("http://127.0.0.1:5000/auth/doctors");
        const dataDocs = await resDocs.json();
        const allDoctors = dataDocs.doctors || [];

        let pending = [];
        let approved = [];

        for (let docAddr of allDoctors) {
            try {
                const docChecksum = ethers.utils.getAddress(docAddr);
                const isPending = await contract.pendingRequests(patientChecksum, docChecksum);
                const isAuth = await contract.checkAccess(patientChecksum, docChecksum);
                const docProfile = await contract.doctors(docChecksum);
                const docName = docProfile.name || "Dokter Medis";

                if (isAuth) {
                    approved.push({ name: docName, address: docChecksum });
                } else if (isPending) {
                    pending.push({ name: docName, address: docChecksum });
                }
            } catch (err) {
                console.error("Gagal sinkronisasi status dokter:", docAddr, err);
            }
        }

        setPendingDocs(pending);
        setApprovedDocs(approved);
        console.log("Sinkronisasi Dashboard Selesai");

    } catch (error) {
        console.error("Error Fatal loadRequests:", error);
    }
};

    // 1. Fungsi Menolak (Reject)
    const handleReject = async (docAddr) => {
        setIsProcessing(true);
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);
            
            const tx = await contract.rejectAccess(ethers.utils.getAddress(docAddr.toLowerCase()));
            await tx.wait();
            alert("Permintaan dokter telah ditolak!");
            await loadRequests(); // Refresh data
        } catch (error) { console.error(error); }
        finally { setIsProcessing(false); }
    };

    // 2. Fungsi Mencabut Izin (Revoke)
    const handleRevoke = async (docAddr) => {
        setIsProcessing(true);
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);
            
            const tx = await contract.revokeAccess(ethers.utils.getAddress(docAddr.toLowerCase()));
            await tx.wait();
            alert("Izin dokter telah dicabut!");
            await loadRequests(); // Refresh data
        } catch (error) { console.error(error); }
        finally { setIsProcessing(false); }
    };

    const handleGetAIRecommendation = async () => {
        // 1. RESET HASIL SEBELUMNYA (Agar tidak muncul jawaban lama)
        setRekomendasi(null); 
        
        // 2. SET LOADING
        setIsRecommending(true);

        try {
            const kondisiMedis = medicalRecords.map(r => r.diagnosis).join(', ');

            const response = await fetch('http://localhost:5000/herbal/recommendation-input?q=' + keluhan + '&medical=' + kondisiMedis);
            const data = await response.json();
            
            setRekomendasi(data);
        } catch (error) {
            console.error("Gagal mengambil rekomendasi AI:", error);
            alert("Pastikan Flask Backend (app.py) sudah dijalankan!");
        } finally {
            setIsRecommending(false);
        }
    };

    const handleGrant = async (docAddr) => {
        setIsProcessing(true);
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);
            const formattedDoc = ethers.utils.getAddress(docAddr.toLowerCase());
            
            const tx = await contract.grantAccess(formattedDoc);
            alert("Menunggu konfirmasi blockchain...");
            await tx.wait(); 
            
            alert("Akses berhasil diberikan!");
            await loadRequests(); 
        } catch (error) {
            console.error("Transaksi gagal:", error);
        } finally {
            setIsProcessing(false);
        }
    };

        const handleSearchKeluhan = async (query) => {
        setKeluhan(query);
        if (query.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsSearching(true);
        try {
            // Panggil endpoint search ICD-10 yang kita buat di Flask
            const response = await fetch(`http://localhost:5000/herbal/search-icd?q=${query}`);
            const data = await response.json();
            setSuggestions(data); // Data berisi [{label: "A00 - Kolera", value: "A00"}, ...]
            setShowSuggestions(true);
        } catch (error) {
            console.error("Gagal mencari saran:", error);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
         const initLoad = async () => {
            if (!loading && address && role === 'patient') {
                console.log("Memanggil Blockchain...");
                await loadRequests();
            }
        };

        initLoad();
        // Dependency 'loading' ditambahkan agar dia menunggu AuthContext selesai cek wallet
    }, [address, role, loading]);

    if (loading) return <p style={{ padding: '40px', textAlign: 'center' }}>Memverifikasi akses blockchain...</p>;

    return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ color: '#2c3e50' }}>🌿 Dashboard Pasien</h1>
            
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #28a745', marginBottom: '30px' }}>
                <p><strong>Wallet Anda:</strong> <code>{address}</code></p>
            </div>

         {/* SEKSI 1: REQUEST MASUK */}
            <h3>🔔 Permintaan Akses</h3>
            {pendingDocs.length === 0 ? (
                <p style={{ color: '#888', fontStyle: 'italic' }}>Tidak ada permintaan tertunda.</p>
            ) : (
                pendingDocs.map((doc, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', border: '1px solid #ffeeba', padding: '15px', borderRadius: '8px', background: '#fff9e6', marginBottom: '10px' }}>
                        <p style={{margin: 0, fontWeight: 'bold'}}>{doc.name}</p>
                        <code style={{ marginBottom: '10px', display: 'block' }}>{doc.address}</code>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={() => handleGrant(doc.address)} // Kirim alamatnya saja
                                disabled={isProcessing} 
                                style={{ flex: 1, background: '#28a745', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {isProcessing ? "..." : "Setujui"}
                            </button>
                            <button 
                                onClick={() => handleReject(doc.address)} // Kirim alamatnya saja
                                disabled={isProcessing} 
                                style={{ flex: 1, background: '#dc3545', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {isProcessing ? "..." : "Tolak"}
                            </button>
                        </div>
                    </div>
                ))
            )}

            <hr style={{ margin: '40px 0' }} />

            {/* SEKSI 2: REKAM MEDIS ANDA (HASIL INPUT DOKTER) */}
            <h3 style={{ color: '#0070f3' }}>📄 Rekam Medis Anda</h3>
            {medicalRecords.length === 0 ? (
                <p style={{ color: '#888' }}>Belum ada rekam medis tersimpan.</p>
            ) : (
                <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f4f4f4' }}>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Waktu</th>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Keterangan / CID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {medicalRecords.map((rec, index) => (
                                <tr key={index}>
                                    <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '0.8rem' }}>
                                        {new Date(rec.timestamp * 1000).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                                        <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                                            {rec.diagnosis} {/* TEKS PENYAKIT MUNCUL DI SINI */}
                                        </div>
                                        <code style={{ fontSize: '0.7rem', color: '#999' }}>{rec.cid}</code>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ height: '40px' }}></div>

            {/* SEKSI 3: DOKTER AKTIF */}
            <h3 style={{ color: '#28a745', marginTop: '30px' }}>✅ Dokter Berizin</h3>
            {approvedDocs.length === 0 ? (
                <p style={{ color: '#888' }}>Belum ada dokter yang diberi izin.</p>
            ) : (
                approvedDocs.map((doc, index) => (
                    // Gunakan 'index' sebagai key agar lebih aman
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderRadius: '8px', background: '#eaffea', border: '1px solid #c3e6cb', marginBottom: '10px' }}>
                        <div>
                            {/* Tampilkan NAMA dokternya */}
                            <p style={{ margin: 0, fontWeight: 'bold', color: '#155724' }}>{doc.name || "Dokter Terverifikasi"}</p>
                            
                            {/* Tampilkan ADDRESS dokternya (Gunakan doc.address, bukan doc saja) */}
                            <code style={{ fontSize: '0.9rem' }}>{doc.address}</code>
                            
                            <span style={{ marginLeft: '10px', color: '#155724', fontWeight: 'bold', fontSize: '0.7rem', verticalAlign: 'middle' }}>● AKTIF</span>
                        </div>
                        
                        <button 
                            onClick={() => handleRevoke(doc.address)} // Gunakan doc.address di sini juga
                            disabled={isProcessing}
                            style={{ background: '#6c757d', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            {isProcessing ? "..." : "Cabut Izin"}
                        </button>
                    </div>
                ))
            )}
            {/* SEKSI BARU: AI HERBAL RECOMMENDATION */}
            <div style={{ marginTop: '40px', padding: '20px', background: '#f0fff4', borderRadius: '15px', border: '2px solid #28a745' }}>
                <h3>AI Rekomendasi Herbal (RAG + Rules)</h3>
                <p style={{ fontSize: '0.9rem' }}>Pilih keluhan Anda agar sistem dapat menganalisis berdasarkan riwayat penyakit.</p>
                
                {/* CONTAINER INPUT & SUGGESTIONS */}
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <input 
                        type="text" 
                        placeholder="Ketik keluhan Anda (misal: Gula, Darah, Tidur...)" 
                        value={keluhan}
                        onChange={(e) => handleSearchKeluhan(e.target.value)}
                        onFocus={() => keluhan.length >= 3 && setShowSuggestions(true)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                    
                    {/* DROPDOWN SUGGESTIONS DARI CHROMADB */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div style={{ 
                            position: 'absolute', top: '100%', left: 0, right: 0, 
                            background: 'white', border: '1px solid #ddd', borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '200px', overflowY: 'auto' 
                        }}>
                            {suggestions.map((item, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => {
                                        setKeluhan(item.label); // Set teks yang tampil
                                        setShowSuggestions(false); // Tutup dropdown
                                    }}
                                    style={{ 
                                        padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #eee',
                                        fontSize: '0.9rem', hover: { background: '#f8f9fa' }
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                                    onMouseLeave={(e) => e.target.style.background = 'white'}
                                >
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {isSearching && <small style={{ color: '#888' }}>Mencari saran medis...</small>}
                </div>
                
                <button 
                    onClick={handleGetAIRecommendation}
                    disabled={isRecommending || !keluhan}
                    style={{ width: '100%', padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {isRecommending ? "Menganalisis..." : "Tanya AI Rekomendasi"}
                </button>

                {rekomendasi && (
                <div style={{ 
                    marginTop: '20px', 
                    padding: '20px', 
                    background: 'white', 
                    borderRadius: '10px', 
                    // Garis pinggir berubah merah jika ada status danger
                    borderLeft: `5px solid ${rekomendasi.rekomendasi?.some(r => r.status === 'danger') ? '#dc3545' : '#28a745'}`,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    <h4 style={{ 
                        color: rekomendasi.rekomendasi?.some(r => r.status === 'danger') ? '#dc3545' : '#28a745',
                        marginTop: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        {rekomendasi.rekomendasi?.some(r => r.status === 'danger') ? 'Hasil Analisis Keamanan:' : '🌿 Hasil Analisis Pakar Herbal:'}
                    </h4>
                    
                    {rekomendasi.rekomendasi && rekomendasi.rekomendasi.length > 0 ? (
                        rekomendasi.rekomendasi.map((item, index) => (
                            <div key={index} style={{ marginBottom: '15px', padding: '10px' }}>
                                {/* Judul Herbal / Status */}
                                <p style={{ 
                                    margin: '0 0 10px 0', 
                                    fontWeight: 'bold', 
                                    fontSize: '1.1rem',
                                    color: item.status === 'danger' ? '#dc3545' : '#28a745' 
                                }}>
                                    {item.nama}
                                </p>
                                
                                {/* Isi Alasan AI */}
                                <p style={{ 
                                    margin: '5px 0', 
                                    fontSize: '0.95rem', 
                                    color: '#333', 
                                    lineHeight: '1.6',
                                    textAlign: 'justify' 
                                }}>
                                    {item.alasan}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
                            {rekomendasi.catatan || "Tidak ada herbal yang ditemukan untuk kondisi Anda."}
                        </p>
                    )}
                    
                    <div style={{ 
                        marginTop: '15px', 
                        paddingTop: '10px', 
                        borderTop: '1px solid #eee',
                        fontSize: '0.75rem', 
                        color: '#888',
                        fontStyle: 'italic'
                    }}>
                        *Penjelasan medis di atas dihasilkan melalui penalaran (reasoning) otomatis oleh model AI
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}