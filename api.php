<?php
// ============================================================
// EduTrack API - Backend dengan MySQL Database
// ============================================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// ============================================================
// KONFIGURASI DATABASE
// Ubah sesuai pengaturan MySQL Anda
// ============================================================
define('DB_HOST', 'localhost');
define('DB_NAME', 'edutrack_db');
define('DB_USER', 'root');       // username MySQL (default XAMPP: root)
define('DB_PASS', '');           // password MySQL (default XAMPP: kosong)
define('DB_CHARSET', 'utf8mb4');

function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Koneksi database gagal: ' . $e->getMessage()]);
            exit;
        }
    }
    return $pdo;
}

function generateId() {
    return '_' . substr(md5(uniqid(rand(), true)), 0, 9);
}

$action = $_GET['action'] ?? '';

// ============================================================
// GET DATA — Ambil semua data (siswa, tugas, nilai, rapor)
// ============================================================
if ($action === 'get_data') {
    $db = getDB();

    // Ambil semua siswa
    $students = $db->query("SELECT id, nis, email, name, kelas, gender, password FROM students")->fetchAll();

    // Ambil semua tugas
    $assignments = $db->query("SELECT id, title, type, kkm, deadline FROM assignments ORDER BY created_at ASC")->fetchAll();
    foreach ($assignments as &$a) {
        $a['kkm'] = (int)$a['kkm'];
    }
    unset($a);

    // Ambil semua nilai
    $gradesRaw = $db->query("SELECT assignment_id, student_id, score, feedback, file, status FROM grades")->fetchAll();
    $grades = new stdClass();
    foreach ($gradesRaw as $g) {
        $aId = $g['assignment_id'];
        $sId = $g['student_id'];
        if (!isset($grades->$aId)) $grades->$aId = new stdClass();
        $grades->$aId->$sId = [
            'score'    => (int)$g['score'],
            'feedback' => $g['feedback'] ?? '',
            'file'     => $g['file'],
            'status'   => $g['status'],
        ];
    }

    // Ambil rapor yang sudah di-publish
    $publishedRaw = $db->query("SELECT student_id FROM published_reports")->fetchAll();
    $publishedReports = new stdClass();
    foreach ($publishedRaw as $p) {
        $sId = $p['student_id'];
        $publishedReports->$sId = true;
    }

    // Ambil semua guru
    $teachers = $db->query("SELECT id, name, email, password FROM teachers")->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'students'         => $students,
            'assignments'      => $assignments,
            'grades'           => $grades,
            'publishedReports' => $publishedReports,
            'teachers'         => $teachers,
        ]
    ]);
    exit;
}

// ============================================================
// SAVE DATA — Simpan perubahan data ke database
// ============================================================
if ($action === 'save_data') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        echo json_encode(['status' => 'error', 'message' => 'Data tidak valid']);
        exit;
    }
    $db = getDB();

    // Sync siswa
    if (isset($input['students'])) {
        foreach ($input['students'] as $s) {
            $db->prepare("
                INSERT INTO students (id, nis, email, name, kelas, gender, password)
                VALUES (:id, :nis, :email, :name, :kelas, :gender, :password)
                ON DUPLICATE KEY UPDATE 
                    nis=VALUES(nis), email=VALUES(email), name=VALUES(name),
                    kelas=VALUES(kelas), gender=VALUES(gender), password=VALUES(password)
            ")->execute([
                ':id'       => $s['id'],
                ':nis'      => $s['nis'],
                ':email'    => $s['email'] ?? '',
                ':name'     => $s['name'],
                ':kelas'    => $s['kelas'] ?? '',
                ':gender'   => $s['gender'] ?? 'L',
                ':password' => $s['password'] ?? $s['nis'],
            ]);
        }
        // Hapus siswa yang sudah tidak ada di list
        $ids = array_column($input['students'], 'id');
        if (!empty($ids)) {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $db->prepare("DELETE FROM students WHERE id NOT IN ($placeholders)")->execute($ids);
        } else {
            $db->exec("DELETE FROM students");
        }
    }

    // Sync tugas
    if (isset($input['assignments'])) {
        foreach ($input['assignments'] as $a) {
            $db->prepare("
                INSERT INTO assignments (id, title, type, kkm, deadline)
                VALUES (:id, :title, :type, :kkm, :deadline)
                ON DUPLICATE KEY UPDATE
                    title=VALUES(title), type=VALUES(type), kkm=VALUES(kkm), deadline=VALUES(deadline)
            ")->execute([
                ':id'       => $a['id'],
                ':title'    => $a['title'],
                ':type'     => $a['type'],
                ':kkm'      => (int)($a['kkm'] ?? 75),
                ':deadline' => $a['deadline'],
            ]);
        }
        // Hapus tugas yang sudah dihapus
        $ids = array_column($input['assignments'], 'id');
        if (!empty($ids)) {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $db->prepare("DELETE FROM assignments WHERE id NOT IN ($placeholders)")->execute($ids);
        } else {
            $db->exec("DELETE FROM assignments");
        }
    }

    // Sync nilai
    if (isset($input['grades'])) {
        foreach ($input['grades'] as $assignId => $studentGrades) {
            foreach ($studentGrades as $studentId => $g) {
                $db->prepare("
                    INSERT INTO grades (assignment_id, student_id, score, feedback, file, status)
                    VALUES (:aid, :sid, :score, :feedback, :file, :status)
                    ON DUPLICATE KEY UPDATE
                        score=VALUES(score), feedback=VALUES(feedback),
                        file=VALUES(file), status=VALUES(status)
                ")->execute([
                    ':aid'      => $assignId,
                    ':sid'      => $studentId,
                    ':score'    => (int)($g['score'] ?? 0),
                    ':feedback' => $g['feedback'] ?? '',
                    ':file'     => $g['file'] ?? null,
                    ':status'   => $g['status'] ?? 'pending',
                ]);
            }
        }
    }

    // Sync published reports
    if (isset($input['publishedReports'])) {
        foreach ($input['publishedReports'] as $studentId => $val) {
            if ($val) {
                $db->prepare("
                    INSERT IGNORE INTO published_reports (student_id) VALUES (:sid)
                ")->execute([':sid' => $studentId]);
            }
        }
    }

    echo json_encode(['status' => 'success', 'message' => 'Data tersimpan di database.']);
    exit;
}

// ============================================================
// LOGIN GURU
// ============================================================
if ($action === 'login_guru') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = trim(strtolower($input['email'] ?? ''));
    $password = $input['password'] ?? '';

    $db = getDB();
    $stmt = $db->prepare("SELECT id, name, email, password FROM teachers WHERE LOWER(email) = :email LIMIT 1");
    $stmt->execute([':email' => $email]);
    $teacher = $stmt->fetch();

    if ($teacher && $teacher['password'] === $password) {
        echo json_encode([
            'status' => 'success',
            'user' => [
                'role'  => 'guru',
                'id'    => $teacher['id'],
                'name'  => $teacher['name'],
                'email' => $teacher['email'],
            ]
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Email atau password guru salah!']);
    }
    exit;
}

// ============================================================
// LOGIN SISWA
// ============================================================
if ($action === 'login_siswa') {
    $input = json_decode(file_get_contents('php://input'), true);
    $nis  = trim($input['nis'] ?? '');
    $pass = $input['password'] ?? '';

    $db = getDB();
    $stmt = $db->prepare("SELECT id, nis, name, password FROM students WHERE nis = :nis LIMIT 1");
    $stmt->execute([':nis' => $nis]);
    $student = $stmt->fetch();

    if ($student) {
        $correctPass = $student['password'] ?: $student['nis'];
        if ($pass === $correctPass) {
            echo json_encode([
                'status' => 'success',
                'user' => [
                    'role' => 'siswa',
                    'id'   => $student['id'],
                    'name' => $student['name'],
                    'nis'  => $student['nis'],
                ]
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Password salah.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'NIS tidak ditemukan.']);
    }
    exit;
}

// ============================================================
// REGISTER GURU
// ============================================================
if ($action === 'register_guru') {
    $input = json_decode(file_get_contents('php://input'), true);
    $name     = trim($input['name'] ?? '');
    $email    = trim(strtolower($input['email'] ?? ''));
    $password = $input['password'] ?? '';

    if (!$name || !$email || !$password) {
        echo json_encode(['status' => 'error', 'message' => 'Semua field wajib diisi.']);
        exit;
    }

    $db = getDB();
    $check = $db->prepare("SELECT id FROM teachers WHERE LOWER(email) = :email");
    $check->execute([':email' => $email]);
    if ($check->fetch()) {
        echo json_encode(['status' => 'error', 'message' => 'Email Guru ini sudah terdaftar!']);
        exit;
    }

    $id = generateId();
    $db->prepare("INSERT INTO teachers (id, name, email, password) VALUES (:id, :name, :email, :password)")
       ->execute([':id' => $id, ':name' => $name, ':email' => $email, ':password' => $password]);

    echo json_encode(['status' => 'success', 'message' => 'Akun guru berhasil didaftarkan.', 'id' => $id]);
    exit;
}

// ============================================================
// REGISTER SISWA
// ============================================================
if ($action === 'register_siswa') {
    $input = json_decode(file_get_contents('php://input'), true);
    $nis      = trim($input['nis'] ?? '');
    $email    = trim(strtolower($input['email'] ?? ''));
    $name     = trim($input['name'] ?? '');
    $kelas    = trim($input['kelas'] ?? '');
    $gender   = $input['gender'] ?? 'L';
    $password = $input['password'] ?? $nis;

    if (!$nis || !$name) {
        echo json_encode(['status' => 'error', 'message' => 'NIS dan Nama wajib diisi.']);
        exit;
    }

    $db = getDB();
    $check = $db->prepare("SELECT id FROM students WHERE nis = :nis");
    $check->execute([':nis' => $nis]);
    if ($check->fetch()) {
        echo json_encode(['status' => 'error', 'message' => 'NIS ini sudah terdaftar!']);
        exit;
    }

    if ($email) {
        $checkEmail = $db->prepare("SELECT id FROM students WHERE email = :email");
        $checkEmail->execute([':email' => $email]);
        if ($checkEmail->fetch()) {
            echo json_encode(['status' => 'error', 'message' => 'Email ini sudah digunakan siswa lain!']);
            exit;
        }
    }

    $id = generateId();
    $db->prepare("INSERT INTO students (id, nis, email, name, kelas, gender, password) VALUES (:id, :nis, :email, :name, :kelas, :gender, :password)")
       ->execute([':id' => $id, ':nis' => $nis, ':email' => $email, ':name' => $name, ':kelas' => $kelas, ':gender' => $gender, ':password' => $password]);

    echo json_encode(['status' => 'success', 'message' => 'Akun siswa berhasil didaftarkan.', 'id' => $id]);
    exit;
}

// ============================================================
// FORGOT PASSWORD — Reset password ke nilai baru acak
// ============================================================
if ($action === 'forgot_password') {
    $input      = json_decode(file_get_contents('php://input'), true);
    $identifier = trim($input['identifier'] ?? '');  // bisa email atau NIS
    $role       = trim($input['role'] ?? 'auto');    // 'guru', 'siswa', atau 'auto'

    if (!$identifier) {
        echo json_encode(['status' => 'error', 'message' => 'Mohon masukkan email atau NIS.']);
        exit;
    }

    // Generate password baru acak (8 karakter)
    $newPassword = substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 8);

    $db = getDB();

    // Cek apakah admin (tidak bisa di-reset)
    if (strtolower($identifier) === 'admin@sekolah.com') {
        echo json_encode(['status' => 'error', 'message' => 'Akun admin default tidak dapat direset. Password: admin123']);
        exit;
    }

    // Cari di tabel guru (by email)
    if ($role === 'guru' || $role === 'auto') {
        $stmt = $db->prepare("SELECT id, name, email FROM teachers WHERE LOWER(email) = :email LIMIT 1");
        $stmt->execute([':email' => strtolower($identifier)]);
        $teacher = $stmt->fetch();

        if ($teacher) {
            $db->prepare("UPDATE teachers SET password = :pw WHERE id = :id")
               ->execute([':pw' => $newPassword, ':id' => $teacher['id']]);

            echo json_encode([
                'status'      => 'success',
                'role'        => 'guru',
                'name'        => $teacher['name'],
                'newPassword' => $newPassword,
                'message'     => 'Password guru berhasil direset!'
            ]);
            exit;
        }
    }

    // Cari di tabel siswa (by email atau NIS)
    if ($role === 'siswa' || $role === 'auto') {
        $email = strtolower($identifier);
        $stmt = $db->prepare("SELECT id, name, nis, email FROM students WHERE LOWER(email) = :email OR nis = :nis LIMIT 1");
        $stmt->execute([':email' => $email, ':nis' => $identifier]);
        $student = $stmt->fetch();

        if ($student) {
            $db->prepare("UPDATE students SET password = :pw WHERE id = :id")
               ->execute([':pw' => $newPassword, ':id' => $student['id']]);

            echo json_encode([
                'status'      => 'success',
                'role'        => 'siswa',
                'name'        => $student['name'],
                'newPassword' => $newPassword,
                'message'     => 'Password siswa berhasil direset!'
            ]);
            exit;
        }
    }

    echo json_encode(['status' => 'error', 'message' => 'Akun tidak ditemukan. Periksa email atau NIS yang dimasukkan.']);
    exit;
}

// ============================================================
// CHANGE PASSWORD — Ganti password (verifikasi dulu)
// ============================================================
if ($action === 'change_password') {
    $input    = json_decode(file_get_contents('php://input'), true);
    $userId   = $input['userId'] ?? '';
    $role     = $input['role'] ?? '';
    $oldPass  = $input['oldPassword'] ?? '';
    $newPass  = $input['newPassword'] ?? '';

    if (!$userId || !$oldPass || !$newPass) {
        echo json_encode(['status' => 'error', 'message' => 'Data tidak lengkap.']);
        exit;
    }

    $db = getDB();

    if ($role === 'guru') {
        if ($userId === 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'Akun admin default tidak dapat diubah passwordnya.']);
            exit;
        }
        $stmt = $db->prepare("SELECT id, password FROM teachers WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $teacher = $stmt->fetch();

        if (!$teacher) {
            echo json_encode(['status' => 'error', 'message' => 'Akun tidak ditemukan.']);
            exit;
        }
        if ($teacher['password'] !== $oldPass) {
            echo json_encode(['status' => 'error', 'message' => 'Password lama salah!']);
            exit;
        }
        $db->prepare("UPDATE teachers SET password = :pw WHERE id = :id")
           ->execute([':pw' => $newPass, ':id' => $userId]);
        echo json_encode(['status' => 'success', 'message' => 'Password guru berhasil diubah!']);

    } else if ($role === 'siswa') {
        $stmt = $db->prepare("SELECT id, password, nis FROM students WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $student = $stmt->fetch();

        if (!$student) {
            echo json_encode(['status' => 'error', 'message' => 'Akun siswa tidak ditemukan.']);
            exit;
        }
        $correctPass = $student['password'] ?: $student['nis'];
        if ($oldPass !== $correctPass) {
            echo json_encode(['status' => 'error', 'message' => 'Password lama salah!']);
            exit;
        }
        $db->prepare("UPDATE students SET password = :pw WHERE id = :id")
           ->execute([':pw' => $newPass, ':id' => $userId]);
        echo json_encode(['status' => 'success', 'message' => 'Password siswa berhasil diubah!']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Role tidak valid.']);
    }
    exit;
}

// ============================================================
// UPLOAD FILE
// ============================================================
if ($action === 'upload_file') {
    $uploadDir = 'uploads/';
    if (!file_exists($uploadDir)) mkdir($uploadDir, 0777, true);

    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['file']['tmp_name'];
        $fileName    = preg_replace("/[^a-zA-Z0-9.-]/", "_", $_FILES['file']['name']);
        $fileExt     = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $allowedExts = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'ppt', 'pptx', 'xls', 'xlsx', 'mp4'];

        if (in_array($fileExt, $allowedExts)) {
            $newFileName = time() . '_' . $fileName;
            $destPath    = $uploadDir . $newFileName;
            if (move_uploaded_file($fileTmpPath, $destPath)) {
                echo json_encode(['status' => 'success', 'message' => 'File berhasil diunggah', 'filename' => $newFileName, 'path' => $destPath]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan file ke server.']);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Ekstensi file tidak didukung.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Tidak ada file atau terjadi kesalahan upload.']);
    }
    exit;
}

// ============================================================
// UPDATE STUDENT — Edit data siswa yang sudah ada
// ============================================================
if ($action === 'update_student') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id     = $input['id']     ?? '';
    $nis    = $input['nis']    ?? '';
    $name   = $input['name']   ?? '';
    $email  = $input['email']  ?? '';
    $kelas  = $input['kelas']  ?? '';
    $gender = $input['gender'] ?? 'L';
    $pwInput = trim($input['password'] ?? '');

    if (!$id || !$nis || !$name) {
        echo json_encode(['status' => 'error', 'message' => 'Data tidak lengkap.']);
        exit;
    }

    $db = getDB();

    // Cek apakah NIS sudah dipakai siswa lain
    $checkNis = $db->prepare("SELECT id FROM students WHERE nis = :nis AND id != :id");
    $checkNis->execute([':nis' => $nis, ':id' => $id]);
    if ($checkNis->fetch()) {
        echo json_encode(['status' => 'error', 'message' => 'NIS sudah digunakan siswa lain!']);
        exit;
    }

    // Ambil password lama agar tidak terhapus jika tidak diubah
    $existing = $db->prepare("SELECT password FROM students WHERE id = :id");
    $existing->execute([':id' => $id]);
    $row = $existing->fetch();
    if (!$row) {
        echo json_encode(['status' => 'error', 'message' => 'Siswa tidak ditemukan.']);
        exit;
    }

    $finalPassword = ($pwInput !== '') ? $pwInput : $row['password'];

    $db->prepare("
        UPDATE students SET nis=:nis, email=:email, name=:name, kelas=:kelas, gender=:gender, password=:password
        WHERE id=:id
    ")->execute([
        ':nis'      => $nis,
        ':email'    => $email,
        ':name'     => $name,
        ':kelas'    => $kelas,
        ':gender'   => $gender,
        ':password' => $finalPassword,
        ':id'       => $id,
    ]);

    echo json_encode(['status' => 'success', 'message' => 'Data siswa berhasil diperbarui.']);
    exit;
}

// ============================================================
// DELETE STUDENT — Hapus siswa + semua nilai terkait
// ============================================================
if ($action === 'delete_student') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id    = $input['id'] ?? '';

    if (!$id) {
        echo json_encode(['status' => 'error', 'message' => 'ID siswa tidak ditemukan.']);
        exit;
    }

    $db = getDB();
    // Hapus nilai dulu (CASCADE seharusnya handle ini, tapi eksplisit lebih aman)
    $db->prepare("DELETE FROM grades WHERE student_id = :id")->execute([':id' => $id]);
    $db->prepare("DELETE FROM published_reports WHERE student_id = :id")->execute([':id' => $id]);
    $db->prepare("DELETE FROM students WHERE id = :id")->execute([':id' => $id]);

    echo json_encode(['status' => 'success', 'message' => 'Siswa berhasil dihapus.']);
    exit;
}

// Invalid request
echo json_encode(['status' => 'error', 'message' => 'API Route tidak ditemukan: ' . $action]);
exit;
