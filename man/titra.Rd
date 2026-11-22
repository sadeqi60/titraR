\name{titra}
\alias{titra}
\alias{titraOutput}
\alias{renderTitra}
\alias{titra_server}
\alias{titra_shiny_app}
\alias{run_titra}
\alias{titra_inspect_json}
\alias{titra_parse_percept}
\alias{titra_load_session}
\alias{titra_default_selection}
\title{Titra DBS Programming Studio htmlwidget and Shiny Application}
\description{
Interactive R \code{htmlwidget} and full-screen Shiny application for deep brain
stimulation (DBS) electrophysiology and titration analysis of Medtronic Percept
and amplitude-titration JSON files.
}
\usage{
titra(source = NULL, preset = "beta_ftg", data_dir = NULL,
      width = "100\%", height = "100\%", elementId = NULL)

titraOutput(outputId, width = "100\%", height = "100vh")

renderTitra(expr, env = parent.frame(), quoted = FALSE)

titra_server(id, input, output, session, data_dir = NULL,
             source = NULL, preset = "beta_ftg")

titra_shiny_app(data_dir = NULL, source = NULL, preset = "beta_ftg")

run_titra(data_dir = NULL, source = NULL, preset = "beta_ftg",
          port = getOption("shiny.port"), launch.browser = interactive())

titra_inspect_json(obj, name = "upload.json", size_bytes = 0L)

titra_parse_percept(raw, file_name = "session.json", ftg_half_bw = 4.0)

titra_load_session(source, name = NULL, size_bytes = 0L, ftg_half_bw = 4.0)

titra_default_selection(payload = list())
}
\arguments{
  \item{source}{Optional path to a Percept or amplitude-titration JSON file.}
  \item{preset}{Initial DAG preset name (default \code{"beta_ftg"}).}
  \item{data_dir}{Optional directory of JSON files offered in the LFP Input dropdown.}
  \item{width, height}{CSS dimensions for the widget.}
  \item{elementId}{Optional HTML element ID.}
  \item{outputId, id}{Shiny output ID.}
  \item{expr, env, quoted}{Standard \code{htmlwidgets} render arguments.}
  \item{input, output, session}{Standard Shiny server arguments.}
  \item{port, launch.browser}{Arguments forwarded to \code{shiny::runApp()}.}
  \item{obj, raw}{File path or parsed R list.}
  \item{name, file_name, size_bytes, ftg_half_bw, payload}{Metadata and analysis parameters.}
}
\value{
\code{titra()} returns an \code{htmlwidget}; \code{titra_shiny_app()} returns a
\code{shiny.appobj}; \code{titra_load_session()} returns a verified session list.
}
