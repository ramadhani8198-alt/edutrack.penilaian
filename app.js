/* ===========================
   STATE & DATA INITIALIZATION
   =========================== */
let appData = {
    students: [],
    assignments: [],
    grades: {},
    teachers: [],
    publishedReports: {}
};

// Session state — persistent via localStorage
let currentUser = null;

// Base URL API — otomatis ikut hostname server
const API_BASE = 'api.php';

async function apiCall(action, method = 'GET', body = null) {
    try {
        const opts = {
            method,
            headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`${API_BASE}?action=${action}`, opts);
        return await res.json();
    } catch (err) {
        console.error(`API Error [${action}]:`, err);
        return { status: 'error', message: 'Tidak dapat terhubung ke server.' };
    }
}

async function initApp() {
    try {
        const json = await apiCall('get_data');
        if (json.status === 'success') {
            appData = json.data;
            if (!appData.teachers)         appData.teachers = [];
            if (!appData.publishedReports) appData.publishedReports = {};
            if (!appData.grades)           appData.grades = {};
        } else {
            console.warn('Backend belum tersedia atau data kosong:', json);
        }
    } catch(err) {
        console.warn('Error menghubungkan ke Backend:', err);
    }
}

async function saveData() {
    try {
        await apiCall('save_data', 'POST', appData);
    } catch(err) {
        console.error('Gagal menyimpan ke server:', err);
    }
}

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);
const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
};

function getPredicate(score) {
    if(score >= 90) return 'A';
    if(score >= 80) return 'B';
    if(score >= 70) return 'C';
    return 'D';
}

function getPredicateFeedback(score) {
    if(score >= 90) return 'Sangat Baik, tingkatkan prestasimu.';
    if(score >= 80) return 'Baik, pahami teori lebih mendalam lagi.';
    if(score >= 70) return 'Cukup, perlu banyak berlatih.';
    return 'Kurang, wajib remedial dan pendalaman materi.';
}

/* ===========================
   SESSION PERSISTENCE
   =========================== */
function saveSession(user) {
    localStorage.setItem('edutrack_session', JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem('edutrack_session');
}

function loadSession() {
    const stored = localStorage.getItem('edutrack_session');
    if (stored) {
        try { return JSON.parse(stored); } catch(e) { return null; }
    }
    return null;
}

/* ===========================
   AUTHENTICATION & ROUTING
   =========================== */
function switchLoginTab(type) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => { f.style.display = 'none'; f.classList.remove('active'); });
    
    if(type === 'guru') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('form-login-guru').style.display = 'block';
    } else if(type === 'siswa') {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('form-login-siswa').style.display = 'block';
    } else if(type === 'register') {
        document.getElementById('form-register-siswa').style.display = 'block';
    } else if(type === 'register-guru') {
        document.getElementById('form-register-guru').style.display = 'block';
    }
}

// Login Guru — via API MySQL
document.getElementById('form-login-guru').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email-guru').value.trim();
    const password = document.getElementById('login-password-guru').value;
    const btn      = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Memverifikasi...';

    const result = await apiCall('login_guru', 'POST', { email, password });
    btn.disabled = false; btn.textContent = 'Masuk';

    if (result.status === 'success') {
        currentUser = result.user;
        saveSession(currentUser);
        await initApp();
        enterApp();
    } else {
        alert(result.message || 'Login gagal.');
    }
});

// Login Siswa — via API MySQL
document.getElementById('form-login-siswa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nis  = document.getElementById('login-nis-siswa').value.trim();
    const pass = document.getElementById('login-password-siswa').value;
    const btn  = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Memverifikasi...';

    const result = await apiCall('login_siswa', 'POST', { nis, password: pass });
    btn.disabled = false; btn.textContent = 'Masuk';

    if (result.status === 'success') {
        currentUser = result.user;
        saveSession(currentUser);
        await initApp();
        enterApp();
    } else {
        alert(result.message || 'Login gagal.');
    }
});

// Register Siswa — via API MySQL
document.getElementById('form-register-siswa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nis      = document.getElementById('reg-nis').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const name     = document.getElementById('reg-name').value.trim();
    const kelas    = document.getElementById('reg-kelas').value.trim();
    const gender   = document.getElementById('reg-gender').value;
    const password = document.getElementById('reg-password').value;
    const btn      = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Mendaftarkan...';

    const result = await apiCall('register_siswa', 'POST', { nis, email, name, kelas, gender, password });
    btn.disabled = false; btn.textContent = 'Daftar Akun';

    if (result.status === 'success') {
        alert('Berhasil mendaftar! Silakan login.');
        switchLoginTab('siswa');
        document.getElementById('login-nis-siswa').value = nis;
    } else {
        alert(result.message || 'Pendaftaran gagal.');
    }
});

// Register Guru — via API MySQL
document.getElementById('form-register-guru').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('reg-guru-name').value.trim();
    const email    = document.getElementById('reg-guru-email').value.trim();
    const password = document.getElementById('reg-guru-password').value;
    const btn      = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Mendaftarkan...';

    const result = await apiCall('register_guru', 'POST', { name, email, password });
    btn.disabled = false; btn.textContent = 'Daftar Akun Guru';

    if (result.status === 'success') {
        alert('Berhasil mendaftar! Silakan login.');
        switchLoginTab('guru');
        document.getElementById('login-email-guru').value = email;
    } else {
        alert(result.message || 'Pendaftaran gagal.');
    }
});

function logout() {
    currentUser = null;
    clearSession();
    document.getElementById('app-wrapper').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
}

function enterApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';
    document.getElementById('header-user-name').textContent = currentUser.name;
    document.getElementById('header-user-role').textContent = currentUser.role === 'guru' ? 'Guru' : 'Siswa';

    if(currentUser.role === 'guru') {
        document.getElementById('nav-guru').style.display = 'flex';
        document.getElementById('nav-siswa').style.display = 'none';
        
        let btnGantiPin  = document.getElementById('btn-ganti-pin');
        let btnGantiPass = document.getElementById('btn-ganti-password');
        if(btnGantiPin)  btnGantiPin.style.display  = 'flex';
        if(btnGantiPass) btnGantiPass.style.display = 'none';

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector('#nav-guru .nav-item').classList.add('active');
        goToSection('dashboard');
    } else {
        document.getElementById('nav-guru').style.display = 'none';
        document.getElementById('nav-siswa').style.display = 'flex';
        
        let btnGantiPin  = document.getElementById('btn-ganti-pin');
        let btnGantiPass = document.getElementById('btn-ganti-password');
        if(btnGantiPin)  btnGantiPin.style.display  = 'none';
        if(btnGantiPass) btnGantiPass.style.display = 'flex';

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector('#nav-siswa .nav-item').classList.add('active');
        goToSection('student-dash');
    }
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', async (e) => {
        e.preventDefault();
        await initApp();
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        goToSection(item.getAttribute('data-target'));
    });
});

const titles = {
    'dashboard':          { t: 'Dashboard',          s: 'Ringkasan aktivitas kelas.' },
    'students':           { t: 'Data Siswa',          s: 'Manajemen informasi siswa.' },
    'assignments':        { t: 'Tugas & Penilaian',   s: 'Kelola tugas (UH/PTS/PAS) dan nilai.' },
    'recap':              { t: 'Rekap & Peringkat',   s: 'Daftar rekapitulasi nilai berbobot.' },
    'report':             { t: 'Cetak E-Rapor',       s: 'Cetak lembar laporan resmi.' },
    'student-dash':       { t: 'Portal Siswa',        s: 'Lihat nilaimu dan feedback guru.' },
    'student-submission': { t: 'Kumpul Tugas',        s: 'Serahkan tugasmu secara online.' }
};

function goToSection(targetId) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    document.getElementById('page-title').textContent = titles[targetId].t;
    document.getElementById('page-subtitle').textContent = titles[targetId].s;

    if(targetId === 'dashboard')          renderDashboardGuru();
    if(targetId === 'students')           renderStudents();
    if(targetId === 'assignments')        renderAssignments();
    if(targetId === 'recap')              renderRecap();
    if(targetId === 'report')             renderReportFilters();
    if(targetId === 'student-dash')       renderDashboardSiswa();
    if(targetId === 'student-submission') renderPengumpulanSiswa();
}

/* ===========================
   AUTO-LOGIN DARI SESSION
   =========================== */
window.addEventListener('DOMContentLoaded', async () => {
    const session = loadSession();
    if (session) {
        currentUser = session;
        await initApp();
        enterApp();
    } else {
        switchLoginTab('guru');
    }

    // Setup password toggle untuk semua input password
    document.querySelectorAll('input[type="password"]').forEach(input => {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display  = 'block';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        input.style.paddingRight = '40px';

        const icon = document.createElement('i');
        icon.className = 'ph ph-eye';
        Object.assign(icon.style, {
            position: 'absolute', right: '12px', top: '50%',
            transform: 'translateY(-50%)', cursor: 'pointer',
            fontSize: '18px', color: '#64748b'
        });
        icon.addEventListener('click', () => {
            if (input.type === 'password') {
                input.type = 'text'; icon.className = 'ph ph-eye-slash';
            } else {
                input.type = 'password'; icon.className = 'ph ph-eye';
            }
        });
        wrapper.appendChild(icon);
    });
});

/* ===========================
   GURU: EXCEL IMPORT & SISWA MANUAL
   =========================== */
function handleExcelImport(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data     = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json     = XLSX.utils.sheet_to_json(worksheet);
            let addedCount = 0;
            const promises = [];
            json.forEach(row => {
                const nisStr    = row['NIS']            ? String(row['NIS']) : '';
                const nameStr   = row['Nama Lengkap']   || row['Nama'] || '';
                const emailStr  = row['Email']           || '';
                const kelasStr  = row['Kelas']           || '';
                const genderStr = row['Jenis Kelamin']   || row['JK'] || 'L';
                const passStr   = row['Password']        || row['Sandi'] || '';

                if(nisStr && nameStr) {
                    if(!appData.students.some(s => s.nis === nisStr)) {
                        const gender   = genderStr.trim().toUpperCase() === 'P' ? 'P' : 'L';
                        const password = passStr.trim() ? String(passStr) : nisStr;
                        promises.push(
                            apiCall('register_siswa', 'POST', {
                                nis: nisStr, email: emailStr, name: nameStr,
                                kelas: kelasStr, gender, password
                            }).then(res => { if(res.status === 'success') addedCount++; })
                        );
                    }
                }
            });
            await Promise.all(promises);
            await initApp();
            renderStudents();

            if (addedCount > 0) {
                // Tampilkan info bahwa siswa siap login
                let importedMsg = `✅ Import berhasil! ${addedCount} siswa baru ditambahkan sebagai akun.\n\n`;
                importedMsg    += `📋 INFO LOGIN SISWA:\n`;
                importedMsg    += `• Login sebagai: Siswa (tab Portal Siswa)\n`;
                importedMsg    += `• Gunakan NIS sebagai username\n`;
                importedMsg    += `• Password default = NIS siswa itu sendiri\n`;
                importedMsg    += `  (kecuali jika kolom Password diisi di file Excel)\n\n`;
                importedMsg    += `Siswa dapat mengganti password setelah login pertama.`;
                alert(importedMsg);
            } else {
                alert('Tidak ada siswa baru yang ditambahkan (NIS sudah terdaftar semua).');
            }

        } catch(err) {
            console.error(err); alert('Gagal membaca Excel.');
        }
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

window.downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
        ['NIS', 'Nama Lengkap', 'Email', 'Kelas', 'Jenis Kelamin', 'Password'],
        ['1001', 'Budi Santoso',  'budi@email.com', '10A', 'L', 'rahasia123'],
        ['1002', 'Siti Aminah',   'siti@email.com', '10B', 'P', '']
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Siswa');
    XLSX.writeFile(wb, 'Template_Import_Siswa.xlsx');
};

function openModal(id)  { document.getElementById(id).classList.add('active'); }
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    if(id === 'student-modal') {
        document.getElementById('student-form').reset();
        document.getElementById('student-id').value = '';
        // Sembunyikan info login saat modal ditutup
        const infoBox = document.getElementById('student-login-info');
        if (infoBox) infoBox.style.display = 'none';
    }
    if(id === 'assignment-modal')      document.getElementById('assignment-form').reset();
    if(id === 'pin-modal')             document.getElementById('pin-form')?.reset();
    if(id === 'password-modal')        document.getElementById('password-form')?.reset();
    if(id === 'forgot-password-modal') document.getElementById('forgot-password-form')?.reset();
}

// Buka modal untuk edit siswa (isi form dengan data existing)
window.openEditStudent = (id) => {
    const s = appData.students.find(st => st.id === id);
    if (!s) return;
    document.getElementById('student-id').value       = s.id;
    document.getElementById('student-nis').value      = s.nis;
    document.getElementById('student-email').value    = s.email || '';
    document.getElementById('student-name').value     = s.name;
    document.getElementById('student-kelas').value    = s.kelas || '';
    document.getElementById('student-gender').value   = s.gender || 'L';
    document.getElementById('student-password').value = '';
    document.getElementById('student-modal-title').textContent = 'Edit Data Siswa';
    const infoBox = document.getElementById('student-login-info');
    if (infoBox) infoBox.style.display = 'none';
    openModal('student-modal');
};

// Reset judul modal saat Tambah Baru
window.openAddStudent = () => {
    document.getElementById('student-form').reset();
    document.getElementById('student-id').value = '';
    document.getElementById('student-modal-title').textContent = 'Tambah Siswa Baru';
    const infoBox = document.getElementById('student-login-info');
    if (infoBox) infoBox.style.display = 'none';
    openModal('student-modal');
};

// Submit Form Tambah/Edit Siswa
document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id      = document.getElementById('student-id').value.trim();
    const nis     = document.getElementById('student-nis').value.trim();
    const email   = document.getElementById('student-email').value.trim();
    const name    = document.getElementById('student-name').value.trim();
    const kelas   = document.getElementById('student-kelas').value.trim();
    const gender  = document.getElementById('student-gender').value;
    const pwInput = document.getElementById('student-password').value.trim();
    const btn     = e.target.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    const isEdit = !!id;

    if (isEdit) {
        // ── MODE EDIT — update data siswa yang sudah ada
        const result = await apiCall('update_student', 'POST', {
            id, nis, email, name, kelas, gender,
            password: pwInput  // kosong = tidak ubah password
        });
        btn.disabled = false;
        btn.textContent = 'Simpan';

        if (result.status === 'success') {
            await initApp();
            renderStudents();
            closeModal('student-modal');
            showToast('✅ Data siswa berhasil diperbarui!');
        } else {
            alert(result.message || 'Gagal memperbarui data siswa.');
        }

    } else {
        // ── MODE TAMBAH BARU — daftarkan sebagai akun siswa baru
        const finalPassword = pwInput !== '' ? pwInput : nis; // default password = NIS
        const result = await apiCall('register_siswa', 'POST', {
            nis, email, name, kelas, gender, password: finalPassword
        });
        btn.disabled = false;
        btn.textContent = 'Simpan';

        if (result.status === 'success') {
            await initApp();
            renderStudents();

            // Tampilkan info login siswa yang baru didaftarkan
            const infoBox  = document.getElementById('student-login-info');
            const infoNis  = document.getElementById('info-nis');
            const infoPass = document.getElementById('info-password');
            if (infoBox && infoNis && infoPass) {
                infoNis.textContent  = nis;
                infoPass.textContent = finalPassword;
                infoBox.style.display = 'block';
            }
            // Reset form tapi tetap buka modal (supaya info login terlihat)
            document.getElementById('student-form').reset();
            document.getElementById('student-id').value = '';
            document.getElementById('student-modal-title').textContent = 'Tambah Siswa Baru';
        } else {
            alert(result.message || 'Gagal mendaftarkan siswa.');
        }
    }
});

// Ganti Password Guru — via API
document.getElementById('pin-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPin = document.getElementById('old-pin').value;
    const newPin = document.getElementById('new-pin').value;

    const result = await apiCall('change_password', 'POST', {
        userId: currentUser.id,
        role: 'guru',
        oldPassword: oldPin,
        newPassword: newPin
    });

    if (result.status === 'success') {
        alert('Password guru berhasil diubah!');
        closeModal('pin-modal');
    } else {
        alert(result.message || 'Gagal mengubah password.');
    }
});

/* ===========================
   LUPA PASSWORD — Tab Role Switcher
   =========================== */
function switchFPTab(role) {
    document.querySelectorAll('.fp-tab-btn').forEach(btn => {
        btn.classList.toggle('btn-primary', btn.dataset.role === role);
        btn.classList.toggle('btn-outline',  btn.dataset.role !== role);
    });
    const input = document.getElementById('forgot-identifier');
    const label = document.getElementById('fp-label');
    const hint  = document.getElementById('fp-hint');
    // Reset result box
    document.getElementById('fp-result-box').style.display = 'none';

    if (role === 'guru') {
        label.textContent       = 'Email Guru';
        input.placeholder       = 'Masukkan email guru yang terdaftar';
        hint.textContent        = 'Masukkan email yang terdaftar saat mendaftar.';
    } else {
        label.textContent       = 'NIS atau Email Siswa';
        input.placeholder       = 'Masukkan NIS atau Email Siswa';
        hint.textContent        = 'Bisa menggunakan NIS (Nomor Induk Siswa) atau email.';
    }
}

/* ===========================
   LUPA PASSWORD — Reset via API
   Mendukung: Email Guru, Email Siswa, NIS Siswa
   =========================== */
document.getElementById('forgot-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const roleTab    = document.querySelector('.fp-tab-btn.active')?.dataset.role || 'auto';
    const identifier = document.getElementById('forgot-identifier').value.trim();
    const btn        = e.target.querySelector('button[type="submit"]');

    if (!identifier) return alert('Mohon isi email atau NIS terlebih dahulu.');

    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner"></i> Memproses...';

    const result = await apiCall('forgot_password', 'POST', { identifier, role: roleTab });
    btn.disabled = false;
    btn.innerHTML = '<i class="ph ph-paper-plane-tilt" style="margin-right:8px;"></i> Reset Password';

    if (result.status === 'success') {
        // Tampilkan password baru kepada pengguna
        const msg = document.getElementById('fp-result-msg');
        const box = document.getElementById('fp-result-box');
        box.style.display = 'block';
        msg.innerHTML = `
            <div style="text-align:center;">
                <i class="ph ph-check-circle" style="font-size:40px; color:#22c55e; margin-bottom:8px;"></i>
                <p style="font-weight:600; margin-bottom:4px;">Password ${result.role === 'guru' ? 'Guru' : 'Siswa'} Berhasil Direset!</p>
                <p style="color:var(--text-muted); font-size:13px;">Halo <strong>${result.name}</strong>, gunakan password baru berikut untuk login:</p>
                <div style="background:#1e293b; color:#f1f5f9; font-family:monospace; font-size:22px; letter-spacing:4px; padding:16px; border-radius:8px; margin:12px 0;">
                    ${result.newPassword}
                </div>
                <p style="font-size:12px; color:#ef4444;">Segera ganti password ini setelah login!</p>
            </div>
        `;
    } else {
        alert(result.message || 'Akun tidak ditemukan.');
    }
});

// Ganti Password Siswa — via API
document.getElementById('password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPass = document.getElementById('old-password').value;
    const newPass = document.getElementById('new-password').value;

    const result = await apiCall('change_password', 'POST', {
        userId: currentUser.id,
        role: 'siswa',
        oldPassword: oldPass,
        newPassword: newPass
    });

    if (result.status === 'success') {
        alert('Password berhasil diubah!');
        closeModal('password-modal');
    } else {
        alert(result.message || 'Gagal mengubah password.');
    }
});

async function deleteStudent(id) {
    if(confirm('Hapus siswa ini beserta semua nilai terkait?')) {
        const result = await apiCall('delete_student', 'POST', { id });
        if (result.status === 'success') {
            await initApp();
            renderStudents();
            showToast('🗑️ Siswa berhasil dihapus.');
        } else {
            alert(result.message || 'Gagal menghapus siswa.');
        }
    }
}

// Toast notifikasi ringan
function showToast(msg) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        Object.assign(toast.style, {
            position: 'fixed', bottom: '24px', right: '24px',
            background: '#1e293b', color: '#fff', padding: '12px 20px',
            borderRadius: '10px', fontWeight: '600', fontSize: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: '99999',
            transition: 'opacity 0.4s', opacity: '1'
        });
        document.body.appendChild(toast);
    }
    toast.textContent  = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

function renderStudents(filter = '') {
    const tbody   = document.getElementById('students-table-body');
    tbody.innerHTML = '';
    const filtered = appData.students.filter(s =>
        s.name.toLowerCase().includes(filter.toLowerCase()) || s.nis.includes(filter)
    );
    if(filtered.length === 0) return tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Data tidak ditemukan.</td></tr>`;

    filtered.forEach(student => {
        const passInfo = student.password && student.password !== student.nis
            ? `<span style="color:var(--text-muted); font-size:12px;"><i class="ph ph-lock"></i> Custom</span>`
            : `<span style="color:var(--text-muted); font-size:12px;"><i class="ph ph-lock"></i> = NIS</span>`;
        tbody.innerHTML += `
            <tr>
                <td>${student.nis}</td>
                <td><strong>${student.name}</strong></td>
                <td>${student.email || '-'}</td>
                <td>${student.kelas || '-'}</td>
                <td>${student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                <td>${passInfo}</td>
                <td style="display:flex; gap:6px;">
                    <button class="btn-icon" title="Edit" onclick="openEditStudent('${student.id}')" style="color:var(--primary);"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn-icon delete-btn" title="Hapus" onclick="deleteStudent('${student.id}')"><i class="ph ph-trash"></i></button>
                </td>
            </tr>`;
    });
}
document.getElementById('search-student').addEventListener('input', (e) => renderStudents(e.target.value));


/* ===========================
   GURU: TUGAS & PENILAIAN
   =========================== */
document.getElementById('assignment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = generateId();
    appData.assignments.push({
        id,
        title:    document.getElementById('assignment-title').value,
        type:     document.getElementById('assignment-type').value,
        kkm:      parseInt(document.getElementById('assignment-kkm').value) || 75,
        deadline: document.getElementById('assignment-deadline').value
    });
    appData.grades[id] = {};
    await saveData();
    await initApp();
    renderAssignments();
    closeModal('assignment-modal');
});

function renderAssignments() {
    document.getElementById('assignment-filter').innerHTML = `
        <option value="ALL">Semua Tipe</option>
        <option value="UH">UH (Harian)</option>
        <option value="PTS">PTS</option>
        <option value="PAS">PAS</option>
        <option value="PRAKTIK">Praktik</option>
    `;
    document.getElementById('assignment-filter').onchange = (e) => renderFilteredAssignments(e.target.value);
    renderFilteredAssignments('ALL');
}

function renderFilteredAssignments(filterType) {
    const list     = document.getElementById('assignment-list');
    list.innerHTML = '';
    let filtered   = appData.assignments;
    if(filterType !== 'ALL') filtered = filtered.filter(a => a.type === filterType);

    if(filtered.length === 0) return list.innerHTML = `<div class="empty-state">Belum ada evaluasi untuk kategori ini.</div>`;

    filtered.forEach(task => {
        let labelColor = task.type === 'PRAKTIK' ? 'bg-purple' : 'bg-blue';
        list.innerHTML += `
            <div class="assignment-card">
                <div class="assignment-info">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                        <span class="badge ${labelColor}" style="color:#fff; padding:2px 6px;">${task.type}</span>
                        <h3 style="margin:0; font-size:18px;">${task.title}</h3>
                    </div>
                    <p>KKM: <strong>${task.kkm}</strong> <span style="margin:0 8px;">|</span> <i class="ph ph-calendar"></i> Tenggat: ${formatDate(task.deadline)}</p>
                </div>
                <button class="btn btn-outline" onclick="openGrading('${task.id}', '${task.title} [${task.type}]')">Lihat &amp; Nilai</button>
            </div>`;
    });
}

let currentAssignId = null;
window.openGrading = async (taskId, title) => {
    currentAssignId = taskId;
    document.getElementById('grading-area').style.display = 'flex';
    document.getElementById('grading-title').textContent  = 'Pemeriksaan: ' + title;
    await initApp();
    renderGradingTable();
};
window.closeGradingArea = () => { document.getElementById('grading-area').style.display = 'none'; currentAssignId = null; };

window.renderGradingTable = () => {
    const tbody = document.getElementById('grading-table-body');
    tbody.innerHTML = '';
    if(appData.students.length === 0) return tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Belum ada siswa</td></tr>`;
    if(!appData.grades[currentAssignId]) appData.grades[currentAssignId] = {};

    let currentTask = appData.assignments.find(a => a.id === currentAssignId);
    let myKkm = currentTask ? currentTask.kkm : 75;

    appData.students.forEach(student => {
        if(!appData.grades[currentAssignId][student.id]) {
            appData.grades[currentAssignId][student.id] = { status: 'pending', file: null, score: 0, feedback: '' };
        }
        const data = appData.grades[currentAssignId][student.id];
        let fileLink = '<span style="color:var(--text-muted); font-size:13px;">- blm kumpul -</span>';
        if(data.file) {
            fileLink = `<a href="uploads/${data.file}" target="_blank" style="color:var(--info); text-decoration:none; font-weight:600;">
                          <i class="ph ph-file-arrow-down"></i> ${data.file.substring(0,15)}...
                        </a>`;
        }
        let isRemedial  = (data.status === 'done' && data.score < myKkm);
        let scoreStyle  = isRemedial ? 'color:var(--danger); border-color:var(--danger);' : '';

        tbody.innerHTML += `
            <tr>
                <td><strong>${student.name}</strong></td>
                <td>
                    ${data.status === 'done' ? '<span class="badge done">Diserahkan</span>' : '<span class="badge pending">Menunggu</span>'}
                    <br><div style="margin-top:4px;">${fileLink}</div>
                </td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:12px;">Skor:</span>
                            <input type="number" class="form-control grade-input" style="${scoreStyle}" id="score-${student.id}" value="${data.score||0}" max="100">
                            ${isRemedial ? '<span style="color:var(--danger); font-size:12px; font-weight:bold;">Remedial</span>' : ''}
                        </div>
                        <input type="text" class="form-control" style="font-size:13px;" id="fb-${student.id}" placeholder="Catatan Umpan Balik Guru" value="${data.feedback || ''}">
                    </div>
                </td>
                <td style="vertical-align:middle;">
                    <button class="btn btn-primary" style="padding:8px 12px;" onclick="saveIndividualGrade('${student.id}')"><i class="ph ph-floppy-disk"></i> Simpan</button>
                </td>
            </tr>`;
    });
};

window.saveIndividualGrade = async (studentId) => {
    const val = document.getElementById(`score-${studentId}`).value;
    const fb  = document.getElementById(`fb-${studentId}`).value;

    await initApp();
    if(!appData.grades[currentAssignId])           appData.grades[currentAssignId] = {};
    if(!appData.grades[currentAssignId][studentId]) appData.grades[currentAssignId][studentId] = {};

    appData.grades[currentAssignId][studentId].score    = parseInt(val) || 0;
    appData.grades[currentAssignId][studentId].feedback = fb;
    appData.grades[currentAssignId][studentId].status   = 'done';

    await saveData();
    renderGradingTable();
};

/* ===========================
   GURU: REKAP & E-RAPOR
   =========================== */
window.calculateRanking = async () => { await initApp(); renderRecap(); };

function getStudentSummary(student) {
    let tasksUH  = appData.assignments.filter(a => a.type === 'UH');
    let tasksPTS = appData.assignments.filter(a => a.type === 'PTS');
    let tasksPAS = appData.assignments.filter(a => a.type === 'PAS');
    let tasksPRK = appData.assignments.filter(a => a.type === 'PRAKTIK');

    let getAvg = (taskList) => {
        if(taskList.length === 0) return 0;
        let sum = 0;
        taskList.forEach(t => sum += ((appData.grades[t.id] && appData.grades[t.id][student.id]) ? appData.grades[t.id][student.id].score || 0 : 0));
        return sum / taskList.length;
    };

    let uhAvg  = getAvg(tasksUH);
    let ptsAvg = getAvg(tasksPTS);
    let pasAvg = getAvg(tasksPAS);
    let prkAvg = getAvg(tasksPRK);

    let nilaiPengetahuan = 0;
    if(tasksUH.length > 0 || tasksPTS.length > 0 || tasksPAS.length > 0) {
        let wUH  = tasksUH.length  > 0 ? 0.4 : 0;
        let wPTS = tasksPTS.length > 0 ? 0.3 : 0;
        let wPAS = tasksPAS.length > 0 ? 0.3 : 0;
        let totalW = wUH + wPTS + wPAS;
        if(totalW > 0) nilaiPengetahuan = ((uhAvg * wUH) + (ptsAvg * wPTS) + (pasAvg * wPAS)) / totalW;
    }

    return { ...student, uhAvg, ptsAvg, pasAvg, prkAvg, pengetahuan: Math.round(nilaiPengetahuan) };
}

function renderRecap() {
    const thead = document.getElementById('recap-table-header');
    const tbody = document.getElementById('recap-table-body');

    thead.innerHTML = `
        <th>Rank</th><th>Nama</th><th>Kelas</th>
        <th>Rata2 UH</th><th>Nilai PTS</th><th>Nilai PAS</th>
        <th>NA Pengetahuan</th><th>NA Praktik</th>
        <th>Predikat</th>
    `;

    let studentsSum = appData.students.map(std => getStudentSummary(std));
    studentsSum.sort((a,b) => (b.pengetahuan + b.prkAvg) - (a.pengetahuan + a.prkAvg));

    tbody.innerHTML = '';
    if(studentsSum.length === 0) return tbody.innerHTML = `<tr><td colspan="9" class="empty-state">Tidak ada data.</td></tr>`;

    studentsSum.forEach((s, i) => {
        let pred      = getPredicate(s.pengetahuan);
        let predClass = (pred === 'D' || pred === 'C') ? 'pending' : 'done';
        tbody.innerHTML += `
            <tr>
                <td><strong>#${i+1}</strong></td>
                <td>${s.name}</td>
                <td>${s.kelas || '-'}</td>
                <td>${Math.round(s.uhAvg)}</td>
                <td>${Math.round(s.ptsAvg)}</td>
                <td>${Math.round(s.pasAvg)}</td>
                <td><strong>${s.pengetahuan}</strong></td>
                <td><strong>${Math.round(s.prkAvg)}</strong></td>
                <td><span class="badge ${predClass}">Predikat ${pred}</span></td>
            </tr>`;
    });
}

function renderReportFilters() {
    const select = document.getElementById('report-student-select');
    select.innerHTML = '<option value="">-- Pilih Siswa --</option>';
    appData.students.forEach(s => select.innerHTML += `<option value="${s.id}">${s.nis} - ${s.name}</option>`);
}

window.generateReport = async () => {
    await initApp();
    const sId = document.getElementById('report-student-select').value;
    if(!sId) return alert('Pilih Siswa!');

    const student = appData.students.find(s => s.id === sId);
    const summary = getStudentSummary(student);

    let avgKkm      = appData.assignments.reduce((sum, a) => sum + parseInt(a.kkm), 0) / (appData.assignments.length || 1);
    let standardKkm = Math.round(avgKkm) || 75;

    let tableDetailRows = appData.assignments.map(t => {
        let score = 0, fb = '-';
        if(appData.grades[t.id] && appData.grades[t.id][student.id]) {
            score = appData.grades[t.id][student.id].score || 0;
            fb    = appData.grades[t.id][student.id].feedback || '-';
        }
        let warn = score < t.kkm ? `color:red;` : '';
        return `<tr><td style="text-align:left;">${t.title} <small>(${t.type})</small></td><td>${t.kkm}</td><td style="${warn}">${score}</td><td style="text-align:left; font-size:12px;">${fb}</td></tr>`;
    }).join('');

    document.getElementById('printable-area').innerHTML = `
        <div class="report-header">
            <h2>CAPAIAN HASIL BELAJAR SISWA (RAPOR)</h2>
            <p>Mata Pelajaran Sistem EduTrack</p>
        </div>
        <div class="student-identity">
            <strong>Nama</strong><span>: ${student.name}</span>
            <strong>NIS</strong><span>: ${student.nis}</span>
            <strong>Kelas</strong><span>: ${student.kelas || '-'}</span>
            <strong>KKM Rata-rata</strong><span>: ${standardKkm}</span>
        </div>
        <h4 style="margin:24px 0 8px; border-bottom:1px solid #ccc; padding-bottom:8px;">A. Nilai Pengetahuan &amp; Keterampilan</h4>
        <table class="report-table">
            <thead><tr><th width="30%">Kategori</th><th width="10%">Nilai</th><th width="10%">Predikat</th><th width="50%">Deskripsi</th></tr></thead>
            <tbody>
                <tr>
                    <td style="text-align:left"><strong>Pengetahuan</strong><br><small>(UH, PTS, PAS)</small></td>
                    <td><strong>${summary.pengetahuan}</strong><br><small>${summary.pengetahuan >= standardKkm ? 'Tuntas' : 'Tidak Tuntas'}</small></td>
                    <td>${getPredicate(summary.pengetahuan)}</td>
                    <td style="text-align:left; font-size:13px;">${getPredicateFeedback(summary.pengetahuan)}</td>
                </tr>
                <tr>
                    <td style="text-align:left"><strong>Keterampilan / Praktik</strong></td>
                    <td><strong>${Math.round(summary.prkAvg)}</strong><br><small>${summary.prkAvg >= standardKkm ? 'Tuntas' : 'Tidak Tuntas'}</small></td>
                    <td>${getPredicate(summary.prkAvg)}</td>
                    <td style="text-align:left; font-size:13px;">${getPredicateFeedback(summary.prkAvg)}</td>
                </tr>
            </tbody>
        </table>
        <h4 style="margin:24px 0 8px;">B. Rincian Evaluasi</h4>
        <table class="report-table">
            <thead><tr><th>Nama Evaluasi</th><th>KKM</th><th>Nilai</th><th>Catatan Guru</th></tr></thead>
            <tbody>${tableDetailRows}</tbody>
        </table>
        <div class="report-signature"><div class="signature-box"><p>Wali Kelas,</p><strong>${currentUser.name}</strong></div></div>
    `;
    document.getElementById('printable-area').style.display = 'block';
    document.getElementById('btn-publish-report').disabled  = false;
    document.getElementById('btn-print-pdf').disabled       = false;
    document.getElementById('btn-print-xlsx').disabled      = false;
};

window.publishReport = async () => {
    const sId = document.getElementById('report-student-select').value;
    if(!sId) return alert('Pilih Siswa!');
    await initApp();
    if(!appData.publishedReports) appData.publishedReports = {};
    appData.publishedReports[sId] = true;
    await saveData();
    alert('Rapor berhasil di-publish! Siswa dapat melihat dari portal mereka.');
};

window.printReportPDF = () => {
    const element = document.getElementById('printable-area');
    const select  = document.getElementById('report-student-select');
    const name    = select.options[select.selectedIndex].text;
    html2pdf().set({
        margin: 0.5, filename: `Rapor_${name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
};

window.printReportXLSX = () => {
    const sId     = document.getElementById('report-student-select').value;
    const student = appData.students.find(s => s.id === sId);
    if(!student) return;
    const summary = getStudentSummary(student);
    let wb = XLSX.utils.book_new();
    let ws_data = [
        ['CAPAIAN HASIL BELAJAR SISWA (RAPOR)'], [],
        ['Nama Lengkap', student.name], ['NIS', student.nis], ['Kelas', student.kelas || '-'], [],
        ['A. Nilai Pengetahuan & Keterampilan'],
        ['Kategori', 'Nilai Akhir', 'Predikat', 'Deskripsi'],
        ['Pengetahuan', summary.pengetahuan, getPredicate(summary.pengetahuan), getPredicateFeedback(summary.pengetahuan)],
        ['Keterampilan/Praktik', Math.round(summary.prkAvg), getPredicate(summary.prkAvg), getPredicateFeedback(summary.prkAvg)],
        [], ['B. Rincian Evaluasi'], ['Nama Evaluasi', 'KKM', 'Nilai', 'Catatan']
    ];
    appData.assignments.forEach(t => {
        let score = 0, fb = '-';
        if(appData.grades[t.id] && appData.grades[t.id][student.id]) {
            score = appData.grades[t.id][student.id].score || 0;
            fb    = appData.grades[t.id][student.id].feedback || '-';
        }
        ws_data.push([`${t.title} (${t.type})`, t.kkm, score, fb]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws_data), 'Rapor');
    XLSX.writeFile(wb, `Rapor_${student.nis}_${student.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
};

/* ===========================
   DASHBOARD RENDERING
   =========================== */
function renderDashboardGuru() {
    document.getElementById('stat-total-students').textContent   = appData.students.length;
    document.getElementById('stat-total-assignments').textContent = appData.assignments.length;

    // Top 3 siswa
    const topList = document.getElementById('top-students-list');
    let summaries = appData.students.map(s => getStudentSummary(s));
    summaries.sort((a,b) => (b.pengetahuan + b.prkAvg) - (a.pengetahuan + a.prkAvg));
    topList.innerHTML = summaries.length === 0
        ? '<li class="empty-state">Belum ada data siswa.</li>'
        : summaries.slice(0,3).map((s,i) => `
            <li style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border);">
                <span>${['🥇','🥈','🥉'][i]} ${s.name} <small style="color:var(--text-muted)">(${s.kelas||'-'})</small></span>
                <strong>${s.pengetahuan}</strong>
            </li>`).join('');

    // Tugas terakhir
    const recentList = document.getElementById('recent-assignments-list');
    recentList.innerHTML = appData.assignments.length === 0
        ? '<li class="empty-state">Belum ada tugas.</li>'
        : [...appData.assignments].reverse().slice(0,3).map(a => `
            <li style="padding:6px 0; border-bottom:1px solid var(--border);">
                <span class="badge bg-blue" style="color:#fff; font-size:11px;">${a.type}</span>
                ${a.title} — <small style="color:var(--text-muted)">KKM ${a.kkm}</small>
            </li>`).join('');

    // Rata-rata kelas
    let allScores = [];
    appData.students.forEach(s => allScores.push(getStudentSummary(s).pengetahuan));
    const avg = allScores.length > 0 ? Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length) : 0;
    const statAvg = document.getElementById('stat-class-average');
    if(statAvg) statAvg.textContent = avg;
}

function renderDashboardSiswa() {
    let totAssignments = appData.assignments.length;
    let completed = 0;
    appData.assignments.forEach(t => {
        if(appData.grades[t.id] && appData.grades[t.id][currentUser.id]) {
            let d = appData.grades[t.id][currentUser.id];
            if(d.file || d.score > 0 || d.status === 'done') completed++;
        }
    });
    const summary = getStudentSummary(currentUser);

    document.getElementById('siswa-total-tugas').textContent  = totAssignments;
    document.getElementById('siswa-tugas-selesai').textContent = completed;
    document.getElementById('siswa-rata-nilai').textContent   = summary.pengetahuan;

    if(appData.publishedReports && appData.publishedReports[currentUser.id]) {
        document.getElementById('student-report-widget').style.display = 'block';
    } else {
        document.getElementById('student-report-widget').style.display = 'none';
    }

    const tableDiv = document.getElementById('siswa-my-grades-table');
    tableDiv.innerHTML = '';
    appData.assignments.forEach(t => {
        let stats = { file: '-', score: 0, status: 'Belum', fb: '' };
        let fileLinkHtml = '-';
        if(appData.grades[t.id] && appData.grades[t.id][currentUser.id]) {
            let d = appData.grades[t.id][currentUser.id];
            stats.score  = d.score || 0;
            stats.fb     = d.feedback || '-';
            stats.status = (d.status === 'done' || d.file) ? '<span class="badge done">Selesai</span>' : '<span class="badge pending">Menunggu</span>';
            if(d.file) fileLinkHtml = `<a href="uploads/${d.file}" target="_blank" style="color:var(--text-dark)"><i class="ph ph-file"></i> Terkirim</a>`;
        }
        let isRemedial = stats.score < t.kkm && stats.score > 0;
        tableDiv.innerHTML += `
            <tr>
                <td><strong>${t.title}</strong></td>
                <td><span class="badge bg-blue" style="color:#fff">${t.type}</span></td>
                <td>${stats.status}</td>
                <td>${fileLinkHtml}</td>
                <td><strong style="${isRemedial ? 'color:var(--danger)' : ''}">${stats.score}</strong><br><small style="color:var(--text-muted)">KKM: ${t.kkm}</small></td>
                <td style="font-style:italic; font-size:13px; color:var(--text-muted);">${stats.fb}</td>
            </tr>`;
    });
}

function renderPengumpulanSiswa() {
    const list = document.getElementById('siswa-tugas-list');
    list.innerHTML = '';
    if(appData.assignments.length === 0) {
        return list.innerHTML = `<p class="empty-state" style="background:#fff; border-radius:12px; padding: 40px !important;">Belum ada tugas dari Bapak Guru untuk saat ini.</p>`;
    }
    appData.assignments.forEach(t => {
        if(!appData.grades[t.id]) appData.grades[t.id] = {};
        if(!appData.grades[t.id][currentUser.id]) appData.grades[t.id][currentUser.id] = { status: 'pending', file: null, score: 0, feedback: '' };
        let data   = appData.grades[t.id][currentUser.id];
        let isDone = !!data.file;
        list.innerHTML += `
            <div class="assignment-card" style="flex-direction: column; align-items:flex-start; gap: 16px;">
                <div style="display:flex; justify-content:space-between; width:100%">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="badge ${t.type==='PRAKTIK'?'bg-purple':'bg-blue'}" style="color:#fff">${t.type}</span>
                            <h3 style="font-size:20px; margin:0;">${t.title}</h3>
                        </div>
                        <p style="color:var(--text-muted); font-size:14px; margin-top:4px;"><i class="ph ph-calendar-blank"></i> Tenggat: ${formatDate(t.deadline)} | KKM: ${t.kkm}</p>
                    </div>
                </div>
                <div style="background: ${isDone ? '#f0fdf4' : '#fafbfc'}; border: 1px solid ${isDone ? '#bbf7d0' : 'var(--border)'}; width:100%; padding:20px; border-radius:8px; text-align:center;">
                    ${isDone ? `
                        <i class="ph ph-check-circle" style="font-size:32px; color:var(--success);"></i>
                        <h4 style="margin:8px 0;">Terunggah: <em>${data.file}</em></h4>
                        <p style="font-size:13px; color:var(--text-muted)">Berkas ini telah tersimpan di sistem guru.</p>
                        ${data.score > 0 ? `<p style="margin-top:8px; font-weight:bold; color:${data.score < t.kkm ? 'red':'green'}">Nilaimu: ${data.score} / 100</p>` : ''}
                    ` : `
                        <div class="file-upload-simulation" id="dropzone-${t.id}">
                            <input type="file" id="fileput-${t.id}" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.mp4" onchange="handleRealStudentUpload(event, '${t.id}')">
                            <div style="pointer-events: none;">
                                <i class="ph ph-upload-simple" id="icon-${t.id}" style="font-size:32px; color:var(--primary); margin-bottom:8px;"></i>
                                <h4 id="label-${t.id}">Pilih Berkas Anda (Word, PDF, JPG, PPTX, MP4)</h4>
                                <p style="font-size:13px; color:var(--text-muted)">File akan diunggah ke server Guru.</p>
                            </div>
                        </div>
                    `}
                </div>
            </div>`;
    });
}

window.handleRealStudentUpload = async (e, taskId) => {
    if(e.target.files.length > 0) {
        const file  = e.target.files[0];
        const icon  = document.getElementById(`icon-${taskId}`);
        const label = document.getElementById(`label-${taskId}`);
        label.textContent = 'Sedang mengunggah...';
        icon.className    = 'ph ph-spinner ph-spin';

        const formData = new FormData();
        formData.append('file', file);
        try {
            const res    = await fetch('api.php?action=upload_file', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.status === 'success') {
                await initApp();
                if(!appData.grades[taskId]) appData.grades[taskId] = {};
                if(!appData.grades[taskId][currentUser.id]) appData.grades[taskId][currentUser.id] = {};
                appData.grades[taskId][currentUser.id].file   = result.filename;
                appData.grades[taskId][currentUser.id].status = 'done';
                await saveData();
                renderPengumpulanSiswa();
                document.getElementById('upload-modal-filename').textContent = 'Tersimpan: ' + result.filename;
                openModal('upload-modal');
            } else {
                alert('Gagal mengunggah: ' + result.message);
                label.textContent = 'Gagal. Coba ulangi.';
                icon.className    = 'ph ph-warning-circle';
            }
        } catch(error) {
            alert('Sistem Backend tidak berjalan.');
            label.textContent = 'Pilih Berkas Anda';
            icon.className    = 'ph ph-upload-simple';
        }
    }
};

window.viewMyReport = async () => {
    await initApp();
    const student = appData.students.find(s => s.id === currentUser.id);
    if (!student) return alert('Data siswa tidak ditemukan.');
    const summary = getStudentSummary(student);
    let avgKkm    = appData.assignments.reduce((sum, a) => sum + parseInt(a.kkm), 0) / (appData.assignments.length || 1);
    let standardKkm = Math.round(avgKkm) || 75;

    let tableDetailRows = appData.assignments.map(t => {
        let score = 0, fb = '-';
        if(appData.grades[t.id] && appData.grades[t.id][student.id]) {
            score = appData.grades[t.id][student.id].score || 0;
            fb    = appData.grades[t.id][student.id].feedback || '-';
        }
        return `<tr><td style="text-align:left;">${t.title} <small>(${t.type})</small></td><td>${t.kkm}</td><td style="${score < t.kkm ? 'color:red;' : ''}">${score}</td><td style="text-align:left; font-size:12px;">${fb}</td></tr>`;
    }).join('');

    document.getElementById('student-report-body').innerHTML = `
        <div class="report-header">
            <h2>CAPAIAN HASIL BELAJAR SISWA (RAPOR)</h2>
            <p>Mata Pelajaran Sistem EduTrack</p>
        </div>
        <div class="student-identity">
            <strong>Nama Lengkap</strong><span>: ${student.name}</span>
            <strong>NIS</strong><span>: ${student.nis}</span>
            <strong>Kelas</strong><span>: ${student.kelas || '-'}</span>
            <strong>KKM Standar</strong><span>: ${standardKkm}</span>
        </div>
        <h4 style="margin:24px 0 8px; border-bottom:1px solid #ccc; padding-bottom:8px;">A. Nilai Pengetahuan &amp; Keterampilan</h4>
        <table class="report-table">
            <thead><tr><th width="30%">Kategori</th><th width="10%">Nilai</th><th width="10%">Predikat</th><th width="50%">Deskripsi</th></tr></thead>
            <tbody>
                <tr>
                    <td style="text-align:left"><strong>Pengetahuan</strong></td>
                    <td><strong>${summary.pengetahuan}</strong><br><small>${summary.pengetahuan >= standardKkm ? 'Tuntas' : 'Tidak Tuntas'}</small></td>
                    <td>${getPredicate(summary.pengetahuan)}</td>
                    <td style="text-align:left; font-size:13px;">${getPredicateFeedback(summary.pengetahuan)}</td>
                </tr>
                <tr>
                    <td style="text-align:left"><strong>Keterampilan / Praktik</strong></td>
                    <td><strong>${Math.round(summary.prkAvg)}</strong><br><small>${summary.prkAvg >= standardKkm ? 'Tuntas' : 'Tidak Tuntas'}</small></td>
                    <td>${getPredicate(summary.prkAvg)}</td>
                    <td style="text-align:left; font-size:13px;">${getPredicateFeedback(summary.prkAvg)}</td>
                </tr>
            </tbody>
        </table>
        <h4 style="margin:24px 0 8px;">B. Rincian Evaluasi</h4>
        <table class="report-table">
            <thead><tr><th>Nama Evaluasi</th><th>KKM</th><th>Nilai</th><th>Catatan Guru</th></tr></thead>
            <tbody>${tableDetailRows}</tbody>
        </table>
    `;
    openModal('student-report-modal');
};

window.printStudentReport = () => {
    const element = document.getElementById('student-report-body');
    html2pdf().set({
        margin: 0.5, filename: `Rapor_Saya_${currentUser.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
};
