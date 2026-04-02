import React, { useState } from 'react';
import { Clock, CheckCircle, XCircle, Eye, FileText, X } from 'lucide-react';

const VerifikasiAkun = ({ pendingList, onApprove, onReject }) => {
  const [selectedDoc, setSelectedDoc] = useState(null); 
  const [isRejecting, setIsRejecting] = useState(null); 
  const [rejectReason, setRejectReason] = useState("");

  const handlePreview = (address, name) => {
    setSelectedDoc({ address, name });
  };

  const closePreview = () => setSelectedDoc(null);

  const startReject = (id, name) => {
    setIsRejecting({ id, name });
    setRejectReason("");
  };

  const confirmReject = () => {
    if (isRejecting) {
      onReject(isRejecting.id, isRejecting.name, rejectReason);
      setIsRejecting(null);
    }
  };

  return (
    <div className="verifikasi-container">
      {/* Header */}
      <div className="verifikasi-header">
        <h1 className="verifikasi-title">Verifikasi Akun</h1>
        <p className="verifikasi-subtitle">Tinjau dan aktifkan akun pendaftar baru</p>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <p>Tinjau dokumen dan informasi pendaftar baru sebelum mengaktifkan akun mereka.</p>
      </div>

      {/* MODAL PRATINJAU DOKUMEN */}
      {selectedDoc && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Pratinjau Dokumen: {selectedDoc.name}</h3>
              <button onClick={closePreview} className="close-btn"><X size={20} /></button>
            </div>
            <div className="modal-body doc-preview">
              {/* Gunakan iframe untuk PDF atau img untuk Gambar. */}
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

      {/* MODAL ALASAN PENOLAKAN */}
      {isRejecting && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Tolak Pendaftaran: {isRejecting.name}</h3>
              <button onClick={() => setIsRejecting(null)} className="close-btn"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>Alasan Penolakan:</label>
              <textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Dokumen STR tidak terbaca atau sudah kadaluwarsa."
                style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsRejecting(null)} className="btn-cancel">Batal</button>
              <button onClick={confirmReject} className="btn-confirm-reject">Kirim Penolakan</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="verifikasi-card">
        <h3 className="card-title">
          Menunggu verifikasi ({pendingList.length})
        </h3>

        {pendingList.length > 0 ? (
          <div className="pending-list">
            {pendingList.map((user, idx) => (
              <div key={user.id || idx} className="pending-item">
                {/* Top Row: Avatar + Info + Status Badge */}
                <div className="item-top">
                  <div className="avatar-circle">
                    {user.initials || user.name?.substring(0, 2).toUpperCase() || '??'}
                  </div>
                  <div className="item-info">
                    <p className="item-name">{user.name || 'Tanpa Nama'}</p>
                    <p className="item-role">
                      {user.display_role} · Daftar {user.date_string || '-'}
                    </p>
                  </div>
                  <span className="status-badge">Menunggu</span>
                </div>

                {/* Detail Info Row (Dokumen) */}
                <div className="item-detail">
                  <button className="btn-view-doc" onClick={() => handlePreview(user.id, user.name)}>
                    <FileText size={16} />
                    Lihat Dokumen STR/SIP
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="item-actions">
                  <button 
                    className="btn-approve" 
                    onClick={() => onApprove(user.id, user.name)}
                  >
                    <CheckCircle size={15} />
                    Setujui & Aktifkan
                  </button>
                  <button 
                    className="btn-reject" 
                    onClick={() => startReject(user.id, user.name)}
                  >
                    <XCircle size={15} />
                    Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <CheckCircle size={48} color="#c8e6c9" />
            <p>Tidak ada pendaftaran baru yang menunggu verifikasi.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .verifikasi-container { animation: fadeIn 0.4s ease; }

        .verifikasi-header { margin-bottom: 20px; }
        .verifikasi-title { font-size: 24px; font-weight: 700; color: #333; margin: 0; }
        .verifikasi-subtitle { font-size: 14px; color: #888; margin: 4px 0 0 0; }

        .info-banner {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 12px;
          padding: 14px 20px;
          margin-bottom: 24px;
        }
        .info-banner p {
          margin: 0;
          font-size: 13.5px;
          color: #92400e;
          line-height: 1.5;
        }

        .verifikasi-card {
          background: white;
          border-radius: 20px;
          border: 1px solid #f0f0f0;
          padding: 28px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.02);
        }

        .card-title {
          font-size: 17px;
          font-weight: 700;
          color: #333;
          margin: 0 0 24px 0;
        }

        .pending-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .pending-item {
          padding: 20px 0;
          border-bottom: 1px solid #f5f5f5;
        }
        .pending-item:last-child { border-bottom: none; }

        .item-top {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .avatar-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f0f4f8, #e2e8f0);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 700;
          color: #555;
          flex-shrink: 0;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }

        .item-info { flex: 1; }
        .item-name {
          font-size: 15.5px;
          font-weight: 700;
          color: #333;
          margin: 0;
        }
        .item-role {
          font-size: 13px;
          color: #888;
          margin: 3px 0 0 0;
        }

        .status-badge {
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          background: #fff8e1;
          color: #f59e0b;
          border: 1px solid #fde68a;
          white-space: nowrap;
        }

        .item-detail {
          margin: 10px 0 14px 62px;
        }
        .btn-view-doc {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f0f4f8;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          color: #1f2937;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-view-doc:hover { background: #e2e8f0; border-color: #9ca3af; }

        .item-actions {
          display: flex;
          gap: 10px;
          margin-left: 62px;
        }

        .btn-approve {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 20px;
          background: white;
          color: #333;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-approve:hover {
          background: #e8f5e9;
          border-color: #4caf50;
          color: #2e7d32;
        }

        .btn-reject {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 20px;
          background: white;
          color: #333;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-reject:hover {
          background: #ffebee;
          border-color: #ef5350;
          color: #c62828;
        }

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
        .modal-footer {
          display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;
        }
        .btn-cancel {
          padding: 10px 20px; background: white; border: 1px solid #ddd;
          border-radius: 8px; cursor: pointer; font-size: 14px;
        }
        .btn-confirm-reject {
          padding: 10px 20px; background: #e53e3e; color: white; border: none;
          border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;
        }

        .empty-state {
          text-align: center;
          padding: 50px 20px;
        }
        .empty-state p {
          margin-top: 16px;
          font-size: 14px;
          color: #aaa;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
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

export default VerifikasiAkun;
