# Utility helpers & JSON-safe constructors for titraR

`%||%` <- function(x, y) {
  if (is.null(x) || length(x) == 0L) y else x
}

# Empty JSON object {} (named empty list serializes as {} in jsonlite)
t_obj <- function(x = NULL) {
  if (is.null(x) || length(x) == 0L) return(structure(list(), names = character(0)))
  x
}

# Guaranteed JSON array [...] even for length 0 or length 1 atomic vectors
t_arr <- function(x) {
  if (is.null(x) || length(x) == 0L) return(list())
  I(unname(x))
}

# Guaranteed JSON array of objects/lists [...]
t_list <- function(x) {
  if (is.null(x) || length(x) == 0L) return(list())
  unname(as.list(x))
}

t_num <- function(x, default = 0.0) {
  v <- suppressWarnings(as.numeric(x)[1])
  if (is.null(v) || length(v) == 0L || is.na(v) || !is.finite(v)) default else v
}

t_str <- function(x, default = "") {
  if (is.null(x) || length(x) == 0L) return(default)
  s <- as.character(x)[1]
  if (is.na(s)) default else s
}

t_strip_enum <- function(val) {
  s <- t_str(val, "")
  if (!nzchar(s)) return("")
  if (grepl(".", s, fixed = TRUE)) sub("^.*\\.", "", s) else s
}

t_human_size <- function(bytes) {
  b <- as.numeric(bytes %||% 0)
  if (!is.finite(b) || b <= 0) return("")
  if (b >= 1e6) return(sprintf("%.1f MB", b / 1e6))
  if (b >= 1e3) return(sprintf("%.0f KB", b / 1e3))
  sprintf("%d B", as.integer(b))
}

TITRA_BETA_BAND <- c(13.0, 30.0)
TITRA_DEFAULT_FTG_HW <- 4.0
TITRA_CONTACTS_ORDER <- c("0", "1", "1a", "1b", "1c", "2", "2a", "2b", "2c", "3")
TITRA_RING_TO_CONTACTS <- list(
  "0" = "0",
  "1" = c("1a", "1b", "1c"),
  "2" = c("2a", "2b", "2c"),
  "3" = "3",
  "1a" = "1a", "1b" = "1b", "1c" = "1c",
  "2a" = "2a", "2b" = "2b", "2c" = "2c"
)

TITRA_TOKEN_MAP <- c(
  ZERO = "0", ONE = "1", TWO = "2", THREE = "3",
  ONE_A = "1a", ONE_B = "1b", ONE_C = "1c",
  TWO_A = "2a", TWO_B = "2b", TWO_C = "2c",
  "0" = "0", "1" = "1", "2" = "2", "3" = "3",
  "1A" = "1a", "1B" = "1b", "1C" = "1c",
  "2A" = "2a", "2B" = "2b", "2C" = "2c",
  E00 = "0", E01 = "1", E02 = "2", E03 = "3",
  E0 = "0", E1 = "1", E2 = "2", E3 = "3",
  "00" = "0", "01" = "1", "02" = "2", "03" = "3"
)

t_normalize_electrode <- function(name) {
  s <- t_strip_enum(name)
  if (!nzchar(s)) return("")
  low <- tolower(s)
  if (grepl("case", low, fixed = TRUE)) return("Case")
  m <- regexec("(?:sensight_|electrode_|contact_)?([0-3][abc]?)$", low)
  rm <- regmatches(low, m)[[1]]
  if (length(rm) >= 2L && nzchar(rm[2])) return(rm[2])
  up <- toupper(s)
  if (up %in% names(TITRA_TOKEN_MAP)) return(unname(TITRA_TOKEN_MAP[up]))
  for (k in names(TITRA_TOKEN_MAP)) {
    kl <- tolower(k)
    if (low == kl || endsWith(low, paste0("_", kl))) return(unname(TITRA_TOKEN_MAP[k]))
  }
  s
}

t_parse_pair_string <- function(raw) {
  s <- toupper(t_strip_enum(raw))
  hemi <- ""
  if (grepl("LEFT", s, fixed = TRUE)) {
    hemi <- "Left"
    s <- gsub("_?LEFT(_RING|_SEGMENT)?", "", s)
  } else if (grepl("RIGHT", s, fixed = TRUE)) {
    hemi <- "Right"
    s <- gsub("_?RIGHT(_RING|_SEGMENT)?", "", s)
  }
  s <- gsub("_(RING|SEGMENT)$", "", s)
  s <- gsub("^_+|_+$", "", s)

  e1 <- ""; e2 <- ""
  if (grepl("_AND_", s, fixed = TRUE)) {
    parts <- strsplit(s, "_AND_", fixed = TRUE)[[1]]
    p1 <- parts[1]; p2 <- if (length(parts) >= 2L) parts[2] else ""
    e1 <- if (p1 %in% names(TITRA_TOKEN_MAP)) unname(TITRA_TOKEN_MAP[p1]) else tolower(p1)
    e2 <- if (p2 %in% names(TITRA_TOKEN_MAP)) unname(TITRA_TOKEN_MAP[p2]) else tolower(p2)
  } else if (grepl("-", s, fixed = TRUE)) {
    parts <- strsplit(s, "-", fixed = TRUE)[[1]]
    e1 <- t_normalize_electrode(parts[1])
    e2 <- if (length(parts) >= 2L) t_normalize_electrode(parts[2]) else ""
  } else {
    toks <- names(TITRA_TOKEN_MAP)[order(-nchar(names(TITRA_TOKEN_MAP)))]
    for (t1 in toks) {
      pref <- paste0(t1, "_")
      if (startsWith(s, pref)) {
        rest <- substr(s, nchar(pref) + 1L, nchar(s))
        if (rest %in% names(TITRA_TOKEN_MAP)) {
          e1 <- unname(TITRA_TOKEN_MAP[t1])
          e2 <- unname(TITRA_TOKEN_MAP[rest])
          break
        }
      }
    }
  }
  if (!nzchar(e1)) e1 <- tolower(s)
  pair_key <- if (nzchar(e2)) paste0(e1, "-", e2) else e1
  list(hemi = hemi, e1 = e1, e2 = e2, pair = pair_key)
}

t_contacts_for_pair <- function(e1, e2, directional = TRUE) {
  out <- character(0)
  for (e in c(e1, e2)) {
    if (!nzchar(e)) next
    if (!directional && e %in% c("0", "1", "2", "3")) {
      out <- unique(c(out, e))
    } else {
      cs <- TITRA_RING_TO_CONTACTS[[e]] %||% e
      out <- unique(c(out, cs))
    }
  }
  out
}

t_parse_iso_seconds <- function(ts) {
  s <- t_str(ts, "")
  if (!nzchar(s)) return(0.0)
  frac <- 0.0
  m <- regexec("\\.([0-9]+)", s)
  rm <- regmatches(s, m)[[1]]
  if (length(rm) >= 2L) {
    frac <- as.numeric(paste0("0.", rm[2]))
    s <- sub("\\.[0-9]+", "", s)
  }
  s <- sub("Z$", "", s)
  t <- suppressWarnings(as.POSIXct(s, format = "%Y-%m-%dT%H:%M:%S", tz = "UTC"))
  if (is.na(t)) return(0.0)
  as.numeric(t) + frac
}

t_round_vec <- function(x, digits = 3L) {
  v <- as.numeric(x)
  v[!is.finite(v)] <- 0.0
  round(v, digits)
}
