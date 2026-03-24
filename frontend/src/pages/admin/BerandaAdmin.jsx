import React from 'react';
import { Settings, Clock, Trash2, CheckCircle } from 'lucide-react';

const BerandaAdmin = ({ stats, pendingList, onApprove, onReject }) => {
  
  // Data untuk Bar Komposisi (Gambar 2)
  const total = stats.total_pengguna || 1;
  const compositions = [
    { label: "Pasien", value: stats.pasien, color: "#4caf50" },
    { label: "Dokter Medis", value: stats.dokter_medis, color: "#0288d1" },
    { label: "Dokter Herbal", value: stats.dokter_herbal, color: "#8bc34a" },
  ];

  return (
    <div className="beranda-container">
      <header className="mb-30">
        <h1 className="title">Beranda</h1>
        <p className="subtitle">Ringkasan sistem dan aktivitas pendaftaran</p>
      </header>

      {/* --- STATS CARDS (Gambar 1) --- */}
      <div className="stats-grid">
        <div className="stat-card card-green">
          <div className="icon-box"><Settings size={24} color="#2e7d32" /></div>
          <div>
            <span className="label">Total Pengguna</span>
            <h2 className="value">{stats.total_pengguna}</h2>
            <p className="sub">Aktif di Blockchain</p>
          </div>
        </div>

        <div className="stat-card card-blue">
          <div className="icon-box"><Clock size={24} color="#0288d1" /></div>
          <div>
            <span className="label">Menunggu Verifikasi</span>
            <h2 className="value">{stats.pending_verif}</h2>
            <p className="sub">Perlu tinjauan Admin</p>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT (Gambar 2) --- */}
      <div className="content-grid mt-40">
        
        {/* Kolom Kiri: Pendaftaran Pengguna */}
        <div className="section-white">
          <h3 className="section-title">Pendaftaran Pengguna</h3>
          <div className="list-wrapper">
            {pendingList.length > 0 ? pendingList.map((user) => (
              <div key={user.id} className="registration-item">
                <div className="avatar">{user.initials}</div>
                <div className="info">
                  <p className="name">{user.name}</p>
                  <p className="role">{user.display_role}</p>
                </div>
                <div className="actions">
                  <button className="btn-approve" onClick={() => onApprove(user.id, user.name)}>
                    Setujui
                  </button>
                  <button className="btn-reject" onClick={() => onReject(user.id, user.name)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )) : <p className="empty">Tidak ada pendaftaran baru.</p>}
          </div>
        </div>

        {/* Kolom Kanan: Komposisi Pengguna */}
        <div className="section-white">
          <h3 className="section-title">Komposisi Pengguna</h3>
          <div className="comp-wrapper">
            {compositions.map((item, idx) => (
              <div key={idx} className="comp-item">
                <div className="comp-info">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <div className="progress-bg">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(item.value / total) * 100}%`, background: item.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style jsx>{`
        .beranda-container { animation: fadeIn 0.5s ease; }
        .mb-30 { margin-bottom: 30px; }
        .mt-40 { margin-top: 40px; }
        .title { font-size: 26px; font-weight: 700; color: #333; margin: 0; }
        .subtitle { color: #888; font-size: 14px; margin-top: 5px; }

        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .stat-card { padding: 25px; border-radius: 20px; display: flex; align-items: center; gap: 20px; }
        .card-green { background: #e8f5e9; }
        .card-blue { background: #e3f2fd; }
        .icon-box { background: white; padding: 15px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .label { font-size: 13px; color: #666; }
        .value { font-size: 30px; font-weight: 700; margin: 2px 0; color: #333; }
        .sub { font-size: 12px; color: #888; margin: 0; }

        .content-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 25px; }
        .section-white { background: white; padding: 25px; border-radius: 20px; border: 1px solid #f0f0f0; }
        .section-title { font-size: 17px; font-weight: 700; margin-bottom: 20px; color: #333; }

        .registration-item { display: flex; align-items: center; gap: 15px; padding: 12px 0; border-bottom: 1px solid #f8f8f8; }
        .avatar { width: 42px; height: 42px; background: #f0f4f8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #555; font-size: 14px; }
        .info { flex: 1; }
        .name { font-size: 14.5px; font-weight: 600; margin: 0; color: #333; }
        .role { font-size: 12px; color: #888; margin: 2px 0 0 0; }

        .actions { display: flex; gap: 10px; }
        .btn-approve { background: #2e7d32; color: white; border: none; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .btn-reject { background: #fff1f1; color: #d32f2f; border: none; padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
        .btn-reject:hover { background: #ffdada; }

        .comp-item { margin-bottom: 18px; }
        .comp-info { display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 6px; }
        .progress-bg { height: 8px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 10px; transition: width 0.6s ease-in-out; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default BerandaAdmin;