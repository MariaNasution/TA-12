import React from 'react';
import { Leaf, Info, AlertCircle, Save, X } from 'lucide-react';

// Terima props dari Dashboard Utama
const TambahHerbal = ({ form, setForm, onSave, isSaving, onCancel }) => {
  
  return (
    <div className="tambah-herbal-wrapper">
      <div className="header-section">
        {/* Judul berubah otomatis jika ada form.id (Mode Edit) */}
        <h1 className="title">
          {form.id ? `✏️ Edit Pengetahuan: ${form.name}` : "➕ Tambah Pengetahuan Baru"}
        </h1>
        <p className="subtitle">
          {form.id 
            ? "Perbarui informasi herbal agar tetap akurat di database AI." 
            : "Masukkan data tanaman obat ke database pakar AI."}
        </p>
      </div>

      <form onSubmit={onSave} className="form-container">
        
        {/* SECTION 1: NAMA TANAMAN */}
        <div className="section-block">
          <div className="section-title">
            <Info size={18} /> Identitas Tanaman
          </div>
          <div className="input-group">
            <label>Nama Tanaman Herbal</label>
            <input 
              type="text" 
              placeholder="Contoh: Sambiloto, Temulawak, dsb..."
              // KUNCI: Value mengambil dari props form
              value={form.name || ""}
              onChange={(e) => setForm({...form, name: e.target.value})}
              required 
            />
          </div>
        </div>

        {/* SECTION 2: INDIKASI & KONTRAINDIKASI */}
        <div className="section-block mt-30">
          <div className="section-title">
            <Leaf size={18} /> Khasiat & Pantangan
          </div>
          <div className="grid-2-columns">
            <div className="input-group">
              <label>Indikasi / Manfaat</label>
              <textarea 
                placeholder="Contoh: Mengatasi asam lambung..."
                value={form.indikasi || ""}
                onChange={(e) => setForm({...form, indikasi: e.target.value})}
                required
              />
            </div>
            <div className="input-group">
              <label style={{ color: '#d32f2f' }}>Kontraindikasi / Pantangan</label>
              <textarea 
                placeholder="Contoh: Ibu hamil..."
                value={form.kontraindikasi || ""}
                onChange={(e) => setForm({...form, kontraindikasi: e.target.value})}
                required
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: DESKRIPSI LENGKAP */}
        <div className="section-block mt-30">
          <div className="section-title">
            <AlertCircle size={18} /> Deskripsi Lengkap
          </div>
          <div className="input-group">
            <label>Penjelasan Detail Tanaman</label>
            <textarea 
              className="large-area"
              placeholder="Tuliskan deskripsi lengkap..."
              value={form.deskripsi || ""}
              onChange={(e) => setForm({...form, deskripsi: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="button-group">
          <button type="submit" className="btn-submit" disabled={isSaving}>
            {isSaving ? "⌛ Memproses..." : (
              <><Save size={18} /> {form.id ? "Simpan Perubahan" : "Simpan Data Herbal"}</>
            )}
          </button>

          {/* Tombol Batal hanya muncul jika sedang mode EDIT */}
          {form.id && (
            <button type="button" className="btn-cancel" onClick={onCancel}>
              <X size={18} /> Batal Edit
            </button>
          )}
        </div>
      </form>

      <style jsx>{`
        .tambah-herbal-wrapper { animation: fadeIn 0.4s ease; }
        .header-section { margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: 700; color: #1b5e20; }
        .subtitle { color: #888; font-size: 14px; }

        .form-container { background: white; padding: 35px; border-radius: 20px; border: 1px solid #f0f0f0; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
        .mt-30 { margin-top: 30px; border-top: 1px solid #f9f9f9; padding-top: 25px; }
        .section-title { display: flex; align-items: center; gap: 10px; font-weight: 700; color: #2e7d32; margin-bottom: 20px; font-size: 16px; }

        .grid-2-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .input-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; }
        .input-group label { font-size: 13px; font-weight: 600; color: #555; }
        
        input, textarea {
          padding: 14px; border-radius: 12px; border: 1.5px solid #eee;
          background: #fcfcfc; font-size: 14px; font-family: inherit;
        }

        input:focus, textarea:focus { outline: none; border-color: #2e7d32; background: white; }
        textarea { min-height: 100px; resize: vertical; }
        .large-area { min-height: 150px; }

        .button-group { display: flex; gap: 12px; margin-top: 30px; }

        .btn-submit {
          flex: 2; padding: 16px; background: #2e7d32; color: white;
          border: none; border-radius: 14px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer;
        }

        .btn-cancel {
          flex: 1; padding: 16px; background: #f5f5f5; color: #666;
          border: 1px solid #ddd; border-radius: 14px; font-weight: 600;
          display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer;
        }

        .btn-submit:hover { background: #1b5e20; transform: translateY(-2px); }
        .btn-cancel:hover { background: #eeeeee; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default TambahHerbal;