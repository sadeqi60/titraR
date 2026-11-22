# htmlwidget constructor, Shiny output/render bindings, and reactive server bridge for titraR

#' Create an interactive Titra DBS Programming Studio htmlwidget
#'
#' R equivalent of the Python `Titra` AnyWidget. Starts on the clean Welcome screen
#' when called with `source = NULL`, or pre-loads a Percept / amplitude-titration JSON file.
#'
#' @param source Optional path to a `.json` file (or `"a.json|b.json"` titration set) to pre-load.
#' @param preset Initial DAG preset name (default `"beta_ftg"`).
#' @param data_dir Optional folder containing `.json` files to list in the LFP Input dropdown.
#' @param width,height Widget dimensions (defaults `"100%"`, `"100vh"`).
#' @param elementId Optional explicit HTML element ID.
#' @return An `htmlwidget` object of class `"titra"`.
#' @export
titra <- function(source = NULL,
                  preset = "beta_ftg",
                  data_dir = NULL,
                  width = "100%",
                  height = "100%",
                  elementId = NULL) {
  payload <- t_obj()
  selection <- titra_default_selection()
  files <- t_scan_data_dir(data_dir)
  input_state <- list(
    data_dir = t_str(data_dir %||% ""),
    files = files,
    loaded = "",
    selected = "",
    report = NULL,
    modality = "lfp"
  )

  if (!is.null(source) && nzchar(t_str(source))) {
    sess <- tryCatch(titra_load_session(source), error = function(e) list(ok = FALSE, error = conditionMessage(e)))
    if (isTRUE(sess$ok)) {
      payload <- sess$payload
      selection <- sess$selection
      input_state$loaded <- t_str(source)
      input_state$selected <- t_str(source)
      input_state$report <- sess$report
      input_state$sources <- t_list(sess$sources)
    } else if (!is.null(sess$report)) {
      input_state$report <- sess$report
      input_state$selected <- t_str(source)
    } else if (!is.null(sess$error)) {
      input_state$error <- sess$error
    }
  }

  has_typst_cli <- nzchar(Sys.which("typst"))
  x <- list(
    payload = payload,
    selection = selection,
    dag_state = t_obj(),
    svg_output = "",
    preset = preset,
    input_state = input_state,
    capabilities = list(wasm = !has_typst_cli, typst = has_typst_cli, docx = TRUE)
  )

  htmlwidgets::createWidget(
    name = "titra",
    x = x,
    width = width,
    height = height,
    package = "titraR",
    elementId = elementId,
    sizingPolicy = htmlwidgets::sizingPolicy(
      defaultWidth = "100%",
      defaultHeight = "920px",
      viewer.fill = TRUE,
      browser.fill = TRUE,
      padding = 0
    )
  )
}

#' Shiny output binding for Titra widget
#'
#' @param outputId Output variable ID.
#' @param width,height CSS dimensions (default `"100%"`, `"100vh"`).
#' @export
titraOutput <- function(outputId, width = "100%", height = "100vh") {
  htmlwidgets::shinyWidgetOutput(outputId, "titra", width, height, package = "titraR")
}

#' Shiny render function for Titra widget
#'
#' @param expr Expression returning a [titra()] widget.
#' @param env Evaluation environment.
#' @param quoted Is `expr` quoted?
#' @export
renderTitra <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) expr <- substitute(expr)
  htmlwidgets::shinyRenderWidget(expr, titraOutput, env, quoted = TRUE)
}

#' Attach full two-way reactive Shiny server handling to a `titraOutput()` widget
#'
#' Handles drag-and-drop / browse JSON uploads (with automatic chunk reassembly for large
#' Percept files), folder scanning, multi-file merging, instant Clear, live selection sync,
#' and report exports (`Word .docx`, `HTML/PDF`, `SVG`, `ZIP`).
#'
#' @param id The `outputId` passed to [titraOutput()].
#' @param input,output,session Shiny server arguments.
#' @param data_dir Optional local folder of `.json` files.
#' @param source Optional initial `.json` file path to pre-load.
#' @param preset Initial DAG preset name.
#' @return A `shiny::reactiveValues` object exposing live `payload`, `selection`, `dag_state`, and `input_state`.
#' @export
titra_server <- function(id, input, output, session, data_dir = NULL, source = NULL, preset = "beta_ftg") {
  rv <- shiny::reactiveValues(
    payload = t_obj(),
    selection = titra_default_selection(),
    dag_state = t_obj(),
    input_state = list(
      data_dir = t_str(data_dir %||% ""),
      files = t_scan_data_dir(data_dir),
      loaded = "",
      selected = "",
      report = NULL,
      modality = "lfp"
    )
  )
  state_env <- new.env(parent = emptyenv())
  state_env$norm <- NULL
  state_env$sources <- list()
  state_env$data_dir <- data_dir
  state_env$chunks <- list()

  output[[id]] <- renderTitra({
    titra(source = source, preset = preset, data_dir = data_dir, width = "100%", height = "100%")
  })

  push_patch <- function(patch) {
    session$sendCustomMessage("titra_update", list(id = id, patch = patch))
  }

  process_input_request <- function(req) {
    if (is.null(req) || is.null(req$id)) return()
    t0 <- proc.time()[["elapsed"]]
    action <- t_str(req$action %||% "")
    st <- shiny::isolate(rv$input_state)
    st$id <- req$id
    st$action <- action
    st$error <- ""

    patch <- list()
    tryCatch({
      if (action == "scan") {
        if (!is.null(req$data_dir) && nzchar(t_str(req$data_dir))) state_env$data_dir <- t_str(req$data_dir)
        st$data_dir <- t_str(state_env$data_dir %||% "")
        st$files <- t_scan_data_dir(state_env$data_dir)
      } else if (action == "clear") {
        state_env$norm <- NULL
        state_env$sources <- list()
        st$report <- NULL
        st$selected <- ""
        st$loaded <- ""
        st$add_result <- NULL
        st$sources <- list()
        rv$payload <- t_obj()
        rv$selection <- titra_default_selection()
        patch$selection <- rv$selection
        patch$payload <- t_obj()
      } else if (action %in% c("inspect_load", "load", "inspect")) {
        src <- t_str(req$path %||% "")
        if (!nzchar(src)) stop("Choose a JSON file first.")
        sess <- titra_load_session(src, ftg_half_bw = t_num(shiny::isolate(rv$selection$ftg_half_bw_hz), 4.0))
        st$report <- sess$report
        st$selected <- src
        st$add_result <- NULL
        if (isTRUE(sess$ok) && action != "inspect") {
          state_env$norm <- sess$norm
          state_env$sources <- sess$sources
          st$loaded <- src
          st$sources <- t_list(sess$sources)
          rv$selection <- sess$selection
          rv$payload <- sess$payload
          patch$selection <- sess$selection
          patch$payload <- sess$payload
        }
      } else if (action %in% c("upload", "upload_inspect", "upload_load")) {
        fname <- t_str(req$name %||% "upload.json")
        b64 <- t_str(req$b64 %||% "")
        if (!nzchar(b64)) stop("Upload the file again.")
        raw_bytes <- base64enc::base64decode(b64)
        txt <- rawToChar(raw_bytes)
        Encoding(txt) <- "UTF-8"
        raw_obj <- jsonlite::fromJSON(txt, simplifyVector = FALSE)
        sess <- titra_load_session(raw_obj, name = fname, size_bytes = length(raw_bytes),
                                   ftg_half_bw = t_num(shiny::isolate(rv$selection$ftg_half_bw_hz), 4.0))
        st$report <- sess$report
        st$selected <- paste0("upload:", fname)
        st$add_result <- NULL
        if (isTRUE(sess$ok) && action %in% c("upload", "upload_load")) {
          state_env$norm <- sess$norm
          state_env$sources <- sess$sources
          st$loaded <- paste0("upload:", fname)
          st$sources <- t_list(sess$sources)
          rv$selection <- sess$selection
          rv$payload <- sess$payload
          patch$selection <- sess$selection
          patch$payload <- sess$payload
        }
      } else if (action == "add") {
        items <- list()
        if (!is.null(req$path) && nzchar(t_str(req$path))) {
          for (p in strsplit(t_str(req$path), "|", fixed = TRUE)[[1]]) {
            items[[length(items) + 1L]] <- list(name = basename(p), size = file.info(p)$size, obj = jsonlite::fromJSON(p, simplifyVector = FALSE))
          }
        }
        for (f in req$files %||% list()) {
          rb <- base64enc::base64decode(t_str(f$b64 %||% ""))
          tx <- rawToChar(rb); Encoding(tx) <- "UTF-8"
          items[[length(items) + 1L]] <- list(name = t_str(f$name, "upload.json"), size = length(rb), obj = jsonlite::fromJSON(tx, simplifyVector = FALSE))
        }
        if (!length(items)) stop("Choose a JSON file to add.")
        if (isTRUE(req$replace) || is.null(state_env$norm)) {
          first <- items[[1]]
          sess <- titra_load_session(first$obj, name = first$name, size_bytes = first$size)
          if (!isTRUE(sess$ok)) {
            st$report <- sess$report
          } else {
            norm <- sess$norm
            sources <- sess$sources
            for (it in items[-1L]) {
              f2 <- t_detect_format(it$obj)
              n2 <- if (f2 == "bravo") t_bravo_to_percept(it$obj, it$name) else it$obj
              mg <- t_merge_normalized(norm, n2, it$name)
              norm <- mg$norm
              sources[[length(sources) + 1L]] <- list(name = it$name, size = t_human_size(it$size), added = mg$summary)
            }
            parsed <- titra_parse_percept(norm, file_name = first$name)
            rep <- titra_inspect_json(norm, name = first$name, size_bytes = first$size)
            rep$sources <- t_list(sources)
            state_env$norm <- norm; state_env$sources <- sources
            st$report <- rep; st$loaded <- paste0("upload:", first$name); st$selected <- st$loaded
            st$sources <- t_list(sources); st$add_result <- NULL
            rv$selection <- titra_default_selection(parsed$payload)
            rv$payload <- parsed$payload
            patch$selection <- rv$selection
            patch$payload <- rv$payload
          }
        } else {
          norm <- state_env$norm; sources <- state_env$sources
          msgs <- character(0)
          for (it in items) {
            f2 <- t_detect_format(it$obj)
            if (f2 == "unknown") stop(sprintf("%s is not a supported LFP JSON format.", it$name))
            n2 <- if (f2 == "bravo") t_bravo_to_percept(it$obj, it$name) else it$obj
            mg <- t_merge_normalized(norm, n2, it$name)
            norm <- mg$norm
            sources[[length(sources) + 1L]] <- list(name = it$name, size = t_human_size(it$size), added = mg$summary)
            msgs <- c(msgs, mg$summary)
          }
          parsed <- titra_parse_percept(norm, file_name = sources[[1]]$name)
          parsed$payload$metadata$merged <- TRUE
          rep <- titra_inspect_json(norm, name = paste(vapply(sources, `[[`, character(1), "name"), collapse = " + "))
          rep$sources <- t_list(sources)
          state_env$norm <- norm; state_env$sources <- sources
          st$report <- rep; st$sources <- t_list(sources)
          st$add_result <- list(ok = TRUE, files = t_arr(vapply(items, `[[`, character(1), "name")),
                                message = paste("Added:", paste(msgs, collapse = "; ")), warnings = list())
          rv$selection <- titra_default_selection(parsed$payload)
          rv$payload <- parsed$payload
          patch$selection <- rv$selection
          patch$payload <- rv$payload
        }
      }
    }, error = function(e) {
      st$error <<- conditionMessage(e)
      if (action == "add") {
        st$add_result <<- list(ok = FALSE, conflicts = t_arr(conditionMessage(e)),
                               message = paste("Could not merge file:", conditionMessage(e)))
      }
    })

    st$elapsed_s <- round(proc.time()[["elapsed"]] - t0, 2)
    rv$input_state <- st
    patch$input_state <- st
    push_patch(patch)
  }

  # Direct small input_request
  shiny::observeEvent(input[[paste0(id, "_input_request")]], {
    process_input_request(input[[paste0(id, "_input_request")]])
  }, ignoreNULL = TRUE)

  # Chunked large upload reassembly (handles 15MB–150MB Percept JSONs smoothly over Shiny WS)
  shiny::observeEvent(input[[paste0(id, "_input_chunk")]], {
    ch <- input[[paste0(id, "_input_chunk")]]
    if (is.null(ch) || is.null(ch$tx)) return()
    tx <- t_str(ch$tx)
    idx <- as.integer(ch$index) + 1L
    tot <- as.integer(ch$total)
    if (is.null(state_env$chunks[[tx]])) state_env$chunks[[tx]] <- character(tot)
    state_env$chunks[[tx]][idx] <- t_str(ch$data)
    if (all(nzchar(state_env$chunks[[tx]]))) {
      full_json <- paste(state_env$chunks[[tx]], collapse = "")
      state_env$chunks[[tx]] <- NULL
      req <- jsonlite::fromJSON(full_json, simplifyVector = FALSE)
      process_input_request(req)
    }
  }, ignoreNULL = TRUE)

  # Report / export requests (direct + chunked for multi-MB PDF/PNG/SVG bundles)
  process_report_request <- function(req) {
    if (is.null(req) || is.null(req$id)) return()
    res <- tryCatch(
      t_handle_report_request(shiny::isolate(rv$payload), req),
      error = function(e) list(id = req$id, ok = FALSE, error = conditionMessage(e), elapsed_s = 0)
    )
    push_patch(list(report_result = res))
  }

  shiny::observeEvent(input[[paste0(id, "_report_request")]], {
    process_report_request(input[[paste0(id, "_report_request")]])
  }, ignoreNULL = TRUE)

  shiny::observeEvent(input[[paste0(id, "_report_chunk")]], {
    ch <- input[[paste0(id, "_report_chunk")]]
    if (is.null(ch) || is.null(ch$tx)) return()
    tx <- t_str(ch$tx)
    idx <- as.integer(ch$index) + 1L
    tot <- as.integer(ch$total)
    if (is.null(state_env$chunks[[tx]])) state_env$chunks[[tx]] <- character(tot)
    state_env$chunks[[tx]][idx] <- t_str(ch$data)
    if (all(nzchar(state_env$chunks[[tx]]))) {
      full_json <- paste(state_env$chunks[[tx]], collapse = "")
      state_env$chunks[[tx]] <- NULL
      req <- jsonlite::fromJSON(full_json, simplifyVector = FALSE)
      process_report_request(req)
    }
  }, ignoreNULL = TRUE)

  # Live two-way sync back into R reactiveValues
  shiny::observeEvent(input[[paste0(id, "_selection")]], {
    rv$selection <- input[[paste0(id, "_selection")]]
  }, ignoreNULL = TRUE)
  shiny::observeEvent(input[[paste0(id, "_dag_state")]], {
    rv$dag_state <- input[[paste0(id, "_dag_state")]]
  }, ignoreNULL = TRUE)

  rv
}
