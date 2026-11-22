/* Titra htmlwidgets binding — 1:1 AnyWidget traitlet bridge for R & Shiny */
(function () {
  var _registry = {};
  var _handlerInstalled = false;

  function resolveDagEsmUrl(explicitUrl) {
    if (explicitUrl) return explicitUrl;
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      if (href.indexOf("nr_dag.css") !== -1) {
        return new URL(href.replace("nr_dag.css", "nr_dag.js"), window.location.href).href;
      }
    }
    return new URL("nr_dag.js", window.location.href).href;
  }

  function installShinyHandler() {
    if (_handlerInstalled || typeof window.Shiny === "undefined") return;
    _handlerInstalled = true;
    window.Shiny.addCustomMessageHandler("titra_update", function (msg) {
      if (!msg || !msg.id) return;
      var inst = _registry[msg.id];
      if (!inst) return;
      inst.applyServerPatch(msg.patch || {});
    });
  }

  function sendChunkedRequest(directKey, chunkKey, req) {
    if (typeof window.Shiny === "undefined") return;
    var raw = JSON.stringify(req || {});
    var CHUNK = 900000; // ~900 KB safe for all Shiny/proxy WebSockets
    if (raw.length <= CHUNK) {
      window.Shiny.setInputValue(directKey, req, { priority: "event" });
      return;
    }
    var txId = "tx_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    var total = Math.ceil(raw.length / CHUNK);
    var idx = 0;
    function sendNext() {
      var slice = raw.slice(idx * CHUNK, (idx + 1) * CHUNK);
      window.Shiny.setInputValue(
        chunkKey,
        { tx: txId, index: idx, total: total, data: slice },
        { priority: "event" }
      );
      idx++;
      if (idx < total) setTimeout(sendNext, 12);
    }
    sendNext();
  }

  HTMLWidgets.widget({
    name: "titra",
    type: "output",

    factory: function (el, width, height) {
      var cleanupFn = null;
      var listeners = {};
      var dirtyKeys = new Set();
      var store = {
        payload: {},
        selection: {},
        dag_state: {},
        svg_output: "",
        preset: "beta_ftg",
        report_request: {},
        report_result: {},
        input_request: {},
        input_state: { data_dir: "", files: [], loaded: "", report: null, modality: "lfp" },
        capabilities: { wasm: true, typst: false, docx: true },
      };

      function emit(ev) {
        var list = listeners[ev] || [];
        for (var i = 0; i < list.length; i++) {
          try { list[i](); } catch (e) { console.error("Titra listener error:", ev, e); }
        }
      }

      var model = {
        get: function (k) { return store[k]; },
        set: function (k, v) {
          store[k] = v;
          dirtyKeys.add(k);
        },
        save_changes: function () {
          var keys = Array.from(dirtyKeys);
          dirtyKeys.clear();
          if (typeof window.Shiny === "undefined" || !el.id) return;
          for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (k === "input_request") {
              sendChunkedRequest(el.id + "_input_request", el.id + "_input_chunk", store.input_request);
            } else if (k === "report_request") {
              sendChunkedRequest(el.id + "_report_request", el.id + "_report_chunk", store.report_request);
            } else if (k === "selection" || k === "dag_state" || k === "preset") {
              window.Shiny.setInputValue(el.id + "_" + k, store[k]);
            } else if (k === "svg_output") {
              // Avoid blasting multi-MB SVGs on every move unless requested
              window.Shiny.setInputValue(el.id + "_svg_output", store.svg_output);
            }
          }
        },
        on: function (ev, fn) {
          if (!listeners[ev]) listeners[ev] = [];
          listeners[ev].push(fn);
        },
        off: function (ev, fn) {
          if (!listeners[ev]) return;
          listeners[ev] = listeners[ev].filter(function (x) { return x !== fn; });
        },
      };

      function applyServerPatch(patch) {
        // Apply selection before payload so nr_dag.js reads updated selection on change:payload
        var order = ["capabilities", "selection", "preset", "payload", "input_state", "report_result", "dag_state"];
        var seen = new Set();
        for (var i = 0; i < order.length; i++) {
          var k = order[i];
          if (Object.prototype.hasOwnProperty.call(patch, k)) {
            seen.add(k);
            store[k] = patch[k];
            emit("change:" + k);
          }
        }
        Object.keys(patch).forEach(function (k) {
          if (!seen.has(k)) {
            store[k] = patch[k];
            emit("change:" + k);
          }
        });
      }

      installShinyHandler();

      return {
        renderValue: function (x) {
          installShinyHandler();
          if (el.id) {
            _registry[el.id] = { applyServerPatch: applyServerPatch, model: model };
          }
          if (cleanupFn) {
            try { cleanupFn(); } catch (_) {}
            cleanupFn = null;
          }
          listeners = {};
          dirtyKeys.clear();

          // Seed initial traitlets from R
          var initKeys = ["payload", "selection", "dag_state", "svg_output", "preset", "input_state", "capabilities", "report_result"];
          for (var i = 0; i < initKeys.length; i++) {
            var k = initKeys[i];
            if (x && Object.prototype.hasOwnProperty.call(x, k) && x[k] !== null && typeof x[k] !== "undefined") {
              store[k] = x[k];
            }
          }

          el.style.width = "100%";
          el.style.height = "100%";
          var esmUrl = resolveDagEsmUrl(x && x.esm_url);
          import(esmUrl)
            .then(function (mod) {
              var api = mod && (mod.default || mod);
              if (!api || typeof api.render !== "function") {
                throw new Error("Titra module did not export render()");
              }
              var res = api.render({ model: model, el: el });
              if (typeof res === "function") cleanupFn = res;
              if (typeof window.Shiny !== "undefined" && el.id) {
                window.Shiny.setInputValue(el.id + "_ready", Date.now(), { priority: "event" });
              }
            })
            .catch(function (err) {
              el.innerHTML =
                '<div style="padding:24px;font-family:Georgia,serif;color:#B81D33;border:2px solid #B81D33;border-radius:8px;background:#FBF0F2">' +
                "<strong>Titra widget failed to load:</strong> " + String(err && err.message ? err.message : err) +
                "</div>";
              console.error("Titra htmlwidget load error:", err);
            });
        },

        resize: function (w, h) {
          window.dispatchEvent(new Event("resize"));
        },
      };
    },
  });
})();
