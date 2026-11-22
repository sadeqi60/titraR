# Native R Report & Export Engine for Titra (titraR & titra-shiny-web)
# - Browser Typst WASM bundle (`action == "typst_bundle"`) for publication-grade vector PDF & 1-page Infographic PNG
# - Optional native Typst CLI compilation when installed on desktop
# - Pure-R DEFLATE ZIP builder (`t_zip_raw`) using base R `memCompress("gzip")` — zero external `zip` binary (WebR/Shinylive safe!)
# - Rich OOXML Word (.docx) builder with embedded infographic, landscape DAG canvas, per-object figures, and styled clinical tables

TITRA_ICON_SVG <- paste0(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">',
  '<circle cx="16" cy="18.2" r="9" fill="none" stroke="#B81D33" stroke-width="1.4" opacity="0.35"/>',
  '<circle cx="16" cy="18.2" r="6" fill="none" stroke="#B81D33" stroke-width="1.6" opacity="0.7"/>',
  '<rect x="12.2" y="1.5" width="7.6" height="28.5" rx="3.8" fill="#1F242C"/>',
  '<rect x="11.4" y="22.6" width="9.2" height="3.2" rx="1.1" fill="#D4D8DF"/>',
  '<rect x="11.4" y="16.6" width="9.2" height="3.2" rx="1.1" fill="#B81D33"/>',
  '<rect x="11.4" y="10.6" width="9.2" height="3.2" rx="1.1" fill="#D4D8DF"/>',
  '<rect x="11.4" y="4.6" width="9.2" height="3.2" rx="1.1" fill="#D4D8DF"/>',
  '</svg>'
)

# ── Pure-R PKZIP writer (IEEE 802.3 CRC-32 + RFC 1951 DEFLATE via memCompress, zero external binaries) ──

t_u16le <- function(n) {
  n <- as.numeric(n)
  as.raw(c(n %% 256, floor(n / 256) %% 256))
}

t_u32le <- function(n) {
  n <- as.numeric(n)
  as.raw(c(
    n %% 256,
    floor(n / 256) %% 256,
    floor(n / 65536) %% 256,
    floor(n / 16777216) %% 256
  ))
}

# Precomputed split-16-bit CRC-32 table (immune to R's signed 32-bit NA_integer_ at 0x80000000)
.t_crc_tbl <- local({
  lo <- integer(256L)
  hi <- integer(256L)
  # Polynomial 0xEDB88320 split into hi=0xEDB8 (60856), lo=0x8320 (33568)
  for (i in 0:255) {
    cl <- i
    ch <- 0L
    for (b in 1:8) {
      lsb <- bitwAnd(cl, 1L)
      carry <- bitwAnd(ch, 1L)
      cl <- bitwOr(bitwShiftR(cl, 1L), bitwShiftL(carry, 15L))
      ch <- bitwShiftR(ch, 1L)
      if (lsb != 0L) {
        cl <- bitwXor(cl, 33568L) # 0x8320
        ch <- bitwXor(ch, 60856L) # 0xEDB8
      }
    }
    lo[i + 1L] <- cl
    hi[i + 1L] <- ch
  }
  list(lo = lo, hi = hi)
})

t_crc32_raw <- function(data_raw) {
  cl <- 65535L
  ch <- 65535L
  tlo <- .t_crc_tbl$lo
  thi <- .t_crc_tbl$hi
  bytes <- as.integer(data_raw)
  for (b in bytes) {
    idx <- bitwXor(bitwAnd(cl, 255L), b) + 1L
    # (crc >> 8): new_lo = (cl >> 8) | ((ch & 0xFF) << 8), new_hi = ch >> 8
    nl <- bitwOr(bitwShiftR(cl, 8L), bitwShiftL(bitwAnd(ch, 255L), 8L))
    nh <- bitwShiftR(ch, 8L)
    cl <- bitwXor(nl, tlo[idx])
    ch <- bitwXor(nh, thi[idx])
  }
  cl <- bitwXor(cl, 65535L)
  ch <- bitwXor(ch, 65535L)
  as.raw(c(
    bitwAnd(cl, 255L),
    bitwShiftR(cl, 8L),
    bitwAnd(ch, 255L),
    bitwShiftR(ch, 8L)
  ))
}

t_deflate_raw <- function(data_raw) {
  # R's memCompress(x, "gzip") emits an RFC 1950 zlib stream: 2-byte header + raw DEFLATE + 4-byte Adler-32
  z <- tryCatch(memCompress(data_raw, type = "gzip"), error = function(e) NULL)
  if (is.null(z) || length(z) < 6L) return(NULL)
  cmf <- as.integer(z[1])
  flg <- as.integer(z[2])
  if (bitwAnd(cmf, 15L) != 8L || ((cmf * 256L + flg) %% 31L) != 0L) return(NULL)
  start <- if (bitwAnd(flg, 32L) != 0L) 7L else 3L
  end <- length(z) - 4L
  if (end < start) return(NULL)
  z[start:end]
}

t_zip_pack_entry <- function(data_raw) {
  # Fast C-level zlib path via base R gzfile() (works in desktop R and WebR/Emscripten)
  fast <- tryCatch({
    tf <- tempfile(fileext = ".gz")
    on.exit(unlink(tf), add = TRUE)
    con <- gzfile(tf, open = "wb")
    writeBin(data_raw, con)
    close(con)
    gz <- readBin(tf, what = "raw", n = file.info(tf)$size)
    n <- length(gz)
    if (n < 18L || gz[1] != as.raw(0x1f) || gz[2] != as.raw(0x8b) || gz[3] != as.raw(0x08)) return(NULL)
    flg <- as.integer(gz[4])
    pos <- 11L
    if (bitwAnd(flg, 4L) != 0L) {
      xlen <- as.integer(gz[pos]) + 256L * as.integer(gz[pos + 1L])
      pos <- pos + 2L + xlen
    }
    if (bitwAnd(flg, 8L) != 0L) {
      while (pos <= n && gz[pos] != as.raw(0x00)) pos <- pos + 1L
      pos <- pos + 1L
    }
    if (bitwAnd(flg, 16L) != 0L) {
      while (pos <= n && gz[pos] != as.raw(0x00)) pos <- pos + 1L
      pos <- pos + 1L
    }
    if (bitwAnd(flg, 2L) != 0L) pos <- pos + 2L
    deflate_end <- n - 8L
    defl <- if (deflate_end >= pos) gz[pos:deflate_end] else raw(0)
    crc <- gz[(n - 7L):(n - 4L)]
    list(crc = crc, deflate = defl)
  }, error = function(e) NULL)

  if (!is.null(fast)) return(fast)
  list(crc = t_crc32_raw(data_raw), deflate = if (length(data_raw) > 0L) t_deflate_raw(data_raw) else NULL)
}

t_zip_raw <- function(entries) {
  nms <- names(entries)
  if (is.null(nms) || !length(nms)) stop("ZIP archive requires at least one named entry.")
  local_parts <- vector("list", length(nms))
  cd_parts <- vector("list", length(nms))
  offset <- 0

  # Fixed DOS timestamp (2026-01-01 00:00:00)
  dos_time <- t_u16le(0)
  dos_date <- t_u16le(bitwShiftL(2026L - 1980L, 9L) + bitwShiftL(1L, 5L) + 1L)
  gp_flag <- t_u16le(2048) # UTF-8 filename flag (bit 11)

  for (i in seq_along(nms)) {
    name_raw <- charToRaw(enc2utf8(nms[[i]]))
    data_raw <- entries[[i]]
    if (is.character(data_raw)) data_raw <- charToRaw(enc2utf8(paste(data_raw, collapse = "\n")))
    if (!is.raw(data_raw)) data_raw <- as.raw(data_raw)

    packed <- t_zip_pack_entry(data_raw)
    crc_raw <- packed$crc
    uncomp_len <- length(data_raw)
    defl <- packed$deflate
    if (!is.null(defl) && length(defl) < uncomp_len) {
      method <- 8L
      payload <- defl
    } else {
      method <- 0L
      payload <- data_raw
    }
    comp_len <- length(payload)

    lfh <- c(
      as.raw(c(0x50, 0x4b, 0x03, 0x04)), # Local file header signature
      t_u16le(20),                        # Version needed to extract (2.0)
      gp_flag,
      t_u16le(method),
      dos_time, dos_date,
      crc_raw,
      t_u32le(comp_len),
      t_u32le(uncomp_len),
      t_u16le(length(name_raw)),
      t_u16le(0),                         # Extra field length
      name_raw,
      payload
    )
    local_parts[[i]] <- lfh

    cdh <- c(
      as.raw(c(0x50, 0x4b, 0x01, 0x02)), # Central directory header signature
      t_u16le(20),                        # Version made by
      t_u16le(20),                        # Version needed
      gp_flag,
      t_u16le(method),
      dos_time, dos_date,
      crc_raw,
      t_u32le(comp_len),
      t_u32le(uncomp_len),
      t_u16le(length(name_raw)),
      t_u16le(0),                         # Extra length
      t_u16le(0),                         # Comment length
      t_u16le(0),                         # Disk number
      t_u16le(0),                         # Internal attrs
      t_u32le(0),                         # External attrs
      t_u32le(offset),                    # Relative offset of local header
      name_raw
    )
    cd_parts[[i]] <- cdh
    offset <- offset + length(lfh)
  }

  local_blob <- unlist(local_parts, use.names = FALSE)
  cd_blob <- unlist(cd_parts, use.names = FALSE)
  eocd <- c(
    as.raw(c(0x50, 0x4b, 0x05, 0x06)), # EOCD signature
    t_u16le(0),                         # Disk number
    t_u16le(0),                         # Disk with CD
    t_u16le(length(nms)),               # Entries on disk
    t_u16le(length(nms)),               # Total entries
    t_u32le(length(cd_blob)),           # Size of CD
    t_u32le(length(local_blob)),        # Offset of CD
    t_u16le(0)                          # Comment length
  )
  c(local_blob, cd_blob, eocd)
}

# ── Formatting & SVG/PNG helpers (1:1 parity with nr_report.py) ──────────

t_xml_esc <- function(x) {
  s <- t_str(x, "")
  s <- gsub("&", "&amp;", s, fixed = TRUE)
  s <- gsub("<", "&lt;", s, fixed = TRUE)
  s <- gsub(">", "&gt;", s, fixed = TRUE)
  s <- gsub('"', "&quot;", s, fixed = TRUE)
  s
}

t_finite <- function(v) {
  if (is.null(v) || length(v) == 0L || is.logical(v)) return(FALSE)
  x <- suppressWarnings(as.numeric(v)[1])
  !is.na(x) && is.finite(x)
}

t_fmt_val <- function(v, nd = 1L, unit = "") {
  if (!t_finite(v)) {
    if (is.character(v) && length(v) && nzchar(v[1])) return(v[1])
    return("\u2014")
  }
  x <- as.numeric(v)[1]
  s <- sprintf(paste0("%.", as.integer(nd), "f"), x)
  if (nzchar(unit)) paste(s, unit) else s
}

t_fmt_g <- function(v) {
  if (!t_finite(v)) return("\u2014")
  sprintf("%g", as.numeric(v)[1])
}

t_frac <- function(v, lo, span) {
  if (!t_finite(v)) return(0.0)
  max(0.0, min(1.0, (as.numeric(v)[1] - lo) / max(1e-6, span)))
}

t_trim_str <- function(s, n) {
  s <- t_str(s, "")
  if (nchar(s) <= n) s else paste0(trimws(substr(s, 1L, n - 1L), which = "right"), "\u2026")
}

t_fmt_date <- function(s) {
  s <- t_str(s, "")
  if (!nzchar(s)) return("\u2014")
  s_clean <- sub("Z$", "+0000", s)
  s_clean <- sub("([+-][0-9]{2}):([0-9]{2})$", "\\1\\2", s_clean)
  dt <- suppressWarnings(tryCatch(
    as.POSIXct(s_clean, format = "%Y-%m-%dT%H:%M:%OS%z", tz = "UTC"),
    error = function(e) NA
  ))
  if (is.na(dt)) {
    dt <- suppressWarnings(tryCatch(
      as.POSIXct(substr(s, 1L, 19L), format = "%Y-%m-%dT%H:%M:%S", tz = "UTC"),
      error = function(e) NA
    ))
  }
  if (is.na(dt)) s else format(dt, "%Y-%m-%d %H:%M")
}

t_safe_stem <- function(s) {
  s <- sub("\\.json$", "", t_str(s, "session"), ignore.case = TRUE)
  s <- gsub("[^A-Za-z0-9_-]+", "_", s)
  s <- gsub("^_+|_+$", "", s)
  s <- substr(s, 1L, 60L)
  if (nzchar(s)) s else "session"
}

t_report_stem <- function(payload, req = list()) {
  meta <- payload$metadata %||% list()
  base <- t_safe_stem(req$file_stem %||% meta$file_name %||% "session")
  paste0("titra_", base, "_", format(Sys.time(), "%Y%m%d-%H%M%S"))
}

t_prep_svg <- function(svg) {
  svg <- t_str(svg, "")
  svg <- gsub("KaTeX_Main", "New Computer Modern", svg, fixed = TRUE)
  head400 <- substr(svg, 1L, min(nchar(svg), 400L))
  if (!grepl("xmlns=", head400, fixed = TRUE)) {
    svg <- sub("<svg", '<svg xmlns="http://www.w3.org/2000/svg"', svg, fixed = TRUE)
  }
  svg
}

t_svg_size <- function(svg) {
  svg <- t_str(svg, "")
  s_pos <- regexpr("<svg", svg, fixed = TRUE)[1]
  head_str <- if (s_pos > 0L) {
    rest <- substr(svg, s_pos, min(nchar(svg), s_pos + 1200L))
    gt <- regexpr(">", rest, fixed = TRUE)[1]
    if (gt > 0L) substr(rest, 1L, gt) else rest
  } else {
    substr(svg, 1L, min(nchar(svg), 600L))
  }
  mw <- regexec('\\bwidth="([0-9.]+)', head_str)
  mh <- regexec('\\bheight="([0-9.]+)', head_str)
  rw <- regmatches(head_str, mw)[[1]]
  rh <- regmatches(head_str, mh)[[1]]
  if (length(rw) >= 2L && length(rh) >= 2L) {
    return(c(as.numeric(rw[2]), as.numeric(rh[2])))
  }
  mvb <- regexec('viewBox="[0-9.\\-]+\\s+[0-9.\\-]+\\s+([0-9.]+)\\s+([0-9.]+)', head_str)
  rvb <- regmatches(head_str, mvb)[[1]]
  if (length(rvb) >= 3L) {
    return(c(as.numeric(rvb[2]), as.numeric(rvb[3])))
  }
  c(1200.0, 800.0)
}

t_png_size <- function(png_raw) {
  if (is.raw(png_raw) && length(png_raw) >= 24L &&
      identical(png_raw[1:8], as.raw(c(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)))) {
    b <- as.numeric(png_raw[17:24])
    w <- b[1] * 16777216 + b[2] * 65536 + b[3] * 256 + b[4]
    h <- b[5] * 16777216 + b[6] * 65536 + b[7] * 256 + b[8]
    if (w > 0 && h > 0) return(c(w, h))
  }
  c(2000, 1000)
}

t_read_typst_template <- function() {
  candidates <- c(
    "nr_report.typ",
    file.path("inst", "typst", "nr_report.typ"),
    tryCatch(system.file("typst", "nr_report.typ", package = "titraR"), error = function(e) "")
  )
  for (p in candidates) {
    if (nzchar(p) && file.exists(p)) {
      return(paste(readLines(p, warn = FALSE, encoding = "UTF-8"), collapse = "\n"))
    }
  }
  stop("Could not locate nr_report.typ template.")
}

t_compact_contacts <- function(cs) {
  vals <- as.character(unlist(cs %||% list()))
  vals <- vals[nzchar(vals) & vals != "Case"]
  out <- character(0)
  for (c in vals) {
    m <- regexec("^([12])[abc]$", c)
    rm <- regmatches(c, m)[[1]]
    if (length(rm) >= 2L && all(paste0(rm[2], c("a", "b", "c")) %in% vals)) {
      if (!(rm[2] %in% out)) out <- c(out, rm[2])
    } else if (!(c %in% out)) {
      out <- c(out, c)
    }
  }
  paste(out, collapse = "+")
}

t_split_diagnosis <- function(d) {
  s <- t_strip_enum(d)
  if (!nzchar(s)) return("")
  s <- gsub("(?<!^)(?=[A-Z])", " ", s, perl = TRUE)
  gsub("Parkinsons", "Parkinson's", s, fixed = TRUE)
}

t_collect_assets <- function(req) {
  files <- list()
  fig_entries <- list()
  png_items <- list()
  canvas_file <- NULL

  canvas_svg <- t_str(req$canvas_svg %||% "")
  if (nzchar(canvas_svg)) {
    svg <- t_prep_svg(canvas_svg)
    files[["canvas.svg"]] <- svg
    wh <- t_svg_size(svg)
    canvas_file <- "canvas.svg"
    sc <- min(2.0, 7000.0 / max(wh[1], wh[2], 1.0))
    png_items[[length(png_items) + 1L]] <- list(
      key = "canvas", file = canvas_file, w_pt = wh[1] * 0.75 * sc / 2.0
    )
  }

  objs <- req$objects %||% list()
  for (i in seq_along(objs)) {
    ob <- objs[[i]]
    if (!is.list(ob)) next
    ob_svg <- t_str(ob$svg %||% "")
    if (!nzchar(ob_svg)) next
    idx0 <- i - 1L
    svg <- t_prep_svg(ob_svg)
    fn <- sprintf("fig_%02d.svg", idx0)
    files[[fn]] <- svg
    wh <- t_svg_size(svg)
    avail_w <- 180.0
    max_h <- 118.0
    disp_w <- min(avail_w, max_h * wh[1] / max(wh[2], 1.0))
    fig_entries[[length(fig_entries) + 1L]] <- list(
      file = fn,
      title = t_str(ob$title, ""),
      badge = t_str(ob$badge, ""),
      desc = t_str(ob$desc, ""),
      disp_w_mm = round(disp_w, 1),
      id = t_str(ob$id, "")
    )
    png_items[[length(png_items) + 1L]] <- list(
      key = sprintf("fig_%02d", idx0),
      file = fn,
      w_pt = wh[1] * 0.75,
      title = t_str(ob$title, ""),
      desc = t_str(ob$desc, "")
    )
  }

  files[["titra_icon.svg"]] <- TITRA_ICON_SVG
  list(files = files, fig_entries = fig_entries, canvas_file = canvas_file, png_items = png_items)
}

# ── Report Data Model (1:1 schema match with nr_report.typ) ──────────────

t_report_data <- function(payload, req, fig_files = list(), canvas_file = NULL) {
  meta <- payload$metadata %||% list()
  cfg <- payload$config %||% list()
  sel <- req$selection %||% list()
  dag <- req$dag %||% list()
  recs <- payload$recordings %||% list()

  stim <- t_num(sel$stim_rate_hz %||% cfg$default_stim_rate_hz %||% 145.0, 145.0)
  hbw <- t_num(sel$ftg_half_bw_hz %||% cfg$ftg_half_bw_hz %||% 4.0, 4.0)
  ftg_c <- stim / 2.0
  beta_v <- suppressWarnings(as.numeric(unlist(cfg$beta_band %||% c(13, 30))))
  beta_v <- beta_v[is.finite(beta_v)]
  if (length(beta_v) < 2L) beta_v <- c(13, 30)

  # Session duration
  dur <- "\u2014"
  s0 <- t_str(meta$session_date, "")
  s1 <- t_str(meta$session_end_date, "")
  if (nzchar(s0) && nzchar(s1)) {
    p0 <- suppressWarnings(tryCatch(as.POSIXct(substr(s0, 1L, 19L), format = "%Y-%m-%dT%H:%M:%S", tz = "UTC"), error = function(e) NA))
    p1 <- suppressWarnings(tryCatch(as.POSIXct(substr(s1, 1L, 19L), format = "%Y-%m-%dT%H:%M:%S", tz = "UTC"), error = function(e) NA))
    if (!is.na(p0) && !is.na(p1)) {
      mins <- as.numeric(difftime(p1, p0, units = "mins"))
      if (is.finite(mins)) dur <- sprintf("%.0f min", mins)
    }
  }

  # Streams (BrainSense time-domain, up to 14)
  streams_all <- Filter(function(r) identical(t_str(r$source), "BrainSenseTimeDomain"), recs)
  streams_raw <- head(streams_all, 14L)
  dbs <- numeric(0)
  for (r in streams_raw) {
    bs <- r$band_stats %||% list()
    if (t_finite(bs$beta_db)) dbs <- c(dbs, as.numeric(bs$beta_db)[1])
    if (t_finite(bs$ftg_db)) dbs <- c(dbs, as.numeric(bs$ftg_db)[1])
  }
  lo <- if (length(dbs)) min(dbs) - 2.0 else -30.0
  hi <- if (length(dbs)) max(dbs) + 1.0 else 0.0
  span <- max(1e-6, hi - lo)

  tm_set <- unique(vapply(streams_raw, function(r) {
    tmf <- t_str(r$datetime, "")
    if (nchar(tmf) >= 16L) substr(tmf, 12L, 16L) else tmf
  }, character(1)))

  streams <- list()
  for (r in streams_raw) {
    bs <- r$band_stats %||% list()
    amp <- suppressWarnings(as.numeric(unlist(r$amp_range_ma %||% list())))
    amp <- amp[is.finite(amp)]
    amp_s <- if (length(amp) == 1L || (length(amp) >= 2L && amp[1] == amp[length(amp)])) {
      sprintf("%g mA", amp[length(amp)])
    } else if (length(amp) >= 2L) {
      sprintf("%g\u2013%g mA", amp[1], amp[length(amp)])
    } else {
      ""
    }
    tm_full <- t_str(r$datetime, "")
    tm <- if (nchar(tm_full) >= 16L) substr(tm_full, 12L, 16L) else tm_full
    stim_c <- t_compact_contacts(r$stim_contacts)
    origin <- t_str(r$origin, "")
    tag <- if (nzchar(stim_c) && (length(tm_set) <= 1L || startsWith(origin, "Bravo"))) {
      paste("stim", stim_c)
    } else if (nzchar(tm)) {
      tm
    } else {
      "\u2014"
    }
    streams[[length(streams) + 1L]] <- list(
      label = t_str(r$label %||% r$id, ""),
      time = if (nzchar(tm)) tm else "\u2014",
      tag = tag,
      stim = if (nzchar(stim_c)) stim_c else "\u2014",
      hemisphere = t_str(r$hemisphere, ""),
      pair = t_str(r$pair, ""),
      stim_rate = t_fmt_val(r$stim_rate_hz, 0L, "Hz"),
      amp = amp_s,
      beta_db = t_fmt_val(bs$beta_db, 1L),
      ftg_db = t_fmt_val(bs$ftg_db, 1L),
      beta_peak = t_fmt_val(bs$beta_peak_hz, 1L, "Hz"),
      ftg_peak = t_fmt_val(bs$ftg_peak_hz, 1L, "Hz"),
      ratio_db = t_fmt_val(bs$ftg_beta_db_diff, 1L, "dB"),
      rms_uv = t_fmt_val(r$rms_uv, 2L),
      duration = t_fmt_val(r$duration_s, 1L),
      beta_frac = t_frac(bs$beta_db, lo, span),
      ftg_frac = t_frac(bs$ftg_db, lo, span)
    )
  }

  # Dose response (titration recordings with >= 2 amplitude steps)
  titr_tmp <- list()
  for (r in streams_raw) {
    steps <- Filter(function(x) is.list(x) && t_finite(x$beta_db) && t_finite(x$amp_ma), r$amp_steps %||% list())
    if (length(steps) < 2L) next
    ord <- order(vapply(steps, function(x) as.numeric(x$amp_ma)[1], numeric(1)))
    steps <- steps[ord]
    s_first <- steps[[1]]
    s_last <- steps[[length(steps)]]
    d_beta <- as.numeric(s_last$beta_db)[1] - as.numeric(s_first$beta_db)[1]
    d_ftg <- if (t_finite(s_last$ftg_db) && t_finite(s_first$ftg_db)) {
      as.numeric(s_last$ftg_db)[1] - as.numeric(s_first$ftg_db)[1]
    } else {
      NULL
    }
    stim_c <- t_compact_contacts(r$stim_contacts)
    h1 <- substr(t_str(r$hemisphere, ""), 1L, 1L)
    row_lbl <- paste0(h1, " ", t_str(r$pair, ""), if (nzchar(stim_c)) paste0(" \u00b7 stim ", stim_c) else "")
    titr_tmp[[length(titr_tmp) + 1L]] <- list(
      row = row_lbl,
      range = sprintf("\u2264%g mA", as.numeric(s_last$amp_ma)[1]),
      range_long = sprintf("%g\u2013%g mA \u00b7 %d steps", as.numeric(s_first$amp_ma)[1], as.numeric(s_last$amp_ma)[1], length(steps)),
      d_beta = sprintf("%+.1f", d_beta),
      d_ftg = if (!is.null(d_ftg)) sprintf("%+.1f", d_ftg) else "\u2014",
      `_db` = d_beta,
      `_df` = if (!is.null(d_ftg)) d_ftg else 0.0
    )
  }
  mx_t <- max(c(1e-9, vapply(titr_tmp, function(t) max(abs(t$`_db`), abs(t$`_df`)), numeric(1))))
  titration <- lapply(head(titr_tmp, 8L), function(t) {
    list(
      row = t$row,
      range = t$range,
      range_long = t$range_long,
      d_beta = t$d_beta,
      d_ftg = t$d_ftg,
      beta_frac = min(1.0, abs(t$`_db`) / mx_t),
      ftg_frac = min(1.0, abs(t$`_df`) / mx_t)
    )
  })

  # Directional survey
  montage <- payload$montage %||% list()
  survey_tmp <- lapply(montage, function(m) {
    uv <- if (t_finite(m$peak_uv)) as.numeric(m$peak_uv)[1] else 0.0
    art <- tolower(gsub("_", " ", sub("^ARTIFACT_", "", t_str(m$artifact, ""))))
    list(
      hemisphere = t_str(m$hemisphere, ""),
      pair = t_str(m$pair, ""),
      kind = t_str(m$kind, ""),
      peak_hz = t_fmt_val(m$peak_hz, 2L),
      peak_uv = t_fmt_val(m$peak_uv, 3L),
      artifact = art,
      `_uv` = uv
    )
  })
  if (length(survey_tmp)) {
    ord_s <- order(
      vapply(survey_tmp, function(x) x$hemisphere, character(1)),
      -vapply(survey_tmp, function(x) x$`_uv`, numeric(1))
    )
    survey_tmp <- survey_tmp[ord_s]
  }
  survey_hemis <- sort(unique(vapply(survey_tmp, function(x) x$hemisphere, character(1))))
  survey_top <- lapply(survey_hemis, function(hemi) {
    rows_h <- head(Filter(function(r) identical(r$hemisphere, hemi), survey_tmp), 6L)
    mx <- max(c(1e-9, vapply(rows_h, function(r) r$`_uv`, numeric(1))))
    list(
      hemisphere = hemi,
      rows = t_list(lapply(seq_along(rows_h), function(i) {
        r <- rows_h[[i]]
        list(pair = r$pair, peak_uv = sprintf("%.2f", r$`_uv`), frac = r$`_uv` / mx, rank = as.integer(i))
      }))
    )
  })
  survey <- lapply(survey_tmp, function(r) {
    list(hemisphere = r$hemisphere, pair = r$pair, kind = r$kind, peak_hz = r$peak_hz, peak_uv = r$peak_uv, artifact = r$artifact)
  })

  # Therapy groups (Final)
  final_groups <- Filter(function(g) identical(t_str(g$stage), "Final"), payload$groups %||% list())
  groups <- lapply(final_groups, function(g) {
    hemis_g <- g$hemispheres %||% list()
    lines <- list()
    short <- list()
    for (h in names(hemis_g)) {
      hp <- hemis_g[[h]]
      elecs <- hp$electrodes %||% list()
      negs <- Filter(function(e) identical(t_str(e$polarity), "Negative"), elecs)
      cath_long <- paste(vapply(negs, function(e) sprintf("%s(%s)", t_str(e$contact %||% e$electrode), t_fmt_g(e$ma)), character(1)), collapse = ", ")
      cath_short <- paste(vapply(negs, function(e) t_str(e$contact %||% e$electrode), character(1)), collapse = " ")
      lines[[length(lines) + 1L]] <- sprintf(
        "%s: \u2212[%s] \u00b7 %s \u00b7 %s \u00b7 sense %s",
        h, if (nzchar(cath_long)) cath_long else "none",
        t_fmt_val(hp$pw_us, 0L, "\u00b5s"),
        t_fmt_val(hp$total_ma, 1L, "mA"),
        if (nzchar(t_str(hp$sensing_pair))) t_str(hp$sensing_pair) else "\u2014"
      )
      short[[length(short) + 1L]] <- sprintf(
        "%s: \u2212[%s] \u00b7 %s \u00b7 %s",
        substr(h, 1L, 1L), if (nzchar(cath_short)) cath_short else "none",
        t_fmt_val(hp$total_ma, 1L, "mA"),
        t_fmt_val(hp$pw_us, 0L, "\u00b5s")
      )
    }
    list(
      short_lines = t_list(short),
      group_id = sub("^GROUP_", "Group ", t_str(g$group_id, "")),
      active = isTRUE(g$active),
      rate = t_fmt_val(g$rate_hz, 0L, "Hz"),
      ftg = t_fmt_val(g$ftg_center_hz, 1L, "Hz"),
      lines = t_list(lines)
    )
  })

  # Impedance (monopolar) matrix
  imp <- payload$impedances %||% list()
  imp_names <- names(imp) %||% character(0)
  hemis_imp <- c(intersect(c("Left", "Right"), imp_names), setdiff(imp_names, c("Left", "Right")))
  contacts_imp <- character(0)
  for (h in hemis_imp) {
    mp <- imp[[h]]$monopolar %||% list()
    for (c in names(mp)) {
      if (!(c %in% contacts_imp)) contacts_imp <- c(contacts_imp, c)
    }
  }
  impedance <- lapply(contacts_imp, function(c) {
    vals <- vapply(hemis_imp, function(h) t_fmt_val((imp[[h]]$monopolar %||% list())[[c]], 0L), character(1))
    t_list(c(c, vals))
  })
  impedance_header <- t_list(c("Contact", hemis_imp))

  # Events
  events <- lapply(payload$event_summary %||% list(), function(e) {
    list(
      group = sub("^GROUP_", "Group ", t_str(e$group, "")),
      hemisphere = t_str(e$hemisphere, ""),
      target = t_str(e$target, ""),
      above = t_fmt_val(e$above_pct, 0L),
      between = t_fmt_val(e$between_pct, 0L),
      below = t_fmt_val(e$below_pct, 0L),
      avg_ma = t_fmt_val(e$avg_ma, 1L)
    )
  })

  # KPI tiles
  leads <- payload$leads %||% list()
  is_ring_lead <- function(v) {
    cs <- as.character(unlist(v$contacts %||% list()))
    identical(v$directional, FALSE) || (length(cs) > 0L && !any(grepl("^[12][abc]$", cs)))
  }
  lead_name <- function(v) {
    m <- gsub("LeadModelDef\\.", "", gsub("LEAD_", "", t_str(v$model, "")))
    if (is_ring_lead(v)) {
      if (!nzchar(m) || m == "RING_4_CONTACT") "4-ring" else paste0(m, " (4-ring)")
    } else {
      if (nzchar(m)) paste("SenSight", m) else "SenSight"
    }
  }
  lead_models <- sort(unique(vapply(leads, lead_name, character(1))))
  lead_note <- paste(vapply(sort(names(leads) %||% character(0)), function(h) {
    v <- leads[[h]]
    paste0(substr(h, 1L, 1L), " ", t_str(v$target, ""),
           if (is_ring_lead(v)) "" else paste0(" ", t_str(v$orientation_deg, ""), "\u00b0"))
  }, character(1)), collapse = " \u00b7 ")

  best_val <- -Inf
  best_rec <- NULL
  for (r in streams_raw) {
    b <- (r$band_stats %||% list())$beta_db
    if (t_finite(b) && as.numeric(b)[1] > best_val) {
      best_val <- as.numeric(b)[1]
      best_rec <- r
    }
  }

  n_nodes <- as.integer(t_num(dag$n_nodes %||% length(dag$nodes %||% list()), 0L))
  n_edges <- as.integer(t_num(dag$n_edges %||% length(dag$edges %||% list()), 0L))
  diag_str <- t_split_diagnosis(meta$diagnosis %||% "\u2014")
  if (!nzchar(diag_str)) diag_str <- "\u2014"

  kpis <- list(
    list(label = "Device", value = t_str(meta$device_name, "\u2014"),
         note = sprintf("%s \u00b7 battery %s%%", t_str(meta$device_model, ""), t_str(meta$battery_pct, "\u2014"))),
    list(label = "Diagnosis", value = diag_str,
         note = paste("Implant", substr(t_fmt_date(meta$implant_date), 1L, 10L))),
    list(label = "Session", value = substr(t_fmt_date(meta$session_date), 1L, 10L),
         note = sprintf("%s \u00b7 programmer %s", dur, t_str(meta$programmer_version, ""))),
    list(label = "Leads", value = sprintf("%d \u00d7 %s", length(leads), if (length(lead_models)) paste(lead_models, collapse = "/") else "\u2014"),
         note = lead_note),
    list(label = "Stimulation", value = sprintf("%.0f", stim), unit = "Hz",
         note = sprintf("FTG %.1f \u00b1 %.1f Hz", ftg_c, hbw), accent = TRUE),
    list(label = "Recordings", value = as.character(length(recs)),
         note = sprintf("%d streams \u00b7 %d survey", length(streams_all), max(0L, length(recs) - length(streams_all)))),
    list(label = "Strongest \u03b2 stream",
         value = if (!is.null(best_rec)) paste(t_str(best_rec$hemisphere, ""), t_str(best_rec$pair, "")) else "\u2014",
         note = if (!is.null(best_rec)) sprintf("%.1f dB @ %s Hz", best_val, t_str((best_rec$band_stats %||% list())$beta_peak_hz, "\u2014")) else "",
         accent = !is.null(best_rec)),
    list(label = "Analysis DAG", value = sprintf("%d objects", n_nodes),
         note = sprintf("%d edges \u00b7 %s", n_edges, t_str(dag$preset, "")))
  )
  kpis <- lapply(kpis, function(k) {
    k$label <- gsub("\u0392", "\u03b2", toupper(k$label), fixed = TRUE)
    k$note <- t_trim_str(k$note, 30L)
    k
  })

  # Decision analysis (live picks computed in the widget)
  an <- req$analysis %||% list()
  analysis_tiles <- list()
  analysis_tables <- list()

  gt <- an$gt %||% list()
  if (length(gt$picks %||% list()) > 0L) {
    p0 <- gt$picks[[1]]
    analysis_tiles[[length(analysis_tiles) + 1L]] <- list(
      label = sprintf("GAME THEORY \u00b7 %s", toupper(t_str(gt$hemi, ""))),
      value = t_str(p0$arm, "\u2014"),
      note = trimws(paste(t_str(p0$method, ""), t_str(p0$value, ""))),
      accent = TRUE
    )
    analysis_tables[[length(analysis_tables) + 1L]] <- list(
      title = sprintf("Game-theory consensus (%s)", t_str(gt$hemi, "")),
      note = t_str(gt$note, ""),
      columns = t_list(c(1L, 1L, 1L)),
      header = t_list(c("Method", "Recommended arm", "Value")),
      rows = t_list(lapply(gt$picks, function(p) t_list(c(t_str(p$method, ""), t_str(p$arm, ""), t_str(p$value, "")))))
    )
  }

  for (pair_def in list(c("risk", "Extreme-value risk"), c("options", "Option pricing"))) {
    key <- pair_def[1]
    lbl <- pair_def[2]
    blk <- an[[key]] %||% list()
    if (length(blk$rules %||% list()) > 0L) {
      analysis_tiles[[length(analysis_tiles) + 1L]] <- list(
        label = sprintf("%s \u00b7 %s", toupper(lbl), toupper(t_str(blk$hemi, ""))),
        value = t_str(blk$majority, "\u2014"),
        note = t_str(blk$note, "")
      )
      analysis_tables[[length(analysis_tables) + 1L]] <- list(
        title = sprintf("%s \u2014 rule-based selection (%s)", lbl, t_str(blk$hemi, "")),
        note = t_str(blk$note, ""),
        columns = t_list(c(1L, 1L, 1L)),
        header = t_list(c("Rule", "Selected arm", "Value")),
        rows = t_list(lapply(blk$rules, function(r) t_list(c(t_str(r$name, ""), t_str(r$arm, "\u2014"), t_str(r$val, "")))))
      )
    }
  }

  gsp <- an$gsp %||% list()
  if (length(gsp$rows %||% list()) > 0L) {
    analysis_tables[[length(analysis_tables) + 1L]] <- list(
      title = "Graph signal processing KPIs",
      note = t_str(gsp$note, ""),
      columns = t_list(c(1L, 1L)),
      header = t_list(c("KPI", "Value")),
      rows = t_list(lapply(gsp$rows, function(r) {
        vals <- as.character(unlist(r))
        if (length(vals) < 2L) vals <- c(vals, rep("", 2L - length(vals)))
        t_list(vals[1:2])
      }))
    )
  }

  # Selection rows
  fmt_lst <- function(v, n = 24L) {
    xs <- as.character(unlist(v %||% list()))
    if (!length(xs)) return("\u2014")
    if (length(xs) > n) {
      paste0(paste(xs[seq_len(n)], collapse = ", "), sprintf(" \u2026 (+%d)", length(xs) - n))
    } else {
      paste(xs, collapse = ", ")
    }
  }
  fmt_params <- function(p) {
    if (!is.list(p) || !length(p)) return("\u2014")
    ks <- setdiff(names(p) %||% character(0), "hemisphere")
    if (!length(ks)) return("\u2014")
    paste(vapply(ks, function(k) sprintf("%s=%s", k, t_str(p[[k]], "")), character(1)), collapse = " \u00b7 ")
  }

  sel_contacts <- unlist(sel$contacts %||% list())
  sel_pairs <- unlist(sel$pairs %||% list())
  sel_recs <- unlist(sel$recordings %||% list())
  selection_rows <- t_list(list(
    t_list(c("Hemisphere", t_str(sel$hemisphere, "\u2014"))),
    t_list(c("Contacts", sprintf("%d: %s", length(sel_contacts), fmt_lst(sel_contacts)))),
    t_list(c("Bipolar pairs", sprintf("%d: %s", length(sel_pairs), fmt_lst(sel_pairs, 12L)))),
    t_list(c("Recordings", as.character(length(sel_recs)))),
    t_list(c("Stimulation rate / FTG \u0394f", sprintf("%.0f Hz / \u00b1%.1f Hz", stim, hbw))),
    t_list(c("Selected objects", fmt_lst(sel$selected_node_titles %||% sel$selected_nodes))),
    t_list(c("Game-theory parameters", fmt_params(sel$gt_params))),
    t_list(c("Risk parameters", fmt_params(sel$risk_params))),
    t_list(c("Option parameters", fmt_params(sel$opt_params))),
    t_list(c("GSP parameters", fmt_params(sel$gsp_params)))
  ))

  srcs <- as.character(unlist(meta$sources %||% list()))
  srcs_str <- if (length(srcs) > 1L) paste(srcs, collapse = ", ") else ""

  dag_edges <- t_list(lapply(dag$edges %||% list(), function(e) {
    list(source = t_str(e$source, ""), target = t_str(e$target, ""), label = t_str(e$label, ""))
  }))

  list(
    meta = list(
      title = t_str(req$title %||% "DBS Sensing & Programming Report"),
      subtitle = "DBS LFP analysis report",
      file_name = t_str(meta$file_name, "session"),
      sources = srcs_str,
      device = t_str(meta$device_name, "Percept"),
      device_model = t_str(meta$device_model, ""),
      diagnosis = t_split_diagnosis(meta$diagnosis %||% ""),
      session_date = t_fmt_date(meta$session_date),
      generated_at = format(Sys.time(), "%Y-%m-%d %H:%M"),
      footnote = sprintf(
        "\u03b2 band %g\u2013%g Hz. Finely-tuned gamma (FTG) band = f_stim/2 \u00b1 \u0394f (%.1f\u2013%.1f Hz at %.0f Hz). Band power from Welch PSD of 250 Hz BrainSense streams; survey peaks from the directional LFP montage. Decision-analysis picks reflect the live widget parameters at export time and are research outputs, not clinical recommendations.",
        beta_v[1], beta_v[2], ftg_c - hbw, ftg_c + hbw, stim
      )
    ),
    config = list(
      beta_band = sprintf("%g\u2013%g Hz", beta_v[1], beta_v[2]),
      ftg_band = sprintf("%.1f \u00b1 %.1f Hz", ftg_c, hbw)
    ),
    scales = list(db_lo = sprintf("%.0f", lo), db_hi = sprintf("%.0f", hi)),
    kpis = t_list(kpis),
    streams = t_list(streams),
    survey = t_list(survey),
    survey_top = t_list(survey_top),
    titration = t_list(titration),
    groups = t_list(groups),
    impedance = t_list(impedance),
    impedance_header = impedance_header,
    events = t_list(events),
    analysis_tiles = t_list(head(analysis_tiles, 4L)),
    analysis_tables = t_list(analysis_tables),
    selection_rows = selection_rows,
    dag = list(
      preset = t_str(dag$preset, ""),
      n_nodes = n_nodes,
      n_edges = n_edges,
      edges = dag_edges
    ),
    figures = t_list(fig_files),
    canvas = if (!is.null(canvas_file)) list(file = canvas_file) else NULL
  )
}

t_typst_bundle <- function(payload, req, modes = c("report", "infographic")) {
  assets <- t_collect_assets(req)
  data <- t_report_data(payload, req, assets$fig_entries, assets$canvas_file)
  datas <- list()
  for (m in modes) {
    d_m <- data
    d_m$mode <- m
    datas[[m]] <- as.character(jsonlite::toJSON(d_m, auto_unbox = TRUE, null = "null", na = "null", digits = 6))
  }
  list(
    main = t_read_typst_template(),
    files = assets$files,
    data = datas,
    stem = t_report_stem(payload, req)
  )
}

# ── Rich Pure-R OOXML Word (.docx) Builder (Embedded PNGs + Styled Tables) ─

t_build_docx_bytes <- function(data, infographic_png = NULL, rasters = list(), png_items = list()) {
  media_entries <- list()
  rel_entries <- character(0)
  img_counter <- 0L

  register_png <- function(png_raw, target_w_cm, max_h_cm = NULL) {
    if (is.null(png_raw) || !is.raw(png_raw) || length(png_raw) < 24L) return("")
    img_counter <<- img_counter + 1L
    rid <- paste0("rId", img_counter)
    fname <- sprintf("image%d.png", img_counter)
    media_entries[[paste0("word/media/", fname)]] <<- png_raw
    rel_entries <<- c(rel_entries, sprintf(
      '<Relationship Id="%s" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/%s"/>',
      rid, fname
    ))
    wh <- t_png_size(png_raw)
    ar <- wh[2] / max(1, wh[1])
    w_cm <- target_w_cm
    if (!is.null(max_h_cm) && w_cm * ar > max_h_cm) {
      w_cm <- max_h_cm / max(1e-6, ar)
    }
    cx <- round(w_cm * 360000)
    cy <- round(w_cm * ar * 360000)
    sprintf(
      paste0(
        '<w:p><w:pPr><w:jc w:val="center"/><w:keepNext/><w:spacing w:after="60"/></w:pPr>',
        '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">',
        '<wp:extent cx="%.0f" cy="%.0f"/>',
        '<wp:docPr id="%d" name="Picture %d"/>',
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>',
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
        '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">',
        '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
        '<pic:nvPicPr><pic:cNvPr id="%d" name="%s"/><pic:cNvPicPr/></pic:nvPicPr>',
        '<pic:blipFill><a:blip r:embed="%s"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>',
        '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="%.0f" cy="%.0f"/></a:xfrm>',
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>',
        '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
      ),
      cx, cy, img_counter, img_counter, img_counter, fname, rid, cx, cy
    )
  }

  p_xml <- function(text, bold = FALSE, size = 20L, color = "111317", space_before = 0L, space_after = 100L, align = NULL) {
    b_tag <- if (bold) "<w:b/>" else ""
    jc_tag <- if (!is.null(align)) sprintf('<w:jc w:val="%s"/>', align) else ""
    sprintf(
      '<w:p><w:pPr>%s<w:spacing w:before="%d" w:after="%d"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/>%s<w:color w:val="%s"/><w:sz w:val="%d"/></w:rPr><w:t xml:space="preserve">%s</w:t></w:r></w:p>',
      jc_tag, space_before, space_after, b_tag, color, size, t_xml_esc(text)
    )
  }

  h1_xml <- function(text) p_xml(text, bold = TRUE, size = 30L, color = "B81D33", space_before = 200L, space_after = 100L)
  h2_xml <- function(text) p_xml(text, bold = TRUE, size = 24L, color = "111317", space_before = 160L, space_after = 80L)

  tbl_xml <- function(header, rows) {
    hdr <- as.character(unlist(header))
    if (!length(hdr) || !length(rows)) return("")
    cell_xml <- function(val, is_hdr = FALSE, shaded = FALSE) {
      fill <- if (is_hdr) "B81D33" else if (shaded) "F7F8FA" else NULL
      shd <- if (!is.null(fill)) sprintf('<w:shd w:val="clear" w:color="auto" w:fill="%s"/>', fill) else ""
      clr <- if (is_hdr) "FFFFFF" else "111317"
      b_tag <- if (is_hdr) "<w:b/>" else ""
      parts <- strsplit(t_str(val, ""), "\n", fixed = TRUE)[[1]]
      if (!length(parts)) parts <- ""
      ps <- paste(vapply(parts, function(ln) {
        sprintf(
          '<w:p><w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/>%s<w:color w:val="%s"/><w:sz w:val="17"/></w:rPr><w:t xml:space="preserve">%s</w:t></w:r></w:p>',
          b_tag, clr, t_xml_esc(ln)
        )
      }, character(1)), collapse = "")
      sprintf('<w:tc><w:tcPr>%s<w:tcMar><w:top w:w="50" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar></w:tcPr>%s</w:tc>', shd, ps)
    }
    h_row <- paste0("<w:tr><w:trPr><w:tblHeader/></w:trPr>", paste(vapply(hdr, cell_xml, character(1), is_hdr = TRUE), collapse = ""), "</w:tr>")
    b_rows <- vapply(seq_along(rows), function(ri) {
      vals <- as.character(unlist(rows[[ri]]))
      if (length(vals) < length(hdr)) vals <- c(vals, rep("", length(hdr) - length(vals)))
      vals <- vals[seq_len(length(hdr))]
      paste0("<w:tr>", paste(vapply(vals, cell_xml, character(1), is_hdr = FALSE, shaded = (ri %% 2L == 0L)), collapse = ""), "</w:tr>")
    }, character(1))
    paste0(
      '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>',
      '<w:top w:val="single" w:sz="6" w:space="0" w:color="111317"/>',
      '<w:bottom w:val="single" w:sz="6" w:space="0" w:color="111317"/>',
      '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E8EBF0"/>',
      '<w:left w:val="none"/><w:right w:val="none"/><w:insideV w:val="none"/>',
      '</w:tblBorders></w:tblPr>',
      h_row, paste(b_rows, collapse = ""), '</w:tbl><w:p><w:pPr><w:spacing w:after="100"/></w:pPr></w:p>'
    )
  }

  portrait_sect_p <- '<w:p><w:pPr><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="907" w:bottom="850" w:left="907"/></w:sectPr></w:pPr></w:p>'
  landscape_sect_p <- '<w:p><w:pPr><w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="794" w:right="794" w:bottom="794" w:left="794"/></w:sectPr></w:pPr></w:p>'

  meta <- data$meta %||% list()
  body <- character(0)

  # Page 1: Typst Infographic PNG (if available) or Title + KPI table
  if (!is.null(infographic_png) && is.raw(infographic_png) && length(infographic_png) > 24L) {
    body <- c(body, register_png(infographic_png, target_w_cm = 17.8, max_h_cm = 25.0))
  } else {
    body <- c(
      body,
      p_xml(sprintf("Titra   %s", t_str(meta$subtitle, "DBS LFP analysis report")), bold = TRUE, size = 36L, color = "B81D33", space_after = 80L),
      p_xml(t_str(meta$title, "DBS Sensing & Programming Report"), bold = TRUE, size = 28L, color = "111317", space_after = 60L),
      p_xml(sprintf("%s \u00b7 %s %s \u00b7 session %s \u00b7 \u03b2 %s \u00b7 FTG %s",
                    t_str(meta$file_name), t_str(meta$device), t_str(meta$device_model),
                    t_str(meta$session_date), t_str(data$config$beta_band), t_str(data$config$ftg_band)),
            size = 18L, color = "4B5563", space_after = 140L),
      tbl_xml(c("Indicator", "Value", "Note"), lapply(data$kpis %||% list(), function(k) {
        c(t_str(k$label), trimws(paste(t_str(k$value), t_str(k$unit, ""))), t_str(k$note, ""))
      }))
    )
  }

  # Page 2: Landscape DAG Canvas
  if (!is.null(rasters[["canvas"]]) && is.raw(rasters[["canvas"]]) && length(rasters[["canvas"]]) > 24L) {
    body <- c(
      body,
      portrait_sect_p,
      h1_xml("Analysis DAG canvas"),
      p_xml(sprintf("Preset %s \u00b7 %s objects \u00b7 %s edges",
                    t_str(data$dag$preset), t_str(data$dag$n_nodes), t_str(data$dag$n_edges)),
            size = 18L, color = "4B5563", space_after = 100L),
      register_png(rasters[["canvas"]], target_w_cm = 26.8, max_h_cm = 14.8),
      landscape_sect_p
    )
  } else {
    body <- c(body, '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
  }

  # Analysis Objects (figures)
  figs_meta <- data$figures %||% list()
  fig_blocks <- character(0)
  fig_num <- 0L
  for (i in seq_along(figs_meta)) {
    fe <- figs_meta[[i]]
    key <- sub("\\.svg$", "", t_str(fe$file, ""))
    if (!is.null(rasters[[key]]) && is.raw(rasters[[key]]) && length(rasters[[key]]) > 24L) {
      fig_num <- fig_num + 1L
      w_cm <- max(6.0, min(17.8, t_num(fe$disp_w_mm, 165.0) / 10.0))
      fig_blocks <- c(
        fig_blocks,
        register_png(rasters[[key]], target_w_cm = w_cm, max_h_cm = 12.2),
        sprintf(
          '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b/><w:color w:val="B81D33"/><w:sz w:val="17"/></w:rPr><w:t xml:space="preserve">Figure %d. </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b/><w:sz w:val="17"/></w:rPr><w:t xml:space="preserve">%s. </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:sz w:val="17"/></w:rPr><w:t xml:space="preserve">%s</w:t></w:r></w:p>',
          fig_num, t_xml_esc(fe$title), t_xml_esc(fe$desc)
        )
      )
    }
  }
  if (length(fig_blocks)) {
    body <- c(body, h1_xml("Analysis objects"), fig_blocks)
  }

  # Decision analysis tables
  if (length(data$analysis_tables %||% list())) {
    body <- c(body, h1_xml("Decision analysis"))
    for (t in data$analysis_tables) {
      body <- c(body, h2_xml(t_str(t$title)))
      if (nzchar(t_str(t$note))) body <- c(body, p_xml(t_str(t$note), size = 17L, color = "4B5563", space_after = 60L))
      body <- c(body, tbl_xml(t$header, t$rows))
    }
  }

  # Data appendix
  body <- c(body, h1_xml("Data appendix"))
  if (nzchar(t_str(meta$sources))) {
    body <- c(body, p_xml(paste("Merged files:", t_str(meta$sources)), size = 18L, color = "4B5563"))
  }
  if (length(data$streams %||% list())) {
    body <- c(body, h2_xml("BrainSense streaming recordings"), tbl_xml(
      c("Recording", "Time", "\u03b2 (dB)", "\u03b2 peak", "FTG (dB)", "FTG peak", "FTG \u2212 \u03b2", "RMS (\u00b5V)", "Dur. (s)"),
      lapply(data$streams, function(s) c(s$label, s$time, s$beta_db, s$beta_peak, s$ftg_db, s$ftg_peak, s$ratio_db, s$rms_uv, s$duration))
    ))
  }
  if (length(data$survey %||% list())) {
    body <- c(body, h2_xml("Directional montage survey"), tbl_xml(
      c("Hemisphere", "Pair", "Kind", "Peak (Hz)", "Peak (\u00b5V)", "Artifact"),
      lapply(data$survey, function(r) c(r$hemisphere, r$pair, r$kind, r$peak_hz, r$peak_uv, r$artifact))
    ))
  }
  if (length(data$titration %||% list())) {
    body <- c(body, h2_xml("Dose response (titration)"), tbl_xml(
      c("Recording", "Amplitude range", "\u0394\u03b2 (dB)", "\u0394FTG (dB)"),
      lapply(data$titration, function(t) c(t$row, t$range_long, t$d_beta, t$d_ftg))
    ))
  }
  if (length(data$groups %||% list())) {
    body <- c(body, h2_xml("Therapy groups (final)"), tbl_xml(
      c("Group", "Active", "Rate", "FTG", "Programming"),
      lapply(data$groups, function(g) c(g$group_id, if (isTRUE(g$active)) "yes" else "", g$rate, g$ftg, paste(unlist(g$lines), collapse = "\n")))
    ))
  }
  if (length(data$impedance %||% list())) {
    body <- c(body, h2_xml("Monopolar impedance (\u03a9)"), tbl_xml(data$impedance_header, data$impedance))
  }
  if (length(data$events %||% list())) {
    body <- c(body, h2_xml("Adaptive / event summary"), tbl_xml(
      c("Group", "Hemisphere", "Target", "Above %", "Between %", "Below %", "Avg mA"),
      lapply(data$events, function(e) c(e$group, e$hemisphere, e$target, e$above, e$between, e$below, e$avg_ma))
    ))
  }
  body <- c(body, h2_xml("Selection & parameters synced from the DAG"), tbl_xml(c("Item", "Value"), data$selection_rows %||% list()))
  if (length(data$dag$edges %||% list())) {
    body <- c(body, h2_xml("DAG topology"), tbl_xml(
      c("Source", "Target", "Edge"),
      lapply(data$dag$edges, function(e) c(e$source, e$target, e$label))
    ))
  }
  body <- c(body, p_xml(t_str(meta$footnote), size = 16L, color = "4B5563", space_before = 120L, space_after = 40L))

  doc_xml <- paste0(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ',
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ',
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">',
    '<w:body>',
    paste(body, collapse = ""),
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="907" w:bottom="850" w:left="907"/></w:sectPr>',
    '</w:body></w:document>'
  )

  ct_xml <- paste0(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Default Extension="png" ContentType="image/png"/>',
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
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    paste(rel_entries, collapse = ""),
    '</Relationships>'
  )

  entries <- c(
    list(
      "[Content_Types].xml" = charToRaw(enc2utf8(ct_xml)),
      "_rels/.rels" = charToRaw(enc2utf8(rels_xml)),
      "word/document.xml" = charToRaw(enc2utf8(doc_xml)),
      "word/_rels/document.xml.rels" = charToRaw(enc2utf8(wrels_xml))
    ),
    media_entries
  )
  t_zip_raw(entries)
}

# ── Optional native Typst CLI compile (desktop R when `typst` binary is installed) ──

t_compile_typst_cli <- function(bundle, mode = "report", fmt = "pdf") {
  typst_bin <- Sys.which("typst")
  if (!nzchar(typst_bin)) stop("Typst CLI is not installed.")
  td <- tempfile("titra_typst_")
  dir.create(td, recursive = TRUE)
  on.exit(unlink(td, recursive = TRUE), add = TRUE)
  writeBin(charToRaw(enc2utf8(bundle$main)), file.path(td, "report.typ"))
  for (nm in names(bundle$files)) {
    writeBin(charToRaw(enc2utf8(bundle$files[[nm]])), file.path(td, nm))
  }
  writeBin(charToRaw(enc2utf8(bundle$data[[mode]])), file.path(td, "data.json"))
  out_file <- file.path(td, if (fmt == "png") "out.png" else "out.pdf")
  args <- c("compile", "--root", td, file.path(td, "report.typ"), out_file)
  if (fmt == "png") args <- c(args, "--format", "png", "--ppi", "200")
  st <- system2(typst_bin, args = args, stdout = TRUE, stderr = TRUE)
  if (!file.exists(out_file)) {
    stop(paste("Typst CLI compilation failed:", paste(st, collapse = "\n")))
  }
  readBin(out_file, what = "raw", n = file.info(out_file)$size)
}

# ── Main Request Handler ─────────────────────────────────────────────────

t_handle_report_request <- function(payload, req, out_dir = NULL) {
  t0 <- proc.time()[["elapsed"]]
  rid <- t_str(req$id %||% paste0("rep_", as.integer(Sys.time())))
  action <- t_str(req$action %||% "")

  if (action == "typst_bundle") {
    bundle <- t_typst_bundle(payload, req)
    return(list(
      id = rid,
      ok = TRUE,
      bundle = bundle,
      elapsed_s = round(proc.time()[["elapsed"]] - t0, 2)
    ))
  }

  if (action %in% c("diagnose", "install_tools")) {
    typst_bin <- Sys.which("typst")
    msg <- paste(
      sprintf("R runtime: %s", R.version.string),
      sprintf("PDF / Infographic engine: %s", if (nzchar(typst_bin)) paste("Typst CLI:", typst_bin) else "Browser Typst WebAssembly (typst.ts, automatic)"),
      "Word (.docx) & ZIP engine: Native pure-R OOXML + zlib DEFLATE (zero external dependencies)",
      "All report formats (PDF, Infographic PNG, Word .docx, Canvas PNG/SVG, ZIP, Per-object PDF/PNG/SVG) are ready.",
      sep = "\n"
    )
    return(list(
      id = rid,
      ok = TRUE,
      title = "Export setup check",
      message = msg,
      elapsed_s = round(proc.time()[["elapsed"]] - t0, 2)
    ))
  }

  formats <- as.character(unlist(req$formats %||% list()))
  if (!length(formats)) formats <- "pdf"
  stem <- t_report_stem(payload, req)
  assets <- t_collect_assets(req)
  data <- t_report_data(payload, req, assets$fig_entries, assets$canvas_file)

  # Decode browser-rendered assets if present
  decode_b64 <- function(s) {
    s <- t_str(s, "")
    if (!nzchar(s)) return(NULL)
    tryCatch(base64enc::base64decode(s), error = function(e) NULL)
  }
  client_rasters <- list()
  if (is.list(req$rasters)) {
    for (k in names(req$rasters)) {
      raw_v <- decode_b64(req$rasters[[k]])
      if (!is.null(raw_v)) client_rasters[[k]] <- raw_v
    }
  }
  client_pdf <- decode_b64(req$client_pdf)
  client_info <- decode_b64(req$client_infographic)

  # Handle single-object export if routed to server
  if (any(startsWith(formats, "obj_"))) {
    obs <- req$objects %||% list()
    ob <- if (length(obs)) obs[[1]] else list()
    ob_svg <- t_prep_svg(ob$svg %||% "")
    safe_ob <- t_safe_stem(ob$title %||% ob$type %||% "object")
    files_out <- list()
    if ("obj_pdf" %in% formats && nzchar(Sys.which("typst")) && nzchar(ob_svg)) {
      wh <- t_svg_size(ob_svg)
      b_obj <- list(
        main = sprintf('#set page(width: %.2fpt, height: %.2fpt, margin: 0pt)\n#image("object.svg", width: 100%%)\n', wh[1] * 0.75, wh[2] * 0.75),
        files = list("object.svg" = ob_svg),
        data = list(report = "{}")
      )
      pdf_raw <- t_compile_typst_cli(b_obj, "report", "pdf")
      files_out[[length(files_out) + 1L]] <- list(
        name = paste0("titra_", safe_ob, ".pdf"),
        mime = "application/pdf",
        b64 = base64enc::base64encode(pdf_raw),
        bytes = length(pdf_raw)
      )
    }
    return(list(
      id = rid, ok = length(files_out) > 0L,
      error = if (length(files_out)) NULL else "Per-object PDF export uses browser Typst.",
      files = t_list(files_out), saved = list(), saved_dir = "",
      warnings = list(), errors = t_obj(),
      elapsed_s = round(proc.time()[["elapsed"]] - t0, 2)
    ))
  }

  want <- unique(formats)
  if ("zip" %in% want) want <- unique(c(want, "pdf", "docx", "png_infographic", "png_canvas", "svg"))

  produced <- list()
  warnings_out <- character(0)
  errors_out <- t_obj()

  # PDF
  if ("pdf" %in% want) {
    if (!is.null(client_pdf)) {
      produced[["pdf"]] <- list(name = paste0(stem, ".pdf"), mime = "application/pdf", raw = client_pdf)
    } else if (nzchar(Sys.which("typst"))) {
      tryCatch({
        b <- t_typst_bundle(payload, req, modes = "report")
        pdf_raw <- t_compile_typst_cli(b, "report", "pdf")
        produced[["pdf"]] <- list(name = paste0(stem, ".pdf"), mime = "application/pdf", raw = pdf_raw)
      }, error = function(e) {
        errors_out[["pdf"]] <<- conditionMessage(e)
      })
    }
  }

  # Infographic PNG
  info_raw <- client_info
  if (is.null(info_raw) && any(c("png_infographic", "docx") %in% want) && nzchar(Sys.which("typst"))) {
    tryCatch({
      b <- t_typst_bundle(payload, req, modes = "infographic")
      info_raw <- t_compile_typst_cli(b, "infographic", "png")
    }, error = function(e) {
      if ("png_infographic" %in% want) errors_out[["png_infographic"]] <<- conditionMessage(e)
    })
  }
  if ("png_infographic" %in% want && !is.null(info_raw)) {
    produced[["png_infographic"]] <- list(name = paste0(stem, "_infographic.png"), mime = "image/png", raw = info_raw)
  }

  # Canvas PNG
  if ("png_canvas" %in% want && !is.null(client_rasters[["canvas"]])) {
    produced[["png_canvas"]] <- list(name = paste0(stem, "_canvas.png"), mime = "image/png", raw = client_rasters[["canvas"]])
  }

  # Canvas SVG
  if (any(c("svg", "svg_canvas") %in% want) && nzchar(t_str(req$canvas_svg))) {
    produced[["svg"]] <- list(
      name = paste0(stem, "_canvas.svg"),
      mime = "image/svg+xml",
      raw = charToRaw(enc2utf8(t_str(req$canvas_svg)))
    )
  }

  # Word (.docx)
  if ("docx" %in% want) {
    tryCatch({
      docx_raw <- t_build_docx_bytes(data, info_raw, client_rasters, assets$png_items)
      produced[["docx"]] <- list(
        name = paste0(stem, ".docx"),
        mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        raw = docx_raw
      )
    }, error = function(e) {
      errors_out[["docx"]] <<- conditionMessage(e)
    })
  }

  files_out <- list()
  if ("zip" %in% formats) {
    zip_entries <- list()
    for (k in names(produced)) {
      zip_entries[[produced[[k]]$name]] <- produced[[k]]$raw
    }
    for (it in assets$png_items) {
      if (startsWith(it$key, "fig_") && !is.null(client_rasters[[it$key]])) {
        fn <- sprintf("objects/%s_%s.png", it$key, substr(t_safe_stem(it$title), 1L, 40L))
        zip_entries[[fn]] <- client_rasters[[it$key]]
      }
    }
    objs <- req$objects %||% list()
    for (i in seq_along(objs)) {
      ob <- objs[[i]]
      if (is.list(ob) && nzchar(t_str(ob$svg))) {
        fn <- sprintf("objects/fig_%02d_%s.svg", i - 1L, substr(t_safe_stem(ob$title %||% ob$type), 1L, 40L))
        zip_entries[[fn]] <- charToRaw(enc2utf8(t_str(ob$svg)))
      }
    }
    zip_raw <- t_zip_raw(zip_entries)
    files_out[[1L]] <- list(
      name = paste0(stem, ".zip"),
      mime = "application/zip",
      b64 = base64enc::base64encode(zip_raw),
      bytes = length(zip_raw)
    )
  } else {
    for (fmt in formats) {
      key <- if (fmt == "svg_canvas") "svg" else fmt
      if (!is.null(produced[[key]])) {
        p <- produced[[key]]
        files_out[[length(files_out) + 1L]] <- list(
          name = p$name,
          mime = p$mime,
          b64 = base64enc::base64encode(p$raw),
          bytes = length(p$raw)
        )
      }
    }
  }

  list(
    id = rid,
    ok = length(files_out) > 0L,
    error = if (length(files_out) > 0L) NULL else paste("No report files produced.", paste(unlist(errors_out), collapse = "; ")),
    files = t_list(files_out),
    saved = list(),
    saved_dir = "",
    warnings = t_list(warnings_out),
    errors = errors_out,
    elapsed_s = round(proc.time()[["elapsed"]] - t0, 2)
  )
}
