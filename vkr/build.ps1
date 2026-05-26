# Fast build of thesis markdown files into DOCX via HTML + Word COM.
# Usage: powershell -ExecutionPolicy Bypass -File .\build.ps1

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildDir = Join-Path $root 'build'
if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}

$fullMdPath = Join-Path $root '99_full.md'
$htmlPath = Join-Path $buildDir 'VKR_Villa_Jaconda.html'
$docxPath = Join-Path $buildDir 'VKR_Villa_Jaconda.docx'

$parts = Get-ChildItem -Path $root -Filter '*.md' |
    Where-Object { $_.Name -match '^\d{2}_' -and $_.Name -ne '99_full.md' } |
    Sort-Object Name

if ($parts.Count -eq 0) {
    Write-Error "No NN_*.md files found in $root"
    exit 1
}

$buf = New-Object System.Text.StringBuilder
foreach ($p in $parts) {
    [void]$buf.AppendLine((Get-Content -Path $p.FullName -Raw -Encoding UTF8))
    [void]$buf.AppendLine()
}
[System.IO.File]::WriteAllText($fullMdPath, $buf.ToString(), [System.Text.UTF8Encoding]::new($false))
Write-Host "Built $fullMdPath ($($parts.Count) parts)" -ForegroundColor Cyan

function Convert-InlineMarkdownToHtml {
    param([string]$text)

    if ($null -eq $text) { return '' }

    $placeholders = @{}
    $script:codeCounter = 0

    $text = [regex]::Replace($text, '`([^`]+)`', {
        param($m)
        $key = "__CODE_$script:codeCounter`__"
        $placeholders[$key] = '<code>' + [System.Net.WebUtility]::HtmlEncode($m.Groups[1].Value) + '</code>'
        $script:codeCounter++
        return $key
    })

    $encoded = [System.Net.WebUtility]::HtmlEncode($text)
    $encoded = [regex]::Replace($encoded, '\*\*([^*]+)\*\*', '<strong>$1</strong>')
    $encoded = [regex]::Replace($encoded, '\*([^*]+)\*', '<em>$1</em>')
    $encoded = [regex]::Replace($encoded, '~~([^~]+)~~', '<span style="text-decoration: line-through;">$1</span>')

    foreach ($key in $placeholders.Keys) {
        $encoded = $encoded.Replace($key, $placeholders[$key])
    }

    return $encoded
}

function Parse-TableRow {
    param([string]$line)
    return $line -split '\|' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
}

function Is-TableSeparator {
    param([string]$line)
    return $line -match '^\|[\s\-\|:]+\|$'
}

function Flush-TableHtml {
    param(
        [System.Text.StringBuilder]$html,
        [System.Collections.Generic.List[string[]]]$tableRows
    )

    if ($tableRows.Count -eq 0) { return }

    [void]$html.AppendLine('<table>')
    for ($r = 0; $r -lt $tableRows.Count; $r++) {
        $tag = if ($r -eq 0) { 'th' } else { 'td' }
        [void]$html.AppendLine('<tr>')
        foreach ($cell in $tableRows[$r]) {
            [void]$html.AppendLine("<$tag>" + (Convert-InlineMarkdownToHtml $cell) + "</$tag>")
        }
        [void]$html.AppendLine('</tr>')
    }
    [void]$html.AppendLine('</table>')
    $tableRows.Clear()
}

function Close-ListIfNeeded {
    param([System.Text.StringBuilder]$htmlRef, [ref]$modeRef)

    if ($modeRef.Value -eq 'ul') {
        [void]$htmlRef.AppendLine('</ul>')
        $modeRef.Value = ''
    } elseif ($modeRef.Value -eq 'ol') {
        [void]$htmlRef.AppendLine('</ol>')
        $modeRef.Value = ''
    }
}

$html = New-Object System.Text.StringBuilder
[void]$html.AppendLine('<!DOCTYPE html>')
[void]$html.AppendLine('<html lang="ru">')
[void]$html.AppendLine('<head>')
[void]$html.AppendLine('<meta charset="utf-8">')
[void]$html.AppendLine('<title>VKR Villa Jaconda</title>')
[void]$html.AppendLine('<style>')
[void]$html.AppendLine('@page { size: A4; margin: 20mm 10mm 20mm 30mm; }')
[void]$html.AppendLine('body { font-family: "Times New Roman", serif; font-size: 14pt; line-height: 1.5; }')
[void]$html.AppendLine('p { margin: 0 0 8pt 0; text-align: justify; text-indent: 1.25cm; }')
[void]$html.AppendLine('h1 { font-size: 14pt; font-weight: bold; text-transform: uppercase; text-align: center; page-break-before: always; margin: 0 0 20pt 0; }')
[void]$html.AppendLine('h1:first-of-type { page-break-before: auto; }')
[void]$html.AppendLine('h2 { font-size: 14pt; font-weight: bold; text-align: center; margin: 12pt 0 8pt 0; }')
[void]$html.AppendLine('h3 { font-size: 14pt; font-weight: bold; text-align: left; margin: 8pt 0 6pt 0; }')
[void]$html.AppendLine('ul, ol { margin: 0 0 8pt 1.25cm; padding-left: 0.6cm; }')
[void]$html.AppendLine('li { margin: 0 0 4pt 0; }')
[void]$html.AppendLine('table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 12pt; }')
[void]$html.AppendLine('th, td { border: 1px solid #000; padding: 4pt 6pt; vertical-align: top; text-align: left; }')
[void]$html.AppendLine('th { font-weight: bold; }')
[void]$html.AppendLine('pre { font-family: "Courier New", monospace; font-size: 10pt; white-space: pre-wrap; margin: 8pt 0; }')
[void]$html.AppendLine('code { font-family: "Courier New", monospace; font-size: 11pt; }')
[void]$html.AppendLine('p.caption { font-size: 12pt; text-align: center; text-indent: 0; margin: 4pt 0 8pt 0; }')
[void]$html.AppendLine('p.center { text-align: center; text-indent: 0; }')
[void]$html.AppendLine('img.figure { display: block; margin: 8pt auto 4pt auto; max-width: 14cm; height: auto; }')
[void]$html.AppendLine('</style>')
[void]$html.AppendLine('</head>')
[void]$html.AppendLine('<body>')

$lines = [System.IO.File]::ReadAllLines($fullMdPath, [System.Text.Encoding]::UTF8)
$tableRows = [System.Collections.Generic.List[string[]]]::new()
$inCode = $false
$codeLang = ''
$listMode = ''

foreach ($raw in $lines) {
    $line = $raw.TrimEnd()

    if ($line -match '^```(.*)$') {
        Flush-TableHtml $html $tableRows
        Close-ListIfNeeded $html ([ref]$listMode)

        if ($inCode) {
            if ($codeLang -ne '') {
                [void]$html.AppendLine('</pre>')
            }
            $inCode = $false
            $codeLang = ''
        } else {
            $inCode = $true
            $codeLang = $matches[1].Trim()
            if ($codeLang -ne '') {
                [void]$html.AppendLine('<pre>')
            }
        }
        continue
    }

    if ($inCode) {
        if ($codeLang -ne '') {
            [void]$html.AppendLine([System.Net.WebUtility]::HtmlEncode($line))
        }
        continue
    }

    if ($line -match '!\[([^\]]*)\]\(assets/([^)]+)\)') {
        Flush-TableHtml $html $tableRows
        Close-ListIfNeeded $html ([ref]$listMode)
        $captionText = $matches[1]
        $imgFile = $matches[2]
        $imgFullPath = Join-Path $root "assets\$imgFile"

        if (Test-Path $imgFullPath) {
            $imgUri = [System.Uri]::new($imgFullPath).AbsoluteUri
            [void]$html.AppendLine('<p class="center"><img class="figure" src="' + $imgUri + '" alt="' + [System.Net.WebUtility]::HtmlEncode($captionText) + '"></p>')
            [void]$html.AppendLine('<p class="caption">' + [System.Net.WebUtility]::HtmlEncode($captionText) + '</p>')
        } else {
            [void]$html.AppendLine('<p>[Image missing: ' + [System.Net.WebUtility]::HtmlEncode($imgFile) + ']</p>')
        }
        continue
    }

    if ($line -match '^\|') {
        Close-ListIfNeeded $html ([ref]$listMode)
        if (-not (Is-TableSeparator $line)) {
            $tableRows.Add((Parse-TableRow $line))
        }
        continue
    }

    Flush-TableHtml $html $tableRows

    if ([string]::IsNullOrWhiteSpace($line)) {
        Close-ListIfNeeded $html ([ref]$listMode)
        continue
    }

    if ($line -match '^# (.+)$') {
        Close-ListIfNeeded $html ([ref]$listMode)
        [void]$html.AppendLine('<h1>' + (Convert-InlineMarkdownToHtml $matches[1]) + '</h1>')
        continue
    }
    if ($line -match '^## (.+)$') {
        Close-ListIfNeeded $html ([ref]$listMode)
        [void]$html.AppendLine('<h2>' + (Convert-InlineMarkdownToHtml $matches[1]) + '</h2>')
        continue
    }
    if ($line -match '^### (.+)$') {
        Close-ListIfNeeded $html ([ref]$listMode)
        [void]$html.AppendLine('<h3>' + (Convert-InlineMarkdownToHtml $matches[1]) + '</h3>')
        continue
    }
    if ($line -match '^[-*] (.+)$') {
        if ($listMode -ne 'ul') {
            Close-ListIfNeeded $html ([ref]$listMode)
            [void]$html.AppendLine('<ul>')
            $listMode = 'ul'
        }
        [void]$html.AppendLine('<li>' + (Convert-InlineMarkdownToHtml $matches[1]) + '</li>')
        continue
    }
    if ($line -match '^(\d+)\. (.+)$') {
        if ($listMode -ne 'ol') {
            Close-ListIfNeeded $html ([ref]$listMode)
            [void]$html.AppendLine('<ol>')
            $listMode = 'ol'
        }
        [void]$html.AppendLine('<li>' + (Convert-InlineMarkdownToHtml $matches[2]) + '</li>')
        continue
    }

    Close-ListIfNeeded $html ([ref]$listMode)

    $plain = $line.Trim()
    [void]$html.AppendLine('<p>' + (Convert-InlineMarkdownToHtml $plain) + '</p>')
}

Flush-TableHtml $html $tableRows
Close-ListIfNeeded $html ([ref]$listMode)
[void]$html.AppendLine('</body>')
[void]$html.AppendLine('</html>')

[System.IO.File]::WriteAllText($htmlPath, $html.ToString(), [System.Text.UTF8Encoding]::new($false))
Write-Host "Built $htmlPath" -ForegroundColor Cyan

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$word.ScreenUpdating = $false

try {
    $doc = $word.Documents.Open([string]$htmlPath, $false, $true)

    $pageSetup = $doc.PageSetup
    $pageSetup.TopMargin    = $word.CentimetersToPoints(2.0)
    $pageSetup.BottomMargin = $word.CentimetersToPoints(2.0)
    $pageSetup.LeftMargin   = $word.CentimetersToPoints(3.0)
    $pageSetup.RightMargin  = $word.CentimetersToPoints(1.0)

    $wdFormatDocumentDefault = 16
    $doc.SaveAs([string]$docxPath, $wdFormatDocumentDefault)
    $doc.Close($false)
    Write-Host "Built $docxPath" -ForegroundColor Green
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
