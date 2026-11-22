# Pure-R JSON Ingestion, Format Detection, Verification & Multi-File Session Merging for titraR

t_detect_format <- function(d) {
  if (!is.list(d)) return("unknown")
  nms <- names(d) %||% character(0)
  percept_keys <- c("BrainSenseTimeDomain", "LfpMontageTimeDomain", "LFPMontage",
                    "BrainSenseLfp", "LeadConfiguration", "DeviceInformation", "DiagnosticData")
  if (any(percept_keys %in% nms)) return("percept")
  if (all(c("data", "Contact") %in% nms) || "Timeseries_Data" %in% nms) return("bravo")
  if (length(d) > 0L && is.list(d[[1]]) && ("Timeseries_Data" %in% names(d[[1]]) || "data" %in% names(d[[1]]))) {
    return("bravo")
  }
  "unknown"
}

# Convert Bravo / amplitude-titration export JSON into a normalized Percept-compatible object
t_bravo_to_percept <- function(doc, file_name = "titration.json") {
  docs <- if (!is.null(names(doc)) && "data" %in% names(doc)) list(doc) else if (is.list(doc)) doc else list()
  td_list <- list()
  leads_seen <- list()
  target_lbl <- "GPi"
  stim_rate <- 125.0
  pw_us <- 90.0
  dev_name <- "Percept (Amplitude Titration)"

  for (d in docs) {
    if (!is.list(d)) next
    tp <- t_str(d$TherapyParameters %||% "125Hz 90uSec")
    m_hz <- regexec("([0-9]+(?:\\.[0-9]+)?)\\s*Hz", tp, ignore.case = TRUE)
    r_hz <- regmatches(tp, m_hz)[[1]]
    if (length(r_hz) >= 2L) stim_rate <- t_num(r_hz[2], 125.0)
    m_pw <- regexec("([0-9]+(?:\\.[0-9]+)?)\\s*u[Ss]ec", tp, ignore.case = TRUE)
    r_pw <- regmatches(tp, m_pw)[[1]]
    if (length(r_pw) >= 2L) pw_us <- t_num(r_pw[2], 90.0)

    c_str <- t_str(d$Contact %||% "Left GPi E01")
    hemi <- if (grepl("right", c_str, ignore.case = TRUE)) "Right" else "Left"
    if (grepl("STN", c_str, ignore.case = TRUE)) target_lbl <- "STN"
    else if (grepl("GPi", c_str, ignore.case = TRUE)) target_lbl <- "GPi"
    else if (grepl("VIM", c_str, ignore.case = TRUE)) target_lbl <- "VIM"

    m_sc <- regexec("E0?([0-3][abc]?)", c_str, ignore.case = TRUE)
    r_sc <- regmatches(c_str, m_sc)[[1]]
    stim_c <- if (length(r_sc) >= 2L) tolower(r_sc[2]) else "1"

    leads_seen[[hemi]] <- list(
      Hemisphere = paste0("HemisphereLocationDef.", hemi),
      Model = "4-ring DBS lead (R00-R03)",
      LeadLocation = target_lbl
    )

    data_items <- d$data %||% list()
    if (is.data.frame(data_items)) data_items <- lapply(seq_len(nrow(data_items)), function(i) as.list(data_items[i, , drop = FALSE]))
    for (di in data_items) {
      if (!is.list(di)) next
      ts_rows <- di$Timeseries_Data %||% list()
      if (is.data.frame(ts_rows)) ts_rows <- lapply(seq_len(nrow(ts_rows)), function(i) as.list(ts_rows[i, , drop = FALSE]))
      if (!length(ts_rows)) next
      # Group by Channel string and concatenate amplitude steps into one continuous sweep
      by_ch <- list()
      for (row in ts_rows) {
        if (!is.list(row)) next
        ch <- t_str(row$Channel %||% paste0(hemi, " E00-E02"))
        amp <- t_num(row$Stim_Amplitude, 0.0)
        vals <- as.numeric(unlist(row$Timeseries %||% numeric(0), use.names = FALSE))
        if (length(vals) < 16L) next
        by_ch[[ch]] <- c(by_ch[[ch]], list(list(amp = amp, vals = vals)))
      }
      for (ch in names(by_ch)) {
        segs <- by_ch[[ch]]
        ord <- order(vapply(segs, function(s) s$amp, numeric(1)))
        segs <- segs[ord]
        x_cat <- numeric(0); amp_t <- numeric(0); amp_ma <- numeric(0)
        cur_t <- 0.0; fs <- 250.0
        for (sg in segs) {
          v <- sg$vals
          dur <- length(v) / fs
          x_cat <- c(x_cat, v)
          amp_t <- c(amp_t, cur_t, cur_t + max(dur - 0.01, 0.01))
          amp_ma <- c(amp_ma, sg$amp, sg$amp)
          cur_t <- cur_t + dur
        }
        # Extract pair like E00-E02 -> 0-2
        m_p <- regexec("E0?([0-3][abc]?)\\s*-\\s*E0?([0-3][abc]?)", ch, ignore.case = TRUE)
        r_p <- regmatches(ch, m_p)[[1]]
        pair_s <- if (length(r_p) >= 3L) paste0(hemi, "_", tolower(r_p[2]), "_AND_", tolower(r_p[3])) else paste0(hemi, "_ZERO_AND_TWO")
        td_list[[length(td_list) + 1L]] <- list(
          Channel = pair_s,
          SampleRateInHz = fs,
          StimRateInHz = stim_rate,
          PulseWidthInMicroSecond = pw_us,
          FirstPacketDateTime = paste0(t_str(d$Date %||% "2024-01-01"), "T00:00:00Z"),
          TimeDomainData = x_cat,
          .amp_t = amp_t,
          .amp_ma = amp_ma,
          .stim_contacts = stim_c,
          .origin = file_name
        )
      }
    }
  }

  list(
    FileVersion = "Titration-1.0",
    SessionDate = t_str(docs[[1]]$Date %||% ""),
    ParticipantId = t_str(docs[[1]]$ParticipantId %||% "De-identified"),
    .device_name = dev_name,
    .target = target_lbl,
    LeadConfiguration = list(Final = unname(leads_seen)),
    BrainSenseTimeDomain = td_list
  )
}

#' Inspect and verify a parsed JSON object (or file path) for Titra compatibility
#'
#' @param obj Either a file path or a parsed R list from `jsonlite::fromJSON(..., simplifyVector = FALSE)`.
#' @param name Optional display file name.
#' @param size_bytes File size in bytes.
#' @return A verification report list matching `input_state$report` in `nr_dag.js`.
#' @export
titra_inspect_json <- function(obj, name = "upload.json", size_bytes = 0L) {
  t0 <- proc.time()[["elapsed"]]
  if (is.character(obj) && length(obj) == 1L && file.exists(obj)) {
    size_bytes <- file.info(obj)$size
    name <- basename(obj)
    obj <- jsonlite::fromJSON(obj, simplifyVector = FALSE)
  }
  fmt <- t_detect_format(obj)
  if (fmt == "unknown") {
    return(list(
      ok = FALSE, status = "error", format = "unknown", format_label = "Unrecognized JSON",
      file = name, size = t_human_size(size_bytes),
      summary = "This JSON does not look like a Medtronic Percept or amplitude-titration export.",
      checks = list(), capabilities = list(),
      warnings = list(),
      errors = t_arr("No Percept LFP sections (BrainSenseTimeDomain, LFPMontage, LFPTrendLogs) or amplitude-titration Timeseries_Data found."),
      fixes = t_arr("Export a Medtronic Percept JSON session report or an amplitude-titration JSON file."),
      elapsed_s = round(proc.time()[["elapsed"]] - t0, 2),
      sources = list()
    ))
  }

  norm <- if (fmt == "bravo") t_bravo_to_percept(obj, name) else obj
  fmt_label <- if (fmt == "bravo") "Amplitude titration export (Bravo)" else "Medtronic Percept session report"

  bs_td <- norm$BrainSenseTimeDomain %||% list()
  mnt_td <- norm$LfpMontageTimeDomain %||% list()
  lm <- norm$LFPMontage %||% list()
  bs_lfp <- norm$BrainSenseLfp %||% list()
  imp_raw <- norm$Impedance
  imp <- if (is.list(imp_raw) && !is.null(imp_raw$Hemisphere)) {
    imp_raw$Hemisphere
  } else if (is.list(imp_raw) && length(imp_raw) > 0L && is.list(imp_raw[[length(imp_raw)]])) {
    imp_raw[[length(imp_raw)]]$Hemisphere %||% list()
  } else {
    list()
  }
  trends <- norm$DiagnosticData$LFPTrendLogs %||% list()
  leads <- norm$LeadConfiguration$Final %||% norm$LeadConfiguration$Initial %||% list()
  grps <- norm$Groups$Final %||% norm$Groups$Initial %||% list()

  n_td <- length(bs_td) + length(mnt_td)
  n_bs <- length(bs_td)
  n_lm <- length(lm)
  has_sweeps <- (fmt == "bravo" && n_bs > 0L) || (length(bs_lfp) > 0L && n_bs > 0L)
  has_imp <- length(imp) > 0L
  has_trends <- length(trends) > 0L
  has_grps <- length(grps) > 0L

  ok <- (n_td > 0L) || (n_lm > 0L) || has_trends
  status <- if (!ok) "error" else if (n_bs > 0L && (n_lm > 0L || fmt == "bravo")) "ready" else "partial"

  checks <- list(
    list(item = "Time-domain LFP", status = if (n_td > 0L) "ok" else "missing",
         detail = if (n_td > 0L) sprintf("%d signal(s): %d streaming · %d survey", n_td, n_bs, length(mnt_td)) else "no time-domain streams"),
    list(item = "Stimulation amplitude sweeps", status = if (has_sweeps) "ok" else "missing",
         detail = if (has_sweeps) sprintf("%d streaming sweep(s) detected", n_bs) else "no multi-amplitude titration"),
    list(item = "Directional montage survey", status = if (n_lm > 0L) "ok" else "missing",
         detail = if (n_lm > 0L) sprintf("%d bipolar pair spectra", n_lm) else "no LFPMontage section"),
    list(item = "Chronic trends & snapshots", status = if (has_trends) "ok" else "missing",
         detail = if (has_trends) "LFPTrendLogs present" else "no LFPTrendLogs"),
    list(item = "Impedance", status = if (has_imp) "ok" else "missing",
         detail = if (has_imp) sprintf("%d hemisphere(s) with impedance", length(imp)) else "no Impedance section"),
    list(item = "Leads & therapy groups", status = if (length(leads) > 0L || has_grps) "ok" else "missing",
         detail = sprintf("%d lead(s) · %d group(s)", length(leads), length(grps)))
  )

  capabilities <- list(
    list(analysis = "LFP trace · PSD · spectrogram · β/FTG · phase", ok = n_td > 0L,
         why = if (n_td > 0L) sprintf("%d time-domain signal(s)", n_td) else "needs time-domain LFP"),
    list(analysis = "Dose–response · game theory · risk · options", ok = has_sweeps,
         why = if (has_sweeps) sprintf("%d amplitude sweep(s)", n_bs) else "needs ≥ 2 amplitude steps"),
    list(analysis = "Graph signal processing (GSP)", ok = has_sweeps,
         why = if (has_sweeps) "amplitude-state nodes ready" else "needs ≥ 2 amplitude steps"),
    list(analysis = "Directional montage survey", ok = n_lm > 0L,
         why = if (n_lm > 0L) sprintf("%d bipolar pair spectra", n_lm) else "no LFPMontage section"),
    list(analysis = "Chronic LFP trend", ok = has_trends,
         why = if (has_trends) "LFPTrendLogs present" else "no LFPTrendLogs"),
    list(analysis = "Impedance matrix", ok = has_imp,
         why = if (has_imp) "impedance results present" else "no Impedance section"),
    list(analysis = "Therapy groups", ok = has_grps,
         why = if (has_grps) sprintf("%d group(s)", length(grps)) else "no Groups section")
  )

  summary_str <- if (!ok) {
    "No usable LFP, montage, or trend data detected."
  } else if (n_bs > 0L) {
    sprintf("%d LFP signal(s) ready for the Titra pipeline", n_bs)
  } else {
    sprintf("%d montage / trend record(s) ready", n_lm + length(trends))
  }

  list(
    ok = ok,
    status = status,
    format = fmt,
    format_label = fmt_label,
    file = name,
    size = t_human_size(size_bytes),
    summary = summary_str,
    checks = t_list(checks),
    capabilities = t_list(capabilities),
    warnings = list(),
    errors = if (ok) list() else t_arr("No time-domain LFP, LFPMontage, or LFPTrendLogs found."),
    fixes = list(),
    elapsed_s = round(proc.time()[["elapsed"]] - t0, 2),
    sources = t_list(list(list(name = name, size = t_human_size(size_bytes), added = "initial file")))
  )
}

t_scan_data_dir <- function(data_dir) {
  if (is.null(data_dir) || !nzchar(data_dir) || !dir.exists(data_dir)) return(list())
  files <- list.files(data_dir, pattern = "\\.json$", full.names = TRUE, recursive = TRUE, ignore.case = TRUE)
  if (!length(files)) return(list())
  out <- lapply(files, function(fp) {
    info <- file.info(fp)
    list(
      path = normalizePath(fp, winslash = "/", mustWork = FALSE),
      name = basename(fp),
      folder = basename(dirname(fp)),
      size = t_human_size(info$size),
      combined = FALSE
    )
  })
  t_list(out)
}

# Merge normalized Percept objects from multiple compatible JSON files
t_merge_normalized <- function(base_norm, add_norm, add_name) {
  if (!identical(base_norm$FileVersion, add_norm$FileVersion) &&
      !grepl("Titration", t_str(base_norm$FileVersion)) &&
      !grepl("Titration", t_str(add_norm$FileVersion))) {
    # Allow merging compatible Percept sessions; check participant conflict if both set
  }
  p1 <- t_str(base_norm$ParticipantId %||% "")
  p2 <- t_str(add_norm$ParticipantId %||% "")
  if (nzchar(p1) && nzchar(p2) && p1 != p2 && p1 != "De-identified" && p2 != "De-identified") {
    stop(sprintf("ParticipantId conflict: loaded '%s' vs incoming '%s'", p1, p2))
  }
  added_td <- length(add_norm$BrainSenseTimeDomain %||% list())
  base_norm$BrainSenseTimeDomain <- c(base_norm$BrainSenseTimeDomain %||% list(), add_norm$BrainSenseTimeDomain %||% list())
  base_norm$BrainSenseLfp <- c(base_norm$BrainSenseLfp %||% list(), add_norm$BrainSenseLfp %||% list())
  base_norm$LfpMontageTimeDomain <- c(base_norm$LfpMontageTimeDomain %||% list(), add_norm$LfpMontageTimeDomain %||% list())
  if (length(add_norm$LeadConfiguration$Final %||% list())) {
    existing_h <- vapply(base_norm$LeadConfiguration$Final %||% list(), function(x) t_str(x$Hemisphere), character(1))
    for (ld in add_norm$LeadConfiguration$Final) {
      if (!(t_str(ld$Hemisphere) %in% existing_h)) {
        base_norm$LeadConfiguration$Final <- c(base_norm$LeadConfiguration$Final %||% list(), list(ld))
      }
    }
  }
  list(norm = base_norm, summary = sprintf("%d stream(s) merged from %s", added_td, add_name))
}

#' Load one or more JSON files (paths or raw lists) into a verified Titra session bundle
#'
#' @param source File path (character) or parsed list.
#' @param name Optional file name (when `source` is a parsed list).
#' @param size_bytes Optional file size in bytes.
#' @param ftg_half_bw Default FTG half-bandwidth in Hz.
#' @return A list with `payload`, `selection`, `report`, `norm`, `sources`.
#' @export
titra_load_session <- function(source, name = NULL, size_bytes = 0L, ftg_half_bw = TITRA_DEFAULT_FTG_HW) {
  if (is.character(source) && length(source) == 1L) {
    paths <- strsplit(source, "|", fixed = TRUE)[[1]]
    if (!file.exists(paths[1])) stop("File not found: ", paths[1])
    name <- name %||% basename(paths[1])
    size_bytes <- file.info(paths[1])$size
    raw_obj <- jsonlite::fromJSON(paths[1], simplifyVector = FALSE)
    rep <- titra_inspect_json(raw_obj, name = name, size_bytes = size_bytes)
    if (!isTRUE(rep$ok)) {
      return(list(ok = FALSE, report = rep, payload = t_obj(), selection = titra_default_selection()))
    }
    norm <- if (rep$format == "bravo") t_bravo_to_percept(raw_obj, name) else raw_obj
    sources <- list(list(name = name, size = t_human_size(size_bytes), added = "initial file"))
    if (length(paths) > 1L) {
      for (p2 in paths[-1L]) {
        r2 <- jsonlite::fromJSON(p2, simplifyVector = FALSE)
        f2 <- t_detect_format(r2)
        n2 <- if (f2 == "bravo") t_bravo_to_percept(r2, basename(p2)) else r2
        mg <- t_merge_normalized(norm, n2, basename(p2))
        norm <- mg$norm
        sources[[length(sources) + 1L]] <- list(name = basename(p2), size = t_human_size(file.info(p2)$size), added = mg$summary)
      }
      rep <- titra_inspect_json(norm, name = paste(vapply(sources, `[[`, character(1), "name"), collapse = " + "), size_bytes = size_bytes)
      rep$sources <- t_list(sources)
    }
  } else {
    name <- name %||% "upload.json"
    rep <- titra_inspect_json(source, name = name, size_bytes = size_bytes)
    if (!isTRUE(rep$ok)) {
      return(list(ok = FALSE, report = rep, payload = t_obj(), selection = titra_default_selection()))
    }
    norm <- if (rep$format == "bravo") t_bravo_to_percept(source, name) else source
    sources <- list(list(name = name, size = t_human_size(size_bytes), added = "initial file"))
  }

  parsed <- titra_parse_percept(norm, file_name = name, ftg_half_bw = ftg_half_bw)
  sel <- titra_default_selection(parsed$payload)
  list(
    ok = TRUE,
    payload = parsed$payload,
    selection = sel,
    report = rep,
    norm = norm,
    sources = sources
  )
}
