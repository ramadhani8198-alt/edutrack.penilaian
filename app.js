/* ===========================
   STATE & DATA INITIALIZATION
   =========================== */
let appData = {
    students: [],
    assignments: [],
    grades: {}
};

// Session state 
let currentUser = null; 

async function initApp() {
    try {
        const response = await fetch('api.php?action=get_data');
        const json = await response.json();
        if(json.status === 'success') {
            appData = json.data;
        } else {
            console.warn("Backend belum tersedia atau data kosong", json);
        }
    } catch(err) {
        console.warn("Error menghubungkan ke Backend:", err);
    }
}
initApp();

async function saveData() { 
    try {
        await fetch('api.php?action=save_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData)
        });
    } catch(err) {
        console.error("Gagal menyimpan ke server", err);
    }
}

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);
const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
};

// Predicates Logic
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
    }
}

document.getElementById('form-login-guru').addEventListener('submit', async (e) => {
    e.preventDefault();
    await initApp(); 
    const pin = document.getElementById('login-pin-guru').value;
    if(pin === 'admin123') { 
        currentUser = { role: 'guru', id: 'admin', name: 'Bapak Guru' };
        enterApp();
    } else { alert("PIN Salah!"); }
});

document.getElementById('form-login-siswa').addEventListener('submit', async (e) => {
    e.preventDefault();
    await initApp(); 
    const nis = document.getElementById('login-nis-siswa').value.trim();
    const student = appData.students.find(s => s.nis === nis);
    if(student) {
        currentUser = { role: 'siswa', id: student.id, name: student.name };
        enterApp();
    } else { alert("NIS tidak ditemukan."); }
});

document.getElementById('form-register-siswa').addEventListener('submit', async (e) => {
    e.preventDefault();
    await initApp(); 
    const nis = document.getElementById('reg-nis').value.trim();
    const name = document.getElementById('reg-name').value.trim();
    const gender = document.getElementById('reg-gender').value;

    if(appData.students.some(s => s.nis === nis)) return alert("NIS ini sudah terdaftar!");

    const newStudent = { id: generateId(), nis, name, gender };
    appData.students.push(newStudent);
    await saveData();
    
    alert("Berhasil mendaftar! Anda bisa login sekarang.");
    switchLoginTab('siswa'); 
    document.getElementById('login-nis-siswa').value = nis;
});

function logout() {
    currentUser = null;
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
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector('#nav-guru .nav-item').classList.add('active'); 
        goToSection('dashboard');
    } else {
        document.getElementById('nav-guru').style.display = 'none';
        document.getElementById('nav-siswa').style.display = 'flex';
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
    'dashboard': { t: 'Dashboard', s: 'Ringkasan aktivitas kelas.' },
    'students': { t: 'Data Siswa', s: 'Manajemen informasi siswa.' },
    'assignments': { t: 'Tugas & Penilaian', s: 'Kelola tugas (UH/PTS/PAS) dan nilai.' },
    'recap': { t: 'Rekap & Peringkat', s: 'Daftar rekapitulasi nilai berbobot.' },
    'report': { t: 'Cetak E-Rapor', s: 'Cetak lembar laporan resmi.' },
    'student-dash': { t: 'Portal Siswa', s: 'Lihat nilaimu dan feedback guru.' },
    'student-submission': { t: 'Kumpul Tugas', s: 'Serahkan tugasmu secara online.' }
};

function goToSection(targetId) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    document.getElementById('page-title').textContent = titles[targetId].t;
    document.getElementById('page-subtitle').textContent = titles[targetId].s;

    if(targetId === 'dashboard') renderDashboardGuru();
    if(targetId === 'students') renderStudents();
    if(targetId === 'assignments') renderAssignments();
    if(targetId === 'recap') renderRecap();
    if(targetId === 'report') renderReportFilters();
    if(targetId === 'student-dash') renderDashboardSiswa();
    if(targetId === 'student-submission') renderPengumpulanSiswa();
}


/* ===========================
   GURU: EXCEL IMPORT & SISWA MANUAL
   =========================== */
function handleExcelImport(event) {
    const file = event.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(worksheet);
            let addedCount = 0;
            json.forEach(row => {
                const nisStr = row['NIS'] ? String(row['NIS']) : '';
                const nameStr = row['Nama Lengkap'] || row['Nama'] || '';
                const genderStr = row['Jenis Kelamin'] || row['JK'] || 'L';
                if(nisStr && nameStr) {
                    if(!appData.students.some(s => s.nis === nisStr)) {
                        appData.students.push({
                            id: generateId(), nis: nisStr, name: nameStr,
                            gender: genderStr.trim().toUpperCase() === 'P' ? 'P' : 'L'
                        });
                        addedCount++;
                    }
                }
            });
            await saveData(); renderStudents();
            alert(`Import berhasil. ${addedCount} data siswa baru telah ditambahkan.`);
        } catch(err) {
            console.error(err); alert("Gagal membaca Excel.");
        }
        event.target.value = ''; 
    };
    reader.readAsArrayBuffer(file);
}

window.downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["NIS", "Nama Lengkap", "Jenis Kelamin"], ["1001", "Budi Santoso", "L"], ["1002", "Siti Aminah", "P"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Template_Siswa");
    XLSX.writeFile(wb, "Template_Import_Siswa.xlsx");
};

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { 
    document.getElementById(id).classList.remove('active'); 
    if(id === 'student-modal') document.getElementById('student-form').reset();
    if(id === 'assignment-modal') document.getElementById('assignment-form').reset();
}

document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('student-id').value || generateId();
    const nis = document.getElementById('student-nis').value;
    const name = document.getElementById('student-name').value;
    const gender = document.getElementById('student-gender').value;
    const existingIndex = appData.students.findIndex(s => s.id === id);
    if(existingIndex >= 0) appData.students[existingIndex] = { id, nis, name, gender };
    else appData.students.push({ id, nis, name, gender });
    await saveData(); renderStudents(); closeModal('student-modal');
});

async function deleteStudent(id) {
    if(confirm('Keluarkan siswa ini dari list?')) {
        appData.students = appData.students.filter(s => s.id !== id);
        await saveData(); renderStudents();
    }
}

function renderStudents(filter = "") {
    const tbody = document.getElementById('students-table-body');
    tbody.innerHTML = '';
    const filtered = appData.students.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()) || s.nis.includes(filter));
    if(filtered.length===0) return tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Data tidak ditemukan.</td></tr>`;

    filtered.forEach(student => {
        tbody.innerHTML += `
            <tr>
                <td>${student.nis}</td>
                <td><strong>${student.name}</strong></td>
                <td>${student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                <td>
                    <button class="btn-icon delete-btn" onclick="deleteStudent('${student.id}')"><i class="ph ph-trash"></i></button>
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
        title: document.getElementById('assignment-title').value,
        type: document.getElementById('assignment-type').value, // UH/PTS/PAS/PRAKTIK
        kkm: parseInt(document.getElementById('assignment-kkm').value) || 75,
        deadline: document.getElementById('assignment-deadline').value
    });
    appData.grades[id] = {};
    await saveData(); renderAssignments(); closeModal('assignment-modal');
});

function renderAssignments() {
    const list = document.getElementById('assignment-list');
    list.innerHTML = '';
    
    // Add sorting filter feature rendering
    document.getElementById('assignment-filter').innerHTML = `
        <option value="ALL">Semua Tipe</option>
        <option value="UH">UH (Harian)</option>
        <option value="PTS">PTS</option>
        <option value="PAS">PAS</option>
        <option value="PRAKTIK">Praktik</option>
    `;

    document.getElementById('assignment-filter').onchange = (e) => {
        renderFilteredAssignments(e.target.value);
    };

    renderFilteredAssignments('ALL');
}

function renderFilteredAssignments(filterType) {
    const list = document.getElementById('assignment-list');
    list.innerHTML = '';
    
    let filtered = appData.assignments;
    if(filterType !== 'ALL') {
        filtered = filtered.filter(a => a.type === filterType);
    }

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
                <button class="btn btn-outline" onclick="openGrading('${task.id}', '${task.title} [${task.type}]')">Lihat & Nilai</button>
            </div>`;
    });
}

let currentAssignId = null;
window.openGrading = async (taskId, title) => {
    currentAssignId = taskId;
    document.getElementById('grading-area').style.display = 'flex';
    document.getElementById('grading-title').textContent = 'Pemeriksaan: ' + title;
    await initApp(); 
    renderGradingTable();
};
window.closeGradingArea = () => { document.getElementById('grading-area').style.display = 'none'; currentAssignId = null; };

window.renderGradingTable = () => {
    const tbody = document.getElementById('grading-table-body');
    tbody.innerHTML = '';
    
    if(appData.students.length===0) return tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Belum ada siswa</td></tr>`;
    if(!appData.grades[currentAssignId]) appData.grades[currentAssignId] = {};
    
    // Get assignment rule
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

        let isRemedial = (data.status === 'done' && data.score < myKkm);
        let scoreStyle = isRemedial ? 'color:var(--danger); border-color:var(--danger);' : '';
        
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
            </tr>
        `;
    });
};

window.saveIndividualGrade = async (studentId) => {
    const val = document.getElementById(`score-${studentId}`).value;
    const fb = document.getElementById(`fb-${studentId}`).value;
    
    await initApp();
    if(!appData.grades[currentAssignId]) appData.grades[currentAssignId] = {};
    if(!appData.grades[currentAssignId][studentId]) appData.grades[currentAssignId][studentId] = {};

    appData.grades[currentAssignId][studentId].score = parseInt(val) || 0;
    appData.grades[currentAssignId][studentId].feedback = fb;
    appData.grades[currentAssignId][studentId].status = 'done'; 
    
    await saveData();
    renderGradingTable(); 
};

/* ===========================
   GURU: REKAP PREDIKAT E-RAPOR
   =========================== */
window.calculateRanking = async () => { 
    await initApp(); 
    renderRecap(); 
};

// Calculate advanced weights: Pengetahuan (40% UH, 30% PTS, 30% PAS).
function getStudentSummary(student) {
    let tasksUH = appData.assignments.filter(a => a.type === 'UH');
    let tasksPTS = appData.assignments.filter(a => a.type === 'PTS');
    let tasksPAS = appData.assignments.filter(a => a.type === 'PAS');
    let tasksPRK = appData.assignments.filter(a => a.type === 'PRAKTIK');

    let getAvg = (taskList) => {
        if(taskList.length === 0) return 0;
        let sum = 0;
        taskList.forEach(t => sum += ((appData.grades[t.id] && appData.grades[t.id][student.id]) ? appData.grades[t.id][student.id].score || 0 : 0));
        return sum / taskList.length;
    };

    let uhAvg = getAvg(tasksUH);
    let ptsAvg = getAvg(tasksPTS);
    let pasAvg = getAvg(tasksPAS);
    let prkAvg = getAvg(tasksPRK);

    let nilaiPengetahuan = 0;
    if(tasksUH.length>0 || tasksPTS.length>0 || tasksPAS.length>0) {
       // Only weight what exists
       let wUH = tasksUH.length > 0 ? 0.4 : 0;
       let wPTS = tasksPTS.length > 0 ? 0.3 : 0;
       let wPAS = tasksPAS.length > 0 ? 0.3 : 0;
       
       let totalW = wUH + wPTS + wPAS;
       if(totalW > 0) {
           nilaiPengetahuan = ((uhAvg * wUH) + (ptsAvg * wPTS) + (pasAvg * wPAS)) / totalW;
       }
    }
    
    return {
        ...student,
        uhAvg, ptsAvg, pasAvg, prkAvg,
        pengetahuan: Math.round(nilaiPengetahuan)
    };
}

function renderRecap() {
    const thead = document.getElementById('recap-table-header');
    const tbody = document.getElementById('recap-table-body');
    
    thead.innerHTML = `
        <th>Rank</th><th>Nama</th>
        <th>Rata2 UH</th><th>Nilai PTS</th><th>Nilai PAS</th>
        <th>NA Pengetahuan</th><th>NA Praktik</th>
        <th>Predikat</th>
    `;

    let studentsSum = appData.students.map(std => getStudentSummary(std));
    // Sort by Pengetahuan + Praktik
    studentsSum.sort((a,b) => (b.pengetahuan + b.prkAvg) - (a.pengetahuan + a.prkAvg));

    tbody.innerHTML = '';
    if(studentsSum.length === 0) return tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Tidak ada data.</td></tr>`;

    studentsSum.forEach((s, i) => {
        let pred = getPredicate(s.pengetahuan);
        let predClass = pred === 'D' ? 'pending' : 'done';
        if(pred==='C') predClass = 'pending'; // visually yellow

        tbody.innerHTML += `
            <tr>
                <td><strong>#${i+1}</strong></td>
                <td>${s.name}</td>
                <td>${Math.round(s.uhAvg)}</td>
                <td>${Math.round(s.ptsAvg)}</td>
                <td>${Math.round(s.pasAvg)}</td>
                <td><strong>${s.pengetahuan}</strong></td>
                <td><strong>${Math.round(s.prkAvg)}</strong></td>
                <td><span class="badge ${predClass}">Predikat ${pred}</span></td>
            </tr>
        `;
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
    if(!sId) return alert("Pilih Siswa!");
    
    const student = appData.students.find(s=>s.id === sId);
    const summary = getStudentSummary(student);

    // KKM Global (average of all KKM) or standard 75
    let avgKkm = appData.assignments.reduce((sum, a) => sum + parseInt(a.kkm), 0) / (appData.assignments.length || 1);
    let standardKkm = Math.round(avgKkm) || 75;

    let kkmLabelPengetahuan = summary.pengetahuan >= standardKkm ? "Tuntas" : "Tidak Tuntas";
    let kkmLabelPraktik = summary.prkAvg >= standardKkm ? "Tuntas" : "Tidak Tuntas";

    let deskripsiPengetahuan = getPredicateFeedback(summary.pengetahuan);
    let deskripsiPraktik = getPredicateFeedback(summary.prkAvg);

    // Create detailed table of all evaluations for transparency
    let tableDetailRows = appData.assignments.map(t => {
        let score = 0, fb = '-';
        if(appData.grades[t.id] && appData.grades[t.id][student.id]) {
            score = appData.grades[t.id][student.id].score || 0;
            fb = appData.grades[t.id][student.id].feedback || '-';
        }
        let warn = score < t.kkm ? `color:red;` : '';
        return `<tr><td style="text-align:left;">${t.title} <small>(${t.type})</small></td><td>${t.kkm}</td><td style="${warn}">${score}</td><td style="text-align:left; font-size:12px;">${fb}</td></tr>`;
    }).join("");

    document.getElementById('printable-area').innerHTML = `
        <div class="report-header">
            <h2>CAPAIAN HASIL BELAJAR SISWA (RAPOR)</h2>
            <p>Mata Pelajaran Sistem EduTrack</p>
        </div>
        <div class="student-identity">
            <strong>Nama</strong><span>: ${student.name}</span>
            <strong>NIS</strong><span>: ${student.nis}</span>
            <strong>KKM Rata-rata</strong><span>: ${standardKkm}</span>
        </div>
        
        <h4 style="margin:24px 0 8px; border-bottom:1px solid #ccc; padding-bottom:8px;">A. Nilai Pengetahuan & Keterampilan</h4>
        <table class="report-table">
            <thead>
                <tr>
                    <th width="30%">Kategori Kriteria</th><th width="10%">Nilai Akhir</th>
                    <th width="10%">Predikat</th><th width="50%">Deskripsi Capaian</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="text-align:left"><strong>Pengetahuan</strong><br><small>(Rata-rata UH, PTS, PAS)</small></td>
                    <td><strong>${summary.pengetahuan}</strong><br><small>${kkmLabelPengetahuan}</small></td>
                    <td>${getPredicate(summary.pengetahuan)}</td>
                    <td style="text-align:left; font-size:13px;">${deskripsiPengetahuan} Siswa menunjukkan pemahaman yang ${getPredicate(summary.pengetahuan) === 'D' ? 'kurang' : 'baik'} pada pengerjaan sumatif.</td>
                </tr>
                <tr>
                    <td style="text-align:left"><strong>Keterampilan / Praktik</strong></td>
                    <td><strong>${Math.round(summary.prkAvg)}</strong><br><small>${kkmLabelPraktik}</small></td>
                    <td>${getPredicate(summary.prkAvg)}</td>
                    <td style="text-align:left; font-size:13px;">${deskripsiPraktik} Dalam praktik langsung dan pengumpulan hasil karya.</td>
                </tr>
            </tbody>
        </table>

        <h4 style="margin:24px 0 8px;">B. Rincian Evaluasi</h4>
        <table class="report-table">
            <thead><tr><th>Nama Acuan Evaluasi</th><th>KKM Tujuan</th><th>Nilai Diperoleh</th><th>Catatan Pendidik</th></tr></thead>
            <tbody>${tableDetailRows}</tbody>
        </table>

        <div class="report-signature"><div class="signature-box"><p>Wali Kelas,</p><strong>Bapak Guru</strong></div></div>
    `;
    document.getElementById('printable-area').style.display = 'block';
    document.getElementById('btn-print').disabled = false;
};

/* ===========================
   SISWA: PORTAL KHUSUS PENGIRIMAN
   =========================== */
function renderDashboardGuru() {
    document.getElementById('stat-total-students').textContent = appData.students.length;
    document.getElementById('stat-total-assignments').textContent = appData.assignments.length;
}

function renderDashboardSiswa() {
    let totAssignments = appData.assignments.length;
    let completed = 0;
    
    appData.assignments.forEach(t => {
        if(appData.grades[t.id] && appData.grades[t.id][currentUser.id]) {
            let data = appData.grades[t.id][currentUser.id];
            if(data.file || data.score > 0 || data.status === 'done') completed++;
        }
    });

    const summary = getStudentSummary(currentUser);

    document.getElementById('siswa-total-tugas').textContent = totAssignments;
    document.getElementById('siswa-tugas-selesai').textContent = completed;
    document.getElementById('siswa-rata-nilai').textContent = summary.pengetahuan; // Tampilkan nilai rapor sbg avg utama

    const tableDiv = document.getElementById('siswa-my-grades-table');
    tableDiv.innerHTML = '';
    appData.assignments.forEach(t => {
        let stats = { file: '-', score: 0, status: 'Belum', fb: '' };
        let fileLinkHtml = '-';

        if(appData.grades[t.id] && appData.grades[t.id][currentUser.id]) {
            let d = appData.grades[t.id][currentUser.id];
            stats.file = d.file || '-';
            stats.score = d.score || 0;
            stats.fb = d.feedback || '-';
            stats.status = (d.status === 'done' || stats.file !== '-') ? '<span class="badge done">Selesai</span>' : '<span class="badge pending">Menunggu</span>';
            
            if(d.file) fileLinkHtml = `<a href="uploads/${d.file}" target="_blank" style="color:var(--text-dark)"><i class="ph ph-file"></i> Terkirim</a>`;
        }

        let isRemedial = stats.score < t.kkm && stats.score > 0;
        
        tableDiv.innerHTML += `
            <tr>
                <td><strong>${t.title}</strong></td>
                <td><span class="badge bg-blue" style="color:#fff">${t.type}</span></td>
                <td>${stats.status}</td>
                <td>${fileLinkHtml}</td>
                <td>
                    <strong style="${isRemedial ? 'color:var(--danger)' : ''}">${stats.score}</strong> <br>
                    <small style="color:var(--text-muted)">KKM: ${t.kkm}</small>
                </td>
                <td style="font-style:italic; font-size:13px; color:var(--text-muted);">${stats.fb}</td>
            </tr>
        `;
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
        
        let data = appData.grades[t.id][currentUser.id];
        let isDone = !!data.file; 

        // If it's pure PRAKTIK, maybe they don't upload, but we assume all allow upload.
        let html = `
            <div class="assignment-card" style="flex-direction: column; align-items:flex-start; gap: 16px;">
                <div style="display:flex; justify-content:space-between; width:100%">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="badge ${t.type==='PRAKTIK'?'bg-purple':'bg-blue'}" style="color:#fff">${t.type}</span>
                            <h3 style="font-size:20px; margin:0;">${t.title}</h3>
                        </div>
                        <p style="color:var(--text-muted); font-size:14px; margin-top:4px;"><i class="ph ph-calendar-blank"></i> Tenggat: ${formatDate(t.deadline)} | Standar Kelulusan (KKM): ${t.kkm}</p>
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
                            <input type="file" id="fileput-${t.id}" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" onchange="handleRealStudentUpload(event, '${t.id}')">
                            <div style="pointer-events: none;">
                                <i class="ph ph-upload-simple" id="icon-${t.id}" style="font-size:32px; color:var(--primary); margin-bottom:8px;"></i>
                                <h4 id="label-${t.id}">Pilih Berkas Anda (Word, PDF, JPG, PPTX)</h4>
                                <p style="font-size:13px; color:var(--text-muted)">File akan diunggah ke server Guru.</p>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;
        list.innerHTML += html;
    });
}

window.handleRealStudentUpload = async (e, taskId) => {
    if(e.target.files.length > 0) {
        const file = e.target.files[0];
        const icon = document.getElementById(`icon-${taskId}`);
        const label = document.getElementById(`label-${taskId}`);
        
        label.textContent = "Sedang mengunggah...";
        icon.className = "ph ph-spinner ph-spin";

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch('api.php?action=upload_file', {
                method: 'POST',
                body: formData
            });
            const result = await res.json();

            if (result.status === 'success') {
                await initApp(); 
                if(!appData.grades[taskId]) appData.grades[taskId] = {};
                if(!appData.grades[taskId][currentUser.id]) appData.grades[taskId][currentUser.id] = {};
                
                appData.grades[taskId][currentUser.id].file = result.filename;
                appData.grades[taskId][currentUser.id].status = 'done';
                await saveData(); 
                renderPengumpulanSiswa();
                
                document.getElementById('upload-modal-filename').textContent = "Tersimpan dengan nama: " + result.filename;
                openModal('upload-modal');
            } else {
                alert("Gagal mengunggah: " + result.message);
                label.textContent = "Gagal. Coba ulangi.";
                icon.className = "ph ph-warning-circle";
            }
        } catch(error) {
            console.error("Upload failed", error);
            alert("Sistem Backend tidak berjalan.");
            label.textContent = "Pilih Berkas Anda";
            icon.className = "ph ph-upload-simple";
        }
    }
}
