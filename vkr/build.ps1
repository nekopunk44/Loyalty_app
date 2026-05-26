# build.ps1 — сборка ВКР из Markdown-файлов в .docx со стилями по ГОСТ.
# Использование: powershell -ExecutionPolicy Bypass -File .\build.ps1
# Требования: Windows + Microsoft Word с поддержкой COM.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildDir = Join-Path $root 'build'
if (-not (Test-Path $buildDir)) { New-Item -ItemType Directory -Path $buildDir | Out-Null }

$fullMdPath = Join-Path $root '99_full.md'
$docxPath = Join-Path $buildDir 'VKR_Villa_Jaconda.docx'

# 1. Конкатенация .md-файлов в порядке 00_ → 08_ ----------------------------------
$parts = Get-ChildItem -Path $root -Filter '*.md' |
    Where-Object { $_.Name -match '^\d{2}_' -and $_.Name -ne '99_full.md' } |
    Sort-Object Name

if ($parts.Count -eq 0) {
    Write-Error "Не найдены файлы вида NN_*.md в $root"
    exit 1
}

$buf = New-Object System.Text.StringBuilder
foreach ($p in $parts) {
    [void]$buf.AppendLine((Get-Content -Path $p.FullName -Raw -Encoding UTF8))
    [void]$buf.AppendLine()
}
[System.IO.File]::WriteAllText($fullMdPath, $buf.ToString(), [System.Text.UTF8Encoding]::new($false))
Write-Host "Собран $fullMdPath ($($parts.Count) файлов)" -ForegroundColor Cyan

# 2. Запуск Word COM ----------------------------------------------------------------
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0  # wdAlertsNone

try {
    $doc = $word.Documents.Add()

    # 2.1 Параметры страницы (ГОСТ 2.105: левое 30 мм, правое 10 мм, верх/низ 20 мм)
    $pageSetup = $doc.PageSetup
    $pageSetup.TopMargin    = $word.CentimetersToPoints(2.0)
    $pageSetup.BottomMargin = $word.CentimetersToPoints(2.0)
    $pageSetup.LeftMargin   = $word.CentimetersToPoints(3.0)
    $pageSetup.RightMargin  = $word.CentimetersToPoints(1.0)

    $wdStyleNormal   = -1
    $wdStyleHeading1 = -2
    $wdStyleHeading2 = -3
    $wdStyleHeading3 = -4

    # Межстрочный интервал 1,5 (wdLineSpace1pt5 = 1)
    $wdLineSpace1pt5       = 1
    $wdAlignLeft           = 0
    $wdAlignCenter         = 1
    $wdAlignJustify        = 3

    $normal = $doc.Styles.Item($wdStyleNormal)
    $normal.Font.Name = 'Times New Roman'
    $normal.Font.Size = 14
    $normal.Font.Bold = $false
    $normal.Font.Italic = $false
    $normal.ParagraphFormat.LineSpacingRule = $wdLineSpace1pt5   # межстрочный 1,5
    $normal.ParagraphFormat.Alignment = $wdAlignJustify          # по ширине
    $normal.ParagraphFormat.FirstLineIndent = $word.CentimetersToPoints(1.25)
    $normal.ParagraphFormat.SpaceBefore = 0
    $normal.ParagraphFormat.SpaceAfter  = 0

    # Таблица 3.1 методички: оба заголовка — 14pt жирный, по центру, 1,5 интервал
    # Heading1 (глава): до=0pt после=20pt AllCaps=ДА новая страница
    # Heading2 (параграф): до=12pt после=8pt AllCaps=НЕТ
    # Heading3 (подпункт): до=8pt  после=6pt AllCaps=НЕТ
    $headingConfigs = @(
        @{ Id = $wdStyleHeading1; Size = 14; AllCaps = $true;  Align = $wdAlignCenter; SpaceBefore = 0;  SpaceAfter = 20; PageBreak = $true  },
        @{ Id = $wdStyleHeading2; Size = 14; AllCaps = $false; Align = $wdAlignCenter; SpaceBefore = 12; SpaceAfter = 8;  PageBreak = $false },
        @{ Id = $wdStyleHeading3; Size = 14; AllCaps = $false; Align = $wdAlignLeft;   SpaceBefore = 8;  SpaceAfter = 6;  PageBreak = $false }
    )
    foreach ($cfg in $headingConfigs) {
        $s = $doc.Styles.Item($cfg.Id)
        $s.Font.Name   = 'Times New Roman'
        $s.Font.Size   = $cfg.Size
        $s.Font.Bold   = $true
        $s.Font.Italic = $false
        $s.Font.AllCaps = $cfg.AllCaps
        $s.Font.Color  = 0
        $s.ParagraphFormat.Alignment       = $cfg.Align
        $s.ParagraphFormat.FirstLineIndent = 0
        $s.ParagraphFormat.SpaceBefore     = $cfg.SpaceBefore
        $s.ParagraphFormat.SpaceAfter      = $cfg.SpaceAfter
        $s.ParagraphFormat.LineSpacingRule = $wdLineSpace1pt5
        $s.ParagraphFormat.PageBreakBefore = $cfg.PageBreak
    }

    # 3. Вспомогательные функции ---------------------------------------------------

    function Strip-Markdown {
        param([string]$text)
        # Убираем **bold**, *italic*, `code`, ~~strike~~
        $text = $text -replace '`[^`]+`', { $args[0].Value -replace '`', '' }
        $text = $text -replace '\*\*([^*]+)\*\*', '$1'
        $text = $text -replace '\*([^*]+)\*', '$1'
        $text = $text -replace '~~([^~]+)~~', '$1'
        return $text.Trim()
    }

    function Add-Para {
        param([string]$text, [int]$styleId = -1)
        $sel = $word.Selection
        $sel.Style = $doc.Styles.Item($styleId)
        $sel.TypeText((Strip-Markdown $text))
        $sel.TypeParagraph()
    }

    # Разбить строку таблицы вида "| a | b | c |" на массив ячеек
    function Parse-TableRow {
        param([string]$line)
        $cells = $line -split '\|' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
        return $cells
    }

    # Проверить, является ли строка разделителем таблицы (|---|---|)
    function Is-TableSeparator {
        param([string]$line)
        return $line -match '^\|[\s\-\|:]+\|$'
    }

    # Создать таблицу Word из собранных строк
    function Flush-Table {
        param([System.Collections.Generic.List[string[]]]$tableRows)
        if ($tableRows.Count -eq 0) { return }

        $colCount = ($tableRows | ForEach-Object { $_.Count } | Measure-Object -Maximum).Maximum
        $rowCount = $tableRows.Count

        $sel = $word.Selection

        # Добавить абзац-разрыв перед таблицей если нужно
        $tbl = $doc.Tables.Add($sel.Range, $rowCount, $colCount)
        $tbl.Borders.Enable = $true

        # Стиль текста в таблице — Times New Roman 12pt, одиночный интервал
        $tbl.Range.Font.Name = 'Times New Roman'
        $tbl.Range.Font.Size = 12
        $tbl.Range.ParagraphFormat.LineSpacingRule = 0   # wdLineSpaceSingle
        $tbl.Range.ParagraphFormat.SpaceBefore = 2
        $tbl.Range.ParagraphFormat.SpaceAfter = 2
        $tbl.Range.ParagraphFormat.FirstLineIndent = 0
        $tbl.Range.ParagraphFormat.Alignment = 0         # wdAlignParagraphLeft

        for ($r = 0; $r -lt $rowCount; $r++) {
            $cells = $tableRows[$r]
            # Жирный шрифт для заголовочной строки
            if ($r -eq 0) {
                $tbl.Rows.Item(1).Range.Font.Bold = $true
            }
            for ($c = 0; $c -lt $cells.Count; $c++) {
                $cellText = Strip-Markdown $cells[$c]
                $tbl.Cell($r + 1, $c + 1).Range.Text = $cellText
            }
        }

        # Переместить курсор после таблицы
        $sel.SetRange($tbl.Range.End, $tbl.Range.End)
        $sel.TypeParagraph()

        $tableRows.Clear()
    }

    # 4. Парсинг markdown и запись --------------------------------------------------
    $lines = [System.IO.File]::ReadAllLines($fullMdPath, [System.Text.Encoding]::UTF8)

    $tableRows = [System.Collections.Generic.List[string[]]]::new()
    $inCode = $false
    $codeLang = ''

    # Вставка PNG-изображения в Word
    function Insert-Image {
        param([string]$imgPath, [string]$captionText)
        $sel = $word.Selection
        # Убедимся что курсор на новой строке
        $sel.Style = $doc.Styles.Item($wdStyleNormal)
        $sel.ParagraphFormat.Alignment = 1  # wdAlignParagraphCenter
        $sel.ParagraphFormat.FirstLineIndent = 0
        try {
            $shape = $sel.InlineShapes.AddPicture($imgPath, $false, $true)
            # Масштабируем до ширины полосы ~14 см
            $maxWPt = $word.CentimetersToPoints(14)
            if ($shape.Width -gt $maxWPt) {
                $ratio = $maxWPt / $shape.Width
                $shape.Width  = $maxWPt
                $shape.Height = $shape.Height * $ratio
            }
        } catch {
            $sel.TypeText("[Изображение: $imgPath]")
        }
        $sel.TypeParagraph()
        # Подпись к рисунку — Times New Roman 12pt, по центру, без курсива (методичка п.4)
        $sel.Style = $doc.Styles.Item($wdStyleNormal)
        $sel.Font.Italic = $false
        $sel.Font.Bold   = $false
        $sel.Font.Size   = 12
        $sel.ParagraphFormat.Alignment       = $wdAlignCenter
        $sel.ParagraphFormat.FirstLineIndent = 0
        $sel.TypeText($captionText)
        $sel.TypeParagraph()
        # Сбросить на Normal
        $sel.Font.Size   = 14
        $sel.ParagraphFormat.Alignment       = $wdAlignJustify
        $sel.ParagraphFormat.FirstLineIndent = $word.CentimetersToPoints(1.25)
    }

    foreach ($raw in $lines) {
        $line = $raw.TrimEnd()

        # Блоки кода ```lang...``` — отслеживаем язык
        if ($line -match '^```(.*)$') {
            if ($tableRows.Count -gt 0) { Flush-Table $tableRows }
            if ($inCode) {
                $inCode = $false; $codeLang = ''
            } else {
                $inCode = $true; $codeLang = $matches[1].Trim()
            }
            continue
        }

        # Встроенные изображения ![caption](assets/fig_x_x.png)
        if ($line -match '!\[([^\]]*)\]\(assets/([^)]+)\)') {
            if ($tableRows.Count -gt 0) { Flush-Table $tableRows }
            $captionText = $matches[1]
            $imgFile     = $matches[2]
            $imgFullPath = Join-Path $root "assets\$imgFile"
            if (Test-Path $imgFullPath) {
                Insert-Image -imgPath $imgFullPath -captionText $captionText
            } else {
                Add-Para -text "[$captionText — файл не найден: $imgFile]" -styleId $wdStyleNormal
            }
            continue
        }

        if ($inCode) {
            # Пропускаем диаграммы-заглушки без языка (чистый ```...```)
            # Код с языком (```javascript, ```python) — выводим Courier New
            if ($codeLang -ne '') {
                $sel = $word.Selection
                $sel.Style = $doc.Styles.Item($wdStyleNormal)
                $sel.Font.Name = 'Courier New'
                $sel.Font.Size = 10
                $sel.TypeText($line)
                $sel.TypeParagraph()
                $sel.Font.Name = 'Times New Roman'
                $sel.Font.Size = 14
            }
            continue
        }

        # Таблицы
        if ($line -match '^\|') {
            if (-not (Is-TableSeparator $line)) {
                $tableRows.Add((Parse-TableRow $line))
            }
            continue
        }

        # Если накоплены строки таблицы — вывести её перед следующим блоком
        if ($tableRows.Count -gt 0) { Flush-Table $tableRows }

        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }
        elseif ($line -match '^# (.+)$') {
            Add-Para -text $matches[1] -styleId $wdStyleHeading1
        }
        elseif ($line -match '^## (.+)$') {
            Add-Para -text $matches[1] -styleId $wdStyleHeading2
        }
        elseif ($line -match '^### (.+)$') {
            Add-Para -text $matches[1] -styleId $wdStyleHeading3
        }
        elseif ($line -match '^[-*] (.+)$') {
            Add-Para -text ('— ' + $matches[1]) -styleId $wdStyleNormal
        }
        elseif ($line -match '^(\d+)\. (.+)$') {
            Add-Para -text ($matches[1] + '. ' + $matches[2]) -styleId $wdStyleNormal
        }
        elseif ((Strip-Markdown $line) -match '^(Таблица|Листинг)\s+\d') {
            # Заголовок таблицы/листинга — 12pt по центру без отступа (методичка п.4)
            $sel = $word.Selection
            $sel.Style = $doc.Styles.Item($wdStyleNormal)
            $sel.Font.Size   = 12
            $sel.Font.Bold   = $false
            $sel.Font.Italic = $false
            $sel.ParagraphFormat.Alignment       = $wdAlignCenter
            $sel.ParagraphFormat.FirstLineIndent = 0
            $sel.TypeText((Strip-Markdown $line))
            $sel.TypeParagraph()
            $sel.Font.Size   = 14
            $sel.ParagraphFormat.Alignment       = $wdAlignJustify
            $sel.ParagraphFormat.FirstLineIndent = $word.CentimetersToPoints(1.25)
        }
        else {
            Add-Para -text $line -styleId $wdStyleNormal
        }
    }

    # Дочистить таблицу если файл заканчивается таблицей
    if ($tableRows.Count -gt 0) { Flush-Table $tableRows }

    # 5. Сохранение в .docx ----------------------------------------------------------
    $wdFormatDocumentDefault = 16
    $doc.SaveAs([string]$docxPath, $wdFormatDocumentDefault)
    $doc.Close($false)
    Write-Host "Готов $docxPath" -ForegroundColor Green
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
