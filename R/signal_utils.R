# Pure-R Digital Signal Processing Engine for Titra (Welch PSD, STFT, FFT-Hilbert, Envelopes)

t_hann <- function(n) {
  if (n <= 1L) return(rep(1.0, max(1L, n)))
  0.5 - 0.5 * cos(2 * pi * seq(0, n - 1L) / (n - 1L))
}

t_welch_psd <- function(x, fs = 250.0, nperseg = 512L, noverlap = NULL) {
  x <- as.numeric(x)
  x[!is.finite(x)] <- 0.0
  n <- length(x)
  if (n < 16L) {
    f <- seq(0, fs / 2, length.out = 16L)
    return(list(freqs = f, power = rep(1e-12, length(f)), db = rep(-120.0, length(f))))
  }
  nseg <- min(as.integer(nperseg), n)
  if (nseg < 16L) nseg <- n
  ov <- if (is.null(noverlap)) as.integer(floor(nseg / 2)) else min(as.integer(noverlap), nseg - 1L)
  hop <- max(1L, nseg - ov)
  w <- t_hann(nseg)
  w_norm <- sum(w^2)
  n_half <- as.integer(floor(nseg / 2L)) + 1L
  freqs <- seq(0, n_half - 1L) * (fs / nseg)

  starts <- seq(1L, max(1L, n - nseg + 1L), by = hop)
  acc <- numeric(n_half)
  for (s in starts) {
    seg <- x[s:(s + nseg - 1L)]
    seg <- (seg - mean(seg)) * w
    spec <- stats::fft(seg)[seq_len(n_half)]
    p <- (Mod(spec)^2) / (fs * w_norm)
    if (n_half > 2L) p[2:(n_half - 1L)] <- p[2:(n_half - 1L)] * 2.0
    acc <- acc + p
  }
  power <- pmax(acc / length(starts), 1e-12)
  list(freqs = freqs, power = power, db = 10.0 * log10(power))
}

t_band_metrics <- function(freqs, power, beta_band = TITRA_BETA_BAND, ftg_band = c(68.5, 76.5)) {
  freqs <- as.numeric(freqs)
  power <- pmax(as.numeric(power), 1e-12)
  if (!length(freqs)) {
    return(list(
      beta_power = 0, beta_db = -120, beta_peak_hz = 20, beta_peak_power = 0, beta_rel = 0,
      ftg_power = 0, ftg_db = -120, ftg_peak_hz = mean(ftg_band), ftg_peak_power = 0, ftg_rel = 0,
      ftg_beta_ratio = 0, ftg_beta_db_diff = 0
    ))
  }
  tot_mask <- freqs >= 4.0 & freqs <= 100.0
  tot_p <- max(mean(power[tot_mask]), 1e-12)

  b_mask <- freqs >= beta_band[1] & freqs <= beta_band[2]
  if (!any(b_mask)) b_mask[which.min(abs(freqs - mean(beta_band)))] <- TRUE
  b_p <- mean(power[b_mask])
  b_idx <- which(b_mask)[which.max(power[b_mask])]

  f_mask <- freqs >= ftg_band[1] & freqs <= ftg_band[2]
  if (!any(f_mask)) f_mask[which.min(abs(freqs - mean(ftg_band)))] <- TRUE
  f_p <- mean(power[f_mask])
  f_idx <- which(f_mask)[which.max(power[f_mask])]

  # Neighbor flank normalization for FTG_dB (matching nr_parser.py / nr_dag.js)
  lo <- ftg_band[1]; hi <- ftg_band[2]
  n_mask <- (freqs >= max(32.0, lo - 4.5) & freqs <= max(32.0, lo - 1.0)) |
            (freqs >= min(120.0, hi + 1.0) & freqs <= min(120.0, hi + 4.5))
  n_med <- if (any(n_mask)) max(stats::median(power[n_mask]), 1e-12) else tot_p

  b_db <- 10.0 * log10(max(b_p, 1e-12))
  f_db <- 10.0 * log10(max(f_p, 1e-12))
  f_rel_db <- 10.0 * log10(max(f_p, 1e-12) / n_med)

  list(
    beta_power = round(b_p, 5),
    beta_db = round(b_db, 3),
    beta_peak_hz = round(freqs[b_idx], 2),
    beta_peak_power = round(power[b_idx], 5),
    beta_rel = round(b_p / tot_p, 4),
    ftg_power = round(f_p, 5),
    ftg_db = round(f_db, 3),
    ftg_rel_db = round(f_rel_db, 3),
    ftg_peak_hz = round(freqs[f_idx], 2),
    ftg_peak_power = round(power[f_idx], 5),
    ftg_rel = round(f_p / tot_p, 4),
    ftg_beta_ratio = round(f_p / max(b_p, 1e-12), 4),
    ftg_beta_db_diff = round(f_db - b_db, 3)
  )
}

# Zero-phase smooth FFT bandpass + analytic Hilbert signal (fast, pure base R)
t_bandpass_analytic <- function(x, fs, flo, fhi) {
  x <- as.numeric(x)
  x[!is.finite(x)] <- 0.0
  n <- length(x)
  if (n < 16L) return(complex(real = x, imaginary = rep(0, n)))
  xc <- x - mean(x)
  X <- stats::fft(xc)
  k <- seq(0, n - 1L)
  freqs <- ifelse(k <= n / 2, k * fs / n, (k - n) * fs / n)
  af <- abs(freqs)

  # Smooth raised-cosine bandpass mask on positive frequencies only -> analytic signal (2x pos freqs)
  bw_taper <- max(1.0, (fhi - flo) * 0.12)
  lo_edge <- pmin(pmax((af - (flo - bw_taper)) / bw_taper, 0.0), 1.0)
  hi_edge <- pmin(pmax(((fhi + bw_taper) - af) / bw_taper, 0.0), 1.0)
  bp <- 0.5 * (1 - cos(pi * lo_edge)) * 0.5 * (1 - cos(pi * hi_edge))

  h <- numeric(n)
  pos <- freqs > 0 & freqs < (fs / 2)
  h[pos] <- 2.0 * bp[pos]
  if (n %% 2L == 0L) {
    nyq <- which(k == n / 2L)
    h[nyq] <- bp[nyq]
  }
  stats::fft(X * h, inverse = TRUE) / n
}

t_phase_portrait <- function(x, fs, band, n_pts = 200L) {
  z <- t_bandpass_analytic(x, fs, band[1], band[2])
  n <- length(z)
  if (n < 20L) {
    return(list(
      re = t_arr(rep(0, 10)), im = t_arr(rep(0, 10)),
      rms = 0, burst_thr = 0, scale = 1, burst_pct = 0, roundness = 0, inst_hz = mean(band)
    ))
  }
  amp <- Mod(z)
  rms <- sqrt(mean(Re(z)^2))
  burst_thr <- 1.25 * rms
  burst_pct <- 100.0 * mean(amp > burst_thr)
  scale_v <- max(as.numeric(stats::quantile(amp, 0.96, names = FALSE)), rms * 1.5, 1e-6)

  # Select a representative high-energy 2.5s snippet for the phase loop
  snip_n <- min(n, max(64L, as.integer(round(2.5 * fs))))
  if (n > snip_n) {
    # Pick window near peak burst energy
    mid <- which.max(amp)
    i0 <- max(1L, min(n - snip_n + 1L, mid - as.integer(snip_n / 2L)))
    zs <- z[i0:(i0 + snip_n - 1L)]
  } else {
    zs <- z
  }
  idx <- unique(round(seq(1, length(zs), length.out = min(n_pts, length(zs)))))
  zr <- Re(zs[idx]) / scale_v
  zi <- Im(zs[idx]) / scale_v

  # Instantaneous frequency estimate
  ph <- Arg(zs)
  dph <- diff(ph)
  dph <- ((dph + pi) %% (2 * pi)) - pi
  inst_hz <- stats::median(dph * fs / (2 * pi), na.rm = TRUE)
  if (!is.finite(inst_hz) || inst_hz <= 0) inst_hz <- mean(band)

  # Roundness via minor/major axis ratio of (Re, Im) covariance
  cov_m <- stats::cov(cbind(Re(zs), Im(zs)))
  ev <- sort(pmax(eigen(cov_m, symmetric = TRUE, only.values = TRUE)$values, 0))
  roundness <- if (ev[2] > 1e-12) sqrt(ev[1] / ev[2]) else 0.0

  list(
    re = t_arr(t_round_vec(zr, 3)),
    im = t_arr(t_round_vec(zi, 3)),
    rms = round(rms, 4),
    burst_thr = round(burst_thr, 4),
    scale = round(scale_v, 4),
    burst_pct = round(burst_pct, 1),
    roundness = round(roundness, 3),
    inst_hz = round(inst_hz, 2)
  )
}

t_stft_spectrogram <- function(x, fs, f_max = 120.0, target_t = 56L, target_f = 44L) {
  x <- as.numeric(x)
  x[!is.finite(x)] <- 0.0
  n <- length(x)
  nseg <- min(256L, max(32L, n))
  if (n < 32L) {
    return(list(t = t_arr(c(0, 1)), f = t_arr(c(0, 60)), db = t_list(list(t_arr(c(-40, -40)), t_arr(c(-40, -40)))), vmin = -40, vmax = 0))
  }
  n_frames <- min(target_t, max(4L, as.integer(floor(n / max(16L, floor(nseg / 2L))))))
  starts <- unique(round(seq(1, max(1, n - nseg + 1L), length.out = n_frames)))
  w <- t_hann(nseg)
  w_norm <- sum(w^2)
  n_half <- as.integer(floor(nseg / 2L)) + 1L
  freqs <- seq(0, n_half - 1L) * (fs / nseg)
  f_keep <- which(freqs <= f_max)
  if (length(f_keep) > target_f) {
    f_keep <- f_keep[unique(round(seq(1, length(f_keep), length.out = target_f)))]
  }
  f_out <- freqs[f_keep]
  t_out <- (starts - 1 + nseg / 2) / fs

  mat <- matrix(0.0, nrow = length(f_keep), ncol = length(starts))
  for (j in seq_along(starts)) {
    s <- starts[j]
    seg <- x[s:(s + nseg - 1L)]
    seg <- (seg - mean(seg)) * w
    spec <- stats::fft(seg)[f_keep]
    p <- (Mod(spec)^2) / (fs * w_norm) * 2.0
    mat[, j] <- 10.0 * log10(pmax(p, 1e-12))
  }
  vmin <- as.numeric(stats::quantile(mat, 0.05, names = FALSE))
  vmax <- as.numeric(stats::quantile(mat, 0.98, names = FALSE))
  if (!is.finite(vmin) || !is.finite(vmax) || vmax <= vmin) { vmin <- -40; vmax <- 0 }

  rows <- lapply(seq_len(nrow(mat)), function(i) t_arr(t_round_vec(mat[i, ], 2)))
  list(
    t = t_arr(t_round_vec(t_out, 2)),
    f = t_arr(t_round_vec(f_out, 2)),
    db = t_list(rows),
    vmin = round(vmin, 2),
    vmax = round(vmax, 2)
  )
}

t_analyze_time_domain <- function(raw_x, fs, stim_rate_hz, ftg_half_bw = TITRA_DEFAULT_FTG_HW,
                                  amp_t = NULL, amp_ma = NULL) {
  x <- as.numeric(raw_x)
  x[!is.finite(x)] <- 0.0
  n <- length(x)
  fs <- max(t_num(fs, 250.0), 1.0)
  dur_s <- n / fs
  if (n < 32L) return(NULL)

  x_dc <- x - mean(x)
  rms_uv <- sqrt(mean(x_dc^2))
  ftg_center <- if (stim_rate_hz > 0) stim_rate_hz / 2.0 else 72.5
  ftg_band <- c(max(35.0, ftg_center - ftg_half_bw), min(fs / 2.0 - 2.0, ftg_center + ftg_half_bw))

  # 1) Downsampled min/max/mean trace (320 bins)
  n_bins <- min(320L, n)
  edges <- round(seq(1, n + 1, length.out = n_bins + 1L))
  tr_t <- numeric(n_bins); tr_min <- numeric(n_bins); tr_max <- numeric(n_bins); tr_mean <- numeric(n_bins)
  for (b in seq_len(n_bins)) {
    i0 <- edges[b]; i1 <- max(i0, edges[b + 1L] - 1L)
    seg <- x_dc[i0:i1]
    tr_t[b] <- ((i0 + i1) / 2.0 - 1.0) / fs
    tr_min[b] <- min(seg)
    tr_max[b] <- max(seg)
    tr_mean[b] <- mean(seg)
  }

  # 2) Welch PSD (up to 120 Hz, <= 241 points)
  psd_raw <- t_welch_psd(x_dc, fs = fs, nperseg = min(512L, n))
  p_keep <- which(psd_raw$freqs <= 120.5)
  if (length(p_keep) > 241L) p_keep <- p_keep[unique(round(seq(1, length(p_keep), length.out = 241L)))]
  psd_f <- psd_raw$freqs[p_keep]
  psd_p <- psd_raw$power[p_keep]
  psd_db <- psd_raw$db[p_keep]
  bstats <- t_band_metrics(psd_f, psd_p, TITRA_BETA_BAND, ftg_band)

  # 3) STFT Spectrogram
  spec <- t_stft_spectrogram(x_dc, fs = fs, f_max = 120.0, target_t = 56L, target_f = 44L)

  # 4) Time-varying beta & FTG envelope (<= 97 windows)
  n_env <- min(97L, max(8L, as.integer(floor(dur_s / 1.5))))
  env_w <- min(n, max(64L, as.integer(round(2.0 * fs))))
  env_starts <- unique(round(seq(1, max(1, n - env_w + 1L), length.out = n_env)))
  env_t <- numeric(length(env_starts))
  env_b <- numeric(length(env_starts))
  env_f <- numeric(length(env_starts))
  for (i in seq_along(env_starts)) {
    s <- env_starts[i]
    seg <- x_dc[s:(s + env_w - 1L)]
    pw <- t_welch_psd(seg, fs = fs, nperseg = min(256L, length(seg)))
    bm <- t_band_metrics(pw$freqs, pw$power, TITRA_BETA_BAND, ftg_band)
    env_t[i] <- (s - 1 + env_w / 2) / fs
    env_b[i] <- bm$beta_db
    env_f[i] <- bm$ftg_db
  }

  # 5) Amplitude curve & amplitude step grouping
  amp_curve <- list(t = t_arr(numeric(0)), ma = t_arr(numeric(0)))
  amp_steps <- list()
  if (!is.null(amp_t) && !is.null(amp_ma) && length(amp_t) >= 2L && length(amp_ma) == length(amp_t)) {
    at <- as.numeric(amp_t); am <- as.numeric(amp_ma)
    ok <- is.finite(at) & is.finite(am)
    at <- at[ok]; am <- am[ok]
    if (length(at) >= 2L) {
      # Downsample amp_curve to <= 440 pts
      if (length(at) > 440L) {
        idx <- unique(round(seq(1, length(at), length.out = 440L)))
        amp_curve <- list(t = t_arr(t_round_vec(at[idx], 2)), ma = t_arr(t_round_vec(am[idx], 3)))
      } else {
        amp_curve <- list(t = t_arr(t_round_vec(at, 2)), ma = t_arr(t_round_vec(am, 3)))
      }
      # Interpolate mA to sample times and group by rounded 0.1 mA steps
      sample_t <- (seq_len(n) - 1L) / fs
      sample_ma <- stats::approx(at, am, xout = sample_t, method = "constant", rule = 2)$y
      step_vals <- sort(unique(round(sample_ma, 1)))
      for (sv in step_vals) {
        idx <- which(abs(round(sample_ma, 1) - sv) < 1e-6)
        if (length(idx) < as.integer(fs * 1.5)) next
        seg <- x_dc[idx]
        pw <- t_welch_psd(seg, fs = fs, nperseg = min(256L, length(seg)))
        bm <- t_band_metrics(pw$freqs, pw$power, TITRA_BETA_BAND, ftg_band)
        fk <- which(pw$freqs <= 120.5)
        if (length(fk) > 60L) fk <- fk[unique(round(seq(1, length(fk), length.out = 60L)))]
        amp_steps[[length(amp_steps) + 1L]] <- list(
          amp_ma = round(sv, 2),
          n_win = max(1L, as.integer(floor(length(idx) / max(1, as.integer(fs * 2))))),
          dur_s = round(length(idx) / fs, 2),
          beta_db = bm$beta_db,
          ftg_db = bm$ftg_db,
          beta_power = bm$beta_power,
          ftg_power = bm$ftg_power,
          ftg_beta_ratio = bm$ftg_beta_ratio,
          ftg_beta_db_diff = bm$ftg_beta_db_diff,
          psd_freqs = t_arr(t_round_vec(pw$freqs[fk], 2)),
          psd_db = t_arr(t_round_vec(pw$db[fk], 2))
        )
      }
    }
  }

  # 6) Hilbert Phase Portraits
  ph_beta <- t_phase_portrait(x_dc, fs, TITRA_BETA_BAND)
  ph_ftg <- t_phase_portrait(x_dc, fs, ftg_band)

  list(
    n_samples = as.integer(n),
    fs_hz = round(fs, 2),
    duration_s = round(dur_s, 2),
    rms_uv = round(rms_uv, 3),
    beta_band = t_arr(TITRA_BETA_BAND),
    ftg_center_hz = round(ftg_center, 2),
    ftg_band = t_arr(round(ftg_band, 2)),
    band_stats = bstats,
    trace = list(
      t = t_arr(t_round_vec(tr_t, 2)),
      min = t_arr(t_round_vec(tr_min, 2)),
      max = t_arr(t_round_vec(tr_max, 2)),
      mean = t_arr(t_round_vec(tr_mean, 2))
    ),
    amp_curve = amp_curve,
    psd = list(
      freqs = t_arr(t_round_vec(psd_f, 2)),
      db = t_arr(t_round_vec(psd_db, 2)),
      power = t_arr(t_round_vec(psd_p, 5))
    ),
    spectrogram = spec,
    envelope = list(
      t = t_arr(t_round_vec(env_t, 2)),
      beta_db = t_arr(t_round_vec(env_b, 2)),
      ftg_db = t_arr(t_round_vec(env_f, 2))
    ),
    amp_steps = t_list(amp_steps),
    phase = list(beta = ph_beta, ftg = ph_ftg),
    # Keep internal raw signal for quantitative suites (stripped before JSON export to JS)
    .raw_x = x_dc,
    .amp_t = amp_t,
    .amp_ma = amp_ma
  )
}
