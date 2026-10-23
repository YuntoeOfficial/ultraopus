[CmdletBinding()]
param(
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

$settingsPath = Join-Path $HOME '.claude\settings.json'
if (-not (Test-Path -LiteralPath $settingsPath)) {
    throw "Settings file not found: $settingsPath"
}

$renderer = Join-Path $PSScriptRoot 'subagent-status.js'
if (-not $Uninstall -and -not (Test-Path -LiteralPath $renderer)) {
    throw "Renderer not found: $renderer"
}

$rendererPath = (Resolve-Path -LiteralPath $renderer).Path -replace '\\', '/'

$settings = [IO.File]::ReadAllText($settingsPath) | ConvertFrom-Json
$backup = "$settingsPath.bak-ultraopus"
Copy-Item -LiteralPath $settingsPath -Destination $backup -Force

if ($Uninstall) {
    $settings.PSObject.Properties.Remove('subagentStatusLine')
    Write-Output "Removed subagentStatusLine from $settingsPath"
} else {
    $entry = [pscustomobject]@{
        type    = 'command'
        command = 'node "' + $rendererPath + '"'
    }
    if ($settings.PSObject.Properties.Name -contains 'subagentStatusLine') {
        $settings.subagentStatusLine = $entry
    } else {
        $settings | Add-Member -NotePropertyName subagentStatusLine -NotePropertyValue $entry
    }
    Write-Output "subagentStatusLine -> node `"$rendererPath`""
}

[IO.File]::WriteAllText($settingsPath, ($settings | ConvertTo-Json -Depth 64), (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Backup: $backup"
Write-Output "Reload with /reload-plugins or restart the session."
