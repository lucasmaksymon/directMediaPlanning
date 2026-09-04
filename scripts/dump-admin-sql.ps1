$ErrorActionPreference = "Stop"
$server = $env:ADMIN_SQL_SERVER
if (-not $server) { $server = "149.50.130.139" }
$user = $env:ADMIN_SQL_USER
if (-not $user) { $user = "nextmedia_USER" }
$db = $env:ADMIN_SQL_DB
if (-not $db) { $db = "nextmedia_DB" }
$pwd = $env:ADMIN_SQL_PASSWORD
if (-not $pwd) { throw "Falta ADMIN_SQL_PASSWORD" }
$cs = "Server=$server;Database=$db;User ID=$user;Password=$pwd;Encrypt=False;Connection Timeout=30;"
$outDir = Join-Path $PSScriptRoot "..\data\admin-sql"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$c = New-Object System.Data.SqlClient.SqlConnection $cs
$c.Open()
Write-Output "connected $($c.Database)"

function ReadAll([string]$sql) {
  $cmd = $c.CreateCommand()
  $cmd.CommandText = $sql
  $cmd.CommandTimeout = 90
  $r = $cmd.ExecuteReader()
  $cols = @()
  for ($i = 0; $i -lt $r.FieldCount; $i++) { $cols += $r.GetName($i) }
  $rows = New-Object System.Collections.Generic.List[object]
  while ($r.Read()) {
    $obj = [ordered]@{}
    for ($i = 0; $i -lt $r.FieldCount; $i++) {
      if ($r.IsDBNull($i)) { $obj[$cols[$i]] = $null; continue }
      $val = $r.GetValue($i)
      if ($val -is [datetime]) { $obj[$cols[$i]] = $val.ToString("yyyy-MM-ddTHH:mm:ss") }
      elseif ($val -is [bool]) { $obj[$cols[$i]] = $val }
      elseif ($val -is [byte[]]) { $obj[$cols[$i]] = $null }
      elseif ($val -is [decimal] -or $val -is [single] -or $val -is [double]) { $obj[$cols[$i]] = [decimal]$val }
      else { $obj[$cols[$i]] = $val }
    }
    $rows.Add($obj)
  }
  $r.Close()
  return @{ cols = $cols; rows = $rows }
}

$schema = ReadAll "SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS ORDER BY TABLE_NAME, ORDINAL_POSITION"
$sb = New-Object System.Text.StringBuilder
$cur = ""
foreach ($row in $schema.rows) {
  $t = [string]$row["TABLE_NAME"]
  if ($t -ne $cur) {
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("==== $t ====")
    $cur = $t
  }
  [void]$sb.AppendLine(("{0}`t{1}`tnull={2}" -f $row["COLUMN_NAME"], $row["DATA_TYPE"], $row["IS_NULLABLE"]))
}
[IO.File]::WriteAllText((Join-Path $outDir "_schema.txt"), $sb.ToString())
Write-Output "schema $($schema.rows.Count) columns"

$tables = @(
  "ciudades","clientes","dispositivos","dispositivosProveedor","empresas",
  "facturasCompra","facturasCompraOrdenes","facturasVenta","formatos","gastos",
  "medios","monedas","opCompra","oProduccion","opVenta","ordenesPago",
  "ordenesPagoFacturas","pagos","producciones","proveedores","provincias",
  "recibosCompra","recibosCompraFacturas","recibosVenta","recibosVentaFacturas","usuarios"
)

foreach ($name in $tables) {
  try {
    $data = ReadAll "SELECT * FROM [$name]"
    $path = Join-Path $outDir "$name.json"
    $json = $data.rows | ConvertTo-Json -Depth 5 -Compress
    if (-not $json) { $json = "[]" }
    elseif ($data.rows.Count -eq 1 -and $json.StartsWith("{")) { $json = "[$json]" }
    [IO.File]::WriteAllText($path, $json, [Text.UTF8Encoding]::new($false))
    Write-Output "$name $($data.rows.Count) cols=$($data.cols -join ',')"
  } catch {
    Write-Output "SKIP $name :: $($_.Exception.Message)"
  }
}

$c.Close()
Write-Output "DONE"
