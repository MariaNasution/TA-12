import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, HEALTH_RECORD_ABI } from '../../api/contract_abi';

export default function AdminDashboard() {
    const [pendingDoctors, setPendingDoctors] = useState([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        loadPendingDoctors();
    }, []);

    const loadPendingDoctors = async () => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            // Ambil SEMUA akun yang terhubung ke provider (Ganache)
            const allAccounts = await provider.listAccounts(); 
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, provider);

            const pending = [];
            for (let addr of allAccounts) {
                const info = await contract.doctors(addr);
                // info[3] = isRegistered, info[2] = isApproved
                if (info.isRegistered && !info.isApproved) {
                    pending.push({
                        address: addr,
                        name: info.name,
                        specialty: info.specialty
                    });
                }
            }
            setPendingDoctors(pending);
        } catch (err) {
            console.error("Gagal load daftar dokter:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (addr) => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);

            const tx = await contract.approveDoctor(addr);
            await tx.wait();
            alert("✅ Dokter Berhasil Disetujui!");
            loadPendingDoctors(); // Refresh daftar
        } catch (error) {
            alert("Gagal: " + error.message);
        }
    };

    return (
        <div style={{ padding: '40px', fontFamily: 'Arial' }}>
            <h1>👨‍✈️ Dashboard Admin</h1>
            <h3>Daftar Pengajuan Dokter (Pending)</h3>
            
            {loading ? <p>Memuat data blockchain...</p> : (
                <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#eee' }}>
                            <th>Nama</th>
                            <th>Spesialisasi</th>
                            <th>Alamat Wallet</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingDoctors.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center' }}>Tidak ada pengajuan baru.</td></tr>
                        ) : (
                            pendingDoctors.map((doc, index) => (
                                <tr key={index}>
                                    <td>{doc.name}</td>
                                    <td>{doc.specialty}</td>
                                    <td><code>{doc.address}</code></td>
                                    <td>
                                        <button 
                                            onClick={() => handleApprove(doc.address)}
                                            style={{ background: '#28a745', color: '#fff', border: 'none', padding: '5px 15px', cursor: 'pointer', borderRadius: '4px' }}
                                        >
                                            Setujui (Approve)
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
}