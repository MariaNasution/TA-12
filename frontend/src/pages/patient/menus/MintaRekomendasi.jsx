import React from 'react';
import { Database, Cpu, MessageSquare } from 'lucide-react';

const MintaRekomendasi = ({ 
  keluhan, 
  setKeluhan, 
  useRag, 
  setUseRag, 
  handleGetAIRecommendation, 
  isRecommending, 
  rekomendasi 
}) => {
  return (
    <div className="menu-container">
      <div className="header-page">
        <h2 className="title">Minta Rekomendasi Herbal</h2>
        <p className="subtitle">Konsultasikan keluhan Anda dengan sistem pakar AI kami</p>
      </div>

      <div className="card-white main-form">
        <div className="input-group">
          <label>Deskripsikan keluhan atau kondisi kamu</label>
          <textarea 
            placeholder="Contoh: Saya sedang batuk berdahak dan tenggorokan terasa gatal..." 
            value={keluhan}
            onChange={(e) => setKeluhan(e.target.value)}
          />
        </div>

        <div className={`rag-toggle-box ${useRag ? 'active' : 'inactive'}`}>
          <div className="rag-text">
            <span className="rag-label">
              {useRag ? <Database size={14} /> : <Cpu size={14} />}
              {useRag ? " Mode Database Pakar (RAG) Aktif" : " Mode AI Umum (Non-RAG) Aktif"}
            </span>
            <p>{useRag ? "Saran berdasarkan data penelitian herbal terverifikasi." : "Saran berdasarkan pengetahuan umum AI."}</p>
          </div>
          <button className="toggle-btn" onClick={() => setUseRag(!useRag)}>
            {useRag ? "Gunakan Non RAG" : "Gunakan RAG"}
          </button>
        </div>

        <button 
          className="btn-generate" 
          onClick={handleGetAIRecommendation}
          disabled={isRecommending || !keluhan}
        >
          {isRecommending ? "Sedang Menganalisis..." : "Dapatkan Rekomendasi Herbal"}
        </button>
      </div>

      {/* HASIL OUTPUT AI */}
      {rekomendasi && (
        <div className="results-section">
          <h3 className="section-title">Hasil Analisis AI</h3>
          <div className="results-grid">
            {rekomendasi.rekomendasi && rekomendasi.rekomendasi.length > 0 ? (
              rekomendasi.rekomendasi.map((item, idx) => (
                <div key={idx} className={`result-card ${item.status}`}>
                  <div className="card-header-herbal">
                    <span className="herb-name">{item.nama}</span>
                    <span className={`status-badge ${item.status}`}>
                      {item.status === 'success' ? 'Direkomendasikan' : 'Peringatan'}
                    </span>
                  </div>
                  <p className="herb-reason">{item.alasan}</p>
                </div>
              ))
            ) : (
              <div className="card-white empty">Data tidak ditemukan.</div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .menu-container { animation: fadeIn 0.5s ease; }
        .header-page { margin-bottom: 25px; }
        .title { font-size: 22px; font-weight: 700; color: #333; margin: 0; }
        .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
        
        .card-white { background: white; padding: 30px; border-radius: 20px; border: 1px solid #f0f0f0; }
        .input-group label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #444; }
        textarea { width: 100%; height: 120px; padding: 15px; border-radius: 12px; border: 1px solid #eee; background: #fafafa; font-family: inherit; font-size: 15px; outline: none; transition: 0.3s; }
        textarea:focus { border-color: #2e7d32; background: white; }

        .rag-toggle-box { display: flex; justify-content: space-between; align-items: center; margin: 20px 0; padding: 15px; border-radius: 12px; }
        .active { background: #e8f5e9; border: 1px solid #c8e6c9; }
        .inactive { background: #fff3e0; border: 1px solid #ffe0b2; }
        .rag-label { font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px; }
        .rag-text p { font-size: 11px; margin: 4px 0 0 0; color: #666; }
        .toggle-btn { padding: 6px 12px; border-radius: 8px; border: 1px solid #ddd; background: white; cursor: pointer; font-size: 11px; font-weight: 700; }

        .btn-generate { width: 100%; padding: 15px; border-radius: 12px; border: none; background: #2e7d32; color: white; font-weight: 700; cursor: pointer; transition: 0.3s; }
        .btn-generate:disabled { background: #ccc; cursor: not-allowed; }

        .results-section { margin-top: 30px; }
        .section-title { font-size: 16px; margin-bottom: 15px; font-weight: 700; }
        .result-card { background: white; padding: 20px; border-radius: 15px; border: 1px solid #eee; margin-bottom: 15px; }
        .result-card.success { border-left: 5px solid #2e7d32; }
        .result-card.danger { border-left: 5px solid #d32f2f; }
        
        .card-header-herbal { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .herb-name { font-weight: 700; font-size: 16px; }
        .status-badge { font-size: 10px; padding: 4px 10px; border-radius: 20px; font-weight: 700; }
        .status-badge.success { background: #e8f5e9; color: #2e7d32; }
        .status-badge.danger { background: #fdecea; color: #d32f2f; }
        .herb-reason { font-size: 14px; color: #555; line-height: 1.6; text-align: justify; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default MintaRekomendasi;