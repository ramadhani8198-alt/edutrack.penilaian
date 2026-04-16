<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$action = isset($_GET['action']) ? $_GET['action'] : '';

// Function to handle database reads
function getDataFile() {
    $file = 'data.json';
    if (!file_exists($file)) {
        // Default minimal seed data
        $default = [
            "students" => [],
            "assignments" => [],
            "grades" => new stdClass()
        ];
        file_put_contents($file, json_encode($default));
        return $default;
    }
    return json_decode(file_get_contents($file), true);
}

if ($action === 'get_data') {
    echo json_encode(['status' => 'success', 'data' => getDataFile()]);
    exit;
}

if ($action === 'save_data') {
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);
    
    if($input) {
        file_put_contents('data.json', json_encode($input));
        echo json_encode(['status' => 'success', 'message' => 'Data tersimpan di server.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Data tidak valid']);
    }
    exit;
}

if ($action === 'upload_file') {
    $uploadDir = 'uploads/';
    
    // Create directory if not exists
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    // Check if file is uploaded
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['file']['tmp_name'];
        $fileName = $_FILES['file']['name'];
        $fileSize = $_FILES['file']['size'];
        
        // Clean filename (Basic protection)
        $fileName = preg_replace("/[^a-zA-Z0-9.-]/", "_", $fileName);
        
        // Allowed extensions (pdf, word, images, ppt)
        $allowedExts = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'ppt', 'pptx', 'xls', 'xlsx'];
        $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        
        if (in_array($fileExt, $allowedExts)) {
            // Append timestamp to prevent overriding
            $newFileName = time() . '_' . $fileName;
            $destPath = $uploadDir . $newFileName;
            
            if (move_uploaded_file($fileTmpPath, $destPath)) {
                echo json_encode([
                    'status' => 'success', 
                    'message' => 'File berhasil diunggah',
                    'filename' => $newFileName,
                    'path' => $destPath
                ]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Terdapat kesalahan pada proses sistem penulisan folder server.']);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Ekstensi file tidak didukung.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Tidak ada file yang terkirim / Error kode: ' . $_FILES['file']['error']]);
    }
    exit;
}

// Invalid request
echo json_encode(['status' => 'error', 'message' => 'API Route Not Found']);
exit;
?>
