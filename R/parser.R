# Medtronic Percept JSON Parser & Selection Engine for titraR (1:1 mirror of nr_parser.py)

t_extract_leads <- function(raw) {
  leads <- list()
  lc <- raw$LeadConfiguration$Final %||% raw$LeadConfiguration$Initial %||% list()
  if (is.data.frame(lc)) {
    lc <- lapply(seq_len(nrow(lc)), function(i) as.list(lc[i, , drop = FALSE]))
  }
  for (it in lc) {
    if (!is.list(it)) next
    hemi_raw <- t_strip_enum(it$Hemisphere %||% "")
    hemi <- if (grepl("left", hemi_raw, ignore.case = TRUE)) "Left" else if (grepl("right", hemi_raw, ignore.case = TRUE)) "Right" else ""
    if (!nzchar(hemi)) next
    model <- t_strip_enum(it$Model %||% "SenSight")
    directional <- grepl("B33005|B33015|SenSight|Directional", model, ignore.case = TRUE) &&
                   !grepl("4-ring|3387|3389|RingOnly", model, ignore.case = TRUE)
    target <- t_str(it$LeadLocation %||% it$Target %||% "STN")
    target <- sub("^.*\\.", "", target)
    contacts <- if (directional) c("0", "1a", "1b", "1c", "2a", "2b", "2c", "3") else c("0", "1", "2", "3")
    leads[[hemi]] <- list(
      hemisphere = hemi,
      model = model,
      directional = directional,
      target = target,
      electrode_ports = t_str(it$ElectrodePorts %||% ""),
      tip_offset = t_str(it$TipOffset %||% ""),
      orientation_deg = t_num(it$Orientation %||% 0.0),
      contacts = t_arr(contacts)
    )
  }
  t_obj(leads)
}

t_extract_groups <- function(raw) {
  out <- list()
  for (stage in c("Final", "Initial")) {
    grps <- raw$Groups[[stage]]
    if (is.null(grps) || !length(grps)) next
    if (is.data.frame(grps)) grps <- lapply(seq_len(nrow(grps)), function(i) as.list(grps[i, , drop = FALSE]))
    for (g in grps) {
      if (!is.list(g)) next
      gid <- t_strip_enum(g$GroupId %||% "")
      if (!nzchar(gid)) next
      active <- isTRUE(g$ActiveGroup)
      ps <- g$ProgramSettings %||% list()
      hemis <- list()
      rates <- numeric(0)

      parse_hemi_prog <- function(p, hemi_label) {
        if (!is.list(p) || !length(p)) return(NULL)
        rate <- t_num(p$RateInHertz %||% 0)
        if (rate > 0) rates <<- c(rates, rate)
        progs <- p$Programs %||% list()
        if (is.data.frame(progs)) progs <- lapply(seq_len(nrow(progs)), function(i) as.list(progs[i, , drop = FALSE]))
        pw <- 60.0; amp <- 0.0; elecs <- list()
        if (length(progs) >= 1L && is.list(progs[[1]])) {
          p1 <- progs[[1]]
          pw <- t_num(p1$PulseWidthInMicroSecond %||% 60.0)
          amp <- t_num(p1$AmplitudeInMilliAmps %||% 0.0)
          es <- p1$ElectrodeState %||% list()
          if (is.data.frame(es)) es <- lapply(seq_len(nrow(es)), function(i) as.list(es[i, , drop = FALSE]))
          for (e in es) {
            if (!is.list(e)) next
            el_name <- t_normalize_electrode(e$Electrode %||% "")
            pol <- t_strip_enum(e$ElectrodeStateResult %||% e$Polarity %||% "")
            if (nzchar(el_name)) elecs[[length(elecs) + 1L]] <- list(electrode = el_name, polarity = pol)
          }
        }
        sc <- p$SensingChannel %||% list()
        if (is.data.frame(sc)) sc <- lapply(seq_len(nrow(sc)), function(i) as.list(sc[i, , drop = FALSE]))
        sense_pair <- ""; tracked_f <- 0.0; lower_ma <- 0.0; upper_ma <- 0.0
        if (length(sc) >= 1L && is.list(sc[[1]])) {
          s1 <- sc[[1]]
          pp <- t_parse_pair_string(s1$Channel %||% "")
          sense_pair <- pp$pair
          tracked_f <- t_num(s1$SensingSetup$FrequencyInHertz %||% 0.0)
          lower_ma <- t_num(s1$LowerLimitInMilliAmps %||% 0.0)
          upper_ma <- t_num(s1$UpperLimitInMilliAmps %||% 0.0)
        }
        list(
          hemisphere = hemi_label,
          rate_hz = round(rate, 1),
          ftg_center_hz = round(if (rate > 0) rate / 2.0 else 72.5, 1),
          pw_us = round(pw, 1),
          lower_ma = round(lower_ma, 2),
          upper_ma = round(upper_ma, 2),
          total_ma = round(amp, 2),
          sensing_pair = sense_pair,
          tracked_freq_hz = round(tracked_f, 2),
          electrodes = t_list(elecs)
        )
      }

      if (!is.null(ps$SensingChannel) || !is.null(ps$LeftHemisphere) || !is.null(ps$RightHemisphere)) {
        lh <- parse_hemi_prog(ps$LeftHemisphere, "Left")
        rh <- parse_hemi_prog(ps$RightHemisphere, "Right")
        if (!is.null(lh)) hemis[["Left"]] <- lh
        if (!is.null(rh)) hemis[["Right"]] <- rh
      }
      rate_hz <- if (length(rates)) rates[1] else 145.0
      out[[length(out) + 1L]] <- list(
        id = paste0(stage, "_", gid),
        stage = stage,
        group_id = gid,
        active = active,
        rate_hz = round(rate_hz, 1),
        ftg_center_hz = round(rate_hz / 2.0, 1),
        hemispheres = t_obj(hemis)
      )
    }
  }
  t_list(out)
}

t_extract_impedances <- function(raw) {
  imp_res <- list(
    Left = list(monopolar = t_obj(), bipolar = list()),
    Right = list(monopolar = t_obj(), bipolar = list())
  )
  imp_raw <- raw$Impedance
  imp_list <- list()
  if (is.list(imp_raw) && !is.null(imp_raw$Hemisphere)) {
    imp_list <- imp_raw$Hemisphere
  } else if (is.list(imp_raw) && length(imp_raw) > 0L) {
    last_sess <- imp_raw[[length(imp_raw)]]
    if (is.list(last_sess) && !is.null(last_sess$Hemisphere)) imp_list <- last_sess$Hemisphere
  }
  if (is.data.frame(imp_list)) imp_list <- lapply(seq_len(nrow(imp_list)), function(i) as.list(imp_list[i, , drop = FALSE]))
  for (h_obj in imp_list) {
    if (!is.list(h_obj)) next
    hs <- t_strip_enum(h_obj$Hemisphere %||% "")
    hemi <- if (grepl("left", hs, ignore.case = TRUE)) "Left" else if (grepl("right", hs, ignore.case = TRUE)) "Right" else ""
    if (!nzchar(hemi)) next
    sess <- h_obj$SessionImpedance %||% list()
    mono <- list()
    ms <- sess$Monopolar %||% list()
    if (is.data.frame(ms)) ms <- lapply(seq_len(nrow(ms)), function(i) as.list(ms[i, , drop = FALSE]))
    for (m in ms) {
      if (!is.list(m)) next
      e1 <- t_normalize_electrode(m$Electrode1 %||% "")
      e2 <- t_normalize_electrode(m$Electrode2 %||% "")
      c_name <- if (e1 == "Case") e2 else e1
      ohm <- as.integer(round(t_num(m$ResultValue, NA)))
      if (nzchar(c_name) && !is.na(ohm)) mono[[c_name]] <- ohm
    }
    bip <- list()
    bs <- sess$Bipolar %||% list()
    if (is.data.frame(bs)) bs <- lapply(seq_len(nrow(bs)), function(i) as.list(bs[i, , drop = FALSE]))
    for (b in bs) {
      if (!is.list(b)) next
      e1 <- t_normalize_electrode(b$Electrode1 %||% "")
      e2 <- t_normalize_electrode(b$Electrode2 %||% "")
      ohm <- as.integer(round(t_num(b$ResultValue, NA)))
      if (nzchar(e1) && nzchar(e2) && !is.na(ohm)) {
        bip[[length(bip) + 1L]] <- list(e1 = e1, e2 = e2, pair = paste0(e1, "-", e2), ohm = ohm)
      }
    }
    imp_res[[hemi]] <- list(monopolar = t_obj(mono), bipolar = t_list(bip))
  }
  # Drop hemispheres with no impedance values
  keep <- vapply(names(imp_res), function(h) length(imp_res[[h]]$monopolar) > 0L || length(imp_res[[h]]$bipolar) > 0L, logical(1))
  t_obj(imp_res[keep])
}

t_extract_montage <- function(raw, default_stim_hz = 145.0, ftg_half_bw = TITRA_DEFAULT_FTG_HW, leads = list()) {
  lm <- raw$LFPMontage %||% list()
  if (is.data.frame(lm)) lm <- lapply(seq_len(nrow(lm)), function(i) as.list(lm[i, , drop = FALSE]))
  out <- list()
  ftg_c <- default_stim_hz / 2.0
  ftg_b <- c(max(35.0, ftg_c - ftg_half_bw), min(120.0, ftg_c + ftg_half_bw))
  for (i in seq_along(lm)) {
    m <- lm[[i]]
    if (!is.list(m)) next
    pp <- t_parse_pair_string(m$SensingElectrodes %||% "")
    hemi <- pp$hemi
    if (!nzchar(hemi)) {
      hs <- t_strip_enum(m$Hemisphere %||% "")
      hemi <- if (grepl("left", hs, ignore.case = TRUE)) "Left" else if (grepl("right", hs, ignore.case = TRUE)) "Right" else "Left"
    }
    freqs <- as.numeric(m$LFPFrequency %||% numeric(0))
    mags <- as.numeric(m$LFPMagnitude %||% numeric(0))
    if (!length(freqs) || length(freqs) != length(mags)) next
    keep <- which(freqs <= 120.5)
    freqs <- freqs[keep]; mags <- mags[keep]
    power <- pmax(mags^2, 1e-12)
    bstats <- t_band_metrics(freqs, power, TITRA_BETA_BAND, ftg_b)
    dir_flag <- if (!is.null(leads[[hemi]])) isTRUE(leads[[hemi]]$directional) else TRUE
    contacts <- t_contacts_for_pair(pp$e1, pp$e2, directional = dir_flag)
    is_seg <- grepl("[abc]", pp$pair)
    out[[length(out) + 1L]] <- list(
      id = paste0(hemi, ":", pp$pair),
      hemisphere = hemi,
      e1 = pp$e1,
      e2 = pp$e2,
      pair = pp$pair,
      contacts = t_arr(contacts),
      kind = if (is_seg) "segment" else "ring",
      peak_hz = round(t_num(m$PeakFrequencyInHertz, bstats$beta_peak_hz), 2),
      peak_uv = round(t_num(m$PeakMagnitudeInMicroVolt, max(mags)), 3),
      artifact = t_strip_enum(m$ArtifactStatus %||% "None"),
      freqs = t_arr(t_round_vec(freqs, 2)),
      mag_uv = t_arr(t_round_vec(mags, 3)),
      band_stats = bstats
    )
  }
  t_list(out)
}

t_extract_trends <- function(raw) {
  dd <- raw$DiagnosticData$LFPTrendLogs %||% list()
  out <- list()
  for (nm in names(dd)) {
    hemi <- if (grepl("left", nm, ignore.case = TRUE)) "Left" else if (grepl("right", nm, ignore.case = TRUE)) "Right" else nm
    day_list <- dd[[nm]]
    if (!is.list(day_list)) next
    ts_all <- character(0); lfp_all <- numeric(0); ma_all <- numeric(0); dt_all <- character(0)
    for (day_key in names(day_list)) {
      entries <- day_list[[day_key]]
      if (is.data.frame(entries)) entries <- lapply(seq_len(nrow(entries)), function(i) as.list(entries[i, , drop = FALSE]))
      if (!is.list(entries)) next
      for (e in entries) {
        if (!is.list(e)) next
        dstr <- t_str(e$DateTime %||% "")
        if (!nzchar(dstr)) next
        ts_all <- c(ts_all, dstr)
        dt_all <- c(dt_all, substr(dstr, 1, 10))
        lfp_all <- c(lfp_all, t_num(e$LFP, NA))
        ma_all <- c(ma_all, t_num(e$AmplitudeInMilliAmps, 0.0))
      }
    }
    ok <- is.finite(lfp_all)
    if (!any(ok)) next
    ts_all <- ts_all[ok]; dt_all <- dt_all[ok]; lfp_all <- lfp_all[ok]; ma_all <- ma_all[ok]
    ord <- order(ts_all)
    ts_all <- ts_all[ord]; dt_all <- dt_all[ord]; lfp_all <- lfp_all[ord]; ma_all <- ma_all[ord]
    n_tot <- length(ts_all)
    n_days <- length(unique(dt_all))
    if (n_tot > 260L) {
      idx <- unique(round(seq(1, n_tot, length.out = 260L)))
      ts_all <- ts_all[idx]; dt_all <- dt_all[idx]; lfp_all <- lfp_all[idx]; ma_all <- ma_all[idx]
    }
    out[[hemi]] <- list(
      hemisphere = hemi,
      n_days = as.integer(n_days),
      n_total_points = as.integer(n_tot),
      dates = t_arr(dt_all),
      timestamps = t_arr(ts_all),
      lfp = t_arr(t_round_vec(lfp_all, 2)),
      ma = t_arr(t_round_vec(ma_all, 2))
    )
  }
  t_obj(out)
}

t_extract_json_sections <- function(raw) {
  out <- list()
  for (k in names(raw)) {
    v <- raw[[k]]
    if (is.list(v) && !is.null(names(v))) {
      ch <- lapply(head(names(v), 8L), function(ck) {
        cv <- v[[ck]]
        val_s <- if (is.atomic(cv) && length(cv) == 1L) t_str(cv) else if (is.list(cv)) sprintf("%d items", length(cv)) else typeof(cv)
        list(path = paste0(k, ".", ck), key = ck, value = val_s)
      })
      out[[length(out) + 1L]] <- list(
        path = k, key = k, type = "object", count = as.integer(length(v)),
        value = sprintf("object (%d keys)", length(v)), children = t_list(ch)
      )
    } else if (is.list(v) || length(v) > 1L) {
      out[[length(out) + 1L]] <- list(
        path = k, key = k, type = "array", count = as.integer(length(v)),
        value = sprintf("array (%d items)", length(v)), children = list()
      )
    } else {
      out[[length(out) + 1L]] <- list(
        path = k, key = k, type = typeof(v), count = 1L,
        value = t_str(v), children = list()
      )
    }
  }
  t_list(out)
}

#' Parse a Medtronic Percept JSON object into the Titra widget analytical payload
#'
#' @param raw Parsed R list from [jsonlite::fromJSON()] (`simplifyVector = FALSE` recommended).
#' @param file_name Display file name.
#' @param ftg_half_bw Default FTG half-bandwidth in Hz (default `4.0`).
#' @return A list with `payload` (ready for `nr_dag.js`) and internal `raw_signals`.
#' @export
titra_parse_percept <- function(raw, file_name = "session.json", ftg_half_bw = TITRA_DEFAULT_FTG_HW) {
  dev_info <- raw$DeviceInformation$Final %||% raw$DeviceInformation$Initial %||% list()
  pat_info <- raw$PatientInformation$Final %||% raw$PatientInformation$Initial %||% list()
  leads <- t_extract_leads(raw)
  groups <- t_extract_groups(raw)
  impedances <- t_extract_impedances(raw)

  # Collect BrainSenseLfp metadata blocks (stim amplitude time-courses + rates)
  bs_lfp <- raw$BrainSenseLfp %||% list()
  if (is.data.frame(bs_lfp)) bs_lfp <- lapply(seq_len(nrow(bs_lfp)), function(i) as.list(bs_lfp[i, , drop = FALSE]))
  lfp_meta <- list()
  for (blk in bs_lfp) {
    if (!is.list(blk)) next
    t0 <- t_parse_iso_seconds(blk$FirstPacketDateTime %||% "")
    ch_str <- t_str(blk$Channel %||% "")
    sr_l <- t_num(blk$TherapySnapshot$Left$RateInHertz %||% blk$TherapySnapshot$Left$Frequency %||% 0)
    sr_r <- t_num(blk$TherapySnapshot$Right$RateInHertz %||% blk$TherapySnapshot$Right$Frequency %||% 0)
    sr <- if (sr_l > 0) sr_l else sr_r
    extract_cathodes <- function(es) {
      if (is.null(es) || !length(es)) return(character(0))
      out_c <- character(0)
      for (e in es) {
        if (!is.list(e)) next
        if (grepl("negative", t_str(e$ElectrodeStateResult %||% e$Polarity), ignore.case = TRUE)) {
          cn <- t_normalize_electrode(e$Electrode %||% "")
          if (nzchar(cn) && cn != "Case") out_c <- c(out_c, cn)
        }
      }
      unique(out_c)
    }
    lfp_data <- blk$LfpData %||% list()
    if (is.data.frame(lfp_data)) lfp_data <- lapply(seq_len(nrow(lfp_data)), function(i) as.list(lfp_data[i, , drop = FALSE]))
    lt <- numeric(0); lm_l <- numeric(0); lm_r <- numeric(0)
    if (length(lfp_data)) {
      ticks <- vapply(lfp_data, function(d) t_num(d$TicksInMs, NA), numeric(1))
      if (any(is.finite(ticks))) {
        t_base <- ticks[which(is.finite(ticks))[1]]
        lt <- (ticks - t_base) / 1000.0
      } else {
        lt <- (seq_along(lfp_data) - 1L) * 0.5
      }
      lm_l <- vapply(lfp_data, function(d) t_num(d$Left$mA, NA), numeric(1))
      lm_r <- vapply(lfp_data, function(d) t_num(d$Right$mA, NA), numeric(1))
    }
    lfp_meta[[length(lfp_meta) + 1L]] <- list(
      t0 = t0, channel = ch_str,
      rate_left = if (sr_l > 0) sr_l else sr,
      rate_right = if (sr_r > 0) sr_r else sr,
      pw_left = t_num(blk$TherapySnapshot$Left$PulseWidthInMicroSecond %||% blk$TherapySnapshot$Left$PulseWidth %||% 60),
      pw_right = t_num(blk$TherapySnapshot$Right$PulseWidthInMicroSecond %||% blk$TherapySnapshot$Right$PulseWidth %||% 60),
      stim_c_left = extract_cathodes(blk$TherapySnapshot$Left$ElectrodeState),
      stim_c_right = extract_cathodes(blk$TherapySnapshot$Right$ElectrodeState),
      t = lt, ma_left = lm_l, ma_right = lm_r
    )
  }

  # Parse BrainSenseTimeDomain and LfpMontageTimeDomain recordings
  recordings <- list()
  raw_signals <- list()
  stim_rates_seen <- numeric(0)
  rec_counter <- 0L

  add_td_list <- function(td_list, source_name) {
    if (is.null(td_list) || !length(td_list)) return()
    if (is.data.frame(td_list)) td_list <- lapply(seq_len(nrow(td_list)), function(i) as.list(td_list[i, , drop = FALSE]))
    for (td in td_list) {
      if (!is.list(td)) next
      raw_x <- unlist(td$TimeDomainData %||% numeric(0), use.names = FALSE)
      if (length(raw_x) < 32L) next
      fs <- t_num(td$SampleRateInHz %||% 250.0, 250.0)
      pp <- t_parse_pair_string(td$Channel %||% "")
      hemi <- pp$hemi
      if (!nzchar(hemi)) {
        hemi <- if (grepl("right", t_str(td$Channel), ignore.case = TRUE)) "Right" else "Left"
      }
      dt_str <- t_str(td$FirstPacketDateTime %||% "")
      t0 <- t_parse_iso_seconds(dt_str)

      # Match closest BrainSenseLfp block (within 10s) for amplitude curve & stim rate
      amp_t <- NULL; amp_ma <- NULL
      stim_rate <- t_num(td$StimRateInHz %||% 0)
      pw_us <- t_num(td$PulseWidthInMicroSecond %||% 60)
      stim_contacts <- character(0)

      if (!is.null(td$.amp_t) && !is.null(td$.amp_ma)) {
        amp_t <- as.numeric(td$.amp_t)
        amp_ma <- as.numeric(td$.amp_ma)
      } else if (source_name == "BrainSenseTimeDomain" && length(lfp_meta)) {
        best_i <- NA_integer_; best_dt <- Inf
        for (mi in seq_along(lfp_meta)) {
          dt_diff <- abs(lfp_meta[[mi]]$t0 - t0)
          if (dt_diff < best_dt) { best_dt <- dt_diff; best_i <- mi }
        }
        if (!is.na(best_i) && best_dt <= 12.0) {
          bm <- lfp_meta[[best_i]]
          if (hemi == "Left") {
            if (stim_rate <= 0) stim_rate <- bm$rate_left
            pw_us <- bm$pw_left
            if (length(bm$stim_c_left)) stim_contacts <- bm$stim_c_left
            if (any(is.finite(bm$ma_left))) { amp_t <- bm$t; amp_ma <- bm$ma_left }
          } else {
            if (stim_rate <= 0) stim_rate <- bm$rate_right
            pw_us <- bm$pw_right
            if (length(bm$stim_c_right)) stim_contacts <- bm$stim_c_right
            if (any(is.finite(bm$ma_right))) { amp_t <- bm$t; amp_ma <- bm$ma_right }
          }
        }
      }
      if (stim_rate <= 0) {
        # Fallback to active group rate or 145 Hz
        act_g <- Filter(function(g) isTRUE(g$active), groups)
        stim_rate <- if (length(act_g)) act_g[[1]]$rate_hz else 145.0
      }
      stim_rates_seen <<- c(stim_rates_seen, stim_rate)

      an <- t_analyze_time_domain(raw_x, fs, stim_rate, ftg_half_bw = ftg_half_bw, amp_t = amp_t, amp_ma = amp_ma)
      if (is.null(an)) next

      rec_counter <<- rec_counter + 1L
      rid <- sprintf("%s_%02d", if (source_name == "BrainSenseTimeDomain") "bs" else "mnt", rec_counter)
      dir_flag <- if (!is.null(leads[[hemi]])) isTRUE(leads[[hemi]]$directional) else TRUE
      contacts <- t_contacts_for_pair(pp$e1, pp$e2, directional = dir_flag)
      if (!is.null(td$.stim_contacts)) {
        stim_contacts <- as.character(td$.stim_contacts)
      }
      amp_rng <- if (!is.null(amp_ma) && any(is.finite(amp_ma))) {
        sprintf("%.1f–%.1f mA", min(amp_ma, na.rm = TRUE), max(amp_ma, na.rm = TRUE))
      } else {
        "0 mA"
      }
      lbl <- sprintf("%s %s · %g Hz (%s)", hemi, pp$pair, round(stim_rate, 1), amp_rng)

      raw_signals[[rid]] <<- list(
        x = an$.raw_x, fs = fs, amp_t = an$.amp_t, amp_ma = an$.amp_ma,
        hemisphere = hemi, pair = pp$pair, contacts = unique(c(contacts, stim_contacts)),
        stim_rate_hz = stim_rate, source = source_name, beta_peak_hz = an$band_stats$beta_peak_hz
      )
      an$.raw_x <- NULL; an$.amp_t <- NULL; an$.amp_ma <- NULL

      rec_obj <- c(list(
        id = rid,
        source = source_name,
        label = lbl,
        hemisphere = hemi,
        e1 = pp$e1,
        e2 = pp$e2,
        pair = pp$pair,
        contacts = t_arr(contacts),
        stim_contacts = t_arr(stim_contacts),
        datetime = dt_str,
        stim_rate_hz = round(stim_rate, 1),
        pw_us = round(pw_us, 1),
        tracked_freq_hz = 0.0,
        adaptive_status = "Off",
        amp_range_ma = amp_rng,
        origin = t_str(td$.origin %||% file_name)
      ), an)
      recordings[[length(recordings) + 1L]] <<- rec_obj
    }
  }

  add_td_list(raw$BrainSenseTimeDomain, "BrainSenseTimeDomain")
  add_td_list(raw$LfpMontageTimeDomain, "LfpMontageTimeDomain")

  # Ensure leads exist for any hemisphere observed in recordings
  for (r in recordings) {
    if (is.null(leads[[r$hemisphere]])) {
      is_dir <- any(grepl("[abc]", unlist(r$contacts)))
      leads[[r$hemisphere]] <- list(
        hemisphere = r$hemisphere,
        model = if (is_dir) "SenSight B33005" else "4-ring DBS lead",
        directional = is_dir,
        target = t_str(raw$.target %||% "STN"),
        electrode_ports = "",
        tip_offset = "",
        orientation_deg = 0.0,
        contacts = t_arr(if (is_dir) c("0", "1a", "1b", "1c", "2a", "2b", "2c", "3") else c("0", "1", "2", "3"))
      )
    }
  }

  uniq_rates <- sort(unique(round(stim_rates_seen[stim_rates_seen > 0], 1)))
  if (!length(uniq_rates)) uniq_rates <- 145.0
  default_rate <- uniq_rates[1]

  montage <- t_extract_montage(raw, default_stim_hz = default_rate, ftg_half_bw = ftg_half_bw, leads = leads)
  trends <- t_extract_trends(raw)
  json_sections <- t_extract_json_sections(raw)

  # Quantitative suites (Game Theory, Tail Risk, Option Pricing, Graph Signal Processing)
  gt_bundle <- t_build_game_theory(raw_signals, ftg_half_bw = ftg_half_bw)
  risk_bundle <- t_build_risk(raw_signals, ftg_half_bw = ftg_half_bw)
  opt_bundle <- t_build_options(raw_signals, ftg_half_bw = ftg_half_bw)
  weave_bundle <- t_build_weave(raw_signals, ftg_half_bw = ftg_half_bw)

  payload <- list(
    metadata = list(
      file_name = file_name,
      data_version = t_str(raw$FileVersion %||% "2.0"),
      session_date = t_str(raw$SessionDate %||% ""),
      session_end_date = t_str(raw$SessionEndDate %||% ""),
      timezone = t_str(raw$Timezone %||% "UTC"),
      programmer_version = t_str(raw$ProgrammerVersion %||% ""),
      diagnosis = t_str(pat_info$Diagnosis %||% ""),
      patient_gender = t_str(pat_info$PatientGender %||% ""),
      patient_label = t_str(pat_info$PatientId %||% raw$ParticipantId %||% "De-identified"),
      device_name = t_str(dev_info$Neurostimulator %||% raw$.device_name %||% "Percept"),
      device_model = t_str(dev_info$NeurostimulatorModel %||% ""),
      device_location = t_str(dev_info$NeurostimulatorLocation %||% "")
    ),
    config = list(
      beta_band = t_arr(TITRA_BETA_BAND),
      ftg_half_bw_hz = round(ftg_half_bw, 2),
      default_stim_rate_hz = round(default_rate, 1),
      stim_rates_available = t_arr(uniq_rates)
    ),
    leads = t_obj(leads),
    groups = groups,
    impedances = impedances,
    montage = montage,
    recordings = t_list(recordings),
    trends = trends,
    event_summary = list(),
    json_sections = json_sections,
    game_theory = gt_bundle,
    risk = risk_bundle,
    options = opt_bundle,
    weave = weave_bundle
  )

  list(payload = payload, raw_signals = raw_signals)
}

t_all_contacts_with_data <- function(payload) {
  out <- character(0)
  for (r in payload$recordings %||% list()) {
    h <- r$hemisphere %||% "Left"
    cs <- unique(c(as.character(r$contacts), as.character(r$stim_contacts)))
    out <- c(out, paste0(h, ":", cs))
  }
  for (m in payload$montage %||% list()) {
    h <- m$hemisphere %||% "Left"
    out <- c(out, paste0(h, ":", as.character(m$contacts)))
  }
  out <- unique(out)
  if (!length(out)) return(character(0))
  ord <- order(ifelse(startsWith(out, "Left:"), 0L, 1L),
               match(sub("^[^:]+:", "", out), TITRA_CONTACTS_ORDER, nomatch = 99L))
  out[ord]
}

#' Build default interactive selection state for a Titra payload
#'
#' @param payload Parsed Titra payload list (or empty list).
#' @return Named list matching the `selection` traitlet of `nr_dag.js`.
#' @export
titra_default_selection <- function(payload = list()) {
  recs <- payload$recordings %||% list()
  first_stream <- NULL
  for (r in recs) {
    if (identical(r$source, "BrainSenseTimeDomain")) { first_stream <- r; break }
  }
  first_rec <- first_stream %||% if (length(recs)) recs[[1]] else NULL
  hemi <- if (!is.null(first_rec)) first_rec$hemisphere else "Left"
  all_contacts <- t_all_contacts_with_data(payload)
  all_pairs <- vapply(payload$montage %||% list(), function(m) t_str(m$id), character(1))
  all_rec_ids <- vapply(recs, function(r) t_str(r$id), character(1))
  stim_rate <- if (!is.null(first_rec) && t_num(first_rec$stim_rate_hz) > 0) {
    first_rec$stim_rate_hz
  } else {
    t_num(payload$config$default_stim_rate_hz, 145.0)
  }

  list(
    hemisphere = hemi,
    contacts = t_arr(all_contacts),
    pairs = t_arr(all_pairs),
    recordings = t_arr(all_rec_ids),
    selected_nodes = t_arr("input_main"),
    selected_band = "both",
    stim_rate_hz = round(stim_rate, 1),
    ftg_half_bw_hz = t_num(payload$config$ftg_half_bw_hz, TITRA_DEFAULT_FTG_HW),
    freq_window_hz = NULL,
    time_window_s = NULL,
    json_paths = t_arr(c("DeviceInformation.Final", "LeadConfiguration.Final")),
    gt_params = list(
      hemisphere = hemi, stim_rate_filter = "ALL",
      wb = 1.0, wf = 0.6, we = 0.5, tau = 2.0, ftg_safe = 4.0,
      algo = "thompson", budget = 60L
    ),
    gt_selected_arms = list(),
    gt_bandit_live = t_obj(),
    risk_params = list(
      hemisphere = hemi, stim_rate_filter = "ALL",
      target = "beta", alpha = 0.99, horizon = 60.0,
      kappa = 0.6, eps = 0.10, metric = "CVaR"
    ),
    risk_selected_arms = list(),
    opt_params = list(
      hemisphere = hemi, stim_rate_filter = "ALL",
      strategy = "call", T = 0.25, k_burst_mult = 1.0,
      k_low = 0.5, k_set = 0.7, wing = 0.25,
      w_ftg = 0.5, w_energy = 0.02, steps = 10L
    ),
    opt_selected_arms = list(),
    gsp_params = list(
      hemisphere = hemi, stim_rate_filter = "ALL",
      sigma = 2.0, series_id = "", phase_band = "ftg",
      node_size_metric = "local_ftg"
    ),
    gsp_selected_node_idx = NULL
  )
}
