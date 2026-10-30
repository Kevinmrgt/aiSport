[CmdletBinding()]
param(
  [string]$InputReport = "tmp/accessibility-final/contrast/contrast-incomplete-audit.json",
  [string]$OutputJson = "tmp/accessibility-final/contrast/contrast-review-sampling.json",
  [string]$OutputCsv = "tmp/accessibility-final/contrast/contrast-review-sampling.csv"
)

$ErrorActionPreference = "Stop"

function Resolve-RepositoryPath {
  param([Parameter(Mandatory)][string]$Path)

  if ([System.IO.Path]::IsPathRooted($Path)) {
    return [System.IO.Path]::GetFullPath($Path)
  }

  $repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
  return [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot $Path))
}

function Get-ReviewPriority {
  param([Parameter(Mandatory)]$Node)

  if ($Node.MessageKey -eq "bgOverlap") {
    return "P1"
  }

  if ($Node.MessageKey -eq "pseudoContent") {
    return "P1"
  }

  if (
    $Node.ExpectedContrast -eq "4.5:1" -and
    $Node.Foreground -match "rgb\((161, 161, 170|212, 212, 216)"
  ) {
    return "P1"
  }

  if ($Node.MessageKey -eq "shortTextContent") {
    return "P2"
  }

  return "P2"
}

$inputPath = Resolve-RepositoryPath $InputReport
$outputJsonPath = Resolve-RepositoryPath $OutputJson
$outputCsvPath = Resolve-RepositoryPath $OutputCsv

if (-not (Test-Path -LiteralPath $inputPath)) {
  throw "Rapport axe introuvable : $inputPath"
}

$source = Get-Content -Raw -Encoding utf8 -LiteralPath $inputPath | ConvertFrom-Json
$nodes = foreach ($page in $source.pages) {
  foreach ($node in $page.incomplete) {
    $check = @($node.checks)[0]
    [pscustomobject]@{
      Route = [string]$page.route
      MessageKey = [string]$check.data.messageKey
      Foreground = [string]$node.computedStyle.color
      Background = [string]$node.computedStyle.backgroundColor
      BackgroundImage = [string]$node.computedStyle.backgroundImage
      ParentBackground = [string]$node.computedStyle.parentBackgroundColor
      ParentBackgroundImage = [string]$node.computedStyle.parentBackgroundImage
      FontSize = [string]$check.data.fontSize
      FontWeight = [string]$check.data.fontWeight
      ExpectedContrast = [string]$check.data.expectedContrastRatio
      Text = [string]$node.computedStyle.text
      Selector = (@($node.target) -join " > ")
    }
  }
}

if (@($nodes).Count -eq 0) {
  throw "Le rapport ne contient aucun resultat incomplete a echantillonner."
}

# A rendering signature deliberately excludes the route, selector and literal text.
# It groups repeated occurrences that share the same axe cause, CSS colors, font and
# WCAG threshold. A human still has to inspect one representative in every context
# where the final composited background differs.
$signatureProperties = @(
  "MessageKey",
  "Foreground",
  "Background",
  "BackgroundImage",
  "ParentBackground",
  "ParentBackgroundImage",
  "FontSize",
  "FontWeight",
  "ExpectedContrast"
)
$grouped = $nodes | Group-Object -Property $signatureProperties

$index = 0
$samples = foreach ($group in ($grouped | Sort-Object Name)) {
  $index += 1
  $first = $group.Group[0]
  $routes = @($group.Group.Route | Sort-Object -Unique)
  $contexts = foreach ($route in $routes) {
    $candidate = $group.Group | Where-Object Route -eq $route | Select-Object -First 1
    [ordered]@{
      route = $route
      selector = $candidate.Selector
      text = $candidate.Text
      decision = "A renseigner par l'operateur"
      measuredRatio = $null
      evidence = $null
    }
  }

  $priority = Get-ReviewPriority $first
  [ordered]@{
    id = "A11Y-CONTRAST-{0:D3}" -f $index
    priority = $priority
    occurrences = $group.Count
    routeCount = $routes.Count
    routes = $routes
    cause = $first.MessageKey
    expectedContrast = $first.ExpectedContrast
    rendering = [ordered]@{
      foreground = $first.Foreground
      background = $first.Background
      backgroundImage = $first.BackgroundImage
      parentBackground = $first.ParentBackground
      parentBackgroundImage = $first.ParentBackgroundImage
      fontSize = $first.FontSize
      fontWeight = $first.FontWeight
    }
    contexts = $contexts
    status = "human_review_required"
  }
}

$causeCounts = [ordered]@{}
foreach ($group in ($nodes | Group-Object MessageKey | Sort-Object Name)) {
  $causeCounts[$group.Name] = $group.Count
}

$priorityCounts = [ordered]@{}
$priorityContextCounts = [ordered]@{}
foreach ($group in ($samples | Group-Object { $_["priority"] } | Sort-Object Name)) {
  $priorityCounts[$group.Name] = $group.Count
  $priorityContextCounts[$group.Name] = ($group.Group | ForEach-Object {
      [int]$_["routeCount"]
    } | Measure-Object -Sum).Sum
}

$reviewContextCount = ($samples | ForEach-Object {
    [int]$_["routeCount"]
  } | Measure-Object -Sum).Sum

$report = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  sourceReport = $inputPath
  sourceExecutedAt = $source.executedAt
  sourceBaseURL = $source.baseURL
  sourceBrowser = $source.browser
  method = "Regroupement des incomplete axe par signature de rendu CSS ; aucune decision humaine automatisee"
  summary = [ordered]@{
    incompleteOccurrences = @($nodes).Count
    renderingSignatures = @($samples).Count
    routeContextsToReview = $reviewContextCount
    routes = @($nodes.Route | Sort-Object -Unique).Count
    causeCounts = $causeCounts
    prioritySignatureCounts = $priorityCounts
    priorityContextCounts = $priorityContextCounts
  }
  instructions = @(
    "Examiner au moins un contexte par route pour chaque signature.",
    "Mesurer le contraste sur le pixel de fond composite le plus defavorable, et non sur la couleur CSS theorique seule.",
    "Reporter le ratio, la decision et le chemin de preuve dans contexts.",
    "Ne passer status a closed qu'apres traitement de tous les contextes de la signature."
  )
  samples = $samples
}

$jsonDirectory = Split-Path -Parent $outputJsonPath
$csvDirectory = Split-Path -Parent $outputCsvPath
New-Item -ItemType Directory -Path $jsonDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $csvDirectory -Force | Out-Null

$report | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 -LiteralPath $outputJsonPath
$samples | ForEach-Object {
  [pscustomobject]@{
    Id = $_.id
    Priority = $_.priority
    Occurrences = $_.occurrences
    Routes = ($_.routes -join ", ")
    Cause = $_.cause
    ExpectedContrast = $_.expectedContrast
    Foreground = $_.rendering.foreground
    Background = $_.rendering.background
    ParentBackground = $_.rendering.parentBackground
    FontSize = $_.rendering.fontSize
    FontWeight = $_.rendering.fontWeight
    Status = $_.status
  }
} | Export-Csv -NoTypeInformation -Encoding utf8 -LiteralPath $outputCsvPath

Write-Output ("Occurrences axe incomplete : {0}" -f $report.summary.incompleteOccurrences)
Write-Output ("Signatures de rendu a verifier : {0}" -f $report.summary.renderingSignatures)
Write-Output ("Contextes route-signature a verifier : {0}" -f $report.summary.routeContextsToReview)
Write-Output ("JSON : {0}" -f $outputJsonPath)
Write-Output ("CSV : {0}" -f $outputCsvPath)
