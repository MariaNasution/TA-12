import React from 'react';

const InputDataMedis = ({ 
  approvedPatients, 
  patientAddr, 
  setPatientAddr, 
  medicalData, 
  setMedicalData, 
  handleSave, 
  txLoading, 
  isEditMode 
}) => {
  return (
    <div className="menu-wrapper">
      <div className="header-section">
        <h2 className="title">Tambah Data Medis</h2>
        <p className="subtitle">Input data medis untuk pasien yang sudah memberi akses</p>
      </div>

      <div className="alert-info">
        <span className="icon">ⓘ</span>
        <p>Kamu hanya bisa menambahkan data medis untuk pasien yang sudah menyetujui request aksesmu.</p>
      </div>

      <div className="card-white">
        <form onSubmit={handleSave} className="form-medical">
          <div className="form-group">
            <label>Pilih Pasien</label>
            <select 
              value={patientAddr} 
              onChange={(e) => setPatientAddr(e.target.value)}
              className="form-input"
              required
            >
              <option value="">-- Pilih Pasien Terdaftar --</option>
              {approvedPatients.map((p, idx) => (
                <option key={idx} value={p.address}>
                  {p.name} ({p.address.substring(0, 10)}...)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Diagnosa</label>
            <p className="hint">Tuliskan diagnosa pasien secara mendetail:</p>
            <textarea 
              value={medicalData}
              onChange={(e) => setMedicalData(e.target.value)}
              className="form-textarea"
              required
            />
          </div>

          <button type="submit" disabled={txLoading} className={`btn-submit ${isEditMode ? 'edit' : ''}`}>
            {txLoading ? "Memproses Transaksi..." : (isEditMode ? "Perbarui Data" : "Simpan ke Smart Contract")}
          </button>
        </form>
      </div>

      <style jsx>{`
        .menu-wrapper { animation: fadeIn 0.4s ease; }
        .alert-info { 
          display: flex; gap: 12px; background: #e3f2fd; 
          padding: 15px 20px; border-radius: 12px; margin-bottom: 25px;
          color: #1976d2; font-size: 14px; align-items: center;
        }
        .card-white { background: white; border-radius: 20px; padding: 30px; border: 1px solid #f0f0f0; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-weight: 600; margin-bottom: 8px; color: #333; }
        .hint { font-size: 12px; color: #777; margin-bottom: 8px; }
        .form-input, .form-textarea { 
          width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px;
          font-family: inherit; font-size: 14px;
        }
        .form-textarea { height: 150px; resize: vertical; }
        .btn-submit { 
          width: 100%; padding: 14px; border: none; border-radius: 10px;
          background: #2e7d32; color: white; font-weight: 600; cursor: pointer;
          transition: 0.3s;
        }
        .btn-submit:disabled { background: #ccc; cursor: not-allowed; }
        .btn-submit.edit { background: #ffa000; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default InputDataMedis;