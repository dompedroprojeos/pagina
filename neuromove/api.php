<?php
// api.php — persistência em arquivo real. Cada paciente ganha uma pasta com um cadastro.json,
// que acumula as sessões ao longo do tempo. Requer um servidor com PHP (Apache/Nginx+PHP-FPM).
// No GitHub Pages (hospedagem estática) este arquivo não executa — o app.js detecta isso
// automaticamente e usa localStorage no lugar, sem quebrar nada.

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';
$baseDir = __DIR__ . '/data/pacientes';
if(!is_dir($baseDir)){ @mkdir($baseDir, 0775, true); }

function slugify($s){
  $s = @iconv('UTF-8', 'ASCII//TRANSLIT', $s);
  if($s === false) $s = $s;
  $s = preg_replace('/[^A-Za-z0-9]+/', '_', $s);
  return trim($s, '_');
}

function findPatientFile($baseDir, $id){
  foreach(glob($baseDir.'/*/cadastro.json') as $f){
    $j = json_decode(file_get_contents($f), true);
    if($j && isset($j['paciente']['id']) && $j['paciente']['id'] === $id) return $f;
  }
  return null;
}

switch($action){

  case 'ping':
    echo json_encode(['ok'=>true, 'servidor'=>'NeuroMove Rehab API']);
    break;

  case 'login':
    // Lê usuario/senha do POST (nunca da URL, pra não parar em logs de acesso).
    $body = json_decode(file_get_contents('php://input'), true);
    $usuario = $body['usuario'] ?? '';
    $senha   = $body['senha'] ?? '';
    $senhaFile = __DIR__ . '/data/senha.json';
    if(!file_exists($senhaFile)){
      http_response_code(500);
      echo json_encode(['ok'=>false, 'error'=>'senha.json não encontrado no servidor']);
      break;
    }
    $cred = json_decode(file_get_contents($senhaFile), true);
    $ok = $cred && isset($cred['usuario'], $cred['senha'])
          && hash_equals((string)$cred['usuario'], (string)$usuario)
          && hash_equals((string)$cred['senha'], (string)$senha);
    echo json_encode(['ok'=>$ok]);
    break;

  case 'list':
    $out = [];
    foreach(glob($baseDir.'/*/cadastro.json') as $f){
      $j = json_decode(file_get_contents($f), true);
      if($j) $out[] = $j;
    }
    echo json_encode($out);
    break;

  case 'get':
    $id = $_GET['id'] ?? '';
    $f = findPatientFile($baseDir, $id);
    if($f){ echo file_get_contents($f); }
    else { http_response_code(404); echo json_encode(['error'=>'paciente não encontrado']); }
    break;

  case 'save':
    $body = file_get_contents('php://input');
    $j = json_decode($body, true);
    if(!$j || empty($j['paciente']['nome']) || empty($j['paciente']['id'])){
      http_response_code(400);
      echo json_encode(['error'=>'payload inválido']);
      break;
    }
    $existing = findPatientFile($baseDir, $j['paciente']['id']);
    if($existing){
      $folder = dirname($existing);
    } else {
      $folder = $baseDir.'/'.slugify($j['paciente']['nome']).'_'.substr($j['paciente']['id'],0,8);
      if(!is_dir($folder)) @mkdir($folder, 0775, true);
    }
    $ok = @file_put_contents($folder.'/cadastro.json', json_encode($j, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
    if($ok === false){
      http_response_code(500);
      echo json_encode(['error'=>'não foi possível gravar o arquivo — confira permissões da pasta data/']);
    } else {
      echo json_encode(['ok'=>true, 'arquivo'=>$folder.'/cadastro.json']);
    }
    break;

  default:
    http_response_code(400);
    echo json_encode(['error'=>'ação inválida']);
}
