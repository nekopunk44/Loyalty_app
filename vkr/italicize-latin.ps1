$ErrorActionPreference = 'Stop'

# Italicize latin-script tech terms in VKR body files.
# Mask placeholders use Unicode math brackets ⟦N⟧ (U+27E6/27E7) — those don't match
# [A-Za-z] so the italic regex won't accidentally wrap them.
# Already-italicized fragments (*foo*) are skipped naturally via lookbehind/lookahead
# on the boundary check — no need to mask them explicitly.

function Italicize-LatinInLine {
    param([string]$line)

    # Skip headings — no italic in heading text (per methodology, no mixed emphasis).
    if ($line -match '^#') { return $line }
    if ($line.Trim() -eq '') { return $line }

    $open  = [char]0x27E6   # ⟦
    $close = [char]0x27E7   # ⟧
    $masks = New-Object 'System.Collections.Generic.List[string]'

    $idx = 0
    # Mask image refs first (![alt](url))
    $masked = [regex]::Replace($line, '!\[[^\]]*\]\([^)]*\)', {
        param($m)
        $masks.Add($m.Value)
        $k = "$open$($masks.Count - 1)$close"
        return $k
    })
    # Mask markdown links [text](url)
    $masked = [regex]::Replace($masked, '\[[^\]]*\]\([^)]*\)', {
        param($m)
        $masks.Add($m.Value)
        $k = "$open$($masks.Count - 1)$close"
        return $k
    })
    # Mask inline code `…`
    $masked = [regex]::Replace($masked, '`[^`]+`', {
        param($m)
        $masks.Add($m.Value)
        $k = "$open$($masks.Count - 1)$close"
        return $k
    })

    # Italicize: latin run, possibly multi-word (whitespace allowed between latin segments).
    # «React Native» → один курсивный пробег, а не два *React* *Native*.
    # Lookbehind/lookahead exclude alnum and *, so already-italic *Foo* is skipped.
    $italicized = [regex]::Replace(
        $masked,
        '(?<![A-Za-z0-9*])([A-Za-z][A-Za-z0-9.\-/+]*(?:[ \t]+[A-Za-z][A-Za-z0-9.\-/+]*)*[A-Za-z0-9])(?![A-Za-z0-9*])',
        '*$1*'
    )

    # Restore masks
    for ($i = 0; $i -lt $masks.Count; $i++) {
        $k = "$open$i$close"
        $italicized = $italicized.Replace($k, $masks[$i])
    }

    return $italicized
}

function Process-File {
    param([string]$path)

    $lines = [System.IO.File]::ReadAllLines($path, [System.Text.Encoding]::UTF8)
    $out = New-Object System.Text.StringBuilder
    $inCode = $false
    $changes = 0

    foreach ($line in $lines) {
        if ($line -match '^```') {
            $inCode = -not $inCode
            [void]$out.AppendLine($line)
            continue
        }
        if ($inCode) {
            [void]$out.AppendLine($line)
            continue
        }
        $new = Italicize-LatinInLine $line
        if ($new -ne $line) { $changes++ }
        [void]$out.AppendLine($new)
    }

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $out.ToString(), $utf8)
    return $changes
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$files = @(
    '01_introduction.md',
    '02_chapter1_analysis.md',
    '03_chapter2_design.md',
    '04_chapter3_implementation.md',
    '05_conclusion.md',
    '06_glossary.md',
    '08_user_manual.md'
)
foreach ($f in $files) {
    $p = Join-Path $root $f
    if (Test-Path $p) {
        $n = Process-File $p
        Write-Host "$f : modified lines = $n"
    }
}
