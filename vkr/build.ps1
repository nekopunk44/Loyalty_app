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
[void]$html.AppendLine('p { margin: 0; text-align: justify; text-indent: 1.25cm; }')
[void]$html.AppendLine('h1 { font-size: 14pt; font-weight: bold; text-transform: uppercase; text-align: center; page-break-before: always; margin: 0 0 20pt 0; }')
[void]$html.AppendLine('h1:first-of-type { page-break-before: auto; }')
[void]$html.AppendLine('h2 { font-size: 14pt; font-weight: bold; text-align: center; margin: 12pt 0 8pt 0; }')
[void]$html.AppendLine('h3 { font-size: 14pt; font-weight: bold; text-align: left; margin: 8pt 0 6pt 0; }')
# Методичка п. 3.1: «Перед каждой позицией перечисления следует ставить только дефис».
# Списки выводим как параграфы с ведущим дефисом — это надёжнее, чем <ul>/<li>
# с CSS::before, который Word при импорте HTML может проигнорировать.
[void]$html.AppendLine('p.bullet { margin: 0 0 4pt 0; text-indent: 1.25cm; text-align: justify; }')
[void]$html.AppendLine('p.ordered { margin: 0 0 4pt 0; text-indent: 1.25cm; text-align: justify; }')
# Таблицы: TNR 12pt, одинарный интервал, по центру документа (методичка п. 3.2).
# Шапка (th) — центр, жирный, 12pt; ячейки (td) — по левому краю.
[void]$html.AppendLine('table { border-collapse: collapse; margin: 0 auto 12pt auto; font-size: 12pt; }')
[void]$html.AppendLine('th, td { border: 1px solid #000; padding: 4pt 6pt; vertical-align: top; text-align: left; line-height: 1; min-height: 12pt; }')
[void]$html.AppendLine('th { font-weight: bold; text-align: center; }')
[void]$html.AppendLine('pre { font-family: "Courier New", monospace; font-size: 10pt; white-space: pre-wrap; margin: 8pt 0; }')
[void]$html.AppendLine('code { font-family: "Courier New", monospace; font-size: 11pt; }')
# Подпись рисунка — под рисунком, по центру, 12pt, без точки в конце (методичка п. 3.2).
# Между рисунком и основным текстом — пустая строка 12pt одинарный сверху и снизу подписи.
[void]$html.AppendLine('p.caption { font-size: 12pt; text-align: center; text-indent: 0; margin: 0 0 12pt 0; line-height: 1; }')
# Подпись таблицы — над таблицей, по левому краю, 12pt; между подписью и таблицей 6pt.
[void]$html.AppendLine('p.caption-table { font-size: 12pt; text-align: left; text-indent: 0; margin: 12pt 0 6pt 0; font-weight: normal; line-height: 1; }')
[void]$html.AppendLine('p.center { text-align: center; text-indent: 0; margin: 12pt 0 0 0; }')
[void]$html.AppendLine('img.figure { display: block; margin: 0 auto; max-width: 14cm; height: auto; }')
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
    # Методичка п. 3.1: маркер перечисления — только дефис (–, U+2013)
    if ($line -match '^[-*] (.+)$') {
        Close-ListIfNeeded $html ([ref]$listMode)
        [void]$html.AppendLine('<p class="bullet">' + [char]0x2013 + [char]0x00A0 + (Convert-InlineMarkdownToHtml $matches[1]) + '</p>')
        continue
    }
    if ($line -match '^(\d+)\. (.+)$') {
        Close-ListIfNeeded $html ([ref]$listMode)
        [void]$html.AppendLine('<p class="ordered">' + $matches[1] + ') ' + (Convert-InlineMarkdownToHtml $matches[2]) + '</p>')
        continue
    }

    Close-ListIfNeeded $html ([ref]$listMode)

    $plain = $line.Trim()

    # Заголовок таблицы: «Таблица N.N — ...» или «**Таблица N.N — ...**» (методичка п. 3.2)
    if ($plain -match '^\*\*(Таблица\s+\d+(?:\.\d+)?\s*[–—-]\s*.+?)\*\*$' -or
        $plain -match '^(Таблица\s+\d+(?:\.\d+)?\s*[–—-]\s*.+)$') {
        [void]$html.AppendLine('<p class="caption-table">' + (Convert-InlineMarkdownToHtml $matches[1]) + '</p>')
        continue
    }

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
    # ReadOnly=$false, ConfirmConversions=$false — иначе .AutoHyphenation и др. не пишутся
    $doc = $word.Documents.Open([string]$htmlPath, $false, $false)

    # ---- Параметры страницы (методичка п. 3.1, табл. 3.1) ----
    $pageSetup = $doc.PageSetup
    $pageSetup.TopMargin    = $word.CentimetersToPoints(2.0)
    $pageSetup.BottomMargin = $word.CentimetersToPoints(2.0)
    $pageSetup.LeftMargin   = $word.CentimetersToPoints(3.0)
    $pageSetup.RightMargin  = $word.CentimetersToPoints(1.0)

    # ---- Стиль Normal: Times New Roman 14pt, 1.5 межстрочный (для всего основного текста) ----
    # wdStyleNormal = -1; на RU Word стиль называется «Обычный», поэтому только integer ID.
    # ВАЖНО: для 1,5 интервала используется отдельная константа wdLineSpace1pt5 = 1.
    # При wdLineSpaceMultiple = 5 Word считает множитель = LineSpacing / 12 (а не / font.size),
    # поэтому LineSpacing = 21 даёт 1,75, а не 1,5 — это легко перепутать.
    $normal = $doc.Styles.Item(-1)
    $normal.Font.Name = 'Times New Roman'
    $normal.Font.Size = 14
    $normal.ParagraphFormat.LineSpacingRule = 1    # wdLineSpace1pt5
    $normal.ParagraphFormat.WidowControl    = $true

    # ---- Запрет висячих строк на всём документе (1,5 интервал уже на стиле Normal) ----
    # Не трогаем LineSpacingRule всего диапазона — иначе таблицы и подписи (12pt, одинарный)
    # тоже станут 1,5, а методичка требует для них одинарный (стр. 1094, 1131).
    $doc.Range().ParagraphFormat.WidowControl = $true

    # ---- Автоматические переносы слов (методичка: «обязательным переносом слов») ----
    $doc.AutoHyphenation = $true
    $doc.HyphenateCaps   = $true

    # ---- Заголовки разделов/подразделов не отрываются от следующего абзаца ----
    # wdStyleHeading1 = -2, wdStyleHeading2 = -3, wdStyleHeading3 = -4
    # Табл. 3.1 п. 1, 2: «Перенос слов — Нет» для заголовков разделов/подразделов
    foreach ($styleId in @(-2, -3, -4)) {
        try {
            $h = $doc.Styles.Item($styleId)
            $h.ParagraphFormat.KeepWithNext      = $true
            $h.ParagraphFormat.WidowControl      = $true
            $h.ParagraphFormat.NoLineNumber      = $true
            $h.NoSpaceBetweenParagraphsOfSameStyle = $false
            $h.Font.Name = 'Times New Roman'
            # Запрет автопереносов в заголовках
            $h.ParagraphFormat.SuppressAutoHyphens = $true
        } catch { }
    }

    # ---- Подписи к рисункам и таблицам: запрет переносов + одинарный интервал ----
    # Табл. 3.1 п. 4 («Перенос слов: Нет») и методичка стр. 1094 («межстрочный — одинарный»).
    # Подписи имеют шрифт 12pt — отлавливаем именно их, чтобы не задеть основной текст.
    # wdLineSpaceSingle = 0
    foreach ($para in $doc.Paragraphs) {
        try {
            if ([math]::Round($para.Range.Font.Size) -eq 12) {
                $para.Format.SuppressAutoHyphens = $true
                $para.Format.LineSpacingRule = 0
            }
        } catch { }
    }

    # ---- Нумерация страниц внизу справа (методичка п. 3.1: «внизу страницы, справа»;
    #      «Номер страницы на титульном листе и задании не проставляют» — здесь титульного
    #      листа нет, поэтому ShowFirstPageNumber = $true) ----
    $wdAlignPageNumberRight = 2
    foreach ($section in $doc.Sections) {
        $footer = $section.Footers.Item(1)   # wdHeaderFooterPrimary = 1
        $footer.PageNumbers.Add($wdAlignPageNumberRight, $false) | Out-Null
        $footer.PageNumbers.NumberStyle = 0  # wdPageNumberStyleArabic
        $footer.PageNumbers.RestartNumberingAtSection = $false
        $footer.PageNumbers.StartingNumber = 1
        # Шрифт колонцифры — Times New Roman 14pt
        $footer.Range.Font.Name = 'Times New Roman'
        $footer.Range.Font.Size = 14
    }

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
