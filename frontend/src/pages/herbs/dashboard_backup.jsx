import { useAuth } from "../../context/AuthContext";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, HEALTH_RECORD_ABI } from "../../api/contract_abi";

export default function HerbalDoctorDashboard() {
  const { address, role, loading } = useAuth();
  const [form, setForm] = useState({
    id: null,
    name: "",
    indikasi: "",
    kontraindikasi: "",
    deskripsi: "",
  });
  const [herbalList, setHerbalList] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const router = useRouter();

  const fetchHerbalData = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/herbal/all");
      const data = await res.json();
      setHerbalList(Array.isArray(data) ? data : []);
    } catch (err) {
      setHerbalList([]);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      if (role === "herbal_doctor") fetchHerbalData();
      else router.push("/");
    }
  }, [role, loading]);

  // --- FUNGSI SIMPAN (ADD & UPDATE) ---
  const handleStoreHerbal = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const isUpdate = !!form.id;
      const url = isUpdate
        ? `http://localhost:5000/herbal/update/${form.id}`
        : "http://localhost:5000/herbal/store";

      const response = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal ke server");

      if (!window.ethereum) throw new Error("MetaMask tidak ditemukan!");

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        HEALTH_RECORD_ABI,
        signer,
      );

      alert(
        `Data AI & IPFS Berhasil. Silakan Konfirmasi di MetaMask untuk mencatat ${isUpdate ? "Perubahan" : "Data Baru"} ke Blockchain.`,
      );

      const tx = await contract.storeHerbalData(result.ipfs_cid);

      console.log("Menunggu konfirmasi blockchain...");
      await tx.wait();

      alert(
        `✅ Berhasil! Data ${isUpdate ? "Diperbarui" : "Disimpan"} di AI & Blockchain.`,
      );

      setForm({
        id: null,
        name: "",
        indikasi: "",
        kontraindikasi: "",
        deskripsi: "",
      });
      fetchHerbalData();
    } catch (error) {
      console.error("Error Store:", error);
      alert(`Gagal Simpan: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin menghapus data ini dari AI dan memverifikasi penghapusan di Blockchain?",
      )
    )
      return;

    setIsSaving(true); 
    try {
      const response = await fetch(
        `http://localhost:5000/herbal/delete/${id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal hapus di server");

      if (!window.ethereum) throw new Error("MetaMask tidak ditemukan!");

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        HEALTH_RECORD_ABI,
        signer,
      );

      alert(
        "Data di AI terhapus. Silakan Konfirmasi di MetaMask untuk memvalidasi penghapusan ini di Blockchain.",
      );

      const tx = await contract.storeHerbalData(`DELETED_${id}`);
      await tx.wait();

      alert(
        "✅ Berhasil! Data dihapus dari AI dan aksi tercatat di Blockchain.",
      );
      fetchHerbalData();
    } catch (error) {
      console.error("Error Delete:", error);
      alert(`Gagal Hapus: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (herb) => {
    setForm({
      id: herb.id,
      name: herb.nama,
      indikasi: herb.indikasi,
      kontraindikasi: herb.kontraindikasi,
      deskripsi: herb.deskripsi,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading || isInitialLoading)
    return (
      <p style={{ textAlign: "center", marginTop: "100px" }}>
        Memverifikasi...
      </p>
    );

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "1100px",
        margin: "0 auto",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ color: "#1b5e20" }}>🌿 Dashboard Pengetahuan Herbal</h1>

      <div style={authBoxStyle}>
        <p>
          <b>Dokter:</b> {address}
        </p>
      </div>

      <form onSubmit={handleStoreHerbal} style={formBoxStyle}>
        <h3 style={{ marginTop: 0 }}>
          {form.id ? "✏️ Edit Pengetahuan" : "➕ Tambah Pengetahuan Baru"}
        </h3>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontWeight: "bold" }}>Nama Tanaman</label>
          <input
            style={inputStyle}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Contoh: Sambiloto"
            required
          />
        </div>

        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Indikasi / Manfaat (Bebas)</label>
            <textarea
              style={smallTextareaStyle}
              value={form.indikasi}
              onChange={(e) => setForm({ ...form, indikasi: e.target.value })}
              placeholder="Contoh: Mengatasi asam lambung, anti-inflamasi, meredakan nyeri sendi..."
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Kontraindikasi / Pantangan (Bebas)</label>
            <textarea
              style={smallTextareaStyle}
              value={form.kontraindikasi}
              onChange={(e) =>
                setForm({ ...form, kontraindikasi: e.target.value })
              }
              placeholder="Contoh: Penderita batu empedu, gangguan pembekuan darah, ibu hamil..."
              required
            />
          </div>
        </div>

        <label style={{ fontWeight: "bold" }}>Deskripsi Lengkap:</label>
        <textarea
          style={textareaStyle}
          value={form.deskripsi}
          onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
          required
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit" disabled={isSaving} style={btnStyle}>
            {isSaving ? "⌛ Memproses..." : "Simpan Data"}
          </button>
          {form.id && (
            <button
              onClick={() =>
                setForm({
                  id: null,
                  name: "",
                  indikasi: "",
                  kontraindikasi: "",
                  deskripsi: "",
                })
              }
              style={cancelBtnStyle}
            >
              Batal
            </button>
          )}
        </div>
      </form>

      <h3 style={{ color: "#1b5e20", borderBottom: "2px solid #2e7d32" }}>
        📋 Database
      </h3>
      <div style={tableWrapper}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#2e7d32", color: "white" }}>
              <th style={tdStyle}>Nama</th>
              <th style={tdStyle}>Indikasi</th>
              <th style={tdStyle}>Kontraindikasi</th>
              <th style={tdStyle}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {herbalList.map((herb) => (
              <tr key={herb.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={tdStyle}>
                  <b>{herb.nama}</b>
                </td>
                <td style={tdStyle}>
                  <div style={cellScroll}>{herb.indikasi}</div>
                </td>
                <td style={tdStyle}>
                  <div style={cellScroll}>{herb.kontraindikasi}</div>
                </td>
                <td style={tdStyle}>
                  <button onClick={() => handleEdit(herb)} style={editBtnStyle}>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(herb.id)}
                    style={deleteBtnStyle}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- STYLES ---
const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontWeight: "bold",
  color: "#2c3e50",
  fontSize: "0.9rem",
};
const smallTextareaStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  minHeight: "80px",
  fontFamily: "inherit",
  fontSize: "0.9rem",
  boxSizing: "border-box",
};
const tagContainerStyle = {
  border: "1px solid #ccc",
  borderRadius: "6px",
  padding: "5px",
  display: "flex",
  flexWrap: "wrap",
  gap: "5px",
  background: "#fff",
  minHeight: "45px",
  alignItems: "center",
};
const tagStyle = {
  background: "#e8f5e9",
  color: "#2e7d32",
  padding: "4px 10px",
  borderRadius: "4px",
  fontSize: "12px",
  display: "flex",
  alignItems: "center",
  gap: "5px",
  border: "1px solid #c8e6c9",
};
const removeTagBtn = {
  background: "none",
  border: "none",
  color: "#2e7d32",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
};
const invisibleInputStyle = {
  border: "none",
  outline: "none",
  flex: 1,
  padding: "8px",
  minWidth: "150px",
};
const dropdownStyle = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  background: "white",
  border: "1px solid #ddd",
  borderRadius: "6px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  zIndex: 1000,
  maxHeight: "200px",
  overflowY: "auto",
};
const itemStyle = {
  padding: "10px",
  cursor: "pointer",
  fontSize: "13px",
  borderBottom: "1px solid #eee",
};
const formBoxStyle = {
  background: "#fff",
  padding: "25px",
  borderRadius: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  marginBottom: "40px",
};
const authBoxStyle = {
  background: "#e8f5e9",
  padding: "15px",
  borderRadius: "8px",
  marginBottom: "20px",
  borderLeft: "5px solid #2e7d32",
};
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
};
const inputStyle = {
  width: "100%",
  padding: "12px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  boxSizing: "border-box",
};
const textareaStyle = {
  width: "100%",
  height: "100px",
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  marginBottom: "15px",
};
const btnStyle = {
  flex: 1,
  padding: "15px",
  background: "#2e7d32",
  color: "white",
  border: "none",
  borderRadius: "6px",
  fontWeight: "bold",
  cursor: "pointer",
};
const cancelBtnStyle = {
  padding: "15px",
  background: "#757575",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};
const tdStyle = { padding: "15px", textAlign: "left", fontSize: "13px" };
const tableWrapper = {
  background: "white",
  borderRadius: "10px",
  overflow: "hidden",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
};
const cellScroll = {
  maxHeight: "60px",
  overflowY: "auto",
  fontSize: "11px",
  lineHeight: "1.4",
};
const editBtnStyle = {
  marginRight: "5px",
  padding: "5px 10px",
  background: "#0288d1",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};
const deleteBtnStyle = {
  padding: "5px 10px",
  background: "#d32f2f",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};
