import React from 'react';
import { UserCheck, UserPlus, XCircle, CheckCircle, Trash2  } from 'lucide-react';

const AksesDokter = ({ pendingDocs = [], approvedDocs = [], onGrant, onReject, onRevoke, isProcessing }) => {
  return (
    <div className="menu-wrapper">
      <div className="header-section">
        <h2 className="title">Akses Dokter</h2>
        <p className="subtitle">Kelola izin dokter untuk mengakses data medismu</p>
      </div>

      {/* SEKSI 1: PERMINTAAN BARU */}
      <div className="card-white section-margin">
        <h3 className="card-title">Permintaan baru</h3>
        {pendingDocs.length === 0 ? (
          <p className="empty-text">Tidak ada permintaan akses tertunda.</p>
        ) : (
          pendingDocs.map((doc, idx) => (
            <div key={idx} className="doc-item pending">
              <div className="doc-main-info">
                <p className="doc-name">{doc.name}</p>
                <p className="doc-sub">{doc.address.substring(0, 20)}...</p>
              </div>
              <div className="action-btns">
                <button 
                  className="btn-tolak" 
                  onClick={() => onReject(doc.address)}
                  disabled={isProcessing}
                >
                  Tolak
                </button>
                <button 
                  className="btn-setujui" 
                  onClick={() => onGrant(doc.address)}
                  disabled={isProcessing}
                >
                  {isProcessing ? "..." : "Setujui"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* SEKSI 2: DOKTER TEROTORISASI */}
      <div className="card-white">
        <h3 className="card-title">Dokter terotorisasi</h3>
        {approvedDocs.length === 0 ? (
          <p className="empty-text">Belum ada dokter yang memiliki akses.</p>
        ) : (
          approvedDocs.map((doc, idx) => (
            <div key={idx} className="doc-item">
              <div className="doc-main-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p className="doc-name">{doc.name}</p>
                    <span className="status-badge aktif">Aktif</span>
                </div>
                <code className="doc-sub">{doc.address.substring(0, 25)}...</code>
              </div>
              <button 
                className="btn-revoke-red" 
                onClick={() => {
                    if(window.confirm(`Cabut izin akses untuk ${doc.name}?`)) {
                        onRevoke(doc.address);
                    }
                }}
                disabled={isProcessing}
                title="Cabut Izin Akses"
              >
                {isProcessing ? "..." : <Trash2 size={16} />}
                <span>Cabut Izin</span>
              </button>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .menu-wrapper { animation: fadeIn 0.4s ease; }
        .title { font-size: 20px; font-weight: 700; color: #333; margin: 0; }
        .subtitle { font-size: 13px; color: #777; margin: 4px 0 20px 0; }
        .info-text { font-size: 13px; color: #555; margin-bottom: 25px; line-height: 1.5; }
        
        .card-white { background: white; border-radius: 16px; border: 1px solid #f0f0f0; padding: 25px; }
        .section-margin { margin-bottom: 25px; }
        .card-title { font-size: 16px; font-weight: 700; margin: 0 0 20px 0; color: #333; }
        
        .doc-item { 
          display: flex; justify-content: space-between; align-items: center; 
          padding: 15px 0; border-bottom: 1px solid #f9f9f9; 
        }
        .doc-item:last-child { border-bottom: none; }
        
        .doc-name { font-weight: 700; font-size: 14px; margin: 0; color: #333; }
        .doc-sub { font-size: 12px; color: #888; margin: 4px 0 0 0; }
        
        .action-btns { display: flex; gap: 10px; }
        .btn-tolak { 
          padding: 8px 20px; border-radius: 8px; border: 1px solid #ffcdd2; 
          background: white; color: #d32f2f; font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .btn-setujui { 
          padding: 8px 20px; border-radius: 8px; border: none; 
          background: #f5f5f5; color: #333; font-size: 13px; font-weight: 600; cursor: pointer;
          border: 1px solid #e0e0e0;
        }

        .status-badge-aktif {
          font-size: 10px;
          font-weight: 800;
          color: #28a745;
          background: #e8f5e9;
          padding: 2px 8px;
          border-radius: 4px;
        }

        /* TOMBOL REVOKE KEREN */
        .btn-revoke-red {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff5f5; /* Merah sangat muda */
          color: #eb4d4b;      /* Merah tegas */
          border: 1px solid #ffcccc;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-revoke-red:hover:not(:disabled) {
          background: #eb4d4b;
          color: white;
          border-color: #eb4d4b;
          box-shadow: 0 4px 12px rgba(235, 77, 75, 0.2);
        }

        .btn-revoke-red:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
          .status-badge { 
            font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; 
          }
          .status-badge.aktif { background: #e8f5e9; color: #2e7d32; }

          .empty-text { font-size: 13px; color: #aaa; font-style: italic; }

          @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AksesDokter;