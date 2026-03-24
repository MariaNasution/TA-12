// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract StorageHealthRecords {

    address public admin;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin allowed");
        _;
    }

    // =====================
    // 1. STRUCT (Struktur Data)
    // =====================

    struct MedicalRecord {
        string cid;
        uint256 timestamp;
        address createdBy; 
        bool isActive;
    }

    struct HerbalRecord {
        string cid;
        uint256 timestamp;
    }

    struct DoctorProfile {
        string name;
        string specialty;
        bool isApproved;
        bool isRegistered;
    }

    // =====================
    // 2. STORAGE (Penyimpanan State)
    // =====================

    mapping(address => string) public patientNames; 
    mapping(address => DoctorProfile) public doctors; 
    
    address[] public allUserAddresses;
    mapping(address => bool) public hasRegistered;  
    address[] public doctorAddresses;
    
    mapping(address => mapping(address => bool)) public pendingRequests;
    mapping(address => MedicalRecord[]) private medicalRecords;
    mapping(address => HerbalRecord[]) private herbalRecords;
    mapping(address => mapping(address => bool)) private accessPermission;
    mapping(address => bool) public verifiedDoctor;

    // =====================
    // 3. IDENTITY & REGISTRATION
    // =====================

    // Registrasi Dokter
    function registerDoctor(string memory _name, string memory _specialty) public {
        require(!doctors[msg.sender].isRegistered, "Sudah terdaftar");
        
        doctors[msg.sender] = DoctorProfile(_name, _specialty, false, true);
        
        if (!hasRegistered[msg.sender]) {
            allUserAddresses.push(msg.sender);
            hasRegistered[msg.sender] = true;
        }
        
        doctorAddresses.push(msg.sender);
    }

    function registerPatient(string memory _name) public {
        require(bytes(_name).length > 0, "Nama tidak boleh kosong");
        patientNames[msg.sender] = _name;
        
        if (!hasRegistered[msg.sender]) {
            allUserAddresses.push(msg.sender);
            hasRegistered[msg.sender] = true;
        }
    }

    // Admin menyetujui Dokter
    function approveDoctor(address _doctor) public onlyAdmin {
        require(doctors[_doctor].isRegistered, "Dokter belum mendaftar");
        doctors[_doctor].isApproved = true;
        verifiedDoctor[_doctor] = true; 
    }

    // Fungsi Reject Dokter (PENTING untuk selaras dengan tombol hapus admin)
    function rejectDoctor(address _doctor) public onlyAdmin {
        require(doctors[_doctor].isRegistered, "Dokter tidak terdaftar");
        require(!doctors[_doctor].isApproved, "Tidak bisa hapus dokter yang sudah disetujui");
        
        delete doctors[_doctor];
        verifiedDoctor[_doctor] = false;
    }

    // =====================
    // 4. GETTER UNTUK ADMIN (SELARAS DENGAN DASHBOARD)
    // =====================

    function getAllUsers() public view returns (address[] memory) {
        return allUserAddresses;
    }

    function getDoctorAddresses() public view returns (address[] memory) {
        return doctorAddresses;
    }

    // =====================
    // 5. MEDICAL ACCESS
    // =====================

    function checkAccess(address _patient, address _doctor) public view returns (bool) {
        return accessPermission[_patient][_doctor];
    }

    function requestAccess(address _patient) public {
        pendingRequests[_patient][msg.sender] = true;
    }

    function rejectAccess(address _doctor) public {
        require(pendingRequests[msg.sender][_doctor], "No pending request");
        pendingRequests[msg.sender][_doctor] = false;
    }

    function grantAccess(address _doctor) public {
        pendingRequests[msg.sender][_doctor] = false;
        accessPermission[msg.sender][_doctor] = true;
    }

    function revokeAccess(address _doctor) public {
        accessPermission[msg.sender][_doctor] = false;
    }

    // =====================
    // 6. DATA MANAGEMENT
    // =====================

    function storeMedicalRecord(address _patient, string memory _cid) public {
        require(
            msg.sender == _patient || accessPermission[_patient][msg.sender] == true, 
            "Access denied"
        );
        medicalRecords[_patient].push(
            MedicalRecord(_cid, block.timestamp, msg.sender, true)
        );
    }

    function deactivateMedicalRecord(address _patient, uint256 _index) public {
        require(_index < medicalRecords[_patient].length, "Index tidak valid");
        require(
            msg.sender == medicalRecords[_patient][_index].createdBy,
            "Hanya dokter pembuat yang bisa menonaktifkan"
        );
        medicalRecords[_patient][_index].isActive = false;
    }

    function getMedicalRecords(address _patient) public view returns (MedicalRecord[] memory) {
        require(
            msg.sender == _patient || accessPermission[_patient][msg.sender],
            "Access denied"
        );
        return medicalRecords[_patient];
    }

    function storeHerbalData(string memory _cid) public {
        require(verifiedDoctor[msg.sender] && doctors[msg.sender].isApproved, "Doctor not approved");
        herbalRecords[msg.sender].push(HerbalRecord(_cid, block.timestamp));
    }

    function getHerbalRecords(address _doctor) public view returns (HerbalRecord[] memory) {
        return herbalRecords[_doctor];
    }
}