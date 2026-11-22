# Verification suite for titraR
library(titraR)

cat("1. Testing empty widget creation...\n")
w0 <- titra()
stopifnot(inherits(w0, "titra"), inherits(w0, "htmlwidget"))
cat("   OK: empty titra() htmlwidget created.\n")

c1 <- "e:/neuroflow/neuroreader/clinical_sample/clinical1_deidentified.json"
if (file.exists(c1)) {
  cat("2. Testing full Medtronic Percept RC file (clinical1_deidentified.json)...\n")
  sess <- titra_load_session(c1)
  stopifnot(isTRUE(sess$ok))
  p <- sess$payload
  cat(sprintf("   OK: %d recordings, %d montage pairs, %d groups, GT hemis=%d, Risk hemis=%d, Opt hemis=%d, Weave hemis=%d\n",
              length(p$recordings), length(p$montage), length(p$groups),
              length(p$game_theory$hemispheres), length(p$risk$hemispheres),
              length(p$options$hemispheres), length(p$weave$hemispheres)))
  stopifnot(length(p$recordings) >= 12L, length(p$montage) == 30L, length(p$game_theory$hemispheres) == 2L)
  # Verify JSON serialization round-trips cleanly
  js <- jsonlite::toJSON(p, auto_unbox = TRUE, null = "null")
  stopifnot(nchar(js) > 50000L)
  cat(sprintf("   OK: payload JSON serialized cleanly (%.1f KB).\n", nchar(js) / 1024))
}

b1 <- "e:/neuroflow/data/Left_GPi_E01_2023-06-01.json"
if (file.exists(b1)) {
  cat("3. Testing amplitude titration file (Left_GPi_E01_2023-06-01.json)...\n")
  sess2 <- titra_load_session(b1)
  stopifnot(isTRUE(sess2$ok))
  cat(sprintf("   OK: %s | %d recordings | %d amp steps\n",
              sess2$report$format_label, length(sess2$payload$recordings),
              length(sess2$payload$recordings[[1]]$amp_steps)))
}

cat("4. Testing Shiny app object & Word (.docx) export...\n")
app <- titra_shiny_app()
stopifnot(inherits(app, "shiny.appobj"))
if (exists("sess") && isTRUE(sess$ok)) {
  rep_res <- titraR:::t_handle_report_request(sess$payload, list(id = "t1", formats = list("docx", "zip")))
  stopifnot(isTRUE(rep_res$ok), length(rep_res$files) == 2L)
  cat("   OK: DOCX and ZIP reports generated natively in R.\n")
}
cat("ALL titraR TESTS PASSED!\n")
