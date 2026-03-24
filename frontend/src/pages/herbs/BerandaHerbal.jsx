import React from 'react';
import { Flower2, Plus, ArrowRight, Database } from 'lucide-react';

const BerandaHerbal = ({ herbalList, onAddClick }) => {
  const recentActivity = [...herbalList].slice(0, 5);

  return (
    <div className="beranda-wrapper">
      <div className="header-flex">
        <div>
          <h1 className="welcome-text">Beranda</h1>
          <p className="subtitle">Ringkasan aktivitas dan katalog herbal</p>
        </div>
        <button className="btn-add" onClick={onAddClick}>
          <Plus size={18} /> Tambah Herbal
        </button>
      </div>

      {/* STATS CARD */}
      <div className="stats-grid">
        <div className="stat-card card-green">
          <div className="icon-circle">
            <Flower2 size={24} color="#2e7d32" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Herbal Aktif</span>
            <h2 className="stat-value">{herbalList.length} <span className="unit">Tanaman</span></h2>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY LIST */}
      <div className="activity-section">
        <h3 className="section-title">Aktivitas Terbaru</h3>
        <div className="activity-list">
          {recentActivity.length > 0 ? recentActivity.map((herb, idx) => (
            <div key={idx} className="activity-item">
              <div className="activity-icon">
                <Plus size={16} color="#666" />
              </div>
              <div className="activity-content">
                <p className="activity-text">
                  Berhasil menambahkan tanaman <b>{herb.nama}</b> ke database pengetahuan.
                </p>
                <span className="activity-time">Baru saja • Database Terupdate</span>
              </div>
              <ArrowRight size={16} color="#ccc" className="arrow" />
            </div>
          )) : (
            <p className="empty-text">Belum ada aktivitas penginputan.</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .beranda-wrapper { animation: fadeIn 0.5s ease; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .welcome-text { font-size: 28px; font-weight: 700; color: #333; margin: 0; }
        .subtitle { color: #888; margin: 5px 0 0 0; }
        
        .btn-add { 
          display: flex; align-items: center; gap: 8px; 
          background: white; border: 1px solid #eee; padding: 10px 20px; 
          border-radius: 12px; font-weight: 600; cursor: pointer; transition: 0.2s;
        }
        .btn-add:hover { background: #f9f9f9; transform: translateY(-2px); }

        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
        .stat-card { 
          background: white; padding: 25px; border-radius: 20px; border: 1px solid #f0f0f0;
          display: flex; align-items: center; gap: 20px;
        }
        .card-green { background: #e8f5e9; border: none; }
        
        .icon-circle { 
          width: 50px; height: 50px; border-radius: 15px; background: white; 
          display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .icon-circle.blue { background: #e3f2fd; }
        
        .stat-label { font-size: 13px; color: #666; font-weight: 500; }
        .stat-value { font-size: 24px; font-weight: 700; color: #333; margin: 5px 0 0 0; }
        .unit { font-size: 14px; font-weight: 400; color: #888; }
        .dot-green { display: inline-block; width: 10px; height: 10px; background: #4caf50; border-radius: 50%; margin-left: 10px; }

        .activity-section { background: white; padding: 30px; border-radius: 20px; border: 1px solid #f0f0f0; }
        .section-title { font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #333; }
        
        .activity-item { 
          display: flex; align-items: center; gap: 15px; padding: 15px 0; 
          border-bottom: 1px solid #f9f9f9; transition: 0.2s;
        }
        .activity-icon { background: #f5f5f5; padding: 8px; border-radius: 10px; }
        .activity-text { margin: 0; font-size: 14.5px; color: #444; flex: 1; }
        .activity-time { font-size: 12px; color: #aaa; margin-top: 4px; display: block; }
        .empty-text { color: #aaa; text-align: center; padding: 20px; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default BerandaHerbal;