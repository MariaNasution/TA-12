import React from 'react';
import { PencilLine, Trash2, Flower2, Search } from 'lucide-react';

const KatalogHerbal = ({ herbalList, onEdit, onDelete }) => {
  return (
    <div className="katalog-container">
      <div className="header-section">
        <div className="header-text">
          <h1 className="title">Katalog Herbal</h1>
          <p className="subtitle">Semua herbal aktif yang tersedia di sistem</p>
        </div>
      </div>

      <div className="card-white">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tanaman</th>
                <th>Khasiat / Indikasi</th>
                <th>Kontraindikasi</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {herbalList.length > 0 ? herbalList.map((herb, idx) => (
                <tr key={herb.id || idx}>
                  <td className="col-name">
                    <div className="name-wrapper">
                      <div className="icon-box">
                        <Flower2 size={16} color="#2e7d32" />
                      </div>
                      <div>
                        <div className="h-name">{herb.nama}</div>
                        <div className="h-id">ID: {herb.id?.substring(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="col-text">
                    <p className="line-clamp">{herb.indikasi}</p>
                  </td>
                  <td className="col-text">
                    <p className="line-clamp warning">{herb.kontraindikasi}</p>
                  </td>
                  <td>
                    <div className="action-group">
                      <button 
                        className="btn-action edit" 
                        onClick={() => onEdit(herb)}
                        title="Edit Data"
                      >
                        <PencilLine size={16} />
                        <span>Edit</span>
                      </button>
                      <button 
                        className="btn-action delete" 
                        onClick={() => onDelete(herb.id)}
                        title="Hapus Data"
                      >
                        <Trash2 size={16} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="empty-row">
                    Belum ada data herbal dalam katalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .katalog-container { animation: fadeIn 0.4s ease; }
        .header-section { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-end; 
          margin-bottom: 25px; 
        }
        .title { font-size: 24px; font-weight: 700; color: #333; margin: 0; }
        .subtitle { color: #888; font-size: 14px; margin: 5px 0 0 0; }

        .card-white { 
          background: white; 
          border-radius: 20px; 
          border: 1px solid #f0f0f0; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          overflow: hidden;
        }

        .table-container { overflow-x: auto; }
        .custom-table { width: 100%; border-collapse: collapse; text-align: left; }
        
        .custom-table th { 
          padding: 18px 25px; 
          background: #fafafa; 
          color: #666; 
          font-size: 13px; 
          font-weight: 600; 
          border-bottom: 1px solid #eee;
        }

        .custom-table td { 
          padding: 20px 25px; 
          border-bottom: 1px solid #fcfcfc;
          vertical-align: middle;
        }

        .name-wrapper { display: flex; align-items: center; gap: 12px; }
        .icon-box { 
          background: #e8f5e9; 
          padding: 8px; 
          border-radius: 10px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
        }

        .h-name { font-weight: 600; color: #333; font-size: 14.5px; }
        .h-id { font-size: 11px; color: #aaa; }

        .line-clamp { 
          font-size: 13px; 
          color: #555; 
          margin: 0; 
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;  
          overflow: hidden;
          line-height: 1.5;
          max-width: 300px;
        }

        .warning { color: #666; font-style: italic; }

        .action-group { display: flex; gap: 10px; justify-content: center; }

        .btn-action {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid #eee;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .edit { color: #0288d1; }
        .edit:hover { background: #e3f2fd; border-color: #bbdefb; }

        .delete { color: #d32f2f; }
        .delete:hover { background: #ffebee; border-color: #ffcdd2; }

        .empty-row { text-align: center; padding: 50px; color: #aaa; font-style: italic; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default KatalogHerbal;