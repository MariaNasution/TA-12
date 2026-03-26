import React from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

const VerifikasiAkun = ({ pendingList, onApprove, onReject }) => {
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

                {/* Detail Info Row (kosong sesuai instruksi) */}
                <div className="item-detail">
                  <p className="detail-text">
                    {/* Kosong, bisa diisi nanti */}
                  </p>
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
                    onClick={() => onReject(user.id, user.name)}
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
        .detail-text {
          font-size: 13px;
          color: #666;
          margin: 0;
          line-height: 1.6;
        }

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
      `}</style>
    </div>
  );
};

export default VerifikasiAkun;
