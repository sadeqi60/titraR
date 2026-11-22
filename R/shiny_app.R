# Full-Screen Titra Shiny Application (1:1 mirror of the Titra AnyWidget Studio)

TITRA_FAVICON_DATA_URI <- paste0(
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2032%2032%22%3E",
  "%3Crect%20x%3D%221%22%20y%3D%221%22%20width%3D%2230%22%20height%3D%2230%22%20rx%3D%227%22%20fill%3D%22%23FFFFFF%22%20stroke%3D%22%23D4D8DF%22%20stroke-width%3D%221.4%22%2F%3E",
  "%3Ccircle%20cx%3D%2216%22%20cy%3D%2212.2%22%20r%3D%229.6%22%20fill%3D%22none%22%20stroke%3D%22%23B81D33%22%20stroke-width%3D%221.35%22%20opacity%3D%220.34%22%2F%3E",
  "%3Ccircle%20cx%3D%2216%22%20cy%3D%2212.2%22%20r%3D%226.6%22%20fill%3D%22none%22%20stroke%3D%22%23B81D33%22%20stroke-width%3D%221.65%22%20opacity%3D%220.72%22%2F%3E",
  "%3Crect%20x%3D%2212.4%22%20y%3D%223.2%22%20width%3D%227.2%22%20height%3D%2225.6%22%20rx%3D%223.6%22%20fill%3D%22%231F242C%22%2F%3E",
  "%3Crect%20x%3D%2211.6%22%20y%3D%2222.0%22%20width%3D%228.8%22%20height%3D%222.9%22%20rx%3D%221.0%22%20fill%3D%22%23D4D8DF%22%2F%3E",
  "%3Crect%20x%3D%2211.6%22%20y%3D%2216.4%22%20width%3D%228.8%22%20height%3D%222.9%22%20rx%3D%221.0%22%20fill%3D%22%23D4D8DF%22%2F%3E",
  "%3Crect%20x%3D%2211.6%22%20y%3D%2210.8%22%20width%3D%228.8%22%20height%3D%222.9%22%20rx%3D%221.0%22%20fill%3D%22%23B81D33%22%2F%3E",
  "%3Crect%20x%3D%2211.6%22%20y%3D%225.2%22%20width%3D%228.8%22%20height%3D%222.9%22%20rx%3D%221.0%22%20fill%3D%22%23D4D8DF%22%2F%3E%3C%2Fsvg%3E"
)

#' Build the full-screen Titra Shiny application object
#'
#' Returns a `shiny.appobj` suitable for [shiny::runApp()], Posit Connect, shinyapps.io,
#' or Shinylive. Starts on the Welcome screen and supports drag-and-drop / browse JSON
#' ingestion, 17 presets, custom DAG editing, multi-format reports, and instant Clear.
#'
#' @param data_dir Optional local folder of `.json` files offered in the LFP Input dropdown.
#' @param source Optional `.json` file path to pre-load on startup.
#' @param preset Initial DAG preset name (default `"beta_ftg"`).
#' @return A `shiny.appobj` object.
#' @export
titra_shiny_app <- function(data_dir = NULL, source = NULL, preset = "beta_ftg") {
  options(shiny.maxRequestSize = 200 * 1024^2)

  ui <- htmltools::tagList(
    htmltools::tags$head(
      htmltools::tags$meta(charset = "utf-8"),
      htmltools::tags$meta(name = "viewport", content = "width=device-width, initial-scale=1"),
      htmltools::tags$meta(name = "theme-color", content = "#B81D33"),
      htmltools::tags$title("Titra"),
      htmltools::tags$link(rel = "icon", type = "image/svg+xml", href = TITRA_FAVICON_DATA_URI),
      htmltools::tags$style(htmltools::HTML(
        "html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #FFFFFF; }
         #titra_studio { width: 100vw !important; height: 100vh !important; }
         .nr-studio { height: 100vh !important; min-height: 0 !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; border-bottom: none !important; box-shadow: none !important; }"
      ))
    ),
    titraOutput("titra_studio", width = "100%", height = "100vh")
  )

  server <- function(input, output, session) {
    titra_server("titra_studio", input, output, session, data_dir = data_dir, source = source, preset = preset)
  }

  shiny::shinyApp(ui = ui, server = server)
}

#' Launch the interactive Titra Shiny Studio in your browser
#'
#' @param data_dir Optional local folder containing `.json` files.
#' @param source Optional `.json` file path to pre-load on startup.
#' @param preset Initial DAG preset name (default `"beta_ftg"`).
#' @param port Optional port number.
#' @param launch.browser Whether to open the system browser (default `interactive()`).
#' @export
run_titra <- function(data_dir = NULL, source = NULL, preset = "beta_ftg",
                      port = getOption("shiny.port"), launch.browser = interactive()) {
  app <- titra_shiny_app(data_dir = data_dir, source = source, preset = preset)
  shiny::runApp(app, port = port, launch.browser = launch.browser)
}
