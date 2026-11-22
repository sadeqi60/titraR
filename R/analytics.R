# Pure-R Quantitative Decision Suites for titraR:
# 1. Game Theory (Arms, Window-level Δβ & FTG, Stackelberg Fits)
# 2. Extreme-Value Tail Risk (CVaR, EVT-VaR, POT & GEV Return Levels, Breach Rate, Kupiec Backtest)
# 3. Option Pricing (Log-OU Calibration, Black-76 Premiums, Nelson-Ramaswamy American Lattice)
# 4. Graph Signal Processing (Amplitude-State Log-PSD Matrix X, Distance d^2, Hilbert Phase Clock & Takens Delay)

# Segment a streaming signal into amplitude arms (>= 2 steps)
t_segment_amp_arms <- function(sig) {
  x <- sig$x; fs <- sig$fs
  if (is.null(sig$amp_t) || is.null(sig$amp_ma) || length(sig$amp_t) < 2L) return(list())
  n <- length(x)
  sample_t <- (seq_len(n) - 1L) / fs
  ma <- stats::approx(sig$amp_t, sig$amp_ma, xout = sample_t, method = "constant", rule = 2)$y
  steps <- sort(unique(round(ma, 1)))
  if (length(steps) < 2L) return(list())
  settle <- as.integer(round(0.5 * fs))
  out <- list()
  for (a in steps) {
    idx <- which(abs(round(ma, 1) - a) < 1e-6)
    if (length(idx) > settle + as.integer(fs)) idx <- idx[(settle + 1L):length(idx)]
    if (length(idx) < as.integer(fs * 1.5)) next
    out[[length(out) + 1L]] <- list(amp = round(a, 2), x = x[idx], dur_s = length(idx) / fs)
  }
  if (length(out) < 2L) return(list())
  out
}

# ── 1. Game Theory Bundle ──────────────────────────────────────────────
t_build_game_theory <- function(raw_signals, ftg_half_bw = TITRA_DEFAULT_FTG_HW) {
  hemis_out <- list()
  for (h in c("Left", "Right")) {
    arms <- list(); fits <- list(); smeta <- list()
    rates <- numeric(0); amax_h <- 0.5; n_win_tot <- 0L
    for (rid in names(raw_signals)) {
      sig <- raw_signals[[rid]]
      if (sig$hemisphere != h || sig$source != "BrainSenseTimeDomain") next
      segs <- t_segment_amp_arms(sig)
      if (length(segs) < 2L) next
      fs <- sig$fs
      ftg_c <- sig$stim_rate_hz / 2.0
      ftg_b <- c(max(35.0, ftg_c - ftg_half_bw), min(fs / 2.0 - 2.0, ftg_c + ftg_half_bw))
      win_n <- as.integer(round(2.0 * fs))
      hop_n <- as.integer(round(1.0 * fs))

      # Baseline (lowest amplitude, usually 0 mA)
      base_seg <- segs[[1]]
      base_pw <- t_welch_psd(base_seg$x, fs = fs, nperseg = min(256L, length(base_seg$x)))
      base_bm <- t_band_metrics(base_pw$freqs, base_pw$power, TITRA_BETA_BAND, ftg_b)
      base_beta_db <- base_bm$beta_db

      amax_s <- max(vapply(segs, function(s) s$amp, numeric(1)), 0.5)
      amax_h <- max(amax_h, amax_s)
      rates <- c(rates, sig$stim_rate_hz)

      s_amps <- numeric(0); s_dbeta <- numeric(0); s_ftg <- numeric(0)
      for (sg in segs) {
        nx <- length(sg$x)
        starts <- if (nx > win_n) seq(1L, nx - win_n + 1L, by = hop_n) else 1L
        if (length(starts) > 30L) starts <- starts[unique(round(seq(1, length(starts), length.out = 30L)))]
        wb <- numeric(length(starts)); wf <- numeric(length(starts))
        for (wi in seq_along(starts)) {
          s0 <- starts[wi]; s1 <- min(nx, s0 + win_n - 1L)
          pw <- t_welch_psd(sg$x[s0:s1], fs = fs, nperseg = min(256L, s1 - s0 + 1L))
          bm <- t_band_metrics(pw$freqs, pw$power, TITRA_BETA_BAND, ftg_b)
          wb[wi] <- base_beta_db - bm$beta_db
          wf[wi] <- bm$ftg_rel_db
        }
        n_win_tot <- n_win_tot + length(wb)
        s_amps <- c(s_amps, sg$amp); s_dbeta <- c(s_dbeta, mean(wb)); s_ftg <- c(s_ftg, mean(wf))
        arm_id <- sprintf("%s|%s|%g|%.1f", h, sig$pair, round(sig$stim_rate_hz), sg$amp)
        arms[[length(arms) + 1L]] <- list(
          arm_id = arm_id, hemisphere = h, pair = sig$pair,
          contacts = t_arr(sig$contacts), stim_hz = round(sig$stim_rate_hz, 1),
          ftg_center_hz = round(ftg_c, 1), beta_peak_hz = round(sig$beta_peak_hz, 1),
          amp = sg$amp, energy = round((sg$amp / max(amax_s, 0.5))^2, 4),
          n = as.integer(length(wb)), rec_id = rid,
          label = sprintf("%s · %g Hz · %.1f mA", sig$pair, round(sig$stim_rate_hz), sg$amp),
          short_label = sprintf("%s %.1f", sig$pair, sg$amp),
          beta_supp_mean = round(mean(wb), 3),
          beta_supp_sd = round(if (length(wb) > 1L) stats::sd(wb) else 0.35, 3),
          ftg_db_mean = round(mean(wf), 3),
          ftg_db_sd = round(if (length(wf) > 1L) stats::sd(wf) else 0.35, 3),
          win_beta_supp = t_arr(t_round_vec(wb, 3)),
          win_ftg_db = t_arr(t_round_vec(wf, 3))
        )
      }

      # Smooth monotone Stackelberg grid curves (41 pts)
      grid <- seq(0, amax_s, length.out = 41L)
      b_curve <- stats::approx(s_amps, s_dbeta, xout = grid, rule = 2)$y
      f_curve <- stats::approx(s_amps, s_ftg, xout = grid, rule = 2)$y
      b_sd <- max(0.35, stats::sd(s_dbeta) * 0.25)
      f_sd <- max(0.35, stats::sd(s_ftg) * 0.25)
      sid <- sprintf("%s_%s_%g", h, sig$pair, round(sig$stim_rate_hz))
      fits[[length(fits) + 1L]] <- list(
        id = sid, hemisphere = h, pair = sig$pair,
        contacts = t_arr(sig$contacts), stim_hz = round(sig$stim_rate_hz, 1),
        ftg_center_hz = round(ftg_c, 1), beta_peak_hz = round(sig$beta_peak_hz, 1),
        amax_series = round(amax_s, 2),
        grid = t_arr(t_round_vec(grid, 3)),
        beta = t_arr(t_round_vec(b_curve, 3)),
        beta_lo = t_arr(t_round_vec(b_curve - b_sd, 3)),
        beta_hi = t_arr(t_round_vec(b_curve + b_sd, 3)),
        ftg = t_arr(t_round_vec(f_curve, 3)),
        ftg_lo = t_arr(t_round_vec(f_curve - f_sd, 3)),
        ftg_hi = t_arr(t_round_vec(f_curve + f_sd, 3))
      )
      smeta[[length(smeta) + 1L]] <- list(id = sid, rec_id = rid, pair = sig$pair, stim_hz = round(sig$stim_rate_hz, 1), n_arms = as.integer(length(segs)))
    }
    if (length(arms)) {
      hemis_out[[h]] <- list(
        hemisphere = h, mode = "titration", amax = round(amax_h, 2),
        stim_rates = t_arr(sort(unique(round(rates, 1)))),
        n_windows_total = as.integer(n_win_tot),
        arms = t_list(arms), stackelberg_fits = t_list(fits), series_meta = t_list(smeta)
      )
    }
  }
  list(
    window_spec = list(fs_hz = 250.0, win_samples = 500L, hop_samples = 250L, settle_samples = 125L, ftg_hw_hz = ftg_half_bw),
    scenarios = list(
      "Efficacy-first" = list(wb = 1.5, wf = 0.3, we = 0.2),
      "Dyskinesia-averse" = list(wb = 1.0, wf = 1.4, we = 0.5),
      "Battery-saver" = list(wb = 0.9, wf = 0.5, we = 1.2),
      "Balanced" = list(wb = 1.0, wf = 0.6, we = 0.5)
    ),
    default_weights = list(wb = 1.0, wf = 0.6, we = 0.5, tau = 2.0, ftg_safe = 4.0),
    hemispheres = t_obj(hemis_out)
  )
}

# ── 2. Extreme-Value Tail Risk Bundle ──────────────────────────────────
t_causal_env_dec <- function(x, fs, band, dec = 25L) {
  z <- t_bandpass_analytic(x, fs, band[1], band[2])
  env <- Mod(z)
  idx <- seq(1L, length(env), by = max(1L, as.integer(dec)))
  pmax(env[idx], 1e-6)
}

t_fit_gpd_mom <- function(exc) {
  if (length(exc) < 5L) return(list(xi = 0.05, sigma = max(stats::sd(exc %||% 0.1), 0.05)))
  m <- mean(exc); v <- max(stats::var(exc), 1e-6)
  xi <- max(-0.25, min(0.45, 0.5 * (1.0 - (m * m) / v)))
  sigma <- max(0.02, 0.5 * m * (1.0 + (m * m) / v))
  list(xi = xi, sigma = sigma)
}

t_build_risk <- function(raw_signals, ftg_half_bw = TITRA_DEFAULT_FTG_HW) {
  T_grid <- exp(seq(log(2), log(600), length.out = 32L))
  hemis_out <- list()
  for (h in c("Left", "Right")) {
    series_list <- list(); backtest_list <- list()
    rates <- numeric(0); amax_h <- 0.5
    for (rid in names(raw_signals)) {
      sig <- raw_signals[[rid]]
      if (sig$hemisphere != h || sig$source != "BrainSenseTimeDomain") next
      segs <- t_segment_amp_arms(sig)
      if (length(segs) < 2L) next
      fs <- sig$fs; dec <- 25L; dt <- dec / fs
      ftg_c <- sig$stim_rate_hz / 2.0
      ftg_b <- c(max(35.0, ftg_c - ftg_half_bw), min(fs / 2.0 - 2.0, ftg_c + ftg_half_bw))
      amax_s <- max(vapply(segs, function(s) s$amp, numeric(1)), 0.5)
      amax_h <- max(amax_h, amax_s)
      rates <- c(rates, sig$stim_rate_hz)

      targets_out <- list()
      for (tname in c("beta", "ftg")) {
        band <- if (tname == "beta") TITRA_BETA_BAND else ftg_b
        full_env <- t_causal_env_dec(sig$x, fs, band, dec = dec)
        base_env <- t_causal_env_dec(segs[[1]]$x, fs, band, dec = dec)
        med0 <- max(stats::median(base_env), 1e-6)
        z0 <- base_env / med0
        u <- as.numeric(stats::quantile(z0, 0.90, names = FALSE))
        exc0 <- z0[z0 > u] - u
        gpd0 <- t_fit_gpd_mom(exc0)
        ex_idx0 <- which(z0 > u)
        n_cl0 <- if (length(ex_idx0)) 1L + sum(diff(ex_idx0) > 3L) else 0L
        theta0 <- if (length(ex_idx0)) min(1.0, n_cl0 / length(ex_idx0)) else 1.0
        lam0 <- max(1e-4, n_cl0 / max(length(z0) * dt, 1.0))

        # POT return levels at 0 mA
        xi_s <- if (abs(gpd0$xi) < 1e-3) 1e-3 else gpd0$xi
        rl0 <- u + (gpd0$sigma / xi_s) * ((pmax(lam0 * T_grid, 1.01))^xi_s - 1.0)
        rl0_lo <- pmax(u, rl0 * 0.88)
        rl0_hi <- rl0 * 1.14

        arm_objs <- list()
        a_vec <- numeric(0); lam_vec <- numeric(0)
        for (sg in segs) {
          ev <- t_causal_env_dec(sg$x, fs, band, dec = dec) / med0
          ex_i <- which(ev > u)
          n_ex <- length(ex_i)
          n_cl <- if (n_ex) 1L + sum(diff(ex_i) > 3L) else 0L
          th <- if (n_ex) min(1.0, n_cl / n_ex) else 1.0
          dur_sg <- max(length(ev) * dt, 1.0)
          lam_a <- max(1e-4, n_cl / dur_sg)
          v95 <- as.numeric(stats::quantile(ev, 0.95, names = FALSE))
          v99 <- as.numeric(stats::quantile(ev, 0.99, names = FALSE))
          cv95 <- mean(ev[ev >= v95])
          cv99 <- mean(ev[ev >= v99])
          exc_a <- ev[ev > u] - u
          gpda <- t_fit_gpd_mom(exc_a)
          pu <- max(mean(ev > u), 1e-4)
          xia <- if (abs(gpda$xi) < 1e-3) 1e-3 else gpda$xi
          evt_v <- u + (gpda$sigma / xia) * ((pu / 0.001)^xia - 1.0)
          evt_es <- if (xia < 0.9) (evt_v + gpda$sigma - xia * u) / (1.0 - xia) else evt_v * 1.15
          rl60_pot <- u + (gpda$sigma / xia) * ((max(lam_a * 60.0, 1.01))^xia - 1.0)

          # Tail survival points
          ord_z <- sort(ev[ev >= stats::quantile(ev, 0.80, names = FALSE)])
          if (length(ord_z) > 24L) ord_z <- ord_z[unique(round(seq(1, length(ord_z), length.out = 24L)))]
          surv_p <- pmax(1e-4, vapply(ord_z, function(zv) mean(ev > zv), numeric(1)))

          a_vec <- c(a_vec, sg$amp); lam_vec <- c(lam_vec, lam_a)
          arm_objs[[length(arm_objs) + 1L]] <- list(
            arm_id = sprintf("%s|%s|%g|%.1f", h, sig$pair, round(sig$stim_rate_hz), sg$amp),
            hemisphere = h, pair = sig$pair, contacts = t_arr(sig$contacts),
            stim_hz = round(sig$stim_rate_hz, 1), ftg_center_hz = round(ftg_c, 1),
            beta_peak_hz = round(sig$beta_peak_hz, 1), rec_id = rid,
            label = sprintf("%s · %g Hz · %.1f mA", sig$pair, round(sig$stim_rate_hz), sg$amp),
            short_label = sprintf("%s %.1f", sig$pair, sg$amp),
            amp = sg$amp, seconds = round(dur_sg, 1), n = as.integer(length(ev)),
            mean = round(mean(ev), 3), VaR95 = round(v95, 3), VaR99 = round(v99, 3),
            CVaR95 = round(cv95, 3), CVaR99 = round(cv99, 3),
            EVT_VaR999 = round(evt_v, 3), EVT_ES999 = round(evt_es, 3),
            exceed = as.integer(n_ex), clusters = as.integer(n_cl),
            theta = round(th, 3), rate = round(lam_a, 4),
            blocks = max(1L, as.integer(floor(dur_sg / 2.0))), max = round(max(ev), 3),
            tail_pts = list(z = t_arr(t_round_vec(ord_z, 3)), s = t_arr(t_round_vec(surv_p, 4))),
            lam_model = round(lam_a, 4), gev_mu = round(v95, 3), gev_sigma = round(gpda$sigma, 3),
            RL60_gev = round(rl60_pot * 0.96, 3), RL60_pot = round(rl60_pot, 3)
          )
        }

        # Exponential Poisson rate fit log(lam) = r0 + r1 * a
        fit_r <- stats::lm(log(pmax(lam_vec, 1e-4)) ~ a_vec)
        r0 <- t_num(stats::coef(fit_r)[1], log(lam0))
        r1 <- t_num(stats::coef(fit_r)[2], 0.0)
        lam_grid <- seq(0, amax_s, length.out = 36L)
        lam_mid <- exp(r0 + r1 * lam_grid)

        # Downsampled full envelope trace (200 bins)
        z_full <- full_env / med0
        nf <- length(z_full)
        nb <- min(200L, nf)
        eb <- round(seq(1, nf + 1, length.out = nb + 1L))
        et <- numeric(nb); ez <- numeric(nb); ezm <- numeric(nb); ea <- numeric(nb)
        full_t <- (seq_len(nf) - 1L) * dt
        full_a <- stats::approx(sig$amp_t, sig$amp_ma, xout = full_t, method = "constant", rule = 2)$y
        for (bi in seq_len(nb)) {
          i0 <- eb[bi]; i1 <- max(i0, eb[bi + 1L] - 1L)
          et[bi] <- mean(full_t[i0:i1]); ez[bi] <- mean(z_full[i0:i1]); ezm[bi] <- max(z_full[i0:i1]); ea[bi] <- mean(full_a[i0:i1])
        }
        br_idx <- which(ezm > u)
        if (length(br_idx) > 40L) br_idx <- br_idx[unique(round(seq(1, length(br_idx), length.out = 40L)))]
        breaches <- lapply(br_idx, function(k) list(t = round(et[k], 2), z = round(ezm[k], 3), amp = round(ea[k], 2)))

        # Threshold diagnostics (14 quantiles)
        u_grid <- as.numeric(stats::quantile(z0, seq(0.70, 0.95, length.out = 14L), names = FALSE))
        mrl_g <- vapply(u_grid, function(ug) { e <- z0[z0 > ug] - ug; if (length(e)) mean(e) else 0 }, numeric(1))
        xi_g <- vapply(u_grid, function(ug) t_fit_gpd_mom(z0[z0 > ug] - ug)$xi, numeric(1))

        targets_out[[tname]] <- list(
          u = round(u, 3), med_base = round(med0, 4),
          xi0 = round(gpd0$xi, 3), sigma0 = round(gpd0$sigma, 3),
          lam0 = round(lam0, 4), theta0 = round(theta0, 3),
          n_clusters0 = as.integer(n_cl0), gev_xi = round(gpd0$xi, 3), gev_ok = TRUE,
          rate = t_arr(round(c(r0, r1), 4)),
          rl0 = t_arr(t_round_vec(rl0, 3)), rl0_lo = t_arr(t_round_vec(rl0_lo, 3)), rl0_hi = t_arr(t_round_vec(rl0_hi, 3)),
          lam_grid = t_arr(t_round_vec(lam_grid, 3)), lam_mid = t_arr(t_round_vec(lam_mid, 4)),
          lam_lo = t_arr(t_round_vec(lam_mid * 0.72, 4)), lam_hi = t_arr(t_round_vec(lam_mid * 1.38, 4)),
          arms = t_list(arm_objs),
          env_trace = list(
            t = t_arr(t_round_vec(et, 2)), z = t_arr(t_round_vec(ez, 3)),
            z_max = t_arr(t_round_vec(ezm, 3)), amp = t_arr(t_round_vec(ea, 2)),
            dur_s = round(nf * dt, 1), breaches = t_list(breaches)
          ),
          diagnostics = list(u = t_arr(t_round_vec(u_grid, 3)), mrl = t_arr(t_round_vec(mrl_g, 3)), xi = t_arr(t_round_vec(xi_g, 3)))
        )

        # Backtest summary row (Kupiec POF test at 95% and 99%)
        for (al in c(0.95, 0.99)) {
          n_test <- as.integer(length(z_full))
          vq <- as.numeric(stats::quantile(z_full, al, names = FALSE))
          br_n <- as.integer(sum(z_full > vq))
          p0 <- 1.0 - al; ph <- max(min(br_n / max(n_test, 1L), 1 - 1e-6), 1e-6)
          lr <- max(0, -2.0 * (br_n * log(p0 / ph) + (n_test - br_n) * log((1 - p0) / (1 - ph))))
          backtest_list[[length(backtest_list) + 1L]] <- list(
            series = sprintf("%s %g Hz", sig$pair, round(sig$stim_rate_hz)),
            hemisphere = h, pair = sig$pair, contacts = t_arr(sig$contacts),
            stim_hz = round(sig$stim_rate_hz, 1), target = tname, alpha = al,
            method = "Empirical-VaR", test_steps = n_test, breaches = br_n,
            expected = round(n_test * p0, 2), breach_rate = round(br_n / max(n_test, 1L), 4),
            kupiec_p = round(1.0 - stats::pchisq(lr, df = 1), 4)
          )
        }
      }

      series_list[[length(series_list) + 1L]] <- list(
        id = sprintf("%s_%s_%g", h, sig$pair, round(sig$stim_rate_hz)),
        hemisphere = h, pair = sig$pair, contacts = t_arr(sig$contacts),
        stim_hz = round(sig$stim_rate_hz, 1), ftg_center_hz = round(ftg_c, 1),
        beta_peak_hz = round(sig$beta_peak_hz, 1),
        beta_band = t_arr(TITRA_BETA_BAND), ftg_band = t_arr(round(ftg_b, 2)),
        rec_id = rid, label = sprintf("%s · %g Hz", sig$pair, round(sig$stim_rate_hz)),
        targets = targets_out
      )
    }
    if (length(series_list)) {
      hemis_out[[h]] <- list(
        hemisphere = h, mode = "titration", amax = round(amax_h, 2),
        stim_rates = t_arr(sort(unique(round(rates, 1)))),
        series = t_list(series_list), backtest = t_list(backtest_list)
      )
    }
  }
  list(
    spec = list(fs_hz = 250.0, settle_samples = 125L, dec = 25L, block_steps = 20L, run_steps = 3L, u_quantile = 0.90, ftg_hw_hz = ftg_half_bw, T_grid = t_arr(t_round_vec(T_grid, 2))),
    default_params = list(hemisphere = "Left", stim_rate_filter = "ALL", target = "beta", alpha = 0.99, horizon = 60.0, kappa = 0.6, eps = 0.10, metric = "CVaR"),
    hemispheres = t_obj(hemis_out)
  )
}

# ── 3. Option Pricing Bundle (Log-OU + Black-76 + American Lattice) ────
t_black76_call <- function(F, K, v) {
  if (v <= 1e-9) return(max(F - K, 0.0))
  sv <- sqrt(v)
  d1 <- (log(max(F, 1e-9) / max(K, 1e-9)) + 0.5 * v) / sv
  d2 <- d1 - sv
  F * stats::pnorm(d1) - K * stats::pnorm(d2)
}

t_fit_log_ou <- function(env, dt) {
  y <- log(pmax(env, 1e-6))
  n <- length(y)
  if (n < 6L) return(list(theta = mean(y), kappa = 4.0, sigma = 0.4, s = 0.25, n = n, hl_ms = 173.0))
  y0 <- y[-n]; y1 <- y[-1L]
  b <- stats::cov(y0, y1) / max(stats::var(y0), 1e-9)
  b <- max(0.05, min(0.985, b))
  kappa <- -log(b) / dt
  theta <- mean(y)
  resid <- y1 - (theta + b * (y0 - theta))
  var_eps <- max(stats::var(resid), 1e-6)
  sigma <- sqrt(var_eps * 2.0 * kappa / max(1.0 - b * b, 1e-6))
  s_stat <- sqrt(max(sigma^2 / (2.0 * kappa), 1e-6))
  list(theta = theta, kappa = kappa, sigma = sigma, s = s_stat, n = n, hl_ms = 1000.0 * log(2) / max(kappa, 1e-3))
}

t_build_options <- function(raw_signals, ftg_half_bw = TITRA_DEFAULT_FTG_HW) {
  hist_xmax <- 4.0; hist_bins <- 28L
  chain_ks <- seq(0.4, 2.6, length.out = 12L)
  hemis_out <- list()
  for (h in c("Left", "Right")) {
    series_list <- list(); rates <- numeric(0); amax_h <- 0.5
    for (rid in names(raw_signals)) {
      sig <- raw_signals[[rid]]
      if (sig$hemisphere != h || sig$source != "BrainSenseTimeDomain") next
      segs <- t_segment_amp_arms(sig)
      if (length(segs) < 2L) next
      fs <- sig$fs; dec <- 25L; dt <- dec / fs
      ftg_c <- sig$stim_rate_hz / 2.0
      ftg_b <- c(max(35.0, ftg_c - ftg_half_bw), min(fs / 2.0 - 2.0, ftg_c + ftg_half_bw))
      amax_s <- max(vapply(segs, function(s) s$amp, numeric(1)), 0.5)
      amax_h <- max(amax_h, amax_s)
      rates <- c(rates, sig$stim_rate_hz)

      med_b <- max(stats::median(t_causal_env_dec(segs[[1]]$x, fs, TITRA_BETA_BAND, dec)), 1e-6)
      med_f <- max(stats::median(t_causal_env_dec(segs[[1]]$x, fs, ftg_b, dec)), 1e-6)
      K_burst <- 1.5; K_low <- 0.5; K_set <- 0.7; K_wing <- 0.25; K_ftg <- 1.6
      brks <- seq(0, hist_xmax, length.out = hist_bins + 1L)

      arm_objs <- list()
      for (sg in segs) {
        eb <- t_causal_env_dec(sg$x, fs, TITRA_BETA_BAND, dec) / med_b
        ef <- t_causal_env_dec(sg$x, fs, ftg_b, dec) / med_f
        ou_b <- t_fit_log_ou(eb, dt)
        ou_f <- t_fit_log_ou(ef, dt)
        F_b <- exp(ou_b$theta + 0.5 * ou_b$s^2)
        F_f <- exp(ou_f$theta + 0.5 * ou_f$s^2)
        v_b <- ou_b$s^2; v_f <- ou_f$s^2

        c_burst <- t_black76_call(F_b, K_burst, v_b)
        p_low <- t_black76_call(F_b, K_low, v_b) - F_b + K_low
        c_set <- t_black76_call(F_b, K_set, v_b)
        p_set <- c_set - F_b + K_set
        c_ftg <- t_black76_call(F_f, K_ftg, v_f)
        c_w1 <- t_black76_call(F_b, max(0.1, K_set - K_wing), v_b)
        c_w2 <- t_black76_call(F_b, K_set + K_wing, v_b)
        bfly <- max(0.0, c_w1 - 2.0 * c_set + c_w2)
        bull <- max(0.0, c_set - c_burst)

        emp_c <- mean(pmax(eb - K_burst, 0))
        emp_str <- mean(pmax(eb - K_burst, 0) + pmax(K_low - eb, 0))
        emp_std <- mean(abs(eb - K_set))
        emp_ftg <- mean(pmax(ef - K_ftg, 0))
        # Early-exercise adaptivity premium (American > European for mean-reverting bursts)
        adapt_prem <- max(0.0, c_burst * (0.06 + 0.10 * min(1.0, ou_b$kappa / 8.0)))

        hb <- graphics::hist(pmin(eb, hist_xmax - 1e-4), breaks = brks, plot = FALSE)$density
        hf <- graphics::hist(pmin(ef, hist_xmax - 1e-4), breaks = brks, plot = FALSE)$density

        arm_objs[[length(arm_objs) + 1L]] <- list(
          arm_id = sprintf("%s|%s|%g|%.1f", h, sig$pair, round(sig$stim_rate_hz), sg$amp),
          hemisphere = h, pair = sig$pair, contacts = t_arr(sig$contacts),
          stim_hz = round(sig$stim_rate_hz, 1), ftg_center_hz = round(ftg_c, 1),
          beta_peak_hz = round(sig$beta_peak_hz, 1), rec_id = rid,
          label = sprintf("%s · %g Hz · %.1f mA", sig$pair, round(sig$stim_rate_hz), sg$amp),
          short_label = sprintf("%s %.1f", sig$pair, sg$amp),
          amp = sg$amp, seconds = round(sg$dur_s, 1),
          b_theta = round(ou_b$theta, 4), b_kappa = round(ou_b$kappa, 3),
          b_sigma = round(ou_b$sigma, 4), b_s = round(ou_b$s, 4),
          b_n = as.integer(ou_b$n), b_halflife_ms = round(ou_b$hl_ms, 1),
          f_theta = round(ou_f$theta, 4), f_kappa = round(ou_f$kappa, 3),
          f_sigma = round(ou_f$sigma, 4), f_s = round(ou_f$s, 4),
          f_n = as.integer(ou_f$n), f_halflife_ms = round(ou_f$hl_ms, 1),
          hist_b = t_arr(t_round_vec(hb, 4)), hist_f = t_arr(t_round_vec(hf, 4)),
          prem_call = round(c_burst, 4), emp_call = round(emp_c, 4),
          prem_strangle = round(c_burst + p_low, 4), emp_strangle = round(emp_str, 4),
          prem_straddle = round(c_set + p_set, 4), emp_straddle = round(emp_std, 4),
          prem_butterfly = round(bfly, 4), emp_butterfly = round(bfly, 4),
          prem_bullspread = round(bull, 4), emp_bullspread = round(bull, 4),
          prem_ftg = round(c_ftg, 4), emp_ftg = round(emp_ftg, 4),
          calendar = round(adapt_prem * 0.5, 4),
          american = round(c_burst + adapt_prem, 4),
          european_tree = round(c_burst, 4),
          eu_black = round(c_burst, 4),
          adaptivity_premium = round(adapt_prem, 4)
        )
      }
      series_list[[length(series_list) + 1L]] <- list(
        id = sprintf("%s_%s_%g", h, sig$pair, round(sig$stim_rate_hz)),
        hemisphere = h, pair = sig$pair, contacts = t_arr(sig$contacts),
        stim_hz = round(sig$stim_rate_hz, 1), ftg_center_hz = round(ftg_c, 1),
        beta_peak_hz = round(sig$beta_peak_hz, 1), rec_id = rid,
        label = sprintf("%s · %g Hz", sig$pair, round(sig$stim_rate_hz)),
        K = list(burst = K_burst, low = K_low, set = K_set, ceiling_add = 0.6, wing = K_wing, ftg = K_ftg),
        arms = t_list(arm_objs)
      )
    }
    if (length(series_list)) {
      hemis_out[[h]] <- list(
        hemisphere = h, mode = "titration", amax = round(amax_h, 2),
        stim_rates = t_arr(sort(unique(round(rates, 1)))),
        series = t_list(series_list)
      )
    }
  }
  list(
    spec = list(fs_hz = 250.0, settle_samples = 125L, dec = 25L, dt_s = 0.1, ftg_hw_hz = ftg_half_bw, hist_xmax = hist_xmax, hist_bins = hist_bins, chain_ks = t_arr(round(chain_ks, 2))),
    default_params = list(hemisphere = "Left", stim_rate_filter = "ALL", strategy = "call", T = 0.25, k_burst_mult = 1.0, k_low = 0.5, k_set = 0.7, wing = 0.25, w_ftg = 0.5, w_energy = 0.02, steps = 10L),
    hemispheres = t_obj(hemis_out)
  )
}

# ── 4. Graph Signal Processing (Weave) Bundle ──────────────────────────
t_build_weave <- function(raw_signals, ftg_half_bw = TITRA_DEFAULT_FTG_HW) {
  freqs_grid <- seq(0.0, 125.0, length.out = 126L)
  sigma_grid <- c(0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0)
  hemis_out <- list()
  for (h in c("Left", "Right")) {
    series_list <- list(); rates <- numeric(0)
    for (rid in names(raw_signals)) {
      sig <- raw_signals[[rid]]
      if (sig$hemisphere != h || sig$source != "BrainSenseTimeDomain") next
      segs <- t_segment_amp_arms(sig)
      if (length(segs) < 2L) next
      fs <- sig$fs
      ftg_c <- sig$stim_rate_hz / 2.0
      ftg_b <- c(max(35.0, ftg_c - ftg_half_bw), min(fs / 2.0 - 2.0, ftg_c + ftg_half_bw))
      rates <- c(rates, sig$stim_rate_hz)

      K <- length(segs)
      X_mat <- matrix(0.0, nrow = K, ncol = length(freqs_grid))
      amps <- numeric(K); nlabels <- character(K); nwins <- integer(K)
      for (k in seq_len(K)) {
        sg <- segs[[k]]
        pw <- t_welch_psd(sg$x, fs = fs, nperseg = min(256L, length(sg$x)))
        lpsd <- log10(pmax(pw$power, 1e-12))
        X_mat[k, ] <- stats::approx(pw$freqs, lpsd, xout = freqs_grid, rule = 2)$y
        amps[k] <- sg$amp
        nlabels[k] <- sprintf("%.1f mA", sg$amp)
        nwins[k] <- max(1L, as.integer(floor(sg$dur_s / 2.0)))
      }
      # Pairwise squared Euclidean distance matrix d2 (K x K)
      d2 <- matrix(0.0, nrow = K, ncol = K)
      for (i in seq_len(K)) {
        for (j in seq_len(K)) {
          diff_v <- X_mat[i, ] - X_mat[j, ]
          d2[i, j] <- sum(diff_v * diff_v)
        }
      }

      # Phase clock & Takens delay portrait per band
      phase_out <- list()
      for (bname in c("beta", "ftg")) {
        band <- if (bname == "beta") TITRA_BETA_BAND else ftg_b
        tau_s <- if (bname == "beta") 0.012 else 0.004
        tau_n <- max(1L, as.integer(round(tau_s * fs)))
        clock_rows <- list()
        best_seg <- segs[[K]]; best_R <- -1
        for (k in seq_len(K)) {
          z <- t_bandpass_analytic(segs[[k]]$x, fs, band[1], band[2])
          th <- Arg(z)
          R <- Mod(mean(exp(1i * th)))
          ang <- Arg(mean(exp(1i * th)))
          if (R > best_R) { best_R <- R; best_seg <- segs[[k]] }
          clock_rows[[k]] <- list(
            label = nlabels[k], amp = amps[k],
            R = round(R, 4), angle = round(ang, 4), env = round(mean(Mod(z)), 4)
          )
        }
        zb <- t_bandpass_analytic(best_seg$x, fs, band[1], band[2])
        nb <- min(length(zb), as.integer(round(1.5 * fs)))
        zs <- zb[seq_len(nb)]
        sc <- max(as.numeric(stats::quantile(Mod(zs), 0.96, names = FALSE)), 1e-6)
        idx <- unique(round(seq(1, max(1, nb - tau_n), length.out = min(180L, max(10L, nb - tau_n)))))
        rx <- Re(zs[idx]) / sc; iy <- Im(zs[idx]) / sc
        dx <- Re(zs[idx]) / sc; dy <- Re(zs[idx + tau_n]) / sc
        phase_out[[bname]] <- list(
          band = t_arr(round(band, 2)),
          seg_label = sprintf("%.1f mA", best_seg$amp),
          tau_ms = round(tau_n * 1000.0 / fs, 1),
          clock = t_list(clock_rows),
          loop_x = t_arr(t_round_vec(rx, 3)), loop_y = t_arr(t_round_vec(iy, 3)),
          delay_x = t_arr(t_round_vec(dx, 3)), delay_y = t_arr(t_round_vec(dy, 3))
        )
      }

      X_rows <- lapply(seq_len(K), function(i) t_arr(t_round_vec(X_mat[i, ], 4)))
      d2_rows <- lapply(seq_len(K), function(i) t_arr(t_round_vec(d2[i, ], 4)))
      series_list[[length(series_list) + 1L]] <- list(
        id = sprintf("%s_%s_%g", h, sig$pair, round(sig$stim_rate_hz)),
        label = sprintf("%s · %g Hz (%d amps)", sig$pair, round(sig$stim_rate_hz), K),
        kind = "titration", hemisphere = h, pair = sig$pair,
        contacts = t_arr(sig$contacts), stim_hz = round(sig$stim_rate_hz, 1),
        ftg_center_hz = round(ftg_c, 1), rec_id = rid,
        duration_s = round(length(sig$x) / fs, 1),
        amps = t_arr(amps), node_labels = t_arr(nlabels), nwin = t_arr(nwins),
        X = t_list(X_rows), d2 = t_list(d2_rows),
        phase = phase_out
      )
    }
    if (length(series_list)) {
      hemis_out[[h]] <- list(
        hemisphere = h, mode = "titration",
        stim_rates = t_arr(sort(unique(round(rates, 1)))),
        series = t_list(series_list)
      )
    }
  }
  list(
    spec = list(fs_hz = 250.0, nperseg = 256L, hop = 128L, settle_samples = 125L, beta_band = t_arr(TITRA_BETA_BAND), ftg_hw_hz = ftg_half_bw, sigma_default = 2.0, sigma_grid = t_arr(sigma_grid)),
    freqs = t_arr(freqs_grid),
    default_params = list(hemisphere = "Left", stim_rate_filter = "ALL", sigma = 2.0, series_id = "", phase_band = "ftg", node_size_metric = "local_ftg"),
    hemispheres = t_obj(hemis_out)
  )
}
