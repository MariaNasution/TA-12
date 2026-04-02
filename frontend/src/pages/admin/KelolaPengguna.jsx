import React, { useState, useEffect } from 'react';
import { Search, FileText, X, UserX } from 'lucide-react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, HEALTH_RECORD_ABI } from '../../api/contract_abi';

const KelolaPengguna = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null); 

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/admin/users');
      const data = await res.json();
      if (data.status === 'success') {
        setUsers(data.users || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('❌ Gagal ambil data pengguna:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (userAddress, userName) => {
    if (!window.confirm(`Nonaktifkan dokter ${userName}?\n\nDokter ini tidak dapat login dan harus melakukan registrasi ulang untuk aktif kembali.`)) return;

    try {
      const res = await fetch('http://127.0.0.1:5000/admin/deactivate-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userAddress })
      });
      const data = await res.json();

      if (!res.ok) {
        alert('❌ Gagal menonaktifkan: ' + (data.error || 'Server error'));
        return;
      }

      let blockchainInfo = '';
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);
        const tx = await contract.rejectDoctor(userAddress);
        await tx.wait();
        blockchainInfo = ' dan Blockchain';
      } catch (bcErr) {
        console.warn('⚠️ Blockchain tidak diperbarui (tidak kritis, database sudah diupdate):', bcErr.message);
        blockchainInfo = ' (Database berhasil, Blockchain akan diperbarui otomatis saat registrasi ulang)';
      }

      alert(`✅ Dokter ${userName} berhasil dinonaktifkan di Database${blockchainInfo}.`);
      fetchUsers(); 
    } catch (err) {
      console.error('❌ Error deactivate:', err);
      alert('Gagal memproses: ' + (err.data?.message || err.message));
    }
  };



  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePreview = (address, name) => {
    setSelectedDoc({ address, name });
  };

  const closePreview = () => setSelectedDoc(null);

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.address.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  const getAvatarColor = (role) => {
    if (role === 'Dokter Medis') return { bg: '#e8f5e9', color: '#2e7d32' };
    if (role === 'Dokter Herbal') return { bg: '#e8f5e9', color: '#388e3c' };
    return { bg: '#e3f2fd', color: '#1565c0' }; // Pasien
  };

  const getRoleBadge = (role) => {
    if (role === 'Dokter Medis') return { label: 'Dokter Medis', bg: '#e8f0fe', color: '#1a73e8', border: '#c5d8f8' };
    if (role === 'Dokter Herbal') return { label: 'Dokter Herbal', bg: '#e8f5e9', color: '#2e7d32', border: '#c8e6c9' };
    return { label: 'Pasien', bg: '#e8f5e9', color: '#388e3c', border: '#c8e6c9' };
  };

  const getStatusBadge = (status) => {
    if (status === 'active' || status === 'verified') return { label: 'Aktif', bg: '#e8f5e9', color: '#2e7d32', border: '#c8e6c9' };
    if (status === 'pending') return { label: 'Menunggu', bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
    if (status === 'rejected') return { label: 'Ditolak', bg: '#ffebee', color: '#c62828', border: '#ffcdd2' };
    return { label: 'Nonaktif', bg: '#ffebee', color: '#c62828', border: '#ffcdd2' };
  };

  const getInitials = (name) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="kp-container">
      {/* Header */}
      <div className="kp-header">
        <h1 className="kp-title">Kelola Pengguna</h1>
        <p className="kp-subtitle">Daftar semua pengguna yang terdaftar di sistem</p>
      </div>

      {/* MODAL PRATINJAU DOKUMEN */}
      {selectedDoc && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Dokumen STR/SIP: {selectedDoc.name}</h3>
              <button onClick={closePreview} className="close-btn"><X size={20} /></button>
            </div>
            <div className="modal-body doc-preview">
              <iframe 
                src={`http://127.0.0.1:5000/admin/view-document/${selectedDoc.address}`} 
                width="100%" 
                height="500px" 
                style={{ border: 'none', borderRadius: '8px' }}
                title="Document Preview"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="kp-search-bar">
        <Search size={16} className="kp-search-icon" />
        <input
          type="text"
          placeholder="Cari nama, wallet, atau role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="kp-search-input"
        />
      </div>

      {/* List Card */}
      <div className="kp-card">
        {loading ? (
          <p className="kp-empty">Memuat data dari Blockchain...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="kp-empty">Tidak ada pengguna yang cocok.</p>
        ) : (
          filteredUsers.map((user, idx) => {
            const avatarStyle = getAvatarColor(user.role);
            const roleBadge = getRoleBadge(user.role);
            const statusBadge = getStatusBadge(user.status);

            return (
              <div key={idx} className="kp-item">
                {/* Avatar */}
                <div
                  className="kp-avatar"
                  style={{ background: avatarStyle.bg, color: avatarStyle.color }}
                >
                  {getInitials(user.name)}
                </div>

                {/* Info */}
                <div className="kp-info">
                  <div className="kp-name">{user.name}</div>
                  <div className="kp-address">
                    {user.address.substring(0, 20)}...{user.address.substring(user.address.length - 6)}
                  </div>
                </div>

                {/* Badges & Actions */}
                <div className="kp-actions-wrapper">
                  <div className="kp-badges">
                    <span
                      className="kp-badge"
                      style={{ background: roleBadge.bg, color: roleBadge.color, border: `1px solid ${roleBadge.border}` }}
                    >
                      {roleBadge.label}
                    </span>
                    <span
                      className="kp-badge"
                      style={{ background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}` }}
                    >
                      {user.role === 'Pasien' ? 'Aktif' : statusBadge.label}
                    </span>
                  </div>

                  {/* Tombol Lihat Dokumen (Hanya untuk Dokter yang punya CID) */}
                  {user.role !== 'Pasien' && user.document_cid && (
                    <button 
                      className="btn-view-doc-small" 
                      onClick={() => handlePreview(user.address, user.name)}
                      title="Lihat STR/SIP"
                    >
                      <FileText size={14} />
                      Dokumen
                    </button>
                  )}

                  {/* Tombol Nonaktifkan (Hanya untuk Dokter yang sudah Diverifikasi/Aktif) */}
                  {user.role !== 'Pasien' && (user.status === 'verified' || user.status === 'active') && (
                    <button
                      className="btn-deactivate"
                      onClick={() => handleDeactivate(user.address, user.name)}
                      title="Nonaktifkan / Hapus dokter ini"
                    >
                      <UserX size={14} />
                      Nonaktifkan
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Count */}
      {!loading && (
        <p className="kp-footer">
          Menampilkan {filteredUsers.length} dari {total} pengguna
        </p>
      )}

      <style jsx>{`
        .kp-container { animation: fadeIn 0.4s ease; }

        .kp-header { margin-bottom: 20px; }
        .kp-title { font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0; }
        .kp-subtitle { font-size: 14px; color: #888; margin: 4px 0 0; }

        .kp-search-bar {
          position: relative;
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }
        .kp-search-icon {
          position: absolute;
          left: 14px;
          color: #aaa;
          pointer-events: none;
        }
        .kp-search-input {
          width: 100%;
          padding: 11px 14px 11px 40px;
          border-radius: 12px;
          border: 1px solid #e8e8e8;
          font-size: 14px;
          color: #333;
          background: #fff;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .kp-search-input:focus { border-color: #4caf50; }

        .kp-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #f0f0f0;
          padding: 8px 24px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.02);
        }

        .kp-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 0;
          border-bottom: 1px solid #f5f5f5;
        }
        .kp-item:last-child { border-bottom: none; }

        .kp-avatar {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .kp-info { flex: 1; overflow: hidden; }
        .kp-name {
          font-size: 15px;
          font-weight: 700;
          color: #1a1a1a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .kp-address {
          font-size: 12.5px;
          color: #999;
          margin-top: 2px;
          font-family: monospace;
        }

        .kp-actions-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .kp-badges {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .kp-badge {
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 12.5px;
          font-weight: 600;
          white-space: nowrap;
        }

        .btn-deactivate {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: #fff5f5;
          border: 1px solid #ffcccc;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #c62828;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-deactivate:hover { background: #ffebee; border-color: #ef9a9a; }

        .btn-view-doc-small {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-view-doc-small:hover { background: #f1f5f9; border-color: #cbd5e1; color: #1e293b; }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white; border-radius: 16px; padding: 24px;
          width: 90%; maxWidth: 500px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
          animation: modalIn 0.3s ease;
        }
        .modal-content.large { maxWidth: 800px; }
        .modal-header {
           display: flex; justify-content: space-between; align-items: center;
           margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #f3f4f6;
        }
        .modal-header h3 { margin: 0; font-size: 18px; color: #111; }
        .close-btn { background: none; border: none; cursor: pointer; color: #999; }

        .kp-empty {
          text-align: center;
          padding: 40px;
          color: #aaa;
          font-style: italic;
        }

        .kp-footer {
          text-align: center;
          font-size: 13px;
          color: #aaa;
          margin-top: 16px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default KelolaPengguna;
