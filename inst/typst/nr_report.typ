// Titra report template (Typst) — rendered by nr_report.py via the `typst` pip package.
// All content comes from data.json; data.mode = "report" (full PDF) | "infographic" (page 1 only).
// Palette & typography mirror the Titra studio (crimson / black / cool gray / silver,
// Computer Modern). Edit freely: nr_report.py copies this file next to the figures at build time.

#let d = json("data.json")
#let mode = d.at("mode", default: "report")

#let crimson = rgb("#B81D33")
#let crimson-tint = rgb("#FBF0F2")
#let ink = rgb("#111317")
#let gray = rgb("#4B5563")
#let gray-light = rgb("#9CA3AF")
#let silver = rgb("#D4D8DF")
#let silver-soft = rgb("#E8EBF0")
#let alabaster = rgb("#F7F8FA")

#set document(title: d.meta.title, author: "Titra")
#set text(font: ("New Computer Modern",), size: 9.5pt, fill: ink, lang: "en")
#set par(justify: true, leading: 0.58em)
#set page(
  paper: "a4",
  margin: (x: 15mm, top: 17mm, bottom: 15mm),
  header: context {
    if counter(page).get().first() > 1 [
      #set text(size: 8pt, fill: gray)
      #grid(columns: (1fr, auto),
        [#box(image("titra_icon.svg", height: 8pt), baseline: 1pt) #text(weight: "bold")[Titra] · #d.meta.file_name],
        [#d.meta.session_date])
      #v(-4pt)
      #line(length: 100%, stroke: 0.5pt + silver)
    ]
  },
  footer: context [
    #set text(size: 8pt, fill: gray)
    #grid(columns: (1fr, auto),
      [Generated #d.meta.generated_at · Titra · DBS programming studio],
      [#counter(page).display() / #counter(page).final().first()])
  ],
)

#show heading.where(level: 1): it => block(above: 1.1em, below: 0.7em)[
  #set text(size: 14pt, weight: "bold")
  #box(width: 3pt, height: 12pt, fill: crimson, baseline: 1.5pt) #h(5pt) #it.body
]
#show heading.where(level: 2): it => block(above: 1em, below: 0.55em)[
  #set text(size: 11pt, weight: "bold", fill: ink)
  #it.body
]
#show figure.caption: it => [
  #set text(size: 8.5pt)
  #set par(justify: false)
  #text(weight: "bold", fill: crimson)[#it.supplement #context it.counter.display(it.numbering).] #it.body
]

// ── small building blocks ───────────────────────────────────────────────
// Labels are passed already upper-cased (Typst upper() would turn β → Β and µ → Μ)
#let kicker(t) = text(size: 7.5pt, weight: "bold", fill: crimson, tracking: 0.06em, t)
#let badge(t, fill: ink) = box(fill: fill, inset: (x: 4pt, y: 2pt), radius: 2pt,
  text(size: 7.5pt, weight: "bold", fill: white, t))

#let value-size(v) = {
  let n = str(v).clusters().len()
  if n > 17 { 9.5pt } else if n > 12 { 11.5pt } else { 14pt }
}
#let tile(k) = block(
  width: 100%, height: 21mm, inset: (x: 7pt, y: 5pt), radius: 3pt, clip: true,
  fill: if k.at("accent", default: false) { crimson-tint } else { white },
  stroke: (paint: if k.at("accent", default: false) { crimson } else { silver }, thickness: 0.7pt),
)[
  #set par(justify: false)
  #text(size: 7pt, weight: "bold", fill: gray, tracking: 0.05em, k.label)
  #v(1pt)
  #text(size: value-size(k.value), weight: "bold",
    fill: if k.at("accent", default: false) { crimson } else { ink })[#k.value]#if k.at("unit", default: "") != "" [ #text(size: 8.5pt, fill: gray)[#k.unit]]
  #v(-3pt)
  #text(size: 7pt, fill: gray)[#k.at("note", default: "")]
]

#let hbar(frac, color, h: 5.5pt) = box(width: 100%, height: h, fill: alabaster, radius: 1pt)[
  #place(left + horizon, box(width: calc.max(0.0, calc.min(1.0, frac)) * 100%, height: h, fill: color, radius: 1pt))
]

#let section-box(title, body) = block(
  width: 100%, inset: (x: 8pt, y: 7pt), radius: 3pt, stroke: 0.7pt + silver, fill: white,
)[
  #set par(justify: false)
  #kicker(title)
  #v(3pt)
  #body
]

#let nr-table(columns, header, rows, align: auto) = {
  set text(size: 8.3pt)
  set par(justify: false)
  table(
    columns: columns,
    align: align,
    stroke: none,
    inset: (x: 4pt, y: 3.2pt),
    fill: (_, y) => if y == 0 { none } else if calc.even(y) { alabaster } else { none },
    table.hline(stroke: 1pt + ink),
    table.header(..header.map(h => text(weight: "bold", h))),
    table.hline(stroke: 0.6pt + ink),
    ..rows.flatten(),
    table.hline(stroke: 1pt + ink),
  )
}

// ── Page 1 · Infographic ────────────────────────────────────────────────
#let infographic() = {
  // Masthead
  block(width: 100%, inset: 0pt)[
    #box(width: 100%, height: 3pt, fill: crimson)
    #v(6pt)
    #grid(columns: (1fr, auto), align: (left + bottom, right + bottom),
      [
        #box(image("titra_icon.svg", height: 20pt), baseline: 3pt) #h(2pt) #text(size: 22pt, weight: "bold")[Titra]
        #h(6pt) #text(size: 11pt, fill: gray)[#d.meta.subtitle]
      ],
      [
        #set text(size: 8.5pt, fill: gray)
        #set par(justify: false)
        #align(right)[#d.meta.device · #d.meta.device_model \ Session #d.meta.session_date]
      ])
    #v(2pt)
    #text(size: 15pt, weight: "bold")[#d.meta.title]
    #v(-2pt)
    #text(size: 9pt, fill: gray)[#d.meta.file_name · #d.meta.diagnosis · β #d.config.beta_band · FTG #d.config.ftg_band]
    #v(2pt)
    #line(length: 100%, stroke: 0.6pt + silver)
  ]
  v(4pt)

  // KPI tiles
  grid(columns: (1fr,) * 4, column-gutter: 6pt, row-gutter: 5pt, ..d.kpis.map(tile))
  v(4pt)

  // Spectral biomarkers (β vs FTG per streaming recording)
  if d.streams.len() > 0 {
    section-box("SPECTRAL BIOMARKERS · BRAINSENSE STREAMS (band power, dB)")[
      #set text(size: 8pt)
      // one row per stimulation stream: fixed one-line height, never wraps
      #let row-h = if d.streams.len() > 10 { 8.4pt } else { 9.6pt }
      #grid(columns: (46mm, 1fr, 10mm, 1fr, 10mm), column-gutter: 5pt, row-gutter: 1.6pt, align: horizon,
        [], text(weight: "bold")[β 13–30 Hz], [], text(weight: "bold", fill: crimson)[FTG (f#sub[stim]/2 ± Δf)], [],
        ..d.streams.map(s => (
          box(height: row-h, clip: true, width: 100%)[#s.hemisphere #s.pair · #text(fill: gray)[#s.at("tag", default: s.time) · #s.amp]],
          hbar(s.beta_frac, ink), align(right)[#s.beta_db],
          hbar(s.ftg_frac, crimson), align(right, text(fill: crimson)[#s.ftg_db]),
        )).flatten())
      #v(2pt)
      #text(size: 7.5pt, fill: gray)[Bars are scaled across all streams (#d.scales.db_lo to #d.scales.db_hi dB). Peak frequencies and ratios are tabulated in the appendix.]
    ]
    v(4pt)
  }

  // Directional survey (or titration dose response) + therapy side by side
  let therapy-box = section-box("THERAPY GROUPS · FINAL PROGRAMMING")[
    #set text(size: 8pt)
    #set par(justify: false)
    #if d.groups.len() == 0 [#text(fill: gray)[No therapy groups in this file.]]
    #stack(spacing: 2.5pt, ..d.groups.map(g => block(width: 100%, inset: (x: 5pt, y: 2.2pt), radius: 2pt, breakable: false,
        fill: if g.active { crimson-tint } else { alabaster },
        stroke: 0.6pt + if g.active { crimson } else { silver-soft })[
        #text(weight: "bold")[#g.group_id]#if g.active [ #badge("ACTIVE", fill: crimson)]
        #h(1fr) #text(fill: crimson)[#g.rate · FTG #g.ftg]
        #for line in g.short_lines [ \ #text(size: 7.5pt, fill: gray)[#line]]
      ]))
  ]
  let titr = d.at("titration", default: ())
  let left-box = if d.survey_top.len() > 0 {
    section-box("DIRECTIONAL SURVEY · TOP PAIRS (peak µV)")[
      #set text(size: 8pt)
      #grid(columns: (1fr, 1fr), column-gutter: 8pt,
        ..d.survey_top.map(h => [
          #text(weight: "bold")[#h.hemisphere]
          #v(1pt)
          #grid(columns: (13mm, 1fr, 10mm), column-gutter: 3pt, row-gutter: 2.6pt, align: horizon,
            ..h.rows.map(r => (
              [#r.pair],
              hbar(r.frac, if r.rank == 1 { crimson } else { gray }, h: 4.5pt),
              align(right)[#r.peak_uv],
            )).flatten())
        ]))
    ]
  } else if titr.len() > 0 {
    section-box("DOSE RESPONSE · Δ dB (0 → max mA)")[
      #set text(size: 8pt)
      #grid(columns: (36mm, 1fr, 9mm, 1fr, 9mm), column-gutter: 3pt, row-gutter: 2.6pt, align: horizon,
        [], text(weight: "bold")[Δβ], [], text(weight: "bold", fill: crimson)[ΔFTG], [],
        ..titr.map(t => (
          box(height: 9.6pt, clip: true, width: 100%)[#t.row #text(fill: gray)[· #t.range]],
          hbar(t.beta_frac, ink, h: 4.5pt), align(right)[#t.d_beta],
          hbar(t.ftg_frac, crimson, h: 4.5pt), align(right, text(fill: crimson)[#t.d_ftg]),
        )).flatten())
      #v(1pt)
      #text(size: 7pt, fill: gray)[Negative Δβ = β suppression with increasing amplitude; positive ΔFTG = gamma entrainment.]
    ]
  } else { none }
  if left-box == none {
    therapy-box
  } else {
    grid(columns: (1fr, 1fr), column-gutter: 6pt, left-box, therapy-box)
  }
  v(4pt)

  // Decision analysis picks
  if d.analysis_tiles.len() > 0 {
    section-box("DECISION ANALYSIS · LIVE PICKS FROM THE DAG")[
      #grid(columns: (1fr,) * calc.min(4, d.analysis_tiles.len()), column-gutter: 6pt, row-gutter: 6pt,
        ..d.analysis_tiles.map(t => block(width: 100%, inset: (x: 6pt, y: 5pt), radius: 2pt,
          fill: if t.at("accent", default: false) { crimson-tint } else { alabaster },
          stroke: 0.6pt + if t.at("accent", default: false) { crimson } else { silver-soft })[
          #text(size: 7pt, weight: "bold", fill: gray, t.label) \
          #text(size: 9.5pt, weight: "bold", fill: if t.at("accent", default: false) { crimson } else { ink })[#t.value] \
          #text(size: 7.5pt, fill: gray)[#t.note]
        ]))
    ]
  }
  v(1fr)
  block(width: 100%)[
    #set text(size: 7pt, fill: gray)
    #set par(justify: false, leading: 0.45em)
    #line(length: 100%, stroke: 0.5pt + silver)
    #v(-3pt)
    #d.meta.footnote
  ]
}

#if mode == "infographic" {
  set page(header: none, footer: none, margin: 12mm)
  infographic()
} else {
  infographic()

  // ── DAG canvas (landscape) ─────────────────────────────────────────
  if d.canvas != none {
    page(flipped: true)[
      #heading(level: 1)[Analysis DAG canvas]
      #text(size: 8.5pt, fill: gray)[Preset #d.dag.preset · #d.dag.n_nodes objects · #d.dag.n_edges edges · vector graphic — zoom in for detail.]
      #v(4pt)
      #align(center, image(d.canvas.file, width: 100%, height: 148mm, fit: "contain"))
    ]
  }

  // ── Analysis objects ───────────────────────────────────────────────
  if d.figures.len() > 0 {
    heading(level: 1)[Analysis objects]
    for f in d.figures {
      figure(
        align(center, image(f.file, width: f.disp_w_mm * 1mm)),
        caption: [#text(weight: "bold")[#f.title.] #f.desc],
        kind: image,
        supplement: [Figure],
      )
      v(2pt)
    }
  }

  // ── Decision analysis tables ───────────────────────────────────────
  if d.analysis_tables.len() > 0 {
    pagebreak(weak: true)
    heading(level: 1)[Decision analysis]
    for t in d.analysis_tables {
      heading(level: 2)[#t.title]
      if t.at("note", default: "") != "" { text(size: 8.5pt, fill: gray)[#t.note]; v(2pt) }
      nr-table(t.columns.map(_ => auto), t.header, t.rows)
    }
  }

  // ── Appendix tables ────────────────────────────────────────────────
  pagebreak(weak: true)
  heading(level: 1)[Data appendix]
  if d.meta.at("sources", default: "") != "" {
    text(size: 9pt, fill: gray)[Merged from several files: #d.meta.sources]
    v(4pt)
  }

  if d.streams.len() > 0 {
    heading(level: 2)[BrainSense streaming recordings]
    nr-table((auto,) * 10,
      ("Recording", "Time", "Stim", "β (dB)", "β peak", "FTG (dB)", "FTG peak", "FTG − β", "RMS (µV)", "Dur. (s)"),
      d.streams.map(s => (s.label, s.time, s.stim_rate, s.beta_db, s.beta_peak, s.ftg_db, s.ftg_peak, s.ratio_db, s.rms_uv, s.duration)),
      align: (left, left, right, right, right, right, right, right, right, right))
  }

  if d.groups.len() > 0 {
    heading(level: 2)[Therapy groups (final programming)]
    nr-table((auto, auto, auto, 1fr), ("Group", "Rate", "FTG", "Electrodes (cathodes, mA) · pulse width · total · sensing"),
      d.groups.map(g => (
        [#g.group_id#if g.active [ #badge("ACTIVE", fill: crimson)]], g.rate, g.ftg, g.lines.join("\n"))),
      align: (left, right, right, left))
  }

  if d.survey.len() > 0 {
    heading(level: 2)[Directional montage survey]
    nr-table((auto, auto, auto, auto, auto, auto),
      ("Hemisphere", "Pair", "Kind", "Peak (Hz)", "Peak (µV)", "Artifact"),
      d.survey.map(r => (r.hemisphere, r.pair, r.kind, r.peak_hz, r.peak_uv, r.artifact)),
      align: (left, left, left, right, right, left))
  }

  if d.impedance.len() > 0 {
    heading(level: 2)[Monopolar impedance (Ω)]
    nr-table(d.impedance_header.map(_ => auto), d.impedance_header, d.impedance,
      align: d.impedance_header.enumerate().map(((i, _)) => if i == 0 { left } else { right }))
  }

  if d.events.len() > 0 {
    heading(level: 2)[Adaptive / event summary]
    nr-table((auto,) * 7, ("Group", "Hemisphere", "Target", "Above %", "Between %", "Below %", "Avg mA"),
      d.events.map(e => (e.group, e.hemisphere, e.target, e.above, e.between, e.below, e.avg_ma)),
      align: (left, left, left, right, right, right, right))
  }

  heading(level: 2)[Selection & parameters synced from the DAG]
  nr-table((auto, 1fr), ("Item", "Value"), d.selection_rows, align: (left, left))

  if d.dag.edges.len() > 0 {
    heading(level: 2)[DAG topology]
    nr-table((auto, auto, auto), ("Source", "Target", "Edge"),
      d.dag.edges.map(e => (e.source, e.target, e.label)))
  }
}
