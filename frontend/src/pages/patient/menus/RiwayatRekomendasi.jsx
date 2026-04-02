import React, { useState, useEffect } from 'react';
import { Clock, BookOpen, MessageCircle } from 'lucide-react';

const RiwayatRekomendasi = ({ address }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://localhost:5000/herbal/history?address=${address}`);
        const data = await res.json();
        
        if (Array.isArray(data)) {
          setHistory(data);
        } else {
          setHistory([]);
        }
      } catch (err) {
        console.error("Gagal ambil riwayat:", err);
        setHistory([]); 
      } finally {
        setLoading(false);
      }
    };
    if (address) fetchHistory();
  }, [address]);

  return (
    <div className="menu-wrapper">
      <div className="header-section">
        <h2 className="title">Riwayat Rekomendasi</h2>
        <p className="subtitle">Daftar saran herbal yang pernah kamu minta sebelumnya</p>
      </div>

      {loading ? (
        <p className="status-text">Memuat riwayat...</p>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <Clock size={40} color="#ccc" />
          <p>Belum ada riwayat rekomendasi.</p>
        </div>
      ) : (
        <div className="history-list">
        {history.map((item, idx) => (
          <div key={idx} className="history-card">
            <div className="card-header">
              {/* SESUAIKAN: dari item.timestamp ke item.tanggal */}
              <span className="date-tag">
                {new Date(item.tanggal).toLocaleDateString('id-ID', { 
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                })}
              </span>
              {/* SESUAIKAN: dari item.data.hasil.mode ke item.mode */}
              <span className="mode-badge">{item.mode}</span>
            </div>
            
            <div className="info-row">
              <MessageCircle size={16} className="icon-muted" />
              {/* SESUAIKAN: item.keluhan  */}
              <p className="complaint">Keluhan: <strong>"{item.keluhan}"</strong></p>
            </div>

            <div className="recommendation-list">
              {/* SESUAIKAN: item.hasil_ai.rekomendasi */}
              {item.hasil_ai && item.hasil_ai.rekomendasi ? (
                item.hasil_ai.rekomendasi.map((rek, i) => (
                  <div key={i} className="recommendation-box">
                    <p className="herbal-name">🌿 {rek.nama}</p>
                    <p className="rec-text">{rek.alasan}</p>
                  </div>
                ))
              ) : (
                <p>Data rekomendasi tidak ditemukan</p>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      <style jsx>{`
        .menu-wrapper { animation: fadeIn 0.4s ease; }
        .title { font-size: 20px; font-weight: 700; color: #333; margin: 0; }
        .subtitle { font-size: 13px; color: #777; margin-top: 4px; margin-bottom: 25px; }

        .history-list { display: grid; gap: 20px; }
        
        .history-card { 
          background: white; 
          border-radius: 18px; 
          padding: 20px; 
          border: 1px solid #f0f0f0;
          transition: transform 0.2s;
        }
        
        .history-card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }

        .date-tag { font-size: 11px; font-weight: 700; color: #2e7d32; background: #e8f5e9; padding: 4px 10px; border-radius: 20px; }
        
        .info-row { display: flex; gap: 10px; align-items: flex-start; margin: 15px 0; }
        .icon-muted { color: #aaa; margin-top: 3px; }
        .complaint { font-size: 14px; color: #555; font-style: italic; margin: 0; }

        .recommendation-box { background: #f9f9f9; padding: 15px; border-radius: 12px; border-left: 4px solid #2e7d32; }
        .rec-text { font-size: 14.5px; color: #333; margin: 0; line-height: 1.6; }

        .source-info { display: flex; align-items: center; gap: 6px; margin-top: 15px; font-size: 12px; color: #999; }

        .empty-state { text-align: center; padding: 60px; color: #aaa; }
        .status-text { text-align: center; color: #999; padding: 40px; }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .mode-badge {
          font-size: 10px;
          color: #666;
          background: #f0f0f0;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .herbal-name {
          font-weight: 700;
          color: #2e7d32;
          margin-bottom: 5px;
          font-size: 14px;
        }

        .recommendation-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .recommendation-box { 
          background: #f9f9f9; 
          padding: 12px 15px; 
          border-radius: 12px; 
          border-left: 4px solid #2e7d32; 
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default RiwayatRekomendasi;