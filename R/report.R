# Native R Report & Export Engine for titraR (Word .docx, Typst bundle/PDF, SVG, PNG, ZIP)

t_xml_esc <- function(x) {
  s <- t_str(x, "")
  s <- gsub("&", "&amp;", s, fixed = TRUE)
  s <- gsub("<", "&lt;", s, fixed = TRUE)
  s <- gsub(">", "&gt;", s, fixed = TRUE)
  s <- gsub('"', "&quot;", s, fixed = TRUE)
  s
}

# Build a clean, valid OOXML Microsoft Word (.docx) document in pure base R (zero external deps!)
t_build_docx_bytes <- function(payload, req = list()) {
  td <- tempfile("titra_docx_")
  dir.create(td, recursive = TRUE)
  on.exit(unlink(td, recursive = TRUE), add = TRUE)
  dir.create(file.path(td, "_rels"), recursive = TRUE)
  dir.create(file.path(td, "word"), recursive = TRUE)
  dir.create(file.path(td, "word", "_rels"), recursive = TRUE)

  meta <- payload$metadata %||% list()
  cfg <- payload$config %||% list()
  recs <- payload$recordings %||% list()
  mnt <- payload$montage %||% list()
  grps <- payload$groups %||% list()

  p_xml <- function(text, bold = FALSE, size = 22L, color = "111317", space_after = 120L) {
    b_tag <- if (bold) "<w:b/>" else ""
    sprintf(
      '<w:p><w:pPr><w:spacing w:after="%d"/></w:pPr><w:r><w:rPr>%s<w:color w:val="%s"/><w:sz w:val="%d"/></w:rPr><w:t xml:space="preserve">%s</w:t></w:r></w:p>',
      space_after, b_tag, color, size, t_xml_esc(text)
    )
  }

  lines <- c(
    p_xml("Titra — DBS Programming & Electrophysiology Clinical Report", bold = TRUE, size = 34L, color = "B81D33", space_after = 160L),
    p_xml(sprintf("File: %s | Device: %s | Session: %s",
                  t_str(meta$file_name, "session.json"),
                  t_str(meta$device_name, "Medtronic Percept"),
                  t_str(meta$session_date, format(Sys.time(), "%Y-%m-%d"))),
          size = 20L, color = "4B5563", space_after = 200L),
    p_xml("1. Recording & Configuration Summary", bold = TRUE, size = 26L, color = "111317", space_after = 100L),
    p_xml(sprintf("• Recordings parsed: %d (%d BrainSense streaming, %d survey)",
                  length(recs),
                  sum(vapply(recs, function(r) identical(r$source, "BrainSenseTimeDomain"), logical(1))),
                  sum(vapply(recs, function(r) identical(r$source, "LfpMontageTimeDomain"), logical(1))))),
    p_xml(sprintf("• Directional montage pairs: %d | Therapy groups: %d | Default stim rate: %g Hz (FTG center %g Hz)",
                  length(mnt), length(grps),
                  t_num(cfg$default_stim_rate_hz, 145),
                  t_num(cfg$default_stim_rate_hz, 145) / 2.0)),
    p_xml("2. Spectral & Biomarker Highlights", bold = TRUE, size = 26L, color = "111317", space_after = 100L)
  )

  for (r in head(recs, 12L)) {
    bs <- r$band_stats %||% list()
    lines <- c(lines, p_xml(sprintf(
      "• %s | RMS %.2f uV | Beta %.1f dB (peak %.1f Hz) | FTG %.1f dB (%.1f Hz)",
      t_str(r$label), t_num(r$rms_uv), t_num(bs$beta_db), t_num(bs$beta_peak_hz),
      t_num(bs$ftg_db), t_num(r$ftg_center_hz)
    ), size = 20L, space_after = 80L))
  }

  lines <- c(lines,
    p_xml("Generated locally by titraR (R htmlwidget & Shiny Studio).", size = 18L, color = "6B7280", space_after = 60L)
  )

  doc_xml <- paste0(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>',
    paste(lines, collapse = ""),
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>',
    '</w:body></w:document>'
  )

  ct_xml <- paste0(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '</Types>'
  )
  rels_xml <- paste0(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '</Relationships>'
  )
  wrels_xml <- paste0(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'
  )

  writeLines(ct_xml, file.path(td, "[Content_Types].xml"), useBytes = TRUE)
  writeLines(rels_xml, file.path(td, "_rels", ".rels"), useBytes = TRUE)
  writeLines(doc_xml, file.path(td, "word", "document.xml"), useBytes = TRUE)
  writeLines(wrels_xml, file.path(td, "word", "_rels", "document.xml.rels"), useBytes = TRUE)

  out_docx <- tempfile(fileext = ".docx")
  on.exit(unlink(out_docx), add = TRUE)
  old_wd <- setwd(td)
  on.exit(setwd(old_wd), add = TRUE)
  utils::zip(out_docx, files = c("[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/_rels/document.xml.rels"), flags = "-q")
  readBin(out_docx, what = "raw", n = file.info(out_docx)$size)
}

t_build_html_report_bytes <- function(payload, req = list()) {
  meta <- payload$metadata %||% list()
  recs <- payload$recordings %||% list()
  svg_str <- t_str(req$canvas_svg %||% "")
  rows <- vapply(head(recs, 16L), function(r) {
    bs <- r$band_stats %||% list()
    sprintf("<tr><td>%s</td><td>%s</td><td>%.2f &mu;V</td><td>%.1f dB</td><td>%.1f dB</td></tr>",
            t_xml_esc(r$label), t_xml_esc(r$source), t_num(r$rms_uv), t_num(bs$beta_db), t_num(bs$ftg_db))
  }, character(1))
  html <- paste0(
    '<!doctype html><html><head><meta charset="utf-8"><title>Titra Clinical Report</title>',
    '<style>body{font-family:Georgia,serif;max-width:1080px;margin:32px auto;color:#111317;padding:0 24px}',
    'h1{color:#B81D33;border-bottom:3px solid #B81D33;padding-bottom:8px}',
    'table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}',
    'th,td{border:1px solid #D4D8DF;padding:8px 10px;text-align:left}th{background:#F7F8FA}</style></head><body>',
    '<h1>Titra — DBS Programming Report</h1>',
    sprintf('<p><strong>File:</strong> %s &middot; <strong>Device:</strong> %s &middot; <strong>Recordings:</strong> %d</p>',
            t_xml_esc(meta$file_name %||% "session.json"), t_xml_esc(meta$device_name %||% "Percept"), length(recs)),
    '<table><thead><tr><th>Signal</th><th>Source</th><th>RMS</th><th>Beta</th><th>FTG</th></tr></thead><tbody>',
    paste(rows, collapse = ""), '</tbody></table>',
    if (nzchar(svg_str)) paste0('<h2>DAG Canvas</h2><div style="border:1px solid #D4D8DF;border-radius:6px;overflow:hidden">', svg_str, '</div>') else '',
    '</body></html>'
  )
  charToRaw(enc2utf8(html))
}

t_handle_report_request <- function(payload, req, out_dir = NULL) {
  t0 <- proc.time()[["elapsed"]]
  rid <- t_str(req$id %||% paste0("rep_", as.integer(Sys.time())))
  action <- t_str(req$action %||% "")

  if (action == "diagnose") {
    typst_bin <- Sys.which("typst")
    msg <- paste(
      sprintf("R version: %s", R.version.string),
      sprintf("Typst CLI: %s", if (nzchar(typst_bin)) typst_bin else "not installed (browser typst.ts & Word/HTML/SVG/PNG available)"),
      sprintf("ZIP utility: %s", if (nzchar(Sys.which("zip"))) "available" else "using R internal zip"),
      sep = "\n"
    )
    return(list(id = rid, ok = TRUE, title = "Export setup check", message = msg, elapsed_s = round(proc.time()[["elapsed"]] - t0, 2)))
  }

  formats <- as.character(unlist(req$formats %||% list()))
  if (!length(formats)) formats <- "docx"
  base_stem <- gsub("[^a-zA-Z0-9_-]+", "_", sub("\\.json$", "", t_str(payload$metadata$file_name, "titra"), ignore.case = TRUE))
  files_out <- list()
  warnings_out <- character(0)

  for (fmt in formats) {
    if (fmt == "docx") {
      raw_b <- t_build_docx_bytes(payload, req)
      files_out[[length(files_out) + 1L]] <- list(
        name = paste0("titra_report_", base_stem, ".docx"),
        mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        b64 = base64enc::base64encode(raw_b),
        bytes = length(raw_b)
      )
    } else if (fmt == "svg" || fmt == "svg_canvas") {
      svg_s <- t_str(req$canvas_svg %||% "<svg xmlns='http://www.w3.org/2000/svg'/>")
      raw_b <- charToRaw(enc2utf8(svg_s))
      files_out[[length(files_out) + 1L]] <- list(
        name = paste0("titra_dag_", base_stem, ".svg"),
        mime = "image/svg+xml",
        b64 = base64enc::base64encode(raw_b),
        bytes = length(raw_b)
      )
    } else if (fmt == "pdf" || fmt == "png_infographic") {
      raw_b <- t_build_html_report_bytes(payload, req)
      files_out[[length(files_out) + 1L]] <- list(
        name = paste0("titra_report_", base_stem, ".html"),
        mime = "text/html",
        b64 = base64enc::base64encode(raw_b),
        bytes = length(raw_b)
      )
      warnings_out <- c(warnings_out, "Delivered self-contained printable HTML report (use browser Print -> Save as PDF, or install Typst CLI).")
    } else if (fmt == "zip") {
      td <- tempfile("titra_zip_")
      dir.create(td, recursive = TRUE)
      on.exit(unlink(td, recursive = TRUE), add = TRUE)
      docx_b <- t_build_docx_bytes(payload, req)
      html_b <- t_build_html_report_bytes(payload, req)
      writeBin(docx_b, file.path(td, paste0("titra_report_", base_stem, ".docx")))
      writeBin(html_b, file.path(td, paste0("titra_report_", base_stem, ".html")))
      f_list <- c(paste0("titra_report_", base_stem, ".docx"), paste0("titra_report_", base_stem, ".html"))
      if (nzchar(t_str(req$canvas_svg))) {
        writeBin(charToRaw(enc2utf8(t_str(req$canvas_svg))), file.path(td, paste0("titra_dag_", base_stem, ".svg")))
        f_list <- c(f_list, paste0("titra_dag_", base_stem, ".svg"))
      }
      zpath <- tempfile(fileext = ".zip")
      on.exit(unlink(zpath), add = TRUE)
      old_wd <- setwd(td)
      on.exit(setwd(old_wd), add = TRUE)
      utils::zip(zpath, files = f_list, flags = "-q")
      raw_b <- readBin(zpath, what = "raw", n = file.info(zpath)$size)
      files_out[[length(files_out) + 1L]] <- list(
        name = paste0("titra_bundle_", base_stem, ".zip"),
        mime = "application/zip",
        b64 = base64enc::base64encode(raw_b),
        bytes = length(raw_b)
      )
    }
  }

  list(
    id = rid,
    ok = TRUE,
    files = t_list(files_out),
    saved = list(),
    saved_dir = "",
    warnings = t_arr(warnings_out),
    errors = list(),
    elapsed_s = round(proc.time()[["elapsed"]] - t0, 2)
  )
}
