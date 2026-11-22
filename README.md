# titraR — Interactive DBS Programming & Electrophysiology Studio for R

**titraR** is the native R package (`htmlwidget` + full-screen `Shiny` studio) equivalent of the Python **Titra** AnyWidget. It runs 100% natively in R (no Python required) and renders the full reactive Titra DAG workspace — Welcome screen, 4-stage live progress bar, adaptive input verification, 17 curated presets (including Game Theory, Extreme-Value Tail Risk, Option Pricing, and Graph Signal Processing), custom DAG builder, compact FTG Half-Band Controller (`Δf`), multi-format report exports, and instant one-click Clear.

## Install

```r
# From local folder
install.packages("path/to/titraR", repos = NULL, type = "source")

# Or from GitHub (with remotes / pak)
# remotes::install_github("YOUR_USER/titraR")
```

## Quick Start

### 1. Launch the full interactive Shiny studio

```r
library(titraR)
run_titra()
```

Or pre-populate a local data folder:

```r
run_titra(data_dir = "path/to/percept_jsons")
```

### 2. Use as a standalone `htmlwidget` (RStudio Viewer, Quarto, R Markdown)

```r
library(titraR)

# Empty studio (starts on Welcome screen)
titra()

# Pre-loaded with a de-identified Medtronic Percept or titration JSON
titra("clinical1_deidentified.json", preset = "beta_ftg")
```

### 3. Embed inside your own Shiny app

```r
library(shiny)
library(titraR)

ui <- fluidPage(
  titraOutput("studio", height = "95vh")
)

server <- function(input, output, session) {
  state <- titra_server("studio", input, output, session)
  observe({
    # Live two-way synced selection from the interactive DAG canvas
    str(state$selection)
  })
}

shinyApp(ui, server)
```

## Features

- **Pure-R Ingestion & DSP**: Detects and verifies Medtronic Percept PC/RC JSON session reports and amplitude-titration exports, supports multi-file merging with conflict protection, and computes Welch PSD, STFT spectrograms, FFT-Hilbert phase portraits, and beta / dynamic `f_stim / 2` FTG dynamics.
- **Four Quantitative Decision Suites**: Game Theory (6 solvers + live bandit), Extreme-Value Tail Risk (CVaR, EVT-VaR, POT & GEV return levels, Kupiec backtest), Option Pricing (Log-OU, Black-76, American adaptivity lattice), and Graph Signal Processing (amplitude-state graph, Fiedler vector, GFT, GTV/LGFE/GSE, σ-sweep).
- **Multi-Format Exports**: Word (`.docx`, pure-R OOXML), printable HTML / PDF, pure-vector SVG (canvas & per-object), PNG, and complete ZIP bundle.
- **Instant Clear**: Title-bar `✕ Clear` button with warning tooltip resets both the UI and R session instantaneously back to the Welcome screen.
