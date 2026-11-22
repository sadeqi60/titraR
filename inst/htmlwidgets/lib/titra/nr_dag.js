/* Titra — DBS programming studio (formerly neuroReader). Interactive DBS lead & electrophysiology DAG canvas.
 *
 * Strict editorial palette: Crimson (#B81D33), Black (#111317), Cool Gray (#4B5563 / #6B7280),
 * Silver (#D4D8DF / #E8EBF0), and White (#FFFFFF / #F7F8FA).
 * Unified LaTeX/KaTeX editorial typography (KaTeX_Main / Latin Modern Roman / STIX Two Text / Harding / Georgia), min font size 14px.
 */

const C = {
  crimson: "#B81D33",
  crimsonDark: "#8E1225",
  crimsonSoft: "rgba(184, 29, 51, 0.13)",
  crimsonTint: "#FBF0F2",
  black: "#111317",
  ink: "#1F242C",
  grayDark: "#4B5563",
  gray: "#6B7280",
  grayLight: "#9CA3AF",
  silver: "#D4D8DF",
  silverSoft: "#E8EBF0",
  alabaster: "#F7F8FA",
  white: "#FFFFFF",
};

const FONT_SANS = '"KaTeX_Main", "Latin Modern Roman", "STIX Two Text", "Harding", Georgia, "Times New Roman", serif';
const FONT_SERIF = '"KaTeX_Main", "Latin Modern Roman", "STIX Two Text", "Harding", Georgia, "Times New Roman", serif';
// On-screen legibility: object bodies are drawn at 1/BODY_SCALE of their box and scaled up, so every
// label, tick and line inside an object is BODY_SCALE× larger (exports keep the 1:1 drawing).
const BODY_SCALE = 1.4;
// Heights (world px) of the HTML rows above an object's body — keep in sync with nr_dag.css
const CHROME = { header: 60, sub: 56, form: 44, sliders: 52, pad: 6 };
// The default view (after loading / switching preset) never zooms out below this: headers and
// labels stay readable; Fit (toolbar) still shows the whole DAG.
const DEFAULT_MIN_ZOOM = 0.62;
const LAYOUT_TALL = 1.22;
const CONTACTS = ["0", "1a", "1b", "1c", "2a", "2b", "2c", "3"];
const RING_CONTACTS = ["0", "1", "2", "3"];
const CONTACT_ORDER = ["0", "1", "1a", "1b", "1c", "2", "2a", "2b", "2c", "3"];
const SVG_NS = "http://www.w3.org/2000/svg";

const NODE_CATALOG = {
  input:         { label: "LFP Input",                   badge: "INPUT",  w: 820, h: 600, desc: "Drag & drop / browse a JSON file · detect, verify & load LFP data" },
  lead:          { label: "DBS Lead Model",              badge: "LEAD",   w: 680, h: 890, desc: "Realistic directional SenSight lead" },
  ftg_controller:{ label: "FTG Half-Band Controller",    badge: "FTG Δf", w: 680, h: 225, desc: "Control Δf around f_stim / 2 live" },
  lfp:           { label: "LFP Time-Domain",             badge: "LFP",    w: 720, h: 440, desc: "250 Hz LFP trace + mA staircase" },
  psd:           { label: "Power Spectral Density",      badge: "PSD",    w: 700, h: 460, desc: "Welch / Survey PSD · Beta & FTG" },
  spectrogram:   { label: "STFT Spectrogram",            badge: "STFT",   w: 720, h: 460, desc: "Time–frequency map · Beta & FTG" },
  beta_ftg:      { label: "Beta & FTG Dynamics",         badge: "β/FTG",  w: 720, h: 460, desc: "Envelope, dose–response & freq sweep" },
  montage:       { label: "Directional Montage",         badge: "MNTG",   w: 700, h: 540, desc: "Bipolar pairs · Beta & FTG rank" },
  phase:         { label: "Hilbert Phase Portrait",      badge: "PHASE",  w: 660, h: 460, desc: "Analytic phasor loops · Beta & FTG" },
  impedance:     { label: "Impedance Matrix",            badge: "IMP",    w: 640, h: 520, desc: "Monopolar & 8×8 bipolar Ω" },
  therapy:       { label: "Therapy Groups",              badge: "STIM",   w: 700, h: 460, desc: "Groups A–D · cathodes, rate & FTG" },
  trend:         { label: "Chronic LFP Trend",           badge: "TREND",  w: 720, h: 440, desc: "Multi-day LFP & stimulation mA" },
  inspector:     { label: "JSON Data Inspector",         badge: "JSON",   w: 620, h: 500, desc: "Select JSON fields into Python" },
  gt_arms:       { label: "GT · Arms & Utility Arena",   badge: "ARMS",   w: 920, h: 640, desc: "NeuroGame arena · layered boundaries & patterns" },
  gt_nash:       { label: "GT · Nash Bargaining & Pareto", badge: "NBS",  w: 740, h: 540, desc: "Efficacy Δβ vs Safety Pareto frontier" },
  gt_minimax:    { label: "GT · Minimax & Zero-Sum Nash",badge: "NASH",   w: 760, h: 540, desc: "Clinician vs Nature · MWU mix & matrix" },
  gt_stackelberg:{ label: "GT · Stackelberg Leader–Follower", badge: "STACK", w: 760, h: 540, desc: "Fitted β-sigmoid, FTG-hinge & robust U(a)" },
  gt_bandit:     { label: "GT · Live Multi-Armed Bandit",badge: "BANDIT", w: 920, h: 620, desc: "NeuroGame bandit · CI vs truth & regret" },
  gt_consensus:  { label: "GT · 7-Method Consensus Board", badge: "VOTE", w: 800, h: 540, desc: "Majority vote with pattern & boundary key" },
  risk_map:      { label: "Risk · Tail Risk Arena & VaR Map", badge: "RISK", w: 920, h: 660, desc: "Contact × mA tail risk map · CVaR, EVT-VaR & 5 rules" },
  risk_envelope: { label: "Risk · Envelope & Red-Line Breaches", badge: "BREACH", w: 780, h: 500, desc: "Causal RMS ratio z(t), POT red line u & clusters" },
  risk_tail:     { label: "Risk · Tail Survival & EVT-VaR", badge: "TAIL", w: 740, h: 540, desc: "Log-survival GPD tail, MRL & ξ threshold diagnostics" },
  risk_return:   { label: "Risk · POT & GEV Return Levels", badge: "GEV", w: 740, h: 540, desc: "0 mA POT (90% CI) & shared-ξ GEV return levels" },
  risk_breach:   { label: "Risk · Breach Rate λ(a) & P(Breach)", badge: "RATE", w: 760, h: 540, desc: "Poisson cluster rate λ(a), P(breach in H) & ε safe zone" },
  risk_selection:{ label: "Risk · 5-Rule Selection & Backtest", badge: "SELECT", w: 820, h: 540, desc: "5 risk-based picks & Kupiec VaR calibration test" },
  opt_arena:     { label: "Opt · Premium Map & Strategy Arena", badge: "OPT", w: 920, h: 660, desc: "Contact × mA portfolio Π map · 7 strategies & 5 rules" },
  opt_payoff:    { label: "Opt · Payoff, Density & Calibration", badge: "PAYOFF", w: 760, h: 540, desc: "Payoff f(S_T), log-OU density, market hist & calibration" },
  opt_lattice:   { label: "Opt · American Lattice & aDBS Trigger", badge: "TREE", w: 780, h: 540, desc: "Nelson–Ramaswamy mean-reverting tree & boundary S*(t)" },
  opt_chain:     { label: "Opt · Option Chain & Greeks", badge: "GREEKS", w: 820, h: 560, desc: "Strikes K · Call, Put, Δ, Γ, Vega & Θ/s table" },
  opt_smile:     { label: "Opt · Alpha ∂Π/∂a & IV Smile", badge: "SMILE", w: 760, h: 540, desc: "Fitted Π(a) Alpha curve (a*) & implied-vol smile IV(K)" },
  opt_selection: { label: "Opt · 5-Rule Selection & Log-OU", badge: "PICK", w: 820, h: 540, desc: "Portfolio/strategy/FTG/aDBS/Alpha picks & log-OU table" },
  gsp_graph:     { label: "GSP · Amplitude-State Graph & Fiedler", badge: "GRAPH", w: 920, h: 640, desc: "Amplitude-state graph G(V,E,W) · Fiedler u₂ & live σ" },
  gsp_matrix:    { label: "GSP · Graph Operator Matrix Explorer",  badge: "MAT",   w: 720, h: 540, desc: "Affinity W, Laplacian L, Normalized L_sym & distance d²" },
  gsp_gft:       { label: "GSP · Graph Fourier Modes & Log-PSD",   badge: "GFT",   w: 780, h: 520, desc: "L_sym eigenmodes E_k(β/FTG), μ_k & node-pooled Welch PSD" },
  gsp_gtv:       { label: "GSP · GTV(f), LGFE(f), GSE(f) & KPIs",  badge: "GSP",   w: 840, h: 540, desc: "6-KPI GSP biomarker strip & frequency profiles" },
  gsp_phase:     { label: "GSP · Phase Clock & Takens Delay",      badge: "CLOCK", w: 720, h: 520, desc: "Hilbert resultant R(a) clock, Takens Φ_τ & phase loop" },
  gsp_sweep:     { label: "GSP · Kernel σ-Sweep & Contact Board",  badge: "SIGMA", w: 800, h: 520, desc: "Kernel σ-sensitivity sweep & multi-series GSP ranking" },
};

// Input modalities: every pipeline starts from an input object. Only LFP (JSON) exists today;
// MRI / CT are reserved so future imaging pipelines can plug in the same way.
const INPUT_MODALITIES = {
  lfp: { label: "LFP Input", type: "input", accept: ".json,application/json", available: true, desc: "Percept / titration JSON" },
  mri: { label: "MRI Input", type: "input_mri", accept: ".nii,.nii.gz,.dcm", available: false, desc: "planned" },
  ct: { label: "CT Input", type: "input_ct", accept: ".nii,.nii.gz,.dcm", available: false, desc: "planned" },
};

// Object types used by each preset (for applicability badges in the preset menu)
const PRESET_TYPES = {
  beta_ftg: ["lfp", "psd", "spectrogram", "beta_ftg", "ftg_controller"],
  directional_survey: ["montage", "psd", "impedance", "therapy"],
  freq_sweep: ["beta_ftg", "phase", "spectrogram", "trend"],
  gt_arms_arena: ["lfp", "psd", "beta_ftg", "ftg_controller", "gt_arms"],
  gt_nash_stackelberg: ["gt_arms", "gt_nash", "gt_minimax", "gt_stackelberg", "gt_consensus", "ftg_controller"],
  gt_bandit_studio: ["gt_arms", "gt_bandit", "gt_stackelberg", "gt_consensus", "ftg_controller"],
  gt_complete: ["gt_arms", "gt_nash", "gt_minimax", "gt_stackelberg", "gt_bandit", "gt_consensus", "ftg_controller"],
  risk_arena: ["risk_map", "risk_envelope", "risk_breach", "risk_selection", "ftg_controller"],
  risk_evt_suite: ["risk_map", "risk_tail", "risk_return", "risk_breach", "risk_selection"],
  risk_complete: ["risk_map", "risk_envelope", "risk_tail", "risk_return", "risk_breach", "risk_selection", "ftg_controller"],
  opt_desk: ["opt_arena", "opt_payoff", "opt_lattice", "opt_selection", "ftg_controller"],
  opt_greeks_alpha: ["opt_arena", "opt_chain", "opt_lattice", "opt_smile", "opt_selection"],
  opt_complete: ["opt_arena", "opt_payoff", "opt_lattice", "opt_chain", "opt_smile", "opt_selection", "ftg_controller"],
  gsp_pipeline: ["lfp", "gsp_graph", "gsp_gft", "gsp_gtv", "ftg_controller"],
  gsp_operators: ["gsp_graph", "gsp_matrix", "gsp_phase", "gsp_sweep"],
  gsp_complete: ["gsp_graph", "gsp_matrix", "gsp_gft", "gsp_gtv", "gsp_phase", "gsp_sweep", "ftg_controller"],
  minimal_lead: [],
};

const NODE_FORMULAS = {
  input: {
    tex: String.raw`\mathrm{JSON}\;\rightarrow\;\mathrm{detect}\;\rightarrow\;\mathrm{verify}\;\rightarrow\;\mathrm{normalise}\;\rightarrow\;\mathrm{DAG}`,
    html: `JSON &rarr; detect &rarr; verify &rarr; normalise &rarr; DAG`,
  },
  lead: {
    tex: String.raw`\mathrm{SenSight\;B33005}:\;\{0,\,1\mathrm{a/b/c},\,2\mathrm{a/b/c},\,3\},\quad f_{\mathrm{FTG}}=\tfrac{1}{2}f_{\mathrm{stim}}`,
    html: `SenSight B33005: {0, 1a/b/c, 2a/b/c, 3} &nbsp;&middot;&nbsp; <i>f</i><sub>FTG</sub> = <i>f</i><sub>stim</sub>/2`,
  },
  ftg_controller: {
    tex: String.raw`\mathrm{FTG}=\left[\frac{f_{\mathrm{stim}}}{2}-\Delta f,\;\frac{f_{\mathrm{stim}}}{2}+\Delta f\right],\quad \mathrm{FTG}_{\mathrm{dB}}=10\log_{10}\!\left(\frac{\bar{P}_{\mathrm{FTG}}}{\tilde{P}_{\mathrm{neigh}}}\right)`,
    html: `FTG = [<i>f</i><sub>stim</sub>/2 &minus; &Delta;<i>f</i>, <i>f</i><sub>stim</sub>/2 + &Delta;<i>f</i>] &nbsp;&middot;&nbsp; FTG<sub>dB</sub> = 10 log<sub>10</sub>(<i>P&#772;</i><sub>FTG</sub> / <i>P&#771;</i><sub>neigh</sub>)`,
  },
  lfp: {
    tex: String.raw`x(t)\;[\mu\mathrm{V}],\quad f_{s}=250\,\mathrm{Hz},\quad \mathrm{RMS}=\sqrt{\frac{1}{N}\sum_{n=1}^{N}x_{n}^{2}}`,
    html: `<i>x</i>(<i>t</i>) [&mu;V] &nbsp;&middot;&nbsp; <i>f</i><sub>s</sub> = 250 Hz &nbsp;&middot;&nbsp; RMS = &radic;(<i>N</i><sup>&minus;1</sup>&Sigma;<i>x</i><sub>n</sub><sup>2</sup>)`,
  },
  psd: {
    tex: String.raw`P_{\mathrm{dB}}(f)=10\log_{10}\!\big(\hat{S}_{xx}(f)\big),\quad \beta=[13,30]\,\mathrm{Hz},\quad \mathrm{FTG}=\tfrac{f_{\mathrm{stim}}}{2}\pm\Delta f`,
    html: `<i>P</i><sub>dB</sub>(<i>f</i>) = 10 log<sub>10</sub>(<i>S&#770;</i><sub>xx</sub>(<i>f</i>)) &nbsp;&middot;&nbsp; &beta; = [13, 30] Hz &nbsp;&middot;&nbsp; FTG = <i>f</i><sub>stim</sub>/2 &plusmn; &Delta;<i>f</i>`,
  },
  spectrogram: {
    tex: String.raw`S(t,f)=10\log_{10}\!\left|\mathrm{STFT}\{x\}(t,f)\right|^{2},\quad \beta=[13,30],\;f_{\mathrm{FTG}}=\tfrac{f_{\mathrm{stim}}}{2}`,
    html: `<i>S</i>(<i>t</i>, <i>f</i>) = 10 log<sub>10</sub> |STFT{<i>x</i>}(<i>t</i>, <i>f</i>)|<sup>2</sup>`,
  },
  beta_ftg: {
    tex: String.raw`\Delta\beta_{\mathrm{dB}}=\bar{\beta}_{\mathrm{dB}}(0\,\mathrm{mA})-\beta_{\mathrm{dB}}(a),\quad R_{\mathrm{FTG}/\beta}=\frac{P_{\mathrm{FTG}}}{P_{\beta}}`,
    html: `&Delta;&beta;<sub>dB</sub> = &beta;&#772;<sub>dB</sub>(0 mA) &minus; &beta;<sub>dB</sub>(<i>a</i>) &nbsp;&middot;&nbsp; <i>R</i> = <i>P</i><sub>FTG</sub> / <i>P</i><sub>&beta;</sub>`,
  },
  montage: {
    tex: String.raw`V_{ij}(t)=V_{i}(t)-V_{j}(t),\quad (i,j)^{*}=\arg\max_{(i,j)}P_{\beta,\mathrm{FTG}}(i,j)`,
    html: `<i>V</i><sub><i>ij</i></sub>(<i>t</i>) = <i>V</i><sub><i>i</i></sub>(<i>t</i>) &minus; <i>V</i><sub><i>j</i></sub>(<i>t</i>) &nbsp;&middot;&nbsp; argmax <i>P</i><sub>&beta;,FTG</sub>(<i>i</i>,<i>j</i>)`,
  },
  phase: {
    tex: String.raw`z(t)=x_{\mathrm{band}}(t)+i\,\mathcal{H}\{x_{\mathrm{band}}(t)\},\quad A(t)=|z(t)|>1.25\,\mathrm{RMS}`,
    html: `<i>z</i>(<i>t</i>) = <i>x</i><sub>band</sub>(<i>t</i>) + <i>i</i> &HilbertSpace;{<i>x</i><sub>band</sub>(<i>t</i>)} &nbsp;&middot;&nbsp; Burst: |<i>z</i>(<i>t</i>)| &gt; 1.25 RMS`,
  },
  impedance: {
    tex: String.raw`Z_{ij}=\left|\frac{V_{ij}}{I_{\mathrm{test}}}\right|\;[\Omega],\quad Z_{i,\mathrm{case}}\;\mathrm{(monopolar)}`,
    html: `<i>Z</i><sub><i>ij</i></sub> = |<i>V</i><sub><i>ij</i></sub> / <i>I</i><sub>test</sub>| [&Omega;]`,
  },
  therapy: {
    tex: String.raw`Q_{\mathrm{pulse}}=I\cdot\mathrm{PW},\quad E\propto I^{2},\quad f_{\mathrm{FTG}}=\tfrac{1}{2}f_{\mathrm{stim}}`,
    html: `<i>Q</i><sub>pulse</sub> = <i>I</i> &middot; PW &nbsp;&middot;&nbsp; <i>f</i><sub>FTG</sub> = <i>f</i><sub>stim</sub>/2`,
  },
  trend: {
    tex: String.raw`\mathrm{LFP}(d)\;\mathrm{vs.}\;I(d)\;[\mathrm{mA}]\;\mathrm{across\;chronic\;days}\;d`,
    html: `LFP(<i>d</i>) vs. <i>I</i>(<i>d</i>) [mA]`,
  },
  gt_arms: {
    tex: String.raw`U(a)=w_{\beta}\,\Delta\beta_{\mathrm{dB}}-w_{F}\max(0,\,\mathrm{FTG}_{\mathrm{dB}}-\tau)-6\,w_{E}\!\left(\frac{a}{a_{\max}}\right)^{2}`,
    html: `<i>U</i>(<i>a</i>) = <i>w</i><sub>&beta;</sub>&Delta;&beta;<sub>dB</sub> &minus; <i>w</i><sub>F</sub> max(0, FTG<sub>dB</sub> &minus; &tau;) &minus; 6<i>w</i><sub>E</sub>(<i>a</i>/<i>a</i><sub>max</sub>)<sup>2</sup>`,
  },
  gt_nash: {
    tex: String.raw`a_{\mathrm{NBS}}^{*}=\arg\max_{a\in\mathcal{A}}\,(u_{1}(a)-d_{1})(u_{2}(a)-d_{2}),\quad u_{1}=\Delta\beta,\; u_{2}=-(w_{F}\mathrm{FTG}_{+}+6w_{E}E)`,
    html: `<i>a</i><sup>*</sup><sub>NBS</sub> = argmax (<i>u</i><sub>1</sub> &minus; <i>d</i><sub>1</sub>)(<i>u</i><sub>2</sub> &minus; <i>d</i><sub>2</sub>) on Pareto frontier`,
  },
  gt_minimax: {
    tex: String.raw`v^{*}=\max_{x\in\Delta(\mathcal{A})}\min_{y\in\Delta(\mathcal{S})}\;x^{\top}Ay,\quad a_{\mathrm{MM}}=\arg\max_{i}\min_{j}A_{ij}`,
    html: `<i>v</i><sup>*</sup> = max<sub><i>x</i></sub> min<sub><i>y</i></sub> <i>x</i><sup>T</sup><i>Ay</i> &nbsp;&middot;&nbsp; Maximin: argmax<sub><i>i</i></sub> min<sub><i>j</i></sub> <i>A</i><sub><i>ij</i></sub>`,
  },
  gt_stackelberg: {
    tex: String.raw`a^{*}=\arg\max_{a}\;U\big(a,\mathrm{BR}(a)\big),\quad \Delta\beta(a)=\frac{s_{\max}}{1+e^{-(a-a_{50})/k}},\quad \mathrm{FTG}(a)=f_{0}+g(a-a_{\mathrm{on}})_{+}`,
    html: `<i>a</i><sup>*</sup> = argmax<sub><i>a</i></sub> <i>U</i>(<i>a</i>, BR(<i>a</i>)) &nbsp;&middot;&nbsp; &beta;-sigmoid &amp; FTG-hinge`,
  },
  gt_bandit: {
    tex: String.raw`\mathrm{Regret}(T)=\sum_{t=1}^{T}\big(\mu^{*}-\mu_{a_{t}}\big),\quad \mathrm{UCB}_{i}=\hat{\mu}_{i}+\sigma\sqrt{\frac{2\ln t}{n_{i}}}`,
    html: `Regret(<i>T</i>) = &Sigma;(&mu;<sup>*</sup> &minus; &mu;<sub><i>a</i><sub><i>t</i></sub></sub>) &nbsp;&middot;&nbsp; UCB<sub><i>i</i></sub> = &mu;&#770;<sub><i>i</i></sub> + &sigma;&radic;(2 ln <i>t</i> / <i>n</i><sub><i>i</i></sub>)`,
  },
  gt_consensus: {
    tex: String.raw`a_{\mathrm{cons}}^{*}=\arg\max_{a\in\mathcal{A}}\sum_{m=1}^{7}\mathbf{1}\!\left[a_{m}^{*}=a\right]`,
    html: `<i>a</i><sup>*</sup><sub>cons</sub> = argmax<sub><i>a</i></sub> &Sigma;<sub><i>m</i>=1..7</sub> <b>1</b>[<i>a</i><sup>*</sup><sub><i>m</i></sub> = <i>a</i>]`,
  },
  risk_map: {
    tex: String.raw`z(t)=\frac{e(t)}{\mathrm{med}_{0}},\quad \mathrm{CVaR}_{\alpha}=\mathbb{E}[Z\mid Z\ge\mathrm{VaR}_{\alpha}],\quad S=\widehat{\mathrm{CVaR}}+\kappa\!\left(\frac{a}{a_{\max}}\right)^{2}`,
    html: `<i>z</i>(<i>t</i>) = <i>e</i>(<i>t</i>)/med<sub>0</sub> &nbsp;&middot;&nbsp; CVaR<sub>&alpha;</sub> = E[<i>Z</i> | <i>Z</i> &ge; VaR<sub>&alpha;</sub>] &nbsp;&middot;&nbsp; <i>S</i> = CVaR&#770; + &kappa;(<i>a</i>/<i>a</i><sub>max</sub>)<sup>2</sup>`,
  },
  risk_envelope: {
    tex: String.raw`z(t)=\frac{\mathrm{RMS}_{\mathrm{band}}(t)}{\mathrm{med}(e_{0\,\mathrm{mA}})},\quad u=P_{90}(0\,\mathrm{mA}),\quad \theta=\frac{N_{\mathrm{clusters}}}{N_{\mathrm{exceed}}}`,
    html: `<i>z</i>(<i>t</i>) = RMS<sub>band</sub>(<i>t</i>)/med(<i>e</i><sub>0 mA</sub>) &nbsp;&middot;&nbsp; <i>u</i> = <i>P</i><sub>90</sub>(0 mA) &nbsp;&middot;&nbsp; &theta; = <i>N</i><sub>cl</sub>/<i>N</i><sub>ex</sub>`,
  },
  risk_tail: {
    tex: String.raw`P(Z>z\mid Z>u)=\left(1+\xi\,\frac{z-u}{\sigma}\right)^{-1/\xi},\quad \mathrm{EVT\text{-}VaR}_{99.9}`,
    html: `<i>P</i>(<i>Z</i> &gt; <i>z</i> | <i>Z</i> &gt; <i>u</i>) = (1 + &xi;(<i>z</i> &minus; <i>u</i>)/&sigma;)<sup>&minus;1/&xi;</sup> &nbsp;&middot;&nbsp; EVT-VaR<sub>99.9</sub>`,
  },
  risk_return: {
    tex: String.raw`z_{T}^{\mathrm{POT}}=u+\frac{\sigma}{\xi}\big((\lambda T)^{\xi}-1\big),\quad z_{T}^{\mathrm{GEV}}=\mu+\frac{\sigma}{\xi}\big((-\ln(1-T^{-1}))^{-\xi}-1\big)`,
    html: `<i>z</i><sub><i>T</i></sub><sup>POT</sup> = <i>u</i> + (&sigma;/&xi;)((&lambda;<i>T</i>)<sup>&xi;</sup> &minus; 1) &nbsp;&middot;&nbsp; <i>z</i><sub><i>T</i></sub><sup>GEV</sup> (shared &xi;)`,
  },
  risk_breach: {
    tex: String.raw`\lambda(a)=\exp(r_{0}+r_{1}a),\quad P(\ge 1\;\mathrm{breach\;in}\;H)=1-e^{-\lambda(a)H}\le\varepsilon`,
    html: `&lambda;(<i>a</i>) = exp(<i>r</i><sub>0</sub> + <i>r</i><sub>1</sub><i>a</i>) &nbsp;&middot;&nbsp; <i>P</i>(&ge;1 breach in <i>H</i>) = 1 &minus; <i>e</i><sup>&minus;&lambda;(<i>a</i>)<i>H</i></sup> &le; &varepsilon;`,
  },
  risk_selection: {
    tex: String.raw`a^{*}=\arg\min_{a}\;\mathrm{Risk}(a)\quad\mathrm{or}\quad\arg\min_{a:\,P(\mathrm{br})\le\varepsilon}\left(\frac{a}{a_{\max}}\right)^{2}`,
    html: `<i>a</i><sup>*</sup> = argmin<sub><i>a</i></sub> Risk(<i>a</i>) &nbsp;&middot;&nbsp; Safe: min <i>E</i> s.t. <i>P</i>(breach) &le; &varepsilon;`,
  },
  opt_arena: {
    tex: String.raw`\Pi(a)=\pm\,\mathbb{E}[f(S_{T})]+w_{F}\,C_{\mathrm{FTG}}(K_{F})+w_{E}\,a^{2},\quad d\ln S_{t}=\kappa(\theta-\ln S_{t})\,dt+\sigma\,dW_{t}`,
    html: `&Pi;(<i>a</i>) = &plusmn;E[<i>f</i>(<i>S</i><sub><i>T</i></sub>)] + <i>w</i><sub>F</sub><i>C</i><sub>FTG</sub> + <i>w</i><sub>E</sub><i>a</i><sup>2</sup> &nbsp;&middot;&nbsp; log-OU (&theta;, &kappa;, &sigma;)`,
  },
  opt_payoff: {
    tex: String.raw`C(F,K,v)=F\,\Phi(d_{1})-K\,\Phi(d_{2}),\quad d_{1,2}=\frac{\ln(F/K)\pm\tfrac{1}{2}v}{\sqrt{v}}`,
    html: `<i>C</i>(<i>F</i>, <i>K</i>, <i>v</i>) = <i>F</i>&Phi;(<i>d</i><sub>1</sub>) &minus; <i>K</i>&Phi;(<i>d</i><sub>2</sub>) &nbsp;&middot;&nbsp; Black-76 (<i>r</i> = 0)`,
  },
  opt_lattice: {
    tex: String.raw`p_{\uparrow}=\tfrac{1}{2}+\frac{\kappa(\theta-x)\sqrt{\Delta t}}{2\sigma},\quad V_{\mathrm{Am}}=\max\big(\mathrm{Cont},\,f(e^{x})\big),\quad \mathrm{aDBS}=\mathrm{Am}-\mathrm{Eu}`,
    html: `<i>p</i><sub>&uarr;</sub> = &frac12; + &kappa;(&theta;&minus;<i>x</i>)&radic;&Delta;<i>t</i>/(2&sigma;) &nbsp;&middot;&nbsp; Adaptivity = Am &minus; Eu`,
  },
  opt_chain: {
    tex: String.raw`\Delta=\frac{\partial C}{\partial S},\quad \Gamma=\frac{\partial^{2}C}{\partial S^{2}},\quad \mathcal{V}=\frac{\partial C}{\partial s},\quad \Theta=-\frac{\partial C}{\partial T}`,
    html: `&Delta; = &part;<i>C</i>/&part;<i>S</i> &nbsp;&middot;&nbsp; &Gamma; = &part;<sup>2</sup><i>C</i>/&part;<i>S</i><sup>2</sup> &nbsp;&middot;&nbsp; Vega = &part;<i>C</i>/&part;<i>s</i> &nbsp;&middot;&nbsp; &Theta; = &minus;&part;<i>C</i>/&part;<i>T</i>`,
  },
  opt_smile: {
    tex: String.raw`\mathrm{Alpha}(a)=\frac{\partial\Pi}{\partial a}=0\;\Rightarrow\;a^{*},\quad C_{\mathrm{mkt}}(K)=C_{\mathrm{Black}}\!\big(F,K,\mathrm{IV}(K)^{2}\big)`,
    html: `Alpha(<i>a</i>) = &part;&Pi;/&part;<i>a</i> = 0 &rarr; <i>a</i><sup>*</sup> &nbsp;&middot;&nbsp; IV(<i>K</i>) vs log-normal <i>s</i>`,
  },
  opt_selection: {
    tex: String.raw`a_{\Pi}^{*}=\arg\min_{a}\Pi(a),\quad a_{\mathrm{aDBS}}^{*}=\arg\max_{a>0}\big(\mathrm{Am}(a)-\mathrm{Eu}(a)\big)`,
    html: `<i>a</i><sup>*</sup><sub>&Pi;</sub> = argmin &Pi;(<i>a</i>) &nbsp;&middot;&nbsp; aDBS: argmax (Am &minus; Eu)`,
  },
  gsp_graph: {
    tex: String.raw`W_{ij}=\exp\!\left(-\frac{\|X_{i}-X_{j}\|_{2}^{2}}{2\sigma^{2}}\right),\quad L=D-W,\quad \lambda_{2}=u_{2}^{\top}Lu_{2}`,
    html: `<i>W</i><sub><i>ij</i></sub> = exp(&minus;&Vert;<i>X</i><sub><i>i</i></sub>&minus;<i>X</i><sub><i>j</i></sub>&Vert;<sup>2</sup>/2&sigma;<sup>2</sup>) &nbsp;&middot;&nbsp; <i>L</i> = <i>D</i> &minus; <i>W</i> &nbsp;&middot;&nbsp; &lambda;<sub>2</sub> = <i>u</i><sub>2</sub><sup>T</sup><i>Lu</i><sub>2</sub>`,
  },
  gsp_matrix: {
    tex: String.raw`L_{\mathrm{sym}}=D^{-1/2}LD^{-1/2},\quad d_{ij}^{2}=\sum_{f}\big(X_{i}(f)-X_{j}(f)\big)^{2}`,
    html: `<i>L</i><sub>sym</sub> = <i>D</i><sup>&minus;1/2</sup><i>LD</i><sup>&minus;1/2</sup> &nbsp;&middot;&nbsp; <i>d</i><sub><i>ij</i></sub><sup>2</sup> = &Sigma;<sub><i>f</i></sub>(<i>X</i><sub><i>i</i></sub> &minus; <i>X</i><sub><i>j</i></sub>)<sup>2</sup>`,
  },
  gsp_gft: {
    tex: String.raw`\hat{X}=U_{\mathrm{sym}}^{\top}(X-\bar{X}),\quad E_{k}(\mathcal{B})=\frac{1}{|\mathcal{B}|}\sum_{f\in\mathcal{B}}|\hat{X}_{k}(f)|^{2}`,
    html: `<i>X&#770;</i> = <i>U</i><sub>sym</sub><sup>T</sup>(<i>X</i> &minus; <i>X&#772;</i>) &nbsp;&middot;&nbsp; <i>E</i><sub><i>k</i></sub>(&beta;, FTG) &amp; <i>X</i><sub><i>k</i></sub>(<i>f</i>)`,
  },
  gsp_gtv: {
    tex: String.raw`\mathrm{GTV}(f)=\sum_{i,j}W_{ij}\big(X_{i}(f)-X_{j}(f)\big)^{2},\quad \mathrm{LGFE}(f)=\frac{\sum_{k<K/2}\hat{X}_{k}^{2}}{\sum_{k}\hat{X}_{k}^{2}}`,
    html: `GTV(<i>f</i>) = &Sigma;<i>W</i><sub><i>ij</i></sub>(<i>X</i><sub><i>i</i></sub>&minus;<i>X</i><sub><i>j</i></sub>)<sup>2</sup> &nbsp;&middot;&nbsp; LGFE(<i>f</i>) &amp; GSE(<i>f</i>)`,
  },
  gsp_phase: {
    tex: String.raw`R(a)=\left|\frac{1}{N_{a}}\sum e^{i\theta(t)}\right|,\quad \Phi_{\tau}(t)=\big(x_{b}(t),\,x_{b}(t+\tau)\big)`,
    html: `<i>R</i>(<i>a</i>) = |mean(<i>e</i><sup><i>i</i>&theta;(<i>t</i>)</sup>)| &nbsp;&middot;&nbsp; &Phi;<sub>&tau;</sub>(<i>t</i>) = (<i>x</i><sub><i>b</i></sub>(<i>t</i>), <i>x</i><sub><i>b</i></sub>(<i>t</i>+&tau;))`,
  },
  gsp_sweep: {
    tex: String.raw`m(\sigma)=m\!\big(W_{\sigma}\big),\;\sigma\in[0.5,8.0],\quad \mathrm{Coh}=\frac{1}{K-1}\sum_{k}\langle \hat{x}_{k},\hat{x}_{k+1}\rangle`,
    html: `<i>m</i>(&sigma;) for &sigma; &isin; [0.5, 8.0] &nbsp;&middot;&nbsp; Multi-series GSP biomarker board`,
  },
};

/* ── Pattern & Layered-Boundary Visual Language for Game-Theory Solution Concepts ── */
const GT_STYLES = {
  oracle:  { label: "Oracle",  stroke: C.black,    dash: "",        width: 2.6, double: false },
  minimax: { label: "Minimax", stroke: C.grayDark, dash: "9 4",     width: 2.3, double: false },
  nash:    { label: "Nash",    stroke: C.black,    dash: "8 3 2 3", width: 2.3, double: false },
  nbs:     { label: "NBS",     stroke: C.crimson,  dash: "",        width: 2.4, double: true  },
  stack:   { label: "Stack.",  stroke: C.crimson,  dash: "",        width: 2.6, double: false },
  robust:  { label: "Robust",  stroke: C.grayDark, dash: "3 3",     width: 2.3, double: false },
  bandit:  { label: "Bandit",  stroke: C.crimson,  dash: "6 3",     width: 2.6, double: false },
};

function appendGTPatternDefs(svg, prefix) {
  const defs = svgEl("defs");
  // 1. Oracle: fine vertical black hatch
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-pat-oracle`, width: 6, height: 6, patternUnits: "userSpaceOnUse" }, [
      svgEl("line", { x1: 3, y1: 0, x2: 3, y2: 6, stroke: C.black, "stroke-width": 1.3, opacity: 0.45 }),
    ])
  );
  // 2. Minimax: horizontal cool-gray hatch
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-pat-minimax`, width: 6, height: 6, patternUnits: "userSpaceOnUse" }, [
      svgEl("line", { x1: 0, y1: 3, x2: 6, y2: 3, stroke: C.grayDark, "stroke-width": 1.3, opacity: 0.55 }),
    ])
  );
  // 3. Nash (Zero-Sum Mixed): forward 45° black diagonal hatch ///
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-pat-nash`, width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, [
      svgEl("line", { x1: 0, y1: 0, x2: 0, y2: 7, stroke: C.black, "stroke-width": 1.6, opacity: 0.50 }),
    ])
  );
  // 4. NBS (Nash Bargaining): reverse 45° crimson diagonal hatch \\\
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-pat-nbs`, width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(-45)" }, [
      svgEl("line", { x1: 0, y1: 0, x2: 0, y2: 7, stroke: C.crimson, "stroke-width": 1.7, opacity: 0.55 }),
    ])
  );
  // 5. Stackelberg: crimson cross-hatch
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-pat-stack`, width: 8, height: 8, patternUnits: "userSpaceOnUse" }, [
      svgEl("path", { d: "M 0 4 H 8 M 4 0 V 8", stroke: C.crimson, "stroke-width": 1.2, opacity: 0.45 }),
    ])
  );
  // 6. Robust Stackelberg: cool-gray stipple dots
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-pat-robust`, width: 6, height: 6, patternUnits: "userSpaceOnUse" }, [
      svgEl("circle", { cx: 3, cy: 3, r: 1.2, fill: C.grayDark, opacity: 0.58 }),
    ])
  );
  // 7. Bandit: dense crimson 45° diagonal hatch
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-pat-bandit`, width: 5, height: 5, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, [
      svgEl("line", { x1: 0, y1: 0, x2: 0, y2: 5, stroke: C.crimson, "stroke-width": 1.8, opacity: 0.60 }),
    ])
  );
  svg.appendChild(defs);
}

/** Draw a crisp Pattern + Layered Boundary swatch rectangle for legends & consensus rows. */
function drawMethodSwatch(parent, x, y, w, h, key, prefix) {
  const st = GT_STYLES[key] || GT_STYLES.oracle;
  const g = svgEl("g");
  g.appendChild(svgEl("rect", { x, y, width: w, height: h, rx: 2, fill: C.white }));
  g.appendChild(svgEl("rect", { x, y, width: w, height: h, rx: 2, fill: `url(#${prefix}-pat-${key})` }));
  const strokeAttrs = { x, y, width: w, height: h, rx: 2, fill: "none", stroke: st.stroke, "stroke-width": st.width };
  if (st.dash) strokeAttrs["stroke-dasharray"] = st.dash;
  g.appendChild(svgEl("rect", strokeAttrs));
  if (st.double) {
    g.appendChild(svgEl("rect", { x: x - 3, y: y - 3, width: w + 6, height: h + 6, rx: 3, fill: "none", stroke: st.stroke, "stroke-width": 1.5 }));
  }
  parent.appendChild(g);
}

/** Draw nested layered boundary frames around an arm tile for every matching solution concept. */
function drawLayeredBoundaries(parent, x, y, w, h, rx, keys, prefix) {
  if (!keys || !keys.length) return;
  // Subtle pattern fill overlay inside the tile for the primary method
  parent.appendChild(svgEl("rect", { x, y, width: w, height: h, rx, fill: `url(#${prefix}-pat-${keys[0]})`, style: "pointer-events:none" }));
  // Stacked concentric layered boundary lines stepping cleanly outward
  let pad = 3.5;
  keys.forEach((key) => {
    const st = GT_STYLES[key] || GT_STYLES.oracle;
    const attrs = {
      x: x - pad,
      y: y - pad,
      width: w + pad * 2,
      height: h + pad * 2,
      rx: rx + 2,
      fill: "none",
      stroke: st.stroke,
      "stroke-width": st.width,
      style: "pointer-events:none",
    };
    if (st.dash) attrs["stroke-dasharray"] = st.dash;
    parent.appendChild(svgEl("rect", attrs));
    if (st.double) {
      pad += 3.5;
      parent.appendChild(
        svgEl("rect", {
          x: x - pad,
          y: y - pad,
          width: w + pad * 2,
          height: h + pad * 2,
          rx: rx + 3,
          fill: "none",
          stroke: st.stroke,
          "stroke-width": 1.6,
          style: "pointer-events:none",
        })
      );
    }
    pad += 4.5;
  });
}

/* ── Pattern & Layered-Boundary Visual Language for Extreme-Value Risk Selection Rules ── */
const RISK_STYLES = {
  cvar:  { label: "CVaR",    stroke: C.black,    dash: "",        width: 2.6, double: false },
  evt:   { label: "EVT99.9", stroke: C.grayDark, dash: "9 4",     width: 2.3, double: false },
  rl:    { label: "GEV RL",  stroke: C.black,    dash: "8 3 2 3", width: 2.3, double: false },
  score: { label: "Risk+E",  stroke: C.crimson,  dash: "",        width: 2.4, double: true  },
  safe:  { label: "Safe ≤ε", stroke: C.crimson,  dash: "6 3",     width: 2.5, double: false },
};

function appendRiskPatternDefs(svg, prefix) {
  const defs = svgEl("defs");
  // 1. min CVaR: fine vertical black hatch
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-rpat-cvar`, width: 6, height: 6, patternUnits: "userSpaceOnUse" }, [
      svgEl("line", { x1: 3, y1: 0, x2: 3, y2: 6, stroke: C.black, "stroke-width": 1.3, opacity: 0.45 }),
    ])
  );
  // 2. min EVT-VaR99.9: horizontal cool-gray hatch
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-rpat-evt`, width: 6, height: 6, patternUnits: "userSpaceOnUse" }, [
      svgEl("line", { x1: 0, y1: 3, x2: 6, y2: 3, stroke: C.grayDark, "stroke-width": 1.3, opacity: 0.55 }),
    ])
  );
  // 3. min GEV Return Level: forward 45° black diagonal hatch
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-rpat-rl`, width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, [
      svgEl("line", { x1: 0, y1: 0, x2: 0, y2: 7, stroke: C.black, "stroke-width": 1.6, opacity: 0.50 }),
    ])
  );
  // 4. Risk-Adjusted (CVaR + κ·E): reverse 45° crimson diagonal hatch
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-rpat-score`, width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(-45)" }, [
      svgEl("line", { x1: 0, y1: 0, x2: 0, y2: 7, stroke: C.crimson, "stroke-width": 1.7, opacity: 0.55 }),
    ])
  );
  // 5. Safe Constrained (P(breach) ≤ ε): crimson cross-hatch
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-rpat-safe`, width: 8, height: 8, patternUnits: "userSpaceOnUse" }, [
      svgEl("path", { d: "M 0 4 H 8 M 4 0 V 8", stroke: C.crimson, "stroke-width": 1.3, opacity: 0.50 }),
    ])
  );
  svg.appendChild(defs);
}

function drawRiskSwatch(parent, x, y, w, h, key, prefix) {
  const st = RISK_STYLES[key] || RISK_STYLES.cvar;
  const g = svgEl("g");
  g.appendChild(svgEl("rect", { x, y, width: w, height: h, rx: 2, fill: C.white }));
  g.appendChild(svgEl("rect", { x, y, width: w, height: h, rx: 2, fill: `url(#${prefix}-rpat-${key})` }));
  const strokeAttrs = { x, y, width: w, height: h, rx: 2, fill: "none", stroke: st.stroke, "stroke-width": st.width };
  if (st.dash) strokeAttrs["stroke-dasharray"] = st.dash;
  g.appendChild(svgEl("rect", strokeAttrs));
  if (st.double) {
    g.appendChild(svgEl("rect", { x: x - 3, y: y - 3, width: w + 6, height: h + 6, rx: 3, fill: "none", stroke: st.stroke, "stroke-width": 1.5 }));
  }
  parent.appendChild(g);
}

function drawRiskLayeredBoundaries(parent, x, y, w, h, rx, keys, prefix) {
  if (!keys || !keys.length) return;
  parent.appendChild(svgEl("rect", { x, y, width: w, height: h, rx, fill: `url(#${prefix}-rpat-${keys[0]})`, style: "pointer-events:none" }));
  let pad = 3.5;
  keys.forEach((key) => {
    const st = RISK_STYLES[key] || RISK_STYLES.cvar;
    const attrs = {
      x: x - pad,
      y: y - pad,
      width: w + pad * 2,
      height: h + pad * 2,
      rx: rx + 2,
      fill: "none",
      stroke: st.stroke,
      "stroke-width": st.width,
      style: "pointer-events:none",
    };
    if (st.dash) attrs["stroke-dasharray"] = st.dash;
    parent.appendChild(svgEl("rect", attrs));
    if (st.double) {
      pad += 3.5;
      parent.appendChild(
        svgEl("rect", {
          x: x - pad,
          y: y - pad,
          width: w + pad * 2,
          height: h + pad * 2,
          rx: rx + 3,
          fill: "none",
          stroke: st.stroke,
          "stroke-width": 1.6,
          style: "pointer-events:none",
        })
      );
    }
    pad += 4.5;
  });
}

/* ── Pattern & Layered-Boundary Visual Language for Option-Pricing Selection Rules ── */
const OPT_STYLES = {
  portfolio: { label: "Portf. Π", stroke: C.crimson,  dash: "",        width: 2.4, double: true  },
  strategy:  { label: "Strat.",   stroke: C.black,    dash: "",        width: 2.6, double: false },
  ftg:       { label: "Min FTG",  stroke: C.grayDark, dash: "9 4",     width: 2.3, double: false },
  adapt:     { label: "aDBS",     stroke: C.crimson,  dash: "6 3",     width: 2.5, double: false },
  alpha:     { label: "Alpha=0",  stroke: C.black,    dash: "8 3 2 3", width: 2.3, double: false },
};

const OPT_STRATS = [
  ["call", "Long Call"],
  ["strangle", "Strangle"],
  ["straddle", "Straddle"],
  ["butterfly", "Butterfly"],
  ["bullspread", "Bull Spread"],
  ["calendar", "Calendar"],
  ["ftgcall", "FTG Call"],
];

function appendOptPatternDefs(svg, prefix) {
  const defs = svgEl("defs");
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-opat-portfolio`, width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(-45)" }, [
      svgEl("line", { x1: 0, y1: 0, x2: 0, y2: 7, stroke: C.crimson, "stroke-width": 1.7, opacity: 0.55 }),
    ])
  );
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-opat-strategy`, width: 6, height: 6, patternUnits: "userSpaceOnUse" }, [
      svgEl("line", { x1: 3, y1: 0, x2: 3, y2: 6, stroke: C.black, "stroke-width": 1.3, opacity: 0.45 }),
    ])
  );
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-opat-ftg`, width: 6, height: 6, patternUnits: "userSpaceOnUse" }, [
      svgEl("line", { x1: 0, y1: 3, x2: 6, y2: 3, stroke: C.grayDark, "stroke-width": 1.3, opacity: 0.55 }),
    ])
  );
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-opat-adapt`, width: 8, height: 8, patternUnits: "userSpaceOnUse" }, [
      svgEl("path", { d: "M 0 4 H 8 M 4 0 V 8", stroke: C.crimson, "stroke-width": 1.3, opacity: 0.50 }),
    ])
  );
  defs.appendChild(
    svgEl("pattern", { id: `${prefix}-opat-alpha`, width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, [
      svgEl("line", { x1: 0, y1: 0, x2: 0, y2: 7, stroke: C.black, "stroke-width": 1.6, opacity: 0.50 }),
    ])
  );
  svg.appendChild(defs);
}

function drawOptSwatch(parent, x, y, w, h, key, prefix) {
  const st = OPT_STYLES[key] || OPT_STYLES.portfolio;
  const g = svgEl("g");
  g.appendChild(svgEl("rect", { x, y, width: w, height: h, rx: 2, fill: C.white }));
  g.appendChild(svgEl("rect", { x, y, width: w, height: h, rx: 2, fill: `url(#${prefix}-opat-${key})` }));
  const strokeAttrs = { x, y, width: w, height: h, rx: 2, fill: "none", stroke: st.stroke, "stroke-width": st.width };
  if (st.dash) strokeAttrs["stroke-dasharray"] = st.dash;
  g.appendChild(svgEl("rect", strokeAttrs));
  if (st.double) {
    g.appendChild(svgEl("rect", { x: x - 3, y: y - 3, width: w + 6, height: h + 6, rx: 3, fill: "none", stroke: st.stroke, "stroke-width": 1.5 }));
  }
  parent.appendChild(g);
}

function drawOptLayeredBoundaries(parent, x, y, w, h, rx, keys, prefix) {
  if (!keys || !keys.length) return;
  parent.appendChild(svgEl("rect", { x, y, width: w, height: h, rx, fill: `url(#${prefix}-opat-${keys[0]})`, style: "pointer-events:none" }));
  let pad = 3.5;
  keys.forEach((key) => {
    const st = OPT_STYLES[key] || OPT_STYLES.portfolio;
    const attrs = {
      x: x - pad,
      y: y - pad,
      width: w + pad * 2,
      height: h + pad * 2,
      rx: rx + 2,
      fill: "none",
      stroke: st.stroke,
      "stroke-width": st.width,
      style: "pointer-events:none",
    };
    if (st.dash) attrs["stroke-dasharray"] = st.dash;
    parent.appendChild(svgEl("rect", attrs));
    if (st.double) {
      pad += 3.5;
      parent.appendChild(
        svgEl("rect", {
          x: x - pad,
          y: y - pad,
          width: w + pad * 2,
          height: h + pad * 2,
          rx: rx + 3,
          fill: "none",
          stroke: st.stroke,
          "stroke-width": 1.6,
          style: "pointer-events:none",
        })
      );
    }
    pad += 4.5;
  });
}

let _katexLoading = false;
function ensureKaTeX(onReady) {
  if (typeof window !== "undefined" && window.katex) {
    if (onReady) onReady();
    return;
  }
  if (_katexLoading || typeof document === "undefined") return;
  _katexLoading = true;
  if (!document.getElementById("nr-katex-css")) {
    const lk = document.createElement("link");
    lk.id = "nr-katex-css";
    lk.rel = "stylesheet";
    lk.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
    document.head.appendChild(lk);
  }
  if (!document.getElementById("nr-katex-js")) {
    const sc = document.createElement("script");
    sc.id = "nr-katex-js";
    sc.src = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js";
    sc.onload = () => { if (onReady) onReady(); };
    document.head.appendChild(sc);
  }
}

function texSpan(tex, fallbackHtml) {
  const sp = el("span", { class: "nr-tex-inline" });
  if (typeof window !== "undefined" && window.katex) {
    try {
      window.katex.render(tex, sp, { throwOnError: false, displayMode: false });
      return sp;
    } catch (_) { /* fallback below */ }
  }
  sp.innerHTML = fallbackHtml || tex;
  return sp;
}

const LEAD_FORMULA_RING = {
  tex: String.raw`\mathrm{4\text{-}ring\;lead}:\;\{0,\,1,\,2,\,3\},\quad \mathrm{pairs}\;0\text{-}2,\;1\text{-}3,\;0\text{-}3,\quad f_{\mathrm{FTG}}=\tfrac{1}{2}f_{\mathrm{stim}}`,
  html: `4-ring lead: {0, 1, 2, 3} &nbsp;&middot;&nbsp; pairs 0-2, 1-3, 0-3 &nbsp;&middot;&nbsp; <i>f</i><sub>FTG</sub> = <i>f</i><sub>stim</sub>/2`,
};
const LEAD_FORMULA_MIXED = {
  tex: String.raw`\mathrm{SenSight}:\{0,\,1\mathrm{a/b/c},\,2\mathrm{a/b/c},\,3\}\;\;|\;\;\mathrm{4\text{-}ring}:\{0,1,2,3\},\quad f_{\mathrm{FTG}}=\tfrac{1}{2}f_{\mathrm{stim}}`,
  html: `SenSight {0, 1a/b/c, 2a/b/c, 3} | 4-ring {0, 1, 2, 3} &nbsp;&middot;&nbsp; <i>f</i><sub>FTG</sub> = <i>f</i><sub>stim</sub>/2`,
};
function buildFormulaBar(nodeType, leadKind) {
  let spec = NODE_FORMULAS[nodeType];
  if (nodeType === "lead" && leadKind === "4-ring") spec = LEAD_FORMULA_RING;
  if (nodeType === "lead" && leadKind === "mixed") spec = LEAD_FORMULA_MIXED;
  if (!spec) return null;
  const bar = el("div", { class: "nr-formula-bar" });
  if (typeof window !== "undefined" && window.katex) {
    try {
      window.katex.render(spec.tex, bar, { throwOnError: false, displayMode: false });
      return bar;
    } catch (_) { /* fallback below */ }
  }
  bar.appendChild(el("span", { class: "nr-formula-fallback", html: spec.html }));
  return bar;
}

function escXml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function fmtNum(v, d = 1) {
  return Number.isFinite(v) ? Number(v).toFixed(d) : "—";
}

// ── Text measurement (keeps every label on ONE row: no wrapping, no overprinting) ──
let _measureCtx = null;
function textWidth(str, size = 14, weight = 400) {
  const s = String(str == null ? "" : str);
  try {
    if (!_measureCtx && typeof document !== "undefined") {
      const cv = document.createElement("canvas");
      _measureCtx = cv.getContext ? cv.getContext("2d") : null;
    }
    if (_measureCtx) {
      _measureCtx.font = `${weight} ${size}px ${FONT_SANS}`;
      const w = _measureCtx.measureText(s).width;
      if (w > 0 || !s.length) return w * 1.04; // small safety margin for font substitution
    }
  } catch (_) { /* fall through to estimate */ }
  return s.length * size * (weight >= 600 ? 0.6 : 0.55);
}

/** First variant that fits maxW (variants ordered long → short); last resort: ellipsis-trimmed. */
function fitText(variants, maxW, size = 14, weight = 400) {
  const list = (Array.isArray(variants) ? variants : [variants]).filter((v) => v != null && v !== "");
  for (const v of list) if (textWidth(v, size, weight) <= maxW) return v;
  let t = String(list[list.length - 1] || "");
  while (t.length > 1 && textWidth(t + "…", size, weight) > maxW) t = t.slice(0, -1);
  return t.length > 1 ? t + "…" : "";
}

/** One-row lane label: bold main + gray detail; the detail is dropped (never wrapped) if it can't fit. */
function laneLabel(svgElFn, x, y, main, sub, maxW, opts = {}) {
  const size = opts.size || 14;
  const mainFit = fitText([main], maxW, size, 700);
  const t = svgElFn("text", { x, y, "text-anchor": "end", "font-size": size, "font-weight": 700, fill: opts.fill || C.black });
  const showSub = sub && textWidth(mainFit + sub, size, 700) <= maxW;
  const t1 = svgElFn("tspan", { text: mainFit });
  t.appendChild(t1);
  if (showSub) {
    t.appendChild(svgElFn("tspan", { "font-weight": 400, fill: C.gray, text: sub }));
  }
  return t;
}

/** Lane-label column width: fits the longest main+detail label, capped to a share of the plot width. */
function laneLabelColumn(pairs, width, size = 14, minW = 96, share = 0.4) {
  let need = 0;
  for (const [m, sb] of pairs) need = Math.max(need, textWidth(`${m}${sb || ""}`, size, 700));
  return clamp(Math.ceil(need + 20), minW, Math.max(minW, width * share));
}

/** Tile width for amplitude-positioned tiles: never wider than the gap to the neighbouring tile. */
function laneTileWidth(xs, maxW = 54, minW = 12) {
  const v = [...xs].sort((a, b) => a - b);
  let gap = Infinity;
  for (let i = 1; i < v.length; i++) gap = Math.min(gap, v[i] - v[i - 1]);
  return clamp(Number.isFinite(gap) ? gap * 0.92 : maxW, minW, maxW);
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "style") node.setAttribute("style", v);
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  }
  for (const ch of children) {
    if (ch !== null && ch !== undefined) {
      node.appendChild(typeof ch === "string" ? document.createTextNode(ch) : ch);
    }
  }
  return node;
}

function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  }
  for (const ch of children) {
    if (ch !== null && ch !== undefined) node.appendChild(ch);
  }
  return node;
}

/** Monochrome-silver-charcoal-to-crimson heatmap ramp strictly within our 5-color palette. */
function specColor(t) {
  const u = clamp(t, 0, 1);
  // 0.00 -> White (#FFFFFF), 0.30 -> Silver (#D4D8DF), 0.60 -> Cool Gray (#6B7280),
  // 0.80 -> Black (#1F242C), 1.00 -> Crimson (#B81D33)
  const stops = [
    [0.00, 255, 255, 255],
    [0.28, 218, 222, 229],
    [0.56, 114, 122, 134],
    [0.78, 26, 30, 38],
    [1.00, 184, 29, 51],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, r0, g0, b0] = stops[i];
    const [t1, r1, g1, b1] = stops[i + 1];
    if (u <= t1) {
      const f = (u - t0) / Math.max(1e-6, t1 - t0);
      const r = Math.round(r0 + (r1 - r0) * f);
      const g = Math.round(g0 + (g1 - g0) * f);
      const b = Math.round(b0 + (b1 - b0) * f);
      return `rgb(${r},${g},${b})`;
    }
  }
  return C.crimson;
}

// Hemispheres whose lead is a 4-ring (non-directional) lead: levels 1/2 are whole rings.
let RING_HEMIS = new Set();
let RING_ALL = false;
function contactsForPairStr(pairStr, hemi) {
  const ring = hemi ? RING_HEMIS.has(hemi) : RING_ALL;
  const mixed = !hemi && !RING_ALL && RING_HEMIS.size > 0;
  const map = ring
    ? { "0": ["0"], "1": ["1"], "2": ["2"], "3": ["3"] }
    : mixed
      ? { "0": ["0"], "1": ["1", "1a", "1b", "1c"], "2": ["2", "2a", "2b", "2c"], "3": ["3"] }
      : { "0": ["0"], "1": ["1a", "1b", "1c"], "2": ["2a", "2b", "2c"], "3": ["3"] };
  const parts = String(pairStr || "").split("-");
  const out = [];
  for (const p of parts) {
    const list = map[p] || (p ? [p] : []);
    for (const c of list) if (!out.includes(c)) out.push(c);
  }
  return out;
}

/**
 * Titra brand mark: a DBS lead whose contacts light up one after another (a titration step) and emit a
 * stimulation ring. Pure SVG + CSS animation (respects prefers-reduced-motion).
 */
function titraIcon(size = 30) {
  const ns = SVG_NS;
  const mk = (tag, attrs) => {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  };
  const svg = mk("svg", { class: "titra-icon", viewBox: "0 0 32 32", width: size, height: size, "aria-hidden": "true" });
  svg.appendChild(mk("rect", { x: 12.2, y: 1.5, width: 7.6, height: 28.5, rx: 3.8, class: "titra-shaft" }));
  const ys = [22.6, 16.6, 10.6, 4.6]; // contacts 0 (ventral) → 3 (dorsal)
  ys.forEach((y, i) => {
    svg.appendChild(mk("circle", { cx: 16, cy: y + 1.6, r: 4, class: `titra-ring titra-s${i}` }));
  });
  ys.forEach((y, i) => {
    svg.appendChild(mk("rect", { x: 11.4, y, width: 9.2, height: 3.2, rx: 1.1, class: `titra-contact titra-s${i}` }));
  });
  return svg;
}

const TITRA_FAVICON_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
  `<rect x="1" y="1" width="30" height="30" rx="7" fill="#FFFFFF" stroke="#D4D8DF" stroke-width="1.4"/>` +
  `<circle cx="16" cy="12.2" r="9.6" fill="none" stroke="#B81D33" stroke-width="1.35" opacity="0.34"/>` +
  `<circle cx="16" cy="12.2" r="6.6" fill="none" stroke="#B81D33" stroke-width="1.65" opacity="0.72"/>` +
  `<rect x="12.4" y="3.2" width="7.2" height="25.6" rx="3.6" fill="#1F242C"/>` +
  `<rect x="11.6" y="22.0" width="8.8" height="2.9" rx="1.0" fill="#D4D8DF"/>` +
  `<rect x="11.6" y="16.4" width="8.8" height="2.9" rx="1.0" fill="#D4D8DF"/>` +
  `<rect x="11.6" y="10.8" width="8.8" height="2.9" rx="1.0" fill="#B81D33"/>` +
  `<rect x="11.6" y="5.2" width="8.8" height="2.9" rx="1.0" fill="#D4D8DF"/>` +
  `</svg>`;

/** Permanently lock the browser tab / URL bar favicon to Titra's DBS-lead emblem (even when marimo updates its running/idle icon). */
function setTitraFavicon() {
  try {
    const docs = [document];
    try {
      if (window.parent && window.parent !== window && window.parent.document) {
        docs.push(window.parent.document);
      }
    } catch (_) {}
    const href = `data:image/svg+xml,${encodeURIComponent(TITRA_FAVICON_SVG)}`;
    for (const doc of docs) {
      if (!doc || !doc.head) continue;
      let busy = false;
      const enforce = () => {
        if (busy || !doc.head) return;
        const links = Array.from(doc.querySelectorAll('link[rel*="icon"]'));
        if (links.length === 1 && links[0].parentNode === doc.head && links[0].getAttribute("href") === href && links[0].getAttribute("type") === "image/svg+xml") return;
        busy = true;
        try {
          const keep = doc.head.querySelector('link[rel*="icon"]') || doc.createElement("link");
          for (const lk of links) {
            if (lk !== keep) lk.remove();
          }
          keep.rel = "icon";
          keep.type = "image/svg+xml";
          keep.href = href;
          if (keep.parentNode !== doc.head) doc.head.appendChild(keep);
        } finally {
          busy = false;
        }
      };
      enforce();
      const win = doc.defaultView;
      if (win && !win.__titraFaviconLocked && typeof MutationObserver !== "undefined" && doc.documentElement) {
        win.__titraFaviconLocked = true;
        new MutationObserver(enforce).observe(doc.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["href", "rel", "type"],
        });
      }
    }
  } catch (_) {}
}

function render({ model, el: host }) {
  host.innerHTML = "";
  setTitraFavicon();

  // ── Internal Reactive State ─────────────────────────────────────────
  const state = {
    payload: model.get("payload") || {},
    nodes: [],
    edges: [],
    viewport: { x: 40, y: 34, zoom: 0.82 },
    selection: Object.assign(
      {
        hemisphere: "Left",
        contacts: [],
        pairs: [],
        recordings: [],
        selected_nodes: ["input_main"],
        selected_band: "both",
        stim_rate_hz: 145.0,
        ftg_half_bw_hz: 4.0,
        freq_window_hz: null,
        time_window_s: null,
        json_paths: [],
        gt_params: {
          hemisphere: "Left",
          stim_rate_filter: "ALL",
          wb: 1.0,
          wf: 0.6,
          we: 0.5,
          tau: 2.0,
          ftg_safe: 4.0,
          algo: "thompson",
          budget: 60,
        },
        gt_selected_arms: [],
        gt_bandit_live: {},
        risk_params: {
          hemisphere: "Left",
          stim_rate_filter: "ALL",
          target: "beta",
          alpha: 0.99,
          horizon: 60.0,
          kappa: 0.6,
          eps: 0.10,
          metric: "CVaR",
        },
        risk_selected_arms: [],
        opt_params: {
          hemisphere: "Left",
          stim_rate_filter: "ALL",
          strategy: "call",
          T: 0.25,
          k_burst_mult: 1.0,
          k_low: 0.5,
          k_set: 0.7,
          wing: 0.25,
          w_ftg: 0.5,
          w_energy: 0.02,
          steps: 10,
        },
        opt_selected_arms: [],
        gsp_params: {
          hemisphere: "Left",
          stim_rate_filter: "ALL",
          sigma: 2.0,
          series_id: "",
          phase_band: "ftg",
          node_size_metric: "local_ftg",
        },
        gsp_selected_node_idx: null,
      },
      model.get("selection") || {}
    ),
    hover: {
      nodeId: null,
      contact: null,   // "Left:1a"
      pair: null,      // "Left:0-2"
      armId: null,     // "Left|0-2|125Hz|1.5mA"
      freqHz: null,
      timeS: null,
      ampMa: null,
      band: null,      // "beta" | "ftg" | null
      recId: null,     // PSD overlay legend hover
    },
    bandit: {
      running: false,
      timer: null,
      key: "",
      pulls: [],       // [{ armIdx, winIdx, beta_supp, ftg_db, amp, u, regret }]
      n: [],
      sumU: [],
      sumFtg: [],
      cumRegret: [],
      exhRegret: [],
      A: null,
      b: null,
    },
    leadView: "Bilateral",  // "Left" | "Right" | "Bilateral"
    showImpedanceOnLead: true,
    activeGroupId: null,
    focusNodeId: null,
    uidCounter: 100,
    connectingFrom: null, // { nodeId, x, y }
    tempCursorWorld: null,
    ctxMenuEl: null,
  };

  // ── Live Game-Theory Engine (Arms, Utility, MWU Nash, NBS, Stackelberg, Bandit) ──
  function getGTParams() {
    if (!state.selection.gt_params) {
      state.selection.gt_params = {
        hemisphere: state.selection.hemisphere || "Left",
        stim_rate_filter: "ALL",
        wb: 1.0,
        wf: 0.6,
        we: 0.5,
        tau: 2.0,
        ftg_safe: 4.0,
        algo: "thompson",
        budget: 60,
      };
    }
    return state.selection.gt_params;
  }

  function gtUtility(betaSupp, ftgDb, amp, amax, p) {
    const an = amp / Math.max(amax || 1.0, 0.1);
    return p.wb * betaSupp - p.wf * Math.max(0, ftgDb - p.tau) - p.we * 6.0 * an * an;
  }

  function invertMatrix6(M) {
    const n = M.length;
    const aug = M.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    for (let i = 0; i < n; i++) {
      let piv = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(aug[r][i]) > Math.abs(aug[piv][i])) piv = r;
      if (piv !== i) [aug[i], aug[piv]] = [aug[piv], aug[i]];
      const diag = Math.abs(aug[i][i]) < 1e-9 ? 1e-9 : aug[i][i];
      for (let j = 0; j < 2 * n; j++) aug[i][j] /= diag;
      for (let r = 0; r < n; r++) {
        if (r === i) continue;
        const f = aug[r][i];
        for (let j = 0; j < 2 * n; j++) aug[r][j] -= f * aug[i][j];
      }
    }
    return aug.map((row) => row.slice(n));
  }

  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  let _gtCacheKey = "";
  let _gtCache = null;

  function computeGT() {
    const gtBundle = getPayload().game_theory || {};
    const gp = getGTParams();
    const hemi = gp.hemisphere || "Left";
    const selContacts = state.selection.contacts || [];
    const selKey = selContacts.slice().sort().join(",");
    const key = `${hemi}|${gp.stim_rate_filter}|${gp.wb}|${gp.wf}|${gp.we}|${gp.tau}|${gp.ftg_safe}|${selKey}`;
    if (_gtCache && _gtCacheKey === key) return _gtCache;

    const hData = (gtBundle.hemispheres || {})[hemi] || {};
    const rawArmsAll = hData.arms || [];
    const selSet = new Set(selContacts);
    // Strict contact-driven filtering: only arms related to selected contacts on DBS Lead!
    const rawArms = rawArmsAll.filter((a) => {
      const cs = a.contacts && a.contacts.length ? a.contacts : contactsForPairStr(a.pair, a.hemisphere);
      return cs.some((c) => selSet.has(`${a.hemisphere}:${c}`));
    });
    const amax = Math.max(0.5, hData.amax || 1.0);
    const rf = gp.stim_rate_filter;
    let filtered = rawArms;
    if (rf && rf !== "ALL") {
      const rNum = Number(rf);
      filtered = rawArms.filter((a) => Math.abs(a.stim_hz - rNum) < 1.0);
    }

    const scenarios = gtBundle.scenarios || {
      "Efficacy-first": { wb: 1.0, wf: 0.2, we: 0.2 },
      "Dyskinesia-averse": { wb: 1.0, wf: 1.5, we: 0.2 },
      "Battery-saver": { wb: 1.0, wf: 0.4, we: 1.5 },
      Balanced: { wb: 1.0, wf: 0.7, we: 0.6 },
    };
    const scenNames = Object.keys(scenarios);

    const arms = filtered.map((a, idx) => {
      const bs = a.win_beta_supp || [a.beta_supp_mean];
      const ft = a.win_ftg_db || [a.ftg_db_mean];
      const uArr = bs.map((b, i) => gtUtility(b, ft[i] ?? a.ftg_db_mean, a.amp, amax, gp));
      const uMean = uArr.reduce((s, v) => s + v, 0) / Math.max(1, uArr.length);
      const uVar = uArr.reduce((s, v) => s + (v - uMean) ** 2, 0) / Math.max(1, uArr.length);
      const u1 = a.beta_supp_mean;
      const u2 = -(gp.wf * Math.max(0, a.ftg_db_mean - gp.tau) + gp.we * 6.0 * a.energy);
      return {
        ...a,
        idx,
        uArr,
        U: uMean,
        U_sd: Math.sqrt(uVar),
        u1,
        u2,
      };
    });

    if (!arms.length) {
      _gtCache = { hemi, amax, arms: [], scenNames, stimRates: hData.stim_rates || [], mode: hData.mode || "", stack: [], consensus: [], majority: null };
      _gtCacheKey = key;
      return _gtCache;
    }

    // Oracle best
    let bestIdx = 0;
    for (let i = 1; i < arms.length; i++) if (arms[i].U > arms[bestIdx].U) bestIdx = i;

    // Nash Bargaining & Pareto Frontier
    const d1 = Math.min(...arms.map((a) => a.u1));
    const d2 = Math.min(...arms.map((a) => a.u2));
    let nbsIdx = 0, bestProd = -1;
    arms.forEach((a, i) => {
      a.nashProd = (a.u1 - d1) * (a.u2 - d2);
      if (a.nashProd > bestProd) { bestProd = a.nashProd; nbsIdx = i; }
      a.pareto = !arms.some((b) => b.u1 >= a.u1 && b.u2 >= a.u2 && (b.u1 > a.u1 || b.u2 > a.u2));
    });

    // Zero-Sum Payoff Matrix A (arms x 4 Nature scenarios) + Pure Maximin + MWU Mixed Nash
    const m = arms.length, k = scenNames.length;
    const A = arms.map((a) =>
      scenNames.map((sn) => {
        const sc = scenarios[sn];
        return gtUtility(a.beta_supp_mean, a.ftg_db_mean, a.amp, amax, { ...sc, tau: gp.tau });
      })
    );
    let maximinIdx = 0, bestMin = -Infinity;
    A.forEach((row, i) => {
      const mn = Math.min(...row);
      if (mn > bestMin) { bestMin = mn; maximinIdx = i; }
    });

    // Multiplicative Weights Updates (MWU) for Mixed Zero-Sum Nash Equilibrium
    let aMin = Infinity, aMax = -Infinity;
    for (let i = 0; i < m; i++) for (let j = 0; j < k; j++) { if (A[i][j] < aMin) aMin = A[i][j]; if (A[i][j] > aMax) aMax = A[i][j]; }
    const span = Math.max(1e-6, aMax - aMin);
    const An = A.map((row) => row.map((v) => (v - aMin) / span));
    const wx = new Float64Array(m).fill(1 / m);
    const wy = new Float64Array(k).fill(1 / k);
    const xAvg = new Float64Array(m);
    const yAvg = new Float64Array(k);
    const T = 1200;
    const eta = Math.sqrt(Math.log(Math.max(2, m + k)) / T) * 1.4;
    const loHist = [], hiHist = [];
    for (let t = 1; t <= T; t++) {
      // Payoffs under current mixed strategies
      let sx = 0, sy = 0;
      for (let i = 0; i < m; i++) xAvg[i] += wx[i];
      for (let j = 0; j < k; j++) yAvg[j] += wy[j];

      const rowPay = new Float64Array(m);
      for (let i = 0; i < m; i++) {
        let v = 0;
        for (let j = 0; j < k; j++) v += An[i][j] * wy[j];
        rowPay[i] = v;
      }
      const colPay = new Float64Array(k);
      for (let j = 0; j < k; j++) {
        let v = 0;
        for (let i = 0; i < m; i++) v += wx[i] * An[i][j];
        colPay[j] = v;
      }
      for (let i = 0; i < m; i++) { wx[i] *= Math.exp(eta * rowPay[i]); sx += wx[i]; }
      for (let i = 0; i < m; i++) wx[i] /= sx || 1;
      for (let j = 0; j < k; j++) { wy[j] *= Math.exp(-eta * colPay[j]); sy += wy[j]; }
      for (let j = 0; j < k; j++) wy[j] /= sy || 1;

      if (t % 30 === 0 || t === T) {
        let minCol = Infinity, maxRow = -Infinity;
        for (let j = 0; j < k; j++) {
          let v = 0;
          for (let i = 0; i < m; i++) v += (xAvg[i] / t) * A[i][j];
          if (v < minCol) minCol = v;
        }
        for (let i = 0; i < m; i++) {
          let v = 0;
          for (let j = 0; j < k; j++) v += A[i][j] * (yAvg[j] / t);
          if (v > maxRow) maxRow = v;
        }
        loHist.push(minCol);
        hiHist.push(maxRow);
      }
    }
    const xStar = Array.from(xAvg, (v) => v / T);
    const yStar = Array.from(yAvg, (v) => v / T);
    const gameVal = 0.5 * ((loHist[loHist.length - 1] ?? bestMin) + (hiHist[hiHist.length - 1] ?? bestMin));
    arms.forEach((a, i) => { a.pNash = xStar[i]; });

    // Stackelberg & Robust Stackelberg curves (strictly filtered by selected contacts!)
    let rawFits = (hData.stackelberg_fits || []).filter((f) => {
      const cs = f.contacts && f.contacts.length ? f.contacts : contactsForPairStr(f.pair, f.hemisphere);
      return cs.some((c) => selSet.has(`${f.hemisphere}:${c}`));
    });
    if (rf && rf !== "ALL") {
      const rNum = Number(rf);
      rawFits = rawFits.filter((f) => Math.abs(f.stim_hz - rNum) < 1.0);
    }
    const stack = rawFits.map((f) => {
      const U = f.grid.map((a, i) => gtUtility(f.beta[i], f.ftg[i], a, amax, gp));
      const Ur = f.grid.map((a, i) => gtUtility(f.beta_lo[i], f.ftg_hi[i], a, amax, gp));
      let iS = 0, iR = 0;
      for (let i = 1; i < U.length; i++) {
        if (U[i] > U[iS]) iS = i;
        if (Ur[i] > Ur[iR]) iR = i;
      }
      return {
        ...f,
        U,
        Ur,
        aStar: f.grid[iS],
        UStar: U[iS],
        aRobust: f.grid[iR],
        URobust: Ur[iR],
      };
    });

    // Nearest discrete arm helper for Stackelberg votes
    const nearestArm = (pair, stimHz, amp) => {
      let best = arms[0], bestDist = Infinity;
      for (const a of arms) {
        if (a.pair === pair && Math.abs(a.stim_hz - stimHz) < 1.0) {
          const d = Math.abs(a.amp - amp);
          if (d < bestDist) { bestDist = d; best = a; }
        }
      }
      return best;
    };

    const topNashIdx = xStar.reduce((b, v, i) => (v > xStar[b] ? i : b), 0);
    const sb = stack.length ? stack.reduce((b, s) => (s.UStar > b.UStar ? s : b), stack[0]) : null;
    const sr = stack.length ? stack.reduce((b, s) => (s.URobust > b.URobust ? s : b), stack[0]) : null;
    const sbArm = sb ? nearestArm(sb.pair, sb.stim_hz, sb.aStar) : null;
    const srArm = sr ? nearestArm(sr.pair, sr.stim_hz, sr.aRobust) : null;

    _gtCache = {
      hemi,
      amax,
      mode: hData.mode || "",
      stimRates: hData.stim_rates || [],
      arms,
      bestIdx,
      maximinIdx,
      nbsIdx,
      topNashIdx,
      d1,
      d2,
      A,
      scenNames,
      xStar,
      yStar,
      gameVal,
      loHist,
      hiHist,
      stack,
      sb,
      sr,
      sbArm,
      srArm,
    };
    _gtCacheKey = key;
    return _gtCache;
  }

  function resetBandit(gt) {
    if (state.bandit.timer) { clearInterval(state.bandit.timer); state.bandit.timer = null; }
    state.bandit.running = false;
    const K = gt.arms.length;
    state.bandit.key = `${gt.hemi}|${getGTParams().stim_rate_filter}|${K}`;
    state.bandit.pulls = [];
    state.bandit.n = new Array(K).fill(0);
    state.bandit.sumU = new Array(K).fill(0);
    state.bandit.sumFtg = new Array(K).fill(0);
    state.bandit.cumRegret = [];
    state.bandit.exhRegret = [];
    state.bandit.A = Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => (i === j ? 1 : 0)));
    state.bandit.b = new Array(6).fill(0);
    state.selection.gt_bandit_live = {};
  }

  function ensureBanditReady(gt) {
    const wantKey = `${gt.hemi}|${getGTParams().stim_rate_filter}|${gt.arms.length}`;
    if (state.bandit.key !== wantKey) resetBandit(gt);
  }

  function rescoreBandit(gt) {
    ensureBanditReady(gt);
    const gp = getGTParams();
    const K = gt.arms.length;
    if (!K || !state.bandit.pulls.length) return;
    state.bandit.n = new Array(K).fill(0);
    state.bandit.sumU = new Array(K).fill(0);
    state.bandit.sumFtg = new Array(K).fill(0);
    state.bandit.cumRegret = [];
    state.bandit.exhRegret = [];
    const bestMu = gt.arms[gt.bestIdx].U;
    let rAcc = 0, eAcc = 0;
    state.bandit.pulls.forEach((p, t) => {
      if (p.armIdx >= K) return;
      const a = gt.arms[p.armIdx];
      p.u = gtUtility(p.beta_supp, p.ftg_db, a.amp, gt.amax, gp);
      state.bandit.n[p.armIdx] += 1;
      state.bandit.sumU[p.armIdx] += p.u;
      state.bandit.sumFtg[p.armIdx] += p.ftg_db;
      rAcc += Math.max(0, bestMu - a.U);
      eAcc += Math.max(0, bestMu - gt.arms[t % K].U);
      state.bandit.cumRegret.push(rAcc);
      state.bandit.exhRegret.push(eAcc);
    });
    updateBanditSummary(gt);
  }

  function updateBanditSummary(gt) {
    const gp = getGTParams();
    const b = state.bandit;
    if (!b.pulls.length || !gt.arms.length) {
      state.selection.gt_bandit_live = {};
      return;
    }
    let bestI = -1, bestVal = -Infinity;
    for (let i = 0; i < gt.arms.length; i++) {
      if (b.n[i] <= 0) continue;
      if (gp.algo === "safe" && b.sumFtg[i] / b.n[i] > gp.ftg_safe) continue;
      const m = b.sumU[i] / b.n[i];
      if (m > bestVal) { bestVal = m; bestI = i; }
    }
    if (bestI < 0) bestI = b.pulls[b.pulls.length - 1].armIdx;
    const arm = gt.arms[bestI];
    state.selection.gt_bandit_live = {
      algo: gp.algo,
      pulls: b.pulls.length,
      recommended_arm_id: arm.arm_id,
      recommended_label: arm.label,
      recommended_U: Number(bestVal.toFixed(2)),
      regret: Number((b.cumRegret[b.cumRegret.length - 1] || 0).toFixed(2)),
    };
  }

  function stepBandit(gt) {
    ensureBanditReady(gt);
    const gp = getGTParams();
    const b = state.bandit;
    const K = gt.arms.length;
    if (!K) return;
    const t = b.pulls.length + 1;
    const algo = gp.algo || "thompson";
    const sig = Math.max(0.5, Math.sqrt(gt.arms.reduce((s, a) => s + a.U_sd * a.U_sd, 0) / K));
    const pairsUniq = Array.from(new Set(gt.arms.map((a) => a.pair)));

    let chosen = 0;
    if (algo === "exhaustive") {
      chosen = (t - 1) % K;
    } else if (algo === "eps") {
      const untried = b.n.findIndex((c) => c === 0);
      if (untried >= 0) chosen = untried;
      else if (Math.random() < 0.1) chosen = Math.floor(Math.random() * K);
      else chosen = b.sumU.reduce((bi, s, i) => (s / b.n[i] > b.sumU[bi] / b.n[bi] ? i : bi), 0);
    } else if (algo === "ucb1") {
      const untried = b.n.findIndex((c) => c === 0);
      if (untried >= 0) chosen = untried;
      else {
        let bv = -Infinity;
        for (let i = 0; i < K; i++) {
          const score = b.sumU[i] / b.n[i] + sig * Math.sqrt((2 * Math.log(t)) / b.n[i]);
          if (score > bv) { bv = score; chosen = i; }
        }
      }
    } else if (algo === "safe") {
      // One-step amplitude escalation per pair with FTG safety cap
      const cand = [];
      for (const pk of pairsUniq) {
        const idxs = gt.arms.map((a, i) => (a.pair === pk ? i : -1)).filter((i) => i >= 0);
        const safeTried = idxs.filter((i) => b.n[i] > 0 && b.sumFtg[i] / b.n[i] <= gp.ftg_safe);
        const hiAmp = safeTried.length ? Math.max(...safeTried.map((i) => gt.arms[i].amp)) : -1;
        const higher = idxs.filter((i) => gt.arms[i].amp > hiAmp);
        const nextAmp = higher.length ? Math.min(...higher.map((i) => gt.arms[i].amp)) : -9;
        for (const i of idxs) {
          if (safeTried.includes(i) || gt.arms[i].amp === nextAmp) cand.push(i);
        }
      }
      const pool = cand.length ? cand : gt.arms.map((_, i) => i);
      const untried = pool.filter((i) => b.n[i] === 0);
      if (untried.length) {
        chosen = untried.reduce((bi, i) => (gt.arms[i].amp < gt.arms[bi].amp ? i : bi), untried[0]);
      } else {
        let bv = -Infinity;
        for (const i of pool) {
          const score = b.sumU[i] / b.n[i] + sig * Math.sqrt((2 * Math.log(t)) / b.n[i]);
          if (score > bv) { bv = score; chosen = i; }
        }
      }
    } else if (algo === "linucb") {
      const Ainv = invertMatrix6(b.A);
      const th = Ainv.map((row) => row.reduce((s, v, j) => s + v * b.b[j], 0));
      let bv = -Infinity;
      for (let i = 0; i < K; i++) {
        const a = gt.arms[i];
        const cid = pairsUniq.indexOf(a.pair) % 2;
        const ph = [1, a.amp, a.amp * a.amp, cid, cid * a.amp, cid * a.amp * a.amp];
        const mean = ph.reduce((s, v, j) => s + v * th[j], 0);
        let quad = 0;
        for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) quad += ph[r] * Ainv[r][c] * ph[c];
        const score = mean + sig * Math.sqrt(Math.max(0, quad));
        if (score > bv) { bv = score; chosen = i; }
      }
    } else {
      // Thompson sampling
      let bv = -Infinity;
      for (let i = 0; i < K; i++) {
        const mu = b.sumU[i] / (b.n[i] + 0.05);
        const sd = sig / Math.sqrt(b.n[i] + 0.05);
        const sample = mu + sd * randn();
        if (sample > bv) { bv = sample; chosen = i; }
      }
    }

    // Draw a REAL 2-s recorded LFP window from the chosen arm!
    const arm = gt.arms[chosen];
    const winIdx = Math.floor(Math.random() * Math.max(1, arm.win_beta_supp.length));
    const bs = arm.win_beta_supp[winIdx] ?? arm.beta_supp_mean;
    const ft = arm.win_ftg_db[winIdx] ?? arm.ftg_db_mean;
    const u = gtUtility(bs, ft, arm.amp, gt.amax, gp);

    b.n[chosen] += 1;
    b.sumU[chosen] += u;
    b.sumFtg[chosen] += ft;
    const bestMu = gt.arms[gt.bestIdx].U;
    const prevR = b.cumRegret.length ? b.cumRegret[b.cumRegret.length - 1] : 0;
    const prevE = b.exhRegret.length ? b.exhRegret[b.exhRegret.length - 1] : 0;
    b.cumRegret.push(prevR + Math.max(0, bestMu - arm.U));
    b.exhRegret.push(prevE + Math.max(0, bestMu - gt.arms[(t - 1) % K].U));
    b.pulls.push({ armIdx: chosen, winIdx, beta_supp: bs, ftg_db: ft, amp: arm.amp, u });

    // Update LinUCB ridge matrix
    const cid = pairsUniq.indexOf(arm.pair) % 2;
    const ph = [1, arm.amp, arm.amp * arm.amp, cid, cid * arm.amp, cid * arm.amp * arm.amp];
    for (let r = 0; r < 6; r++) {
      b.b[r] += u * ph[r];
      for (let c = 0; c < 6; c++) b.A[r][c] += ph[r] * ph[c];
    }

    updateBanditSummary(gt);
  }

  function toggleBanditRun() {
    const gt = computeGT();
    ensureBanditReady(gt);
    const gp = getGTParams();
    if (state.bandit.running) {
      if (state.bandit.timer) clearInterval(state.bandit.timer);
      state.bandit.timer = null;
      state.bandit.running = false;
      renderAll();
      syncToPython(true);
      return;
    }
    if (state.bandit.pulls.length >= (gp.budget || 60)) resetBandit(gt);
    state.bandit.running = true;
    state.bandit.timer = setInterval(() => {
      const gNow = computeGT();
      if (!state.bandit.running || state.bandit.pulls.length >= (getGTParams().budget || 60)) {
        clearInterval(state.bandit.timer);
        state.bandit.timer = null;
        state.bandit.running = false;
        renderAll();
        syncToPython(true);
        return;
      }
      stepBandit(gNow);
      updateCrossHighlights(true);
      updateStatusBar();
      if (state.bandit.pulls.length % 10 === 0) syncToPython();
    }, 110);
    renderAll();
  }

  function toggleSelectArm(arm) {
    const cur = state.selection.gt_selected_arms || [];
    state.selection.gt_selected_arms = cur.includes(arm.arm_id)
      ? cur.filter((x) => x !== arm.arm_id)
      : [...cur, arm.arm_id];
    const pid = `${arm.hemisphere}:${arm.pair}`;
    if (!state.selection.pairs.includes(pid)) state.selection.pairs = [...state.selection.pairs, pid];
    if (arm.rec_id && !state.selection.recordings.includes(arm.rec_id)) {
      state.selection.recordings = [...state.selection.recordings, arm.rec_id];
    }
    state.selection.stim_rate_hz = arm.stim_hz || state.selection.stim_rate_hz;
    renderAll();
    syncToPython();
  }

  // ── Live Extreme-Value Risk Engine (VaR / CVaR / POT / GEV / Breach Rate / 5-Rule Selection) ──
  function getRiskParams() {
    if (!state.selection.risk_params) {
      state.selection.risk_params = {
        hemisphere: state.selection.hemisphere || "Left",
        stim_rate_filter: "ALL",
        target: "beta",
        alpha: 0.99,
        horizon: 60.0,
        kappa: 0.6,
        eps: 0.10,
        metric: "CVaR",
      };
    }
    return state.selection.risk_params;
  }

  function gevReturnLevelJS(mu, sg, xi, T) {
    if (mu == null || sg == null || !Number.isFinite(mu) || !Number.isFinite(sg)) return NaN;
    const tSafe = Math.max(1.001, Number(T) || 60);
    const y = -Math.log(1 - 1 / tSafe);
    if (Math.abs(xi) < 1e-6) return mu - sg * Math.log(y);
    return mu + (sg / xi) * (Math.pow(y, -xi) - 1);
  }

  let _riskCacheKey = "";
  let _riskCache = null;

  function computeRisk() {
    const rb = getPayload().risk || {};
    const rp = getRiskParams();
    const hemi = rp.hemisphere || "Left";
    const tg = rp.target === "ftg" ? "ftg" : "beta";
    const alpha = Number(rp.alpha) >= 0.985 ? 0.99 : 0.95;
    const lvl = alpha >= 0.985 ? "99" : "95";
    const H = Math.max(2, Number(rp.horizon) || 60);
    const kappa = Math.max(0, Number(rp.kappa ?? 0.6));
    const eps = clamp(Number(rp.eps ?? 0.10), 0.005, 0.99);
    const metric = rp.metric || "CVaR";
    const selContacts = state.selection.contacts || [];
    const selKey = selContacts.slice().sort().join(",");
    const key = `${hemi}|${rp.stim_rate_filter}|${tg}|${lvl}|${H}|${kappa}|${eps}|${metric}|${selKey}`;
    if (_riskCache && _riskCacheKey === key) return _riskCache;

    const hData = (rb.hemispheres || {})[hemi] || {};
    const allSeries = hData.series || [];
    const selSet = new Set(selContacts);

    // Contact-driven dynamic scoping (matches computeGT)
    const contactSeries = allSeries.filter((s) => {
      const cs = s.contacts && s.contacts.length ? s.contacts : contactsForPairStr(s.pair, s.hemisphere);
      return cs.some((c) => selSet.has(`${s.hemisphere}:${c}`));
    });
    const stimRates = Array.from(new Set(contactSeries.map((s) => s.stim_hz))).sort((a, b) => a - b);
    const rf = rp.stim_rate_filter;
    let series = contactSeries;
    if (rf && rf !== "ALL") {
      const rNum = Number(rf);
      series = contactSeries.filter((s) => Math.abs(s.stim_hz - rNum) < 1.0);
    }
    series = series.filter((s) => s.targets && s.targets[tg]);

    const arms = [];
    for (const s of series) {
      const tm = s.targets[tg];
      const [r0, r1] = tm.rate || [0, 0];
      const gevXi = Number(tm.gev_xi || 0);
      for (const a of tm.arms || []) {
        const lam = Math.exp(clamp(r0 + r1 * a.amp, -12, 6));
        const breach = 1 - Math.exp(-lam * H);
        const rl = a.gev_mu != null && a.gev_sigma != null ? gevReturnLevelJS(a.gev_mu, a.gev_sigma, gevXi, H) : NaN;
        const varVal = Number(a["VaR" + lvl]);
        const cvarVal = Number(a["CVaR" + lvl]);
        const evtVal = a.EVT_VaR999 != null ? Number(a.EVT_VaR999) : NaN;
        arms.push({
          ...a,
          seriesId: s.id,
          seriesLabel: s.label,
          tm,
          u: tm.u,
          xi0: tm.xi0,
          gev_xi: gevXi,
          VaR: varVal,
          CVaR: cvarVal,
          EVT_VaR999: evtVal,
          rl,
          lamModel: lam,
          breach,
        });
      }
    }

    const amax = Math.max(0.5, ...arms.map((a) => a.amp), hData.amax || 0.5);
    const cvs = arms.map((a) => a.CVaR).filter(Number.isFinite);
    const cvLo = cvs.length ? Math.min(...cvs) : 0;
    const cvHi = cvs.length ? Math.max(...cvs) : 1;
    arms.forEach((a, idx) => {
      a.idx = idx;
      a.energy = (a.amp / amax) ** 2;
      a.score = (a.CVaR - cvLo) / (cvHi - cvLo + 1e-9) + kappa * a.energy;
    });

    const metricOf = (a, m = metric) =>
      m === "CVaR" ? a.CVaR :
      m === "VaR" ? a.VaR :
      m === "EVT" ? a.EVT_VaR999 :
      m === "RL" ? a.rl :
      m === "breach" ? a.breach : a.score;

    const bestBy = (fn) => {
      let best = null, bestV = Infinity;
      for (const a of arms) {
        const v = fn(a);
        if (Number.isFinite(v) && v < bestV) { bestV = v; best = a; }
      }
      return best;
    };

    const pickCvar = bestBy((a) => a.CVaR);
    const pickEvt = bestBy((a) => a.EVT_VaR999);
    const pickRl = bestBy((a) => a.rl);
    const pickScore = bestBy((a) => a.score);
    const safeList = arms
      .filter((a) => a.amp > 0 && Number.isFinite(a.breach) && a.breach <= eps)
      .sort((x, y) => x.energy - y.energy || x.CVaR - y.CVaR);
    const pickSafe = safeList[0] || null;

    const rules = [
      { key: "cvar",  name: `min CVaR${lvl}`,          arm: pickCvar,  val: pickCvar ? pickCvar.CVaR.toFixed(3) : "—" },
      { key: "evt",   name: "min EVT-VaR99.9",         arm: pickEvt,   val: pickEvt ? pickEvt.EVT_VaR999.toFixed(3) : "—" },
      { key: "rl",    name: `min ${H}s Return Level`,  arm: pickRl,    val: pickRl ? pickRl.rl.toFixed(3) : "—" },
      { key: "score", name: `Risk + ${kappa.toFixed(2)}·E`, arm: pickScore, val: pickScore ? pickScore.score.toFixed(3) : "—" },
      { key: "safe",  name: `Safe P(br ${H}s) ≤ ${(100 * eps).toFixed(0)}%`, arm: pickSafe, val: pickSafe ? `${(100 * pickSafe.breach).toFixed(1)}%` : "none" },
    ];

    const votes = {};
    let totalVotes = 0;
    for (const r of rules) {
      if (r.arm) {
        votes[r.arm.label] = (votes[r.arm.label] || 0) + 1;
        totalVotes += 1;
      }
    }
    let majLabel = "—", majCnt = 0;
    for (const [k, v] of Object.entries(votes)) if (v > majCnt) { majCnt = v; majLabel = k; }

    // Filter Kupiec backtest rows to scoped contacts, rate, target
    const backtest = (hData.backtest || []).filter((row) => {
      if (row.target !== tg) return false;
      const cs = row.contacts && row.contacts.length ? row.contacts : contactsForPairStr(row.pair, row.hemisphere);
      if (!cs.some((c) => selSet.has(`${row.hemisphere}:${c}`))) return false;
      if (rf && rf !== "ALL" && Math.abs(row.stim_hz - Number(rf)) >= 1.0) return false;
      return true;
    });

    const out = {
      hemi,
      target: tg,
      alpha,
      lvl,
      H,
      kappa,
      eps,
      metric,
      amax,
      stimRates,
      T_grid: rb.spec?.T_grid || [1, 2, 5, 10, 30, 60, 120, 300, 600],
      series,
      arms,
      rules,
      picks: { cvar: pickCvar, evt: pickEvt, rl: pickRl, score: pickScore, safe: pickSafe },
      majLabel,
      majCnt,
      totalVotes,
      backtest,
      metricOf,
    };
    _riskCacheKey = key;
    _riskCache = out;
    return out;
  }

  function resolveRiskSeries(node, rk) {
    if (!rk.series.length) return null;
    if (node.seriesId) {
      const hit = rk.series.find((s) => s.id === node.seriesId);
      if (hit) return hit;
    }
    const byPair = node.pair ? rk.series.find((s) => s.pair === node.pair) : null;
    return byPair || rk.series[0];
  }

  function toggleSelectRiskArm(arm) {
    const cur = state.selection.risk_selected_arms || [];
    state.selection.risk_selected_arms = cur.includes(arm.arm_id)
      ? cur.filter((x) => x !== arm.arm_id)
      : [...cur, arm.arm_id];
    const pid = `${arm.hemisphere}:${arm.pair}`;
    if (!state.selection.pairs.includes(pid)) state.selection.pairs = [...state.selection.pairs, pid];
    if (arm.rec_id && !state.selection.recordings.includes(arm.rec_id)) {
      state.selection.recordings = [...state.selection.recordings, arm.rec_id];
    }
    state.selection.stim_rate_hz = arm.stim_hz || state.selection.stim_rate_hz;
    renderAll();
    syncToPython();
  }

  // ── Live Option-Pricing Engine (Log-OU, Black-76, Nelson–Ramaswamy Lattice, Greeks, Alpha) ──
  function getOptParams() {
    if (!state.selection.opt_params) {
      state.selection.opt_params = {
        hemisphere: state.selection.hemisphere || "Left",
        stim_rate_filter: "ALL",
        strategy: "call",
        T: 0.25,
        k_burst_mult: 1.0,
        k_low: 0.5,
        k_set: 0.7,
        wing: 0.25,
        w_ftg: 0.5,
        w_energy: 0.02,
        steps: 10,
      };
    }
    return state.selection.opt_params;
  }

  function optNcdf(x) {
    const z = Math.abs(x) / Math.SQRT2;
    const t = 1 / (1 + 0.3275911 * z);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
    return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
  }

  function optBlack76(F, K, v, kind) {
    if (K <= 0) return kind === "call" ? Math.max(F, 0) : 0;
    const vv = Math.max(v, 1e-12);
    const sv = Math.sqrt(vv);
    const d1 = (Math.log(Math.max(F, 1e-12) / K) + 0.5 * vv) / sv;
    const d2 = d1 - sv;
    return kind === "call" ? F * optNcdf(d1) - K * optNcdf(d2) : K * optNcdf(-d2) - F * optNcdf(-d1);
  }

  function optPolyval(c, a) {
    return (c || [0]).reduce((acc, k) => acc * a + k, 0);
  }

  function optOuMom(x0, p, T) {
    const e = Math.exp(-p.kappa * T);
    return [p.theta + (x0 - p.theta) * e, p.s * p.s * (1 - e * e)];
  }

  function optPriceLegs(m, v, legs) {
    const F = Math.exp(m + 0.5 * Math.max(v, 0));
    let s = 0;
    for (const [sg, kd, K] of legs) if (K > 0) s += sg * optBlack76(F, K, v, kd);
    return s;
  }

  function optPayoffLegs(S, legs) {
    let s = 0;
    for (const [sg, kd, K] of legs) s += sg * (kd === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0));
    return s;
  }

  function optLattice(x0, p, T, K, steps) {
    const stp = Math.max(4, Math.min(40, Math.round(steps || 10)));
    const dt = Math.max(T, 0.01) / stp;
    const sig = Math.max(p.sigma || 0.2, 1e-4);
    const dx = sig * Math.sqrt(dt);
    const xs = (n) => Array.from({ length: n + 1 }, (_, j) => x0 + dx * (2 * j - n));
    const f = (x) => Math.max(Math.exp(clamp(x, -12, 12)) - K, 0);
    let V = xs(stp).map(f);
    let Ve = V.slice();
    const nodes = [xs(stp).map((x, j) => ({ x, V: V[j], ex: V[j] > 0 }))];
    let cont0 = 0;
    for (let n = stp - 1; n >= 0; n--) {
      const x = xs(n);
      const nv = [], ne = [], lay = [];
      for (let j = 0; j <= n; j++) {
        const pu = clamp(0.5 + (p.kappa * (p.theta - x[j]) * Math.sqrt(dt)) / (2 * sig), 0, 1);
        const cont = pu * V[j + 1] + (1 - pu) * V[j];
        const ex = f(x[j]);
        ne.push(pu * Ve[j + 1] + (1 - pu) * Ve[j]);
        nv.push(Math.max(cont, ex));
        lay.push({ x: x[j], V: nv[j], ex: ex > 0 && ex >= cont });
        if (n === 0) cont0 = cont;
      }
      V = nv;
      Ve = ne;
      nodes.unshift(lay);
    }
    return { am: V[0], eu: Ve[0], cont0, nodes, dx, steps: stp };
  }

  function optLegsOf(name, K) {
    const w = Math.max(0.05, K.wing || 0.25);
    return (
      {
        call: [[1, "call", K.burst]],
        strangle: [[1, "put", K.low], [1, "call", K.burst]],
        straddle: [[1, "put", K.set], [1, "call", K.set]],
        butterfly: [[1 / w, "call", Math.max(0.05, K.set - w)], [-2 / w, "call", K.set], [1 / w, "call", K.set + w]],
        bullspread: [[1, "call", K.burst], [-1, "call", K.ceil]],
        calendar: [[1, "call", K.burst]],
        ftgcall: [[1, "call", K.ftg]],
      }[name] || [[1, "call", K.burst]]
    );
  }

  let _optCacheKey = "";
  let _optCache = null;

  function computeOptions() {
    const ob = getPayload().options || {};
    const op = getOptParams();
    const hemi = op.hemisphere || "Left";
    const strat = op.strategy || "call";
    const T = clamp(Number(op.T || 0.25), 0.05, 3.0);
    const kbMult = clamp(Number(op.k_burst_mult || 1.0), 0.5, 1.8);
    const kLow = clamp(Number(op.k_low || 0.5), 0.15, 1.2);
    const kSet = clamp(Number(op.k_set || 0.7), 0.2, 1.5);
    const wing = clamp(Number(op.wing || 0.25), 0.05, 0.6);
    const wFtg = Math.max(0, Number(op.w_ftg ?? 0.5));
    const wEnergy = Math.max(0, Number(op.w_energy ?? 0.02));
    const steps = clamp(Math.round(Number(op.steps || 10)), 4, 16);
    const sign = strat === "butterfly" ? -1 : 1;
    const isFtg = strat === "ftgcall";
    const selContacts = state.selection.contacts || [];
    const selKey = selContacts.slice().sort().join(",");
    const key = `${hemi}|${op.stim_rate_filter}|${strat}|${T}|${kbMult}|${kLow}|${kSet}|${wing}|${wFtg}|${wEnergy}|${selKey}`;
    if (_optCache && _optCacheKey === key) return _optCache;

    const hData = (ob.hemispheres || {})[hemi] || {};
    const allSeries = hData.series || [];
    const selSet = new Set(selContacts);

    const contactSeries = allSeries.filter((s) => {
      const cs = s.contacts && s.contacts.length ? s.contacts : contactsForPairStr(s.pair, s.hemisphere);
      return cs.some((c) => selSet.has(`${s.hemisphere}:${c}`));
    });
    const stimRates = Array.from(new Set(contactSeries.map((s) => s.stim_hz))).sort((a, b) => a - b);
    const rf = op.stim_rate_filter;
    let series = contactSeries;
    if (rf && rf !== "ALL") {
      const rNum = Number(rf);
      series = contactSeries.filter((s) => Math.abs(s.stim_hz - rNum) < 1.0);
    }

    const statPrem = (p, K) => {
      const legs = optLegsOf(strat, K);
      if (strat === "calendar") {
        const x0 = Math.log(Math.max(K.burst, 0.05));
        const [m1, v1] = optOuMom(x0, p, T);
        const [m2, v2] = optOuMom(x0, p, 2 * T);
        return optPriceLegs(m2, v2, legs) - optPriceLegs(m1, v1, legs);
      }
      return optPriceLegs(p.theta, p.s * p.s, legs);
    };

    const arms = [];
    const alphaSeries = [];
    let alphaBestOverall = null;

    for (const s of series) {
      const K = {
        burst: (s.K?.burst || 1.2) * kbMult,
        low: kLow,
        set: kSet,
        ceil: (s.K?.burst || 1.2) * kbMult + 0.6,
        wing,
        ftg: s.K?.ftg || 1.5,
      };
      const sArms = s.arms || [];
      const kbMean = sArms.length ? sArms.reduce((acc, a) => acc + a.b_kappa, 0) / sArms.length : 6.0;
      const kfMean = sArms.length ? sArms.reduce((acc, a) => acc + a.f_kappa, 0) / sArms.length : 6.0;

      for (const a of sArms) {
        const pb = { theta: a.b_theta, kappa: a.b_kappa, sigma: a.b_sigma, s: a.b_s };
        const pf = { theta: a.f_theta, kappa: a.f_kappa, sigma: a.f_sigma, s: a.f_s };
        const sp = statPrem(isFtg ? pf : pb, K);
        const fp = optPriceLegs(pf.theta, pf.s * pf.s, [[1, "call", K.ftg]]);
        const port = sign * sp + (isFtg ? 0 : wFtg * fp) + wEnergy * a.amp * a.amp;
        const x0 = Math.log(Math.max(K.burst, 0.05));
        const lt = optLattice(x0, pb, T, K.burst, 24);
        arms.push({
          ...a,
          seriesId: s.id,
          seriesLabel: s.label,
          K,
          pb,
          pf,
          prem: sp,
          ftg: fp,
          val: port,
          am: lt.am,
          eu: lt.eu,
          adapt: Math.max(0, lt.am - lt.eu),
        });
      }

      // Smooth fitted Alpha curves Π(a) & ∂Π/∂a
      const cv = s.curves || {};
      const grid = cv.grid || [];
      if (grid.length >= 2) {
        const pts = grid.map((aVal) => {
          const pb = { theta: optPolyval(cv.b_theta, aVal), s: Math.max(0.05, optPolyval(cv.b_s, aVal)), kappa: kbMean };
          const pf = { theta: optPolyval(cv.f_theta, aVal), s: Math.max(0.05, optPolyval(cv.f_s, aVal)), kappa: kfMean };
          pb.sigma = pb.s * Math.sqrt(2 * kbMean);
          pf.sigma = pf.s * Math.sqrt(2 * kfMean);
          const sp = statPrem(isFtg ? pf : pb, K);
          const fp = optPriceLegs(pf.theta, pf.s * pf.s, [[1, "call", K.ftg]]);
          const val = sign * sp + (isFtg ? 0 : wFtg * fp) + wEnergy * aVal * aVal;
          return { a: aVal, prem: sp, ftg: fp, val };
        });
        pts.forEach((q, i) => {
          const j0 = Math.max(0, i - 1), j1 = Math.min(pts.length - 1, i + 1);
          q.alpha = (pts[j1].val - pts[j0].val) / Math.max(1e-6, pts[j1].a - pts[j0].a);
        });
        const best = pts.reduce((b, q) => (q.val < b.val ? q : b), pts[0]);
        const entry = { seriesId: s.id, label: s.label, pair: s.pair, stim_hz: s.stim_hz, pts, best };
        alphaSeries.push(entry);
        if (!alphaBestOverall || best.val < alphaBestOverall.best.val) alphaBestOverall = entry;
      }
    }

    arms.forEach((a, i) => { a.idx = i; });
    const amax = Math.max(0.5, ...arms.map((a) => a.amp), hData.amax || 0.5);
    const minBy = (fn, flt = () => true) => {
      let best = null, bestV = Infinity;
      for (const a of arms) {
        if (!flt(a)) continue;
        const v = fn(a);
        if (Number.isFinite(v) && v < bestV) { bestV = v; best = a; }
      }
      return best;
    };

    const pickPort = minBy((a) => a.val);
    const pickStrat = minBy((a) => sign * a.prem);
    const hasPos = arms.some((a) => a.amp > 0);
    const pickFtg = minBy((a) => a.ftg, (a) => !hasPos || a.amp > 0);
    const pickAdapt = minBy((a) => -a.adapt, (a) => !hasPos || a.amp > 0);

    // Map continuous Alpha=0 optimum to nearest recorded arm for layered-boundary badge & voting
    let alphaArm = null;
    if (alphaBestOverall) {
      const cand = arms.filter((a) => a.seriesId === alphaBestOverall.seriesId);
      const pool = cand.length ? cand : arms;
      alphaArm = pool.reduce((b, a) => (Math.abs(a.amp - alphaBestOverall.best.a) < Math.abs(b.amp - alphaBestOverall.best.a) ? a : b), pool[0]);
    }

    const stratTitle = (OPT_STRATS.find((x) => x[0] === strat) || ["call", "Long Call"])[1];
    const rules = [
      { key: "portfolio", name: "min Portfolio Π", arm: pickPort, val: pickPort ? pickPort.val.toFixed(4) : "—" },
      { key: "strategy",  name: `${sign < 0 ? "max" : "min"} ${stratTitle}`, arm: pickStrat, val: pickStrat ? pickStrat.prem.toFixed(4) : "—" },
      { key: "ftg",       name: "min FTG Call (a > 0)", arm: pickFtg, val: pickFtg ? pickFtg.ftg.toFixed(4) : "—" },
      { key: "adapt",     name: "max Adaptivity (aDBS)", arm: pickAdapt, val: pickAdapt ? `+${pickAdapt.adapt.toFixed(4)}` : "—" },
      {
        key: "alpha",
        name: "Alpha ∂Π/∂a = 0",
        arm: alphaArm,
        label: alphaBestOverall ? `${alphaBestOverall.label} @ ${alphaBestOverall.best.a.toFixed(2)} mA` : "—",
        val: alphaBestOverall ? alphaBestOverall.best.val.toFixed(4) : "—",
      },
    ];

    const votes = {};
    let totalVotes = 0;
    for (const r of rules) {
      if (r.arm) {
        votes[r.arm.label] = (votes[r.arm.label] || 0) + 1;
        totalVotes += 1;
      }
    }
    let majLabel = "—", majCnt = 0;
    for (const [k, v] of Object.entries(votes)) if (v > majCnt) { majCnt = v; majLabel = k; }

    const out = {
      hemi,
      strategy: strat,
      stratTitle,
      sign,
      isFtg,
      T,
      kbMult,
      kLow,
      kSet,
      wing,
      wFtg,
      wEnergy,
      steps,
      amax,
      stimRates,
      spec: ob.spec || { hist_xmax: 2.6, hist_bins: 28, chain_ks: [0.4, 0.55, 0.7, 0.85, 1.0, 1.15, 1.3, 1.45, 1.6, 1.75, 1.9, 2.05] },
      series,
      arms,
      alphaSeries,
      alphaBestOverall,
      rules,
      picks: { portfolio: pickPort, strategy: pickStrat, ftg: pickFtg, adapt: pickAdapt, alpha: alphaArm },
      majLabel,
      majCnt,
      totalVotes,
    };
    _optCacheKey = key;
    _optCache = out;
    return out;
  }

  function resolveOptSeries(node, opData) {
    if (!opData.series.length) return null;
    if (node.seriesId) {
      const hit = opData.series.find((s) => s.id === node.seriesId);
      if (hit) return hit;
    }
    const byPair = node.pair ? opData.series.find((s) => s.pair === node.pair) : null;
    return byPair || opData.series[0];
  }

  function toggleSelectOptArm(arm) {
    const cur = state.selection.opt_selected_arms || [];
    state.selection.opt_selected_arms = cur.includes(arm.arm_id)
      ? cur.filter((x) => x !== arm.arm_id)
      : [...cur, arm.arm_id];
    const pid = `${arm.hemisphere}:${arm.pair}`;
    if (!state.selection.pairs.includes(pid)) state.selection.pairs = [...state.selection.pairs, pid];
    if (arm.rec_id && !state.selection.recordings.includes(arm.rec_id)) {
      state.selection.recordings = [...state.selection.recordings, arm.rec_id];
    }
    state.selection.stim_rate_hz = arm.stim_hz || state.selection.stim_rate_hz;
    renderAll();
    syncToPython();
  }

  // ── Live NeuroWeave 5.0 GSP Engine (RBF Graph, Laplacians, Jacobi Eigen, GTV/LGFE/GSE, σ-Sweep) ──
  const GSP_SIGMA_GRID = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0, 8.0];

  function getGspParams() {
    if (!state.selection.gsp_params) {
      state.selection.gsp_params = {
        hemisphere: state.selection.hemisphere || "Left",
        stim_rate_filter: "ALL",
        sigma: 2.0,
        series_id: "",
        phase_band: "ftg",
        node_size_metric: "local_ftg",
      };
    }
    return state.selection.gsp_params;
  }

  function gspDivColor(v) {
    const u = clamp(v, -1, 1);
    if (u >= 0) {
      const r = Math.round(255 + (184 - 255) * u);
      const g = Math.round(255 + (29 - 255) * u);
      const b = Math.round(255 + (51 - 255) * u);
      return `rgb(${r},${g},${b})`;
    }
    const t = -u;
    const r = Math.round(255 + (31 - 255) * t);
    const g = Math.round(255 + (36 - 255) * t);
    const b = Math.round(255 + (44 - 255) * t);
    return `rgb(${r},${g},${b})`;
  }

  /** Classic Jacobi symmetric eigensolver (returns { values, vectors } sorted ascending; columns = eigenvectors). */
  function gspSymEigen(M) {
    const n = M.length;
    const A = M.map((row) => row.slice());
    const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
    const maxIter = Math.max(40, n * n * 18);
    for (let iter = 0; iter < maxIter; iter++) {
      let p = 0, q = 1, maxOff = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const av = Math.abs(A[i][j]);
          if (av > maxOff) { maxOff = av; p = i; q = j; }
        }
      }
      if (maxOff < 1e-11) break;
      const app = A[p][p], aqq = A[q][q], apq = A[p][q];
      const tau = (aqq - app) / (2 * apq);
      const t = tau >= 0 ? 1 / (tau + Math.sqrt(1 + tau * tau)) : -1 / (-tau + Math.sqrt(1 + tau * tau));
      const c = 1 / Math.sqrt(1 + t * t);
      const s = t * c;
      A[p][p] = app - t * apq;
      A[q][q] = aqq + t * apq;
      A[p][q] = 0;
      A[q][p] = 0;
      for (let k = 0; k < n; k++) {
        if (k !== p && k !== q) {
          const akp = A[k][p], akq = A[k][q];
          A[k][p] = A[p][k] = c * akp - s * akq;
          A[k][q] = A[q][k] = s * akp + c * akq;
        }
        const vkp = V[k][p], vkq = V[k][q];
        V[k][p] = c * vkp - s * vkq;
        V[k][q] = s * vkp + c * vkq;
      }
    }
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => A[a][a] - A[b][b]);
    const values = order.map((idx) => Math.max(0, A[idx][idx]));
    const vectors = Array.from({ length: n }, (_, r) => order.map((idx) => V[r][idx]));
    return { values, vectors };
  }

  function gspAnalyseSeries(ser, freqs, sigma, ftgHalfBw) {
    const X = ser.X || [];
    const d2 = ser.d2 || [];
    const amps = ser.amps || [];
    const K = X.length;
    const F = freqs.length;
    const ftgCenter = ser.ftg_center_hz || ((ser.stim_hz || 145) / 2);
    const ftgLo = Math.max(35, ftgCenter - ftgHalfBw);
    const ftgHi = Math.min(122, ftgCenter + ftgHalfBw);
    if (K < 2 || !F) {
      return { n_nodes: K, sigma, ftg_band: [ftgLo, ftgHi], beta_band: [13, 30], measures: { n_nodes: K } };
    }
    const sig = Math.max(0.25, Number(sigma) || 2.0);
    const denom = 2 * sig * sig;

    const W = Array.from({ length: K }, (_, i) =>
      Array.from({ length: K }, (_, j) => (i === j ? 0 : Math.exp(-(d2[i][j] || 0) / denom)))
    );
    const deg = W.map((row) => row.reduce((a, b) => a + b, 0));
    const L = Array.from({ length: K }, (_, i) =>
      Array.from({ length: K }, (_, j) => (i === j ? deg[i] : -W[i][j]))
    );
    const dis = deg.map((d) => (d > 0 ? 1 / Math.sqrt(d + 1e-12) : 0));
    const Lsym = Array.from({ length: K }, (_, i) =>
      Array.from({ length: K }, (_, j) => dis[i] * L[i][j] * dis[j])
    );

    const eigL = gspSymEigen(L);
    const eigS = gspSymEigen(Lsym);
    const lam = eigL.values;
    const U = eigL.vectors;
    const mu = eigS.values;
    const Usym = eigS.vectors;

    const fv = U.map((row) => row[1] || 0);
    if (Math.abs(fv[0]) > 1e-12 && fv[0] < 0) {
      for (let k = 0; k < K; k++) fv[k] = -fv[k];
    }
    let bp = null;
    for (let k = 1; k < K; k++) {
      if (fv[k] < 0) { bp = amps[k]; break; }
    }

    // Frequency masks
    const betaIdx = [];
    const ftgIdx = [];
    for (let f = 0; f < F; f++) {
      if (freqs[f] >= 13 && freqs[f] <= 30) betaIdx.push(f);
      if (freqs[f] >= ftgLo && freqs[f] <= ftgHi) ftgIdx.push(f);
    }
    if (!ftgIdx.length) {
      let bestI = 0, bestD = Infinity;
      for (let f = 0; f < F; f++) {
        const dd = Math.abs(freqs[f] - ftgCenter);
        if (dd < bestD) { bestD = dd; bestI = f; }
      }
      ftgIdx.push(bestI);
    }

    // GTV(f) = sum_{i,j} W_ij (X_i(f) - X_j(f))^2
    const gtv_f = new Array(F).fill(0);
    for (let i = 0; i < K; i++) {
      for (let j = i + 1; j < K; j++) {
        const w2 = 2 * W[i][j];
        if (w2 <= 0) continue;
        const xi = X[i], xj = X[j];
        for (let f = 0; f < F; f++) {
          const df = xi[f] - xj[f];
          gtv_f[f] += w2 * df * df;
        }
      }
    }

    // Node-centered GFT power on Usym
    const meanF = new Array(F).fill(0);
    for (let f = 0; f < F; f++) {
      let s = 0;
      for (let i = 0; i < K; i++) s += X[i][f];
      meanF[f] = s / K;
    }
    const pAll = Array.from({ length: K }, () => new Array(F).fill(0));
    for (let m = 0; m < K; m++) {
      for (let f = 0; f < F; f++) {
        let proj = 0;
        for (let i = 0; i < K; i++) proj += Usym[i][m] * (X[i][f] - meanF[f]);
        pAll[m][f] = proj * proj + 1e-12;
      }
    }
    const half = Math.max(1, Math.floor(K / 2));
    const logK = Math.log(K + 1e-12);
    const lgfe_f = new Array(F).fill(0);
    const gse_f = new Array(F).fill(0);
    for (let f = 0; f < F; f++) {
      let tot = 0, lo = 0;
      for (let m = 0; m < K; m++) {
        tot += pAll[m][f];
        if (m < half) lo += pAll[m][f];
      }
      lgfe_f[f] = lo / tot;
      let ent = 0;
      for (let m = 0; m < K; m++) {
        const pr = pAll[m][f] / tot;
        ent -= pr * Math.log(pr);
      }
      gse_f[f] = ent / logK;
    }

    // Amplitude-step coherence
    const Z = X.map((row) => {
      let norm = 0;
      for (let f = 0; f < F; f++) norm += row[f] * row[f];
      const inv = 1 / (Math.sqrt(norm) + 1e-12);
      return row.map((v) => v * inv);
    });
    const coh_f = new Array(F).fill(0);
    let cohSum = 0;
    for (let i = 0; i < K - 1; i++) {
      let dot = 0;
      for (let f = 0; f < F; f++) {
        const prod = Z[i][f] * Z[i + 1][f];
        coh_f[f] += prod / (K - 1);
        dot += prod;
      }
      cohSum += dot;
    }
    const coherence = cohSum / (K - 1);

    // GFT mode energies E_beta, E_ftg
    const E_beta = pAll.map((row) => betaIdx.reduce((a, f) => a + row[f], 0) / Math.max(1, betaIdx.length));
    const E_ftg = pAll.map((row) => ftgIdx.reduce((a, f) => a + row[f], 0) / Math.max(1, ftgIdx.length));

    // Local node variation in Beta and FTG
    const local_beta = new Array(K).fill(0);
    const local_ftg = new Array(K).fill(0);
    for (let i = 0; i < K; i++) {
      let sb = 0, sf = 0;
      for (let j = 0; j < K; j++) {
        if (i === j || W[i][j] <= 0) continue;
        let db = 0, df = 0;
        for (const f of betaIdx) { const d = X[i][f] - X[j][f]; db += d * d; }
        for (const f of ftgIdx) { const d = X[i][f] - X[j][f]; df += d * d; }
        sb += W[i][j] * (db / Math.max(1, betaIdx.length));
        sf += W[i][j] * (df / Math.max(1, ftgIdx.length));
      }
      local_beta[i] = sb;
      local_ftg[i] = sf;
    }

    const avgAt = (arr, idxs) => idxs.reduce((a, f) => a + arr[f], 0) / Math.max(1, idxs.length);
    const avgAll = (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
    let wSum = 0, wCnt = 0;
    for (let i = 0; i < K; i++) for (let j = i + 1; j < K; j++) { wSum += W[i][j]; wCnt++; }
    let pkF = freqs[0], pkV = -Infinity;
    for (let f = 0; f < F; f++) if (gtv_f[f] > pkV) { pkV = gtv_f[f]; pkF = freqs[f]; }

    return {
      n_nodes: K,
      sigma: sig,
      ftg_band: [ftgLo, ftgHi],
      beta_band: [13, 30],
      W, L, Lsym, d2, lam, mu, U, Usym,
      fiedler_vec: fv,
      gtv_f, lgfe_f, gse_f, coh_f,
      E_beta, E_ftg, local_beta, local_ftg,
      measures: {
        n_nodes: K,
        fiedler_value: lam[1],
        lambda_max: lam[K - 1],
        spectral_gap_ratio: lam[K - 1] > 1e-12 ? lam[1] / lam[K - 1] : null,
        mean_w: wCnt ? wSum / wCnt : 0,
        fiedler_breakpoint: bp,
        gtv_beta: avgAt(gtv_f, betaIdx),
        gtv_ftg: avgAt(gtv_f, ftgIdx),
        gtv_total: avgAll(gtv_f),
        lgfe_beta: avgAt(lgfe_f, betaIdx),
        lgfe_ftg: avgAt(lgfe_f, ftgIdx),
        lgfe_all: avgAll(lgfe_f),
        gse_beta: avgAt(gse_f, betaIdx),
        gse_ftg: avgAt(gse_f, ftgIdx),
        gse_all: avgAll(gse_f),
        coherence,
        gtv_peak_freq: pkF,
      },
    };
  }

  let _gspCacheKey = "";
  let _gspCache = null;

  function computeGspData() {
    const bundle = getPayload().weave || {};
    const gp = getGspParams();
    const freqs = bundle.freqs || [];
    const selContacts = (state.selection.contacts || []).slice().sort().join(",");
    const ftgHw = Number(state.selection.ftg_half_bw_hz || bundle.spec?.ftg_hw_hz || 2.5);
    const key = JSON.stringify({
      h: gp.hemisphere,
      r: gp.stim_rate_filter,
      s: Number(gp.sigma || 2.0).toFixed(3),
      sid: gp.series_id || "",
      hw: ftgHw.toFixed(2),
      c: selContacts,
    });
    if (_gspCache && _gspCacheKey === key) return _gspCache;

    const hData = (bundle.hemispheres || {})[gp.hemisphere] || { series: [], stim_rates: [], mode: "amplitude_sweep" };
    const selSet = new Set(state.selection.contacts || []);
    const series = (hData.series || []).filter((s) => {
      if (s.contacts && s.contacts.length && !s.contacts.some((c) => selSet.has(`${s.hemisphere}:${c}`))) return false;
      if (gp.stim_rate_filter && gp.stim_rate_filter !== "ALL") {
        if (Math.abs(Number(s.stim_hz) - Number(gp.stim_rate_filter)) >= 1.0) return false;
      }
      return true;
    });

    const sig = Math.max(0.25, Number(gp.sigma || 2.0));
    const analysed = {};
    for (const s of series) {
      analysed[s.id] = gspAnalyseSeries(s, freqs, sig, ftgHw);
    }

    let activeSeries = series.find((s) => s.id === gp.series_id) || null;
    if (!activeSeries && series.length) {
      activeSeries = series.reduce((best, cur) => ((cur.amps?.length || 0) > (best.amps?.length || 0) ? cur : best), series[0]);
      gp.series_id = activeSeries.id;
    }
    const activeGsp = activeSeries ? analysed[activeSeries.id] : null;

    // Precompute σ-sensitivity sweep for active series
    const sigmaSweep = [];
    if (activeSeries) {
      for (const sg of GSP_SIGMA_GRID) {
        const gs = gspAnalyseSeries(activeSeries, freqs, sg, ftgHw);
        sigmaSweep.push({
          sigma: sg,
          fiedler_value: gs.measures.fiedler_value ?? 0,
          gtv_beta: gs.measures.gtv_beta ?? 0,
          gtv_ftg: gs.measures.gtv_ftg ?? 0,
          lgfe_ftg: gs.measures.lgfe_ftg ?? 0,
          gse_all: gs.measures.gse_all ?? 0,
          mean_w: gs.measures.mean_w ?? 0,
        });
      }
    }

    const out = {
      hemisphere: gp.hemisphere,
      mode: hData.mode || "amplitude_sweep",
      stimRates: hData.stim_rates || [],
      freqs,
      sigma: sig,
      ftgHalfBw: ftgHw,
      series,
      analysed,
      activeSeries,
      activeGsp,
      sigmaSweep,
    };
    _gspCacheKey = key;
    _gspCache = out;
    return out;
  }

  function resolveGspSeries(node, gspData) {
    if (!gspData.series.length) return null;
    if (node.seriesId) {
      const hit = gspData.series.find((s) => s.id === node.seriesId);
      if (hit) return hit;
    }
    return gspData.activeSeries || gspData.series[0];
  }

  function pickGspNode(idx) {
    const cur = state.selection.gsp_selected_node_idx;
    state.selection.gsp_selected_node_idx = cur === idx ? null : idx;
    updateCrossHighlights(true);
    updateStatusBar();
    syncToPython();
  }

  function getPayload() {
    return state.payload || {};
  }

  function getAllContactsWithData() {
    const p = getPayload();
    const found = new Set();
    for (const r of p.recordings || []) {
      const h = r.hemisphere;
      if (!h) continue;
      for (const c of [...(r.contacts || []), ...(r.stim_contacts || [])]) {
        if (c && c !== "Case") found.add(`${h}:${c}`);
      }
    }
    for (const m of p.montage || []) {
      const h = m.hemisphere;
      if (!h) continue;
      for (const c of m.contacts || []) {
        if (c && c !== "Case") found.add(`${h}:${c}`);
      }
    }
    for (const [h, imp] of Object.entries(p.impedances || {})) {
      for (const [c, v] of Object.entries(imp.monopolar || {})) {
        if (c && c !== "Case" && v) found.add(`${h}:${c}`);
      }
    }
    const ordered = [];
    for (const h of ["Left", "Right"]) {
      for (const c of CONTACT_ORDER) if (found.has(`${h}:${c}`)) ordered.push(`${h}:${c}`);
    }
    for (const cid of found) if (!ordered.includes(cid)) ordered.push(cid);
    return ordered;
  }

  function getAllRecordings() {
    return getPayload().recordings || [];
  }

  function contactMatchesSelection(hemi, contactList) {
    const selSet = new Set(state.selection.contacts || []);
    if (!selSet.size) return false;
    return (contactList || []).some((c) => c && c !== "Case" && selSet.has(`${hemi}:${c}`));
  }

  /** Only recordings linked to currently selected contacts on the DBS Lead Model! */
  function getRecordings() {
    const all = getAllRecordings();
    return all.filter((r) => contactMatchesSelection(r.hemisphere, [...(r.contacts || []), ...(r.stim_contacts || [])]));
  }

  function getFilteredMontage(hemi) {
    const all = getPayload().montage || [];
    return all.filter((m) => (!hemi || m.hemisphere === hemi) && contactMatchesSelection(m.hemisphere, m.contacts || contactsForPairStr(m.pair, m.hemisphere)));
  }

  function getRecById(id) {
    const recs = getRecordings();
    return recs.find((r) => r.id === id) || recs[0] || null;
  }

  function applyContactCascade() {
    const filteredRecs = getRecordings();
    const filteredMontage = getFilteredMontage(null);
    state.selection.pairs = filteredMontage.map((m) => m.id);
    state.selection.recordings = filteredRecs.map((r) => r.id);

    // Dynamically update any open signal/spectral node whose recording was filtered out
    for (const n of state.nodes) {
      if (["lfp", "psd", "spectrogram", "beta_ftg", "phase"].includes(n.type)) {
        const stillValid = filteredRecs.some((r) => r.id === n.recordingId);
        if (!stillValid) {
          const replacement = filteredRecs.find((r) => r.hemisphere === n.hemisphere) || filteredRecs[0] || null;
          n.recordingId = replacement ? replacement.id : "";
          if (replacement) {
            n.hemisphere = replacement.hemisphere;
            n.pair = replacement.pair;
          }
        }
      }
    }

    // Auto-select hemisphere that actually has selected contacts for GT, Risk, Options & GSP solvers
    const gp = getGTParams();
    const rp = getRiskParams();
    const op = getOptParams();
    const wp = getGspParams();
    const selContacts = state.selection.contacts || [];
    const hasCurHemi = selContacts.some((c) => c.startsWith(`${gp.hemisphere}:`));
    if (!hasCurHemi && selContacts.length) {
      gp.hemisphere = selContacts[0].split(":")[0];
    }
    const hasRiskHemi = selContacts.some((c) => c.startsWith(`${rp.hemisphere}:`));
    if (!hasRiskHemi && selContacts.length) {
      rp.hemisphere = selContacts[0].split(":")[0];
    }
    const hasOptHemi = selContacts.some((c) => c.startsWith(`${op.hemisphere}:`));
    if (!hasOptHemi && selContacts.length) {
      op.hemisphere = selContacts[0].split(":")[0];
    }
    const hasGspHemi = selContacts.some((c) => c.startsWith(`${wp.hemisphere}:`));
    if (!hasGspHemi && selContacts.length) {
      wp.hemisphere = selContacts[0].split(":")[0];
    }

    _gtCacheKey = "";
    _riskCacheKey = "";
    _optCacheKey = "";
    _gspCacheKey = "";
    resetBandit(computeGT());
  }

  function findBestRecording(hemi, pairKey, preferStream = true) {
    const recs = getRecordings();
    if (!recs.length) return null;
    const normH = hemi || state.selection.hemisphere || "Left";
    const exactStream = recs.find(
      (r) => r.source === "BrainSenseTimeDomain" && r.hemisphere === normH && (!pairKey || r.pair === pairKey)
    );
    const exactAny = recs.find(
      (r) => r.hemisphere === normH && (!pairKey || r.pair === pairKey)
    );
    const hemiStream = recs.find((r) => r.source === "BrainSenseTimeDomain" && r.hemisphere === normH);
    const hemiAny = recs.find((r) => r.hemisphere === normH);
    if (preferStream) return exactStream || exactAny || hemiStream || hemiAny || recs[0];
    return exactAny || exactStream || hemiAny || recs[0];
  }

  function findMatchingContactRecording(hemi, contact) {
    const recs = getRecordings();
    const ring = contact ? contact[0] : "";
    // Prefer streaming recording whose sensing pair or stim_contacts includes this contact/ring
    const s1 = recs.find(
      (r) => r.source === "BrainSenseTimeDomain" && r.hemisphere === hemi &&
        ((r.contacts || []).includes(contact) || (r.stim_contacts || []).includes(contact))
    );
    if (s1) return s1;
    const m1 = recs.find(
      (r) => r.hemisphere === hemi && (r.contacts || []).includes(contact)
    );
    if (m1) return m1;
    return findBestRecording(hemi, null, true);
  }

  function getActiveGroup() {
    const groups = getPayload().groups || [];
    if (state.activeGroupId) {
      const g = groups.find((x) => x.id === state.activeGroupId);
      if (g) return g;
    }
    return groups.find((g) => g.stage === "Final" && g.active) || groups[0] || null;
  }

  function getFtgBand(recOrRate) {
    const rate = typeof recOrRate === "number"
      ? recOrRate
      : (recOrRate && recOrRate.stim_rate_hz) || state.selection.stim_rate_hz || getPayload().config?.default_stim_rate_hz || 145;
    const bw = state.selection.ftg_half_bw_hz || getPayload().config?.ftg_half_bw_hz || 4.0;
    const center = rate / 2.0;
    return { rate, center, half_bw: bw, lo: Math.max(35, center - bw), hi: Math.min(120, center + bw) };
  }

  // ── DAG Cycle Detection & Lineage ───────────────────────────────────
  function wouldCreateCycle(srcId, tgtId) {
    if (srcId === tgtId) return true;
    // Check if srcId is reachable from tgtId
    const visited = new Set();
    const queue = [tgtId];
    while (queue.length) {
      const cur = queue.shift();
      if (cur === srcId) return true;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const e of state.edges) {
        if (e.source === cur && !visited.has(e.target)) queue.push(e.target);
      }
    }
    return false;
  }

  function getLineageSet(nodeId) {
    const nodesSet = new Set([nodeId]);
    const edgesSet = new Set();
    // Upstream
    const upQ = [nodeId];
    while (upQ.length) {
      const cur = upQ.shift();
      for (const e of state.edges) {
        if (e.target === cur) {
          edgesSet.add(e.id);
          if (!nodesSet.has(e.source)) {
            nodesSet.add(e.source);
            upQ.push(e.source);
          }
        }
      }
    }
    // Downstream
    const dnQ = [nodeId];
    while (dnQ.length) {
      const cur = dnQ.shift();
      for (const e of state.edges) {
        if (e.source === cur) {
          edgesSet.add(e.id);
          if (!nodesSet.has(e.target)) {
            nodesSet.add(e.target);
            dnQ.push(e.target);
          }
        }
      }
    }
    return { nodesSet, edgesSet };
  }

  function nextId(prefix) {
    state.uidCounter += 1;
    return `${prefix}_${state.uidCounter}`;
  }

  // ── Sync to Python (debounced cleanly) ──────────────────────────────
  let syncTimer = null;
  function syncToPython(immediate = false) {
    const push = () => {
      const dagSnapshot = {
        nodes: state.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          hemisphere: n.hemisphere,
          pair: n.pair,
          recordingId: n.recordingId,
          x: Math.round(n.x),
          y: Math.round(n.y),
          w: Math.round(n.w),
          h: Math.round(n.h),
          collapsed: !!n.collapsed,
          mode: n.mode || null,
          seriesId: n.seriesId || null,
        })),
        edges: state.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourcePort: e.sourcePort || null,
          targetPort: e.targetPort || null,
          label: e.label || "",
          sourceContact: e.sourceContact || null,
        })),
        viewport: {
          x: Math.round(state.viewport.x),
          y: Math.round(state.viewport.y),
          zoom: Number(state.viewport.zoom.toFixed(3)),
        },
      };
      model.set("selection", JSON.parse(JSON.stringify(state.selection)));
      model.set("dag_state", dagSnapshot);
      model.save_changes();
    };
    if (syncTimer) clearTimeout(syncTimer);
    if (immediate) push();
    else syncTimer = setTimeout(push, 80);
  }

  // ── Full-Screen Stage Geometry (drives preset & object default sizes) ─
  // Catalog sizes and preset coordinates are authored in "design units". They are rescaled so that
  // a one-screen preset exactly fills the canvas of the studio in full-screen mode at 100% zoom.
  const DESIGN_SX = 1.32, DESIGN_SY = 1.26;   // catalog sizes = design units × these legacy factors
  const DESIGN_W = 1744, DESIGN_H = 1050;     // canonical one-screen layout (Beta & FTG preset bbox)
  const STAGE_MARGIN = 32;                    // equals fitCanvasToNodes() padding → fit zoom = 100%
  const STAGE_MIN_S = 0.8, STAGE_MAX_S = 2.6, STAGE_MAX_ASPECT = 1.5;

  function isRootFullscreen() {
    const rn = root.getRootNode ? root.getRootNode() : document;
    const fe = (rn && rn.fullscreenElement) || document.fullscreenElement || document.webkitFullscreenElement || null;
    return fe === root || (rn !== document && !!rn && rn.fullscreenElement === root);
  }

  function toggleRootFullscreen() {
    if (isRootFullscreen()) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } else {
      (root.requestFullscreen || root.webkitRequestFullscreen)?.call(root);
    }
  }

  /** Size (CSS px = world px at 100% zoom) of the drawable canvas when the studio is full screen. */
  function getStageSize() {
    if (isRootFullscreen()) {
      const r = viewportEl.getBoundingClientRect();
      if (r.width > 200 && r.height > 200) return { w: r.width, h: r.height };
    }
    const sw = (window.screen && window.screen.width) || window.innerWidth || 1920;
    const sh = (window.screen && window.screen.height) || window.innerHeight || 1080;
    // Measured chrome (toolbar may wrap on narrower screens); sensible fallbacks before first layout
    const tbH = toolbar.offsetHeight > 20 && toolbar.offsetHeight < 200 ? toolbar.offsetHeight : 56;
    const sbH = statusBar.offsetHeight > 20 && statusBar.offsetHeight < 120 ? statusBar.offsetHeight : 40;
    const chrome = tbH + sbH + 6; // + studio borders
    return { w: Math.max(960, sw), h: Math.max(480, sh - chrome) };
  }

  function limitAspect(sx, sy) {
    if (sx / sy > STAGE_MAX_ASPECT) sx = sy * STAGE_MAX_ASPECT;
    if (sy / sx > STAGE_MAX_ASPECT) sy = sx * STAGE_MAX_ASPECT;
    return { sx, sy };
  }

  /** Design-unit → world scale at which the canonical one-screen layout fills the full-screen canvas. */
  function getStageScale() {
    const st = getStageSize();
    const kx = clamp((st.w - STAGE_MARGIN * 2) / DESIGN_W, STAGE_MIN_S, STAGE_MAX_S);
    const ky = clamp((st.h - STAGE_MARGIN * 2) / DESIGN_H, STAGE_MIN_S, STAGE_MAX_S);
    return limitAspect(kx, ky);
  }

  // Default object sizes sized to their CONTENT (one row per stimulation lane, full tables/lists,
  // single-row settings). Objects are additionally widened at render time if their settings row,
  // slider row or header still needs more room (fitNodesToContent).
  const NODE_SIZE_OVERRIDES = {
    input: { w: 820, h: 600 },
    lead: { w: 680, h: 860 },
    ftg_controller: { w: 760, h: 225 },
    montage: { w: 720, h: 620 },
    therapy: { w: 860, h: 430 },
    gt_arms: { w: 1000, h: 640 },
    gt_minimax: { w: 860, h: 560 },
    gt_bandit: { w: 1000, h: 640 },
    gt_consensus: { w: 860, h: 620 },
    risk_map: { w: 1020, h: 660 },
    risk_selection: { w: 880, h: 620 },
    opt_arena: { w: 1020, h: 660 },
    opt_chain: { w: 860, h: 560 },
    opt_selection: { w: 880, h: 620 },
    gsp_matrix: { w: 760, h: 600 },
    gsp_phase: { w: 820, h: 540 },
  };
  const NODE_MIN_SIZE = { lead: { w: 540, h: 640 }, ftg_controller: { w: 520, h: 215 } };

  /** Default size of a newly inserted object (fits its content; never shrunk to the screen). */
  function rawNodeSize(type) {
    const spec = NODE_CATALOG[type] || NODE_CATALOG.psd;
    const o = NODE_SIZE_OVERRIDES[type] || {};
    return { w: o.w || spec.w, h: o.h || spec.h };
  }
  /** Size of a newly inserted object (taller than the design size: content is drawn BODY_SCALE× larger). */
  function defaultNodeSize(type) {
    const d = rawNodeSize(type);
    return { w: d.w, h: Math.round(d.h * LAYOUT_TALL) };
  }

  /** Smallest size at which an object's content still renders neatly (design units). */
  function minNodeSize(type) {
    if (NODE_MIN_SIZE[type]) return NODE_MIN_SIZE[type];
    const d = rawNodeSize(type);
    return { w: Math.round(d.w * 0.92), h: Math.round(d.h * 0.9) };
  }

  /** Rescale preset nodes (design units) so the whole preset fills the full-screen canvas. */
  function fitPresetToStage(nodes) {
    if (!nodes.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h);
    }
    const st = getStageSize();
    const k = getStageScale();
    const availW = st.w - STAGE_MARGIN * 2, availH = st.h - STAGE_MARGIN * 2;
    const fx = availW / Math.max(1, maxX - minX);
    const fy = availH / Math.max(1, maxY - minY);
    // One-screen presets fill the screen exactly; larger multi-screen presets keep a readable
    // object density (never smaller than ~70% of the one-screen density) and are panned / fit-zoomed.
    let sx = clamp(fx, Math.max(STAGE_MIN_S, k.sx * 0.7), Math.max(STAGE_MIN_S, k.sx * 1.35));
    let sy = clamp(fy, Math.max(STAGE_MIN_S, k.sy * 0.7), Math.max(STAGE_MIN_S, k.sy * 1.35));
    // If one axis overflows the screen (fit zoom < 100%), stretch the other axis so that at the
    // fit zoom the preset still fills the whole full-screen canvas (no empty bands).
    const zFit = Math.min(fx / sx, fy / sy, 1);
    if (zFit < 1) {
      sx = Math.min(STAGE_MAX_S, Math.max(sx, fx / zFit));
      sy = Math.min(STAGE_MAX_S, Math.max(sy, fy / zFit));
    }
    ({ sx, sy } = limitAspect(sx, sy));
    // Never shrink objects below the size their content needs: if any object would end up smaller
    // than its minimum, scale the whole layout up (positions + sizes) so nothing overlaps.
    for (const n of nodes) {
      const m = minNodeSize(n.type);
      sx = Math.max(sx, m.w / Math.max(1, n.w));
      sy = Math.max(sy, m.h / Math.max(1, n.h));
    }
    // objects draw their content BODY_SCALE× larger on screen → give them proportionally more height
    // (the larger header / settings rows also take ~40 px)
    sy *= LAYOUT_TALL;
    for (const n of nodes) {
      n.x = Math.round(STAGE_MARGIN + (n.x - minX) * sx);
      n.y = Math.round(STAGE_MARGIN + (n.y - minY) * sy);
      n.w = Math.round(n.w * sx);
      n.h = n.type === "ftg_controller" ? Math.min(Math.round(n.h * sy), 276) : Math.round(n.h * sy);
    }
  }

  /** Width an object's single-row settings / slider row / header needs (0 if not measurable yet). */
  function nodeContentNeed(card) {
    if (!card || !card.isConnected || card.clientWidth === 0) return 0;
    let need = 0;
    card.querySelectorAll(".nr-node-subbar, .nr-gt-sliders").forEach((row) => {
      const cs = getComputedStyle(row);
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      let w = padX;
      const kids = [...row.children].filter((k) => k.offsetParent !== null);
      const gap = parseFloat(cs.columnGap || cs.gap) || 0;
      kids.forEach((k, i) => { w += k.getBoundingClientRect().width / (state.viewport.zoom || 1) + (i ? gap : 0); });
      need = Math.max(need, Math.ceil(w) + 4);
    });
    const hdr = card.querySelector(".nr-node-header");
    if (hdr) {
      const t = hdr.querySelector(".nr-node-title");
      const b = hdr.querySelector(".nr-node-badge");
      const a = hdr.querySelector(".nr-node-actions");
      // natural title width (a flex title's scrollWidth reports its allocated width, not its text)
      const tw = t ? textWidth(t.textContent, 21, 700) + 8 : 0;
      need = Math.max(need, Math.min(1180, Math.ceil((b ? b.offsetWidth : 0) + tw + (a ? a.offsetWidth : 0) + 46)));
    }
    return need;
  }

  /** Push overlapping objects to the right after some objects were widened (keeps the DAG tidy). */
  function resolveHorizontalOverlaps(gap = 48) {
    const ns = [...state.nodes].sort((a, b) => a.x - b.x);
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (let i = 0; i < ns.length; i++) {
        for (let j = 0; j < ns.length; j++) {
          if (i === j) continue;
          const a = ns[i], b = ns[j];
          const vOverlap = b.y < a.y + a.h && b.y + b.h > a.y;
          if (vOverlap && b.x >= a.x && b.x < a.x + a.w + gap) {
            b.x = Math.round(a.x + a.w + gap);
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }

  /** Widen objects whose settings row / sliders / header do not fit on one row. */
  function fitNodesToContent(opts = {}) {
    let grown = false;
    for (const n of state.nodes) {
      if (n.collapsed) continue;
      const card = nodesLayer.querySelector(`[data-node-id="${n.id}"]`);
      const need = nodeContentNeed(card);
      if (need) n._minW = need;
      if (need && need > n.w) {
        n.w = need;
        grown = true;
      }
    }
    if (grown) {
      if (opts.resolve !== false) resolveHorizontalOverlaps();
      renderAll();
      if (opts.refit) fitCanvasLegible();
      syncToPython();
    }
    return grown;
  }

  /** Run fitNodesToContent once the cards are laid out (works even before the widget is visible). */
  function scheduleContentFit(opts = {}) {
    let tries = 0;
    const tick = () => {
      const anyCard = nodesLayer.querySelector(".nr-node");
      if (anyCard && anyCard.clientWidth > 0) {
        fitNodesToContent(opts);
      } else if (tries++ < 40) {
        setTimeout(tick, 150);
      }
    };
    (typeof requestAnimationFrame === "function" ? requestAnimationFrame : (f) => setTimeout(f, 0))(tick);
  }

  // ── Presets & Auto-Layout ───────────────────────────────────────────
  // ── Data-driven applicability: which objects can run on the loaded file ──
  function hasData() {
    const p = getPayload();
    return !!(p && p.metadata && (Array.isArray(p.recordings) || Array.isArray(p.montage)));
  }

  let _capsKey = null, _caps = null;
  function dataCaps() {
    const p = getPayload();
    const key = `${(p.metadata || {}).file_name || ""}|${(p.recordings || []).length}|${(p.montage || []).length}`;
    if (_caps && _capsKey === key) return _caps;
    const recs = p.recordings || [];
    const streams = recs.filter((r) => r.source === "BrainSenseTimeDomain");
    const hemiCount = (bundle, field) => {
      const b = bundle || {};
      const hs = b.hemispheres || b;
      let mx = 0;
      for (const v of Object.values(hs || {})) if (v && typeof v === "object") mx = Math.max(mx, (v[field] || []).length);
      return mx;
    };
    const gtArms = (() => {
      const b = p.game_theory || {};
      const hs = b.hemispheres || b;
      const out = [];
      for (const v of Object.values(hs || {})) if (v && Array.isArray(v.arms)) out.push(...v.arms);
      return out;
    })();
    const lanes = {};
    for (const a of gtArms) {
      const k = `${a.hemisphere}|${a.pair}|${Math.round(a.stim_hz || 0)}`;
      (lanes[k] ||= new Set()).add(Number(a.amp || 0).toFixed(2));
    }
    const maxLaneAmps = Math.max(0, ...Object.values(lanes).map((st) => st.size));
    const trendPts = Object.values(p.trends || {}).reduce((acc, t) => acc + ((t && (t.n_total_points || (t.lfp || []).length)) || 0), 0);
    const impN = Object.values(p.impedances || {}).reduce(
      (acc, h) => acc + Object.entries((h && h.monopolar) || {}).filter(([c, v]) => CONTACT_ORDER.includes(c) && Number(v) > 0).length + ((h && h.bipolar) || []).filter((b) => Number(b.ohm) > 0).length,
      0
    );
    _caps = {
      loaded: hasData(),
      streams: streams.length,
      sweeps: streams.filter((r) => (r.amp_steps || []).length > 1).length,
      montage: (p.montage || []).length,
      groups: (p.groups || []).length,
      trend: trendPts,
      impedance: impN,
      gtArms: gtArms.length,
      gtLaneAmps: maxLaneAmps,
      risk: hemiCount(p.risk, "series"),
      options: hemiCount(p.options, "series"),
      gsp: hemiCount(p.weave, "series"),
    };
    _capsKey = key;
    return _caps;
  }

  // ── Hemisphere & lead-type awareness ───────────────────────────────
  // Every hemisphere toggle is limited to the hemispheres that actually carry data
  // for that object; ring (non-directional) leads are drawn and listed as 4 rings.
  const HEMIS = ["Left", "Right"];
  function leadIsDirectional(hemi) {
    const ld = (getPayload().leads || {})[hemi];
    if (!ld) return !RING_ALL;
    if (ld.directional === false) return false;
    if (Array.isArray(ld.contacts) && ld.contacts.length && !ld.contacts.some((c) => /[abc]$/.test(String(c)))) return false;
    return true;
  }
  function leadContacts(hemi) {
    return leadIsDirectional(hemi) ? CONTACTS : RING_CONTACTS;
  }
  function leadKindLabel() {
    const hs = Object.keys(getPayload().leads || {});
    if (!hs.length) return "SenSight";
    const dir = hs.map((h) => leadIsDirectional(h));
    if (dir.every(Boolean)) return "SenSight";
    if (!dir.some(Boolean)) return "4-ring";
    return "mixed";
  }
  function leadModelName(hemi) {
    const ld = (getPayload().leads || {})[hemi] || {};
    const raw = String(ld.model || "").replace(/^LEAD_/, "").replace(/^LeadModelDef\./, "");
    if (!raw || raw === "RING_4_CONTACT") return leadIsDirectional(hemi) ? "SenSight" : "4-ring lead";
    return leadIsDirectional(hemi) ? `SenSight ${raw}` : `${raw} · 4-ring`;
  }
  function refreshLeadKinds() {
    const leads = getPayload().leads || {};
    const hs = Object.keys(leads);
    RING_HEMIS = new Set(hs.filter((h) => {
      const ld = leads[h] || {};
      if (ld.directional === false) return true;
      return Array.isArray(ld.contacts) && ld.contacts.length > 0 && !ld.contacts.some((c) => /[abc]$/.test(String(c)));
    }));
    RING_ALL = hs.length > 0 && RING_HEMIS.size === hs.length;
  }
  function hemisWithData(kind) {
    const p = getPayload();
    const fromBundle = (b, field) => {
      const hs = (b && (b.hemispheres || b)) || {};
      return Object.entries(hs).filter(([, v]) => v && typeof v === "object" && Array.isArray(v[field]) && v[field].length).map(([h]) => h);
    };
    let hs = [];
    if (kind === "montage") hs = (p.montage || []).map((m) => m.hemisphere);
    else if (kind === "impedance") {
      hs = Object.entries(p.impedances || {})
        .filter(([, v]) => v && (Object.entries(v.monopolar || {}).some(([c, x]) => CONTACT_ORDER.includes(c) && Number(x) > 0) || (v.bipolar || []).some((b) => Number(b.ohm) > 0)))
        .map(([h]) => h);
    } else if (kind === "trend") hs = Object.entries(p.trends || {}).filter(([, t]) => t && (t.lfp || []).length).map(([h]) => h);
    else if (kind === "recordings") hs = (p.recordings || []).map((r) => r.hemisphere);
    else if (kind === "gt") hs = fromBundle(p.game_theory, "arms");
    else if (kind === "risk") hs = fromBundle(p.risk, "series");
    else if (kind === "opt") hs = fromBundle(p.options, "series");
    else if (kind === "gsp") hs = fromBundle(p.weave, "series");
    else hs = [...Object.keys(p.leads || {}), ...(p.recordings || []).map((r) => r.hemisphere), ...(p.montage || []).map((m) => m.hemisphere)];
    const set = new Set(hs.filter(Boolean));
    const out = HEMIS.filter((h) => set.has(h));
    if (out.length) return out;
    if (kind === "lead" || !kind) return HEMIS;
    return hemisWithData("lead");
  }
  function hemiKindFor(type) {
    if (type === "montage" || type === "impedance" || type === "trend") return type;
    if (/^gt_/.test(type)) return "gt";
    if (/^risk_/.test(type)) return "risk";
    if (/^opt_/.test(type)) return "opt";
    if (/^gsp_/.test(type)) return "gsp";
    return "lead";
  }
  const pickHemi = (cur, avail) => (avail.includes(cur) ? cur : avail[0] || cur || "Left");
  function coerceHemispheres() {
    if (!hasData()) return;
    refreshLeadKinds();
    const lh = hemisWithData("lead");
    if (state.leadView === "Bilateral") {
      if (lh.length < 2) state.leadView = lh[0] || "Left";
    } else if (!lh.includes(state.leadView)) {
      state.leadView = lh.length >= 2 ? "Bilateral" : lh[0] || "Left";
    }
    if (state.selection && state.selection.hemisphere && !lh.includes(state.selection.hemisphere)) state.selection.hemisphere = lh[0];
    const kind = leadKindLabel();
    for (const n of state.nodes) {
      const k = hemiKindFor(n.type);
      if (k === "montage" || k === "impedance" || k === "trend") n.hemisphere = pickHemi(n.hemisphere, hemisWithData(k));
      if (n.type === "lead" && /^DBS Lead Model/.test(n.title || "")) n.title = `DBS Lead Model (${kind})`;
      if (n.type === "montage" && /^(Directional|Bipolar) Montage$/.test(n.title || "")) n.title = RING_ALL ? "Bipolar Montage" : "Directional Montage";
    }
    const fix = (getter, k, onChange) => {
      try {
        const prm = getter();
        if (!prm) return;
        const nh = pickHemi(prm.hemisphere, hemisWithData(k));
        if (nh !== prm.hemisphere) { prm.hemisphere = nh; onChange(); }
      } catch (_) { /* params not initialised yet */ }
    };
    fix(getGTParams, "gt", () => { _gtCacheKey = ""; });
    fix(getRiskParams, "risk", () => { _riskCacheKey = ""; });
    fix(getOptParams, "opt", () => { _optCacheKey = ""; });
    fix(getGspParams, "gsp", () => { _gspCacheKey = ""; });
  }
  /** Caption text for exports: lead / montage / PSD captions follow the loaded data. */
  function objectDesc(n, spec) {
    if (n.type === "lead") {
      const k = leadKindLabel();
      return k === "4-ring" ? "4-ring (non-directional) lead · contacts 0–3" : k === "mixed" ? "SenSight directional + 4-ring lead" : spec.desc || "";
    }
    if (n.type === "montage" && RING_ALL) return "Bipolar ring pairs · Beta & FTG rank";
    if (n.type === "psd" && psdMode(n) === "overlay") return "Welch PSD · one curve per sensing pair / stim contact";
    return spec.desc || "";
  }
  /** Grey out hemisphere toggles (Left / Right / Bilateral) that have no data behind them. */
  function decorateHemiPills(rootEl, node) {
    if (!rootEl || !hasData()) return;
    const avail = hemisWithData(hemiKindFor(node.type));
    for (const b of rootEl.querySelectorAll("button")) {
      const t = (b.textContent || "").trim();
      let off = false, why = "";
      if (t === "Bilateral") { off = avail.length < 2; why = `Only the ${avail[0] || ""} hemisphere has data in this file`; }
      else if (t === "Left" || t === "Right") { off = !avail.includes(t); why = `No ${t.toLowerCase()}-hemisphere data for this object in the loaded file`; }
      else continue;
      if (off) {
        b.disabled = true;
        b.title = why;
        b.classList.add("nr-pill-off");
        b.classList.remove("nr-pill-black", "nr-pill-dark");
      }
    }
  }

  /** {ok, why}: can this object type run on the loaded file? */
  function nodeApplicable(type) {
    const c = dataCaps();
    if (type === "input" || type === "inspector") return { ok: true, why: "" };
    if (!c.loaded) return { ok: false, why: "load an LFP file first" };
    if (type === "lead") return { ok: true, why: "" };
    const need = (cond, why) => (cond ? { ok: true, why: "" } : { ok: false, why });
    switch (type) {
      case "lfp": case "spectrogram": case "phase": case "beta_ftg":
        return need(c.streams > 0, "needs time-domain LFP streams");
      case "psd": case "ftg_controller":
        return need(c.streams > 0 || c.montage > 0, "needs LFP streams or survey spectra");
      case "montage": return need(c.montage > 0, "needs the directional montage survey");
      case "impedance": return need(c.impedance > 0, "needs impedance results");
      case "therapy": return need(c.groups > 0, "needs therapy groups");
      case "trend": return need(c.trend > 0, "needs chronic LFP trend logs");
      case "gt_stackelberg": return need(c.gtArms >= 2 && c.gtLaneAmps >= 2, "needs ≥ 2 stimulation amplitudes per contact lane");
      default:
        if (type.startsWith("gt_")) return need(c.gtArms >= 2, "needs ≥ 2 stimulation arms");
        if (type.startsWith("risk_")) return need(c.risk > 0, "needs stream / survey series for tail risk");
        if (type.startsWith("opt_")) return need(c.options > 0, "needs stream / survey series for option pricing");
        if (type.startsWith("gsp_")) return need(c.gsp > 0, "needs an amplitude / montage series for GSP");
        return { ok: true, why: "" };
    }
  }

  /** Remove objects the file cannot feed; re-attach their children to the nearest kept parent. */
  function applyApplicability() {
    const skipped = [];
    let guard = 0;
    while (guard++ < 60) {
      const bad = state.nodes.find((n) => n.type !== "lead" && n.type !== "input" && !nodeApplicable(n.type).ok);
      if (!bad) break;
      const why = nodeApplicable(bad.type).why;
      skipped.push({ type: bad.type, title: bad.title, why });
      const parents = state.edges.filter((e) => e.target === bad.id).map((e) => e.source);
      const kids = state.edges.filter((e) => e.source === bad.id);
      state.edges = state.edges.filter((e) => e.source !== bad.id && e.target !== bad.id);
      const parent = parents[0];
      if (parent) {
        for (const k of kids) {
          if (!state.edges.some((e) => e.source === parent && e.target === k.target)) {
            state.edges.push(Object.assign({}, k, { id: `${k.id}_re`, source: parent }));
          }
        }
      }
      state.nodes = state.nodes.filter((n) => n.id !== bad.id);
    }
    state.presetSkipped = skipped;
    return skipped;
  }

  function inputRootNode(x, y) {
    return {
      id: "input_main", type: "input", title: "LFP Input · drop a JSON file",
      hemisphere: state.selection.hemisphere || "Left", pair: "", recordingId: "",
      x, y, w: 820, h: 600, collapsed: false, mode: null, modality: "lfp",
    };
  }

  function loadPreset(presetName) {
    // Empty start: every pipeline begins at the LFP Input object (no default file)
    if (!hasData()) {
      state.nodes = [inputRootNode(60, 60)];
      state.edges = [];
      state.focusNodeId = null;
      state.presetSkipped = [];
      state.selection.selected_nodes = ["input_main"];
      refreshDataMenus();
      renderAll();
      fitCanvasLegible();
      syncToPython(true);
      return;
    }
    const recs = getRecordings();
    const firstStream = recs.find((r) => r.source === "BrainSenseTimeDomain") || recs[0];
    const hemi = firstStream ? firstStream.hemisphere : "Left";
    const pair = firstStream ? firstStream.pair : "0-2";
    const rid = firstStream ? firstStream.id : "";

    state.nodes = [];
    state.edges = [];
    state.focusNodeId = null;

    const leadNode = {
      id: "lead_main",
      type: "lead",
      title: "DBS Lead Model (SenSight)",
      hemisphere: hemi,
      pair,
      recordingId: rid,
      x: 36,
      y: 36,
      w: 520,
      h: 710,
      collapsed: false,
    };
    state.nodes.push(leadNode);

    if (presetName === "beta_ftg") {
      const nLfp = {
        id: "node_lfp_1",
        type: "lfp",
        title: `LFP Trace · ${hemi} ${pair}`,
        hemisphere: hemi,
        pair,
        recordingId: rid,
        x: 640,
        y: 36,
        w: 540,
        h: 320,
        collapsed: false,
      };
      const nPsd = {
        id: "node_psd_1",
        type: "psd",
        title: `Welch PSD · Beta & FTG`,
        hemisphere: hemi,
        pair,
        recordingId: rid,
        x: 1260,
        y: 36,
        w: 520,
        h: 320,
        collapsed: false,
      };
      const nSpec = {
        id: "node_spec_1",
        type: "spectrogram",
        title: `STFT Spectrogram · ${hemi} ${pair}`,
        hemisphere: hemi,
        pair,
        recordingId: rid,
        x: 640,
        y: 396,
        w: 540,
        h: 320,
        collapsed: false,
      };
      const nBf = {
        id: "node_bf_1",
        type: "beta_ftg",
        title: `Beta (13–30 Hz) & FTG (f_stim/2)`,
        hemisphere: hemi,
        pair,
        recordingId: rid,
        x: 1260,
        y: 396,
        w: 520,
        h: 320,
        collapsed: false,
        mode: firstStream && (firstStream.amp_steps || []).length > 1 ? "dose" : "envelope",
      };
      state.nodes.push(nLfp, nPsd, nSpec, nBf, {
        id: "node_ftg_ctrl",
        type: "ftg_controller",
        title: "FTG Half-Band Controller (Δf)",
        hemisphere: hemi,
        pair,
        recordingId: rid,
        x: 36,
        y: 776,
        w: 520,
        h: 225,
        collapsed: false,
      });
      state.edges.push(
        { id: "e1", source: "lead_main", target: "node_lfp_1", label: `${hemi} ${pair} LFP`, sourcePort: "right-0", targetPort: "left-1" },
        { id: "e2", source: "lead_main", target: "node_spec_1", label: `STFT ${pair}`, sourcePort: "right-2", targetPort: "left-1" },
        { id: "e2b", source: "node_ftg_ctrl", target: "node_spec_1", label: "FTG Δf", sourcePort: "right-1", targetPort: "bottom-0" },
        { id: "e3", source: "node_lfp_1", target: "node_psd_1", label: "Welch PSD", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e4", source: "node_spec_1", target: "node_bf_1", label: "Beta / FTG", sourcePort: "right-1", targetPort: "left-1" }
      );
    } else if (presetName === "directional_survey") {
      const nMnt = {
        id: "node_mnt_1",
        type: "montage",
        title: `Directional Montage · ${hemi} (15 Pairs)`,
        hemisphere: hemi,
        pair,
        recordingId: rid,
        x: 640,
        y: 36,
        w: 540,
        h: 410,
        collapsed: false,
        mode: "beta",
      };
      const nImp = {
        id: "node_imp_1",
        type: "impedance",
        title: `Electrode Impedance · ${hemi}`,
        hemisphere: hemi,
        pair,
        recordingId: rid,
        x: 640,
        y: 476,
        w: 540,
        h: 360,
        collapsed: false,
        mode: "monopolar",
      };
      const nPsd = {
        id: "node_psd_2",
        type: "psd",
        title: `Survey & Welch PSD · Beta & FTG`,
        hemisphere: hemi,
        pair,
        recordingId: rid,
        x: 1260,
        y: 36,
        w: 520,
        h: 360,
        collapsed: false,
        mode: "survey",
      };
      const nTh = {
        id: "node_th_1",
        type: "therapy",
        title: `Therapy Groups & Stimulation`,
        hemisphere: hemi,
        pair,
        recordingId: rid,
        x: 1260,
        y: 426,
        w: 520,
        h: 410,
        collapsed: false,
      };
      state.nodes.push(nMnt, nImp, nPsd, nTh);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "node_mnt_1", label: "15 Survey Pairs" },
        { id: "e2", source: "lead_main", target: "node_imp_1", label: "8 Contacts Ω" },
        { id: "e3", source: "node_mnt_1", target: "node_psd_2", label: "Spectrum" },
        { id: "e4", source: "lead_main", target: "node_th_1", label: "Stim Groups" }
      );
    } else if (presetName === "freq_sweep") {
      const nBf = {
        id: "node_bf_sw",
        type: "beta_ftg",
        title: `Stim Frequency Sweep · FTG = f_stim/2`,
        hemisphere: hemi,
        pair,
        recordingId: rid,
        x: 640,
        y: 36,
        w: 560,
        h: 350,
        collapsed: false,
        mode: "freq_sweep",
      };
      const nPhase = {
        id: "node_ph_1",
        type: "phase",
        title: `Hilbert Phase Portraits · Beta & FTG`,
        hemisphere: hemi,
        pair,
        recordingId: rid,
        x: 1280,
        y: 36,
        w: 520,
        h: 350,
        collapsed: false,
      };
      const nSpec = {
        id: "node_spec_2",
        type: "spectrogram",
        title: `STFT Spectrogram · ${hemi} ${pair}`,
        hemisphere: hemi,
        pair,
        recordingId: rid,
        x: 640,
        y: 420,
        w: 560,
        h: 340,
        collapsed: false,
      };
      const nTrend = {
        id: "node_tr_1",
        type: "trend",
        title: `Chronic LFP Trend · ${hemi}`,
        hemisphere: hemi,
        pair,
        recordingId: rid,
        x: 1280,
        y: 420,
        w: 520,
        h: 340,
        collapsed: false,
      };
      state.nodes.push(nBf, nPhase, nSpec, nTrend);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "node_bf_sw", label: "125/145/165 Hz" },
        { id: "e2", source: "lead_main", target: "node_spec_2", label: `${hemi} ${pair}` },
        { id: "e3", source: "node_bf_sw", target: "node_ph_1", label: "Hilbert β/FTG" },
        { id: "e4", source: "node_spec_2", target: "node_tr_1", label: "Chronic Log" }
      );
    } else if (presetName === "gt_arms_arena") {
      const nFtg = { id: "gt_ftg_1", type: "ftg_controller", title: `FTG Half-Band Controller (Δf)`, hemisphere: hemi, pair, recordingId: rid, x: 36, y: 776, w: 520, h: 225, collapsed: false };
      const nArms = { id: "gt_arms_1", type: "gt_arms", title: `GT · Arms & Utility Arena (${hemi})`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 36, w: 700, h: 510, collapsed: false };
      const nLfp = { id: "gt_lfp_1", type: "lfp", title: `LFP Source · ${hemi} ${pair}`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 36, w: 540, h: 320, collapsed: false };
      const nPsd = { id: "gt_psd_1", type: "psd", title: `Welch PSD · Δβ & FTG Biomarkers`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 392, w: 540, h: 350, collapsed: false };
      const nBf = { id: "gt_bf_1", type: "beta_ftg", title: `Beta & FTG Dose–Response`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 580, w: 700, h: 330, collapsed: false, mode: "dose" };
      state.nodes.push(nFtg, nArms, nLfp, nPsd, nBf);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "gt_arms_1", label: "2-s LFP Arms", sourcePort: "right-0", targetPort: "left-0" },
        { id: "e1b", source: "gt_ftg_1", target: "gt_arms_1", label: "FTG Δf", sourcePort: "right-1", targetPort: "left-2" },
        { id: "e2", source: "gt_arms_1", target: "gt_lfp_1", label: "Arm LFP Windows", sourcePort: "right-0", targetPort: "left-1" },
        { id: "e3", source: "gt_arms_1", target: "gt_psd_1", label: "Δβ & FTG (f/2)", sourcePort: "right-2", targetPort: "left-1" },
        { id: "e4", source: "lead_main", target: "gt_bf_1", label: "Amplitude Sweep", sourcePort: "right-2", targetPort: "left-1" }
      );
    } else if (presetName === "gt_nash_stackelberg") {
      const nFtg = { id: "gt_ftg_2", type: "ftg_controller", title: `FTG Half-Band Controller (Δf)`, hemisphere: hemi, pair, recordingId: rid, x: 36, y: 776, w: 520, h: 225, collapsed: false };
      const nArms = { id: "gt_arms_2", type: "gt_arms", title: `GT · Arms & Utility Arena (${hemi})`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 120, w: 700, h: 510, collapsed: false };
      const nNbs = { id: "gt_nbs_1", type: "gt_nash", title: `GT · Nash Bargaining & Pareto`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 20, w: 560, h: 420, collapsed: false };
      const nMin = { id: "gt_min_1", type: "gt_minimax", title: `GT · Minimax & Zero-Sum Nash`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 470, w: 560, h: 420, collapsed: false, mode: "matrix" };
      const nStk = { id: "gt_stk_1", type: "gt_stackelberg", title: `GT · Stackelberg Leader–Follower`, hemisphere: hemi, pair, recordingId: rid, x: 2060, y: 20, w: 580, h: 420, collapsed: false, mode: "leader" };
      const nCon = { id: "gt_con_1", type: "gt_consensus", title: `GT · 7-Method Consensus Board`, hemisphere: hemi, pair, recordingId: rid, x: 2060, y: 470, w: 580, h: 420, collapsed: false };
      state.nodes.push(nFtg, nArms, nNbs, nMin, nStk, nCon);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "gt_arms_2", label: "Selected Contacts", sourcePort: "right-1", targetPort: "left-0" },
        { id: "e1b", source: "gt_ftg_2", target: "gt_arms_2", label: "FTG Δf", sourcePort: "right-1", targetPort: "left-2" },
        { id: "e2", source: "gt_arms_2", target: "gt_nbs_1", label: "u₁(Δβ) vs u₂", sourcePort: "right-0", targetPort: "left-1" },
        { id: "e3", source: "gt_arms_2", target: "gt_min_1", label: "vs Nature", sourcePort: "right-2", targetPort: "left-1" },
        { id: "e4", source: "gt_arms_2", target: "gt_stk_1", label: "Dose Fits", sourcePort: "top-2", targetPort: "top-0" },
        { id: "e5", source: "gt_nbs_1", target: "gt_con_1", label: "NBS Vote", sourcePort: "right-2", targetPort: "left-0" },
        { id: "e6", source: "gt_min_1", target: "gt_con_1", label: "Nash Vote", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e7", source: "gt_stk_1", target: "gt_con_1", label: "Stackelberg", sourcePort: "bottom-1", targetPort: "top-1" }
      );
    } else if (presetName === "gt_bandit_studio") {
      const nFtg = { id: "gt_ftg_3", type: "ftg_controller", title: `FTG Half-Band Controller (Δf)`, hemisphere: hemi, pair, recordingId: rid, x: 36, y: 776, w: 520, h: 225, collapsed: false };
      const nArms = { id: "gt_arms_3", type: "gt_arms", title: `GT · Arms & Utility Arena (${hemi})`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 36, w: 700, h: 510, collapsed: false };
      const nBan = { id: "gt_ban_1", type: "gt_bandit", title: `GT · Live Multi-Armed Bandit`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 36, w: 700, h: 490, collapsed: false };
      const nStk = { id: "gt_stk_2", type: "gt_stackelberg", title: `GT · Stackelberg Follower Curves`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 580, w: 700, h: 390, collapsed: false, mode: "follower" };
      const nCon = { id: "gt_con_2", type: "gt_consensus", title: `GT · 7-Method Consensus Board`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 560, w: 700, h: 410, collapsed: false };
      state.nodes.push(nFtg, nArms, nBan, nStk, nCon);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "gt_arms_3", label: "2-s LFP Arms", sourcePort: "right-0", targetPort: "left-0" },
        { id: "e1b", source: "gt_ftg_3", target: "gt_arms_3", label: "FTG Δf", sourcePort: "right-1", targetPort: "left-2" },
        { id: "e2", source: "gt_arms_3", target: "gt_ban_1", label: "Live Pulls", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e3", source: "gt_arms_3", target: "gt_stk_2", label: "β/FTG Fits", sourcePort: "bottom-1", targetPort: "top-1" },
        { id: "e4", source: "gt_ban_1", target: "gt_con_2", label: "Bandit Pick", sourcePort: "bottom-1", targetPort: "top-1" },
        { id: "e5", source: "gt_stk_2", target: "gt_con_2", label: "Robust a*", sourcePort: "right-1", targetPort: "left-1" }
      );
    } else if (presetName === "gt_complete") {
      const nFtg = { id: "gt_ftg_c", type: "ftg_controller", title: `FTG Half-Band Controller (Δf)`, hemisphere: hemi, pair, recordingId: rid, x: 36, y: 776, w: 520, h: 225, collapsed: false };
      const nArms = { id: "gt_arms_c", type: "gt_arms", title: `GT · Arms & Utility Arena (${hemi})`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 200, w: 700, h: 510, collapsed: false };
      const nNbs = { id: "gt_nbs_c", type: "gt_nash", title: `GT · Nash Bargaining & Pareto`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 20, w: 560, h: 420, collapsed: false };
      const nMin = { id: "gt_min_c", type: "gt_minimax", title: `GT · Minimax & Zero-Sum Nash`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 470, w: 560, h: 420, collapsed: false, mode: "matrix" };
      const nStk = { id: "gt_stk_c", type: "gt_stackelberg", title: `GT · Stackelberg Leader–Follower`, hemisphere: hemi, pair, recordingId: rid, x: 2060, y: 20, w: 660, h: 420, collapsed: false, mode: "leader" };
      const nBan = { id: "gt_ban_c", type: "gt_bandit", title: `GT · Live Multi-Armed Bandit`, hemisphere: hemi, pair, recordingId: rid, x: 2060, y: 470, w: 660, h: 460, collapsed: false };
      const nCon = { id: "gt_con_c", type: "gt_consensus", title: `GT · 7-Method Consensus Board`, hemisphere: hemi, pair, recordingId: rid, x: 2800, y: 220, w: 580, h: 420, collapsed: false };
      state.nodes.push(nFtg, nArms, nNbs, nMin, nStk, nBan, nCon);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "gt_arms_c", label: "Define Arms", sourcePort: "right-1", targetPort: "left-0" },
        { id: "e1b", source: "gt_ftg_c", target: "gt_arms_c", label: "FTG Δf", sourcePort: "right-1", targetPort: "left-2" },
        { id: "e2", source: "gt_arms_c", target: "gt_nbs_c", label: "Pareto / NBS", sourcePort: "right-0", targetPort: "left-1" },
        { id: "e3", source: "gt_arms_c", target: "gt_min_c", label: "Zero-Sum", sourcePort: "right-2", targetPort: "left-1" },
        { id: "e4", source: "gt_arms_c", target: "gt_stk_c", label: "Leader–Follower", sourcePort: "top-2", targetPort: "top-0" },
        { id: "e5", source: "gt_arms_c", target: "gt_ban_c", label: "Online Bandit", sourcePort: "bottom-2", targetPort: "bottom-0" },
        { id: "e6", source: "gt_nbs_c", target: "gt_con_c", label: "NBS", sourcePort: "right-0", targetPort: "top-0" },
        { id: "e7", source: "gt_min_c", target: "gt_con_c", label: "Nash LP/MWU", sourcePort: "right-2", targetPort: "bottom-0" },
        { id: "e8", source: "gt_stk_c", target: "gt_con_c", label: "Stackelberg", sourcePort: "right-1", targetPort: "left-0" },
        { id: "e9", source: "gt_ban_c", target: "gt_con_c", label: "Bandit", sourcePort: "right-1", targetPort: "left-2" }
      );
    } else if (presetName === "risk_arena") {
      const nFtg = { id: "rk_ftg_1", type: "ftg_controller", title: `FTG Half-Band Controller (Δf)`, hemisphere: hemi, pair, recordingId: rid, x: 36, y: 776, w: 520, h: 225, collapsed: false };
      const nMap = { id: "rk_map_1", type: "risk_map", title: `Risk · Tail Risk Arena & VaR Map (${hemi})`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 36, w: 700, h: 520, collapsed: false };
      const nEnv = { id: "rk_env_1", type: "risk_envelope", title: `Risk · Envelope & Red-Line Breaches`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 36, w: 600, h: 400, collapsed: false };
      const nSel = { id: "rk_sel_1", type: "risk_selection", title: `Risk · 5-Rule Selection & Backtest`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 472, w: 600, h: 420, collapsed: false, mode: "selection" };
      const nBr = { id: "rk_br_1", type: "risk_breach", title: `Risk · Breach Rate λ(a) & P(Breach)`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 590, w: 700, h: 360, collapsed: false };
      state.nodes.push(nFtg, nMap, nEnv, nSel, nBr);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "rk_map_1", label: "Causal RMS z(t)", sourcePort: "right-0", targetPort: "left-0" },
        { id: "e1b", source: "rk_ftg_1", target: "rk_map_1", label: "FTG Δf", sourcePort: "right-1", targetPort: "left-2" },
        { id: "e2", source: "rk_map_1", target: "rk_env_1", label: "Red Line u", sourcePort: "right-0", targetPort: "left-1" },
        { id: "e3", source: "rk_map_1", target: "rk_br_1", label: "Clusters λ(a)", sourcePort: "bottom-1", targetPort: "top-1" },
        { id: "e4", source: "rk_map_1", target: "rk_sel_1", label: "CVaR / EVT", sourcePort: "right-2", targetPort: "left-0" },
        { id: "e5", source: "rk_br_1", target: "rk_sel_1", label: "Safe ≤ ε", sourcePort: "right-1", targetPort: "left-2" }
      );
    } else if (presetName === "risk_evt_suite") {
      const nMap = { id: "rk_map_2", type: "risk_map", title: `Risk · Tail Risk Arena & VaR Map (${hemi})`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 120, w: 700, h: 520, collapsed: false };
      const nTail = { id: "rk_tail_2", type: "risk_tail", title: `Risk · Tail Survival & EVT-VaR`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 20, w: 560, h: 420, collapsed: false, mode: "survival" };
      const nRet = { id: "rk_ret_2", type: "risk_return", title: `Risk · POT & GEV Return Levels`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 472, w: 560, h: 420, collapsed: false };
      const nBr = { id: "rk_br_2", type: "risk_breach", title: `Risk · Breach Rate λ(a) & P(Breach)`, hemisphere: hemi, pair, recordingId: rid, x: 2060, y: 20, w: 580, h: 420, collapsed: false };
      const nSel = { id: "rk_sel_2", type: "risk_selection", title: `Risk · 5-Rule Selection & Backtest`, hemisphere: hemi, pair, recordingId: rid, x: 2060, y: 472, w: 580, h: 420, collapsed: false, mode: "selection" };
      state.nodes.push(nMap, nTail, nRet, nBr, nSel);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "rk_map_2", label: "Selected Contacts", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e2", source: "rk_map_2", target: "rk_tail_2", label: "POT + GPD", sourcePort: "right-0", targetPort: "left-1" },
        { id: "e3", source: "rk_map_2", target: "rk_ret_2", label: "Block Max GEV", sourcePort: "right-2", targetPort: "left-1" },
        { id: "e4", source: "rk_tail_2", target: "rk_br_2", label: "λ(a) Fit", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e5", source: "rk_ret_2", target: "rk_sel_2", label: "H-s Return Lvl", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e6", source: "rk_br_2", target: "rk_sel_2", label: "P(breach) ≤ ε", sourcePort: "bottom-1", targetPort: "top-1" }
      );
    } else if (presetName === "risk_complete") {
      const nFtg = { id: "rk_ftg_c", type: "ftg_controller", title: `FTG Half-Band Controller (Δf)`, hemisphere: hemi, pair, recordingId: rid, x: 36, y: 776, w: 520, h: 225, collapsed: false };
      const nEnv = { id: "rk_env_c", type: "risk_envelope", title: `Risk · Envelope & Red-Line Breaches`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 20, w: 700, h: 380, collapsed: false };
      const nMap = { id: "rk_map_c", type: "risk_map", title: `Risk · Tail Risk Arena & VaR Map (${hemi})`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 432, w: 700, h: 520, collapsed: false };
      const nTail = { id: "rk_tail_c", type: "risk_tail", title: `Risk · Tail Survival & EVT-VaR`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 20, w: 560, h: 420, collapsed: false, mode: "survival" };
      const nRet = { id: "rk_ret_c", type: "risk_return", title: `Risk · POT & GEV Return Levels`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 472, w: 560, h: 420, collapsed: false };
      const nBr = { id: "rk_br_c", type: "risk_breach", title: `Risk · Breach Rate λ(a) & P(Breach)`, hemisphere: hemi, pair, recordingId: rid, x: 2060, y: 20, w: 580, h: 420, collapsed: false };
      const nSel = { id: "rk_sel_c", type: "risk_selection", title: `Risk · 5-Rule Selection & Backtest`, hemisphere: hemi, pair, recordingId: rid, x: 2060, y: 472, w: 580, h: 420, collapsed: false, mode: "selection" };
      state.nodes.push(nFtg, nEnv, nMap, nTail, nRet, nBr, nSel);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "rk_env_c", label: "20-ms RMS z(t)", sourcePort: "right-0", targetPort: "left-1" },
        { id: "e2", source: "lead_main", target: "rk_map_c", label: "Contact Arms", sourcePort: "right-2", targetPort: "left-0" },
        { id: "e2b", source: "rk_ftg_c", target: "rk_map_c", label: "FTG Δf", sourcePort: "right-1", targetPort: "left-2" },
        { id: "e3", source: "rk_env_c", target: "rk_tail_c", label: "Exceedances > u", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e4", source: "rk_map_c", target: "rk_ret_c", label: "1-s Block Max", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e5", source: "rk_tail_c", target: "rk_br_c", label: "Poisson λ(a)", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e6", source: "rk_ret_c", target: "rk_sel_c", label: "GEV RL(H)", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e7", source: "rk_br_c", target: "rk_sel_c", label: "P(breach) ≤ ε", sourcePort: "bottom-1", targetPort: "top-1" },
        { id: "e8", source: "rk_map_c", target: "rk_sel_c", label: "CVaR & Score", sourcePort: "bottom-2", targetPort: "bottom-0" }
      );
    } else if (presetName === "opt_desk") {
      const nFtg = { id: "op_ftg_1", type: "ftg_controller", title: `FTG Half-Band Controller (Δf)`, hemisphere: hemi, pair, recordingId: rid, x: 36, y: 776, w: 520, h: 225, collapsed: false };
      const nArena = { id: "op_arena_1", type: "opt_arena", title: `Opt · Premium Map & Strategy Arena (${hemi})`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 36, w: 700, h: 520, collapsed: false };
      const nPay = { id: "op_pay_1", type: "opt_payoff", title: `Opt · Payoff, Density & Calibration`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 36, w: 580, h: 420, collapsed: false, mode: "payoff" };
      const nLat = { id: "op_lat_1", type: "opt_lattice", title: `Opt · American Lattice & aDBS Trigger`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 590, w: 700, h: 380, collapsed: false };
      const nSel = { id: "op_sel_1", type: "opt_selection", title: `Opt · 5-Rule Selection & Log-OU`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 490, w: 580, h: 420, collapsed: false, mode: "selection" };
      state.nodes.push(nFtg, nArena, nPay, nLat, nSel);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "op_arena_1", label: "Log-OU Arms", sourcePort: "right-0", targetPort: "left-0" },
        { id: "e1b", source: "op_ftg_1", target: "op_arena_1", label: "FTG Call K_F", sourcePort: "right-1", targetPort: "left-2" },
        { id: "e2", source: "op_arena_1", target: "op_pay_1", label: "Black-76 f(S_T)", sourcePort: "right-0", targetPort: "left-1" },
        { id: "e3", source: "op_arena_1", target: "op_lat_1", label: "Am vs Eu Tree", sourcePort: "bottom-1", targetPort: "top-1" },
        { id: "e4", source: "op_arena_1", target: "op_sel_1", label: "Portfolio Π", sourcePort: "right-2", targetPort: "left-0" },
        { id: "e5", source: "op_lat_1", target: "op_sel_1", label: "aDBS Am−Eu", sourcePort: "right-1", targetPort: "left-2" }
      );
    } else if (presetName === "opt_greeks_alpha") {
      const nArena = { id: "op_arena_2", type: "opt_arena", title: `Opt · Premium Map & Strategy Arena (${hemi})`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 120, w: 700, h: 520, collapsed: false };
      const nLat = { id: "op_lat_2", type: "opt_lattice", title: `Opt · American Lattice & aDBS Trigger`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 20, w: 600, h: 420, collapsed: false };
      const nChain = { id: "op_ch_2", type: "opt_chain", title: `Opt · Option Chain & Greeks`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 472, w: 600, h: 430, collapsed: false };
      const nSmile = { id: "op_sm_2", type: "opt_smile", title: `Opt · Alpha ∂Π/∂a & IV Smile`, hemisphere: hemi, pair, recordingId: rid, x: 2100, y: 20, w: 580, h: 420, collapsed: false, mode: "alpha" };
      const nSel = { id: "op_sel_2", type: "opt_selection", title: `Opt · 5-Rule Selection & Log-OU`, hemisphere: hemi, pair, recordingId: rid, x: 2100, y: 472, w: 580, h: 430, collapsed: false, mode: "selection" };
      state.nodes.push(nArena, nLat, nChain, nSmile, nSel);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "op_arena_2", label: "Selected Contacts", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e2", source: "op_arena_2", target: "op_lat_2", label: "Optimal Stop", sourcePort: "right-0", targetPort: "left-1" },
        { id: "e3", source: "op_arena_2", target: "op_ch_2", label: "Δ Γ Vega Θ", sourcePort: "right-2", targetPort: "left-1" },
        { id: "e4", source: "op_lat_2", target: "op_sm_2", label: "θ(a), s(a)", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e5", source: "op_sm_2", target: "op_sel_2", label: "Alpha = 0", sourcePort: "bottom-1", targetPort: "top-1" },
        { id: "e6", source: "op_ch_2", target: "op_sel_2", label: "Chain Picks", sourcePort: "right-1", targetPort: "left-1" }
      );
    } else if (presetName === "opt_complete") {
      const nFtg = { id: "op_ftg_c", type: "ftg_controller", title: `FTG Half-Band Controller (Δf)`, hemisphere: hemi, pair, recordingId: rid, x: 36, y: 776, w: 520, h: 225, collapsed: false };
      const nArena = { id: "op_arena_c", type: "opt_arena", title: `Opt · Premium Map & Strategy Arena (${hemi})`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 20, w: 700, h: 520, collapsed: false };
      const nPay = { id: "op_pay_c", type: "opt_payoff", title: `Opt · Payoff, Density & Calibration`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 572, w: 700, h: 380, collapsed: false, mode: "payoff" };
      const nLat = { id: "op_lat_c", type: "opt_lattice", title: `Opt · American Lattice & aDBS Trigger`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 20, w: 600, h: 420, collapsed: false };
      const nChain = { id: "op_ch_c", type: "opt_chain", title: `Opt · Option Chain & Greeks`, hemisphere: hemi, pair, recordingId: rid, x: 1420, y: 472, w: 600, h: 430, collapsed: false };
      const nSmile = { id: "op_sm_c", type: "opt_smile", title: `Opt · Alpha ∂Π/∂a & IV Smile`, hemisphere: hemi, pair, recordingId: rid, x: 2100, y: 20, w: 580, h: 420, collapsed: false, mode: "alpha" };
      const nSel = { id: "op_sel_c", type: "opt_selection", title: `Opt · 5-Rule Selection & Log-OU`, hemisphere: hemi, pair, recordingId: rid, x: 2100, y: 472, w: 580, h: 430, collapsed: false, mode: "selection" };
      state.nodes.push(nFtg, nArena, nPay, nLat, nChain, nSmile, nSel);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "op_arena_c", label: "Log-OU Dynamics", sourcePort: "right-0", targetPort: "left-0" },
        { id: "e1b", source: "op_ftg_c", target: "op_arena_c", label: "FTG Call", sourcePort: "right-1", targetPort: "left-2" },
        { id: "e2", source: "op_arena_c", target: "op_pay_c", label: "S_T Density", sourcePort: "bottom-1", targetPort: "top-1" },
        { id: "e3", source: "op_arena_c", target: "op_lat_c", label: "Binomial Tree", sourcePort: "right-0", targetPort: "left-1" },
        { id: "e4", source: "op_arena_c", target: "op_ch_c", label: "Greeks Chain", sourcePort: "right-2", targetPort: "left-1" },
        { id: "e5", source: "op_lat_c", target: "op_sm_c", label: "Alpha & Smile", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e6", source: "op_sm_c", target: "op_sel_c", label: "Alpha = 0", sourcePort: "bottom-1", targetPort: "top-1" },
        { id: "e7", source: "op_ch_c", target: "op_sel_c", label: "5-Rule Board", sourcePort: "right-1", targetPort: "left-1" }
      );
    } else if (presetName === "gsp_pipeline") {
      const nFtg = { id: "gsp_ftg_1", type: "ftg_controller", title: `FTG Half-Band Controller (Δf)`, hemisphere: hemi, pair, recordingId: rid, x: 36, y: 776, w: 520, h: 225, collapsed: false };
      const nGraph = { id: "gsp_gr_1", type: "gsp_graph", title: `GSP · Amplitude-State Graph & Fiedler (${hemi})`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 36, w: 720, h: 520, collapsed: false };
      const nGft = { id: "gsp_gft_1", type: "gsp_gft", title: `GSP · Graph Fourier Modes & Log-PSD`, hemisphere: hemi, pair, recordingId: rid, x: 1440, y: 36, w: 600, h: 440, collapsed: false, mode: "gft" };
      const nLfp = { id: "gsp_lfp_1", type: "lfp", title: `LFP Stream & Amplitude Steps · ${hemi} ${pair}`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 590, w: 720, h: 340, collapsed: false };
      const nGtv = { id: "gsp_gtv_1", type: "gsp_gtv", title: `GSP · GTV(f), LGFE(f), GSE(f) & KPIs`, hemisphere: hemi, pair, recordingId: rid, x: 1440, y: 510, w: 600, h: 420, collapsed: false, mode: "gtv" };
      state.nodes.push(nFtg, nGraph, nGft, nLfp, nGtv);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "gsp_gr_1", label: "Amplitude Nodes", sourcePort: "right-0", targetPort: "left-0" },
        { id: "e1b", source: "gsp_ftg_1", target: "gsp_gr_1", label: "FTG Δf", sourcePort: "right-1", targetPort: "left-2" },
        { id: "e2", source: "lead_main", target: "gsp_lfp_1", label: `${hemi} ${pair} LFP`, sourcePort: "right-2", targetPort: "left-1" },
        { id: "e3", source: "gsp_lfp_1", target: "gsp_gr_1", label: "Welch Log-PSD X", sourcePort: "top-1", targetPort: "bottom-1" },
        { id: "e4", source: "gsp_gr_1", target: "gsp_gft_1", label: "L_sym Eigenmodes", sourcePort: "right-0", targetPort: "left-1" },
        { id: "e5", source: "gsp_gr_1", target: "gsp_gtv_1", label: "λ₂ & W_ij", sourcePort: "right-2", targetPort: "left-0" },
        { id: "e6", source: "gsp_gft_1", target: "gsp_gtv_1", label: "LGFE / GSE", sourcePort: "bottom-1", targetPort: "top-1" }
      );
    } else if (presetName === "gsp_operators") {
      const nGraph = { id: "gsp_gr_2", type: "gsp_graph", title: `GSP · Amplitude-State Graph & Fiedler (${hemi})`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 36, w: 720, h: 520, collapsed: false };
      const nMat = { id: "gsp_mat_2", type: "gsp_matrix", title: `GSP · Graph Operator Matrix Explorer`, hemisphere: hemi, pair, recordingId: rid, x: 1440, y: 36, w: 580, h: 460, collapsed: false, mode: "W" };
      const nPh = { id: "gsp_ph_2", type: "gsp_phase", title: `GSP · Phase Clock & Takens Delay`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 590, w: 720, h: 410, collapsed: false, mode: "clock" };
      const nSw = { id: "gsp_sw_2", type: "gsp_sweep", title: `GSP · Kernel σ-Sweep & Contact Board`, hemisphere: hemi, pair, recordingId: rid, x: 1440, y: 530, w: 580, h: 470, collapsed: false, mode: "sigma" };
      state.nodes.push(nGraph, nMat, nPh, nSw);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "gsp_gr_2", label: "RBF Kernel σ", sourcePort: "right-0", targetPort: "left-1" },
        { id: "e2", source: "lead_main", target: "gsp_ph_2", label: "Hilbert θ(t)", sourcePort: "right-2", targetPort: "left-1" },
        { id: "e3", source: "gsp_gr_2", target: "gsp_mat_2", label: "W, L, L_sym, d²", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e4", source: "gsp_mat_2", target: "gsp_sw_2", label: "σ Sensitivity", sourcePort: "bottom-1", targetPort: "top-1" },
        { id: "e5", source: "gsp_gr_2", target: "gsp_sw_2", label: "Contact Rank", sourcePort: "right-2", targetPort: "left-0" }
      );
    } else if (presetName === "gsp_complete") {
      const nFtg = { id: "gsp_ftg_c", type: "ftg_controller", title: `FTG Half-Band Controller (Δf)`, hemisphere: hemi, pair, recordingId: rid, x: 36, y: 776, w: 520, h: 225, collapsed: false };
      const nGraph = { id: "gsp_gr_c", type: "gsp_graph", title: `GSP · Amplitude-State Graph & Fiedler (${hemi})`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 20, w: 720, h: 520, collapsed: false };
      const nPh = { id: "gsp_ph_c", type: "gsp_phase", title: `GSP · Phase Clock & Takens Delay`, hemisphere: hemi, pair, recordingId: rid, x: 640, y: 572, w: 720, h: 400, collapsed: false, mode: "clock" };
      const nMat = { id: "gsp_mat_c", type: "gsp_matrix", title: `GSP · Graph Operator Matrix Explorer`, hemisphere: hemi, pair, recordingId: rid, x: 1440, y: 20, w: 580, h: 450, collapsed: false, mode: "W" };
      const nGft = { id: "gsp_gft_c", type: "gsp_gft", title: `GSP · Graph Fourier Modes & Log-PSD`, hemisphere: hemi, pair, recordingId: rid, x: 1440, y: 500, w: 580, h: 460, collapsed: false, mode: "gft" };
      const nGtv = { id: "gsp_gtv_c", type: "gsp_gtv", title: `GSP · GTV(f), LGFE(f), GSE(f) & KPIs`, hemisphere: hemi, pair, recordingId: rid, x: 2100, y: 20, w: 620, h: 450, collapsed: false, mode: "gtv" };
      const nSw = { id: "gsp_sw_c", type: "gsp_sweep", title: `GSP · Kernel σ-Sweep & Contact Board`, hemisphere: hemi, pair, recordingId: rid, x: 2100, y: 500, w: 620, h: 460, collapsed: false, mode: "board" };
      state.nodes.push(nFtg, nGraph, nPh, nMat, nGft, nGtv, nSw);
      state.edges.push(
        { id: "e1", source: "lead_main", target: "gsp_gr_c", label: "Log-PSD Nodes", sourcePort: "right-0", targetPort: "left-0" },
        { id: "e1b", source: "gsp_ftg_c", target: "gsp_gr_c", label: "FTG Δf", sourcePort: "right-1", targetPort: "left-2" },
        { id: "e2", source: "lead_main", target: "gsp_ph_c", label: "Hilbert Phase", sourcePort: "right-2", targetPort: "left-1" },
        { id: "e3", source: "gsp_gr_c", target: "gsp_mat_c", label: "W, L, L_sym", sourcePort: "right-0", targetPort: "left-1" },
        { id: "e4", source: "gsp_gr_c", target: "gsp_gft_c", label: "Eigenmodes", sourcePort: "right-2", targetPort: "left-0" },
        { id: "e5", source: "gsp_mat_c", target: "gsp_gtv_c", label: "GTV(f)", sourcePort: "right-1", targetPort: "left-1" },
        { id: "e6", source: "gsp_gft_c", target: "gsp_gtv_c", label: "LGFE / GSE", sourcePort: "right-0", targetPort: "left-2" },
        { id: "e7", source: "gsp_gft_c", target: "gsp_sw_c", label: "σ-Sweep", sourcePort: "right-2", targetPort: "left-1" },
        { id: "e8", source: "gsp_gtv_c", target: "gsp_sw_c", label: "Biomarker Board", sourcePort: "bottom-1", targetPort: "top-1" }
      );
    }

    // Scale preset to the full-screen canvas (one-screen presets fill it exactly at 100% zoom)
    // Keep only objects the loaded file can feed (smart, data-driven preset)
    applyApplicability();
    // LFP Input object: root of every pipeline (input → lead → analyses)
    if (!state.nodes.some((n) => n.type === "input")) {
      let mnX = Infinity, mnY = Infinity;
      for (const n of state.nodes) { mnX = Math.min(mnX, n.x); mnY = Math.min(mnY, n.y); }
      const inp = inputRootNode(mnX - 640 - 80, mnY);
      inp.w = 640; inp.h = 470; inp.title = "LFP Input · verified JSON";
      state.nodes.unshift(inp);
      state.edges.unshift({ id: "edge_input_lead", source: "input_main", target: "lead_main", label: "verified JSON → LEAD" });
    }
    state.selection.selected_nodes = ["input_main"];
    refreshDataMenus();
    fitPresetToStage(state.nodes);

    // Default: select ALL contacts with data if none selected yet!
    if (!state.selection.contacts || !state.selection.contacts.length) {
      state.selection.contacts = getAllContactsWithData();
    }
    if (firstStream) {
      state.selection.hemisphere = hemi;
      state.selection.stim_rate_hz = firstStream.stim_rate_hz || state.selection.stim_rate_hz;
    }
    applyContactCascade();

    renderAll();
    fitCanvasLegible();
    syncToPython(true);
    scheduleContentFit({ refit: true });
  }

  function autoLayoutDAG() {
    // Topological layering (Kahn's algorithm)
    const inDeg = new Map();
    const adj = new Map();
    for (const n of state.nodes) {
      inDeg.set(n.id, 0);
      adj.set(n.id, []);
    }
    for (const e of state.edges) {
      if (adj.has(e.source) && inDeg.has(e.target)) {
        adj.get(e.source).push(e.target);
        inDeg.set(e.target, inDeg.get(e.target) + 1);
      }
    }
    const level = new Map();
    const q = [];
    for (const n of state.nodes) {
      if (inDeg.get(n.id) === 0) {
        level.set(n.id, 0);
        q.push(n.id);
      }
    }
    while (q.length) {
      const u = q.shift();
      const lu = level.get(u) || 0;
      for (const v of adj.get(u) || []) {
        level.set(v, Math.max(level.get(v) || 0, lu + 1));
        inDeg.set(v, inDeg.get(v) - 1);
        if (inDeg.get(v) === 0) q.push(v);
      }
    }
    const cols = new Map();
    for (const n of state.nodes) {
      const lv = level.has(n.id) ? level.get(n.id) : 0;
      if (!cols.has(lv)) cols.set(lv, []);
      cols.get(lv).push(n);
    }
    let curX = 40;
    const sortedLevels = Array.from(cols.keys()).sort((a, b) => a - b);
    for (const lv of sortedLevels) {
      const colNodes = cols.get(lv);
      let maxW = 0;
      let curY = 40;
      for (const n of colNodes) {
        n.x = curX;
        n.y = curY;
        const effH = n.collapsed ? 115 : n.h;
        curY += effH + 38;
        if (n.w > maxW) maxW = n.w;
      }
      curX += maxW + 96;
    }
    renderAll();
    fitCanvasToNodes();
    syncToPython();
  }

  function addNode(type, opts = {}) {
    const spec = NODE_CATALOG[type] || NODE_CATALOG.psd;
    const defSize = defaultNodeSize(type);
    const hemi = opts.hemisphere || state.selection.hemisphere || "Left";
    const pair = opts.pair || (state.selection.pairs[0] ? state.selection.pairs[0].split(":")[1] : "0-2");
    const rec = opts.recordingId
      ? getRecById(opts.recordingId)
      : (opts.contact ? findMatchingContactRecording(hemi, opts.contact) : findBestRecording(hemi, pair, true));

    const parentNode = opts.sourceNodeId ? state.nodes.find((n) => n.id === opts.sourceNodeId) : null;
    let x = opts.x;
    let y = opts.y;
    if (x === undefined || y === undefined) {
      if (parentNode) {
        const siblings = state.edges.filter((e) => e.source === parentNode.id).length;
        x = parentNode.x + parentNode.w + 90;
        y = parentNode.y + siblings * 110;
      } else {
        x = 580 + (state.nodes.length % 3) * 60;
        y = 60 + (state.nodes.length % 4) * 90;
      }
    }

    const id = nextId(type);
    const titleSuffix =
      type === "therapy" || type === "inspector"
        ? ""
        : opts.contact
        ? ` · ${hemi} ${opts.contact}`
        : ` · ${hemi} ${rec ? rec.pair : pair}`;

    const newNode = {
      id,
      type,
      title: `${spec.label}${titleSuffix}`,
      hemisphere: hemi,
      pair: rec ? rec.pair : pair,
      recordingId: rec ? rec.id : "",
      x: Math.round(x),
      y: Math.round(y),
      w: defSize.w,
      h: defSize.h,
      collapsed: false,
      mode: type === "psd" ? undefined
        : type === "beta_ftg" ? ((rec && (rec.amp_steps || []).length > 1) ? "dose" : "envelope")
        : type === "montage" ? "beta"
        : type === "impedance" ? "monopolar"
        : type === "risk_tail" ? "survival"
        : type === "risk_selection" ? "selection"
        : type === "opt_payoff" ? "payoff"
        : type === "opt_smile" ? "alpha"
        : type === "opt_selection" ? "selection"
        : type === "gsp_matrix" ? "W"
        : type === "gsp_gft" ? "gft"
        : type === "gsp_gtv" ? "gtv"
        : type === "gsp_phase" ? "clock"
        : type === "gsp_sweep" ? "sigma"
        : null,
    };
    state.nodes.push(newNode);

    if (parentNode && !wouldCreateCycle(parentNode.id, id)) {
      const edgeLabel = opts.edgeLabel || (opts.contact ? `${hemi} ${opts.contact} → ${spec.badge}` : `${hemi} ${newNode.pair} → ${spec.badge}`);
      state.edges.push({
        id: nextId("edge"),
        source: parentNode.id,
        target: id,
        label: edgeLabel,
        sourceContact: opts.contact ? `${hemi}:${opts.contact}` : null,
      });
    }

    if (rec && !state.selection.recordings.includes(rec.id)) {
      state.selection.recordings = [...state.selection.recordings, rec.id];
    }
    state.selection.selected_nodes = [id];
    renderAll();
    scheduleContentFit({ resolve: false });
    syncToPython();
    return newNode;
  }

  function removeNode(nodeId) {
    if (nodeId === "lead_main" || nodeId === "input_main") return; // keep the LFP Input root + lead
    state.nodes = state.nodes.filter((n) => n.id !== nodeId);
    state.edges = state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    state.selection.selected_nodes = state.selection.selected_nodes.filter((id) => id !== nodeId);
    if (state.focusNodeId === nodeId) state.focusNodeId = null;
    renderAll();
    syncToPython();
  }

  function toggleSelectContact(hemi, contact, multi = true) {
    const cid = `${hemi}:${contact}`;
    state.selection.hemisphere = hemi;
    const cur = state.selection.contacts || [];
    if (cur.includes(cid)) {
      state.selection.contacts = cur.filter((x) => x !== cid);
    } else {
      state.selection.contacts = multi ? [...cur, cid] : [cid];
    }
    applyContactCascade();
    renderAll();
    syncToPython();
  }

  function toggleSelectPair(hemi, pairKey) {
    const cs = contactsForPairStr(pairKey, hemi).map((c) => `${hemi}:${c}`);
    const cur = state.selection.contacts || [];
    const allIn = cs.every((c) => cur.includes(c));
    if (allIn && cur.length > cs.length) {
      // Narrow focus to just this pair's contacts for rapid exploration!
      state.selection.contacts = cs;
    } else if (allIn) {
      state.selection.contacts = cur.filter((x) => !cs.includes(x));
    } else {
      state.selection.contacts = Array.from(new Set([...cur, ...cs]));
    }
    state.selection.hemisphere = hemi;
    applyContactCascade();
    renderAll();
    syncToPython();
  }

  function setHover(patch) {
    let changed = false;
    let dataChanged = false;
    for (const [k, v] of Object.entries(patch)) {
      if (state.hover[k] !== v) {
        state.hover[k] = v;
        changed = true;
        if (k !== "nodeId") dataChanged = true;
      }
    }
    if (!changed) return;
    updateCrossHighlights(dataChanged);
    updateStatusBar();
  }

  // ── DOM Skeleton ────────────────────────────────────────────────────
  const root = el("div", { class: "nr-studio" });

  // Top Toolbar
  let meta = getPayload().metadata || {};
  const presetSel = el(
    "select",
    {
      class: "nr-select",
      title: "Switch DAG workspace preset",
      onchange: (e) => loadPreset(e.target.value),
    },
    [
      el("option", { value: "beta_ftg", text: "Preset: Beta & FTG Pipeline" }),
      el("option", { value: "directional_survey", text: "Preset: Directional Survey" }),
      el("option", { value: "freq_sweep", text: "Preset: Stim Frequency Sweep" }),
      el("option", { value: "gt_arms_arena", text: "GT Preset: Arms & Utility Arena" }),
      el("option", { value: "gt_nash_stackelberg", text: "GT Preset: Nash, Minimax & Stackelberg" }),
      el("option", { value: "gt_bandit_studio", text: "GT Preset: Live Multi-Armed Bandit" }),
      el("option", { value: "gt_complete", text: "GT Preset: Complete Game-Theory DAG" }),
      el("option", { value: "risk_arena", text: "Risk Preset: Tail Risk Arena & Envelope" }),
      el("option", { value: "risk_evt_suite", text: "Risk Preset: EVT Tail, GEV & Breach Rate" }),
      el("option", { value: "risk_complete", text: "Risk Preset: Complete Extreme-Value Risk DAG" }),
      el("option", { value: "opt_desk", text: "Opt Preset: Premium Arena, Payoff & Selection" }),
      el("option", { value: "opt_greeks_alpha", text: "Opt Preset: Lattice, Greeks, Smile & Alpha" }),
      el("option", { value: "opt_complete", text: "Opt Preset: Complete Option-Pricing DAG" }),
      el("option", { value: "gsp_pipeline", text: "GSP Preset: Amplitude Graph, GFT & GTV" }),
      el("option", { value: "gsp_operators", text: "GSP Preset: Graph Operators, σ-Sweep & Phase" }),
      el("option", { value: "gsp_complete", text: "GSP Preset: Complete Graph Signal Processing DAG" }),
      el("option", { value: "minimal_lead", text: "Preset: Minimal Lead Only" }),
    ]
  );
  presetSel.value = model.get("preset") || "beta_ftg";

  const addNodeSel = el(
    "select",
    {
      class: "nr-select",
      title: "Insert predefined DAG object",
      onchange: (e) => {
        if (!e.target.value) return;
        const src = state.selection.selected_nodes[0] || (state.nodes.some((n) => n.id === "lead_main") ? "lead_main" : "input_main");
        addNode(e.target.value, { sourceNodeId: src });
        e.target.value = "";
      },
    },
    [el("option", { value: "", text: "+ Insert Object..." })]
  );

  /** Insert + preset menus reflect what the loaded file can feed (inputs first, MRI/CT reserved). */
  function refreshDataMenus() {
    if (typeof addNodeSel === "undefined" || !addNodeSel) return;
    const loaded = hasData();
    addNodeSel.innerHTML = "";
    addNodeSel.appendChild(el("option", { value: "", text: "+ Insert Object..." }));
    const inputs = el("optgroup", { label: "Inputs" });
    for (const m of Object.values(INPUT_MODALITIES)) {
      const o = el("option", { value: m.available ? m.type : "", text: `${m.label}${m.available ? "" : " — planned"}` });
      if (!m.available) o.disabled = true;
      inputs.appendChild(o);
    }
    addNodeSel.appendChild(inputs);
    const objs = el("optgroup", { label: loaded ? "Objects for this file" : "Objects (load a file first)" });
    for (const [k, v] of Object.entries(NODE_CATALOG)) {
      if (k === "lead" || k === "input") continue;
      const ap = nodeApplicable(k);
      const o = el("option", { value: k, text: `${v.badge} · ${v.label}${ap.ok ? "" : " — n/a"}`, title: ap.why });
      if (!ap.ok) o.disabled = true;
      objs.appendChild(o);
    }
    addNodeSel.appendChild(objs);
    if (typeof presetSel !== "undefined" && presetSel) {
      for (const o of presetSel.options) {
        const types = PRESET_TYPES[o.value];
        const base = o.getAttribute("data-label") || o.textContent;
        o.setAttribute("data-label", base);
        if (!loaded || !types || !types.length) { o.textContent = base; o.title = ""; continue; }
        const okN = types.filter((t) => nodeApplicable(t).ok).length;
        o.textContent = `${okN === types.length ? "✓" : okN ? "◐" : "✕"} ${base.replace(/^Preset:\s*/, "")}`;
        o.title = okN === types.length ? "All objects apply to this file" : `${okN}/${types.length} objects apply to this file`;
      }
    }
  }

  const zoomLabel = el("span", { class: "nr-zoom-readout", text: "82%" });
  const exportBadge = el("span", { class: "nr-brand-sub nr-export-badge", text: "" });

  // Report export formats (built in Python by nr_report.py · Typst for PDF/PNG, python-docx for Word)
  const REPORT_FORMATS = {
    pdf: "PDF report",
    docx: "Word report (.docx)",
    zip: "All formats (.zip)",
    png_infographic: "PNG · infographic",
    png_canvas: "PNG · DAG canvas",
    svg_canvas: "SVG · DAG canvas (vector)",
    obj_png: "PNG · object",
    obj_pdf: "PDF · object",
  };
  // What the Python side can build. Desktop: everything (Typst). Browser build (WebAssembly): no Typst →
  // PNGs are rendered in the browser, Word/ZIP reports use those PNGs, PDF is not offered.
  const CAPS = Object.assign({ typst: true, docx: true, wasm: false }, model.get("capabilities") || {});
  // PDF / infographic need Typst. Desktop: the Typst Python package (if missing, the export explains how
  // to install it). Browser build: typst.ts — the same compiler as WebAssembly, loaded on first use.
  const BROWSER_TYPST = !CAPS.typst && !!CAPS.wasm;
  const OFFER_TYPST = true;
  const MENU_REPORTS = OFFER_TYPST ? ["pdf", "docx", "zip"] : CAPS.docx ? ["docx", "zip"] : [];
  const MENU_IMAGES = OFFER_TYPST ? ["png_infographic", "png_canvas", "svg_canvas"] : ["png_canvas", "svg_canvas"];
  const REPORT_ACTIONS = CAPS.wasm ? {} : {
    diagnose: "Check export setup",
    install_tools: "Install / update export tools",
  };
  let _pendingReport = null;
  const _optGroup = (label, entries) =>
    el("optgroup", { label }, entries.map(([k, v]) => el("option", { value: k, text: v })));
  const reportSel = el(
    "select",
    {
      class: "nr-select nr-select-export",
      title: "Export: PDF / Word report, ZIP of everything, PNG or SVG of the DAG canvas · setup tools",
      onchange: (e) => {
        const f = e.target.value;
        e.target.value = "";
        if (!f) return;
        if (!hasData() && !REPORT_ACTIONS[f]) {
          showReportPanel("Nothing to export yet", "Drop or browse an LFP JSON file in the LFP Input object first.", "info");
          return;
        }
        if (f === "svg_canvas") exportCanvasSVG();
        else if (f === "png_canvas" && !CAPS.typst) exportCanvasPNG();
        else if (BROWSER_TYPST && ["pdf", "png_infographic", "docx", "zip"].includes(f)) browserReport(f);
        else if (REPORT_ACTIONS[f]) requestReport([], f);
        else requestReport([f]);
      },
    },
    [
      el("option", { value: "", text: "Export ▾" }),
      MENU_REPORTS.length ? _optGroup("Reports", MENU_REPORTS.map((k) => [k, REPORT_FORMATS[k]])) : null,
      _optGroup("Images", MENU_IMAGES.map((k) => [k, REPORT_FORMATS[k]])),
      Object.keys(REPORT_ACTIONS).length ? _optGroup("Setup", Object.entries(REPORT_ACTIONS)) : null,
    ]
  );

  const clearStudioBtn = el("button", {
    class: "nr-btn nr-btn-clear",
    type: "button",
    title: "This click will clear the studio and unload the current case",
    "aria-label": "Clear studio and return to welcome page",
    html: '<span class="nr-clear-x">✕</span>&nbsp;Clear',
    onclick: (ev) => {
      ev.stopPropagation();
      clearStudioToWelcome();
    },
  });

  const toolbar = el("div", { class: "nr-toolbar" }, [
    el("div", { class: "nr-brand" }, [
      el("div", { class: "nr-brand-title", title: "Titra — DBS programming studio" }, [titraIcon(), el("span", { class: "nr-brand-word", text: "Titra" })]),
      clearStudioBtn,
      el("span", {
        class: "nr-brand-sub nr-brand-session",
        text: meta.file_name ? `${meta.device_name || "Percept"} · ${meta.file_name}` : "No file loaded",
      }),
    ]),
    el("div", { class: "nr-tool-group" }, [
      presetSel,
      addNodeSel,
      el("button", { class: "nr-btn", html: '<span class="nr-lbl-full">Auto-Layout</span><span class="nr-lbl-short">Layout</span>', title: "Arrange DAG topologically left-to-right", onclick: autoLayoutDAG }),
      el("button", {
        class: "nr-btn",
        html: '<span class="nr-lbl-full">Collapse All</span><span class="nr-lbl-short">Collapse</span>',
        title: "Collapse / expand all objects",
        onclick: () => {
          const keep = (n) => n.id === "lead_main" || n.id === "input_main";
          const allCollapsed = state.nodes.every((n) => keep(n) || n.collapsed);
          for (const n of state.nodes) {
            if (!keep(n)) n.collapsed = !allCollapsed;
          }
          renderAll();
          syncToPython();
        },
      }),
    ]),
    el("div", { class: "nr-toolbar-right" }, [
      el("button", { class: "nr-btn", text: "−", title: "Zoom out", onclick: () => zoomBy(0.85) }),
      zoomLabel,
      el("button", { class: "nr-btn", text: "+", title: "Zoom in", onclick: () => zoomBy(1.18) }),
      el("button", { class: "nr-btn", text: "100%", title: "Reset zoom to 100%", onclick: () => { state.viewport.zoom = 1.0; applyViewport(); } }),
      el("button", { class: "nr-btn", text: "Fit", title: "Fit all DAG nodes into view", onclick: () => fitCanvasToNodes() }),
      el("button", {
        class: "nr-btn",
        html: '⛶<span class="nr-lbl-full">&nbsp;Fullscreen</span>',
        title: "Toggle full-screen landscape canvas",
        onclick: () => toggleRootFullscreen(),
      }),
      el("div", { class: "nr-tool-sep" }),
      reportSel,
    ]),
  ]);

  // Viewport + World
  const viewportEl = el("div", { class: "nr-viewport" });
  const worldEl = el("div", { class: "nr-world" });
  const edgesSvg = svgEl("svg", { class: "nr-edges-svg", width: 7000, height: 4800 });
  const nodesLayer = el("div", { class: "nr-nodes-layer" });

  worldEl.appendChild(edgesSvg);
  worldEl.appendChild(nodesLayer);
  viewportEl.appendChild(exportBadge);

  const minimapEl = el("div", { class: "nr-minimap", title: "Click minimap to navigate DAG" });
  const focusContainer = el("div");

  viewportEl.appendChild(worldEl);
  viewportEl.appendChild(minimapEl);
  viewportEl.appendChild(focusContainer);

  // Bottom Status / Inter-Highlight Bar
  const statusBar = el("div", { class: "nr-statusbar" });

  root.appendChild(toolbar);
  root.appendChild(viewportEl);
  root.appendChild(statusBar);
  host.appendChild(root);

  // ── Viewport Pan & Zoom ─────────────────────────────────────────────
  function applyViewport() {
    worldEl.style.transform = `translate(${state.viewport.x}px, ${state.viewport.y}px) scale(${state.viewport.zoom})`;
    zoomLabel.textContent = `${Math.round(state.viewport.zoom * 100)}%`;
    renderMinimap();
  }

  function zoomBy(factor, cx = null, cy = null) {
    const rect = viewportEl.getBoundingClientRect();
    const px = cx !== null ? cx - rect.left : rect.width * 0.5;
    const py = cy !== null ? cy - rect.top : rect.height * 0.5;
    const oldZ = state.viewport.zoom;
    const newZ = clamp(oldZ * factor, 0.25, 3.5);
    const wx = (px - state.viewport.x) / oldZ;
    const wy = (py - state.viewport.y) / oldZ;
    state.viewport.zoom = newZ;
    state.viewport.x = px - wx * newZ;
    state.viewport.y = py - wy * newZ;
    applyViewport();
  }

  /** Default view: fit the DAG, but never below DEFAULT_MIN_ZOOM (then start at its top-left corner). */
  function fitCanvasLegible() {
    fitCanvasToNodes(DEFAULT_MIN_ZOOM);
  }
  function fitCanvasToNodes(minZoom) {
    if (!state.nodes.length) return;
    const zMin = typeof minZoom === "number" ? minZoom : 0.22;
    const rect = viewportEl.getBoundingClientRect();
    const vw = Math.max(400, rect.width || 1200);
    const vh = Math.max(300, rect.height || 720);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of state.nodes) {
      const eh = n.collapsed ? 115 : n.h;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + eh);
    }
    const pad = 32;
    const bw = Math.max(200, maxX - minX + pad * 2);
    const bh = Math.max(200, maxY - minY + pad * 2);
    const z = clamp(Math.min(vw / bw, vh / bh), zMin, 1.25);
    state.viewport.zoom = z;
    const cx = (vw - (maxX - minX) * z) * 0.5 - minX * z;
    const cy = (vh - (maxY - minY) * z) * 0.5 - minY * z;
    // larger than the view at this zoom → anchor the top-left (LFP Input first) instead of centring
    state.viewport.x = (maxX - minX + pad * 2) * z > vw ? pad * z - minX * z : cx;
    state.viewport.y = (maxY - minY + pad * 2) * z > vh ? pad * z - minY * z : cy;
    applyViewport();
  }

  viewportEl.addEventListener("wheel", (e) => {
    // Allow normal scrolling inside scrollable inspector/group lists
    if (e.target.closest(".nr-scroll-list, .nr-group-grid")) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.10 : 0.91;
    zoomBy(factor, e.clientX, e.clientY);
  }, { passive: false });

  // Pan canvas on background mousedown
  viewportEl.addEventListener("mousedown", (e) => {
    closeCtxMenu();
    if (e.button !== 0) return;
    if (e.target !== viewportEl && e.target !== worldEl && e.target !== edgesSvg) return;
    viewportEl.classList.add("nr-panning");
    const sx = e.clientX, sy = e.clientY;
    const ox = state.viewport.x, oy = state.viewport.y;
    const onMove = (mv) => {
      state.viewport.x = ox + (mv.clientX - sx);
      state.viewport.y = oy + (mv.clientY - sy);
      applyViewport();
    };
    const onUp = () => {
      viewportEl.classList.remove("nr-panning");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });

  // Right-click on canvas background
  viewportEl.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".nr-node")) return;
    e.preventDefault();
    const rect = viewportEl.getBoundingClientRect();
    const wx = (e.clientX - rect.left - state.viewport.x) / state.viewport.zoom;
    const wy = (e.clientY - rect.top - state.viewport.y) / state.viewport.zoom;
    openContextMenu(e.clientX, e.clientY, { kind: "canvas", wx, wy });
  });

  // ── Context Menu System ─────────────────────────────────────────────
  function closeCtxMenu() {
    if (state.ctxMenuEl) {
      state.ctxMenuEl.remove();
      state.ctxMenuEl = null;
    }
  }

  window.addEventListener("click", (e) => {
    if (state.ctxMenuEl && !state.ctxMenuEl.contains(e.target)) closeCtxMenu();
  });

  function openContextMenu(clientX, clientY, ctx) {
    closeCtxMenu();
    const menu = el("div", { class: "nr-ctx-menu" });

    let heading = "Insert DAG Object";
    let items = [];

    if (ctx.kind === "contact") {
      heading = `Contact ${ctx.hemisphere} ${ctx.contact}`;
      const base = { sourceNodeId: ctx.nodeId || "lead_main", hemisphere: ctx.hemisphere, contact: ctx.contact };
      items = [
        { sec: "Insert Signal & Spectral Objects" },
        { label: "FTG Half-Band Controller (Δf)", tag: "FTG Δf", fn: () => addNode("ftg_controller", base) },
        { label: "LFP Time-Domain Trace", tag: "LFP", fn: () => addNode("lfp", base) },
        { label: "Welch PSD (Beta & FTG)", tag: "PSD", fn: () => addNode("psd", base) },
        { label: "STFT Spectrogram", tag: "STFT", fn: () => addNode("spectrogram", base) },
        { label: "Beta & FTG Dynamics", tag: "β/FTG", fn: () => addNode("beta_ftg", base) },
        { label: "Hilbert Phase Portrait", tag: "PHASE", fn: () => addNode("phase", base) },
        { sec: "Lead & Device Diagnostics" },
        { label: "Directional Montage (15 Pairs)", tag: "MNTG", fn: () => addNode("montage", base) },
        { label: "Electrode Impedance Map", tag: "IMP", fn: () => addNode("impedance", base) },
        { label: "Therapy Groups & VTA", tag: "STIM", fn: () => addNode("therapy", base) },
        { sec: "Game-Theory Analysis" },
        { label: "GT · Arms & Utility Arena", tag: "ARMS", fn: () => addNode("gt_arms", base) },
        { label: "GT · Nash Bargaining & Pareto", tag: "NBS", fn: () => addNode("gt_nash", base) },
        { label: "GT · Minimax & Zero-Sum Nash", tag: "NASH", fn: () => addNode("gt_minimax", base) },
        { label: "GT · Stackelberg Leader–Follower", tag: "STACK", fn: () => addNode("gt_stackelberg", base) },
        { label: "GT · Live Multi-Armed Bandit", tag: "BANDIT", fn: () => addNode("gt_bandit", base) },
        { label: "GT · 7-Method Consensus Board", tag: "VOTE", fn: () => addNode("gt_consensus", base) },
        { sec: "Extreme-Value Tail Risk" },
        { label: "Risk · Tail Risk Arena & VaR Map", tag: "RISK", fn: () => addNode("risk_map", base) },
        { label: "Risk · Envelope & Red-Line Breaches", tag: "BREACH", fn: () => addNode("risk_envelope", base) },
        { label: "Risk · Tail Survival & EVT-VaR", tag: "TAIL", fn: () => addNode("risk_tail", base) },
        { label: "Risk · POT & GEV Return Levels", tag: "GEV", fn: () => addNode("risk_return", base) },
        { label: "Risk · Breach Rate λ(a) & P(Breach)", tag: "RATE", fn: () => addNode("risk_breach", base) },
        { label: "Risk · 5-Rule Selection & Backtest", tag: "SELECT", fn: () => addNode("risk_selection", base) },
        { sec: "Option-Pricing Analysis" },
        { label: "Opt · Premium Map & Strategy Arena", tag: "OPT", fn: () => addNode("opt_arena", base) },
        { label: "Opt · Payoff, Density & Calibration", tag: "PAYOFF", fn: () => addNode("opt_payoff", base) },
        { label: "Opt · American Lattice & aDBS Trigger", tag: "TREE", fn: () => addNode("opt_lattice", base) },
        { label: "Opt · Option Chain & Greeks", tag: "GREEKS", fn: () => addNode("opt_chain", base) },
        { label: "Opt · Alpha ∂Π/∂a & IV Smile", tag: "SMILE", fn: () => addNode("opt_smile", base) },
        { label: "Opt · 5-Rule Selection & Log-OU", tag: "PICK", fn: () => addNode("opt_selection", base) },
        { sec: "Graph Signal Processing (GSP)" },
        { label: "GSP · Amplitude-State Graph & Fiedler", tag: "GRAPH", fn: () => addNode("gsp_graph", base) },
        { label: "GSP · Graph Operator Matrix Explorer", tag: "MAT", fn: () => addNode("gsp_matrix", base) },
        { label: "GSP · Graph Fourier Modes & Log-PSD", tag: "GFT", fn: () => addNode("gsp_gft", base) },
        { label: "GSP · GTV(f), LGFE(f), GSE(f) & KPIs", tag: "GSP", fn: () => addNode("gsp_gtv", base) },
        { label: "GSP · Phase Clock & Takens Delay", tag: "CLOCK", fn: () => addNode("gsp_phase", base) },
        { label: "GSP · Kernel σ-Sweep & Contact Board", tag: "SIGMA", fn: () => addNode("gsp_sweep", base) },
        { sep: true },
        { label: `Select/Deselect ${ctx.hemisphere} ${ctx.contact} for Python`, tag: "PY", fn: () => toggleSelectContact(ctx.hemisphere, ctx.contact) },
      ];
    } else if (ctx.kind === "pair") {
      heading = `Bipolar Pair ${ctx.hemisphere} ${ctx.pair}`;
      const base = { sourceNodeId: ctx.nodeId || "lead_main", hemisphere: ctx.hemisphere, pair: ctx.pair };
      items = [
        { sec: "Insert Downstream Analysis" },
        { label: `LFP Trace (${ctx.pair})`, tag: "LFP", fn: () => addNode("lfp", base) },
        { label: `Welch & Survey PSD (${ctx.pair})`, tag: "PSD", fn: () => addNode("psd", base) },
        { label: `STFT Spectrogram (${ctx.pair})`, tag: "STFT", fn: () => addNode("spectrogram", base) },
        { label: `Beta & FTG Tracker (${ctx.pair})`, tag: "β/FTG", fn: () => addNode("beta_ftg", base) },
        { label: `Hilbert Phase Portrait (${ctx.pair})`, tag: "PHASE", fn: () => addNode("phase", base) },
        { label: `Directional Montage Survey`, tag: "MNTG", fn: () => addNode("montage", base) },
        { sec: "Game-Theory Analysis" },
        { label: "GT · Arms & Utility Arena", tag: "ARMS", fn: () => addNode("gt_arms", base) },
        { label: "GT · Nash Bargaining & Pareto", tag: "NBS", fn: () => addNode("gt_nash", base) },
        { label: "GT · Minimax & Zero-Sum Nash", tag: "NASH", fn: () => addNode("gt_minimax", base) },
        { label: "GT · Stackelberg Leader–Follower", tag: "STACK", fn: () => addNode("gt_stackelberg", base) },
        { label: "GT · Live Multi-Armed Bandit", tag: "BANDIT", fn: () => addNode("gt_bandit", base) },
        { label: "GT · 7-Method Consensus Board", tag: "VOTE", fn: () => addNode("gt_consensus", base) },
        { sec: "Extreme-Value Tail Risk" },
        { label: "Risk · Tail Risk Arena & VaR Map", tag: "RISK", fn: () => addNode("risk_map", base) },
        { label: "Risk · Envelope & Red-Line Breaches", tag: "BREACH", fn: () => addNode("risk_envelope", base) },
        { label: "Risk · Tail Survival & EVT-VaR", tag: "TAIL", fn: () => addNode("risk_tail", base) },
        { label: "Risk · POT & GEV Return Levels", tag: "GEV", fn: () => addNode("risk_return", base) },
        { label: "Risk · Breach Rate λ(a) & P(Breach)", tag: "RATE", fn: () => addNode("risk_breach", base) },
        { label: "Risk · 5-Rule Selection & Backtest", tag: "SELECT", fn: () => addNode("risk_selection", base) },
        { sec: "Option-Pricing Analysis" },
        { label: "Opt · Premium Map & Strategy Arena", tag: "OPT", fn: () => addNode("opt_arena", base) },
        { label: "Opt · Payoff, Density & Calibration", tag: "PAYOFF", fn: () => addNode("opt_payoff", base) },
        { label: "Opt · American Lattice & aDBS Trigger", tag: "TREE", fn: () => addNode("opt_lattice", base) },
        { label: "Opt · Option Chain & Greeks", tag: "GREEKS", fn: () => addNode("opt_chain", base) },
        { label: "Opt · Alpha ∂Π/∂a & IV Smile", tag: "SMILE", fn: () => addNode("opt_smile", base) },
        { label: "Opt · 5-Rule Selection & Log-OU", tag: "PICK", fn: () => addNode("opt_selection", base) },
        { sec: "Graph Signal Processing (GSP)" },
        { label: "GSP · Amplitude-State Graph & Fiedler", tag: "GRAPH", fn: () => addNode("gsp_graph", base) },
        { label: "GSP · Graph Operator Matrix Explorer", tag: "MAT", fn: () => addNode("gsp_matrix", base) },
        { label: "GSP · Graph Fourier Modes & Log-PSD", tag: "GFT", fn: () => addNode("gsp_gft", base) },
        { label: "GSP · GTV(f), LGFE(f), GSE(f) & KPIs", tag: "GSP", fn: () => addNode("gsp_gtv", base) },
        { label: "GSP · Phase Clock & Takens Delay", tag: "CLOCK", fn: () => addNode("gsp_phase", base) },
        { label: "GSP · Kernel σ-Sweep & Contact Board", tag: "SIGMA", fn: () => addNode("gsp_sweep", base) },
        { sep: true },
        { label: `Select/Deselect ${ctx.hemisphere} ${ctx.pair} for Python`, tag: "PY", fn: () => toggleSelectPair(ctx.hemisphere, ctx.pair) },
      ];
    } else if (ctx.kind === "opt_arm") {
      const arm = ctx.arm;
      heading = `Option Arm: ${arm.label}`;
      const base = { sourceNodeId: ctx.nodeId || "lead_main", hemisphere: arm.hemisphere, pair: arm.pair, recordingId: arm.rec_id };
      items = [
        { sec: "Branch Option-Pricing Objects" },
        { label: "Payoff, Density & Calibration", tag: "PAYOFF", fn: () => addNode("opt_payoff", base) },
        { label: "American Lattice & aDBS Trigger", tag: "TREE", fn: () => addNode("opt_lattice", base) },
        { label: "Option Chain & Greeks", tag: "GREEKS", fn: () => addNode("opt_chain", base) },
        { label: "Alpha ∂Π/∂a & IV Smile", tag: "SMILE", fn: () => addNode("opt_smile", base) },
        { label: "5-Rule Selection & Log-OU", tag: "PICK", fn: () => addNode("opt_selection", base) },
        { sec: "Inspect Raw Arm Signals" },
        { label: `LFP Trace (${arm.pair})`, tag: "LFP", fn: () => addNode("lfp", base) },
        { label: `Welch PSD (${arm.pair})`, tag: "PSD", fn: () => addNode("psd", base) },
        { label: `STFT Spectrogram (${arm.pair})`, tag: "STFT", fn: () => addNode("spectrogram", base) },
        { sep: true },
        { label: "Select/Deselect Option Arm for Python", tag: "PY", fn: () => toggleSelectOptArm(arm) },
      ];
    } else if (ctx.kind === "risk_arm") {
      const arm = ctx.arm;
      heading = `Risk Arm: ${arm.label}`;
      const base = { sourceNodeId: ctx.nodeId || "lead_main", hemisphere: arm.hemisphere, pair: arm.pair, recordingId: arm.rec_id };
      items = [
        { sec: "Branch Extreme-Value Risk Objects" },
        { label: "Envelope & Red-Line Breaches", tag: "BREACH", fn: () => addNode("risk_envelope", base) },
        { label: "Tail Survival & EVT-VaR", tag: "TAIL", fn: () => addNode("risk_tail", base) },
        { label: "POT & GEV Return Levels", tag: "GEV", fn: () => addNode("risk_return", base) },
        { label: "Breach Rate λ(a) & P(Breach)", tag: "RATE", fn: () => addNode("risk_breach", base) },
        { label: "5-Rule Selection & Backtest", tag: "SELECT", fn: () => addNode("risk_selection", base) },
        { sec: "Inspect Raw Arm Signals" },
        { label: `LFP Trace (${arm.pair})`, tag: "LFP", fn: () => addNode("lfp", base) },
        { label: `Welch PSD (${arm.pair})`, tag: "PSD", fn: () => addNode("psd", base) },
        { label: `STFT Spectrogram (${arm.pair})`, tag: "STFT", fn: () => addNode("spectrogram", base) },
        { sep: true },
        { label: "Select/Deselect Risk Arm for Python", tag: "PY", fn: () => toggleSelectRiskArm(arm) },
      ];
    } else if (ctx.kind === "arm") {
      const arm = ctx.arm;
      heading = `Arm: ${arm.label}`;
      const base = { sourceNodeId: ctx.nodeId || "lead_main", hemisphere: arm.hemisphere, pair: arm.pair, recordingId: arm.rec_id };
      items = [
        { sec: "Branch Game-Theory Solvers" },
        { label: "Nash Bargaining & Pareto", tag: "NBS", fn: () => addNode("gt_nash", base) },
        { label: "Minimax & Zero-Sum Nash", tag: "NASH", fn: () => addNode("gt_minimax", base) },
        { label: "Stackelberg Leader–Follower", tag: "STACK", fn: () => addNode("gt_stackelberg", base) },
        { label: "Live Multi-Armed Bandit", tag: "BANDIT", fn: () => addNode("gt_bandit", base) },
        { label: "7-Method Consensus Board", tag: "VOTE", fn: () => addNode("gt_consensus", base) },
        { sec: "Inspect Raw Arm Signals" },
        { label: `LFP Trace (${arm.pair})`, tag: "LFP", fn: () => addNode("lfp", base) },
        { label: `Welch PSD (${arm.pair})`, tag: "PSD", fn: () => addNode("psd", base) },
        { label: `STFT Spectrogram (${arm.pair})`, tag: "STFT", fn: () => addNode("spectrogram", base) },
        { sep: true },
        { label: "Select/Deselect Arm for Python", tag: "PY", fn: () => toggleSelectArm(arm) },
      ];
    } else if (ctx.kind === "node") {
      const nd = state.nodes.find((n) => n.id === ctx.nodeId);
      heading = nd ? nd.title : "DAG Object";
      const base = {
        sourceNodeId: ctx.nodeId,
        hemisphere: nd?.hemisphere || state.selection.hemisphere,
        pair: nd?.pair,
        recordingId: nd?.recordingId,
      };
      items = [
        { sec: "Branch Signal & Spectral Objects" },
        { label: "Branch → FTG Half-Band Controller", tag: "FTG Δf", fn: () => addNode("ftg_controller", base) },
        { label: "Branch → LFP Time-Domain", tag: "LFP", fn: () => addNode("lfp", base) },
        { label: "Branch → Power Spectral Density", tag: "PSD", fn: () => addNode("psd", base) },
        { label: "Branch → STFT Spectrogram", tag: "STFT", fn: () => addNode("spectrogram", base) },
        { label: "Branch → Beta & FTG Dynamics", tag: "β/FTG", fn: () => addNode("beta_ftg", base) },
        { label: "Branch → Hilbert Phase Portrait", tag: "PHASE", fn: () => addNode("phase", base) },
        { sec: "Branch Game-Theory Objects" },
        { label: "Branch → GT Arms & Utility Arena", tag: "ARMS", fn: () => addNode("gt_arms", base) },
        { label: "Branch → GT Nash Bargaining (Pareto)", tag: "NBS", fn: () => addNode("gt_nash", base) },
        { label: "Branch → GT Minimax & Zero-Sum Nash", tag: "NASH", fn: () => addNode("gt_minimax", base) },
        { label: "Branch → GT Stackelberg Curves", tag: "STACK", fn: () => addNode("gt_stackelberg", base) },
        { label: "Branch → GT Live Bandit", tag: "BANDIT", fn: () => addNode("gt_bandit", base) },
        { label: "Branch → GT Consensus Board", tag: "VOTE", fn: () => addNode("gt_consensus", base) },
        { sec: "Branch Extreme-Value Risk Objects" },
        { label: "Branch → Risk Tail Arena & VaR Map", tag: "RISK", fn: () => addNode("risk_map", base) },
        { label: "Branch → Risk Envelope & Breaches", tag: "BREACH", fn: () => addNode("risk_envelope", base) },
        { label: "Branch → Risk Tail Survival & EVT", tag: "TAIL", fn: () => addNode("risk_tail", base) },
        { label: "Branch → Risk POT & GEV Return Lvl", tag: "GEV", fn: () => addNode("risk_return", base) },
        { label: "Branch → Risk Breach Rate λ(a)", tag: "RATE", fn: () => addNode("risk_breach", base) },
        { label: "Branch → Risk 5-Rule Selection", tag: "SELECT", fn: () => addNode("risk_selection", base) },
        { sec: "Branch Option-Pricing Objects" },
        { label: "Branch → Opt Premium Arena", tag: "OPT", fn: () => addNode("opt_arena", base) },
        { label: "Branch → Opt Payoff & Density", tag: "PAYOFF", fn: () => addNode("opt_payoff", base) },
        { label: "Branch → Opt American Lattice", tag: "TREE", fn: () => addNode("opt_lattice", base) },
        { label: "Branch → Opt Chain & Greeks", tag: "GREEKS", fn: () => addNode("opt_chain", base) },
        { label: "Branch → Opt Alpha & IV Smile", tag: "SMILE", fn: () => addNode("opt_smile", base) },
        { label: "Branch → Opt 5-Rule Selection", tag: "PICK", fn: () => addNode("opt_selection", base) },
        { sec: "Branch Graph Signal Processing Objects" },
        { label: "Branch → GSP Amplitude Graph", tag: "GRAPH", fn: () => addNode("gsp_graph", base) },
        { label: "Branch → GSP Matrix Explorer", tag: "MAT", fn: () => addNode("gsp_matrix", base) },
        { label: "Branch → GSP Fourier Modes", tag: "GFT", fn: () => addNode("gsp_gft", base) },
        { label: "Branch → GSP GTV & KPIs", tag: "GSP", fn: () => addNode("gsp_gtv", base) },
        { label: "Branch → GSP Phase & Takens", tag: "CLOCK", fn: () => addNode("gsp_phase", base) },
        { label: "Branch → GSP σ-Sweep & Board", tag: "SIGMA", fn: () => addNode("gsp_sweep", base) },
        { sec: "Lead & Diagnostics" },
        { label: "Branch → Directional Montage", tag: "MNTG", fn: () => addNode("montage", base) },
        { label: "Branch → Impedance Matrix", tag: "IMP", fn: () => addNode("impedance", base) },
        { label: "Branch → Chronic LFP Trend", tag: "TREND", fn: () => addNode("trend", base) },
        { label: "Branch → JSON Data Inspector", tag: "JSON", fn: () => addNode("inspector", base) },
        { sep: true },
        {
          label: nd?.collapsed ? "Expand Object" : "Collapse Object",
          tag: nd?.collapsed ? "+" : "−",
          fn: () => { if (nd) { nd.collapsed = !nd.collapsed; renderAll(); syncToPython(); } },
        },
        {
          label: "Full-Stage Focus",
          tag: "⤢",
          fn: () => { state.focusNodeId = ctx.nodeId; renderFocusOverlay(); },
        },
        { label: "Export Object · SVG (vector)", tag: "SVG", fn: () => exportObject(nd, "svg") },
        { label: "Export Object · PNG (high-res)", tag: "PNG", fn: () => exportObject(nd, "png") },
        { label: "Export Object · PDF", tag: "PDF", fn: () => exportObject(nd, "pdf") },
      ];
      if (ctx.nodeId !== "lead_main") {
        items.push({ label: "Remove Node from DAG", tag: "✕", fn: () => removeNode(ctx.nodeId) });
      }
    } else if (ctx.kind === "edge") {
      heading = `DAG Connection`;
      items = [
        {
          label: "Delete Connection Edge",
          tag: "✕",
          fn: () => {
            state.edges = state.edges.filter((e) => e.id !== ctx.edgeId);
            renderAll();
            syncToPython();
          },
        },
      ];
    } else {
      heading = "Insert Object on Canvas";
      const base = { x: ctx.wx, y: ctx.wy, sourceNodeId: "lead_main" };
      items = [
        { sec: "Electrophysiology & Spectra" },
        { label: "FTG Half-Band Controller (Δf)", tag: "FTG Δf", fn: () => addNode("ftg_controller", base) },
        { label: "LFP Time-Domain Trace", tag: "LFP", fn: () => addNode("lfp", base) },
        { label: "Power Spectral Density (Beta & FTG)", tag: "PSD", fn: () => addNode("psd", base) },
        { label: "STFT Spectrogram", tag: "STFT", fn: () => addNode("spectrogram", base) },
        { label: "Beta & FTG Biomarker Tracker", tag: "β/FTG", fn: () => addNode("beta_ftg", base) },
        { label: "Hilbert Phase Portrait", tag: "PHASE", fn: () => addNode("phase", base) },
        { sec: "Game-Theory Analysis" },
        { label: "GT · Arms & Utility Arena", tag: "ARMS", fn: () => addNode("gt_arms", base) },
        { label: "GT · Nash Bargaining & Pareto", tag: "NBS", fn: () => addNode("gt_nash", base) },
        { label: "GT · Minimax & Zero-Sum Nash", tag: "NASH", fn: () => addNode("gt_minimax", base) },
        { label: "GT · Stackelberg Leader–Follower", tag: "STACK", fn: () => addNode("gt_stackelberg", base) },
        { label: "GT · Live Multi-Armed Bandit", tag: "BANDIT", fn: () => addNode("gt_bandit", base) },
        { label: "GT · 7-Method Consensus Board", tag: "VOTE", fn: () => addNode("gt_consensus", base) },
        { sec: "Extreme-Value Tail Risk" },
        { label: "Risk · Tail Risk Arena & VaR Map", tag: "RISK", fn: () => addNode("risk_map", base) },
        { label: "Risk · Envelope & Red-Line Breaches", tag: "BREACH", fn: () => addNode("risk_envelope", base) },
        { label: "Risk · Tail Survival & EVT-VaR", tag: "TAIL", fn: () => addNode("risk_tail", base) },
        { label: "Risk · POT & GEV Return Levels", tag: "GEV", fn: () => addNode("risk_return", base) },
        { label: "Risk · Breach Rate λ(a) & P(Breach)", tag: "RATE", fn: () => addNode("risk_breach", base) },
        { label: "Risk · 5-Rule Selection & Backtest", tag: "SELECT", fn: () => addNode("risk_selection", base) },
        { sec: "Option-Pricing Analysis" },
        { label: "Opt · Premium Map & Strategy Arena", tag: "OPT", fn: () => addNode("opt_arena", base) },
        { label: "Opt · Payoff, Density & Calibration", tag: "PAYOFF", fn: () => addNode("opt_payoff", base) },
        { label: "Opt · American Lattice & aDBS Trigger", tag: "TREE", fn: () => addNode("opt_lattice", base) },
        { label: "Opt · Option Chain & Greeks", tag: "GREEKS", fn: () => addNode("opt_chain", base) },
        { label: "Opt · Alpha ∂Π/∂a & IV Smile", tag: "SMILE", fn: () => addNode("opt_smile", base) },
        { label: "Opt · 5-Rule Selection & Log-OU", tag: "PICK", fn: () => addNode("opt_selection", base) },
        { sec: "Graph Signal Processing (GSP)" },
        { label: "GSP · Amplitude-State Graph & Fiedler", tag: "GRAPH", fn: () => addNode("gsp_graph", base) },
        { label: "GSP · Graph Operator Matrix Explorer", tag: "MAT", fn: () => addNode("gsp_matrix", base) },
        { label: "GSP · Graph Fourier Modes & Log-PSD", tag: "GFT", fn: () => addNode("gsp_gft", base) },
        { label: "GSP · GTV(f), LGFE(f), GSE(f) & KPIs", tag: "GSP", fn: () => addNode("gsp_gtv", base) },
        { label: "GSP · Phase Clock & Takens Delay", tag: "CLOCK", fn: () => addNode("gsp_phase", base) },
        { label: "GSP · Kernel σ-Sweep & Contact Board", tag: "SIGMA", fn: () => addNode("gsp_sweep", base) },
        { sec: "Lead, Therapy & Chronic Diagnostics" },
        { label: "Directional Montage (15 Pairs)", tag: "MNTG", fn: () => addNode("montage", base) },
        { label: "Electrode Impedance Matrix", tag: "IMP", fn: () => addNode("impedance", base) },
        { label: "Therapy Groups & Stimulation", tag: "STIM", fn: () => addNode("therapy", base) },
        { label: "Chronic LFP Trend Logs", tag: "TREND", fn: () => addNode("trend", base) },
        { label: "JSON Data Inspector", tag: "JSON", fn: () => addNode("inspector", base) },
        { sep: true },
        { label: "Auto-Layout DAG", tag: "DAG", fn: autoLayoutDAG },
        { label: "Fit All Nodes", tag: "FIT", fn: fitCanvasToNodes },
      ];
    }

    menu.appendChild(el("div", { class: "nr-ctx-head", text: heading }));
    for (const it of items) {
      if (it.sep) menu.appendChild(el("div", { class: "nr-ctx-sep" }));
      else if (it.sec) menu.appendChild(el("div", { class: "nr-ctx-section", text: it.sec }));
      else {
        const row = el("div", {
          class: "nr-ctx-item",
          onclick: () => { closeCtxMenu(); it.fn(); },
        }, [
          el("span", { text: it.label }),
          el("span", { class: "nr-ctx-item-tag", text: it.tag || "" }),
        ]);
        menu.appendChild(row);
      }
    }

    document.body.appendChild(menu);
    const mw = menu.offsetWidth || 300;
    const mh = menu.offsetHeight || 360;
    const left = Math.min(clientX, window.innerWidth - mw - 12);
    const top = Math.min(clientY, window.innerHeight - mh - 12);
    menu.style.left = `${Math.max(8, left)}px`;
    menu.style.top = `${Math.max(8, top)}px`;
    state.ctxMenuEl = menu;
  }

  // ── Multi-Edge Ports (All 4 Edges × 3 Ports = 12 Ports / Node) & Normal-Aware Bézier Routing ──
  function getNodePorts(node) {
    const h = node.collapsed ? 104 : node.h;
    const w = node.w;
    const fracs = node.collapsed ? [0.32, 0.68] : [0.24, 0.50, 0.76];
    const ports = [];
    fracs.forEach((f, i) => {
      ports.push({ id: `top-${i}`, edge: "top", rx: w * f, ry: 0, x: node.x + w * f, y: node.y, nx: 0, ny: -1 });
      ports.push({ id: `bottom-${i}`, edge: "bottom", rx: w * f, ry: h, x: node.x + w * f, y: node.y + h, nx: 0, ny: 1 });
    });
    const vFracs = node.collapsed ? [0.5] : [0.24, 0.50, 0.76];
    vFracs.forEach((f, i) => {
      const idx = node.collapsed ? 1 : i;
      ports.push({ id: `left-${idx}`, edge: "left", rx: 0, ry: h * f, x: node.x, y: node.y + h * f, nx: -1, ny: 0 });
      ports.push({ id: `right-${idx}`, edge: "right", rx: w, ry: h * f, x: node.x + w, y: node.y + h * f, nx: 1, ny: 0 });
    });
    return ports;
  }

  function getPortById(node, portId, fallbackEdge = "right") {
    const ports = getNodePorts(node);
    if (portId) {
      const exact = ports.find((p) => p.id === portId);
      if (exact) return exact;
      const edgeName = String(portId).split("-")[0];
      const sameEdge = ports.find((p) => p.edge === edgeName);
      if (sameEdge) return sameEdge;
    }
    const edgePorts = ports.filter((p) => p.edge === fallbackEdge);
    return edgePorts[Math.floor(edgePorts.length / 2)] || ports[0];
  }

  function resolveEdgePorts(edge, src, tgt, sibIdx = 0) {
    const srcH = src.collapsed ? 104 : src.h;
    const tgtH = tgt.collapsed ? 104 : tgt.h;
    const scx = src.x + src.w / 2, scy = src.y + srcH / 2;
    const tcx = tgt.x + tgt.w / 2, tcy = tgt.y + tgtH / 2;
    const dx = tcx - scx, dy = tcy - scy;
    let sEdge = "right", tEdge = "left";
    if (Math.abs(dy) > Math.abs(dx) * 1.15) {
      if (dy >= 0) { sEdge = "bottom"; tEdge = "top"; }
      else { sEdge = "top"; tEdge = "bottom"; }
    } else if (dx < 0) {
      sEdge = "left"; tEdge = "right";
    }
    const slotOrder = [1, 0, 2];
    const autoSlot = slotOrder[sibIdx % 3];
    const p1 = getPortById(src, edge.sourcePort || `${sEdge}-${autoSlot}`, sEdge);
    const p2 = getPortById(tgt, edge.targetPort || `${tEdge}-${autoSlot}`, tEdge);
    return { p1, p2 };
  }

  function buildEdgeBezier(p1, p2) {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const pull = clamp(dist * 0.36, 48, 180);
    const c1x = p1.x + p1.nx * pull;
    const c1y = p1.y + p1.ny * pull;
    const c2x = p2.x + p2.nx * pull;
    const c2y = p2.y + p2.ny * pull;
    return {
      d: `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
      mx: 0.125 * p1.x + 0.375 * c1x + 0.375 * c2x + 0.125 * p2.x,
      my: 0.125 * p1.y + 0.375 * c1y + 0.375 * c2y + 0.125 * p2.y,
    };
  }

  function renderEdges() {
    edgesSvg.innerHTML = "";
    const defs = svgEl("defs", {}, [
      svgEl("marker", { id: "nr-arrow", viewBox: "0 0 12 12", refX: "10", refY: "6", markerWidth: "9", markerHeight: "9", orient: "auto" }, [
        svgEl("path", { d: "M 1 1.5 L 10.5 6 L 1 10.5 z", fill: C.gray }),
      ]),
      svgEl("marker", { id: "nr-arrow-hi", viewBox: "0 0 12 12", refX: "10", refY: "6", markerWidth: "10", markerHeight: "10", orient: "auto" }, [
        svgEl("path", { d: "M 1 1.5 L 10.5 6 L 1 10.5 z", fill: C.crimson }),
      ]),
    ]);
    edgesSvg.appendChild(defs);

    const nodeById = new Map(state.nodes.map((n) => [n.id, n]));
    const lineage = state.hover.nodeId ? getLineageSet(state.hover.nodeId) : null;
    const outCounts = new Map();

    for (const e of state.edges) {
      const src = nodeById.get(e.source);
      const tgt = nodeById.get(e.target);
      if (!src || !tgt) continue;
      const sib = outCounts.get(e.source) || 0;
      outCounts.set(e.source, sib + 1);
      const { p1, p2 } = resolveEdgePorts(e, src, tgt, sib);
      const { d: dStr, mx, my } = buildEdgeBezier(p1, p2);

      const isHi = lineage ? lineage.edgesSet.has(e.id) : false;
      const isDim = lineage ? !isHi : false;

      const hit = svgEl("path", { d: dStr, stroke: "transparent", "stroke-width": 16, fill: "none", class: "nr-edge-hit" });
      hit.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openContextMenu(ev.clientX, ev.clientY, { kind: "edge", edgeId: e.id });
      });

      const path = svgEl("path", {
        d: dStr,
        class: `nr-edge-path ${isHi ? "nr-edge-hi nr-edge-flow" : ""} ${isDim ? "nr-edge-dim" : ""}`,
        "marker-end": isHi ? "url(#nr-arrow-hi)" : "url(#nr-arrow)",
      });

      edgesSvg.appendChild(hit);
      edgesSvg.appendChild(path);

      if (e.label) {
        const ly = my - 8;
        const tw = Math.max(76, e.label.length * 8.2 + 18);
        const bg = svgEl("rect", {
          x: mx - tw / 2,
          y: ly - 13,
          width: tw,
          height: 24,
          rx: 4,
          class: `nr-edge-label-bg ${isHi ? "nr-edge-hi" : ""}`,
          opacity: isDim ? 0.3 : 1,
        });
        const txt = svgEl("text", {
          x: mx,
          y: ly + 4,
          "text-anchor": "middle",
          class: `nr-edge-label-txt ${isHi ? "nr-edge-hi" : ""}`,
          opacity: isDim ? 0.3 : 1,
          text: e.label,
        });
        edgesSvg.appendChild(bg);
        edgesSvg.appendChild(txt);
      }
    }

    // Active drag-connect temporary wire (honoring port normal!)
    if (state.connectingFrom && state.tempCursorWorld) {
      const p1 = state.connectingFrom;
      const p2 = { x: state.tempCursorWorld.x, y: state.tempCursorWorld.y, nx: -p1.nx, ny: -p1.ny };
      const { d } = buildEdgeBezier(p1, p2);
      edgesSvg.appendChild(
        svgEl("path", {
          d,
          stroke: C.crimson,
          "stroke-width": 2.6,
          "stroke-dasharray": "6 5",
          fill: "none",
        })
      );
    }
  }

  // ── SVG Chart Builders (All Pure Vector, >= 14px Nature Font) ──────

  /** 1. Realistic SenSight Directional DBS Lead Model (Left / Right / Bilateral) */
  function buildDBSLeadSVG(node, width, height) {
    const payload = getPayload();
    const leads = payload.leads || {};
    const hemisAvail = hasData() ? hemisWithData("lead") : ["Left", "Right"];
    const hemisToDraw =
      state.leadView === "Bilateral" && hemisAvail.length >= 2
        ? ["Left", "Right"]
        : [state.leadView === "Right" && leads.Right ? "Right" : hemisAvail[0]];

    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });

    // Photorealistic Metallic & Insulation Gradients (Strict Silver / Gray / Black / Crimson)
    const defs = svgEl("defs", {}, [
      svgEl("linearGradient", { id: "nr-shaft-grad", x1: "0%", y1: "0%", x2: "100%", y2: "0%" }, [
        svgEl("stop", { offset: "0%", "stop-color": "#2E333D" }),
        svgEl("stop", { offset: "26%", "stop-color": "#6B7280" }),
        svgEl("stop", { offset: "45%", "stop-color": "#9CA3AF" }),
        svgEl("stop", { offset: "72%", "stop-color": "#374151" }),
        svgEl("stop", { offset: "100%", "stop-color": "#111317" }),
      ]),
      svgEl("linearGradient", { id: "nr-metal-grad", x1: "0%", y1: "0%", x2: "100%", y2: "0%" }, [
        svgEl("stop", { offset: "0%", "stop-color": "#9CA3AF" }),
        svgEl("stop", { offset: "28%", "stop-color": "#FFFFFF" }),
        svgEl("stop", { offset: "52%", "stop-color": "#E5E7EB" }),
        svgEl("stop", { offset: "82%", "stop-color": "#6B7280" }),
        svgEl("stop", { offset: "100%", "stop-color": "#374151" }),
      ]),
      svgEl("linearGradient", { id: "nr-metal-sel", x1: "0%", y1: "0%", x2: "100%", y2: "0%" }, [
        svgEl("stop", { offset: "0%", "stop-color": "#8E1225" }),
        svgEl("stop", { offset: "32%", "stop-color": "#E04A60" }),
        svgEl("stop", { offset: "58%", "stop-color": "#B81D33" }),
        svgEl("stop", { offset: "100%", "stop-color": "#5E0B18" }),
      ]),
      svgEl("radialGradient", { id: "nr-vta-glow", cx: "50%", cy: "50%", r: "50%" }, [
        svgEl("stop", { offset: "0%", "stop-color": C.crimson, "stop-opacity": "0.34" }),
        svgEl("stop", { offset: "55%", "stop-color": C.crimson, "stop-opacity": "0.14" }),
        svgEl("stop", { offset: "100%", "stop-color": C.crimson, "stop-opacity": "0.0" }),
      ]),
    ]);
    svg.appendChild(defs);

    const activeGroup = getActiveGroup();
    const montage = payload.montage || [];
    const imps = payload.impedances || {};
    const colW = width / hemisToDraw.length;

    hemisToDraw.forEach((hemi, hIdx) => {
      const ld = leads[hemi] || { model: "LEAD_B33005", target: "STN", orientation_deg: 0 };
      const gHemi = activeGroup && activeGroup.hemispheres ? activeGroup.hemispheres[hemi] : null;
      const monoImp = (imps[hemi] && imps[hemi].monopolar) || {};
      const dir = leadIsDirectional(hemi);
      const cx = colW * hIdx + colW * (dir ? 0.48 : 0.56);
      const shaftW = hemisToDraw.length === 1 ? 60 : 46;
      const topY = 58;
      const botY = height - 62;
      const span = Math.max(260, botY - topY);

      // Lead title & target header
      svg.appendChild(
        svgEl("text", {
          x: colW * hIdx + colW * 0.5,
          y: 22,
          "text-anchor": "middle",
          "font-family": FONT_SANS,
          "font-size": 15,
          "font-weight": 700,
          fill: C.black,
          text: dir ? `${hemi} · ${ld.target || "STN"} (${ld.orientation_deg ?? 0}°)` : `${hemi} · ${ld.target || "STN"} · 4-ring`,
        })
      );
      if (gHemi) {
        const ftgH = gHemi.ftg_center_hz || (gHemi.rate_hz ? gHemi.rate_hz / 2 : 72.5);
        svg.appendChild(
          svgEl("text", {
            x: colW * hIdx + colW * 0.5,
            y: 42,
            "text-anchor": "middle",
            "font-family": FONT_SANS,
            "font-size": 14,
            "font-weight": 600,
            fill: C.crimson,
            text: `${gHemi.rate_hz || "—"} Hz → FTG ${fmtNum(ftgH, 1)} Hz`,
          })
        );
      }

      // Compute contact vertical positions (Level 3 top → Level 0 bottom)
      const levelH = span * 0.135;
      const gapH = span * 0.068;
      const y3 = topY + span * 0.14;
      const y2 = y3 + levelH + gapH;
      const y1 = y2 + levelH + gapH;
      const y0 = y1 + levelH + gapH;
      const levelY = { "3": y3, "2": y2, "1": y1, "0": y0 };

      // VTA Crimson Electric Field Glow around active cathode contacts
      const stimMap = {};
      if (gHemi && gHemi.electrodes) {
        for (const es of gHemi.electrodes) {
          stimMap[es.contact] = es;
        }
      }
      for (const [lvKey, ly] of Object.entries(levelY)) {
        const cs = !dir ? [lvKey] : lvKey === "1" ? ["1a", "1b", "1c"] : lvKey === "2" ? ["2a", "2b", "2c"] : [lvKey];
        const activeCathodes = cs.filter((c) => stimMap[c] && stimMap[c].polarity === "Negative");
        if (activeCathodes.length) {
          const totalMa = activeCathodes.reduce((s, c) => s + (stimMap[c].ma || 0), 0);
          const rad = clamp(44 + totalMa * 14, 48, 86);
          const cy = ly + levelH / 2;
          svg.appendChild(svgEl("circle", { cx, cy, r: rad, fill: "url(#nr-vta-glow)" }));
          svg.appendChild(
            svgEl("circle", {
              cx,
              cy,
              r: rad * 0.72,
              fill: "none",
              stroke: C.crimson,
              "stroke-width": 1.3,
              "stroke-dasharray": "4 4",
              opacity: 0.65,
            })
          );
        }
      }

      // Outer Lead Body Shaft + Hemispherical Ventral Tip
      const tipY = y0 + levelH + 22;
      const shaftPath = [
        `M ${cx - shaftW / 2} ${topY}`,
        `L ${cx - shaftW / 2} ${tipY}`,
        `A ${shaftW / 2} ${shaftW * 0.44} 0 0 0 ${cx + shaftW / 2} ${tipY}`,
        `L ${cx + shaftW / 2} ${topY} Z`,
      ].join(" ");
      svg.appendChild(svgEl("path", { d: shaftPath, fill: "url(#nr-shaft-grad)", stroke: C.black, "stroke-width": 1.4 }));

      // Specular vertical highlight line along shaft
      svg.appendChild(
        svgEl("line", {
          x1: cx - shaftW * 0.22,
          y1: topY + 4,
          x2: cx - shaftW * 0.22,
          y2: tipY,
          stroke: C.white,
          "stroke-width": 1.8,
          opacity: 0.25,
        })
      );

      // Radiopaque Directional Orientation Marker (above Level 3) — directional leads only
      const mkY = topY + span * 0.04;
      if (dir) svg.appendChild(
        svgEl("rect", {
          x: cx - shaftW * 0.42,
          y: mkY,
          width: shaftW * 0.84,
          height: 12,
          rx: 2,
          fill: "url(#nr-metal-grad)",
          stroke: C.black,
          "stroke-width": 1,
        })
      );
      if (dir) svg.appendChild(
        svgEl("rect", {
          x: cx - 5,
          y: mkY + 12,
          width: 10,
          height: 14,
          fill: "url(#nr-metal-grad)",
          stroke: C.black,
          "stroke-width": 1,
        })
      );

      // Bipolar Sensing Pair Bracket Arcs on Left Flank (0-2, 1-3, 0-3, etc.)
      const hemiPairs = montage.filter((m) => m.hemisphere === hemi && m.kind === "ring");
      const pairOffsets = {
        "0-2": -shaftW / 2 - 22,
        "1-3": -shaftW / 2 - 42,
        "0-3": -shaftW / 2 - 62,
      };
      const pairKeysToShow = ["0-2", "1-3", "0-3"];
      pairKeysToShow.forEach((pk) => {
        const [e1, e2] = pk.split("-");
        const yA = levelY[e1] + levelH * 0.5;
        const yB = levelY[e2] + levelH * 0.5;
        const ax = cx + pairOffsets[pk];
        const pid = `${hemi}:${pk}`;
        const mObj = hemiPairs.find((m) => m.pair === pk);
        const isSel = (state.selection.pairs || []).includes(pid);
        const isHov = state.hover.pair === pid;
        const isActiveSense = gHemi && gHemi.sensing_pair === pk;

        const arcD = `M ${cx - shaftW / 2 - 3} ${yA} C ${ax} ${yA}, ${ax} ${yB}, ${cx - shaftW / 2 - 3} ${yB}`;
        const gArc = svgEl("g", { style: "cursor:pointer" });
        gArc.appendChild(svgEl("path", { d: arcD, fill: "none", stroke: "transparent", "stroke-width": 14 }));
        gArc.appendChild(
          svgEl("path", {
            d: arcD,
            fill: "none",
            stroke: isSel || isHov ? C.crimson : isActiveSense ? C.black : C.gray,
            "stroke-width": isSel || isHov ? 3.2 : isActiveSense ? 2.4 : 1.7,
            "stroke-dasharray": isActiveSense ? "none" : "5 3",
          })
        );
        // Midpoint pair badge
        const my = (yA + yB) * 0.5;
        gArc.appendChild(
          svgEl("rect", {
            x: ax - 18,
            y: my - 11,
            width: 36,
            height: 22,
            rx: 4,
            fill: isSel || isHov ? C.crimson : C.white,
            stroke: isSel || isHov ? C.crimson : C.silver,
            "stroke-width": 1.2,
          })
        );
        gArc.appendChild(
          svgEl("text", {
            x: ax,
            y: my + 5,
            "text-anchor": "middle",
            "font-family": FONT_SANS,
            "font-size": 14,
            "font-weight": 700,
            fill: isSel || isHov ? C.white : C.black,
            text: pk,
          })
        );
        gArc.addEventListener("mouseenter", () => setHover({ pair: pid, contact: null }));
        gArc.addEventListener("mouseleave", () => setHover({ pair: null }));
        gArc.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectPair(hemi, pk); });
        gArc.addEventListener("contextmenu", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          openContextMenu(ev.clientX, ev.clientY, { kind: "pair", hemisphere: hemi, pair: pk, nodeId: node.id });
        });
        svg.appendChild(gArc);
      });

      // Helper to render one interactive contact
      const drawContact = (cName, rx, ry, rw, rh, labelText) => {
        const cid = `${hemi}:${cName}`;
        const isSel = (state.selection.contacts || []).includes(cid);
        const isHov = state.hover.contact === cid || (state.hover.pair && state.hover.pair.startsWith(hemi + ":") && contactsForPairStr(state.hover.pair.split(":")[1], hemi).includes(cName));
        const st = stimMap[cName];
        const isCathode = st && st.polarity === "Negative";
        const isAnode = st && st.polarity === "Positive";

        const gC = svgEl("g", { style: "cursor:pointer" });
        gC.appendChild(
          svgEl("rect", {
            x: rx,
            y: ry,
            width: rw,
            height: rh,
            rx: 2,
            fill: isSel || isHov ? "url(#nr-metal-sel)" : "url(#nr-metal-grad)",
            stroke: isSel || isHov ? C.crimson : isCathode ? C.crimson : C.black,
            "stroke-width": isSel || isHov ? 2.6 : isCathode ? 2.0 : 1.1,
          })
        );
        // Contact label
        gC.appendChild(
          svgEl("text", {
            x: rx + rw / 2,
            y: ry + rh / 2 + 5,
            "text-anchor": "middle",
            "font-family": FONT_SANS,
            "font-size": 14,
            "font-weight": 700,
            fill: isSel || isHov ? C.white : C.black,
            text: labelText,
          })
        );
        // Cathode/Anode sign marker
        if (isCathode || isAnode) {
          gC.appendChild(
            svgEl("circle", {
              cx: rx + rw - 5,
              cy: ry + 6,
              r: 6,
              fill: isCathode ? C.crimson : C.black,
              stroke: C.white,
              "stroke-width": 1,
            })
          );
          gC.appendChild(
            svgEl("text", {
              x: rx + rw - 5,
              y: ry + 11,
              "text-anchor": "middle",
              "font-family": FONT_SANS,
              "font-size": 14,
              "font-weight": 700,
              fill: C.white,
              text: isCathode ? "−" : "+",
            })
          );
        }

        gC.addEventListener("mouseenter", () => setHover({ contact: cid }));
        gC.addEventListener("mouseleave", () => setHover({ contact: null }));
        gC.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectContact(hemi, cName); });
        gC.addEventListener("contextmenu", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          openContextMenu(ev.clientX, ev.clientY, { kind: "contact", hemisphere: hemi, contact: cName, nodeId: node.id });
        });
        svg.appendChild(gC);
      };

      // Ring 3 (dorsal) & Ring 0 (ventral)
      drawContact("3", cx - shaftW / 2 - 1, y3, shaftW + 2, levelH, "3");
      drawContact("0", cx - shaftW / 2 - 1, y0, shaftW + 2, levelH, "0");

      // Segmented Rings 2 (2a, 2b, 2c) & 1 (1a, 1b, 1c) + Axial 120° Compass Rings on Right Flank
      for (const lv of ["2", "1"]) {
        const ly = levelY[lv];
        if (!dir) {
          // 4-ring lead: level 1 and 2 are full cylindrical rings, no segments / compass
          drawContact(lv, cx - shaftW / 2 - 1, ly, shaftW + 2, levelH, lv);
          continue;
        }
        const segs = [`${lv}a`, `${lv}b`, `${lv}c`];
        const segW = (shaftW - 4) / 3;
        segs.forEach((sc, si) => {
          drawContact(sc, cx - shaftW / 2 + si * (segW + 2), ly, segW, levelH, sc.slice(1));
        });

        // Axial Directional Cross-Section Compass Ring on Right of Lead
        const compassR = hemisToDraw.length === 1 ? 30 : 24;
        const compCx = cx + shaftW / 2 + compassR + 20;
        const compCy = ly + levelH / 2;
        const orientRad = ((ld.orientation_deg || 0) - 90) * (Math.PI / 180);

        segs.forEach((sc, si) => {
          const a0 = orientRad + si * ((2 * Math.PI) / 3) + 0.08;
          const a1 = orientRad + (si + 1) * ((2 * Math.PI) / 3) - 0.08;
          const rIn = compassR * 0.42;
          const rOut = compassR;
          const x0 = compCx + rOut * Math.cos(a0), y0p = compCy + rOut * Math.sin(a0);
          const x1 = compCx + rOut * Math.cos(a1), y1p = compCy + rOut * Math.sin(a1);
          const x2 = compCx + rIn * Math.cos(a1), y2p = compCy + rIn * Math.sin(a1);
          const x3p = compCx + rIn * Math.cos(a0), y3p = compCy + rIn * Math.sin(a0);
          const secD = `M ${x0} ${y0p} A ${rOut} ${rOut} 0 0 1 ${x1} ${y1p} L ${x2} ${y2p} A ${rIn} ${rIn} 0 0 0 ${x3p} ${y3p} Z`;

          const cid = `${hemi}:${sc}`;
          const isSel = (state.selection.contacts || []).includes(cid);
          const isHov = state.hover.contact === cid;
          const isCath = stimMap[sc] && stimMap[sc].polarity === "Negative";

          const gSec = svgEl("g", { style: "cursor:pointer" });
          gSec.appendChild(
            svgEl("path", {
              d: secD,
              fill: isSel || isHov ? C.crimson : isCath ? C.crimsonTint : C.silverSoft,
              stroke: isSel || isHov || isCath ? C.crimson : C.black,
              "stroke-width": isSel || isHov ? 2.2 : 1.1,
            })
          );
          const midA = (a0 + a1) * 0.5;
          const lx = compCx + (rOut + 12) * Math.cos(midA);
          const lyTxt = compCy + (rOut + 12) * Math.sin(midA) + 5;
          gSec.appendChild(
            svgEl("text", {
              x: lx,
              y: lyTxt,
              "text-anchor": "middle",
              "font-family": FONT_SANS,
              "font-size": 14,
              "font-weight": 700,
              fill: isSel || isHov ? C.crimson : C.grayDark,
              text: sc,
            })
          );
          gSec.addEventListener("mouseenter", () => setHover({ contact: cid }));
          gSec.addEventListener("mouseleave", () => setHover({ contact: null }));
          gSec.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectContact(hemi, sc); });
          gSec.addEventListener("contextmenu", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            openContextMenu(ev.clientX, ev.clientY, { kind: "contact", hemisphere: hemi, contact: sc, nodeId: node.id });
          });
          svg.appendChild(gSec);
        });
      }

      // Ring 3 & Ring 0 Monopolar Impedance Labels on Right Flank
      if (state.showImpedanceOnLead) {
        for (const lv of dir ? ["3", "0"] : ["3", "2", "1", "0"]) {
          const ohm = monoImp[lv];
          if (ohm) {
            svg.appendChild(
              svgEl("text", {
                x: cx + shaftW / 2 + 12,
                y: levelY[lv] + levelH / 2 + 5,
                "font-family": FONT_SANS,
                "font-size": 14,
                "font-weight": 600,
                fill: C.grayDark,
                text: `${(ohm / 1000).toFixed(1)} kΩ`,
              })
            );
          }
        }
      }

      // Footer legend under each lead
      svg.appendChild(
        svgEl("text", {
          x: colW * hIdx + colW * 0.5,
          y: height - 12,
          "text-anchor": "middle",
          "font-family": FONT_SANS,
          "font-size": 14,
          fill: C.gray,
          text: `${leadModelName(hemi)} · ${gHemi ? `${fmtNum(gHemi.total_ma, 1)} mA` : "Off"}`,
        })
      );
    });

    return svg;
  }

  /** 2. LFP Time-Domain Trace + Stimulation Amplitude Staircase */
  function buildLFPSVG(node, width, height) {
    const rec = getRecById(node.recordingId);
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    if (!rec || !rec.trace || !rec.trace.t.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No LFP time-domain data" }));
      return svg;
    }

    const pad = { l: 58, r: 58, t: 24, b: 44 };
    const pw = Math.max(80, width - pad.l - pad.r);
    const ph = Math.max(60, height - pad.t - pad.b);
    const tArr = rec.trace.t;
    const yMinArr = rec.trace.min;
    const yMaxArr = rec.trace.max;
    const yMeanArr = rec.trace.mean;
    const tMax = Math.max(1, rec.duration_s || tArr[tArr.length - 1]);

    let yLo = Infinity, yHi = -Infinity;
    for (let i = 0; i < yMinArr.length; i++) {
      if (yMinArr[i] < yLo) yLo = yMinArr[i];
      if (yMaxArr[i] > yHi) yHi = yMaxArr[i];
    }
    const yLim = Math.max(Math.abs(yLo), Math.abs(yHi), 1.0) * 1.12;
    const sx = (t) => pad.l + (t / tMax) * pw;
    const sy = (v) => pad.t + ph * 0.5 - (v / yLim) * (ph * 0.48);

    // Grid & Axes
    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver, "stroke-width": 1 }));
    svg.appendChild(svgEl("line", { x1: pad.l, y1: sy(0), x2: pad.l + pw, y2: sy(0), stroke: C.silver, "stroke-dasharray": "4 4" }));

    // Min-Max Envelope Polygon (Silver/Gray shaded) + Mean Line (Ink Black)
    let polyPts = [];
    for (let i = 0; i < tArr.length; i++) polyPts.push(`${sx(tArr[i]).toFixed(1)},${sy(yMaxArr[i]).toFixed(1)}`);
    for (let i = tArr.length - 1; i >= 0; i--) polyPts.push(`${sx(tArr[i]).toFixed(1)},${sy(yMinArr[i]).toFixed(1)}`);
    svg.appendChild(svgEl("polygon", { points: polyPts.join(" "), fill: C.black, opacity: 0.16 }));

    const lineD = tArr.map((t, i) => `${i === 0 ? "M" : "L"} ${sx(t).toFixed(1)} ${sy(yMeanArr[i]).toFixed(1)}`).join(" ");
    svg.appendChild(svgEl("path", { d: lineD, fill: "none", stroke: C.black, "stroke-width": 1.6 }));

    // Overlaid Stimulation Amplitude Staircase (Crimson, Right Y-Axis)
    const ac = rec.amp_curve || { t: [], ma: [] };
    if (ac.t && ac.t.length > 1) {
      const aMax = Math.max(1.0, ...ac.ma) * 1.15;
      const syAmp = (a) => pad.t + ph - (a / aMax) * ph;
      let ampD = "";
      for (let i = 0; i < ac.t.length; i++) {
        const px = sx(ac.t[i]).toFixed(1);
        const py = syAmp(ac.ma[i]).toFixed(1);
        ampD += i === 0 ? `M ${px} ${py}` : ` H ${px} V ${py}`;
      }
      svg.appendChild(svgEl("path", { d: ampD, fill: "none", stroke: C.crimson, "stroke-width": 2.4 }));
      // Right axis ticks (mA)
      svg.appendChild(svgEl("text", { x: pad.l + pw + 8, y: pad.t + 12, "font-size": 14, "font-weight": 700, fill: C.crimson, text: `${aMax.toFixed(1)}` }));
      svg.appendChild(svgEl("text", { x: pad.l + pw + 8, y: pad.t + ph, "font-size": 14, fill: C.crimson, text: "0 mA" }));
    }

    // Selected Time Window Shade
    if (state.selection.time_window_s && state.selection.time_window_s.length === 2) {
      const [tw0, tw1] = state.selection.time_window_s;
      svg.appendChild(
        svgEl("rect", {
          x: sx(clamp(tw0, 0, tMax)),
          y: pad.t,
          width: Math.max(2, sx(clamp(tw1, 0, tMax)) - sx(clamp(tw0, 0, tMax))),
          height: ph,
          fill: C.crimsonSoft,
          stroke: C.crimson,
          "stroke-dasharray": "4 3",
        })
      );
    }

    // Synced Hover Time Crosshair
    if (state.hover.timeS !== null && state.hover.timeS <= tMax) {
      const hx = sx(state.hover.timeS);
      svg.appendChild(svgEl("line", { x1: hx, y1: pad.t, x2: hx, y2: pad.t + ph, stroke: C.crimson, "stroke-width": 1.8, "stroke-dasharray": "3 3", class: "nr-sync-cursor" }));
    }

    // Left Axis Labels (µV) & Bottom Time Ticks
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 12, "text-anchor": "end", "font-size": 14, fill: C.black, text: `+${Math.round(yLim)}` }));
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.black, text: `−${Math.round(yLim)}` }));
    svg.appendChild(svgEl("text", { x: 14, y: pad.t + ph / 2, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.grayDark, transform: `rotate(-90 14 ${pad.t + ph / 2})`, text: "LFP (µV)" }));

    for (let k = 0; k <= 4; k++) {
      const tv = (tMax * k) / 4;
      svg.appendChild(svgEl("text", { x: sx(tv), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: `${tv.toFixed(0)}s` }));
    }
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: `Time (s) · RMS ${rec.rms_uv} µV` }));

    // Interactive Hover & Drag-Brush Overlay
    const overlay = svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: "transparent", style: "cursor:crosshair" });
    overlay.addEventListener("mousemove", (ev) => {
      const r = overlay.getBoundingClientRect();
      const frac = clamp((ev.clientX - r.left) / Math.max(1, r.width), 0, 1);
      const tVal = Number((frac * tMax).toFixed(2));
      let ampVal = null;
      if (ac.t && ac.t.length) {
        const idx = ac.t.findIndex((x) => x >= tVal);
        ampVal = ac.ma[idx >= 0 ? idx : ac.ma.length - 1];
      }
      setHover({ timeS: tVal, ampMa: ampVal, pair: `${rec.hemisphere}:${rec.pair}` });
    });
    overlay.addEventListener("mouseleave", () => setHover({ timeS: null, ampMa: null }));
    overlay.addEventListener("mousedown", (ev) => {
      if (ev.button !== 0) return;
      ev.stopPropagation();
      const r = overlay.getBoundingClientRect();
      const t0 = clamp((ev.clientX - r.left) / Math.max(1, r.width), 0, 1) * tMax;
      const onUp = (up) => {
        const t1 = clamp((up.clientX - r.left) / Math.max(1, r.width), 0, 1) * tMax;
        if (Math.abs(t1 - t0) > tMax * 0.02) {
          state.selection.time_window_s = [Number(Math.min(t0, t1).toFixed(2)), Number(Math.max(t0, t1).toFixed(2))];
        } else {
          state.selection.time_window_s = null;
        }
        renderAll();
        syncToPython();
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mouseup", onUp);
    });
    svg.appendChild(overlay);
    return svg;
  }

  /** 3. Power Spectral Density (Welch / Survey) with Beta (13–30 Hz) & FTG (f_stim/2) Highlight Bands */
  /** Is a bipolar pair between segments (1a-1b) rather than ring levels (0-2)? */
  const isSegPair = (pair) => /[abc]/.test(String(pair || ""));
  /** "1a+1b+1c+2a+2b+2c" → "1+2"; partial levels keep their segments. */
  function compactContacts(cs) {
    const list = (cs || []).filter((c) => c && c !== "Case").map(String);
    const out = [];
    for (const c of list) {
      const lv = c.match(/^([12])[abc]$/);
      if (lv && ["a", "b", "c"].every((x) => list.includes(lv[1] + x))) { if (!out.includes(lv[1])) out.push(lv[1]); }
      else if (!out.includes(c)) out.push(c);
    }
    return out.join("+");
  }
  /**
   * Curves for the per-contact PSD overlay: recordings of the same hemisphere and the same
   * kind (streaming / survey / titration; ring vs segment pairs), one curve per pair + stim
   * contact (the selected recording wins, otherwise the longest one).
   */
  function psdOverlayRecs(hemi, ref) {
    const all = getAllRecordings().filter((r) => r.hemisphere === hemi && r.psd && (r.psd.freqs || []).length && (r.psd.db || []).length);
    const fam = ref ? all.filter((r) => r.source === ref.source && isSegPair(r.pair) === isSegPair(ref.pair)) : all;
    const best = new Map();
    for (const r of fam) {
      const k = `${r.pair}|${compactContacts(r.stim_contacts)}`;
      const cur = best.get(k);
      if (!cur || (ref && r.id === ref.id) || (!(ref && cur.id === ref.id) && (r.duration_s || 0) > (cur.duration_s || 0))) best.set(k, r);
    }
    const out = [...best.values()];
    out.repeats = fam.length - out.length;
    return out;
  }
  /** Default PSD view: overlay when the hemisphere has 2–6 distinct pairs, survey when only a montage exists. */
  function psdMode(node) {
    if (node.mode) return node.mode;
    const rec = getRecById(node.recordingId);
    if (!rec) return (getPayload().montage || []).length ? "survey" : "db";
    const n = psdOverlayRecs(rec.hemisphere, rec).length;
    return n >= 2 && n <= 6 ? "overlay" : "db";
  }
  /** Compact legend label: pair · stim contact(s) · max amplitude. */
  function psdCurveLabel(r) {
    let lbl = `${r.pair || "?"}`;
    const stim = compactContacts(r.stim_contacts);
    if (stim) lbl += ` · stim ${stim}`;
    else if (r.source === "LfpMontageTimeDomain") lbl += " · off-stim";
    else if (r.stim_rate_hz) lbl += ` · ${Math.round(r.stim_rate_hz)} Hz`;
    const ar = r.amp_range_ma;
    if (Array.isArray(ar) && ar.length === 2 && Number(ar[1]) > Number(ar[0])) lbl += ` · ≤${fmtNum(ar[1], 1)} mA`;
    return lbl;
  }
  const PSD_STYLES = [
    { stroke: C.black, dash: "none", w: 2.4 },
    { stroke: C.crimson, dash: "none", w: 2.4 },
    { stroke: C.grayDark, dash: "7 4", w: 2.0 },
    { stroke: C.crimson, dash: "7 4", w: 2.0 },
    { stroke: C.black, dash: "2 3", w: 2.0 },
    { stroke: C.gray, dash: "none", w: 1.8 },
    { stroke: C.crimson, dash: "2 3", w: 2.0 },
    { stroke: C.grayDark, dash: "10 3 2 3", w: 1.8 },
  ];

  function buildPSDSVG(node, width, height) {
    const rec = getRecById(node.recordingId);
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const mode = psdMode(node); // "db" | "linear" | "survey" | "overlay"

    let freqs = [], vals = [], yUnit = "dB";
    let overlay = [];
    if (mode === "overlay" && rec) {
      const all = psdOverlayRecs(rec.hemisphere, rec);
      // keep the selected recording + up to 7 others
      const others = all.filter((r) => r.id !== rec.id);
      const picked = [all.find((r) => r.id === rec.id) || rec, ...others].filter((r) => r && r.psd).slice(0, PSD_STYLES.length);
      picked.sort((a, b) => all.indexOf(a) - all.indexOf(b));
      overlay = picked.map((r, i) => ({ rec: r, f: r.psd.freqs || [], v: r.psd.db || [], st: PSD_STYLES[i], label: psdCurveLabel(r), sel: r.id === rec.id }));
      overlay.hidden = Math.max(0, all.length - picked.length);
      overlay.repeats = all.repeats || 0;
      freqs = rec.psd.freqs || [];
      vals = rec.psd.db || [];
    }
    if (mode === "survey") {
      const m = (getPayload().montage || []).find((x) => x.hemisphere === node.hemisphere && x.pair === node.pair) || (getPayload().montage || [])[0];
      if (m) {
        freqs = m.freqs || [];
        vals = m.mag_uv || [];
        yUnit = "µV peak";
      }
    } else if (rec && rec.psd) {
      freqs = rec.psd.freqs || [];
      vals = mode === "linear" ? rec.psd.power || [] : rec.psd.db || [];
      yUnit = mode === "linear" ? "µV²/Hz" : "dB";
    }

    if (!freqs.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No PSD data" }));
      return svg;
    }

    const pad = { l: 58, r: 22, t: 32, b: 44 };
    const pw = Math.max(80, width - pad.l - pad.r);
    const ph = Math.max(60, height - pad.t - pad.b);
    const fMax = Math.min(110, freqs[freqs.length - 1] || 100);
    const vis = freqs.map((f, i) => [f, vals[i]]).filter(([f, v]) => f >= 2 && f <= fMax && Number.isFinite(v));
    if (!vis.length) return svg;
    let yLo = Math.min(...vis.map((p) => p[1]));
    let yHi = Math.max(...vis.map((p) => p[1]));
    for (const c of overlay) {
      c.vis = c.f.map((f, i) => [f, c.v[i]]).filter(([f, v]) => f >= 2 && f <= fMax && Number.isFinite(v));
      for (const [, v] of c.vis) { if (v < yLo) yLo = v; if (v > yHi) yHi = v; }
    }
    if (yHi <= yLo + 1e-6) yHi = yLo + 1;
    const yPad = (yHi - yLo) * 0.12;
    yLo -= yPad;
    yHi += yPad;

    const sx = (f) => pad.l + (clamp(f, 0, fMax) / fMax) * pw;
    const sy = (v) => pad.t + ph - ((clamp(v, yLo, yHi) - yLo) / (yHi - yLo)) * ph;

    // Plot frame
    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver, "stroke-width": 1 }));

    // BETA BAND (13–30 Hz) — Cool Gray / Ink Black Highlight
    const bx0 = sx(13), bx1 = sx(30);
    svg.appendChild(svgEl("rect", { x: bx0, y: pad.t, width: bx1 - bx0, height: ph, fill: C.silverSoft, opacity: state.hover.band === "beta" ? 0.95 : 0.72 }));
    svg.appendChild(svgEl("line", { x1: bx0, y1: pad.t, x2: bx1, y2: pad.t, stroke: C.black, "stroke-width": 3.5 }));
    svg.appendChild(svgEl("text", { x: (bx0 + bx1) / 2, y: pad.t - 8, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: C.black, text: "BETA 13–30" }));

    // FTG BAND (f_stim / 2 ± half_bw) — Crimson Highlight
    const ftg = getFtgBand(rec);
    const fx0 = sx(ftg.lo), fx1 = sx(ftg.hi), fxc = sx(ftg.center);
    svg.appendChild(svgEl("rect", { x: fx0, y: pad.t, width: Math.max(4, fx1 - fx0), height: ph, fill: C.crimsonTint, opacity: state.hover.band === "ftg" ? 1.0 : 0.85 }));
    svg.appendChild(svgEl("line", { x1: fx0, y1: pad.t, x2: fx1, y2: pad.t, stroke: C.crimson, "stroke-width": 3.5 }));
    svg.appendChild(svgEl("line", { x1: fxc, y1: pad.t, x2: fxc, y2: pad.t + ph, stroke: C.crimson, "stroke-width": 1.6, "stroke-dasharray": "5 4" }));
    svg.appendChild(svgEl("text", { x: fxc, y: pad.t - 8, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: C.crimson, text: `FTG ${ftg.center} Hz` }));

    // Horizontal gridlines
    for (let k = 0; k <= 3; k++) {
      const gv = yLo + ((yHi - yLo) * k) / 3;
      const gy = sy(gv);
      svg.appendChild(svgEl("line", { x1: pad.l, y1: gy, x2: pad.l + pw, y2: gy, stroke: C.silverSoft }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: gy + 5, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: mode === "linear" ? gv.toFixed(1) : Math.round(gv) }));
    }

    // Optional amplitude-step ghost curves (when dose-response recording has multiple steps)
    if (mode === "db" && rec && rec.amp_steps && rec.amp_steps.length > 1) {
      rec.amp_steps.forEach((st, idx) => {
        const dStep = st.psd_freqs
          .map((f, i) => (f <= fMax ? `${i === 0 ? "M" : "L"} ${sx(f).toFixed(1)} ${sy(st.psd_db[i]).toFixed(1)}` : ""))
          .filter(Boolean)
          .join(" ");
        const isLast = idx === rec.amp_steps.length - 1;
        svg.appendChild(
          svgEl("path", {
            d: dStep,
            fill: "none",
            stroke: isLast ? C.crimson : C.grayLight,
            "stroke-width": isLast ? 1.8 : 1.0,
            opacity: isLast ? 0.78 : 0.45,
          })
        );
      });
    }

    // Main PSD Curve (Crisp Ink Black) — or one curve per contact pair in overlay mode
    if (overlay.length) {
      for (const c of [...overlay].sort((a, b) => Number(a.sel) - Number(b.sel))) {
        const d = c.vis.map(([f, v], i) => `${i === 0 ? "M" : "L"} ${sx(f).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
        const isHov = state.hover.recId === c.rec.id;
        svg.appendChild(svgEl("path", { d, fill: "none", stroke: c.st.stroke, "stroke-width": c.st.w + (c.sel ? 0.8 : 0) + (isHov ? 1.2 : 0), "stroke-dasharray": c.st.dash, opacity: c.sel || isHov ? 1 : 0.82 }));
      }
    } else {
      const dMain = vis.map(([f, v], i) => `${i === 0 ? "M" : "L"} ${sx(f).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
      svg.appendChild(svgEl("path", { d: dMain, fill: "none", stroke: C.black, "stroke-width": 2.4 }));
    }

    // Legend (overlay: one row per contact pair; dB with dose steps: explains the grey curves)
    const legendRows = overlay.length
      ? overlay.map((c) => ({ st: c.st, label: c.label, rec: c.rec, sel: c.sel }))
      : mode === "db" && rec && (rec.amp_steps || []).length > 1
        ? [
            { st: { stroke: C.black, dash: "none", w: 2.4 }, label: "mean PSD (all steps)" },
            { st: { stroke: C.grayLight, dash: "none", w: 1.4 }, label: `per-amplitude steps (${rec.amp_steps.length})` },
            { st: { stroke: C.crimson, dash: "none", w: 1.8 }, label: "highest amplitude step" },
          ]
        : [];
    if (overlay.hidden) legendRows.push({ st: null, label: `+${overlay.hidden} more pair(s) — pick in the menu` });
    if (overlay.repeats) legendRows.push({ st: null, label: `${overlay.repeats} repeat recording(s) of these pairs in the menu` });
    if (legendRows.length) {
      const rowH = 18;
      const lw = Math.min(pw * 0.62, Math.max(...legendRows.map((r) => textWidth(r.label, 12, 600))) + 40);
      const lx = pad.l + pw - lw - 6;
      const ly = pad.t + 6;
      svg.appendChild(svgEl("rect", { x: lx, y: ly, width: lw, height: legendRows.length * rowH + 8, rx: 3, fill: C.white, opacity: 0.92, stroke: C.silver }));
      legendRows.forEach((r, i) => {
        const yy = ly + 4 + i * rowH + rowH / 2;
        const g = svgEl("g", { style: r.rec ? "cursor:pointer" : "" });
        if (r.st) g.appendChild(svgEl("line", { x1: lx + 6, y1: yy, x2: lx + 28, y2: yy, stroke: r.st.stroke, "stroke-width": r.st.w, "stroke-dasharray": r.st.dash }));
        g.appendChild(svgEl("text", { x: lx + 34, y: yy + 4, "font-size": 12, "font-weight": r.sel ? 700 : 500, fill: C.black, text: fitText(r.label, lw - 40, 12, r.sel ? 700 : 500) }));
        if (r.rec) {
          g.addEventListener("mouseenter", () => setHover({ recId: r.rec.id }));
          g.addEventListener("mouseleave", () => setHover({ recId: null }));
          g.addEventListener("click", (ev) => {
            ev.stopPropagation();
            node.recordingId = r.rec.id;
            node.hemisphere = r.rec.hemisphere;
            node.pair = r.rec.pair;
            renderAll();
            syncToPython();
          });
        }
        svg.appendChild(g);
      });
    }

    // Beta & FTG Peak Dots
    if (rec && rec.band_stats && mode !== "survey" && mode !== "overlay") {
      const bs = rec.band_stats;
      const drawPeak = (pf, col) => {
        const pt = vis.reduce((best, p) => (Math.abs(p[0] - pf) < Math.abs(best[0] - pf) ? p : best), vis[0]);
        if (!pt) return;
        svg.appendChild(svgEl("circle", { cx: sx(pt[0]), cy: sy(pt[1]), r: 5, fill: col, stroke: C.white, "stroke-width": 1.6 }));
      };
      drawPeak(bs.beta_peak_hz, C.black);
      drawPeak(bs.ftg_peak_hz, C.crimson);
    }

    // Selected Frequency Window
    if (state.selection.freq_window_hz && state.selection.freq_window_hz.length === 2) {
      const [fw0, fw1] = state.selection.freq_window_hz;
      svg.appendChild(
        svgEl("rect", {
          x: sx(fw0),
          y: pad.t,
          width: Math.max(2, sx(fw1) - sx(fw0)),
          height: ph,
          fill: C.crimsonSoft,
          stroke: C.crimson,
          "stroke-dasharray": "4 3",
        })
      );
    }

    // Synced Frequency Hover Crosshair
    if (state.hover.freqHz !== null && state.hover.freqHz <= fMax) {
      const hx = sx(state.hover.freqHz);
      svg.appendChild(svgEl("line", { x1: hx, y1: pad.t, x2: hx, y2: pad.t + ph, stroke: C.crimson, "stroke-width": 1.8, "stroke-dasharray": "3 3" }));
    }

    // X-Axis Ticks
    for (let f = 0; f <= fMax; f += 20) {
      svg.appendChild(svgEl("text", { x: sx(f), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: `${f}` }));
    }
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: `Frequency (Hz) · ${yUnit}` }));

    // Hover & Frequency Brush Overlay
    const brush = svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: "transparent", style: "cursor:crosshair" });
    brush.addEventListener("mousemove", (ev) => {
      const r = brush.getBoundingClientRect();
      const fVal = Number((clamp((ev.clientX - r.left) / Math.max(1, r.width), 0, 1) * fMax).toFixed(1));
      const band = fVal >= 13 && fVal <= 30 ? "beta" : fVal >= ftg.lo && fVal <= ftg.hi ? "ftg" : null;
      setHover({ freqHz: fVal, band });
    });
    brush.addEventListener("mouseleave", () => setHover({ freqHz: null, band: null }));
    brush.addEventListener("mousedown", (ev) => {
      if (ev.button !== 0) return;
      ev.stopPropagation();
      const r = brush.getBoundingClientRect();
      const f0 = clamp((ev.clientX - r.left) / Math.max(1, r.width), 0, 1) * fMax;
      const onUp = (up) => {
        const f1 = clamp((up.clientX - r.left) / Math.max(1, r.width), 0, 1) * fMax;
        if (Math.abs(f1 - f0) > 2.5) {
          state.selection.freq_window_hz = [Number(Math.min(f0, f1).toFixed(1)), Number(Math.max(f0, f1).toFixed(1))];
        } else {
          state.selection.freq_window_hz = null;
        }
        renderAll();
        syncToPython();
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mouseup", onUp);
    });
    svg.appendChild(brush);
    return svg;
  }

  /** 4. Pure-Vector STFT Time–Frequency Spectrogram (Monochrome-to-Crimson Ramp) */
  function buildSpectrogramSVG(node, width, height) {
    const rec = getRecById(node.recordingId);
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    if (!rec || !rec.spectrogram || !rec.spectrogram.db.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No spectrogram data" }));
      return svg;
    }

    const sp = rec.spectrogram;
    const pad = { l: 56, r: 54, t: 38, b: 44 };
    const pw = Math.max(80, width - pad.l - pad.r);
    const ph = Math.max(60, height - pad.t - pad.b);
    const nF = sp.f.length;
    const nT = sp.t.length;
    const fMax = sp.f[nF - 1] || 110;
    const tMax = rec.duration_s || sp.t[nT - 1] || 1;
    const cellW = pw / nT;
    const cellH = ph / nF;
    const vmin = sp.vmin;
    const vmax = sp.vmax;

    // Top Amplitude Strip (Crimson)
    const ac = rec.amp_curve || { t: [], ma: [] };
    if (ac.t && ac.t.length > 1) {
      const aMax = Math.max(1, ...ac.ma);
      const stripH = 22;
      let dAmp = "";
      for (let i = 0; i < ac.t.length; i++) {
        const px = pad.l + (ac.t[i] / tMax) * pw;
        const py = 8 + stripH - (ac.ma[i] / aMax) * stripH;
        dAmp += i === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : ` H ${px.toFixed(1)} V ${py.toFixed(1)}`;
      }
      svg.appendChild(svgEl("path", { d: dAmp, fill: "none", stroke: C.crimson, "stroke-width": 2.2 }));
      svg.appendChild(svgEl("text", { x: pad.l + pw + 6, y: 24, "font-size": 14, "font-weight": 700, fill: C.crimson, text: `${Math.max(...ac.ma).toFixed(1)}mA` }));
    }

    // Vector Heatmap Rectangles
    const gCells = svgEl("g");
    for (let fi = 0; fi < nF; fi++) {
      const row = sp.db[fi];
      const ry = pad.t + ph - (fi + 1) * cellH;
      for (let ti = 0; ti < nT; ti++) {
        const u = (row[ti] - vmin) / Math.max(1e-6, vmax - vmin);
        gCells.appendChild(
          svgEl("rect", {
            x: (pad.l + ti * cellW).toFixed(1),
            y: ry.toFixed(1),
            width: (cellW + 0.6).toFixed(1),
            height: (cellH + 0.6).toFixed(1),
            fill: specColor(u),
          })
        );
      }
    }
    svg.appendChild(gCells);
    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: "none", stroke: C.black, "stroke-width": 1.1 }));

    const syF = (f) => pad.t + ph - (clamp(f, 0, fMax) / fMax) * ph;
    const sxT = (t) => pad.l + (clamp(t, 0, tMax) / tMax) * pw;

    // Horizontal Band Markers: BETA (13–30 Hz) & FTG (f_stim / 2)
    svg.appendChild(svgEl("line", { x1: pad.l, y1: syF(13), x2: pad.l + pw, y2: syF(13), stroke: C.white, "stroke-width": 1.6, "stroke-dasharray": "5 4" }));
    svg.appendChild(svgEl("line", { x1: pad.l, y1: syF(30), x2: pad.l + pw, y2: syF(30), stroke: C.white, "stroke-width": 1.6, "stroke-dasharray": "5 4" }));
    svg.appendChild(svgEl("text", { x: pad.l + 6, y: syF(21.5) + 5, "font-size": 14, "font-weight": 700, fill: C.white, stroke: C.black, "stroke-width": 0.4, text: "β" }));

    const ftg = getFtgBand(rec);
    svg.appendChild(svgEl("line", { x1: pad.l, y1: syF(ftg.center), x2: pad.l + pw, y2: syF(ftg.center), stroke: C.crimson, "stroke-width": 2.2, "stroke-dasharray": "6 4" }));
    svg.appendChild(svgEl("text", { x: pad.l + pw - 6, y: syF(ftg.center) - 5, "text-anchor": "end", "font-size": 14, "font-weight": 700, fill: C.crimson, text: `FTG ${ftg.center}` }));

    // Colorbar on Right
    const cbX = pad.l + pw + 12;
    for (let s = 0; s < 20; s++) {
      svg.appendChild(
        svgEl("rect", {
          x: cbX,
          y: pad.t + ph - ((s + 1) / 20) * ph,
          width: 12,
          height: ph / 20 + 0.6,
          fill: specColor(s / 19),
        })
      );
    }
    svg.appendChild(svgEl("rect", { x: cbX, y: pad.t, width: 12, height: ph, fill: "none", stroke: C.silver }));
    svg.appendChild(svgEl("text", { x: cbX + 16, y: pad.t + 12, "font-size": 14, fill: C.crimson, text: `${Math.round(vmax)}` }));
    svg.appendChild(svgEl("text", { x: cbX + 16, y: pad.t + ph, "font-size": 14, fill: C.grayDark, text: `${Math.round(vmin)}` }));

    // Synced Crosshairs
    if (state.hover.timeS !== null && state.hover.timeS <= tMax) {
      svg.appendChild(svgEl("line", { x1: sxT(state.hover.timeS), y1: pad.t, x2: sxT(state.hover.timeS), y2: pad.t + ph, stroke: C.crimson, "stroke-width": 1.6 }));
    }
    if (state.hover.freqHz !== null && state.hover.freqHz <= fMax) {
      svg.appendChild(svgEl("line", { x1: pad.l, y1: syF(state.hover.freqHz), x2: pad.l + pw, y2: syF(state.hover.freqHz), stroke: C.crimson, "stroke-width": 1.6 }));
    }

    // Axes
    for (let f = 0; f <= fMax; f += 25) {
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: syF(f) + 5, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: `${f}` }));
    }
    for (let k = 0; k <= 4; k++) {
      const tv = (tMax * k) / 4;
      svg.appendChild(svgEl("text", { x: sxT(tv), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: `${tv.toFixed(0)}s` }));
    }
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: "Time (s) · Freq (Hz)" }));

    const overlay = svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: "transparent", style: "cursor:crosshair" });
    overlay.addEventListener("mousemove", (ev) => {
      const r = overlay.getBoundingClientRect();
      const tVal = Number((clamp((ev.clientX - r.left) / Math.max(1, r.width), 0, 1) * tMax).toFixed(2));
      const fVal = Number(((1 - clamp((ev.clientY - r.top) / Math.max(1, r.height), 0, 1)) * fMax).toFixed(1));
      const band = fVal >= 13 && fVal <= 30 ? "beta" : fVal >= ftg.lo && fVal <= ftg.hi ? "ftg" : null;
      setHover({ timeS: tVal, freqHz: fVal, band });
    });
    overlay.addEventListener("mouseleave", () => setHover({ timeS: null, freqHz: null, band: null }));
    svg.appendChild(overlay);
    return svg;
  }

  /** 5. Beta (13–30 Hz) & FTG (f_stim/2) Dynamics: Dose-Response / Time Envelope / Freq Sweep */
  function buildBetaFtgSVG(node, width, height) {
    const rec = getRecById(node.recordingId);
    const mode = node.mode || "dose"; // "dose" | "envelope" | "freq_sweep"
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const pad = { l: 58, r: 24, t: 32, b: 46 };
    const pw = Math.max(80, width - pad.l - pad.r);
    const ph = Math.max(60, height - pad.t - pad.b);

    // Legend top
    svg.appendChild(svgEl("line", { x1: pad.l, y1: 16, x2: pad.l + 22, y2: 16, stroke: C.black, "stroke-width": 3 }));
    svg.appendChild(svgEl("text", { x: pad.l + 28, y: 21, "font-size": 14, "font-weight": 700, fill: C.black, text: "Beta (13–30 Hz)" }));
    svg.appendChild(svgEl("line", { x1: pad.l + 172, y1: 16, x2: pad.l + 194, y2: 16, stroke: C.crimson, "stroke-width": 3 }));
    const ftg = getFtgBand(rec);
    svg.appendChild(svgEl("text", { x: pad.l + 200, y: 21, "font-size": 14, "font-weight": 700, fill: C.crimson, text: `FTG (${ftg.center} Hz)` }));

    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));

    if (mode === "freq_sweep") {
      // Compare all streaming recordings for same hemisphere & pair across 125 / 145 / 165 Hz
      const samePair = getRecordings().filter(
        (r) => r.source === "BrainSenseTimeDomain" && r.hemisphere === (rec?.hemisphere || node.hemisphere) && r.pair === (rec?.pair || node.pair)
      );
      const list = samePair.length ? samePair : getRecordings().filter((r) => r.source === "BrainSenseTimeDomain").slice(0, 6);
      if (!list.length) {
        svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No multi-frequency streaming runs" }));
        return svg;
      }
      const allVals = list.flatMap((r) => [r.band_stats?.beta_db ?? -10, r.band_stats?.ftg_db ?? -15]);
      const yLo = Math.min(...allVals) - 3;
      const yHi = Math.max(...allVals) + 3;
      const sy = (v) => pad.t + ph - ((v - yLo) / Math.max(1, yHi - yLo)) * ph;
      const grpW = pw / list.length;

      list.forEach((r, i) => {
        const cx = pad.l + grpW * (i + 0.5);
        const bw = Math.min(32, grpW * 0.28);
        const bVal = r.band_stats?.beta_db ?? yLo;
        const fVal = r.band_stats?.ftg_db ?? yLo;

        const gBar = svgEl("g", { style: "cursor:pointer" });
        gBar.appendChild(svgEl("rect", { x: cx - bw - 3, y: sy(bVal), width: bw, height: Math.max(2, pad.t + ph - sy(bVal)), fill: C.black, rx: 2 }));
        gBar.appendChild(svgEl("rect", { x: cx + 3, y: sy(fVal), width: bw, height: Math.max(2, pad.t + ph - sy(fVal)), fill: C.crimson, rx: 2 }));
        gBar.appendChild(svgEl("text", { x: cx, y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: C.black, text: `${Math.round(r.stim_rate_hz)} Hz` }));
        gBar.appendChild(svgEl("text", { x: cx, y: pad.t + ph + 38, "text-anchor": "middle", "font-size": 14, fill: C.crimson, text: `→${r.ftg_center_hz}` }));
        gBar.addEventListener("click", (ev) => {
          ev.stopPropagation();
          node.recordingId = r.id;
          state.selection.stim_rate_hz = r.stim_rate_hz;
          if (!state.selection.recordings.includes(r.id)) state.selection.recordings = [...state.selection.recordings, r.id];
          renderAll();
          syncToPython();
        });
        svg.appendChild(gBar);
      });
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: `${Math.round(yHi)} dB` }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: `${Math.round(yLo)} dB` }));
      return svg;
    }

    if (mode === "dose" && rec && rec.amp_steps && rec.amp_steps.length > 1) {
      const steps = rec.amp_steps;
      const aMax = Math.max(0.5, ...steps.map((s) => s.amp_ma));
      const allY = steps.flatMap((s) => [s.beta_db, s.ftg_db]);
      const yLo = Math.min(...allY) - 2.5;
      const yHi = Math.max(...allY) + 2.5;
      const sx = (a) => pad.l + (a / aMax) * pw;
      const sy = (v) => pad.t + ph - ((v - yLo) / Math.max(1, yHi - yLo)) * ph;

      const dB = steps.map((s, i) => `${i === 0 ? "M" : "L"} ${sx(s.amp_ma).toFixed(1)} ${sy(s.beta_db).toFixed(1)}`).join(" ");
      const dF = steps.map((s, i) => `${i === 0 ? "M" : "L"} ${sx(s.amp_ma).toFixed(1)} ${sy(s.ftg_db).toFixed(1)}`).join(" ");
      svg.appendChild(svgEl("path", { d: dB, fill: "none", stroke: C.black, "stroke-width": 2.4 }));
      svg.appendChild(svgEl("path", { d: dF, fill: "none", stroke: C.crimson, "stroke-width": 2.4 }));

      steps.forEach((s) => {
        const isHov = state.hover.ampMa !== null && Math.abs(state.hover.ampMa - s.amp_ma) < 0.08;
        const c1 = svgEl("circle", { cx: sx(s.amp_ma), cy: sy(s.beta_db), r: isHov ? 6.5 : 4.5, fill: C.black, stroke: C.white, "stroke-width": 1.4, style: "cursor:pointer" });
        const c2 = svgEl("circle", { cx: sx(s.amp_ma), cy: sy(s.ftg_db), r: isHov ? 6.5 : 4.5, fill: C.crimson, stroke: C.white, "stroke-width": 1.4, style: "cursor:pointer" });
        for (const c of [c1, c2]) {
          c.addEventListener("mouseenter", () => setHover({ ampMa: s.amp_ma }));
          c.addEventListener("mouseleave", () => setHover({ ampMa: null }));
        }
        svg.appendChild(c1);
        svg.appendChild(c2);
      });

      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: `${Math.round(yHi)}` }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: `${Math.round(yLo)}` }));
      for (let k = 0; k <= 4; k++) {
        const av = (aMax * k) / 4;
        svg.appendChild(svgEl("text", { x: sx(av), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: `${av.toFixed(1)}` }));
      }
      svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: "Stimulation Amplitude (mA) · Power (dB)" }));
      return svg;
    }

    // Default: Time Envelope Mode
    if (rec && rec.envelope && rec.envelope.t.length) {
      const env = rec.envelope;
      const tMax = Math.max(1, rec.duration_s || env.t[env.t.length - 1]);
      const allY = [...env.beta_db, ...env.ftg_db];
      const yLo = Math.min(...allY) - 2;
      const yHi = Math.max(...allY) + 2;
      const sx = (t) => pad.l + (t / tMax) * pw;
      const sy = (v) => pad.t + ph - ((v - yLo) / Math.max(1, yHi - yLo)) * ph;

      const dB = env.t.map((t, i) => `${i === 0 ? "M" : "L"} ${sx(t).toFixed(1)} ${sy(env.beta_db[i]).toFixed(1)}`).join(" ");
      const dF = env.t.map((t, i) => `${i === 0 ? "M" : "L"} ${sx(t).toFixed(1)} ${sy(env.ftg_db[i]).toFixed(1)}`).join(" ");
      svg.appendChild(svgEl("path", { d: dB, fill: "none", stroke: C.black, "stroke-width": 2.2 }));
      svg.appendChild(svgEl("path", { d: dF, fill: "none", stroke: C.crimson, "stroke-width": 2.2 }));

      if (state.hover.timeS !== null && state.hover.timeS <= tMax) {
        svg.appendChild(svgEl("line", { x1: sx(state.hover.timeS), y1: pad.t, x2: sx(state.hover.timeS), y2: pad.t + ph, stroke: C.crimson, "stroke-dasharray": "3 3", "stroke-width": 1.6 }));
      }

      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: `${Math.round(yHi)}` }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: `${Math.round(yLo)}` }));
      for (let k = 0; k <= 4; k++) {
        const tv = (tMax * k) / 4;
        svg.appendChild(svgEl("text", { x: sx(tv), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: `${tv.toFixed(0)}s` }));
      }
      svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: "Time (s) · Band Power Envelope (dB)" }));
    }
    return svg;
  }

  /** 6. Directional Montage Survey (Dynamically Filtered by Selected Contacts) */
  function buildMontageSVG(node, width, height) {
    const hemi = node.hemisphere || state.selection.hemisphere || "Left";
    const metric = node.mode || "beta"; // "beta" | "ftg" | "peak"
    const pairs = getFilteredMontage(hemi);
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    if (!pairs.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "Select contacts on the DBS Lead to read montage pairs" }));
      return svg;
    }

    const valOf = (m) => metric === "ftg" ? (m.band_stats?.ftg_power || 0) : metric === "peak" ? (m.peak_uv || 0) : (m.band_stats?.beta_power || 0);
    const sorted = [...pairs].sort((a, b) => valOf(b) - valOf(a));
    const maxV = Math.max(1e-6, ...sorted.map(valOf));

    const pad = { l: 88, r: 92, t: 18, b: 14 };
    const rowH = Math.max(20, (height - pad.t - pad.b) / sorted.length);
    const barMaxW = Math.max(60, width - pad.l - pad.r);

    sorted.forEach((m, i) => {
      const y = pad.t + i * rowH;
      const v = valOf(m);
      const bw = Math.max(3, (v / maxV) * barMaxW);
      const isSel = (state.selection.pairs || []).includes(m.id);
      const isHov = state.hover.pair === m.id;

      const gRow = svgEl("g", { style: "cursor:pointer" });
      gRow.appendChild(svgEl("rect", { x: 2, y: y, width: width - 4, height: rowH - 2, rx: 3, fill: isSel || isHov ? C.crimsonTint : "transparent" }));
      gRow.appendChild(
        svgEl("text", {
          x: pad.l - 8,
          y: y + rowH * 0.72,
          "text-anchor": "end",
          "font-size": 14,
          "font-weight": isSel || isHov || i === 0 ? 700 : 500,
          fill: isSel || isHov ? C.crimson : C.black,
          text: m.pair,
        })
      );
      gRow.appendChild(
        svgEl("rect", {
          x: pad.l,
          y: y + 3,
          width: bw,
          height: Math.max(8, rowH - 8),
          rx: 2,
          fill: isSel || isHov || metric === "ftg" ? C.crimson : m.kind === "ring" ? C.black : C.grayDark,
        })
      );
      gRow.appendChild(
        svgEl("text", {
          x: pad.l + bw + 8,
          y: y + rowH * 0.72,
          "font-size": 14,
          "font-weight": 600,
          fill: isSel || isHov ? C.crimson : C.grayDark,
          text: metric === "peak" ? `${m.peak_uv.toFixed(2)} µV` : `${v.toFixed(2)}`,
        })
      );

      gRow.addEventListener("mouseenter", () => setHover({ pair: m.id, freqHz: m.peak_hz || null }));
      gRow.addEventListener("mouseleave", () => setHover({ pair: null, freqHz: null }));
      gRow.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectPair(hemi, m.pair); });
      gRow.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openContextMenu(ev.clientX, ev.clientY, { kind: "pair", hemisphere: hemi, pair: m.pair, nodeId: node.id });
      });
      svg.appendChild(gRow);
    });
    return svg;
  }

  /** 7. Hilbert Oscillatory Phase Portrait (Beta & FTG Side-by-Side) */
  function buildPhaseSVG(node, width, height) {
    const rec = getRecById(node.recordingId);
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    if (!rec || !rec.phase) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No phase portrait data" }));
      return svg;
    }

    const ftg = getFtgBand(rec);
    const panels = [
      { key: "beta", label: "Beta (13–30 Hz)", col: C.black, data: rec.phase.beta, cx: width * 0.26 },
      { key: "ftg", label: `FTG (${ftg.center} Hz)`, col: C.crimson, data: rec.phase.ftg, cx: width * 0.74 },
    ];
    const cy = height * 0.50;
    const rad = Math.min(width * 0.20, height * 0.32);

    panels.forEach((p) => {
      const d = p.data || {};
      const g = svgEl("g", { style: "cursor:pointer" });
      g.appendChild(svgEl("text", { x: p.cx, y: 22, "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: p.col, text: p.label }));

      // Polar dial circles + crosshairs
      g.appendChild(svgEl("circle", { cx: p.cx, cy, r: rad, fill: C.white, stroke: C.silver, "stroke-width": 1.3 }));
      g.appendChild(svgEl("circle", { cx: p.cx, cy, r: rad * 0.55, fill: "none", stroke: C.silverSoft, "stroke-dasharray": "4 4" }));
      g.appendChild(svgEl("line", { x1: p.cx - rad, y1: cy, x2: p.cx + rad, y2: cy, stroke: C.silverSoft }));
      g.appendChild(svgEl("line", { x1: p.cx, y1: cy - rad, x2: p.cx, y2: cy + rad, stroke: C.silverSoft }));

      // Burst threshold ring (1.25 × RMS)
      const scale = Math.max(d.scale || 1, 1e-6);
      const thrR = clamp(((d.burst_thr || 0) / scale) * rad * 0.88, 6, rad);
      g.appendChild(svgEl("circle", { cx: p.cx, cy, r: thrR, fill: "none", stroke: p.col, "stroke-width": 1.4, "stroke-dasharray": "5 4", opacity: 0.7 }));

      // Analytic Phasor Trajectory
      if (d.re && d.re.length > 2) {
        const pathD = d.re
          .map((rx, i) => {
            const px = p.cx + clamp(rx / scale, -1.05, 1.05) * rad * 0.88;
            const py = cy - clamp(d.im[i] / scale, -1.05, 1.05) * rad * 0.88;
            return `${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
          })
          .join(" ");
        g.appendChild(svgEl("path", { d: pathD, fill: "none", stroke: p.col, "stroke-width": 1.9, opacity: 0.88 }));
        const lastX = p.cx + clamp(d.re[d.re.length - 1] / scale, -1, 1) * rad * 0.88;
        const lastY = cy - clamp(d.im[d.im.length - 1] / scale, -1, 1) * rad * 0.88;
        g.appendChild(svgEl("line", { x1: p.cx, y1: cy, x2: lastX, y2: lastY, stroke: p.col, "stroke-width": 2.0 }));
        g.appendChild(svgEl("circle", { cx: lastX, cy: lastY, r: 4.5, fill: p.col, stroke: C.white, "stroke-width": 1.4 }));
      }

      // Metrics footer
      g.appendChild(
        svgEl("text", {
          x: p.cx,
          y: height - 10,
          "text-anchor": "middle",
          "font-size": 14,
          "font-weight": 600,
          fill: C.grayDark,
          text: `${fmtNum(d.inst_hz, 1)} Hz · Burst ${fmtNum(d.burst_pct, 0)}% · ρ ${fmtNum(d.roundness, 2)}`,
        })
      );
      g.addEventListener("mouseenter", () => setHover({ band: p.key }));
      g.addEventListener("mouseleave", () => setHover({ band: null }));
      svg.appendChild(g);
    });
    return svg;
  }

  /** 8. Electrode Impedance Map (Monopolar Bars OR 8×8 Bipolar Matrix) */
  function buildImpedanceSVG(node, width, height) {
    const hemi = node.hemisphere || state.selection.hemisphere || "Left";
    const impH = (getPayload().impedances || {})[hemi] || { monopolar: {}, bipolar: [] };
    const mode = node.mode || "monopolar";
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const CONTACTS = leadContacts(hemi);

    if (mode === "bipolar") {
      const pad = { l: 48, t: 36, r: 20, b: 18 };
      const sz = Math.min(width - pad.l - pad.r, height - pad.t - pad.b);
      const cell = sz / CONTACTS.length;
      const lookup = {};
      let maxOhm = 1000;
      for (const b of impH.bipolar || []) {
        lookup[`${b.e1}|${b.e2}`] = b.ohm;
        lookup[`${b.e2}|${b.e1}`] = b.ohm;
        if (b.ohm > maxOhm) maxOhm = b.ohm;
      }

      CONTACTS.forEach((c1, i) => {
        svg.appendChild(svgEl("text", { x: pad.l + i * cell + cell / 2, y: pad.t - 10, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: C.black, text: c1 }));
        svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + i * cell + cell / 2 + 5, "text-anchor": "end", "font-size": 14, "font-weight": 700, fill: C.black, text: c1 }));
        CONTACTS.forEach((c2, j) => {
          const val = i === j ? 0 : lookup[`${c1}|${c2}`] || 0;
          const missing = i !== j && !lookup[`${c1}|${c2}`];
          const u = clamp(val / maxOhm, 0, 1);
          const isHov = state.hover.contact === `${hemi}:${c1}` || state.hover.contact === `${hemi}:${c2}`;
          const rect = svgEl("rect", {
            x: pad.l + j * cell + 1,
            y: pad.t + i * cell + 1,
            width: cell - 2,
            height: cell - 2,
            rx: 2,
            fill: i === j || missing ? C.alabaster : specColor(u * 0.92),
            stroke: isHov ? C.crimson : C.silver,
            "stroke-width": isHov ? 2.2 : 0.8,
            style: "cursor:pointer",
          });
          rect.addEventListener("mouseenter", () => setHover({ pair: `${hemi}:${c1}-${c2}`, contact: `${hemi}:${c1}` }));
          rect.addEventListener("mouseleave", () => setHover({ pair: null, contact: null }));
          rect.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectContact(hemi, c1); });
          svg.appendChild(rect);
        });
      });
      return svg;
    }

    // Monopolar Bar Chart
    const mono = impH.monopolar || {};
    const vals = CONTACTS.map((c) => mono[c] || 0);
    const maxV = Math.max(1000, ...vals);
    const pad = { l: 54, r: 92, t: 18, b: 18 };
    const rowH = (height - pad.t - pad.b) / CONTACTS.length;
    const maxW = Math.max(60, width - pad.l - pad.r);

    CONTACTS.forEach((c, i) => {
      const v = Number(mono[c]) || 0;
      const y = pad.t + i * rowH;
      const bw = Math.max(4, (v / maxV) * maxW);
      const cid = `${hemi}:${c}`;
      const isSel = (state.selection.contacts || []).includes(cid);
      const isHov = state.hover.contact === cid;

      const g = svgEl("g", { style: "cursor:pointer" });
      g.appendChild(svgEl("rect", { x: 2, y, width: width - 4, height: rowH - 2, rx: 3, fill: isSel || isHov ? C.crimsonTint : "transparent" }));
      g.appendChild(svgEl("text", { x: pad.l - 10, y: y + rowH * 0.68, "text-anchor": "end", "font-size": 14, "font-weight": 700, fill: isSel || isHov ? C.crimson : C.black, text: c }));
      if (v > 0) g.appendChild(svgEl("rect", { x: pad.l, y: y + 5, width: bw, height: Math.max(12, rowH - 12), rx: 3, fill: isSel || isHov || v > 5000 ? C.crimson : C.black }));
      g.appendChild(svgEl("text", { x: v > 0 ? pad.l + bw + 8 : pad.l + 4, y: y + rowH * 0.68, "font-size": 14, "font-weight": 600, fill: v > 0 ? C.grayDark : C.gray, text: v > 0 ? `${v} Ω` : "— not measured" }));
      g.addEventListener("mouseenter", () => setHover({ contact: cid }));
      g.addEventListener("mouseleave", () => setHover({ contact: null }));
      g.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectContact(hemi, c); });
      g.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openContextMenu(ev.clientX, ev.clientY, { kind: "contact", hemisphere: hemi, contact: c, nodeId: node.id });
      });
      svg.appendChild(g);
    });
    return svg;
  }

  /** 9. Chronic LFP Trend Logs (Multi-Day LFP & Stimulation mA) */
  function buildTrendSVG(node, width, height) {
    const hemi = node.hemisphere || state.selection.hemisphere || "Left";
    const tr = (getPayload().trends || {})[hemi];
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    if (!tr || !tr.lfp || !tr.lfp.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No chronic LFPTrendLogs in file" }));
      return svg;
    }

    const pad = { l: 58, r: 58, t: 28, b: 44 };
    const pw = Math.max(80, width - pad.l - pad.r);
    const ph = Math.max(60, height - pad.t - pad.b);
    const n = tr.lfp.length;
    const lMax = Math.max(1, ...tr.lfp) * 1.12;
    const mMax = Math.max(1, ...tr.ma) * 1.15;
    const sx = (i) => pad.l + (i / Math.max(1, n - 1)) * pw;
    const syL = (v) => pad.t + ph - (v / lMax) * ph;
    const syM = (v) => pad.t + ph - (v / mMax) * ph;

    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));
    const dL = tr.lfp.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${syL(v).toFixed(1)}`).join(" ");
    const dM = tr.ma.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${syM(v).toFixed(1)}`).join(" ");
    svg.appendChild(svgEl("path", { d: dL, fill: "none", stroke: C.black, "stroke-width": 1.9 }));
    svg.appendChild(svgEl("path", { d: dM, fill: "none", stroke: C.crimson, "stroke-width": 2.2 }));

    svg.appendChild(svgEl("text", { x: pad.l, y: 18, "font-size": 14, "font-weight": 700, fill: C.black, text: `LFP (${tr.n_days}d · ${tr.n_total_points} pts)` }));
    svg.appendChild(svgEl("text", { x: pad.l + pw, y: 18, "text-anchor": "end", "font-size": 14, "font-weight": 700, fill: C.crimson, text: "Stim (mA)" }));
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, fill: C.black, text: `${Math.round(lMax)}` }));
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.black, text: "0" }));
    svg.appendChild(svgEl("text", { x: pad.l + pw + 8, y: pad.t + 14, "font-size": 14, fill: C.crimson, text: `${mMax.toFixed(1)}` }));
    svg.appendChild(svgEl("text", { x: pad.l, y: pad.t + ph + 20, "font-size": 14, fill: C.grayDark, text: tr.dates[0] || "" }));
    svg.appendChild(svgEl("text", { x: pad.l + pw, y: pad.t + ph + 20, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: tr.dates[n - 1] || "" }));
    return svg;
  }

  /** 0. FTG Half-Band Controller Object (Compact Interactive Band Architecture Strip) */
  function buildFTGControllerSVG(node, width, height) {
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const ftg = getFtgBand(state.selection.stim_rate_hz);
    const bw = state.selection.ftg_half_bw_hz || 4.0;
    const fMax = 120;
    const pad = { l: 34, r: 22, t: 18, b: 33 };
    const pw = Math.max(120, width - pad.l - pad.r);
    const ph = Math.max(20, height - pad.t - pad.b);
    const sx = (f) => pad.l + (clamp(f, 0, fMax) / fMax) * pw;

    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));

    // Beta Band (13–30 Hz)
    const bx0 = sx(13), bx1 = sx(30);
    svg.appendChild(svgEl("rect", { x: bx0, y: pad.t, width: bx1 - bx0, height: ph, fill: C.silverSoft }));
    svg.appendChild(svgEl("line", { x1: bx0, y1: pad.t, x2: bx1, y2: pad.t, stroke: C.black, "stroke-width": 3.2 }));
    svg.appendChild(svgEl("text", { x: (bx0 + bx1) / 2, y: pad.t + ph / 2, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 13, "font-weight": 700, fill: C.black, text: "β" }));
    svg.appendChild(svgEl("text", { x: (bx0 + bx1) / 2, y: pad.t - 5, "text-anchor": "middle", "font-size": 12.5, "font-weight": 600, fill: C.black, text: "13–30" }));

    // Neighbor normalization flanks around FTG
    const nL0 = sx(Math.max(32, ftg.lo - 4.5)), nL1 = sx(Math.max(32, ftg.lo - 1.0));
    const nR0 = sx(Math.min(118, ftg.hi + 1.0)), nR1 = sx(Math.min(118, ftg.hi + 4.5));
    svg.appendChild(svgEl("rect", { x: nL0, y: pad.t + ph * 0.22, width: Math.max(2, nL1 - nL0), height: ph * 0.78, fill: C.silver, opacity: 0.7 }));
    svg.appendChild(svgEl("rect", { x: nR0, y: pad.t + ph * 0.22, width: Math.max(2, nR1 - nR0), height: ph * 0.78, fill: C.silver, opacity: 0.7 }));

    // Dynamic FTG Band (f_stim/2 ± Δf) in Bold Crimson
    const fx0 = sx(ftg.lo), fx1 = sx(ftg.hi), fxc = sx(ftg.center);
    svg.appendChild(svgEl("rect", { x: fx0, y: pad.t, width: Math.max(6, fx1 - fx0), height: ph, fill: C.crimsonTint, stroke: C.crimson, "stroke-width": 1.5 }));
    svg.appendChild(svgEl("line", { x1: fx0, y1: pad.t, x2: fx1, y2: pad.t, stroke: C.crimson, "stroke-width": 3.4 }));
    svg.appendChild(svgEl("line", { x1: fxc, y1: pad.t, x2: fxc, y2: pad.t + ph, stroke: C.crimson, "stroke-width": 1.8, "stroke-dasharray": "4 2.5" }));
    svg.appendChild(svgEl("text", { x: fxc, y: pad.t - 5, "text-anchor": "middle", "font-size": 12.5, "font-weight": 700, fill: C.crimson, text: `${ftg.center} ± ${bw.toFixed(1)} Hz` }));
    svg.appendChild(svgEl("text", { x: fxc, y: pad.t + ph / 2, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 13, "font-weight": 700, fill: C.crimson, text: "FTG" }));

    // Available f_stim/2 markers
    for (const sr of getPayload().config?.stim_rates_available || []) {
      const half = sr / 2;
      svg.appendChild(svgEl("circle", { cx: sx(half), cy: pad.t + ph, r: 3.4, fill: Math.abs(half - ftg.center) < 0.2 ? C.crimson : C.gray }));
    }

    for (let f = 0; f <= fMax; f += 20) {
      svg.appendChild(svgEl("text", { x: sx(f), y: pad.t + ph + 14, "text-anchor": "middle", "font-size": 12.5, fill: C.grayDark, text: `${f}` }));
    }
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: pad.t + ph + 29, "text-anchor": "middle", "font-size": 12.5, "font-weight": 600, fill: C.black, text: `Frequency (Hz) · Active FTG [${fmtNum(ftg.lo, 1)}, ${fmtNum(ftg.hi, 1)}] Hz` }));
    return svg;
  }

  // ── 6 Dedicated Game-Theory Pure-Vector SVG Builders (>= 14px Nature Font) ──

  /** GT 1. Arms & Utility Arena — NeuroGame Lanes + SVG Patterns & Layered Boundary Contours */
  function buildGTArmsSVG(node, width, height) {
    const gt = computeGT();
    ensureBanditReady(gt);
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    if (!gt.arms.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "Select contacts on the DBS Lead Model to populate arms" }));
      return svg;
    }

    const pfx = `${node.id}-arena`;
    appendGTPatternDefs(svg, pfx);

    const lanes = Array.from(new Set(gt.arms.map((a) => `${a.pair} · ${Math.round(a.stim_hz)} Hz`)));
    const laneKey = (a) => `${a.pair} · ${Math.round(a.stim_hz)} Hz`;
    const laneSub = (lk) => {
      const a0 = gt.arms.find((a) => laneKey(a) === lk);
      return a0 && a0.beta_peak_hz ? ` · β ${a0.beta_peak_hz.toFixed(1)} Hz` : "";
    };
    const legendKeys = ["oracle", "minimax", "nash", "nbs", "stack", "robust", "bandit"];
    const twoRows = width < 680;
    const pad = { l: laneLabelColumn(lanes.map((lk) => [lk, laneSub(lk)]), width), r: 26, t: twoRows ? 64 : 46, b: 48 };
    const pw = Math.max(120, width - pad.l - pad.r);
    const ph = Math.max(90, height - pad.t - pad.b);
    const lh = ph / Math.max(1, lanes.length);
    const amax = Math.max(0.5, gt.amax || 1.0);
    const uAbsMax = Math.max(1.0, ...gt.arms.map((a) => Math.abs(a.U)));
    const xA = (a) => pad.l + 18 + (clamp(a, 0, amax) / amax) * Math.max(40, pw - 36);

    // Top Pattern + Layered Boundary Legend Swatches (wraps cleanly into 2 rows when narrow)
    const perRow = twoRows ? 4 : legendKeys.length;
    const slotW = (width - 24) / perRow;
    legendKeys.forEach((mk, mi) => {
      const row = Math.floor(mi / perRow);
      const col = mi % perRow;
      const lx = 14 + col * slotW;
      const ly = 10 + row * 24;
      drawMethodSwatch(svg, lx, ly, 22, 14, mk, pfx);
      svg.appendChild(
        svgEl("text", {
          x: lx + 28,
          y: ly + 12,
          "font-size": 14,
          "font-weight": 600,
          fill: GT_STYLES[mk].stroke,
          text: GT_STYLES[mk].label,
        })
      );
    });

    const b = state.bandit;
    const bLive = state.selection.gt_bandit_live || {};
    const selArms = state.selection.gt_selected_arms || [];

    // Draw each horizontal lane
    lanes.forEach((lk, li) => {
      const y0 = pad.t + li * lh;
      const yc = y0 + lh * 0.54;
      const laneArms = gt.arms.filter((a) => laneKey(a) === lk);
      const yU = (u) => yc - clamp(u / uAbsMax, -1.05, 1.05) * (lh * 0.30);

      // Lane background & separator
      svg.appendChild(svgEl("rect", { x: pad.l, y: y0, width: pw, height: lh, fill: li % 2 === 0 ? C.white : C.alabaster, stroke: C.silverSoft }));
      svg.appendChild(svgEl("line", { x1: pad.l, y1: yU(0), x2: pad.l + pw, y2: yU(0), stroke: C.silver, "stroke-dasharray": "4 4" }));

      // Lane left label + patient β peak — ONE row per stimulation lane
      svg.appendChild(laneLabel(svgEl, pad.l - 10, yc + 5, lk, laneSub(lk), pad.l - 16));

      // Continuous Stackelberg & Robust Stackelberg Vertical Boundary Lines + Robustness Hatch Strip
      const [pairStr, ratePart] = lk.split(" · ");
      const rateNum = parseFloat(ratePart);
      const st = (gt.stack || []).find((s) => s.pair === pairStr && Math.abs(s.stim_hz - rateNum) < 1.0);
      if (st && st.grid && st.grid.length > 1) {
        const dRib = st.grid.map((a, i) => `${i === 0 ? "M" : "L"} ${xA(a).toFixed(1)} ${yU(st.U[i]).toFixed(1)}`).join(" ");
        svg.appendChild(svgEl("path", { d: dRib, fill: "none", stroke: C.gray, "stroke-width": 1.9, opacity: 0.72 }));

        if (gt.sb && gt.sb.pair === pairStr && Math.abs(gt.sb.stim_hz - rateNum) < 1) {
          const xs = xA(gt.sb.aStar);
          const xr = gt.sr && gt.sr.pair === pairStr && Math.abs(gt.sr.stim_hz - rateNum) < 1 ? xA(gt.sr.aRobust) : xs;
          // Hatched interval between Robust Stackelberg and Standard Stackelberg
          if (Math.abs(xs - xr) > 2) {
            svg.appendChild(svgEl("rect", { x: Math.min(xs, xr), y: y0 + 2, width: Math.abs(xs - xr), height: lh - 4, fill: `url(#${pfx}-pat-robust)` }));
          }
          // Solid crimson vertical boundary line for Stackelberg a*
          svg.appendChild(svgEl("line", { x1: xs, y1: y0 + 2, x2: xs, y2: y0 + lh - 2, stroke: C.crimson, "stroke-width": 2.4 }));
          // Dotted cool-gray vertical boundary line for Robust Stackelberg a*_rob
          if (gt.sr && gt.sr.pair === pairStr && Math.abs(gt.sr.stim_hz - rateNum) < 1) {
            svg.appendChild(svgEl("line", { x1: xr, y1: y0 + 2, x2: xr, y2: y0 + lh - 2, stroke: C.grayDark, "stroke-width": 2.2, "stroke-dasharray": "3 3" }));
          }
        }
      }

      // Arm rounded-square tiles sized by √(n windows), with Pattern + Nested Layered Boundaries!
      laneArms.forEach((arm) => {
        const ax = xA(arm.amp);
        const ay = yU(arm.U);
        const sz = clamp(18 + 3.4 * Math.sqrt(arm.n), 20, Math.min(36, lh * 0.48));
        const uNorm = clamp((arm.U + uAbsMax) / (2 * uAbsMax), 0, 1);
        const isSel = selArms.includes(arm.arm_id);
        const isHov = state.hover.armId === arm.arm_id;
        const isLastPulled = b.pulls.length && b.pulls[b.pulls.length - 1].armIdx === arm.idx;

        // Collect all discrete solution concepts that pick this arm -> rendered as layered boundaries!
        const hitMethods = [];
        if (arm.idx === gt.bestIdx) hitMethods.push("oracle");
        if (arm.idx === gt.maximinIdx) hitMethods.push("minimax");
        if (arm.idx === gt.topNashIdx) hitMethods.push("nash");
        if (arm.idx === gt.nbsIdx) hitMethods.push("nbs");
        if (bLive.recommended_arm_id && bLive.recommended_arm_id === arm.arm_id) hitMethods.push("bandit");

        const gTile = svgEl("g", { style: "cursor:pointer" });
        const tx = ax - sz / 2, ty = ay - sz / 2;

        gTile.appendChild(
          svgEl("rect", {
            x: tx,
            y: ty,
            width: sz,
            height: sz,
            rx: 4,
            fill: specColor(uNorm * 0.94),
            stroke: isSel || isHov || isLastPulled ? C.crimson : C.silver,
            "stroke-width": isSel || isHov || isLastPulled ? 2.2 : 1.0,
          })
        );

        // Pattern overlay + nested layered boundary frames for all matching solution concepts
        drawLayeredBoundaries(gTile, tx, ty, sz, sz, 4, hitMethods, pfx);

        if (sz >= 22) {
          gTile.appendChild(
            svgEl("text", {
              x: ax,
              y: ay + 5,
              "text-anchor": "middle",
              "font-size": 14,
              "font-weight": 700,
              fill: uNorm > 0.54 ? C.white : C.black,
              text: arm.U.toFixed(0),
            })
          );
        }

        // Crimson pull-count dots stacked at bottom of lane
        const nPulls = b.n[arm.idx] || 0;
        for (let q = 0; q < Math.min(nPulls, 18); q++) {
          gTile.appendChild(
            svgEl("rect", {
              x: ax - 11 + (q % 6) * 4,
              y: y0 + lh - 8 - Math.floor(q / 6) * 4,
              width: 3,
              height: 3,
              fill: C.crimson,
            })
          );
        }

        gTile.addEventListener("mouseenter", () => setHover({ armId: arm.arm_id, pair: `${arm.hemisphere}:${arm.pair}`, ampMa: arm.amp }));
        gTile.addEventListener("mouseleave", () => setHover({ armId: null, pair: null, ampMa: null }));
        gTile.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectArm(arm); });
        gTile.addEventListener("contextmenu", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          openContextMenu(ev.clientX, ev.clientY, { kind: "arm", arm, nodeId: node.id });
        });
        svg.appendChild(gTile);
      });
    });

    // Bottom Amplitude Axis
    for (let k = 0; k <= 4; k++) {
      const av = (amax * k) / 4;
      svg.appendChild(svgEl("text", { x: xA(av), y: pad.t + ph + 22, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: av.toFixed(1) }));
    }
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: width < 580 ? "Amplitude a (mA) · Curve = U(a)" : "Amplitude a (mA) · Layered Boundaries = Solution Concepts · Curve = U(a)" }));
    return svg;
  }

  /** GT 2. Cooperative Nash Bargaining & Pareto Frontier (Layered Pareto Envelope + Double-Boundary NBS) */
  function buildGTNashSVG(node, width, height) {
    const gt = computeGT();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    if (!gt.arms.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No arms available" }));
      return svg;
    }

    const pfx = `${node.id}-nbs`;
    appendGTPatternDefs(svg, pfx);

    const pad = { l: 64, r: 24, t: 36, b: 48 };
    const pw = Math.max(80, width - pad.l - pad.r);
    const ph = Math.max(60, height - pad.t - pad.b);

    const u1s = gt.arms.map((a) => a.u1);
    const u2s = gt.arms.map((a) => a.u2);
    const xLo = Math.min(...u1s) - 0.8, xHi = Math.max(...u1s) + 0.8;
    const yLo = Math.min(...u2s) - 0.8, yHi = Math.max(...u2s) + 0.8;
    const sx = (v) => pad.l + ((v - xLo) / Math.max(1e-6, xHi - xLo)) * pw;
    const sy = (v) => pad.t + ph - ((v - yLo) / Math.max(1e-6, yHi - yLo)) * ph;

    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));

    // Disagreement point reference lines
    const dx = sx(gt.d1), dy = sy(gt.d2);
    svg.appendChild(svgEl("line", { x1: dx, y1: pad.t, x2: dx, y2: pad.t + ph, stroke: C.silver, "stroke-dasharray": "4 4" }));
    svg.appendChild(svgEl("line", { x1: pad.l, y1: dy, x2: pad.l + pw, y2: dy, stroke: C.silver, "stroke-dasharray": "4 4" }));

    // Nash-product iso-hyperbola through NBS
    const nbs = gt.arms[gt.nbsIdx];
    const prodStar = nbs.nashProd;
    if (prodStar > 1e-4) {
      const isoPts = [];
      for (let i = 1; i <= 40; i++) {
        const u1 = gt.d1 + ((xHi - gt.d1) * i) / 40;
        const u2 = gt.d2 + prodStar / Math.max(1e-4, u1 - gt.d1);
        if (u2 >= yLo && u2 <= yHi) isoPts.push(`${isoPts.length === 0 ? "M" : "L"} ${sx(u1).toFixed(1)} ${sy(u2).toFixed(1)}`);
      }
      if (isoPts.length > 1) {
        svg.appendChild(svgEl("path", { d: isoPts.join(" "), fill: "none", stroke: C.crimson, "stroke-width": 1.6, "stroke-dasharray": "6 4", opacity: 0.78 }));
      }
    }

    // Layered Pareto Frontier Envelope (soft silver outer boundary + crisp ink dashed boundary)
    const pArms = gt.arms.filter((a) => a.pareto).sort((a, b) => a.u1 - b.u1);
    if (pArms.length > 1) {
      const pd = pArms.map((a, i) => `${i === 0 ? "M" : "L"} ${sx(a.u1).toFixed(1)} ${sy(a.u2).toFixed(1)}`).join(" ");
      svg.appendChild(svgEl("path", { d: pd, fill: "none", stroke: C.silver, "stroke-width": 8, "stroke-linecap": "round", opacity: 0.55 }));
      svg.appendChild(svgEl("path", { d: pd, fill: "none", stroke: C.black, "stroke-width": 2.2, "stroke-dasharray": "7 4" }));
    }

    // Scatter points with NBS Pattern + Double Concentric Layered Crimson Boundary Rings
    const pairsUniq = Array.from(new Set(gt.arms.map((a) => a.pair)));
    gt.arms.forEach((a, i) => {
      const px = sx(a.u1), py = sy(a.u2);
      const r = clamp(5 + Math.sqrt(a.n) * 0.85, 5.5, 11);
      const isNbs = i === gt.nbsIdx;
      const isHov = state.hover.armId === a.arm_id;
      const isSecondPair = pairsUniq.indexOf(a.pair) % 2 === 1;

      const g = svgEl("g", { style: "cursor:pointer" });
      if (isNbs) {
        // Double layered crimson boundary rings + reverse-diagonal NBS pattern fill
        g.appendChild(svgEl("circle", { cx: px, cy: py, r: r + 10, fill: "none", stroke: C.crimson, "stroke-width": 1.6 }));
        g.appendChild(svgEl("circle", { cx: px, cy: py, r: r + 6, fill: `url(#${pfx}-pat-nbs)`, stroke: C.crimson, "stroke-width": 2.4 }));
      }
      if (isSecondPair) {
        g.appendChild(svgEl("rect", { x: px - r, y: py - r, width: r * 2, height: r * 2, rx: 2, fill: isNbs || isHov ? C.crimson : a.pareto ? C.black : C.grayLight, stroke: C.white, "stroke-width": 1.3 }));
      } else {
        g.appendChild(svgEl("circle", { cx: px, cy: py, r, fill: isNbs || isHov ? C.crimson : a.pareto ? C.black : C.grayLight, stroke: C.white, "stroke-width": 1.3 }));
      }
      if (a.pareto || isNbs || isHov) {
        const flipR = px > pad.l + pw * 0.64;
        const ly = clamp(py + 5, pad.t + 16, pad.t + ph - 6);
        g.appendChild(svgEl("text", { x: flipR ? px - r - 12 : px + r + 12, y: ly, "text-anchor": flipR ? "end" : "start", "font-size": 14, "font-weight": isNbs ? 700 : 600, fill: isNbs ? C.crimson : C.black, text: `${a.pair}@${a.amp}` }));
      }
      g.addEventListener("mouseenter", () => setHover({ armId: a.arm_id, pair: `${a.hemisphere}:${a.pair}`, ampMa: a.amp }));
      g.addEventListener("mouseleave", () => setHover({ armId: null, pair: null, ampMa: null }));
      g.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectArm(a); });
      svg.appendChild(g);
    });

    // Header with NBS swatch
    drawMethodSwatch(svg, pad.l, 8, 22, 14, "nbs", pfx);
    svg.appendChild(svgEl("text", { x: pad.l + 30, y: 20, "font-size": 14, "font-weight": 700, fill: C.crimson, text: `NBS: ${nbs.label} (prod ${nbs.nashProd.toFixed(1)})` }));
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: yHi.toFixed(1) }));
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: yLo.toFixed(1) }));
    svg.appendChild(svgEl("text", { x: pad.l, y: pad.t + ph + 20, "font-size": 14, fill: C.grayDark, text: xLo.toFixed(1) }));
    svg.appendChild(svgEl("text", { x: pad.l + pw, y: pad.t + ph + 20, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: xHi.toFixed(1) }));
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: "Efficacy u₁ = Δβ (dB)  vs.  Safety u₂ (dB-eq)" }));
    return svg;
  }

  /** GT 3. Minimax & Mixed Zero-Sum Nash Equilibrium (Long-Dash Maximin Boundary + Diagonal Nash Hatch) */
  function buildGTMinimaxSVG(node, width, height) {
    const gt = computeGT();
    const mode = node.mode || "matrix"; // "matrix" | "convergence"
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    if (!gt.arms.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No arms available" }));
      return svg;
    }

    const pfx = `${node.id}-minimax`;
    appendGTPatternDefs(svg, pfx);

    if (mode === "convergence") {
      const pad = { l: 58, r: 24, t: 34, b: 44 };
      const pw = Math.max(80, width - pad.l - pad.r);
      const ph = Math.max(60, height - pad.t - pad.b);
      const lo = gt.loHist || [], hi = gt.hiHist || [];
      const all = [...lo, ...hi];
      const yLo = Math.min(...all) - 0.5, yHi = Math.max(...all) + 0.5;
      const sx = (i) => pad.l + (i / Math.max(1, lo.length - 1)) * pw;
      const sy = (v) => pad.t + ph - ((v - yLo) / Math.max(1e-6, yHi - yLo)) * ph;

      svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));
      // Hatched convergence envelope between lower and upper bounds
      if (lo.length > 1) {
        const envPts = [];
        hi.forEach((v, i) => envPts.push(`${sx(i).toFixed(1)},${sy(v).toFixed(1)}`));
        for (let i = lo.length - 1; i >= 0; i--) envPts.push(`${sx(i).toFixed(1)},${sy(lo[i]).toFixed(1)}`);
        svg.appendChild(svgEl("polygon", { points: envPts.join(" "), fill: `url(#${pfx}-pat-nash)` }));
      }
      const dLo = lo.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
      const dHi = hi.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
      svg.appendChild(svgEl("path", { d: dLo, fill: "none", stroke: C.black, "stroke-width": 2.4 }));
      svg.appendChild(svgEl("path", { d: dHi, fill: "none", stroke: C.crimson, "stroke-width": 2.4 }));
      svg.appendChild(svgEl("line", { x1: pad.l, y1: sy(gt.gameVal), x2: pad.l + pw, y2: sy(gt.gameVal), stroke: C.gray, "stroke-dasharray": "8 3 2 3", "stroke-width": 1.6 }));
      svg.appendChild(svgEl("text", { x: pad.l, y: 20, "font-size": 14, "font-weight": 700, fill: C.crimson, text: `MWU Equilibrium Value v* = ${gt.gameVal.toFixed(2)} dB-eq` }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: yHi.toFixed(1) }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: yLo.toFixed(1) }));
      svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: "MWU Iterations (Lower Bound black · Upper Bound crimson)" }));
      return svg;
    }

    // Payoff Matrix (Top 8 arms) × 4 Nature Scenarios + Patterned x* Mix Bars
    const rankedIdx = gt.arms
      .map((a, i) => ({ i, score: Math.min(...gt.A[i]) + (gt.xStar[i] || 0) * 10 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((o) => o.i);

    const pad = { l: 146, r: 108, t: 54, b: 30 };
    const pw = Math.max(120, width - pad.l - pad.r);
    const ph = Math.max(90, height - pad.t - pad.b);
    const nR = rankedIdx.length, nC = gt.scenNames.length;
    const cellW = pw / nC;
    const cellH = ph / nR;

    const flat = rankedIdx.flatMap((i) => gt.A[i]);
    const vmin = Math.min(...flat), vmax = Math.max(...flat);
    const vspan = Math.max(0.5, vmax - vmin);

    drawMethodSwatch(svg, 10, 7, 22, 14, "minimax", pfx);
    svg.appendChild(svgEl("text", { x: 38, y: 20, "font-size": 14, "font-weight": 700, fill: C.black, text: `Maximin: ${gt.arms[gt.maximinIdx].short_label}` }));
    const vStarX = Math.max(width - 118, width * 0.58);
    drawMethodSwatch(svg, vStarX, 7, 22, 14, "nash", pfx);
    svg.appendChild(svgEl("text", { x: vStarX + 28, y: 20, "font-size": 14, "font-weight": 700, fill: C.crimson, text: `v* = ${gt.gameVal.toFixed(2)}` }));

    const shortScen = ["Efficacy", "Dyskinesia", "Battery", "Balanced"];
    gt.scenNames.forEach((sn, j) => {
      const cx = pad.l + (j + 0.5) * cellW;
      const pct = Math.round((gt.yStar[j] || 0) * 100);
      const full = shortScen[j] || sn;
      const hdr = fitText([`${full} ${pct}%`, `${full.slice(0, 4)}. ${pct}%`, `${full.slice(0, 3)} ${pct}%`, `${pct}%`], cellW - 6, 14, pct > 10 ? 700 : 600);
      const hEl = svgEl("text", { x: cx, y: 44, "text-anchor": "middle", "font-size": 14, "font-weight": pct > 10 ? 700 : 600, fill: pct > 10 ? C.crimson : C.black, text: hdr });
      hEl.appendChild(svgEl("title", { text: `${full}: Nature mix ${pct}%` }));
      svg.appendChild(hEl);
    });
    svg.appendChild(svgEl("text", { x: pad.l + pw + 10, y: 44, "font-size": 14, "font-weight": 700, fill: C.black, text: "Mix x*" }));

    rankedIdx.forEach((armIdx, r) => {
      const arm = gt.arms[armIdx];
      const y = pad.t + r * cellH;
      const isMaxi = armIdx === gt.maximinIdx;
      const isNashTop = armIdx === gt.topNashIdx;
      const isHov = state.hover.armId === arm.arm_id;

      const gRow = svgEl("g", { style: "cursor:pointer" });
      gRow.appendChild(svgEl("text", { x: pad.l - 10, y: y + cellH * 0.65, "text-anchor": "end", "font-size": 14, "font-weight": isMaxi || isNashTop || isHov ? 700 : 500, fill: isNashTop || isHov ? C.crimson : C.black, text: arm.short_label }));

      for (let j = 0; j < nC; j++) {
        const val = gt.A[armIdx][j];
        const u = (val - vmin) / vspan;
        gRow.appendChild(svgEl("rect", { x: pad.l + j * cellW + 1.5, y: y + 1.5, width: cellW - 3, height: cellH - 3, rx: 2, fill: specColor(u * 0.90), stroke: isHov ? C.crimson : C.silver }));
        gRow.appendChild(svgEl("text", { x: pad.l + (j + 0.5) * cellW, y: y + cellH * 0.66, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: u > 0.55 ? C.white : C.black, text: val.toFixed(1) }));
      }

      // Layered Boundary Frame on Pure Maximin & Mixed Nash rows!
      if (isMaxi) {
        gRow.appendChild(svgEl("rect", { x: pad.l, y: y + 0.5, width: pw, height: cellH - 1, rx: 3, fill: "none", stroke: C.grayDark, "stroke-width": 2.4, "stroke-dasharray": "9 4" }));
      }
      if (isNashTop) {
        gRow.appendChild(svgEl("rect", { x: pad.l - 2.5, y: y - 1.5, width: pw + 5, height: cellH + 3, rx: 4, fill: "none", stroke: C.black, "stroke-width": 2.0, "stroke-dasharray": "8 3 2 3" }));
      }

      // Clinician mix x* bar with diagonal Nash hatch pattern
      const pMix = gt.xStar[armIdx] || 0;
      const barW = Math.max(2, pMix * 46);
      gRow.appendChild(svgEl("rect", { x: pad.l + pw + 8, y: y + cellH * 0.22, width: barW, height: cellH * 0.56, rx: 2, fill: pMix > 0.05 ? C.crimsonTint : C.alabaster }));
      gRow.appendChild(svgEl("rect", { x: pad.l + pw + 8, y: y + cellH * 0.22, width: barW, height: cellH * 0.56, rx: 2, fill: `url(#${pfx}-pat-nash)`, stroke: pMix > 0.05 ? C.black : C.silver, "stroke-width": pMix > 0.05 ? 1.5 : 0.8 }));
      gRow.appendChild(svgEl("text", { x: pad.l + pw + 58, y: y + cellH * 0.66, "font-size": 14, "font-weight": 700, fill: pMix > 0.05 ? C.crimson : C.gray, text: `${Math.round(pMix * 100)}%` }));

      gRow.addEventListener("mouseenter", () => setHover({ armId: arm.arm_id, pair: `${arm.hemisphere}:${arm.pair}`, ampMa: arm.amp }));
      gRow.addEventListener("mouseleave", () => setHover({ armId: null, pair: null, ampMa: null }));
      gRow.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectArm(arm); });
      svg.appendChild(gRow);
    });
    return svg;
  }

  /** GT 4. Stackelberg Leader–Follower (Full-Height Vertical Boundary Lines + Stipple Robustness Zone) */
  function buildGTStackelbergSVG(node, width, height) {
    const gt = computeGT();
    const mode = node.mode || "leader"; // "leader" | "follower"
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    if (!gt.stack.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "Requires ≥ 2 amplitudes for Stackelberg curve fit" }));
      return svg;
    }

    const pfx = `${node.id}-stack`;
    appendGTPatternDefs(svg, pfx);

    const pad = { l: 58, r: 24, t: 38, b: 46 };
    const pw = Math.max(80, width - pad.l - pad.r);
    const ph = Math.max(60, height - pad.t - pad.b);
    const aMax = Math.max(0.5, ...gt.stack.map((s) => s.amax_series || 1));
    const sx = (a) => pad.l + (a / aMax) * pw;

    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));

    if (mode === "follower") {
      const s = gt.sb || gt.stack[0];
      const allY = [...s.beta_lo, ...s.beta_hi, ...s.ftg_lo, ...s.ftg_hi, getGTParams().tau];
      const yLo = Math.min(...allY) - 1, yHi = Math.max(...allY) + 1;
      const sy = (v) => pad.t + ph - ((v - yLo) / Math.max(1e-6, yHi - yLo)) * ph;

      const bandPoly = (lo, hi) => {
        const pts = [];
        s.grid.forEach((a, i) => pts.push(`${sx(a).toFixed(1)},${sy(hi[i]).toFixed(1)}`));
        for (let i = s.grid.length - 1; i >= 0; i--) pts.push(`${sx(s.grid[i]).toFixed(1)},${sy(lo[i]).toFixed(1)}`);
        return pts.join(" ");
      };

      svg.appendChild(svgEl("polygon", { points: bandPoly(s.beta_lo, s.beta_hi), fill: `url(#${pfx}-pat-oracle)` }));
      svg.appendChild(svgEl("polygon", { points: bandPoly(s.ftg_lo, s.ftg_hi), fill: `url(#${pfx}-pat-nbs)` }));
      svg.appendChild(svgEl("path", { d: s.grid.map((a, i) => `${i === 0 ? "M" : "L"} ${sx(a).toFixed(1)} ${sy(s.beta[i]).toFixed(1)}`).join(" "), fill: "none", stroke: C.black, "stroke-width": 2.4 }));
      svg.appendChild(svgEl("path", { d: s.grid.map((a, i) => `${i === 0 ? "M" : "L"} ${sx(a).toFixed(1)} ${sy(s.ftg[i]).toFixed(1)}`).join(" "), fill: "none", stroke: C.crimson, "stroke-width": 2.4 }));

      const tau = getGTParams().tau;
      svg.appendChild(svgEl("line", { x1: pad.l, y1: sy(tau), x2: pad.l + pw, y2: sy(tau), stroke: C.crimson, "stroke-dasharray": "5 4", "stroke-width": 1.5 }));
      svg.appendChild(svgEl("text", { x: pad.l + pw - 6, y: sy(tau) - 5, "text-anchor": "end", "font-size": 14, "font-weight": 700, fill: C.crimson, text: `τ = ${tau.toFixed(1)} dB` }));

      svg.appendChild(svgEl("text", { x: pad.l, y: 20, "font-size": 14, "font-weight": 700, fill: C.black, text: width < 520 ? `${s.pair}: Δβ (black) & FTG (crimson)` : `Follower (${s.pair} · ${Math.round(s.stim_hz)}Hz): Δβ (black) & FTG (crimson)` }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: yHi.toFixed(1) }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: yLo.toFixed(1) }));
    } else {
      const topSeries = [...gt.stack].sort((a, b) => b.UStar - a.UStar).slice(0, 3);
      const allY = topSeries.flatMap((s) => [...s.U, ...s.Ur]);
      const yLo = Math.min(...allY) - 1, yHi = Math.max(...allY) + 1;
      const sy = (v) => pad.t + ph - ((v - yLo) / Math.max(1e-6, yHi - yLo)) * ph;
      const colors = [C.crimson, C.black, C.gray];

      // Stipple-hatched robustness margin zone + full-height layered vertical boundary lines for top series
      const sb = topSeries[0];
      const xS = sx(sb.aStar), xR = sx(sb.aRobust);
      if (Math.abs(xS - xR) > 2) {
        svg.appendChild(svgEl("rect", { x: Math.min(xS, xR), y: pad.t, width: Math.abs(xS - xR), height: ph, fill: `url(#${pfx}-pat-robust)` }));
      }
      svg.appendChild(svgEl("line", { x1: xS, y1: pad.t, x2: xS, y2: pad.t + ph, stroke: C.crimson, "stroke-width": 2.5 }));
      svg.appendChild(svgEl("line", { x1: xR, y1: pad.t, x2: xR, y2: pad.t + ph, stroke: C.grayDark, "stroke-width": 2.2, "stroke-dasharray": "3 3" }));

      topSeries.forEach((s, idx) => {
        const col = colors[idx % colors.length];
        const dU = s.grid.map((a, i) => `${i === 0 ? "M" : "L"} ${sx(a).toFixed(1)} ${sy(s.U[i]).toFixed(1)}`).join(" ");
        const dUr = s.grid.map((a, i) => `${i === 0 ? "M" : "L"} ${sx(a).toFixed(1)} ${sy(s.Ur[i]).toFixed(1)}`).join(" ");
        svg.appendChild(svgEl("path", { d: dU, fill: "none", stroke: col, "stroke-width": idx === 0 ? 2.6 : 1.8 }));
        svg.appendChild(svgEl("path", { d: dUr, fill: "none", stroke: col, "stroke-width": 1.6, "stroke-dasharray": "3 3", opacity: 0.85 }));
      });

      drawMethodSwatch(svg, pad.l, 8, 22, 14, "stack", pfx);
      svg.appendChild(svgEl("text", { x: pad.l + 28, y: 20, "font-size": 14, "font-weight": 700, fill: C.crimson, text: `a* = ${sb.aStar.toFixed(2)} mA` }));
      const robX = Math.max(pad.l + 148, width * 0.44);
      drawMethodSwatch(svg, robX, 8, 22, 14, "robust", pfx);
      svg.appendChild(svgEl("text", { x: robX + 28, y: 20, "font-size": 14, "font-weight": 700, fill: C.grayDark, text: width < 520 ? `a*_rob = ${sb.aRobust.toFixed(2)} mA` : `a*_rob = ${sb.aRobust.toFixed(2)} mA (${sb.pair})` }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: yHi.toFixed(1) }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: yLo.toFixed(1) }));
    }

    for (let k = 0; k <= 4; k++) {
      const av = (aMax * k) / 4;
      svg.appendChild(svgEl("text", { x: sx(av), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: av.toFixed(1) }));
    }
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: width < 560 ? "Amplitude a (mA) · solid = a*, dotted = a*_rob" : "Leader Commitment a (mA) · Vertical Lines = a* (solid) & a*_rob (dotted)" }));
    return svg;
  }

  /** GT 5. Live Multi-Armed Bandit — NeuroGame Style + Layered Oracle/Bandit Boundaries */
  function buildGTBanditSVG(node, width, height) {
    const gt = computeGT();
    ensureBanditReady(gt);
    const b = state.bandit;
    const gp = getGTParams();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    if (!gt.arms.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "Select contacts on the DBS Lead to run Bandit" }));
      return svg;
    }

    const pfx = `${node.id}-bandit`;
    appendGTPatternDefs(svg, pfx);

    const footerH = 44;
    const mainH = Math.max(120, height - footerH - 36);
    const splitX = Math.round(width * 0.58);
    const topY = 30;

    // ── Left Panel: NeuroGame `drawBandit` (Horizontal Bars ± 95% CI vs Hollow ○ Truth + Patterned Boundaries) ──
    const topArms = gt.arms
      .map((a, i) => ({ a, i, pulls: b.n[i] || 0 }))
      .sort((x, y) => (y.i === gt.bestIdx ? 1 : 0) - (x.i === gt.bestIdx ? 1 : 0) || (y.pulls - x.pulls) || (y.a.U - x.a.U))
      .slice(0, 10);

    const bL = 114, bR = 46;
    const bW = Math.max(80, splitX - bL - bR);
    const uAll = topArms.flatMap((o) => [0, o.a.U, o.pulls > 0 ? b.sumU[o.i] / o.pulls : o.a.U]);
    const uLo = Math.min(-2, ...uAll) - 1.5;
    const uHi = Math.max(2, ...uAll) + 2.0;
    const xU = (v) => bL + clamp((v - uLo) / Math.max(1e-6, uHi - uLo), 0, 1) * bW;
    const rH = mainH / Math.max(1, topArms.length);
    const sig = Math.max(0.5, Math.sqrt(gt.arms.reduce((s, a) => s + a.U_sd * a.U_sd, 0) / gt.arms.length));

    svg.appendChild(svgEl("text", { x: 10, y: 20, "font-size": 14, "font-weight": 700, fill: C.black, text: splitX < 340 ? `Bandit ±95% CI (${b.pulls.length}/${gp.budget || 60})` : `Bandit: est ± 95% CI vs. ○ truth (${b.pulls.length}/${gp.budget || 60})` }));
    svg.appendChild(svgEl("rect", { x: bL, y: topY, width: bW, height: mainH, fill: C.white, stroke: C.silver }));
    svg.appendChild(svgEl("line", { x1: xU(0), y1: topY, x2: xU(0), y2: topY + mainH, stroke: C.grayDark, "stroke-width": 1.3 }));

    const bRecId = state.selection.gt_bandit_live?.recommended_arm_id;

    topArms.forEach((o, k) => {
      const cy = topY + (k + 0.5) * rH;
      const isOracle = o.i === gt.bestIdx;
      const isPick = bRecId && o.a.arm_id === bRecId;
      const isLast = b.pulls.length && b.pulls[b.pulls.length - 1].armIdx === o.i;
      const isHov = state.hover.armId === o.a.arm_id;

      const gRow = svgEl("g", { style: "cursor:pointer" });

      // Layered row boundary for Oracle (solid black) and Bandit Pick (dashed crimson)
      if (isOracle) {
        gRow.appendChild(svgEl("rect", { x: bL + 1, y: cy - rH * 0.44, width: bW - 2, height: rH * 0.88, fill: `url(#${pfx}-pat-oracle)`, stroke: C.black, "stroke-width": 1.8 }));
      }
      if (isPick) {
        gRow.appendChild(svgEl("rect", { x: bL - 1, y: cy - rH * 0.46, width: bW + 2, height: rH * 0.92, fill: "none", stroke: C.crimson, "stroke-width": 2.2, "stroke-dasharray": "6 3" }));
      }

      gRow.appendChild(
        svgEl("text", {
          x: bL - 8,
          y: cy + 5,
          "text-anchor": "end",
          "font-size": 14,
          "font-weight": isOracle || isPick || isLast ? 700 : 500,
          fill: isPick || isLast ? C.crimson : isOracle ? C.black : C.grayDark,
          text: o.a.short_label,
        })
      );

      if (o.pulls > 0) {
        const est = b.sumU[o.i] / o.pulls;
        const ci = (1.96 * sig) / Math.sqrt(o.pulls);
        const x0 = xU(0), xm = xU(est);
        gRow.appendChild(
          svgEl("rect", {
            x: Math.min(x0, xm),
            y: cy - rH * 0.28,
            width: Math.max(2, Math.abs(xm - x0)),
            height: rH * 0.56,
            rx: 2,
            fill: isLast || isPick || isHov ? `url(#${pfx}-pat-bandit)` : C.silver,
            stroke: isLast || isPick || isHov ? C.crimson : C.black,
            "stroke-width": 1.3,
          })
        );
        // 95% CI whisker with end caps
        const xl = xU(est - ci), xr = xU(est + ci);
        gRow.appendChild(svgEl("line", { x1: xl, y1: cy, x2: xr, y2: cy, stroke: isLast || isPick ? C.crimson : C.black, "stroke-width": 1.8 }));
        gRow.appendChild(svgEl("line", { x1: xl, y1: cy - 4, x2: xl, y2: cy + 4, stroke: isLast || isPick ? C.crimson : C.black, "stroke-width": 1.6 }));
        gRow.appendChild(svgEl("line", { x1: xr, y1: cy - 4, x2: xr, y2: cy + 4, stroke: isLast || isPick ? C.crimson : C.black, "stroke-width": 1.6 }));
      }

      // Hollow truth circle ○
      gRow.appendChild(svgEl("circle", { cx: xU(o.a.U), cy, r: 4.5, fill: C.white, stroke: isLast || isPick ? C.crimson : C.black, "stroke-width": 1.9 }));
      // Pull count n<k> on right margin
      gRow.appendChild(svgEl("text", { x: bL + bW + 6, y: cy + 5, "font-size": 14, "font-weight": 600, fill: o.pulls > 0 ? C.crimson : C.grayLight, text: o.pulls ? `n${o.pulls}` : "" }));

      gRow.addEventListener("mouseenter", () => setHover({ armId: o.a.arm_id, pair: `${o.a.hemisphere}:${o.a.pair}`, ampMa: o.a.amp }));
      gRow.addEventListener("mouseleave", () => setHover({ armId: null, pair: null, ampMa: null }));
      gRow.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectArm(o.a); });
      svg.appendChild(gRow);
    });

    // ── Right Panel: NeuroGame `drawRegret` ──
    const rL = splitX + 42, rR = 16;
    const rW = Math.max(80, width - rL - rR);
    svg.appendChild(svgEl("text", { x: rL, y: 20, "font-size": 14, "font-weight": 700, fill: C.crimson, text: `Regret(T) vs. Exhaustive` }));
    svg.appendChild(svgEl("rect", { x: rL, y: topY, width: rW, height: mainH, fill: C.white, stroke: C.silver }));

    const bud = Math.max(10, gp.budget || 60);
    const bestMu = gt.arms[gt.bestIdx].U;
    const meanGap = gt.arms.reduce((s, a) => s + Math.max(0, bestMu - a.U), 0) / gt.arms.length;
    const rMax = Math.max(5, meanGap * bud, ...(b.cumRegret.length ? b.cumRegret : [1])) * 1.08;
    const sxR = (t) => rL + (clamp(t, 0, bud) / bud) * rW;
    const syR = (v) => topY + mainH - (clamp(v, 0, rMax) / rMax) * mainH;

    svg.appendChild(svgEl("line", { x1: sxR(0), y1: syR(0), x2: sxR(bud), y2: syR(meanGap * bud), stroke: C.gray, "stroke-width": 1.8, "stroke-dasharray": "5 4" }));
    if (b.cumRegret.length > 0) {
      const dReg = `M ${sxR(0).toFixed(1)} ${syR(0).toFixed(1)} ` + b.cumRegret.map((v, i) => `L ${sxR(i + 1).toFixed(1)} ${syR(v).toFixed(1)}`).join(" ");
      svg.appendChild(svgEl("path", { d: dReg, fill: "none", stroke: C.crimson, "stroke-width": 2.6 }));
      b.pulls.forEach((p, i) => {
        svg.appendChild(svgEl("line", { x1: sxR(i + 1), y1: topY + mainH - 7, x2: sxR(i + 1), y2: topY + mainH, stroke: p.armIdx === gt.bestIdx ? C.crimson : C.black, "stroke-width": 1.4 }));
      });
    } else {
      svg.appendChild(svgEl("text", { x: rL + rW / 2, y: topY + mainH / 2 + 5, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "Press ▶ Run" }));
    }
    svg.appendChild(svgEl("text", { x: rL - 6, y: topY + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: rMax.toFixed(0) }));
    svg.appendChild(svgEl("text", { x: rL - 6, y: topY + mainH, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: "0" }));
    svg.appendChild(svgEl("text", { x: rL + 8, y: topY + 18, "font-size": 14, "font-weight": 700, fill: C.crimson, text: `${gp.algo}: ${(b.cumRegret[b.cumRegret.length - 1] || 0).toFixed(1)}` }));

    // ── Bottom Strip: Last-Pull Real 2-s Window Reward Breakdown ──
    const footY = topY + mainH + 12;
    svg.appendChild(svgEl("rect", { x: 10, y: footY, width: width - 20, height: 34, rx: 4, fill: C.alabaster, stroke: C.silver }));
    if (b.pulls.length > 0) {
      const lp = b.pulls[b.pulls.length - 1];
      const lArm = gt.arms[lp.armIdx];
      const termB = gp.wb * lp.beta_supp;
      const termF = -gp.wf * Math.max(0, lp.ftg_db - gp.tau);
      const termE = -gp.we * 6.0 * ((lArm.amp / Math.max(gt.amax, 0.1)) ** 2);
      svg.appendChild(
        svgEl("text", {
          x: 20,
          y: footY + 22,
          "font-size": 14,
          "font-weight": 700,
          fill: C.black,
          text: width < 600
            ? `${lArm.short_label}: Δβ ${termB >= 0 ? "+" : ""}${termB.toFixed(1)} · FTG ${termF.toFixed(1)} · E ${termE.toFixed(1)} ⇒ U=${lp.u.toFixed(2)}`
            : `Last Pull (${lArm.short_label}): Δβ ${termB >= 0 ? "+" : ""}${termB.toFixed(2)} · FTG ${termF.toFixed(2)} · E ${termE.toFixed(2)} ⇒ U = ${lp.u.toFixed(2)} dB-eq`,
        })
      );
    } else {
      svg.appendChild(svgEl("text", { x: 20, y: footY + 22, "font-size": 14, fill: C.grayDark, text: width < 580 ? "Press ▶ Run or +1 Pull to sample a 2-s LFP window" : "Last Pull Breakdown: press ▶ Run or +1 Pull to sample a real 2-s LFP window" }));
    }
    return svg;
  }

  /** GT 6. 7-Method Game-Theory Consensus Board (Unified Pattern & Layered-Boundary Swatch Key) */
  function buildGTConsensusSVG(node, width, height) {
    const gt = computeGT();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    if (!gt.arms.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No arms available" }));
      return svg;
    }

    const pfx = `${node.id}-cons`;
    appendGTPatternDefs(svg, pfx);

    const bLive = state.selection.gt_bandit_live || {};
    const rows = [
      { key: "oracle",  m: "Mean Utility Oracle", arm: gt.arms[gt.bestIdx], u: gt.arms[gt.bestIdx].U.toFixed(2) },
      { key: "minimax", m: "Pure Minimax", arm: gt.arms[gt.maximinIdx], u: Math.min(...gt.A[gt.maximinIdx]).toFixed(2) },
      { key: "nash",    m: "Zero-Sum Nash (Mix)", arm: gt.arms[gt.topNashIdx], u: gt.gameVal.toFixed(2) },
      { key: "nbs",     m: "Nash Bargaining", arm: gt.arms[gt.nbsIdx], u: gt.arms[gt.nbsIdx].U.toFixed(2) },
      { key: "stack",   m: "Stackelberg (Curve)", arm: gt.sbArm, label: gt.sb ? `${gt.sb.pair}·${Math.round(gt.sb.stim_hz)}Hz @ ${gt.sb.aStar.toFixed(2)}mA` : "—", u: gt.sb ? gt.sb.UStar.toFixed(2) : "—" },
      { key: "robust",  m: "Robust Stackelberg", arm: gt.srArm, label: gt.sr ? `${gt.sr.pair}·${Math.round(gt.sr.stim_hz)}Hz @ ${gt.sr.aRobust.toFixed(2)}mA` : "—", u: gt.sr ? gt.sr.URobust.toFixed(2) : "—" },
      { key: "bandit",  m: `Bandit (${getGTParams().algo})`, arm: gt.arms.find((a) => a.arm_id === bLive.recommended_arm_id) || null, label: bLive.recommended_label || "Run Bandit node", u: bLive.recommended_U !== undefined ? String(bLive.recommended_U) : "—" },
    ];

    const votes = {};
    let totalVotes = 0;
    for (const r of rows) {
      if (r.arm) {
        votes[r.arm.label] = (votes[r.arm.label] || 0) + 1;
        totalVotes += 1;
      }
    }
    let majLabel = "—", majCnt = 0;
    for (const [k, v] of Object.entries(votes)) if (v > majCnt) { majCnt = v; majLabel = k; }

    // Majority Winner Banner with double layered boundary
    svg.appendChild(svgEl("rect", { x: 10, y: 8, width: width - 20, height: 42, rx: 5, fill: C.crimsonTint, stroke: C.crimson, "stroke-width": 2.0 }));
    svg.appendChild(svgEl("rect", { x: 14, y: 12, width: width - 28, height: 34, rx: 3, fill: "none", stroke: C.crimson, "stroke-width": 1.0, "stroke-dasharray": "6 3" }));
    svg.appendChild(svgEl("text", { x: 24, y: 34, "font-size": 15, "font-weight": 700, fill: C.crimson, text: `Majority Consensus (${majCnt}/${totalVotes}): ${majLabel}` }));

    const startY = 64;
    const rowH = Math.max(32, (height - startY - 12) / rows.length);
    rows.forEach((r, idx) => {
      const y = startY + idx * rowH;
      const isMaj = r.arm && r.arm.label === majLabel;
      const isHov = r.arm && state.hover.armId === r.arm.arm_id;

      const g = svgEl("g", { style: r.arm ? "cursor:pointer" : "default" });
      g.appendChild(svgEl("rect", { x: 10, y, width: width - 20, height: rowH - 4, rx: 3, fill: isHov ? C.crimsonTint : idx % 2 === 0 ? C.alabaster : C.white, stroke: isHov ? C.crimson : C.silverSoft }));
      // Pattern + Layered Boundary Swatch on Left
      drawMethodSwatch(g, 20, y + (rowH - 20) / 2, 28, 16, r.key, pfx);
      g.appendChild(svgEl("text", { x: 56, y: y + rowH * 0.64, "font-size": 14, "font-weight": 600, fill: C.black, text: r.m }));
      g.appendChild(svgEl("text", { x: Math.max(210, width * 0.48), y: y + rowH * 0.64, "font-size": 14, "font-weight": isMaj ? 700 : 500, fill: isMaj ? C.crimson : C.grayDark, text: r.label || (r.arm ? r.arm.label : "—") }));
      g.appendChild(svgEl("text", { x: width - 20, y: y + rowH * 0.64, "text-anchor": "end", "font-size": 14, "font-weight": 700, fill: C.black, text: r.u }));

      if (r.arm) {
        g.addEventListener("mouseenter", () => setHover({ armId: r.arm.arm_id, pair: `${r.arm.hemisphere}:${r.arm.pair}`, ampMa: r.arm.amp }));
        g.addEventListener("mouseleave", () => setHover({ armId: null, pair: null, ampMa: null }));
        g.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectArm(r.arm); });
      }
      svg.appendChild(g);
    });
    return svg;
  }

  // ── Extreme-Value Risk SVG Builders (NeuroRisk Integration, Nature Editorial Palette) ──

  /** Risk 1. Tail Risk Arena & VaR Map (Contact × Amplitude Lanes + Pattern & Layered Boundaries) */
  function buildRiskMapSVG(node, width, height) {
    const rk = computeRisk();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    if (!rk.arms.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "Select contacts on the DBS Lead Model to populate tail risk arms" }));
      return svg;
    }

    const pfx = `${node.id}-rmap`;
    appendRiskPatternDefs(svg, pfx);

    const legendKeys = ["cvar", "evt", "rl", "score", "safe"];
    const twoRows = width < 640;
    const riskSub = (s) => {
      const tm = s.targets[rk.target] || {};
      return ` · u ${fmtNum(tm.u, 2)} · ξ ${fmtNum(tm.xi0, 2)}`;
    };
    const pad = { l: laneLabelColumn(rk.series.map((s) => [s.label, riskSub(s)]), width), r: 24, t: twoRows ? 64 : 46, b: 48 };
    const pw = Math.max(120, width - pad.l - pad.r);
    const ph = Math.max(90, height - pad.t - pad.b);
    const lanes = rk.series.map((s) => s.label);
    const lh = ph / Math.max(1, lanes.length);
    const amax = Math.max(0.5, rk.amax || 1.0);
    const xA = (a) => pad.l + 22 + (clamp(a, 0, amax) / amax) * Math.max(40, pw - 44);

    // Top Pattern + Layered Boundary Legend for the 5 Risk Selection Rules
    const perRow = twoRows ? 3 : legendKeys.length;
    const slotW = (width - 24) / perRow;
    legendKeys.forEach((mk, mi) => {
      const row = Math.floor(mi / perRow);
      const col = mi % perRow;
      const lx = 14 + col * slotW;
      const ly = 10 + row * 24;
      drawRiskSwatch(svg, lx, ly, 22, 14, mk, pfx);
      svg.appendChild(
        svgEl("text", {
          x: lx + 28,
          y: ly + 12,
          "font-size": 14,
          "font-weight": 600,
          fill: RISK_STYLES[mk].stroke,
          text: RISK_STYLES[mk].label,
        })
      );
    });

    const mVals = rk.arms.map((a) => rk.metricOf(a)).filter(Number.isFinite);
    const lo = mVals.length ? Math.min(...mVals) : 0;
    const hi = mVals.length ? Math.max(...mVals) : 1;
    const selArms = state.selection.risk_selected_arms || [];

    rk.series.forEach((s, li) => {
      const y0 = pad.t + li * lh;
      const yc = y0 + lh * 0.52;
      const tm = s.targets[rk.target];
      const laneArms = rk.arms.filter((a) => a.seriesId === s.id);

      // Lane background & centerline
      svg.appendChild(svgEl("rect", { x: pad.l, y: y0, width: pw, height: lh, fill: li % 2 === 0 ? C.white : C.alabaster, stroke: C.silverSoft }));
      svg.appendChild(svgEl("line", { x1: pad.l, y1: yc, x2: pad.l + pw, y2: yc, stroke: C.silverSoft, "stroke-dasharray": "4 4" }));

      // Left lane label + red line u / shape ξ — ONE row per stimulation lane
      svg.appendChild(laneLabel(svgEl, pad.l - 10, yc + 5, s.label, riskSub(s), pad.l - 16));

      // Risk arm tiles (width never exceeds the gap to the neighbouring amplitude)
      const laneTileW = laneTileWidth(laneArms.map((a) => xA(a.amp)));
      laneArms.forEach((arm) => {
        const ax = xA(arm.amp);
        const val = rk.metricOf(arm);
        const tNorm = Number.isFinite(val)
          ? (rk.metric === "breach" ? clamp(val, 0, 1) : clamp((val - lo) / (hi - lo + 1e-9), 0, 1))
          : 0.5;
        const szW = laneTileW;
        const szH = clamp(lh * 0.54, 26, 40);
        const tx = ax - szW / 2;
        const ty = yc - szH / 2;
        const isSel = selArms.includes(arm.arm_id);
        const isHov = state.hover.armId === arm.arm_id;

        const hitRules = [];
        for (const r of rk.rules) {
          if (r.arm && r.arm.arm_id === arm.arm_id) hitRules.push(r.key);
        }

        const gTile = svgEl("g", { style: "cursor:pointer" });
        gTile.appendChild(
          svgEl("rect", {
            x: tx,
            y: ty,
            width: szW,
            height: szH,
            rx: 4,
            fill: Number.isFinite(val) ? specColor(tNorm * 0.92) : C.alabaster,
            stroke: isSel || isHov ? C.crimson : C.silver,
            "stroke-width": isSel || isHov ? 2.2 : 1.0,
          })
        );

        drawRiskLayeredBoundaries(gTile, tx, ty, szW, szH, 4, hitRules, pfx);

        const lbl = Number.isFinite(val)
          ? (rk.metric === "breach" ? `${Math.round(100 * val)}%` : val.toFixed(2))
          : "—";
        const lblSize = textWidth(lbl, 14, 700) <= szW - 4 ? 14 : textWidth(lbl, 12, 700) <= szW - 3 ? 12 : 0;
        if (lblSize) {
          gTile.appendChild(svgEl("text", { x: ax, y: yc + (lblSize === 14 ? 5 : 4), "text-anchor": "middle", "font-size": lblSize, "font-weight": 700, fill: tNorm > 0.54 ? C.white : C.black, text: lbl }));
        }
        gTile.appendChild(svgEl("title", { text: `${s.label} @ ${fmtNum(arm.amp, 2)} mA: ${lbl}` }));

        gTile.addEventListener("mouseenter", () => setHover({ armId: arm.arm_id, pair: `${arm.hemisphere}:${arm.pair}`, ampMa: arm.amp }));
        gTile.addEventListener("mouseleave", () => setHover({ armId: null, pair: null, ampMa: null }));
        gTile.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectRiskArm(arm); });
        gTile.addEventListener("contextmenu", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          openContextMenu(ev.clientX, ev.clientY, { kind: "risk_arm", arm, nodeId: node.id });
        });
        svg.appendChild(gTile);
      });
    });

    // Bottom amplitude axis + metric label
    for (let k = 0; k <= 4; k++) {
      const av = (amax * k) / 4;
      svg.appendChild(svgEl("text", { x: xA(av), y: pad.t + ph + 22, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: av.toFixed(1) }));
    }
    const mLabels = { CVaR: `CVaR${rk.lvl}`, VaR: `VaR${rk.lvl}`, EVT: "EVT-VaR99.9", RL: `${rk.H}s GEV RL`, breach: `P(breach ${rk.H}s)`, score: `Risk + ${rk.kappa.toFixed(2)}·E` };
    svg.appendChild(
      svgEl("text", {
        x: pad.l + pw / 2,
        y: height - 5,
        "text-anchor": "middle",
        "font-size": 14,
        "font-weight": 600,
        fill: C.black,
        text: `Amplitude a (mA) · Shading = ${mLabels[rk.metric] || rk.metric} (Light = Low Risk → Crimson = High Risk)`,
      })
    );
    return svg;
  }

  /** Risk 2. Causal Envelope Ratio z(t), POT Red Line u & Declustered Breaches */
  function buildRiskEnvelopeSVG(node, width, height) {
    const rk = computeRisk();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const ser = resolveRiskSeries(node, rk);
    if (!ser) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No risk series available for selected contacts" }));
      return svg;
    }

    const tm = ser.targets[rk.target];
    const tr = tm.env_trace || { t: [], z: [], z_max: [], amp: [], breaches: [] };
    if (!tr.t.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No envelope trace samples" }));
      return svg;
    }

    const pad = { l: 54, r: 48, t: 36, b: 46 };
    const pw = Math.max(100, width - pad.l - pad.r);
    const ph = Math.max(80, height - pad.t - pad.b);
    const tMax = Math.max(1, tr.t[tr.t.length - 1]);
    const zMax = Math.max(tm.u * 1.65, ...tr.z_max, 2.4);
    const aMax = Math.max(0.5, ...tr.amp);
    const sx = (t) => pad.l + (clamp(t, 0, tMax) / tMax) * pw;
    const sy = (z) => pad.t + ph - (clamp(z, 0, zMax) / zMax) * ph;
    const syA = (a) => pad.t + ph - (clamp(a, 0, aMax) / (aMax * 1.15)) * ph;

    // Plot frame & horizontal grid
    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));
    for (let k = 1; k <= 3; k++) {
      const gy = pad.t + (ph * k) / 4;
      svg.appendChild(svgEl("line", { x1: pad.l, y1: gy, x2: pad.l + pw, y2: gy, stroke: C.silverSoft }));
    }

    // Subtle amplitude staircase fill (right axis)
    const ampPts = tr.t.map((t, i) => `${i === 0 ? "M" : "L"} ${sx(t).toFixed(1)} ${syA(tr.amp[i]).toFixed(1)}`).join(" ");
    svg.appendChild(svgEl("path", { d: `${ampPts} L ${sx(tMax).toFixed(1)} ${(pad.t + ph).toFixed(1)} L ${pad.l} ${(pad.t + ph).toFixed(1)} Z`, fill: C.alabaster, opacity: 0.9 }));
    svg.appendChild(svgEl("path", { d: ampPts, fill: "none", stroke: C.grayLight, "stroke-width": 1.4, "stroke-dasharray": "4 3" }));

    // Baseline z = 1 reference
    if (1.0 < zMax) {
      svg.appendChild(svgEl("line", { x1: pad.l, y1: sy(1.0), x2: pad.l + pw, y2: sy(1.0), stroke: C.silver, "stroke-dasharray": "3 3" }));
    }

    // Exceedance spikes above POT red line u
    const yU = sy(tm.u);
    const barW = Math.max(1.5, pw / Math.max(1, tr.t.length));
    for (let i = 0; i < tr.t.length; i++) {
      if (tr.z_max[i] > tm.u) {
        const x = sx(tr.t[i]);
        const yTop = sy(tr.z_max[i]);
        svg.appendChild(svgEl("rect", { x: x - barW * 0.5, y: yTop, width: barW, height: Math.max(1, yU - yTop), fill: C.crimsonSoft }));
      }
    }

    // Envelope peak contour (silver) & mean causal moving-RMS ratio z(t) (black)
    const dPeak = tr.t.map((t, i) => `${i === 0 ? "M" : "L"} ${sx(t).toFixed(1)} ${sy(tr.z_max[i]).toFixed(1)}`).join(" ");
    svg.appendChild(svgEl("path", { d: dPeak, fill: "none", stroke: C.gray, "stroke-width": 1.1, opacity: 0.72 }));
    const dMean = tr.t.map((t, i) => `${i === 0 ? "M" : "L"} ${sx(t).toFixed(1)} ${sy(tr.z[i]).toFixed(1)}`).join(" ");
    svg.appendChild(svgEl("path", { d: dMean, fill: "none", stroke: C.black, "stroke-width": 1.7 }));

    // POT Red Line u = P90(0 mA)
    svg.appendChild(svgEl("line", { x1: pad.l, y1: yU, x2: pad.l + pw, y2: yU, stroke: C.crimson, "stroke-width": 2.0 }));
    svg.appendChild(svgEl("text", { x: pad.l + 6, y: Math.max(pad.t + 16, yU - 6), "font-size": 14, "font-weight": 700, fill: C.crimson, text: `Red line u = ${fmtNum(tm.u, 2)}` }));

    // Declustered cluster peak markers (▲ crimson)
    for (const br of tr.breaches || []) {
      const bx = sx(br.t);
      const by = sy(br.z);
      svg.appendChild(svgEl("polygon", { points: `${bx},${by - 5} ${bx - 4},${by + 3} ${bx + 4},${by + 3}`, fill: C.crimson }));
    }

    // Active / lowest-CVaR arm VaR_α dashed black line
    const refArm = rk.arms.find((a) => a.arm_id === state.hover.armId && a.seriesId === ser.id) || (tm.arms || [])[0];
    if (refArm) {
      const vVal = Number(refArm["VaR" + rk.lvl]);
      if (Number.isFinite(vVal) && vVal <= zMax) {
        const yV = sy(vVal);
        svg.appendChild(svgEl("line", { x1: pad.l, y1: yV, x2: pad.l + pw, y2: yV, stroke: C.black, "stroke-width": 1.5, "stroke-dasharray": "6 4" }));
        svg.appendChild(svgEl("text", { x: pad.l + pw - 6, y: Math.max(pad.t + 16, yV - 6), "text-anchor": "end", "font-size": 14, "font-weight": 600, fill: C.black, text: `VaR${rk.lvl} (${refArm.amp}mA) = ${fmtNum(vVal, 2)}` }));
      }
    }

    // Header summary
    const tailKind = tm.xi0 < 0 ? "bounded" : "heavy";
    svg.appendChild(
      svgEl("text", {
        x: pad.l,
        y: 22,
        "font-size": 14,
        "font-weight": 700,
        fill: C.black,
        text: `${ser.label} · ${rk.target === "beta" ? "β bursts" : "FTG"} · ξ=${fmtNum(tm.xi0, 2)} (${tailKind}) · θ=${fmtNum(tm.theta0, 2)} · λ₀=${fmtNum(tm.lam0, 2)}/s`,
      })
    );

    // Axes ticks & labels
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: zMax.toFixed(1) }));
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: "0.0" }));
    svg.appendChild(svgEl("text", { x: pad.l + pw + 6, y: pad.t + 14, "font-size": 14, fill: C.gray, text: `${aMax.toFixed(1)}mA` }));
    svg.appendChild(svgEl("text", { x: pad.l + pw + 6, y: pad.t + ph, "font-size": 14, fill: C.gray, text: "0" }));
    for (let k = 0; k <= 4; k++) {
      const tv = (tMax * k) / 4;
      svg.appendChild(svgEl("text", { x: sx(tv), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: `${Math.round(tv)}s` }));
    }
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: "Time (s) · Envelope Ratio z(t) · ▲ Declustered Breaches · Dashed Gray = mA" }));
    return svg;
  }

  /** Risk 3. Tail Survival Log-Plot & POT Threshold Diagnostics (MRL + ξ Stability) */
  function buildRiskTailSVG(node, width, height) {
    const rk = computeRisk();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const ser = resolveRiskSeries(node, rk);
    if (!ser) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No risk series available" }));
      return svg;
    }

    const tm = ser.targets[rk.target];
    const mode = node.mode || "survival";

    if (mode === "diagnostics") {
      const dg = tm.diagnostics || { u: [], mrl: [], xi: [] };
      if (!dg.u || dg.u.length < 2) {
        svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "Insufficient baseline samples for threshold diagnostics" }));
        return svg;
      }
      const pad = { l: 58, r: 22, t: 32, b: 44, gap: 28 };
      const pw = Math.max(100, width - pad.l - pad.r);
      const ph = Math.max(54, (height - pad.t - pad.b - pad.gap) / 2);
      const uMin = dg.u[0], uMax = dg.u[dg.u.length - 1];
      const sx = (u) => pad.l + ((u - uMin) / Math.max(1e-6, uMax - uMin)) * pw;

      const drawPanel = (yTop, vals, col, title, zeroRef = false) => {
        const fin = vals.filter((v) => v != null && Number.isFinite(v));
        const vLo = fin.length ? Math.min(...fin, zeroRef ? -0.1 : Infinity) - 0.05 : -0.3;
        const vHi = fin.length ? Math.max(...fin, zeroRef ? 0.1 : -Infinity) + 0.05 : 0.5;
        const sy = (v) => yTop + ph - ((v - vLo) / Math.max(1e-6, vHi - vLo)) * ph;

        svg.appendChild(svgEl("rect", { x: pad.l, y: yTop, width: pw, height: ph, fill: C.white, stroke: C.silver }));
        if (zeroRef && vLo < 0 && vHi > 0) {
          svg.appendChild(svgEl("line", { x1: pad.l, y1: sy(0), x2: pad.l + pw, y2: sy(0), stroke: C.silver, "stroke-dasharray": "4 4" }));
        }
        // Vertical P90 red line marker
        if (tm.u >= uMin && tm.u <= uMax) {
          const xu = sx(tm.u);
          svg.appendChild(svgEl("line", { x1: xu, y1: yTop, x2: xu, y2: yTop + ph, stroke: C.crimson, "stroke-width": 1.6, "stroke-dasharray": "5 3" }));
        }
        let d = "";
        dg.u.forEach((u, i) => {
          const v = vals[i];
          if (v == null || !Number.isFinite(v)) return;
          const x = sx(u), y = sy(v);
          d += (d ? " L " : "M ") + `${x.toFixed(1)} ${y.toFixed(1)}`;
          svg.appendChild(svgEl("circle", { cx: x, cy: y, r: 3.5, fill: col }));
        });
        if (d) svg.appendChild(svgEl("path", { d, fill: "none", stroke: col, "stroke-width": 2.0 }));

        svg.appendChild(svgEl("text", { x: pad.l + 8, y: yTop + 18, "font-size": 14, "font-weight": 700, fill: col, text: title }));
        svg.appendChild(svgEl("text", { x: pad.l - 8, y: yTop + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: vHi.toFixed(2) }));
        svg.appendChild(svgEl("text", { x: pad.l - 8, y: yTop + ph, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: vLo.toFixed(2) }));
      };

      svg.appendChild(svgEl("text", { x: pad.l, y: 20, "font-size": 14, "font-weight": 700, fill: C.black, text: `${ser.label} · Threshold Stability around P90 u = ${fmtNum(tm.u, 2)} (dashed)` }));
      drawPanel(pad.t, dg.mrl, C.crimson, "Mean Residual Life (mean excess)", false);
      drawPanel(pad.t + ph + pad.gap, dg.xi, C.black, "GPD Shape ξ(u)", true);

      svg.appendChild(svgEl("text", { x: pad.l, y: height - 22, "font-size": 14, fill: C.grayDark, text: uMin.toFixed(2) }));
      svg.appendChild(svgEl("text", { x: pad.l + pw, y: height - 22, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: uMax.toFixed(2) }));
      svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 4, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: "Threshold u (× 0 mA median, P70–P96)" }));
      return svg;
    }

    // Default mode: Log-Survival Tail Plot + 0 mA GPD Curve + VaR / EVT-VaR99.9
    const arms = tm.arms || [];
    const activeArm =
      arms.find((a) => a.arm_id === node.armId) ||
      arms.find((a) => a.arm_id === state.hover.armId) ||
      arms.find((a) => rk.picks.cvar && a.arm_id === rk.picks.cvar.arm_id) ||
      arms[arms.length - 1];

    const pad = { l: 58, r: 22, t: 36, b: 48 };
    const pw = Math.max(100, width - pad.l - pad.r);
    const ph = Math.max(80, height - pad.t - pad.b);
    const xLo = 0.6;
    const armMaxZ = activeArm ? Math.max(activeArm.max || 0, activeArm.EVT_VaR999 || 0) : tm.u * 1.6;
    const xHi = Math.max(tm.u * 1.8, armMaxZ * 1.08, 2.6);
    const sx = (z) => pad.l + (clamp((z - xLo) / Math.max(1e-6, xHi - xLo), 0, 1)) * pw;
    const sy = (p) => pad.t + ph - (clamp((Math.log10(Math.max(p, 1e-4)) + 4) / 4, 0, 1)) * ph;

    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));
    for (const e of [-1, -2, -3]) {
      const gy = sy(10 ** e);
      svg.appendChild(svgEl("line", { x1: pad.l, y1: gy, x2: pad.l + pw, y2: gy, stroke: C.silverSoft }));
    }

    // 0 mA POT–GPD survival curve above u: P(Z > z) = 0.1 * (1 + ξ(z - u)/σ)^(-1/ξ)
    const gpdPts = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const z = tm.u + ((xHi - tm.u) * i) / steps;
      let p;
      if (Math.abs(tm.xi0) > 1e-6) {
        const arg = 1 + (tm.xi0 * (z - tm.u)) / Math.max(tm.sigma0, 1e-5);
        if (arg <= 1e-6) break;
        p = 0.1 * Math.pow(arg, -1 / tm.xi0);
      } else {
        p = 0.1 * Math.exp(-(z - tm.u) / Math.max(tm.sigma0, 1e-5));
      }
      if (p < 1e-4) break;
      gpdPts.push(`${gpdPts.length === 0 ? "M" : "L"} ${sx(z).toFixed(1)} ${sy(p).toFixed(1)}`);
    }
    if (gpdPts.length > 1) {
      svg.appendChild(svgEl("path", { d: gpdPts.join(" "), fill: "none", stroke: C.crimson, "stroke-width": 2.2, "stroke-dasharray": "6 3" }));
    }

    // Red line u vertical marker
    const xU = sx(tm.u);
    svg.appendChild(svgEl("line", { x1: xU, y1: pad.t, x2: xU, y2: pad.t + ph, stroke: C.crimson, "stroke-width": 1.8 }));

    // Empirical tail points for active arm
    if (activeArm && activeArm.tail_pts && activeArm.tail_pts.z.length) {
      const tz = activeArm.tail_pts.z, tp = activeArm.tail_pts.p;
      let dEmp = "";
      for (let i = 0; i < tz.length; i++) {
        if (tz[i] < xLo || tz[i] > xHi) continue;
        const px = sx(tz[i]), py = sy(tp[i]);
        dEmp += (dEmp ? " L " : "M ") + `${px.toFixed(1)} ${py.toFixed(1)}`;
        svg.appendChild(svgEl("circle", { cx: px, cy: py, r: 3.2, fill: C.black }));
      }
      if (dEmp) svg.appendChild(svgEl("path", { d: dEmp, fill: "none", stroke: C.black, "stroke-width": 1.4, opacity: 0.7 }));

      const vVal = Number(activeArm["VaR" + rk.lvl]);
      if (Number.isFinite(vVal) && vVal >= xLo && vVal <= xHi) {
        const xv = sx(vVal);
        svg.appendChild(svgEl("line", { x1: xv, y1: pad.t, x2: xv, y2: pad.t + ph, stroke: C.black, "stroke-width": 1.8, "stroke-dasharray": "6 4" }));
        svg.appendChild(svgEl("text", { x: Math.min(xv + 5, pad.l + pw - 74), y: pad.t + 18, "font-size": 14, "font-weight": 700, fill: C.black, text: `VaR${rk.lvl} ${fmtNum(vVal, 2)}` }));
      }
      if (activeArm.EVT_VaR999 != null && Number.isFinite(activeArm.EVT_VaR999) && activeArm.EVT_VaR999 <= xHi) {
        const xe = sx(activeArm.EVT_VaR999);
        svg.appendChild(svgEl("line", { x1: xe, y1: pad.t, x2: xe, y2: pad.t + ph, stroke: C.grayDark, "stroke-width": 1.8, "stroke-dasharray": "3 3" }));
        svg.appendChild(svgEl("text", { x: Math.min(xe + 5, pad.l + pw - 84), y: pad.t + 36, "font-size": 14, "font-weight": 600, fill: C.grayDark, text: `EVT ${fmtNum(activeArm.EVT_VaR999, 2)}` }));
      }
    }

    // Header & legend
    svg.appendChild(
      svgEl("text", {
        x: pad.l,
        y: 22,
        "font-size": 14,
        "font-weight": 700,
        fill: C.black,
        text: `${ser.label} · ${activeArm ? `${activeArm.amp} mA` : ""} · ● Empirical  - - 0 mA GPD (ξ=${fmtNum(tm.xi0, 2)})`,
      })
    );

    // Axes labels
    for (const e of [0, -1, -2, -3, -4]) {
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: sy(10 ** e) + 5, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: `10^${e}` }));
    }
    for (let k = 0; k <= 4; k++) {
      const zv = xLo + ((xHi - xLo) * k) / 4;
      svg.appendChild(svgEl("text", { x: sx(zv), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: zv.toFixed(1) }));
    }
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: "Envelope Ratio z (× 0 mA median) · Solid Crimson = Red Line u" }));
    return svg;
  }

  /** Risk 4. POT Baseline (90% CI) & Shared-ξ GEV Return Levels vs Return Period T */
  function buildRiskReturnSVG(node, width, height) {
    const rk = computeRisk();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const ser = resolveRiskSeries(node, rk);
    if (!ser) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No risk series available" }));
      return svg;
    }

    const tm = ser.targets[rk.target];
    const Tg = rk.T_grid;
    const arms = tm.arms || [];
    const pad = { l: 56, r: 24, t: 36, b: 48 };
    const pw = Math.max(100, width - pad.l - pad.r);
    const ph = Math.max(80, height - pad.t - pad.b);

    // Compute Y bounds across 0 mA POT CI and all arms' GEV curves
    const yVals = [tm.u];
    for (const arr of [tm.rl0 || [], tm.rl0_lo || [], tm.rl0_hi || []]) {
      for (const v of arr) if (v != null && Number.isFinite(v)) yVals.push(v);
    }
    for (const a of arms) {
      if (a.gev_mu != null && a.gev_sigma != null) {
        const v2 = gevReturnLevelJS(a.gev_mu, a.gev_sigma, tm.gev_xi, 2);
        const v600 = gevReturnLevelJS(a.gev_mu, a.gev_sigma, tm.gev_xi, 600);
        if (Number.isFinite(v2)) yVals.push(v2);
        if (Number.isFinite(v600)) yVals.push(v600);
      }
    }
    const yLo = Math.max(0, Math.min(...yVals) - 0.15);
    const yHi = Math.max(yLo + 0.5, Math.max(...yVals) + 0.25);
    const sx = (t) => pad.l + (Math.log10(Math.max(1, t)) / Math.log10(600)) * pw;
    const sy = (v) => pad.t + ph - (clamp((v - yLo) / Math.max(1e-6, yHi - yLo), 0, 1)) * ph;

    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));
    for (const t of [10, 60, 300]) {
      svg.appendChild(svgEl("line", { x1: sx(t), y1: pad.t, x2: sx(t), y2: pad.t + ph, stroke: C.silverSoft }));
    }

    // 0 mA POT 90% Bootstrap CI Band
    const hiPts = [], loPts = [];
    Tg.forEach((t, i) => {
      const vh = tm.rl0_hi?.[i], vl = tm.rl0_lo?.[i];
      if (vh != null && vl != null && Number.isFinite(vh) && Number.isFinite(vl)) {
        hiPts.push(`${sx(t).toFixed(1)},${sy(vh).toFixed(1)}`);
        loPts.unshift(`${sx(t).toFixed(1)},${sy(vl).toFixed(1)}`);
      }
    });
    if (hiPts.length > 1) {
      svg.appendChild(svgEl("polygon", { points: [...hiPts, ...loPts].join(" "), fill: C.crimsonSoft }));
    }

    // 0 mA POT Median Return Level Curve (solid crimson)
    let dPot = "";
    Tg.forEach((t, i) => {
      const v = tm.rl0?.[i];
      if (v != null && Number.isFinite(v)) {
        dPot += (dPot ? " L " : "M ") + `${sx(t).toFixed(1)} ${sy(v).toFixed(1)}`;
      }
    });
    if (dPot) svg.appendChild(svgEl("path", { d: dPot, fill: "none", stroke: C.crimson, "stroke-width": 2.4 }));

    // Per-arm GEV Return-Level Curves (shared ξ)
    const focusArm =
      arms.find((a) => a.arm_id === state.hover.armId) ||
      arms.find((a) => rk.picks.rl && a.arm_id === rk.picks.rl.arm_id) ||
      arms.filter((a) => a.gev_mu != null).sort((a, b) => gevReturnLevelJS(a.gev_mu, a.gev_sigma, tm.gev_xi, rk.H) - gevReturnLevelJS(b.gev_mu, b.gev_sigma, tm.gev_xi, rk.H))[0];

    for (const a of arms) {
      if (a.gev_mu == null || a.gev_sigma == null) continue;
      const isFoc = focusArm && a.arm_id === focusArm.arm_id;
      let dGev = "";
      for (const t of Tg) {
        if (t < 2) continue;
        const v = gevReturnLevelJS(a.gev_mu, a.gev_sigma, tm.gev_xi, t);
        if (Number.isFinite(v)) dGev += (dGev ? " L " : "M ") + `${sx(t).toFixed(1)} ${sy(v).toFixed(1)}`;
      }
      if (dGev) {
        svg.appendChild(
          svgEl("path", {
            d: dGev,
            fill: "none",
            stroke: isFoc ? C.black : C.grayLight,
            "stroke-width": isFoc ? 2.6 : 1.2,
            "stroke-dasharray": isFoc ? "" : "4 3",
            opacity: isFoc ? 1 : 0.72,
          })
        );
      }
    }

    // Horizon H vertical marker + readout
    const xH = sx(rk.H);
    svg.appendChild(svgEl("line", { x1: xH, y1: pad.t, x2: xH, y2: pad.t + ph, stroke: C.black, "stroke-width": 1.6, "stroke-dasharray": "5 3" }));
    if (focusArm && focusArm.gev_mu != null) {
      const vH = gevReturnLevelJS(focusArm.gev_mu, focusArm.gev_sigma, tm.gev_xi, rk.H);
      if (Number.isFinite(vH)) {
        svg.appendChild(svgEl("circle", { cx: xH, cy: sy(vH), r: 5.5, fill: C.white, stroke: C.black, "stroke-width": 2.4 }));
        const flip = xH > pad.l + pw * 0.65;
        svg.appendChild(
          svgEl("text", {
            x: flip ? xH - 10 : xH + 10,
            y: clamp(sy(vH) - 8, pad.t + 18, pad.t + ph - 8),
            "text-anchor": flip ? "end" : "start",
            "font-size": 14,
            "font-weight": 700,
            fill: C.black,
            text: `${focusArm.amp}mA: ${vH.toFixed(2)} @ ${rk.H}s`,
          })
        );
      }
    }

    // Header & axes
    svg.appendChild(
      svgEl("text", {
        x: pad.l,
        y: 22,
        "font-size": 14,
        "font-weight": 700,
        fill: C.black,
        text: `${ser.label} · Crimson = 0 mA POT (90% CI) · Black = GEV (ξ=${fmtNum(tm.gev_xi, 2)})`,
      })
    );
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: yHi.toFixed(1) }));
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: yLo.toFixed(1) }));
    for (const t of [1, 10, 60, 600]) {
      svg.appendChild(svgEl("text", { x: sx(t), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: `${t}s` }));
    }
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: `Return Period T (log s) · Dashed Vertical = Horizon H (${rk.H} s)` }));
    return svg;
  }

  /** Risk 5. Breach Rate λ(a) Poisson Fit & Breach Probability P(≥1 breach in H) vs ε Safe Zone */
  function buildRiskBreachSVG(node, width, height) {
    const rk = computeRisk();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const ser = resolveRiskSeries(node, rk);
    if (!ser) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No risk series available" }));
      return svg;
    }

    const pfx = `${node.id}-rbr`;
    appendRiskPatternDefs(svg, pfx);

    const tm = ser.targets[rk.target];
    const g = tm.lam_grid || [];
    const arms = tm.arms || [];
    if (g.length < 2) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "Insufficient amplitudes for breach-rate curve" }));
      return svg;
    }

    const pad = { l: 56, r: 54, t: 36, b: 48 };
    const pw = Math.max(100, width - pad.l - pad.r);
    const ph = Math.max(80, height - pad.t - pad.b);
    const aMax = Math.max(0.5, g[g.length - 1]);
    const lMax = Math.max(tm.lam0 * 1.3, ...arms.map((a) => a.rate || 0), ...(tm.lam_mid || [0])) + 0.05;
    const sx = (a) => pad.l + (clamp(a, 0, aMax) / aMax) * pw;
    const syL = (l) => pad.t + ph - (clamp(l / Math.max(1e-6, lMax), 0, 1)) * ph;
    const syP = (p) => pad.t + ph - clamp(p, 0, 1) * ph;

    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));

    // Safe zone shaded band where P(breach in H) ≤ ε
    const yEps = syP(rk.eps);
    svg.appendChild(svgEl("rect", { x: pad.l, y: yEps, width: pw, height: pad.t + ph - yEps, fill: C.alabaster }));
    svg.appendChild(svgEl("line", { x1: pad.l, y1: yEps, x2: pad.l + pw, y2: yEps, stroke: C.grayDark, "stroke-width": 1.4, "stroke-dasharray": "4 3" }));

    // Poisson 90% CI band for λ(a)
    const hiPts = [], loPts = [];
    g.forEach((a, i) => {
      const vh = tm.lam_hi?.[i], vl = tm.lam_lo?.[i];
      if (vh != null && vl != null) {
        hiPts.push(`${sx(a).toFixed(1)},${syL(vh).toFixed(1)}`);
        loPts.unshift(`${sx(a).toFixed(1)},${syL(vl).toFixed(1)}`);
      }
    });
    if (hiPts.length > 1) {
      svg.appendChild(svgEl("polygon", { points: [...hiPts, ...loPts].join(" "), fill: C.crimsonSoft }));
    }

    // λ(a) solid crimson curve
    const dLam = g.map((a, i) => `${i === 0 ? "M" : "L"} ${sx(a).toFixed(1)} ${syL(tm.lam_mid[i] || 0).toFixed(1)}`).join(" ");
    svg.appendChild(svgEl("path", { d: dLam, fill: "none", stroke: C.crimson, "stroke-width": 2.4 }));

    // P(breach in H) dashed black curve (right axis)
    const dProb = g.map((a, i) => {
      const p = 1 - Math.exp(-(tm.lam_mid[i] || 0) * rk.H);
      return `${i === 0 ? "M" : "L"} ${sx(a).toFixed(1)} ${syP(p).toFixed(1)}`;
    }).join(" ");
    svg.appendChild(svgEl("path", { d: dProb, fill: "none", stroke: C.black, "stroke-width": 2.2, "stroke-dasharray": "6 4" }));

    // Observed arm cluster rates (circles sized by √seconds)
    for (const a of arms) {
      const cx = sx(a.amp), cy = syL(a.rate);
      const r = clamp(3.5 + Math.sqrt(a.seconds || 1) * 0.45, 4, 9);
      const isSafePick = rk.picks.safe && rk.picks.safe.arm_id === a.arm_id;
      const isHov = state.hover.armId === a.arm_id;
      const gPt = svgEl("g", { style: "cursor:pointer" });
      if (isSafePick) {
        gPt.appendChild(svgEl("circle", { cx, cy, r: r + 5, fill: `url(#${pfx}-rpat-safe)`, stroke: C.crimson, "stroke-width": 2.0, "stroke-dasharray": "5 2" }));
      }
      gPt.appendChild(svgEl("circle", { cx, cy, r, fill: isSafePick || isHov ? C.crimson : C.black, stroke: C.white, "stroke-width": 1.4 }));
      gPt.addEventListener("mouseenter", () => setHover({ armId: a.arm_id, pair: `${a.hemisphere}:${a.pair}`, ampMa: a.amp }));
      gPt.addEventListener("mouseleave", () => setHover({ armId: null, pair: null, ampMa: null }));
      gPt.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectRiskArm(a); });
      svg.appendChild(gPt);
    }

    // Header & dual axis labels
    const slope = tm.rate?.[1] ?? 0;
    svg.appendChild(
      svgEl("text", {
        x: pad.l,
        y: 22,
        "font-size": 14,
        "font-weight": 700,
        fill: C.black,
        text: `${ser.label} · Crimson λ(a) (r₁=${slope.toFixed(2)}/mA) · Dashed P(br ${rk.H}s)`,
      })
    );
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, "font-weight": 600, fill: C.crimson, text: lMax.toFixed(2) }));
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.crimson, text: "0" }));
    svg.appendChild(svgEl("text", { x: pad.l + pw + 6, y: pad.t + 14, "font-size": 14, "font-weight": 600, fill: C.black, text: "100%" }));
    svg.appendChild(svgEl("text", { x: pad.l + pw + 6, y: clamp(yEps + 5, pad.t + 30, pad.t + ph - 14), "font-size": 14, "font-weight": 700, fill: C.crimson, text: `ε=${Math.round(100 * rk.eps)}%` }));
    svg.appendChild(svgEl("text", { x: pad.l + pw + 6, y: pad.t + ph, "font-size": 14, fill: C.black, text: "0%" }));
    for (let k = 0; k <= 4; k++) {
      const av = (aMax * k) / 4;
      svg.appendChild(svgEl("text", { x: sx(av), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: av.toFixed(1) }));
    }
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: "Amplitude a (mA) · Shaded Bottom = Safe Zone (P(breach) ≤ ε)" }));
    return svg;
  }

  /** Risk 6. 5-Rule Risk Selection Board & Kupiec VaR Calibration Backtest */
  function buildRiskSelectionSVG(node, width, height) {
    const rk = computeRisk();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const mode = node.mode || "selection";

    if (mode === "backtest") {
      const bt = rk.backtest || [];
      if (!bt.length) {
        svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "Segments too short (<2.4 s) for split-half Kupiec backtest" }));
        return svg;
      }
      const cols = [
        { lbl: "Series", x: 18, anchor: "start" },
        { lbl: "α", x: Math.round(width * 0.34), anchor: "middle" },
        { lbl: "Method", x: Math.round(width * 0.48), anchor: "middle" },
        { lbl: "Br / Exp", x: Math.round(width * 0.68), anchor: "end" },
        { lbl: "Rate", x: Math.round(width * 0.82), anchor: "end" },
        { lbl: "Kupiec p", x: width - 18, anchor: "end" },
      ];
      svg.appendChild(svgEl("rect", { x: 10, y: 8, width: width - 20, height: 32, rx: 4, fill: C.black }));
      for (const c of cols) {
        svg.appendChild(svgEl("text", { x: c.x, y: 29, "text-anchor": c.anchor, "font-size": 14, "font-weight": 700, fill: C.white, text: c.lbl }));
      }
      const maxRows = Math.min(bt.length, Math.max(4, Math.floor((height - 54) / 30)));
      const rowH = Math.max(28, (height - 54) / Math.max(1, maxRows));
      bt.slice(0, maxRows).forEach((r, idx) => {
        const y = 46 + idx * rowH;
        const bad = r.kupiec_p != null && r.kupiec_p < 0.05;
        svg.appendChild(svgEl("rect", { x: 10, y, width: width - 20, height: rowH - 3, rx: 3, fill: bad ? C.crimsonTint : idx % 2 === 0 ? C.alabaster : C.white, stroke: bad ? C.crimson : C.silverSoft }));
        const ty = y + rowH * 0.66;
        svg.appendChild(svgEl("text", { x: cols[0].x, y: ty, "font-size": 14, "font-weight": 600, fill: C.black, text: r.series }));
        svg.appendChild(svgEl("text", { x: cols[1].x, y: ty, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: `${Math.round(100 * r.alpha)}%` }));
        svg.appendChild(svgEl("text", { x: cols[2].x, y: ty, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: r.method }));
        svg.appendChild(svgEl("text", { x: cols[3].x, y: ty, "text-anchor": "end", "font-size": 14, fill: C.black, text: `${r.breaches}/${r.expected}` }));
        svg.appendChild(svgEl("text", { x: cols[4].x, y: ty, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: `${(100 * r.breach_rate).toFixed(1)}%` }));
        svg.appendChild(svgEl("text", { x: cols[5].x, y: ty, "text-anchor": "end", "font-size": 14, "font-weight": 700, fill: bad ? C.crimson : C.black, text: r.kupiec_p != null ? r.kupiec_p.toFixed(3) : "—" }));
      });
      return svg;
    }

    // Default mode: 5-Rule Risk Selection Board (mirroring buildGTConsensusSVG)
    if (!rk.arms.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No arms available for risk selection" }));
      return svg;
    }

    const pfx = `${node.id}-rsel`;
    appendRiskPatternDefs(svg, pfx);

    // Majority Winner Banner with double layered boundary
    svg.appendChild(svgEl("rect", { x: 10, y: 8, width: width - 20, height: 42, rx: 5, fill: C.crimsonTint, stroke: C.crimson, "stroke-width": 2.0 }));
    svg.appendChild(svgEl("rect", { x: 14, y: 12, width: width - 28, height: 34, rx: 3, fill: "none", stroke: C.crimson, "stroke-width": 1.0, "stroke-dasharray": "6 3" }));
    svg.appendChild(
      svgEl("text", {
        x: 24,
        y: 34,
        "font-size": 15,
        "font-weight": 700,
        fill: C.crimson,
        text: `Risk Majority (${rk.majCnt}/${rk.totalVotes} · ${rk.target === "beta" ? "β" : "FTG"}): ${rk.majLabel}`,
      })
    );

    const startY = 64;
    const rowH = Math.max(38, (height - startY - 14) / rk.rules.length);
    rk.rules.forEach((r, idx) => {
      const y = startY + idx * rowH;
      const isMaj = r.arm && r.arm.label === rk.majLabel;
      const isHov = r.arm && state.hover.armId === r.arm.arm_id;

      const g = svgEl("g", { style: r.arm ? "cursor:pointer" : "default" });
      g.appendChild(svgEl("rect", { x: 10, y, width: width - 20, height: rowH - 5, rx: 3, fill: isHov ? C.crimsonTint : idx % 2 === 0 ? C.alabaster : C.white, stroke: isHov ? C.crimson : C.silverSoft }));
      drawRiskSwatch(g, 20, y + (rowH - 22) / 2, 28, 16, r.key, pfx);
      g.appendChild(svgEl("text", { x: 56, y: y + rowH * 0.60, "font-size": 14, "font-weight": 600, fill: C.black, text: r.name }));
      g.appendChild(svgEl("text", { x: Math.max(248, width * 0.48), y: y + rowH * 0.60, "font-size": 14, "font-weight": isMaj ? 700 : 500, fill: isMaj ? C.crimson : C.grayDark, text: r.arm ? r.arm.label : "none feasible" }));
      g.appendChild(svgEl("text", { x: width - 20, y: y + rowH * 0.60, "text-anchor": "end", "font-size": 14, "font-weight": 700, fill: C.black, text: r.val }));

      if (r.arm) {
        g.addEventListener("mouseenter", () => setHover({ armId: r.arm.arm_id, pair: `${r.arm.hemisphere}:${r.arm.pair}`, ampMa: r.arm.amp }));
        g.addEventListener("mouseleave", () => setHover({ armId: null, pair: null, ampMa: null }));
        g.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectRiskArm(r.arm); });
      }
      svg.appendChild(g);
    });
    return svg;
  }

  // ── Option-Pricing SVG Builders (NeuroOptions Integration, Nature Editorial Palette) ──

  /** Opt 1. Premium Map & Strategy Arena (Contact × Amplitude Portfolio Π Lanes + Layered Boundaries) */
  function buildOptArenaSVG(node, width, height) {
    const op = computeOptions();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    if (!op.arms.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "Select contacts on the DBS Lead Model to populate option arms" }));
      return svg;
    }

    const pfx = `${node.id}-opta`;
    appendOptPatternDefs(svg, pfx);

    const legendKeys = ["portfolio", "strategy", "ftg", "adapt", "alpha"];
    const twoRows = width < 640;
    const optSub = (s) => {
      const a0 = op.arms.find((a) => a.seriesId === s.id);
      return a0 ? ` · κ ${fmtNum(a0.b_kappa, 1)} · t½ ${Math.round(a0.b_halflife_ms)} ms` : "";
    };
    const pad = { l: laneLabelColumn(op.series.map((s) => [s.label, optSub(s)]), width), r: 24, t: twoRows ? 64 : 46, b: 48 };
    const pw = Math.max(120, width - pad.l - pad.r);
    const ph = Math.max(90, height - pad.t - pad.b);
    const lh = ph / Math.max(1, op.series.length);
    const amax = Math.max(0.5, op.amax || 1.0);
    const xA = (a) => pad.l + 22 + (clamp(a, 0, amax) / amax) * Math.max(40, pw - 44);

    // Top Pattern + Layered Boundary Legend for the 5 Option Selection Rules
    const perRow = twoRows ? 3 : legendKeys.length;
    const slotW = (width - 24) / perRow;
    legendKeys.forEach((mk, mi) => {
      const row = Math.floor(mi / perRow);
      const col = mi % perRow;
      const lx = 14 + col * slotW;
      const ly = 10 + row * 24;
      drawOptSwatch(svg, lx, ly, 22, 14, mk, pfx);
      svg.appendChild(
        svgEl("text", {
          x: lx + 28,
          y: ly + 12,
          "font-size": 14,
          "font-weight": 600,
          fill: OPT_STYLES[mk].stroke,
          text: OPT_STYLES[mk].label,
        })
      );
    });

    const pVals = op.arms.map((a) => a.val).filter(Number.isFinite);
    const lo = pVals.length ? Math.min(...pVals) : 0;
    const hi = pVals.length ? Math.max(...pVals) : 1;
    const selArms = state.selection.opt_selected_arms || [];

    op.series.forEach((s, li) => {
      const y0 = pad.t + li * lh;
      const yc = y0 + lh * 0.52;
      const laneArms = op.arms.filter((a) => a.seriesId === s.id);
      const a0 = laneArms[0];

      svg.appendChild(svgEl("rect", { x: pad.l, y: y0, width: pw, height: lh, fill: li % 2 === 0 ? C.white : C.alabaster, stroke: C.silverSoft }));
      svg.appendChild(svgEl("line", { x1: pad.l, y1: yc, x2: pad.l + pw, y2: yc, stroke: C.silverSoft, "stroke-dasharray": "4 4" }));

      // ONE row per stimulation lane: series label + log-OU κ / half-life
      svg.appendChild(laneLabel(svgEl, pad.l - 10, yc + 5, s.label, a0 ? optSub(s) : "", pad.l - 16));
      const laneTileW = laneTileWidth(laneArms.map((a) => xA(a.amp)));

      // Draw continuous Alpha=0 vertical marker if this series holds the Alpha optimum
      const alSer = op.alphaSeries.find((x) => x.seriesId === s.id);
      if (alSer && op.alphaBestOverall && op.alphaBestOverall.seriesId === s.id) {
        const xa = xA(alSer.best.a);
        svg.appendChild(svgEl("line", { x1: xa, y1: y0 + 2, x2: xa, y2: y0 + lh - 2, stroke: C.black, "stroke-width": 2.0, "stroke-dasharray": "8 3 2 3" }));
      }

      laneArms.forEach((arm) => {
        const ax = xA(arm.amp);
        const tNorm = clamp((arm.val - lo) / (hi - lo + 1e-9), 0, 1);
        const szW = laneTileW;
        const szH = clamp(lh * 0.54, 26, 40);
        const tx = ax - szW / 2;
        const ty = yc - szH / 2;
        const isSel = selArms.includes(arm.arm_id);
        const isHov = state.hover.armId === arm.arm_id;

        const hitRules = [];
        for (const r of op.rules) {
          if (r.arm && r.arm.arm_id === arm.arm_id) hitRules.push(r.key);
        }

        const gTile = svgEl("g", { style: "cursor:pointer" });
        gTile.appendChild(
          svgEl("rect", {
            x: tx,
            y: ty,
            width: szW,
            height: szH,
            rx: 4,
            fill: specColor(tNorm * 0.92),
            stroke: isSel || isHov ? C.crimson : C.silver,
            "stroke-width": isSel || isHov ? 2.2 : 1.0,
          })
        );
        drawOptLayeredBoundaries(gTile, tx, ty, szW, szH, 4, hitRules, pfx);
        const oLbl = arm.val.toFixed(2);
        const oSize = textWidth(oLbl, 14, 700) <= szW - 4 ? 14 : textWidth(oLbl, 12, 700) <= szW - 3 ? 12 : 0;
        if (oSize) {
          gTile.appendChild(svgEl("text", { x: ax, y: yc + (oSize === 14 ? 5 : 4), "text-anchor": "middle", "font-size": oSize, "font-weight": 700, fill: tNorm > 0.54 ? C.white : C.black, text: oLbl }));
        }
        gTile.appendChild(svgEl("title", { text: `${s.label} @ ${fmtNum(arm.amp, 2)} mA: Π = ${oLbl}` }));

        gTile.addEventListener("mouseenter", () => setHover({ armId: arm.arm_id, pair: `${arm.hemisphere}:${arm.pair}`, ampMa: arm.amp }));
        gTile.addEventListener("mouseleave", () => setHover({ armId: null, pair: null, ampMa: null }));
        gTile.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectOptArm(arm); });
        gTile.addEventListener("contextmenu", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          openContextMenu(ev.clientX, ev.clientY, { kind: "opt_arm", arm, nodeId: node.id });
        });
        svg.appendChild(gTile);
      });
    });

    for (let k = 0; k <= 4; k++) {
      const av = (amax * k) / 4;
      svg.appendChild(svgEl("text", { x: xA(av), y: pad.t + ph + 22, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: av.toFixed(1) }));
    }
    svg.appendChild(
      svgEl("text", {
        x: pad.l + pw / 2,
        y: height - 5,
        "text-anchor": "middle",
        "font-size": 14,
        "font-weight": 600,
        fill: C.black,
        text: `Amplitude a (mA) · Portfolio Π (${op.stratTitle}, Light = Best → Crimson = Costly)`,
      })
    );
    return svg;
  }

  /** Opt 2. Payoff f(S_T), Log-OU Density vs Empirical Histogram & Model-vs-Market Calibration */
  function buildOptPayoffSVG(node, width, height) {
    const op = computeOptions();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const mode = node.mode || "payoff";

    if (mode === "calibration") {
      // Model (Black-76 log-OU) vs Market (realized mean payoff) across all scoped arms
      const stKey = ["call", "strangle", "straddle", "butterfly", "bullspread"].includes(op.strategy) ? op.strategy : "call";
      const pts = op.arms
        .map((a) => ({ arm: a, m: Number(a[`prem_${stKey}`]), e: Number(a[`emp_${stKey}`]) }))
        .filter((q) => Number.isFinite(q.m) && Number.isFinite(q.e));
      if (!pts.length) {
        svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No calibration points available" }));
        return svg;
      }

      const pad = { l: 62, r: 24, t: 36, b: 48 };
      const pw = Math.max(100, width - pad.l - pad.r);
      const ph = Math.max(80, height - pad.t - pad.b);
      const lo = -3.6, hi = 0.4; // log10 range [2.5e-4 .. 2.5]
      const sx = (v) => pad.l + clamp((Math.log10(Math.max(v, 2.5e-4)) - lo) / (hi - lo), 0, 1) * pw;
      const sy = (v) => pad.t + ph - clamp((Math.log10(Math.max(v, 2.5e-4)) - lo) / (hi - lo), 0, 1) * ph;

      svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));
      // 1:1 Identity line
      svg.appendChild(svgEl("line", { x1: pad.l, y1: pad.t + ph, x2: pad.l + pw, y2: pad.t, stroke: C.gray, "stroke-width": 1.6, "stroke-dasharray": "6 4" }));

      // Pearson r
      let rTxt = "—";
      if (pts.length >= 3) {
        const me = pts.reduce((s, q) => s + q.e, 0) / pts.length;
        const mm = pts.reduce((s, q) => s + q.m, 0) / pts.length;
        let num = 0, de = 0, dm = 0;
        for (const q of pts) { num += (q.e - me) * (q.m - mm); de += (q.e - me) ** 2; dm += (q.m - mm) ** 2; }
        const r = num / Math.sqrt(Math.max(de * dm, 1e-12));
        if (Number.isFinite(r)) rTxt = r.toFixed(3);
      }

      pts.forEach((q) => {
        const cx = sx(q.e), cy = sy(q.m);
        const isHov = state.hover.armId === q.arm.arm_id;
        const isBest = op.picks.portfolio && op.picks.portfolio.arm_id === q.arm.arm_id;
        const g = svgEl("g", { style: "cursor:pointer" });
        g.appendChild(svgEl("circle", { cx, cy, r: isHov || isBest ? 6.5 : 4.5, fill: isHov || isBest ? C.crimson : C.black, stroke: C.white, "stroke-width": 1.3 }));
        g.addEventListener("mouseenter", () => setHover({ armId: q.arm.arm_id, pair: `${q.arm.hemisphere}:${q.arm.pair}`, ampMa: q.arm.amp }));
        g.addEventListener("mouseleave", () => setHover({ armId: null, pair: null, ampMa: null }));
        g.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectOptArm(q.arm); });
        svg.appendChild(g);
      });

      svg.appendChild(svgEl("text", { x: pad.l, y: 22, "font-size": 14, "font-weight": 700, fill: C.black, text: `Model vs Market (${stKey}) · ${pts.length} arms · Pearson r = ${rTxt}` }));
      for (const e of [-3, -2, -1, 0]) {
        const v = 10 ** e;
        svg.appendChild(svgEl("text", { x: sx(v), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: `10^${e}` }));
        svg.appendChild(svgEl("text", { x: pad.l - 8, y: sy(v) + 5, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: `10^${e}` }));
      }
      svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: "Market Price (Realized Payoff)  vs.  Model Price (Black-76 Log-OU)" }));
      return svg;
    }

    // Default mode: Payoff f(S_T) + Log-OU Density + Empirical Histogram
    const ser = resolveOptSeries(node, op);
    if (!ser) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No option series available" }));
      return svg;
    }
    const sArms = op.arms.filter((a) => a.seriesId === ser.id);
    const activeArm =
      sArms.find((a) => a.arm_id === node.armId) ||
      sArms.find((a) => a.arm_id === state.hover.armId) ||
      sArms.find((a) => op.picks.portfolio && a.arm_id === op.picks.portfolio.arm_id) ||
      sArms[0];
    if (!activeArm) return svg;

    const K = activeArm.K;
    const legs = optLegsOf(op.strategy, K);
    const p = op.isFtg ? activeArm.pf : activeArm.pb;
    const xmax = Math.max(op.spec.hist_xmax || 2.6, K.ceil + 0.35);
    const pad = { l: 54, r: 20, t: 36, b: 48 };
    const pw = Math.max(100, width - pad.l - pad.r);
    const ph = Math.max(80, height - pad.t - pad.b);

    const N = 120;
    const pays = [];
    for (let i = 0; i <= N; i++) {
      const s = (xmax * i) / N;
      pays.push([s, optPayoffLegs(s, legs)]);
    }
    const pMax = Math.max(0.35, ...pays.map((q) => q[1]));
    const pMin = Math.min(0, ...pays.map((q) => q[1]));
    const sx = (s) => pad.l + (clamp(s, 0, xmax) / xmax) * pw;
    const sy = (v) => pad.t + ph - ((v - pMin) / Math.max(1e-6, pMax - pMin)) * ph * 0.90;

    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));

    // Empirical histogram bars (realized "market" distribution)
    const hist = op.isFtg ? activeArm.hist_f : activeArm.hist_b;
    const hMaxX = op.spec.hist_xmax || 2.6;
    if (hist && hist.length) {
      const bw = (hMaxX / hist.length) * (pw / xmax);
      hist.forEach((hv, bi) => {
        const hh = hv * ph * 0.62;
        if (hh > 0.5) {
          svg.appendChild(svgEl("rect", { x: sx((bi * hMaxX) / hist.length), y: pad.t + ph - hh, width: Math.max(1, bw - 1), height: hh, fill: C.silverSoft, stroke: C.silver, "stroke-width": 0.6 }));
        }
      });
    }

    // Log-normal stationary density (dashed gray) + conditional T-horizon density from S0 = K_burst (crimson tint)
    const drawDens = (m, v, isFill) => {
      const vv = Math.max(v, 1e-4);
      const dVals = pays.map(([s]) => (s > 0.01 ? Math.exp(-((Math.log(s) - m) ** 2) / (2 * vv)) / (s * Math.sqrt(2 * Math.PI * vv)) : 0));
      const dm = Math.max(...dVals, 1e-9);
      const dPath = pays.map(([s], i) => `${i === 0 ? "M" : "L"} ${sx(s).toFixed(1)} ${(pad.t + ph - (dVals[i] / dm) * ph * 0.64).toFixed(1)}`).join(" ");
      if (isFill) {
        svg.appendChild(svgEl("path", { d: `${dPath} L ${sx(xmax).toFixed(1)} ${(pad.t + ph).toFixed(1)} L ${pad.l} ${(pad.t + ph).toFixed(1)} Z`, fill: C.crimsonSoft }));
        svg.appendChild(svgEl("path", { d: dPath, fill: "none", stroke: C.crimson, "stroke-width": 1.8 }));
      } else {
        svg.appendChild(svgEl("path", { d: dPath, fill: "none", stroke: C.grayDark, "stroke-width": 1.5, "stroke-dasharray": "5 3" }));
      }
    };
    drawDens(p.theta, p.s * p.s, false);
    const [mT, vT] = optOuMom(Math.log(Math.max(op.isFtg ? K.ftg : K.burst, 0.1)), p, op.T);
    drawDens(mT, vT, true);

    // Strike vertical lines
    const seenK = new Set();
    for (const [, , kv] of legs) {
      if (seenK.has(kv.toFixed(2)) || kv > xmax) continue;
      seenK.add(kv.toFixed(2));
      const xk = sx(kv);
      svg.appendChild(svgEl("line", { x1: xk, y1: pad.t, x2: xk, y2: pad.t + ph, stroke: C.crimson, "stroke-width": 1.3, "stroke-dasharray": "3 3" }));
    }

    // Payoff curve f(S_T) (crisp solid black)
    const dPay = pays.map(([s, v], i) => `${i === 0 ? "M" : "L"} ${sx(s).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
    svg.appendChild(svgEl("path", { d: dPay, fill: "none", stroke: C.black, "stroke-width": 2.4 }));

    const empKey = op.isFtg ? "emp_ftg" : `emp_${op.strategy}`;
    const empVal = activeArm[empKey];
    svg.appendChild(
      svgEl("text", {
        x: pad.l,
        y: 22,
        "font-size": 14,
        "font-weight": 700,
        fill: C.black,
        text: `${ser.label} @ ${activeArm.amp}mA · ${op.stratTitle} · Model ${activeArm.prem.toFixed(4)}${empVal != null ? ` · Mkt ${Number(empVal).toFixed(4)}` : ""}`,
      })
    );

    svg.appendChild(svgEl("text", { x: pad.l - 8, y: sy(pMax) + 5, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: pMax.toFixed(2) }));
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: sy(0) + 5, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: "0" }));
    for (let k = 0; k <= 4; k++) {
      const sv = (xmax * k) / 4;
      svg.appendChild(svgEl("text", { x: sx(sv), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: sv.toFixed(1) }));
    }
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: "Terminal Ratio S_T · Black = Payoff · Crimson = S_T Density · Bars = Realized" }));
    return svg;
  }

  /** Opt 3. Nelson–Ramaswamy Mean-Reverting Binomial Lattice (American vs European + aDBS Boundary) */
  function buildOptLatticeSVG(node, width, height) {
    const op = computeOptions();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const ser = resolveOptSeries(node, op);
    if (!ser) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No option series available" }));
      return svg;
    }
    const sArms = op.arms.filter((a) => a.seriesId === ser.id);
    const activeArm =
      sArms.find((a) => a.arm_id === node.armId) ||
      sArms.find((a) => a.arm_id === state.hover.armId) ||
      sArms.find((a) => op.picks.adapt && a.arm_id === op.picks.adapt.arm_id) ||
      sArms[0];
    if (!activeArm) return svg;

    const Kburst = activeArm.K.burst;
    const x0 = Math.log(Math.max(Kburst, 0.05));
    const nSteps = op.steps;
    const lt = optLattice(x0, activeArm.pb, op.T, Kburst, nSteps);
    const [m1, v1] = optOuMom(x0, activeArm.pb, op.T);
    const blackVal = optPriceLegs(m1, v1, [[1, "call", Kburst]]);

    const pad = { l: 58, r: 22, t: 38, b: 46 };
    const pw = Math.max(100, width - pad.l - pad.r);
    const ph = Math.max(80, height - pad.t - pad.b);
    const xLo = x0 - lt.dx * nSteps - 0.12;
    const xHi = x0 + lt.dx * nSteps + 0.12;
    const sx = (k) => pad.l + (k / Math.max(1, nSteps)) * pw;
    const sy = (x) => pad.t + ph - ((x - xLo) / Math.max(1e-6, xHi - xLo)) * ph;

    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));

    // Recombining lattice edges
    let edgeD = "";
    lt.nodes.forEach((lay, k) => {
      if (k === nSteps) return;
      lay.forEach((q, j) => {
        const x1 = sx(k).toFixed(1), y1 = sy(q.x).toFixed(1);
        const x2 = sx(k + 1).toFixed(1);
        edgeD += `M ${x1} ${y1} L ${x2} ${sy(lt.nodes[k + 1][j].x).toFixed(1)} M ${x1} ${y1} L ${x2} ${sy(lt.nodes[k + 1][j + 1].x).toFixed(1)} `;
      });
    });
    if (edgeD) svg.appendChild(svgEl("path", { d: edgeD, fill: "none", stroke: C.silver, "stroke-width": 1.0 }));

    // Strike K_burst horizontal line
    const yK = sy(Math.log(Math.max(Kburst, 0.05)));
    svg.appendChild(svgEl("line", { x1: pad.l, y1: yK, x2: pad.l + pw, y2: yK, stroke: C.black, "stroke-width": 1.6, "stroke-dasharray": "5 3" }));

    // Early-exercise boundary S*(t) (optimal aDBS trigger boundary)
    let boundD = "";
    lt.nodes.forEach((lay, k) => {
      const exNodes = lay.filter((q) => q.ex);
      if (!exNodes.length) return;
      const minX = Math.min(...exNodes.map((q) => q.x));
      boundD += (boundD ? " L " : "M ") + `${sx(k).toFixed(1)} ${sy(minX).toFixed(1)}`;
    });
    if (boundD) {
      svg.appendChild(svgEl("path", { d: boundD, fill: "none", stroke: C.crimson, "stroke-width": 2.4 }));
    }

    // Lattice nodes: crimson = early exercise (aDBS trigger), black = continuation in-value, silver = low value
    const vMax = Math.max(...lt.nodes[nSteps].map((q) => q.V), 1e-6);
    lt.nodes.forEach((lay, k) => {
      lay.forEach((q) => {
        const r = clamp(2.8 + 5.2 * Math.sqrt(clamp(q.V / vMax, 0, 1)), 2.8, 8.2);
        const fill = q.ex ? C.crimson : q.V > 1e-4 ? C.black : C.silver;
        svg.appendChild(svgEl("circle", { cx: sx(k), cy: sy(q.x), r, fill, stroke: C.white, "stroke-width": 0.9 }));
      });
    });

    svg.appendChild(
      svgEl("text", {
        x: pad.l,
        y: 22,
        "font-size": 14,
        "font-weight": 700,
        fill: C.black,
        text: `${ser.label} @ ${activeArm.amp}mA · Am ${lt.am.toFixed(4)} · Eu ${lt.eu.toFixed(4)} · Black ${blackVal.toFixed(4)} · aDBS +${Math.max(0, lt.am - lt.eu).toFixed(4)}`,
      })
    );
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: Math.exp(xHi).toFixed(1) }));
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: yK + 5, "text-anchor": "end", "font-size": 14, "font-weight": 700, fill: C.crimson, text: `K=${Kburst.toFixed(2)}` }));
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: Math.exp(xLo).toFixed(2) }));
    svg.appendChild(svgEl("text", { x: pad.l, y: pad.t + ph + 20, "font-size": 14, fill: C.grayDark, text: "0 s" }));
    svg.appendChild(svgEl("text", { x: pad.l + pw, y: pad.t + ph + 20, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: `${op.T.toFixed(2)} s` }));
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: `Time to Maturity (${nSteps} steps) · Crimson = Early-Exercise aDBS Trigger S*(t)` }));
    return svg;
  }

  /** Opt 4. Option Chain & Greeks Table (K, Call, Δ, Γ, Vega, Θ/s, Put) */
  function buildOptChainSVG(node, width, height) {
    const op = computeOptions();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const ser = resolveOptSeries(node, op);
    if (!ser) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No option series available" }));
      return svg;
    }
    const sArms = op.arms.filter((a) => a.seriesId === ser.id);
    const activeArm =
      sArms.find((a) => a.arm_id === node.armId) ||
      sArms.find((a) => a.arm_id === state.hover.armId) ||
      sArms.find((a) => op.picks.portfolio && a.arm_id === op.picks.portfolio.arm_id) ||
      sArms[0];
    if (!activeArm) return svg;

    const p = op.isFtg ? activeArm.pf : activeArm.pb;
    const S0 = Math.exp(p.theta + 0.5 * p.s * p.s);
    const x0 = Math.log(Math.max(S0, 0.05));
    const Tm = op.T;
    const K = activeArm.K;
    const stratKs = new Set(optLegsOf(op.strategy, K).map((l) => l[2].toFixed(2)));
    const ks = op.spec.chain_ks || [0.4, 0.55, 0.7, 0.85, 1.0, 1.15, 1.3, 1.45, 1.6, 1.75, 1.9, 2.05];
    const atmK = ks.reduce((b, k) => (Math.abs(k - S0) < Math.abs(b - S0) ? k : b), ks[0]);

    const C_ = (k, xx = x0, pp = p, TT = Tm) => {
      const [m, v] = optOuMom(xx, pp, TT);
      return optPriceLegs(m, v, [[1, "call", k]]);
    };

    const cols = ["Strike K", "Call", "Δ", "Γ", "Vega", "Θ /s", "Put"];
    const padX = 10;
    const cw = (width - padX * 2) / cols.length;

    svg.appendChild(svgEl("text", { x: padX + 4, y: 20, "font-size": 14, "font-weight": 700, fill: C.black, text: `${ser.label} @ ${activeArm.amp}mA · S₀=${S0.toFixed(2)} · T=${Tm.toFixed(2)}s · σ=${p.sigma.toFixed(2)} · ◆ = strategy leg` }));
    svg.appendChild(svgEl("rect", { x: padX, y: 28, width: width - padX * 2, height: 28, rx: 4, fill: C.black }));
    cols.forEach((c, i) => {
      svg.appendChild(svgEl("text", { x: padX + cw * (i + 0.5), y: 47, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: C.white, text: c }));
    });

    const startY = 60;
    const maxRows = Math.min(ks.length, Math.max(6, Math.floor((height - startY - 6) / 26)));
    const rowH = Math.max(24, (height - startY - 6) / Math.max(1, maxRows));
    const stepStride = ks.length > maxRows ? Math.ceil(ks.length / maxRows) : 1;
    const showKs = ks.filter((_, i) => i % stepStride === 0).slice(0, maxRows);

    showKs.forEach((k, ri) => {
      const y = startY + ri * rowH;
      const c0 = C_(k);
      const [m, v] = optOuMom(x0, p, Tm);
      const put = optPriceLegs(m, v, [[1, "put", k]]);
      const hS = 0.03;
      const up = C_(k, Math.log(S0 * (1 + hS))), dn = C_(k, Math.log(S0 * (1 - hS)));
      const delta = (up - dn) / (2 * S0 * hS);
      const gamma = (up - 2 * c0 + dn) / ((S0 * hS) ** 2);
      const vega = (C_(k, x0, { ...p, s: p.s + 0.01 }) - C_(k, x0, { ...p, s: Math.max(0.01, p.s - 0.01) })) / 0.02;
      const tHi = Tm + 0.05, tLo = Math.max(0.02, Tm - 0.05);
      const theta = -(C_(k, x0, p, tHi) - C_(k, x0, p, tLo)) / (tHi - tLo);

      const isAtm = Math.abs(k - atmK) < 1e-4;
      const isLeg = stratKs.has(k.toFixed(2));
      svg.appendChild(
        svgEl("rect", {
          x: padX,
          y,
          width: width - padX * 2,
          height: rowH - 2,
          rx: 2,
          fill: isAtm ? C.crimsonTint : ri % 2 === 0 ? C.alabaster : C.white,
          stroke: isAtm ? C.crimson : C.silverSoft,
        })
      );

      // Subtle delta bar inside Delta column
      const dBarW = (cw - 14) * clamp(delta, 0, 1);
      if (dBarW > 1) {
        svg.appendChild(svgEl("rect", { x: padX + cw * 2 + 7, y: y + rowH - 6, width: dBarW, height: 3, fill: C.crimson, opacity: 0.55 }));
      }

      const vals = [k, c0, delta, gamma, vega, theta, put];
      const ty = y + rowH * 0.67;
      vals.forEach((v_, i) => {
        const cx = padX + cw * (i + 0.5);
        const txt = i === 0 ? `${k.toFixed(2)}${isLeg ? " ◆" : ""}` : Math.abs(v_) < 1e-4 ? "0" : v_.toFixed(Math.abs(v_) < 0.1 ? 3 : 2);
        svg.appendChild(
          svgEl("text", {
            x: cx,
            y: ty,
            "text-anchor": "middle",
            "font-size": 14,
            "font-weight": i === 0 || isAtm ? 700 : 500,
            fill: i === 0 && (isLeg || isAtm) ? C.crimson : i === 3 && v_ < 0 ? C.grayDark : C.black,
            text: txt,
          })
        );
      });
    });
    return svg;
  }

  /** Opt 5. Alpha ∂Π/∂a Curves (Fitted Portfolio vs Amplitude) & Implied-Volatility Smile IV(K) */
  function buildOptSmileSVG(node, width, height) {
    const op = computeOptions();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const mode = node.mode || "alpha";

    if (mode === "smile") {
      const ser = resolveOptSeries(node, op);
      if (!ser) {
        svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No option series available" }));
        return svg;
      }
      const sArms = op.arms.filter((a) => a.seriesId === ser.id);
      const activeArm =
        sArms.find((a) => a.arm_id === node.armId) ||
        sArms.find((a) => a.arm_id === state.hover.armId) ||
        sArms[0];
      if (!activeArm) return svg;
      const sm = (ser.smiles || {})[String(Number(activeArm.amp))] || Object.values(ser.smiles || {})[0];
      if (!sm || !sm.K || !sm.K.length) {
        svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "Insufficient tail data for implied-vol smile" }));
        return svg;
      }

      const pad = { l: 56, r: 22, t: 36, b: 48 };
      const pw = Math.max(100, width - pad.l - pad.r);
      const ph = Math.max(80, height - pad.t - pad.b);
      const kLo = sm.K[0], kHi = sm.K[sm.K.length - 1];
      const validIv = sm.iv.filter((v) => v != null && Number.isFinite(v));
      const vLo = Math.max(0.05, Math.min(...validIv, sm.model || 0.3) - 0.08);
      const vHi = Math.max(vLo + 0.25, Math.max(...validIv, sm.model || 0.4) + 0.08);
      const sx = (k) => pad.l + ((k - kLo) / Math.max(1e-6, kHi - kLo)) * pw;
      const sy = (v) => pad.t + ph - clamp((v - vLo) / Math.max(1e-6, vHi - vLo), 0, 1) * ph;

      svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));
      // Flat log-normal model volatility s
      if (Number.isFinite(sm.model)) {
        const ym = sy(sm.model);
        svg.appendChild(svgEl("line", { x1: pad.l, y1: ym, x2: pad.l + pw, y2: ym, stroke: C.black, "stroke-width": 1.6, "stroke-dasharray": "6 4" }));
      }
      // Vertical strike K_burst line
      if (activeArm.K.burst >= kLo && activeArm.K.burst <= kHi) {
        const xk = sx(activeArm.K.burst);
        svg.appendChild(svgEl("line", { x1: xk, y1: pad.t, x2: xk, y2: pad.t + ph, stroke: C.gray, "stroke-width": 1.4, "stroke-dasharray": "3 3" }));
      }

      let dIv = "";
      sm.K.forEach((k, i) => {
        const v = sm.iv[i];
        if (v == null || !Number.isFinite(v)) return;
        const x = sx(k), y = sy(v);
        dIv += (dIv ? " L " : "M ") + `${x.toFixed(1)} ${y.toFixed(1)}`;
        svg.appendChild(svgEl("circle", { cx: x, cy: y, r: 3.8, fill: C.crimson, stroke: C.white, "stroke-width": 1.0 }));
      });
      if (dIv) svg.appendChild(svgEl("path", { d: dIv, fill: "none", stroke: C.crimson, "stroke-width": 2.2 }));

      svg.appendChild(svgEl("text", { x: pad.l, y: 22, "font-size": 14, "font-weight": 700, fill: C.black, text: `${ser.label} @ ${activeArm.amp}mA · Crimson = Market IV(K) · Dashed = Log-Normal s (${fmtNum(sm.model, 2)})` }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: vHi.toFixed(2) }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: vLo.toFixed(2) }));
      for (let k = 0; k <= 4; k++) {
        const kv = kLo + ((kHi - kLo) * k) / 4;
        svg.appendChild(svgEl("text", { x: sx(kv), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: kv.toFixed(1) }));
      }
      svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: "Strike K · Falling Right Wing = Thinner-than-Log-Normal Bounded β Tail" }));
      return svg;
    }

    // Default mode: Alpha ∂Π/∂a — Fitted Portfolio Π(a) curves across amplitude
    if (!op.alphaSeries.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "Multiple amplitudes needed to fit continuous Alpha = ∂Π/∂a curves" }));
      return svg;
    }

    const pad = { l: 58, r: 24, t: 36, b: 48 };
    const pw = Math.max(100, width - pad.l - pad.r);
    const ph = Math.max(80, height - pad.t - pad.b);
    const aMax = Math.max(0.5, ...op.alphaSeries.map((c) => c.pts[c.pts.length - 1].a));
    const allY = op.alphaSeries.flatMap((c) => c.pts.map((q) => q.val)).concat(op.arms.map((a) => a.val));
    const yLo = Math.min(...allY) - 0.02;
    const yHi = Math.max(yLo + 0.05, Math.max(...allY) + 0.02);
    const sx = (a) => pad.l + (clamp(a, 0, aMax) / aMax) * pw;
    const sy = (v) => pad.t + ph - ((v - yLo) / Math.max(1e-6, yHi - yLo)) * ph;

    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: pw, height: ph, fill: C.white, stroke: C.silver }));

    const curSer = resolveOptSeries(node, op);
    op.alphaSeries.forEach((cv) => {
      const isFocus = curSer && cv.seriesId === curSer.id;
      const isBest = op.alphaBestOverall && op.alphaBestOverall.seriesId === cv.seriesId;
      const d = cv.pts.map((q, i) => `${i === 0 ? "M" : "L"} ${sx(q.a).toFixed(1)} ${sy(q.val).toFixed(1)}`).join(" ");
      svg.appendChild(
        svgEl("path", {
          d,
          fill: "none",
          stroke: isBest ? C.crimson : isFocus ? C.black : C.grayLight,
          "stroke-width": isBest ? 2.6 : isFocus ? 2.0 : 1.3,
          "stroke-dasharray": isBest || isFocus ? "" : "4 3",
        })
      );

      // Observed arm dots
      for (const a of op.arms.filter((x) => x.seriesId === cv.seriesId)) {
        svg.appendChild(svgEl("circle", { cx: sx(a.amp), cy: sy(a.val), r: isBest || isFocus ? 4.0 : 2.8, fill: isBest ? C.crimson : C.black, stroke: C.white, "stroke-width": 1.0 }));
      }

      // Continuous Alpha=0 optimum marker (double crimson ring for overall best)
      const bx = sx(cv.best.a), by = sy(cv.best.val);
      if (isBest) {
        svg.appendChild(svgEl("circle", { cx: bx, cy: by, r: 9.5, fill: "none", stroke: C.crimson, "stroke-width": 1.6 }));
        svg.appendChild(svgEl("circle", { cx: bx, cy: by, r: 6.0, fill: C.white, stroke: C.crimson, "stroke-width": 2.4 }));
        const flip = bx > pad.l + pw * 0.65;
        svg.appendChild(
          svgEl("text", {
            x: flip ? bx - 14 : bx + 14,
            y: clamp(by - 8, pad.t + 18, pad.t + ph - 8),
            "text-anchor": flip ? "end" : "start",
            "font-size": 14,
            "font-weight": 700,
            fill: C.crimson,
            text: `a*=${cv.best.a.toFixed(2)}mA`,
          })
        );
      }
    });

    const bestOv = op.alphaBestOverall;
    svg.appendChild(
      svgEl("text", {
        x: pad.l,
        y: 22,
        "font-size": 14,
        "font-weight": 700,
        fill: C.black,
        text: bestOv ? `Best Alpha=0: ${bestOv.label} @ ${bestOv.best.a.toFixed(2)} mA (Π=${bestOv.best.val.toFixed(4)})` : "Portfolio Π(a) Curves",
      })
    );
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + 14, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: yHi.toFixed(3) }));
    svg.appendChild(svgEl("text", { x: pad.l - 8, y: pad.t + ph, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: yLo.toFixed(3) }));
    for (let k = 0; k <= 4; k++) {
      const av = (aMax * k) / 4;
      svg.appendChild(svgEl("text", { x: sx(av), y: pad.t + ph + 20, "text-anchor": "middle", "font-size": 14, fill: C.grayDark, text: av.toFixed(1) }));
    }
    svg.appendChild(svgEl("text", { x: pad.l + pw / 2, y: height - 5, "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: C.black, text: "Amplitude a (mA) · Continuous Weighted Quadratic θ(a), s(a) Fits" }));
    return svg;
  }

  /** Opt 6. 5-Rule Option Selection Board & Log-OU Parameter Table */
  function buildOptSelectionSVG(node, width, height) {
    const op = computeOptions();
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const mode = node.mode || "selection";

    if (mode === "params") {
      if (!op.arms.length) {
        svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No arms available" }));
        return svg;
      }
      const cols = [
        { lbl: "Arm", x: 16, anchor: "start" },
        { lbl: "θ", x: Math.round(width * 0.42), anchor: "end" },
        { lbl: "κ (/s)", x: Math.round(width * 0.54), anchor: "end" },
        { lbl: "t½ ms", x: Math.round(width * 0.66), anchor: "end" },
        { lbl: "σ", x: Math.round(width * 0.77), anchor: "end" },
        { lbl: "Am−Eu", x: Math.round(width * 0.89), anchor: "end" },
        { lbl: "Π", x: width - 16, anchor: "end" },
      ];
      svg.appendChild(svgEl("rect", { x: 10, y: 8, width: width - 20, height: 32, rx: 4, fill: C.black }));
      for (const c of cols) {
        svg.appendChild(svgEl("text", { x: c.x, y: 29, "text-anchor": c.anchor, "font-size": 14, "font-weight": 700, fill: C.white, text: c.lbl }));
      }
      const sorted = op.arms.slice().sort((a, b) => a.val - b.val);
      const maxRows = Math.min(sorted.length, Math.max(4, Math.floor((height - 54) / 30)));
      const rowH = Math.max(28, (height - 54) / Math.max(1, maxRows));
      sorted.slice(0, maxRows).forEach((a, idx) => {
        const y = 46 + idx * rowH;
        const isBest = idx === 0;
        const isHov = state.hover.armId === a.arm_id;
        const g = svgEl("g", { style: "cursor:pointer" });
        g.appendChild(svgEl("rect", { x: 10, y, width: width - 20, height: rowH - 3, rx: 3, fill: isHov || isBest ? C.crimsonTint : idx % 2 === 0 ? C.alabaster : C.white, stroke: isHov || isBest ? C.crimson : C.silverSoft }));
        const ty = y + rowH * 0.66;
        g.appendChild(svgEl("text", { x: cols[0].x, y: ty, "font-size": 14, "font-weight": isBest ? 700 : 600, fill: isBest ? C.crimson : C.black, text: a.label }));
        g.appendChild(svgEl("text", { x: cols[1].x, y: ty, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: a.b_theta.toFixed(2) }));
        g.appendChild(svgEl("text", { x: cols[2].x, y: ty, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: a.b_kappa.toFixed(1) }));
        g.appendChild(svgEl("text", { x: cols[3].x, y: ty, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: Math.round(a.b_halflife_ms) }));
        g.appendChild(svgEl("text", { x: cols[4].x, y: ty, "text-anchor": "end", "font-size": 14, fill: C.grayDark, text: a.b_sigma.toFixed(2) }));
        g.appendChild(svgEl("text", { x: cols[5].x, y: ty, "text-anchor": "end", "font-size": 14, fill: C.black, text: a.adapt.toFixed(3) }));
        g.appendChild(svgEl("text", { x: cols[6].x, y: ty, "text-anchor": "end", "font-size": 14, "font-weight": 700, fill: isBest ? C.crimson : C.black, text: a.val.toFixed(3) }));
        g.addEventListener("mouseenter", () => setHover({ armId: a.arm_id, pair: `${a.hemisphere}:${a.pair}`, ampMa: a.amp }));
        g.addEventListener("mouseleave", () => setHover({ armId: null, pair: null, ampMa: null }));
        g.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectOptArm(a); });
        svg.appendChild(g);
      });
      return svg;
    }

    if (!op.arms.length) {
      svg.appendChild(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "No arms available for option selection" }));
      return svg;
    }

    const pfx = `${node.id}-osel`;
    appendOptPatternDefs(svg, pfx);

    svg.appendChild(svgEl("rect", { x: 10, y: 8, width: width - 20, height: 42, rx: 5, fill: C.crimsonTint, stroke: C.crimson, "stroke-width": 2.0 }));
    svg.appendChild(svgEl("rect", { x: 14, y: 12, width: width - 28, height: 34, rx: 3, fill: "none", stroke: C.crimson, "stroke-width": 1.0, "stroke-dasharray": "6 3" }));
    svg.appendChild(
      svgEl("text", {
        x: 24,
        y: 34,
        "font-size": 15,
        "font-weight": 700,
        fill: C.crimson,
        text: `Options Majority (${op.majCnt}/${op.totalVotes} · ${op.stratTitle}): ${op.majLabel}`,
      })
    );

    const startY = 64;
    const rowH = Math.max(38, (height - startY - 14) / op.rules.length);
    op.rules.forEach((r, idx) => {
      const y = startY + idx * rowH;
      const isMaj = r.arm && r.arm.label === op.majLabel;
      const isHov = r.arm && state.hover.armId === r.arm.arm_id;

      const g = svgEl("g", { style: r.arm ? "cursor:pointer" : "default" });
      g.appendChild(svgEl("rect", { x: 10, y, width: width - 20, height: rowH - 5, rx: 3, fill: isHov ? C.crimsonTint : idx % 2 === 0 ? C.alabaster : C.white, stroke: isHov ? C.crimson : C.silverSoft }));
      drawOptSwatch(g, 20, y + (rowH - 22) / 2, 28, 16, r.key, pfx);
      g.appendChild(svgEl("text", { x: 56, y: y + rowH * 0.60, "font-size": 14, "font-weight": 600, fill: C.black, text: r.name }));
      g.appendChild(svgEl("text", { x: Math.max(246, width * 0.48), y: y + rowH * 0.60, "font-size": 14, "font-weight": isMaj ? 700 : 500, fill: isMaj ? C.crimson : C.grayDark, text: r.label || (r.arm ? r.arm.label : "—") }));
      g.appendChild(svgEl("text", { x: width - 20, y: y + rowH * 0.60, "text-anchor": "end", "font-size": 14, "font-weight": 700, fill: C.black, text: r.val }));

      if (r.arm) {
        g.addEventListener("mouseenter", () => setHover({ armId: r.arm.arm_id, pair: `${r.arm.hemisphere}:${r.arm.pair}`, ampMa: r.arm.amp }));
        g.addEventListener("mouseleave", () => setHover({ armId: null, pair: null, ampMa: null }));
        g.addEventListener("click", (ev) => { ev.stopPropagation(); toggleSelectOptArm(r.arm); });
      }
      svg.appendChild(g);
    });
    return svg;
  }

  // ════════════════════════════════════════════════════════════════════
  // ── NeuroWeave 5.0 Graph Signal Processing (GSP) Pure-Vector Objects ──
  // ════════════════════════════════════════════════════════════════════
  function gspEmptySVG(w, h, msg) {
    const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}`, width: w, height: h, class: "nr-svg" });
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width: w, height: h, fill: C.white }));
    svg.appendChild(svgEl("text", { x: w / 2, y: h / 2, "text-anchor": "middle", fill: C.gray, "font-size": 15, "font-family": FONT_SANS, text: msg }));
    return svg;
  }

  function gspDrawAxes(svg, x0, y0, pw, ph, xLbl, yLbl) {
    svg.appendChild(svgEl("line", { x1: x0, y1: y0 + ph, x2: x0 + pw, y2: y0 + ph, stroke: C.black, "stroke-width": 1.3 }));
    svg.appendChild(svgEl("line", { x1: x0, y1: y0, x2: x0, y2: y0 + ph, stroke: C.black, "stroke-width": 1.3 }));
    if (xLbl) svg.appendChild(svgEl("text", { x: x0 + pw / 2, y: y0 + ph + 38, "text-anchor": "middle", fill: C.ink, "font-size": 14, "font-weight": 600, "font-family": FONT_SANS, text: xLbl }));
    if (yLbl) svg.appendChild(svgEl("text", { x: x0 - 46, y: y0 + ph / 2, "text-anchor": "middle", fill: C.ink, "font-size": 14, "font-weight": 600, "font-family": FONT_SANS, transform: `rotate(-90 ${x0 - 46} ${y0 + ph / 2})`, text: yLbl }));
  }

  /**
   * Two-regime layout of a GSP graph: spectral (u₂, u₃) start → weighted force relaxation with a gentle
   * pull of each regime (sign of the Fiedler vector) to its own side → overlap removal. Deterministic.
   */
  function gspRegimeLayout(W, U, regime, K, rad) {
    const maxW = Math.max(1e-9, ...W.flat());
    const u2 = Array.from({ length: K }, (_, i) => (U[i] && U[i][1]) || 0);
    const u3 = Array.from({ length: K }, (_, i) => (U[i] && U[i][2]) || 0);
    const nz = (v) => { const m = Math.max(1e-9, ...v.map(Math.abs)); return v.map((x) => x / m); };
    const a2 = nz(u2), a3 = nz(u3);
    const P = Array.from({ length: K }, (_, i) => ({
      x: (regime[i] ? 0.55 : -0.55) + 0.35 * a2[i] + 0.012 * Math.sin(i * 2.399),
      y: 0.75 * a3[i] + 0.06 * Math.cos(i * 2.399) + (K > 2 ? 0 : (i ? 0.25 : -0.25)),
    }));
    const kOpt = Math.sqrt(4.0 / Math.max(2, K));
    let temp = 0.12;
    for (let it = 0; it < 360; it++) {
      const F = P.map(() => ({ x: 0, y: 0 }));
      for (let i = 0; i < K; i++) {
        for (let j = i + 1; j < K; j++) {
          let dx = P[i].x - P[j].x, dy = P[i].y - P[j].y;
          const d = Math.max(0.02, Math.hypot(dx, dy));
          dx /= d; dy /= d;
          const same = regime[i] === regime[j];
          const rep = (kOpt * kOpt) / d * (same ? 1 : 1.25);
          const att = (W[i][j] / maxW) * (d * d) / kOpt * (same ? 1.15 : 0.35);
          const f = rep - att;
          F[i].x += dx * f; F[i].y += dy * f;
          F[j].x -= dx * f; F[j].y -= dy * f;
        }
        // regime side pull + weak gravity to the centre line
        F[i].x += ((regime[i] ? 0.62 : -0.62) - P[i].x) * 0.9;
        F[i].y += -P[i].y * 0.25;
      }
      for (let i = 0; i < K; i++) {
        const m = Math.hypot(F[i].x, F[i].y) || 1;
        const step = Math.min(m, temp);
        P[i].x += (F[i].x / m) * step;
        P[i].y += (F[i].y / m) * step;
      }
      temp = Math.max(0.004, temp * 0.985);
    }
    return P;
  }

  function convexHull(pts) {
    const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    if (p.length < 3) return p;
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  /** Smooth closed path around circles (centre + radius): hull of sampled rims, rounded with quadratic joints. */
  function blobPath(circles) {
    const pts = [];
    for (const c of circles) for (let t = 0; t < 16; t++) { const a = (t / 16) * Math.PI * 2; pts.push({ x: c.x + c.r * Math.cos(a), y: c.y + c.r * Math.sin(a) }); }
    const h = convexHull(pts);
    if (h.length < 3) return "";
    const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    let d = "";
    for (let i = 0; i < h.length; i++) {
      const p0 = h[i], p1 = h[(i + 1) % h.length], m = mid(p0, p1);
      d += i === 0 ? `M ${mid(h[h.length - 1], p0).x.toFixed(1)} ${mid(h[h.length - 1], p0).y.toFixed(1)} ` : "";
      d += `Q ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} ${m.x.toFixed(1)} ${m.y.toFixed(1)} `;
    }
    return d + "Z";
  }

  function buildGspGraphSVG(node, width, height) {
    const gd = computeGspData();
    const ser = resolveGspSeries(node, gd);
    const g = ser ? gd.analysed[ser.id] : null;
    if (!ser || !g || !g.W || (ser.amps || []).length < 2) {
      return gspEmptySVG(width, height, "Select contacts on the DBS Lead with ≥ 2 GSP nodes");
    }
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height, class: "nr-svg" });
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width, height, fill: C.white }));

    const gp = getGspParams();
    const sizeKey = gp.node_size_metric === "local_beta" ? "local_beta" : "local_ftg";
    const hlIdx = state.selection.gsp_selected_node_idx;
    const hasHl = hlIdx !== null && hlIdx !== undefined;
    const K = ser.amps.length;
    const W = g.W;
    const fv = g.fiedler_vec || ser.amps.map(() => 0);
    const isSweep = ser.kind === "amplitude_sweep";
    const labels = ser.node_labels || ser.amps.map((a) => String(a));

    // ── two regimes = spectral bisection by the sign of the Fiedler vector (median split if degenerate)
    let regime = fv.map((v) => (v < 0 ? 1 : 0));
    if (regime.every((r) => r === regime[0])) {
      const med = fv.slice().sort((x, y) => x - y)[Math.floor(K / 2)];
      regime = fv.map((v) => (v < med ? 1 : 0));
    }
    // regime 0 = lower mean amplitude (sweeps) so "A" always reads as the low-dose regime
    if (isSweep) {
      const mean = (r) => { const xs = ser.amps.filter((_, k) => regime[k] === r); return xs.reduce((s2, x) => s2 + x, 0) / Math.max(1, xs.length); };
      if (mean(0) > mean(1)) regime = regime.map((r) => 1 - r);
    }
    const RC = [
      { fill: "#EEF0F4", stroke: C.grayDark, node: C.black, text: C.white, name: "A" },
      { fill: C.crimsonTint, stroke: C.crimson, node: C.crimson, text: C.white, name: "B" },
    ];

    // ── node sizes
    const loc = g[sizeKey] || ser.amps.map(() => 1);
    const maxLoc = Math.max(1e-9, ...loc);
    const baseR = clamp(Math.min(width, height) / (4.2 * Math.sqrt(K + 2)), 11, 22);
    const rad = loc.map((v) => baseR * (0.78 + 0.5 * (v / maxLoc)));

    // ── layout in unit space → fit to the drawing box (header row on top, legend row at the bottom)
    const P = gspRegimeLayout(W, g.U || [], regime, K, rad);
    // header row (≈30) + room for the regime labels above the hulls (≈36); legend row at the bottom
    const top = 66, bot = 34, side = 18;
    const bx0 = side, by0 = top, bw = width - 2 * side, bh = height - top - bot;
    const xs = P.map((q) => q.x), ys = P.map((q) => q.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const margin = Math.max(...rad) + 22;
    const sc = Math.min((bw - 2 * margin) / Math.max(1e-6, maxX - minX), (bh - 2 * margin) / Math.max(1e-6, maxY - minY));
    const cxu = (minX + maxX) / 2, cyu = (minY + maxY) / 2;
    let pos = P.map((q) => ({ x: bx0 + bw / 2 + (q.x - cxu) * sc, y: by0 + bh / 2 + (q.y - cyu) * sc }));
    // overlap removal (keeps labels readable)
    for (let pass = 0; pass < 40; pass++) {
      let moved = false;
      for (let i = 0; i < K; i++) for (let j = i + 1; j < K; j++) {
        const dx = pos[j].x - pos[i].x, dy = pos[j].y - pos[i].y;
        const d = Math.hypot(dx, dy) || 0.01, need = rad[i] + rad[j] + 8;
        if (d < need) {
          const push = (need - d) / 2, ux = dx / d, uy = dy / d;
          pos[i].x -= ux * push; pos[i].y -= uy * push; pos[j].x += ux * push; pos[j].y += uy * push;
          moved = true;
        }
      }
      for (let i = 0; i < K; i++) {
        // keep the hull (node + 16 px) inside the drawing box
        pos[i].x = clamp(pos[i].x, bx0 + rad[i] + 18, bx0 + bw - rad[i] - 18);
        pos[i].y = clamp(pos[i].y, by0 + rad[i] + 18, by0 + bh - rad[i] - 18);
      }
      if (!moved) break;
    }

    // ── regime areas (soft hulls) + labels (labels are drawn last, above the edges)
    const amps = ser.amps;
    const regimeLabels = [];
    for (const r of [0, 1]) {
      const idx = [...Array(K).keys()].filter((k) => regime[k] === r);
      if (!idx.length) continue;
      const d = blobPath(idx.map((k) => ({ x: pos[k].x, y: pos[k].y, r: rad[k] + 16 })));
      if (d) svg.appendChild(svgEl("path", { d, fill: RC[r].fill, stroke: RC[r].stroke, "stroke-width": 1.4, "stroke-dasharray": "7 5", opacity: 0.95 }));
      const yTop = Math.min(...idx.map((k) => pos[k].y - rad[k])) - 22;
      const xMid = idx.reduce((s2, k) => s2 + pos[k].x, 0) / idx.length;
      const rng = isSweep ? `${fmtNum(Math.min(...idx.map((k) => amps[k])), 1)}–${fmtNum(Math.max(...idx.map((k) => amps[k])), 1)} mA` : `${idx.length} pair${idx.length > 1 ? "s" : ""}`;
      const lab = `Regime ${RC[r].name} · ${rng}`;
      regimeLabels.push(svgEl("text", { x: clamp(xMid, bx0 + 90, bx0 + bw - 90), y: Math.max(48, yTop), "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: RC[r].stroke, stroke: C.white, "stroke-width": 4, "paint-order": "stroke", text: lab }));
    }

    // ── edges (readable backbone of the full affinity graph):
    //    within a regime: each node's 3 strongest neighbours + every very strong tie (≥ 70 % of max W);
    //    across the cut: the 3 strongest bridges only (dashed crimson). Cut share is computed on the full W.
    const maxW = Math.max(1e-9, ...W.flat());
    let cutW = 0, totW = 0;
    const keep = new Set();
    const cutList = [];
    for (let i = 0; i < K; i++) {
      const nb = [...Array(K).keys()].filter((j) => j !== i && regime[j] === regime[i]).sort((x, y) => W[i][y] - W[i][x]).slice(0, 3);
      for (const j of nb) keep.add(i < j ? `${i}|${j}` : `${j}|${i}`);
      for (let j = i + 1; j < K; j++) {
        const w = W[i][j];
        totW += w;
        if (regime[i] !== regime[j]) { cutW += w; cutList.push([i, j, w]); }
        else if (w >= 0.7 * maxW) keep.add(`${i}|${j}`);
      }
    }
    cutList.sort((e1, e2) => e2[2] - e1[2]);
    const edges = [...keep].map((k) => k.split("|").map(Number)).map(([i, j]) => [i, j, W[i][j]]).concat(cutList.slice(0, 3));
    edges.sort((e1, e2) => e1[2] - e2[2]);
    for (const [i, j, w] of edges) {
      const cut = regime[i] !== regime[j];
      const adj = hasHl && (i === hlIdx || j === hlIdx);
      const t = w / maxW;
      svg.appendChild(svgEl("line", {
        x1: pos[i].x.toFixed(1), y1: pos[i].y.toFixed(1), x2: pos[j].x.toFixed(1), y2: pos[j].y.toFixed(1),
        stroke: adj ? C.crimson : cut ? C.crimson : regime[i] ? "#C9707E" : C.gray,
        "stroke-width": (cut ? 1.6 : 1.2) + t * (cut ? 1.8 : 3.0) + (adj ? 1 : 0),
        "stroke-opacity": hasHl ? (adj ? 0.9 : 0.08) : cut ? 0.85 : 0.35 + 0.5 * t,
        "stroke-dasharray": cut ? "6 4" : null,
        "stroke-linecap": "round",
      }));
    }
    // titration order (amplitude sweeps): thin path through the steps in dose order
    if (isSweep && K > 2) {
      const order = [...Array(K).keys()].sort((p1, p2) => amps[p1] - amps[p2]);
      const d = order.map((k, n) => `${n ? "L" : "M"} ${pos[k].x.toFixed(1)} ${pos[k].y.toFixed(1)}`).join(" ");
      svg.appendChild(svgEl("path", { d, fill: "none", stroke: C.black, "stroke-width": 1.2, "stroke-dasharray": "1.5 4", "stroke-linecap": "round", opacity: hasHl ? 0.15 : 0.5 }));
    }

    // ── nodes
    for (let k = 0; k < K; k++) {
      const r = regime[k];
      const isHl = hlIdx === k;
      const grp = svgEl("g", { style: "cursor:pointer;" });
      grp.appendChild(svgEl("circle", { cx: pos[k].x, cy: pos[k].y, r: rad[k] + 3, fill: C.white, opacity: 0.95 }));
      grp.appendChild(svgEl("circle", {
        cx: pos[k].x, cy: pos[k].y, r: rad[k],
        fill: isHl ? C.crimsonDark : RC[r].node, stroke: isHl ? C.black : C.white, "stroke-width": isHl ? 3 : 1.6,
        opacity: hasHl && !isHl ? 0.55 : 1,
      }));
      const lbl = labels[k];
      const fs = clamp(rad[k] * 0.9, 10, 14);
      grp.appendChild(svgEl("text", { x: pos[k].x, y: pos[k].y + fs * 0.36, "text-anchor": "middle", fill: RC[r].text, "font-size": fs, "font-weight": 700, text: fitText([lbl], rad[k] * 2.1, fs, 700) || lbl }));
      grp.appendChild(svgEl("title", { text: `${lbl}${isSweep ? " mA" : ""} · regime ${RC[r].name} · u₂ = ${fmtNum(fv[k], 3)} · local ${sizeKey === "local_beta" ? "GTV(β)" : "GTV(FTG)"} = ${fmtNum(loc[k], 3)}` }));
      grp.addEventListener("mouseenter", () => setHover({ pair: `${ser.hemisphere}:${ser.pair}`, ampMa: isSweep ? ser.amps[k] : null }));
      grp.addEventListener("mouseleave", () => setHover({ pair: null, ampMa: null }));
      grp.addEventListener("click", (ev) => { ev.stopPropagation(); pickGspNode(k); });
      svg.appendChild(grp);
    }

    for (const t of regimeLabels) svg.appendChild(t);

    // ── header (one row) + legend (one row)
    const m = g.measures || {};
    const head = `${ser.label} · λ₂ = ${fmtNum(m.fiedler_value, 3)} · cut = ${fmtNum(totW ? (100 * cutW) / totW : 0, 0)} % of W · σ = ${fmtNum(g.sigma, 2)}`;
    svg.appendChild(svgEl("text", { x: 12, y: 21, "font-size": 14, "font-weight": 700, fill: C.ink, text: fitText([head, `${ser.label} · λ₂ = ${fmtNum(m.fiedler_value, 3)}`], width - 24, 14, 700) }));
    const ly = height - 10;
    let lx = 12;
    const legendItem = (draw, text) => {
      draw(lx, ly - 5);
      svg.appendChild(svgEl("text", { x: lx + 22, y: ly, "font-size": 12, fill: C.grayDark, text }));
      lx += 22 + textWidth(text, 12) + 16;
    };
    const dot = (col) => (x, y) => svg.appendChild(svgEl("circle", { cx: x + 8, cy: y, r: 6, fill: col }));
    const ln = (col, dash) => (x, y) => svg.appendChild(svgEl("line", { x1: x, y1: y, x2: x + 17, y2: y, stroke: col, "stroke-width": 2, "stroke-dasharray": dash }));
    legendItem(dot(RC[0].node), "Regime A (u₂ ≥ 0)");
    legendItem(dot(RC[1].node), "Regime B (u₂ < 0)");
    legendItem(ln(C.crimson, "6 4"), "strongest bridges across the cut");
    if (isSweep && K > 2 && lx + 140 < width) legendItem(ln(C.black, "1.5 4"), "dose order");
    const sz = `size ∝ local ${sizeKey === "local_beta" ? "GTV(β)" : "GTV(FTG)"}`;
    if (lx + textWidth(sz, 12) < width - 8) svg.appendChild(svgEl("text", { x: lx, y: ly, "font-size": 12, fill: C.gray, text: sz }));
    return svg;
  }

  function buildGspMatrixSVG(node, width, height) {
    const gd = computeGspData();
    const ser = resolveGspSeries(node, gd);
    const g = ser ? gd.analysed[ser.id] : null;
    const matKey = node.mode || "W";
    const mat = g ? g[matKey] : null;
    if (!ser || !mat || !mat.length) {
      return gspEmptySVG(width, height, "Graph operator matrix unavailable");
    }
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height, class: "nr-svg" });
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width, height, fill: C.white }));

    const K = mat.length;
    const labels = ser.node_labels || ser.amps.map((a) => String(a));
    const hlIdx = state.selection.gsp_selected_node_idx;
    const pad = { l: 66, r: 28, t: 36, b: 56 };
    const side = Math.max(80, Math.min(width - pad.l - pad.r, height - pad.t - pad.b));
    const ox = pad.l + (width - pad.l - pad.r - side) / 2;
    const oy = pad.t;
    const cell = side / K;

    const flat = mat.flat().filter(Number.isFinite);
    const vMin = Math.min(...flat);
    const vMax = Math.max(...flat);
    const isSigned = matKey === "L" || matKey === "Lsym";
    const absMax = Math.max(1e-6, Math.abs(vMin), Math.abs(vMax));

    for (let i = 0; i < K; i++) {
      for (let j = 0; j < K; j++) {
        const v = mat[i][j];
        const norm = (v - vMin) / Math.max(1e-6, vMax - vMin);
        const fill = isSigned ? gspDivColor(v / absMax) : specColor(norm);
        const isHl = hlIdx !== null && hlIdx !== undefined && (i === hlIdx || j === hlIdx);
        const r = svgEl("rect", {
          x: ox + j * cell,
          y: oy + i * cell,
          width: Math.max(1, cell - 1),
          height: Math.max(1, cell - 1),
          fill,
          stroke: isHl ? C.crimson : C.white,
          "stroke-width": isHl ? 2.1 : 0.6,
          style: "cursor:pointer;",
        });
        r.addEventListener("click", (ev) => { ev.stopPropagation(); pickGspNode(i); });
        svg.appendChild(r);
        if (cell >= 38) {
          const darkBg = isSigned ? Math.abs(v / absMax) > 0.55 : norm > 0.62;
          svg.appendChild(svgEl("text", {
            x: ox + (j + 0.5) * cell,
            y: oy + (i + 0.5) * cell + 5,
            "text-anchor": "middle",
            fill: darkBg ? C.white : C.black,
            "font-size": 14,
            "font-family": FONT_SANS,
            text: fmtNum(v, 2),
          }));
        }
      }
    }

    const step = Math.max(1, Math.ceil(K / 10));
    for (let k = 0; k < K; k += step) {
      const maxLblW = Math.max(...labels.map((lb) => textWidth(lb, 14, 600)));
      const stepX = Math.max(1, Math.ceil((maxLblW + 6) / Math.max(1, cell)));
      const stepY = Math.max(1, Math.ceil(17 / Math.max(1, cell)));
      if (k % stepY === 0 || hlIdx === k) svg.appendChild(svgEl("text", { x: ox - 8, y: oy + (k + 0.5) * cell + 5, "text-anchor": "end", fill: hlIdx === k ? C.crimson : C.ink, "font-size": 14, "font-weight": hlIdx === k ? 700 : 500, "font-family": FONT_SANS, text: labels[k] }));
      if (k % stepX === 0 || hlIdx === k) svg.appendChild(svgEl("text", { x: ox + (k + 0.5) * cell, y: oy + side + 20, "text-anchor": "middle", fill: hlIdx === k ? C.crimson : C.ink, "font-size": 14, "font-weight": hlIdx === k ? 700 : 500, "font-family": FONT_SANS, text: labels[k] }));
    }
    const titles = { W: "Affinity Matrix W (RBF)", L: "Combinatorial Laplacian L = D − W", Lsym: "Normalized Laplacian L_sym", d2: "Squared Log-PSD Distance d²" };
    svg.appendChild(svgEl("text", { x: ox, y: 22, fill: C.ink, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: `${titles[matKey] || matKey} · [${fmtNum(vMin, 2)}, ${fmtNum(vMax, 2)}] · σ = ${fmtNum(g.sigma, 2)}` }));
    svg.appendChild(svgEl("text", { x: ox + side / 2, y: oy + side + 44, "text-anchor": "middle", fill: C.ink, "font-size": 14, "font-weight": 600, "font-family": FONT_SANS, text: ser.kind === "amplitude_sweep" ? "Amplitude Node j (mA)" : "Montage Pair Node j" }));
    return svg;
  }

  function buildGspGftSVG(node, width, height) {
    const gd = computeGspData();
    const ser = resolveGspSeries(node, gd);
    const g = ser ? gd.analysed[ser.id] : null;
    if (!ser || !g || !g.lam || g.lam.length < 2) {
      return gspEmptySVG(width, height, "Need ≥ 2 nodes for Graph Fourier Transform");
    }
    const mode = node.mode || "gft";
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height, class: "nr-svg" });
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width, height, fill: C.white }));

    if (mode === "psd") {
      // Node-Pooled Welch Log10-PSD X_k(f)
      const pad = { l: 66, r: 24, t: 34, b: 48 };
      const pw = Math.max(100, width - pad.l - pad.r);
      const ph = Math.max(90, height - pad.t - pad.b);
      const freqs = gd.freqs;
      const X = ser.X || [];
      const labels = ser.node_labels || ser.amps.map((a) => String(a));
      const hlIdx = state.selection.gsp_selected_node_idx;
      const fMin = freqs[0], fMax = freqs[freqs.length - 1];
      const flat = X.flat().filter(Number.isFinite);
      const yMin = Math.min(...flat) - 0.15, yMax = Math.max(...flat) + 0.15;
      const sx = (f) => pad.l + ((f - fMin) / Math.max(1, fMax - fMin)) * pw;
      const sy = (v) => pad.t + (1 - (v - yMin) / Math.max(1e-6, yMax - yMin)) * ph;

      svg.appendChild(svgEl("rect", { x: sx(13), y: pad.t, width: Math.max(2, sx(30) - sx(13)), height: ph, fill: "rgba(17,19,23,0.06)" }));
      svg.appendChild(svgEl("text", { x: (sx(13) + sx(30)) / 2, y: pad.t + 16, "text-anchor": "middle", fill: C.black, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: "β" }));
      if (g.ftg_band) {
        svg.appendChild(svgEl("rect", { x: sx(g.ftg_band[0]), y: pad.t, width: Math.max(2, sx(g.ftg_band[1]) - sx(g.ftg_band[0])), height: ph, fill: "rgba(184,29,51,0.10)" }));
        svg.appendChild(svgEl("text", { x: (sx(g.ftg_band[0]) + sx(g.ftg_band[1])) / 2, y: pad.t + 16, "text-anchor": "middle", fill: C.crimson, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: "FTG" }));
      }
      for (let i = 0; i <= 4; i++) {
        const v = yMin + (i / 4) * (yMax - yMin);
        const yy = sy(v);
        svg.appendChild(svgEl("line", { x1: pad.l, y1: yy, x2: pad.l + pw, y2: yy, stroke: C.silverSoft, "stroke-width": 1 }));
        svg.appendChild(svgEl("text", { x: pad.l - 8, y: yy + 5, "text-anchor": "end", fill: C.grayDark, "font-size": 14, "font-family": FONT_SANS, text: fmtNum(v, 1) }));
      }
      const K = X.length;
      for (let k = 0; k < K; k++) {
        const isHl = hlIdx === k;
        const dim = hlIdx !== null && hlIdx !== undefined && !isHl;
        const col = isHl ? C.crimson : specColor(0.32 + 0.66 * (k / Math.max(1, K - 1)));
        const pts = freqs.map((f, fi) => `${sx(f).toFixed(1)},${sy(X[k][fi]).toFixed(1)}`).join(" ");
        const pl = svgEl("polyline", { points: pts, fill: "none", stroke: col, "stroke-width": isHl ? 3.2 : 1.8, "stroke-opacity": dim ? 0.22 : 0.92, style: "cursor:pointer;" });
        pl.addEventListener("click", (ev) => { ev.stopPropagation(); pickGspNode(k); });
        svg.appendChild(pl);
      }
      for (const fv of [10, 30, 60, 90, 120]) {
        if (fv >= fMin && fv <= fMax) {
          svg.appendChild(svgEl("text", { x: sx(fv), y: pad.t + ph + 20, "text-anchor": "middle", fill: C.grayDark, "font-size": 14, "font-family": FONT_SANS, text: String(fv) }));
        }
      }
      gspDrawAxes(svg, pad.l, pad.t, pw, ph, "Frequency (Hz) — click any curve to cross-highlight node", "log₁₀ PSD (μV²/Hz)");
      const hlTxt = hlIdx !== null && hlIdx !== undefined && labels[hlIdx] !== undefined ? `Highlighted node: ${labels[hlIdx]} (${ser.nwin?.[hlIdx] || 0} wins)` : `${ser.label} · ${labels[0]} → ${labels[K - 1]}`;
      svg.appendChild(svgEl("text", { x: pad.l, y: 20, fill: hlIdx !== null && hlIdx !== undefined ? C.crimson : C.ink, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: hlTxt }));
      return svg;
    }

    // Default mode: Graph Fourier Modes & Eigenvalue Spectrum
    const pad = { l: 64, r: 28, t: 36, b: 48 };
    const pw = Math.max(100, width - pad.l - pad.r);
    const ph = Math.max(90, height - pad.t - pad.b);
    const K = g.lam.length;
    const eB = g.E_beta || [], eF = g.E_ftg || [];
    const totB = eB.reduce((a, b) => a + b, 0) || 1;
    const totF = eF.reduce((a, b) => a + b, 0) || 1;
    const nB = eB.map((v) => v / totB);
    const nF = eF.map((v) => v / totF);
    const maxE = Math.max(0.18, ...nB, ...nF) * 1.15;
    const maxMu = Math.max(1, ...(g.mu || [1]));
    const bw = pw / K;

    const xCut = pad.l + Math.max(1, Math.floor(K / 2)) * bw;
    svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: xCut - pad.l, height: ph, fill: "rgba(232,235,240,0.48)" }));
    svg.appendChild(svgEl("line", { x1: xCut, y1: pad.t, x2: xCut, y2: pad.t + ph, stroke: C.gray, "stroke-width": 1.2, "stroke-dasharray": "5 4" }));
    svg.appendChild(svgEl("text", { x: pad.l + 8, y: pad.t + 18, fill: C.grayDark, "font-size": 14, "font-weight": 600, "font-family": FONT_SANS, text: "Smooth Half (LGFE)" }));

    for (let k = 0; k < K; k++) {
      const x = pad.l + k * bw + bw * 0.12;
      const wBar = Math.max(4, bw * 0.34);
      const hB = (nB[k] / maxE) * ph;
      const hF = (nF[k] / maxE) * ph;
      svg.appendChild(svgEl("rect", { x, y: pad.t + ph - hB, width: wBar, height: hB, fill: C.black, rx: 2 }));
      svg.appendChild(svgEl("rect", { x: x + wBar + 2, y: pad.t + ph - hF, width: wBar, height: hF, fill: C.crimson, rx: 2 }));
      if (K <= 14 || k % 2 === 0) {
        svg.appendChild(svgEl("text", { x: pad.l + (k + 0.5) * bw, y: pad.t + ph + 20, "text-anchor": "middle", fill: C.ink, "font-size": 14, "font-family": FONT_SANS, text: `u${k + 1}` }));
      }
    }

    const muPts = g.mu.map((m, k) => `${(pad.l + (k + 0.5) * bw).toFixed(1)},${(pad.t + ph - (m / maxMu) * ph * 0.88).toFixed(1)}`).join(" ");
    svg.appendChild(svgEl("polyline", { points: muPts, fill: "none", stroke: C.grayDark, "stroke-width": 2, "stroke-dasharray": "4 3" }));
    g.mu.forEach((m, k) => {
      svg.appendChild(svgEl("circle", { cx: pad.l + (k + 0.5) * bw, cy: pad.t + ph - (m / maxMu) * ph * 0.88, r: 3.5, fill: C.white, stroke: C.grayDark, "stroke-width": 1.6 }));
    });

    for (const f of [0, 0.5, 1]) {
      const yy = pad.t + ph - f * ph;
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: yy + 5, "text-anchor": "end", fill: C.grayDark, "font-size": 14, "font-family": FONT_SANS, text: `${Math.round(f * maxE * 100)}%` }));
    }
    gspDrawAxes(svg, pad.l, pad.t, pw, ph, "Normalized Laplacian Eigenmode k", "GFT Energy Share");
    svg.appendChild(svgEl("rect", { x: pad.l, y: 10, width: 12, height: 12, fill: C.black }));
    svg.appendChild(svgEl("text", { x: pad.l + 18, y: 21, fill: C.black, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: "β GFT" }));
    svg.appendChild(svgEl("rect", { x: pad.l + 84, y: 10, width: 12, height: 12, fill: C.crimson }));
    svg.appendChild(svgEl("text", { x: pad.l + 102, y: 21, fill: C.crimson, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: "FTG GFT" }));
    svg.appendChild(svgEl("text", { x: pad.l + 190, y: 21, fill: C.grayDark, "font-size": 14, "font-weight": 600, "font-family": FONT_SANS, text: `--- μ_k (max ${fmtNum(maxMu, 2)}) · LGFE_FTG = ${fmtNum(g.measures?.lgfe_ftg, 3)}` }));
    return svg;
  }

  function buildGspGtvSVG(node, width, height) {
    const gd = computeGspData();
    const ser = resolveGspSeries(node, gd);
    const g = ser ? gd.analysed[ser.id] : null;
    if (!ser || !g || !g.gtv_f || !g.gtv_f.length) {
      return gspEmptySVG(width, height, "No GSP spectral profiles available");
    }
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height, class: "nr-svg" });
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width, height, fill: C.white }));

    const m = g.measures || {};
    const kpis = [
      ["λ₂ Fiedler", fmtNum(m.fiedler_value, 3), false],
      ["GTV β", fmtNum(m.gtv_beta, 3), false],
      ["GTV FTG", fmtNum(m.gtv_ftg, 3), true],
      ["LGFE β", fmtNum(m.lgfe_beta, 3), false],
      ["LGFE FTG", fmtNum(m.lgfe_ftg, 3), true],
      ["GSE / Coh", `${fmtNum(m.gse_all, 2)} / ${fmtNum(m.coherence, 2)}`, false],
    ];
    const kw = (width - 32 - 5 * 8) / 6;
    kpis.forEach(([lbl, val, accent], idx) => {
      const kx = 16 + idx * (kw + 8);
      svg.appendChild(svgEl("rect", { x: kx, y: 8, width: kw, height: 54, rx: 4, fill: accent ? C.crimsonTint : C.alabaster, stroke: accent ? C.crimson : C.silver, "stroke-width": 1.1 }));
      svg.appendChild(svgEl("text", { x: kx + 8, y: 28, fill: accent ? C.crimson : C.grayDark, "font-size": 14, "font-weight": 600, "font-family": FONT_SANS, text: lbl }));
      svg.appendChild(svgEl("text", { x: kx + 8, y: 51, fill: accent ? C.crimson : C.black, "font-size": 15, "font-weight": 700, "font-family": FONT_SANS, text: val }));
    });

    const curveKey = node.mode || "gtv";
    const freqs = gd.freqs;
    const arr = curveKey === "lgfe" ? g.lgfe_f : curveKey === "gse" ? g.gse_f : curveKey === "coh" ? g.coh_f : g.gtv_f;
    const pad = { l: 66, r: 24, t: 82, b: 48 };
    const pw = Math.max(100, width - pad.l - pad.r);
    const ph = Math.max(80, height - pad.t - pad.b);
    const fMin = freqs[0], fMax = freqs[freqs.length - 1];
    const yMin = curveKey === "gtv" ? 0 : Math.min(...arr) - 0.04;
    const yMax = Math.max(yMin + 0.05, Math.max(...arr) * 1.12);
    const sx = (f) => pad.l + ((f - fMin) / Math.max(1, fMax - fMin)) * pw;
    const sy = (v) => pad.t + (1 - (v - yMin) / Math.max(1e-6, yMax - yMin)) * ph;

    svg.appendChild(svgEl("rect", { x: sx(13), y: pad.t, width: Math.max(2, sx(30) - sx(13)), height: ph, fill: "rgba(17,19,23,0.07)" }));
    svg.appendChild(svgEl("text", { x: (sx(13) + sx(30)) / 2, y: pad.t + 16, "text-anchor": "middle", fill: C.black, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: "β" }));
    if (g.ftg_band) {
      svg.appendChild(svgEl("rect", { x: sx(g.ftg_band[0]), y: pad.t, width: Math.max(2, sx(g.ftg_band[1]) - sx(g.ftg_band[0])), height: ph, fill: "rgba(184,29,51,0.12)" }));
      svg.appendChild(svgEl("text", { x: (sx(g.ftg_band[0]) + sx(g.ftg_band[1])) / 2, y: pad.t + 16, "text-anchor": "middle", fill: C.crimson, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: "FTG" }));
    }

    for (let i = 0; i <= 4; i++) {
      const v = yMin + (i / 4) * (yMax - yMin);
      const yy = sy(v);
      svg.appendChild(svgEl("line", { x1: pad.l, y1: yy, x2: pad.l + pw, y2: yy, stroke: C.silverSoft, "stroke-width": 1 }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: yy + 5, "text-anchor": "end", fill: C.grayDark, "font-size": 14, "font-family": FONT_SANS, text: fmtNum(v, 2) }));
    }

    const pts = freqs.map((f, i) => `${sx(f).toFixed(1)},${sy(arr[i]).toFixed(1)}`).join(" ");
    const area = `${sx(fMin).toFixed(1)},${(pad.t + ph).toFixed(1)} ${pts} ${sx(fMax).toFixed(1)},${(pad.t + ph).toFixed(1)}`;
    svg.appendChild(svgEl("polygon", { points: area, fill: curveKey === "gtv" ? "rgba(184,29,51,0.12)" : "rgba(17,19,23,0.08)" }));
    svg.appendChild(svgEl("polyline", { points: pts, fill: "none", stroke: curveKey === "gtv" ? C.crimson : C.black, "stroke-width": 2.4 }));

    if (state.hover.freqHz !== null && state.hover.freqHz >= fMin && state.hover.freqHz <= fMax) {
      const hx = sx(state.hover.freqHz);
      svg.appendChild(svgEl("line", { x1: hx, y1: pad.t, x2: hx, y2: pad.t + ph, stroke: C.crimson, "stroke-width": 1.3, "stroke-dasharray": "4 3" }));
    }

    for (const fv of [10, 30, 60, 90, 120]) {
      if (fv >= fMin && fv <= fMax) {
        svg.appendChild(svgEl("text", { x: sx(fv), y: pad.t + ph + 20, "text-anchor": "middle", fill: C.grayDark, "font-size": 14, "font-family": FONT_SANS, text: String(fv) }));
      }
    }
    const yLbl = curveKey === "lgfe" ? "LGFE(f)" : curveKey === "gse" ? "GSE(f)" : curveKey === "coh" ? "Coh(f)" : "GTV(f)";
    gspDrawAxes(svg, pad.l, pad.t, pw, ph, "Frequency (Hz)", yLbl);
    return svg;
  }

  function buildGspPhaseSVG(node, width, height) {
    const gd = computeGspData();
    const ser = resolveGspSeries(node, gd);
    const gp = getGspParams();
    const bandKey = gp.phase_band === "beta" ? "beta" : "ftg";
    const phData = ser?.phase?.[bandKey];
    if (!ser || !phData) return gspEmptySVG(width, height, "No oscillatory phase data for active series");

    const mode = node.mode || "clock";
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height, class: "nr-svg" });
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width, height, fill: C.white }));

    if (mode === "clock") {
      const rows = phData.clock || [];
      if (!rows.length) return gspEmptySVG(width, height, "No phase clock rows");
      const hlIdx = state.selection.gsp_selected_node_idx;
      const cx = width * 0.41;
      const cy = height * 0.54;
      const Rmax = Math.min(width * 0.31, height * 0.36);
      const maxR = Math.max(0.05, ...rows.map((c) => c.R));

      for (const f of [0.33, 0.67, 1.0]) {
        svg.appendChild(svgEl("circle", { cx, cy, r: Rmax * f, fill: "none", stroke: C.silver, "stroke-width": 1, "stroke-dasharray": f < 1 ? "4 4" : null }));
        // ring values on the 45° diagonal (keeps the +π/2 axis label clear)
        svg.appendChild(svgEl("text", { x: cx + Rmax * f * 0.7071 + 4, y: cy - Rmax * f * 0.7071 - 4, fill: C.gray, "font-size": 14, "font-family": FONT_SANS, text: fmtNum(maxR * f, 2) }));
      }
      svg.appendChild(svgEl("line", { x1: cx - Rmax - 12, y1: cy, x2: cx + Rmax + 12, y2: cy, stroke: C.silverSoft, "stroke-width": 1.2 }));
      svg.appendChild(svgEl("line", { x1: cx, y1: cy - Rmax - 12, x2: cx, y2: cy + Rmax + 12, stroke: C.silverSoft, "stroke-width": 1.2 }));
      svg.appendChild(svgEl("text", { x: cx + Rmax + 15, y: cy + 5, fill: C.ink, "font-size": 14, "font-family": FONT_SANS, text: "0" }));
      svg.appendChild(svgEl("text", { x: cx - Rmax - 24, y: cy + 5, fill: C.ink, "font-size": 14, "font-family": FONT_SANS, text: "π" }));
      svg.appendChild(svgEl("text", { x: cx, y: cy - Rmax - 16, "text-anchor": "middle", fill: C.ink, "font-size": 14, "font-family": FONT_SANS, text: "+π/2" }));

      const K = rows.length;
      rows.forEach((row, k) => {
        const isHl = hlIdx === k;
        const col = isHl ? C.crimson : specColor(0.32 + 0.68 * (k / Math.max(1, K - 1)));
        const rad = (row.R / maxR) * Rmax;
        const x2 = cx + rad * Math.cos(row.angle);
        const y2 = cy - rad * Math.sin(row.angle);
        svg.appendChild(svgEl("line", { x1: cx, y1: cy, x2, y2, stroke: col, "stroke-width": isHl ? 3.2 : 2, "stroke-opacity": hlIdx !== null && hlIdx !== undefined && !isHl ? 0.25 : 0.9 }));
        const dot = svgEl("circle", { cx: x2, cy: y2, r: isHl ? 7 : 5, fill: col, stroke: C.white, "stroke-width": 1.5, style: "cursor:pointer;" });
        dot.addEventListener("click", (ev) => { ev.stopPropagation(); pickGspNode(k); });
        svg.appendChild(dot);
      });

      const lx = width * 0.74;
      svg.appendChild(svgEl("text", { x: lx, y: 42, fill: C.black, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: "Node · Resultant R" }));
      rows.slice(0, 11).forEach((row, k) => {
        const yy = 66 + k * 24;
        if (yy > height - 14) return;
        const isHl = hlIdx === k;
        const col = isHl ? C.crimson : specColor(0.32 + 0.68 * (k / Math.max(1, K - 1)));
        svg.appendChild(svgEl("circle", { cx: lx + 6, cy: yy - 4, r: 4.5, fill: col }));
        const txt = svgEl("text", { x: lx + 16, y: yy, fill: isHl ? C.crimson : C.ink, "font-size": 14, "font-weight": isHl ? 700 : 500, "font-family": FONT_SANS, style: "cursor:pointer;", text: `${row.label} · ${fmtNum(row.R, 3)}` });
        txt.addEventListener("click", (ev) => { ev.stopPropagation(); pickGspNode(k); });
        svg.appendChild(txt);
      });

      svg.appendChild(svgEl("text", { x: 18, y: 24, fill: C.ink, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: `${bandKey.toUpperCase()} [${phData.band[0]}–${phData.band[1]} Hz] · Max R = ${fmtNum(maxR, 3)} · ${ser.label}` }));
      return svg;
    }

    // Takens Delay or Analytic Phase-Plane Loop
    const xs = mode === "loop" ? phData.loop_x : phData.delay_x;
    const ys = mode === "loop" ? phData.loop_y : phData.delay_y;
    if (!xs || !xs.length) return gspEmptySVG(width, height, "No phase portrait trajectory");
    const pad = { l: 64, r: 28, t: 34, b: 48 };
    const pw = Math.max(80, width - pad.l - pad.r);
    const ph = Math.max(80, height - pad.t - pad.b);
    const side = Math.min(pw, ph);
    const ox = pad.l + (pw - side) / 2;
    const oy = pad.t + (ph - side) / 2;
    const lim = 1.35;
    const sx = (v) => ox + ((v + lim) / (2 * lim)) * side;
    const sy = (v) => oy + (1 - (v + lim) / (2 * lim)) * side;

    svg.appendChild(svgEl("rect", { x: ox, y: oy, width: side, height: side, fill: C.alabaster, stroke: C.silver, "stroke-width": 1 }));
    svg.appendChild(svgEl("circle", { cx: sx(0), cy: sy(0), r: (1 / lim) * (side / 2), fill: "none", stroke: C.silver, "stroke-width": 1.2, "stroke-dasharray": "5 4" }));
    svg.appendChild(svgEl("line", { x1: ox, y1: sy(0), x2: ox + side, y2: sy(0), stroke: C.silverSoft, "stroke-width": 1 }));
    svg.appendChild(svgEl("line", { x1: sx(0), y1: oy, x2: sx(0), y2: oy + side, stroke: C.silverSoft, "stroke-width": 1 }));

    for (let i = 1; i < xs.length; i++) {
      const t = i / xs.length;
      svg.appendChild(svgEl("line", {
        x1: sx(xs[i - 1]), y1: sy(ys[i - 1]), x2: sx(xs[i]), y2: sy(ys[i]),
        stroke: t > 0.72 ? C.crimson : t > 0.35 ? C.black : C.gray,
        "stroke-width": t > 0.72 ? 2.2 : 1.5,
        "stroke-opacity": 0.35 + 0.65 * t,
      }));
    }
    svg.appendChild(svgEl("circle", { cx: sx(xs[xs.length - 1]), cy: sy(ys[ys.length - 1]), r: 5.5, fill: C.crimson, stroke: C.white, "stroke-width": 1.5 }));
    const xLbl = mode === "loop" ? "Re z(t) — Bandpass LFP (norm.)" : "x(t) — Bandpass LFP (norm.)";
    const yLbl = mode === "loop" ? "Im z(t) — Hilbert H[x](t)" : `x(t + τ), τ = ${phData.tau_ms} ms`;
    gspDrawAxes(svg, ox, oy, side, side, xLbl, yLbl);
    svg.appendChild(svgEl("text", { x: 18, y: 22, fill: C.ink, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: `${bandKey.toUpperCase()} [${phData.band[0]}–${phData.band[1]} Hz] · Active ${phData.seg_label}` }));
    return svg;
  }

  function buildGspSweepSVG(node, width, height) {
    const gd = computeGspData();
    const ser = resolveGspSeries(node, gd);
    if (!gd.series.length) return gspEmptySVG(width, height, "No GSP series in selected contacts");

    const mode = node.mode || "sigma";
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height, class: "nr-svg" });
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width, height, fill: C.white }));

    if (mode === "board") {
      // Multi-Series GSP Biomarker Comparison Board
      const pad = { l: 16, r: 16, t: 34, b: 14 };
      svg.appendChild(svgEl("text", { x: pad.l, y: 22, fill: C.ink, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: `Multi-Series GSP Board (${gd.hemisphere}) · σ = ${fmtNum(gd.sigma, 2)} — click row to activate` }));
      const cols = [
        { k: "label", lbl: "Series", x: pad.l + 6, anchor: "start" },
        { k: "n_nodes", lbl: "K", x: width * 0.37, anchor: "end" },
        { k: "fiedler_value", lbl: "λ₂", x: width * 0.48, anchor: "end" },
        { k: "gtv_beta", lbl: "GTV β", x: width * 0.60, anchor: "end" },
        { k: "gtv_ftg", lbl: "GTV FTG", x: width * 0.73, anchor: "end" },
        { k: "lgfe_ftg", lbl: "LGFE", x: width * 0.85, anchor: "end" },
        { k: "coherence", lbl: "Coh", x: width - pad.r - 6, anchor: "end" },
      ];
      svg.appendChild(svgEl("rect", { x: pad.l, y: pad.t, width: width - pad.l - pad.r, height: 28, fill: C.alabaster, stroke: C.silver }));
      for (const c of cols) {
        svg.appendChild(svgEl("text", { x: c.x, y: pad.t + 19, "text-anchor": c.anchor, fill: c.k === "gtv_ftg" ? C.crimson : C.black, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: c.lbl }));
      }
      const maxRows = Math.max(1, Math.floor((height - pad.t - 36) / 36));
      const rowH = Math.min(44, Math.max(32, (height - pad.t - 38) / Math.max(1, Math.min(maxRows, gd.series.length))));
      gd.series.slice(0, maxRows).forEach((s, i) => {
        const g = gd.analysed[s.id];
        const m = g?.measures || {};
        const isAct = ser && s.id === ser.id;
        const y = pad.t + 30 + i * rowH;
        const grp = svgEl("g", { style: "cursor:pointer;" });
        grp.appendChild(svgEl("rect", { x: pad.l, y, width: width - pad.l - pad.r, height: rowH - 3, rx: 4, fill: isAct ? C.crimsonTint : i % 2 === 0 ? C.white : C.alabaster, stroke: isAct ? C.crimson : C.silverSoft, "stroke-width": isAct ? 1.6 : 1 }));
        const vals = {
          label: s.label.length > 26 ? `${s.label.slice(0, 24)}…` : s.label,
          n_nodes: String(m.n_nodes ?? 0),
          fiedler_value: fmtNum(m.fiedler_value, 3),
          gtv_beta: fmtNum(m.gtv_beta, 3),
          gtv_ftg: fmtNum(m.gtv_ftg, 3),
          lgfe_ftg: fmtNum(m.lgfe_ftg, 3),
          coherence: fmtNum(m.coherence, 3),
        };
        for (const c of cols) {
          grp.appendChild(svgEl("text", {
            x: c.x,
            y: y + rowH * 0.62,
            "text-anchor": c.anchor,
            fill: isAct && (c.k === "label" || c.k === "gtv_ftg") ? C.crimson : c.k === "gtv_ftg" ? C.crimson : C.black,
            "font-size": 14,
            "font-weight": isAct || c.k === "gtv_ftg" ? 700 : 500,
            "font-family": FONT_SANS,
            text: vals[c.k],
          }));
        }
        grp.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const gp = getGspParams();
          gp.series_id = s.id;
          state.selection.gsp_selected_node_idx = null;
          _gspCacheKey = "";
          renderAll();
          syncToPython();
        });
        svg.appendChild(grp);
      });
      return svg;
    }

    // Kernel σ-Sensitivity Sweep
    const sw = gd.sigmaSweep || [];
    if (sw.length < 2) return gspEmptySVG(width, height, "Insufficient nodes for σ-sweep");
    const pad = { l: 66, r: 28, t: 38, b: 48 };
    const pw = Math.max(100, width - pad.l - pad.r);
    const ph = Math.max(80, height - pad.t - pad.b);
    const sMin = sw[0].sigma, sMax = sw[sw.length - 1].sigma;
    const sx = (sg) => pad.l + ((sg - sMin) / Math.max(0.1, sMax - sMin)) * pw;
    const sy = (v) => pad.t + (1 - clamp(v, 0, 1)) * ph;

    // Normalize each biomarker curve to [0, 1] of its sweep max so all 4 are directly comparable
    const curves = [
      { k: "fiedler_value", lbl: "λ₂ (Fiedler)", stroke: C.black, dash: "" },
      { k: "gtv_ftg",       lbl: "GTV FTG",      stroke: C.crimson, dash: "" },
      { k: "gtv_beta",      lbl: "GTV β",        stroke: C.grayDark, dash: "6 4" },
      { k: "lgfe_ftg",      lbl: "LGFE FTG",     stroke: C.crimson, dash: "3 3" },
    ];
    for (let i = 0; i <= 4; i++) {
      const yy = pad.t + (i / 4) * ph;
      svg.appendChild(svgEl("line", { x1: pad.l, y1: yy, x2: pad.l + pw, y2: yy, stroke: C.silverSoft, "stroke-width": 1 }));
      svg.appendChild(svgEl("text", { x: pad.l - 8, y: yy + 5, "text-anchor": "end", fill: C.grayDark, "font-size": 14, "font-family": FONT_SANS, text: `${Math.round((1 - i / 4) * 100)}%` }));
    }

    // Current σ cursor line
    const xCur = sx(clamp(gd.sigma, sMin, sMax));
    svg.appendChild(svgEl("line", { x1: xCur, y1: pad.t, x2: xCur, y2: pad.t + ph, stroke: C.crimson, "stroke-width": 2, "stroke-dasharray": "5 3" }));
    svg.appendChild(svgEl("text", { x: Math.min(pad.l + pw - 60, xCur + 6), y: pad.t + 16, fill: C.crimson, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: `σ = ${fmtNum(gd.sigma, 2)}` }));

    curves.forEach((cv, ci) => {
      const mx = Math.max(1e-6, ...sw.map((r) => Math.abs(r[cv.k] || 0)));
      const pts = sw.map((r) => `${sx(r.sigma).toFixed(1)},${sy((r[cv.k] || 0) / mx).toFixed(1)}`).join(" ");
      svg.appendChild(svgEl("polyline", { points: pts, fill: "none", stroke: cv.stroke, "stroke-width": 2.3, "stroke-dasharray": cv.dash || null }));
      sw.forEach((r) => {
        const dot = svgEl("circle", { cx: sx(r.sigma), cy: sy((r[cv.k] || 0) / mx), r: Math.abs(r.sigma - gd.sigma) < 0.15 ? 5.5 : 3.2, fill: Math.abs(r.sigma - gd.sigma) < 0.15 ? C.crimson : C.white, stroke: cv.stroke, "stroke-width": 1.6, style: "cursor:pointer;" });
        dot.addEventListener("click", (ev) => {
          ev.stopPropagation();
          getGspParams().sigma = r.sigma;
          _gspCacheKey = "";
          renderAll();
          syncToPython();
        });
        svg.appendChild(dot);
      });
      const lx = pad.l + ci * Math.min(138, pw / 4);
      svg.appendChild(svgEl("line", { x1: lx, y1: 16, x2: lx + 18, y2: 16, stroke: cv.stroke, "stroke-width": 2.5, "stroke-dasharray": cv.dash || null }));
      svg.appendChild(svgEl("text", { x: lx + 23, y: 21, fill: cv.stroke === C.crimson ? C.crimson : C.ink, "font-size": 14, "font-weight": 700, "font-family": FONT_SANS, text: cv.lbl }));
    });

    for (const sg of [0.5, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0]) {
      svg.appendChild(svgEl("text", { x: sx(sg), y: pad.t + ph + 20, "text-anchor": "middle", fill: Math.abs(sg - gd.sigma) < 0.15 ? C.crimson : C.grayDark, "font-size": 14, "font-weight": Math.abs(sg - gd.sigma) < 0.15 ? 700 : 500, "font-family": FONT_SANS, text: String(sg) }));
    }
    gspDrawAxes(svg, pad.l, pad.t, pw, ph, "RBF Kernel Bandwidth σ — click any point to set σ live", "Normalized Metric (% of max)");
    return svg;
  }

  // ── Node Card Builder (Expanded / Collapsed / Draggable / Resizable) ─
  /** Never let one object break the canvas: unexpected data → a neat in-object note. */
  function safeNodeBody(node, bodyW, bodyH, scale = 1) {
    const sc = scale > 0 ? scale : 1;
    const w = bodyW / sc, h = bodyH / sc;
    let out;
    try {
      const ap = nodeApplicable(node.type);
      out = !ap.ok && node.type !== "input" ? notApplicableSVG(node, w, h, ap.why) : buildNodeBodyContent(node, w, h);
    } catch (err) {
      console.warn("Titra: object could not be drawn", node.type, err);
      out = notApplicableSVG(node, w, h, `could not be drawn for this file (${(err && err.message) || err})`);
    }
    if (sc !== 1 && out instanceof SVGElement) {
      // same drawing, displayed BODY_SCALE× larger
      out.setAttribute("width", String(Math.round(bodyW)));
      out.setAttribute("height", String(Math.round(bodyH)));
    }
    return out;
  }
  /** Body height available below the header / formula strip / settings row(s). */
  function bodyHeightFor(node, hasSub, hasForm) {
    const two = node.type === "gt_arms" || node.type === "risk_map" || node.type === "opt_arena" || node.type === "gsp_graph";
    const subOff = two ? CHROME.sub + CHROME.sliders : hasSub ? (node.type === "ftg_controller" ? CHROME.sliders : CHROME.sub) : 0;
    const off = CHROME.header + CHROME.pad + (hasForm ? CHROME.form : 0) + subOff;
    const minH = node.type === "ftg_controller" ? 86 : 150;
    return Math.max(minH, node.h - off);
  }

  function notApplicableSVG(node, w, h, why) {
    const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}`, width: w, height: h });
    svg.appendChild(svgEl("rect", { x: 8, y: 8, width: w - 16, height: h - 16, rx: 8, fill: C.alabaster, stroke: C.silver, "stroke-dasharray": "6 5" }));
    svg.appendChild(svgEl("text", { x: w / 2, y: h / 2 - 8, "text-anchor": "middle", "font-size": 16, "font-weight": 700, fill: C.grayDark, text: "Not applicable to the loaded file" }));
    svg.appendChild(svgEl("text", { x: w / 2, y: h / 2 + 16, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: fitText([`${(NODE_CATALOG[node.type] || {}).label || node.type}: ${why}`], w - 40, 14) }));
    return svg;
  }

  function safeNodeSubbar(node) {
    try {
      const sub = buildNodeSubbar(node);
      try { decorateHemiPills(sub, node); } catch (_) { /* cosmetic */ }
      return sub;
    } catch (err) {
      console.warn("Titra: settings row failed", node.type, err);
      return el("div", { class: "nr-node-subbar" });
    }
  }

  function buildNodeBodyContent(node, bodyW, bodyH) {
    if (node.type === "input") return buildInputSVG(node, bodyW, bodyH);
    if (node.type === "lead") return buildDBSLeadSVG(node, bodyW, bodyH);
    if (node.type === "ftg_controller") return buildFTGControllerSVG(node, bodyW, bodyH);
    if (node.type === "lfp") return buildLFPSVG(node, bodyW, bodyH);
    if (node.type === "psd") return buildPSDSVG(node, bodyW, bodyH);
    if (node.type === "spectrogram") return buildSpectrogramSVG(node, bodyW, bodyH);
    if (node.type === "beta_ftg") return buildBetaFtgSVG(node, bodyW, bodyH);
    if (node.type === "montage") return buildMontageSVG(node, bodyW, bodyH);
    if (node.type === "phase") return buildPhaseSVG(node, bodyW, bodyH);
    if (node.type === "impedance") return buildImpedanceSVG(node, bodyW, bodyH);
    if (node.type === "trend") return buildTrendSVG(node, bodyW, bodyH);
    if (node.type === "gt_arms") return buildGTArmsSVG(node, bodyW, bodyH);
    if (node.type === "gt_nash") return buildGTNashSVG(node, bodyW, bodyH);
    if (node.type === "gt_minimax") return buildGTMinimaxSVG(node, bodyW, bodyH);
    if (node.type === "gt_stackelberg") return buildGTStackelbergSVG(node, bodyW, bodyH);
    if (node.type === "gt_bandit") return buildGTBanditSVG(node, bodyW, bodyH);
    if (node.type === "gt_consensus") return buildGTConsensusSVG(node, bodyW, bodyH);
    if (node.type === "risk_map") return buildRiskMapSVG(node, bodyW, bodyH);
    if (node.type === "risk_envelope") return buildRiskEnvelopeSVG(node, bodyW, bodyH);
    if (node.type === "risk_tail") return buildRiskTailSVG(node, bodyW, bodyH);
    if (node.type === "risk_return") return buildRiskReturnSVG(node, bodyW, bodyH);
    if (node.type === "risk_breach") return buildRiskBreachSVG(node, bodyW, bodyH);
    if (node.type === "risk_selection") return buildRiskSelectionSVG(node, bodyW, bodyH);
    if (node.type === "opt_arena") return buildOptArenaSVG(node, bodyW, bodyH);
    if (node.type === "opt_payoff") return buildOptPayoffSVG(node, bodyW, bodyH);
    if (node.type === "opt_lattice") return buildOptLatticeSVG(node, bodyW, bodyH);
    if (node.type === "opt_chain") return buildOptChainSVG(node, bodyW, bodyH);
    if (node.type === "opt_smile") return buildOptSmileSVG(node, bodyW, bodyH);
    if (node.type === "opt_selection") return buildOptSelectionSVG(node, bodyW, bodyH);
    if (node.type === "gsp_graph") return buildGspGraphSVG(node, bodyW, bodyH);
    if (node.type === "gsp_matrix") return buildGspMatrixSVG(node, bodyW, bodyH);
    if (node.type === "gsp_gft") return buildGspGftSVG(node, bodyW, bodyH);
    if (node.type === "gsp_gtv") return buildGspGtvSVG(node, bodyW, bodyH);
    if (node.type === "gsp_phase") return buildGspPhaseSVG(node, bodyW, bodyH);
    if (node.type === "gsp_sweep") return buildGspSweepSVG(node, bodyW, bodyH);

    if (node.type === "therapy") {
      const groups = (getPayload().groups || []).filter((g) => g.stage === "Final");
      const active = getActiveGroup();
      const grid = el("div", { class: "nr-group-grid" });
      for (const g of groups) {
        const isAct = active && active.id === g.id;
        const card = el("div", {
          class: `nr-group-card ${isAct ? "nr-group-active" : ""}`,
          onclick: (ev) => {
            ev.stopPropagation();
            state.activeGroupId = g.id;
            if (g.rate_hz) state.selection.stim_rate_hz = g.rate_hz;
            renderAll();
            syncToPython();
          },
        });
        card.appendChild(
          el("div", {
            class: "nr-group-head",
            html: `<span>${String(g.group_id).replace("GROUP_", "Group ")}${g.active ? ' <b class="nr-group-act">ACTIVE</b>' : ""}</span><span style="color:${C.crimson}">${g.rate_hz} Hz · FTG ${g.ftg_center_hz}</span>`,
          })
        );
        for (const [h, hp] of Object.entries(g.hemispheres || {})) {
          const neg = (hp.electrodes || []).filter((e) => e.polarity === "Negative");
          const cath = neg.map((e) => e.contact).join(" ");
          const tot = neg.reduce((acc, e) => acc + (Number(e.ma) || 0), 0);
          const full = neg.map((e) => `${e.contact} ${e.ma} mA`).join(", ");
          card.appendChild(
            el("div", {
              class: "nr-group-line",
              title: `${h}: cathodes ${full || "none"} · ${hp.pw_us} µs · sensing ${hp.sensing_pair || "—"}`,
              text: `${h[0]} −[${cath || "none"}] ${tot ? tot.toFixed(1) + " mA" : ""} · ${hp.pw_us} µs · S ${hp.sensing_pair || "—"}`,
            })
          );
        }
        grid.appendChild(card);
      }
      return grid;
    }

    if (node.type === "inspector") {
      const list = el("div", { class: "nr-scroll-list" });
      const selPaths = state.selection.json_paths || [];
      for (const sec of getPayload().json_sections || []) {
        const isPinned = selPaths.includes(sec.path);
        const row = el("div", {
          class: `nr-kv-row ${isPinned ? "nr-kv-selected" : ""}`,
          onclick: (ev) => {
            ev.stopPropagation();
            const cur = state.selection.json_paths || [];
            state.selection.json_paths = cur.includes(sec.path)
              ? cur.filter((x) => x !== sec.path)
              : [...cur, sec.path];
            renderAll();
            syncToPython();
          },
        }, [
          el("span", { class: "nr-kv-key", text: `${isPinned ? "✓ " : ""}${sec.key}` }),
          el("span", { class: "nr-kv-val", text: sec.value || `${sec.type} (${sec.count})` }),
        ]);
        list.appendChild(row);
        for (const ch of (sec.children || []).slice(0, 6)) {
          const cPin = selPaths.includes(ch.path);
          list.appendChild(
            el("div", {
              class: `nr-kv-row ${cPin ? "nr-kv-selected" : ""}`,
              style: "padding-left:22px;",
              onclick: (ev) => {
                ev.stopPropagation();
                const cur = state.selection.json_paths || [];
                state.selection.json_paths = cur.includes(ch.path)
                  ? cur.filter((x) => x !== ch.path)
                  : [...cur, ch.path];
                renderAll();
                syncToPython();
              },
            }, [
              el("span", { class: "nr-kv-key", text: `${cPin ? "✓ " : "· "}${ch.key}` }),
              el("span", { class: "nr-kv-val", text: ch.value }),
            ])
          );
        }
      }
      return list;
    }

    return el("div", { text: "Unknown object" });
  }

  // ── Welcome Hero Stage (First Appearance) & Input Progress Bar ──────
  let _welcomeDismissed = hasData();
  const _progress = {
    active: false,
    completing: false,
    pct: 0,
    phase: 0,
    startAt: 0,
    driverTimer: null,
    finishTimer: null,
    hideTimer: null,
  };

  function _clearProgressTimers() {
    if (_progress.driverTimer) { clearInterval(_progress.driverTimer); _progress.driverTimer = null; }
    if (_progress.finishTimer) { clearTimeout(_progress.finishTimer); _progress.finishTimer = null; }
    if (_progress.hideTimer) { clearTimeout(_progress.hideTimer); _progress.hideTimer = null; }
  }

  // Build subtle ambient harmonic waveform SVG behind the welcome hero
  function buildWelcomeAmbientSVG() {
    const svg = svgEl("svg", { class: "nr-welcome-waves", viewBox: "0 0 1440 520", preserveAspectRatio: "none", "aria-hidden": "true" });
    const waves = [
      { y: 210, amp: 34, freq: 2.2, phase: 0.4, stroke: C.crimson, op: 0.10, w: 1.6 },
      { y: 248, amp: 22, freq: 3.6, phase: 1.5, stroke: C.black, op: 0.06, w: 1.2 },
      { y: 288, amp: 42, freq: 1.6, phase: 2.4, stroke: C.crimson, op: 0.065, w: 1.2 },
      { y: 332, amp: 16, freq: 4.8, phase: 0.9, stroke: C.grayDark, op: 0.05, w: 1.0 },
    ];
    for (const wv of waves) {
      let d = "";
      for (let x = 0; x <= 1440; x += 24) {
        const t = x / 1440;
        const env = Math.sin(t * Math.PI);
        const y = wv.y + Math.sin(t * Math.PI * 2 * wv.freq + wv.phase) * wv.amp * (0.45 + 0.55 * env);
        d += (x === 0 ? `M ${x} ${y.toFixed(1)}` : ` L ${x} ${y.toFixed(1)}`);
      }
      svg.appendChild(svgEl("path", { d, fill: "none", stroke: wv.stroke, "stroke-width": wv.w, opacity: wv.op }));
    }
    return svg;
  }

  function buildUploadGlyphSVG(size = 24) {
    const s = svgEl("svg", { viewBox: "0 0 24 24", width: size, height: size, fill: "none", "aria-hidden": "true" });
    s.appendChild(svgEl("path", { d: "M12 16V4m0 0l-4.5 4.5M12 4l4.5 4.5", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    s.appendChild(svgEl("path", { d: "M4 16.5v1.25A2.25 2.25 0 006.25 20h11.5A2.25 2.25 0 0020 17.75V16.5", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    return s;
  }

  const welcomeDropTitleEl = el("div", { class: "nr-welcome-drop-title", text: "Drop an LFP JSON file here, or click to browse" });
  const welcomeErrTextEl = el("span", { class: "nr-welcome-err-text" });
  const welcomeErrEl = el("div", { class: "nr-welcome-err", hidden: "" }, [
    el("span", { class: "nr-welcome-err-icon", text: "✕" }),
    welcomeErrTextEl,
    el("button", {
      class: "nr-welcome-err-close",
      type: "button",
      title: "Dismiss",
      text: "✕",
      onclick: (ev) => {
        ev.stopPropagation();
        _inputLocalError = "";
        updateWelcomeError();
      },
    }),
  ]);
  const welcomeFolderWrap = el("div", { class: "nr-welcome-folder-wrap" });

  const welcomeBrowseBtn = el("button", {
    class: "nr-welcome-browse-btn",
    type: "button",
    title: "Choose one or more LFP JSON files",
    onclick: (ev) => { ev.stopPropagation(); inputUpload(); },
  }, [
    buildUploadGlyphSVG(16),
    el("span", { text: "Browse JSON" }),
  ]);

  const welcomeDropZone = el("div", {
    class: "nr-welcome-dropzone",
    role: "button",
    tabindex: "0",
    "aria-label": "Drop an LFP JSON file or click to browse",
    onclick: (ev) => { ev.stopPropagation(); inputUpload(); },
    onkeydown: (ev) => {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); inputUpload(); }
    },
  }, [
    el("div", { class: "nr-welcome-drop-icon" }, [buildUploadGlyphSVG(26)]),
    welcomeDropTitleEl,
    el("div", { class: "nr-welcome-drop-sub", text: "Medtronic Percept™ session reports & amplitude-titration exports · Drop multiple files to merge" }),
  ]);

  const welcomeInputBox = el("div", { class: "nr-welcome-input-box" }, [
    el("div", { class: "nr-welcome-box-head" }, [
      el("div", { class: "nr-welcome-box-ident" }, [
        el("span", { class: "nr-welcome-obj-badge", text: "INPUT" }),
        el("span", { class: "nr-welcome-obj-name", text: "LFP Input Object" }),
      ]),
      el("span", { class: "nr-welcome-privacy" }, [
        el("span", { class: "nr-welcome-live-dot" }),
        el("span", { text: "Local & private" }),
      ]),
    ]),
    welcomeDropZone,
    welcomeErrEl,
    el("div", { class: "nr-welcome-box-foot" }, [
      el("div", { class: "nr-welcome-foot-left" }, [
        el("span", { class: "nr-welcome-chip nr-welcome-chip-active" }, [
          el("span", { class: "nr-welcome-chip-dot" }),
          el("span", { text: "LFP · JSON" }),
        ]),
        el("span", { class: "nr-welcome-chip nr-welcome-chip-muted", title: "Planned modality" }, [
          el("span", { text: "MRI" }),
          el("span", { class: "nr-welcome-chip-tag", text: "soon" }),
        ]),
        el("span", { class: "nr-welcome-chip nr-welcome-chip-muted", title: "Planned modality" }, [
          el("span", { text: "CT" }),
          el("span", { class: "nr-welcome-chip-tag", text: "soon" }),
        ]),
        welcomeFolderWrap,
      ]),
      el("div", { class: "nr-welcome-foot-right" }, [welcomeBrowseBtn]),
    ]),
  ]);

  const welcomeCaps = [
    "Lead Model",
    "β & FTG Dynamics",
    "Game Theory",
    "Extreme-Value Risk",
    "Option Pricing",
    "Graph Signal Processing",
  ];
  const welcomeCapsEl = el("div", { class: "nr-welcome-caps" });
  welcomeCaps.forEach((cap, idx) => {
    if (idx > 0) welcomeCapsEl.appendChild(el("span", { class: "nr-welcome-cap-sep", text: "·" }));
    welcomeCapsEl.appendChild(el("span", { class: "nr-welcome-cap", text: cap }));
  });

  const welcomeClearedToastEl = el("div", { class: "nr-welcome-cleared-toast", hidden: "" }, [
    el("span", { class: "nr-welcome-cleared-dot" }),
    el("span", { text: "Studio cleared — ready for a new LFP JSON file" }),
  ]);

  const clearTipEl = el("div", { class: "nr-clear-tip", role: "tooltip", hidden: "" }, [
    el("span", { class: "nr-clear-tip-icon", text: "⚠" }),
    el("span", { text: "This click will clear the studio and current case" }),
  ]);

  let _clearedToastTimer = null;
  function showClearTip() {
    if (root.classList.contains("nr-welcome-mode")) return;
    const rr = root.getBoundingClientRect();
    const br = clearStudioBtn.getBoundingClientRect();
    if (!br.width) return;
    clearTipEl.removeAttribute("hidden");
    const left = clamp(br.left - rr.left, 12, Math.max(12, rr.width - 360));
    clearTipEl.style.left = `${Math.round(left)}px`;
    clearTipEl.style.top = `${Math.round(br.bottom - rr.top + 8)}px`;
  }
  function hideClearTip() {
    clearTipEl.setAttribute("hidden", "");
  }
  clearStudioBtn.addEventListener("mouseenter", showClearTip);
  clearStudioBtn.addEventListener("focus", showClearTip);
  clearStudioBtn.addEventListener("mouseleave", hideClearTip);
  clearStudioBtn.addEventListener("blur", hideClearTip);

  function clearStudioToWelcome() {
    hideClearTip();
    closeCtxMenu();
    if (typeof closeReportPanel === "function") closeReportPanel();
    _clearProgressTimers();
    _progress.active = false;
    _progress.completing = false;
    progressStageEl.setAttribute("hidden", "");
    progressStageEl.classList.remove("nr-progress-exit", "nr-progress-overlay", "nr-progress-fullscreen");
    root.classList.remove("nr-loading-mode");

    // Instantly clear client state and show Welcome page
    state.payload = {};
    state.focusNodeId = null;
    focusContainer.innerHTML = "";
    meta = {};
    _caps = null;
    _inputSel = null;
    _inputLocalError = "";
    _gtCacheKey = "";
    _riskCacheKey = "";
    _optCacheKey = "";
    _gspCacheKey = "";
    const bs = root.querySelector(".nr-brand-session");
    if (bs) bs.textContent = "No file loaded";

    _welcomeDismissed = false;
    loadPreset((presetSel && presetSel.value) || model.get("preset") || "beta_ftg");
    syncWelcomeVisibility();

    // Brief non-intrusive cleared toast on the welcome screen
    if (_clearedToastTimer) clearTimeout(_clearedToastTimer);
    welcomeClearedToastEl.classList.remove("nr-toast-fade");
    welcomeClearedToastEl.removeAttribute("hidden");
    _clearedToastTimer = setTimeout(() => {
      welcomeClearedToastEl.classList.add("nr-toast-fade");
      _clearedToastTimer = setTimeout(() => {
        welcomeClearedToastEl.setAttribute("hidden", "");
        welcomeClearedToastEl.classList.remove("nr-toast-fade");
      }, 280);
    }, 2600);

    // Sync clear to Python backend immediately & keep Titra favicon locked
    setTitraFavicon();
    inputRequest("clear");
  }

  const welcomeStageEl = el("div", { class: "nr-welcome-stage" }, [
    el("div", { class: "nr-welcome-bg" }, [
      el("div", { class: "nr-welcome-grid" }),
      el("div", { class: "nr-welcome-glow" }),
      buildWelcomeAmbientSVG(),
    ]),
    welcomeClearedToastEl,
    el("button", {
      class: "nr-welcome-fs-btn",
      type: "button",
      title: "Toggle full-screen studio",
      html: "⛶&nbsp;<span>Fullscreen</span>",
      onclick: (ev) => { ev.stopPropagation(); toggleRootFullscreen(); },
    }),
    el("div", { class: "nr-welcome-hero" }, [
      el("div", { class: "nr-welcome-logo-shell" }, [
        el("div", { class: "nr-welcome-aura nr-welcome-aura-1" }),
        el("div", { class: "nr-welcome-aura nr-welcome-aura-2" }),
        el("div", { class: "nr-welcome-medallion" }, [titraIcon(50)]),
      ]),
      el("h1", { class: "nr-welcome-title" }, [
        el("span", { text: "Welcome to " }),
        el("span", { class: "nr-welcome-accent", text: "Titra" }),
      ]),
      el("p", { class: "nr-welcome-subtitle", text: "DBS Programming & Electrophysiology Studio" }),
      welcomeInputBox,
      welcomeCapsEl,
    ]),
  ]);

  // ── Progress Stage (Shown immediately once an input is inserted; welcome message gone) ──
  const PROGRESS_STEPS = [
    { key: "read",    label: "Read",    detail: "Reading JSON file(s) from disk…" },
    { key: "verify",  label: "Verify",  detail: "Detecting & verifying Percept™ recording schema…" },
    { key: "analyse", label: "Analyse", detail: "Computing β/FTG, spectral, risk & graph bundles…" },
    { key: "studio",  label: "Studio",  detail: "Assembling interactive Titra DAG workspace…" },
  ];
  const progressTitleEl = el("div", { class: "nr-progress-title", text: "Building Titra Pipeline" });
  const progressPctEl = el("div", { class: "nr-progress-pct", text: "0%" });
  const progressFileEl = el("div", { class: "nr-progress-file", text: "" });
  const progressFillEl = el("div", { class: "nr-progress-fill" });
  const progressDetailEl = el("div", { class: "nr-progress-detail", text: PROGRESS_STEPS[0].detail });
  const progressStepEls = PROGRESS_STEPS.map((st, idx) =>
    el("div", { class: "nr-progress-step", "data-step": String(idx) }, [
      el("span", { class: "nr-progress-step-dot", text: String(idx + 1) }),
      el("span", { class: "nr-progress-step-lbl", text: st.label }),
    ])
  );

  const progressStageEl = el("div", { class: "nr-progress-stage", hidden: "" }, [
    el("div", { class: "nr-progress-card" }, [
      el("div", { class: "nr-progress-head" }, [
        el("div", { class: "nr-progress-logo" }, [titraIcon(38)]),
        el("div", { class: "nr-progress-meta" }, [
          progressTitleEl,
          progressFileEl,
        ]),
        progressPctEl,
      ]),
      el("div", { class: "nr-progress-track", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, [
        progressFillEl,
      ]),
      el("div", { class: "nr-progress-steps" }, progressStepEls),
      progressDetailEl,
    ]),
  ]);

  root.appendChild(welcomeStageEl);
  root.appendChild(progressStageEl);
  root.appendChild(clearTipEl);

  function updateWelcomeError() {
    const msg = _inputLocalError || "";
    if (msg && !_welcomeDismissed) {
      welcomeErrTextEl.textContent = msg;
      welcomeErrEl.removeAttribute("hidden");
    } else {
      welcomeErrEl.setAttribute("hidden", "");
    }
  }

  function refreshWelcomeFolderPicker() {
    welcomeFolderWrap.innerHTML = "";
    const files = (inputState().files || []);
    if (!files.length) return;
    const groups = {};
    for (const f of files) (groups[f.folder || "(data folder)"] ||= []).push(f);
    const opts = [el("option", { value: "", text: `…or pick from folder (${files.length})` })];
    for (const [g, fs] of Object.entries(groups)) {
      opts.push(el("optgroup", { label: g }, fs.map((f) =>
        el("option", { value: f.path, text: `${f.combined ? "⧉ " : ""}${f.name} · ${f.size}` })
      )));
    }
    const sel = el("select", {
      class: "nr-welcome-folder-sel",
      title: `Data folder: ${inputState().data_dir || ""}`,
      onclick: (ev) => ev.stopPropagation(),
      onchange: (ev) => {
        const v = ev.target.value;
        if (!v) return;
        const picked = files.find((f) => f.path === v);
        _inputLocalError = "";
        _inputSel = v;
        beginInputProgress([picked ? picked.name : v.split(/[\\/]/).pop()], "inspect_load");
        requestAnimationFrame(() => setTimeout(() => {
          setProgressPhase(1, 36);
          inputRequest("inspect_load", { path: v });
        }, 20));
      },
    }, opts);
    welcomeFolderWrap.appendChild(sel);
  }

  function syncWelcomeVisibility() {
    const showWelcome = !_welcomeDismissed && !hasData() && !_progress.active;
    root.classList.toggle("nr-welcome-mode", showWelcome);
    if (showWelcome) {
      welcomeStageEl.removeAttribute("hidden");
      refreshWelcomeFolderPicker();
      updateWelcomeError();
    } else {
      welcomeStageEl.setAttribute("hidden", "");
    }
  }

  function _renderProgressVisual() {
    const pct = Math.round(clamp(_progress.pct, 0, 100));
    progressFillEl.style.width = `${pct}%`;
    progressPctEl.textContent = `${pct}%`;
    const track = progressFillEl.parentElement;
    if (track) track.setAttribute("aria-valuenow", String(pct));
    progressStepEls.forEach((stepEl, idx) => {
      const done = pct >= 100 || idx < _progress.phase;
      const active = !done && idx === _progress.phase;
      stepEl.classList.toggle("nr-step-done", done);
      stepEl.classList.toggle("nr-step-active", active);
      const dot = stepEl.querySelector(".nr-progress-step-dot");
      if (dot) dot.textContent = done ? "✓" : String(idx + 1);
    });
  }

  function setProgressPhase(phaseIdx, minPct, customDetail) {
    if (!_progress.active) return;
    _progress.phase = Math.max(_progress.phase, clamp(phaseIdx, 0, PROGRESS_STEPS.length - 1));
    if (typeof minPct === "number") _progress.pct = Math.max(_progress.pct, minPct);
    progressDetailEl.textContent = customDetail || PROGRESS_STEPS[_progress.phase].detail;
    _renderProgressVisual();
  }

  function beginInputProgress(fileNames, action) {
    _clearProgressTimers();
    _welcomeDismissed = true; // Welcome message disappears permanently once input is inserted
    _progress.active = true;
    _progress.completing = false;
    _progress.pct = 8;
    _progress.phase = 0;
    _progress.startAt = performance.now();

    const names = (fileNames || []).filter(Boolean);
    const fileLabel = names.length > 1
      ? `${names[0]} + ${names.length - 1} more file${names.length > 2 ? "s" : ""}`
      : (names[0] || "LFP JSON session");
    const isMerge = action === "add" && hasData();
    progressTitleEl.textContent = isMerge ? "Merging LFP Session" : "Building Titra Pipeline";
    progressFileEl.textContent = fileLabel;
    progressDetailEl.textContent = PROGRESS_STEPS[0].detail;

    welcomeStageEl.setAttribute("hidden", "");
    root.classList.remove("nr-welcome-mode");
    root.classList.add("nr-loading-mode");
    progressStageEl.classList.remove("nr-progress-exit");
    progressStageEl.classList.toggle("nr-progress-overlay", hasData());
    progressStageEl.classList.toggle("nr-progress-fullscreen", !hasData());
    progressStageEl.removeAttribute("hidden");
    _renderProgressVisual();

    // Smooth asymptotic driver while Python verifies & parses
    _progress.driverTimer = setInterval(() => {
      if (!_progress.active || _progress.completing) return;
      const elapsed = performance.now() - _progress.startAt;
      if (_progress.phase === 0) {
        // Gentle motion during file read if browser doesn't emit granular onprogress
        _progress.pct = Math.min(30, _progress.pct + 1.4);
      } else if (_progress.phase === 1) {
        _progress.pct = Math.min(62, _progress.pct + (64 - _progress.pct) * 0.085);
        if (_progress.pct >= 58 || elapsed > 900) {
          _progress.phase = 2;
          progressDetailEl.textContent = PROGRESS_STEPS[2].detail;
        }
      } else if (_progress.phase === 2) {
        _progress.pct = Math.min(93, _progress.pct + (95 - _progress.pct) * 0.045);
      }
      _renderProgressVisual();
    }, 75);
  }

  function finishInputProgress(ok) {
    if (!_progress.active) return;
    if (_progress.completing && ok) return;
    _clearProgressTimers();
    _progress.completing = true;

    const revealStudio = () => {
      progressStageEl.classList.add("nr-progress-exit");
      _progress.hideTimer = setTimeout(() => {
        _progress.active = false;
        _progress.completing = false;
        progressStageEl.setAttribute("hidden", "");
        progressStageEl.classList.remove("nr-progress-exit", "nr-progress-overlay", "nr-progress-fullscreen");
        root.classList.remove("nr-loading-mode");
        syncWelcomeVisibility();
        fitCanvasLegible();
      }, 240);
    };

    if (ok) {
      const elapsed = performance.now() - _progress.startAt;
      const minShow = Math.max(0, 560 - elapsed);
      setProgressPhase(3, 96, PROGRESS_STEPS[3].detail);
      _progress.finishTimer = setTimeout(() => {
        _progress.pct = 100;
        _progress.phase = 3;
        progressDetailEl.textContent = "Pipeline ready — opening Titra studio";
        _renderProgressVisual();
        _progress.finishTimer = setTimeout(revealStudio, 320);
      }, minShow);
    } else {
      // Verification failed or aborted — dismiss progress bar cleanly & land on LFP Input diagnostics (no welcome)
      _progress.finishTimer = setTimeout(revealStudio, 140);
    }
  }

  // ── Data Input object ───────────────────────────────────────────────
  let _inputPending = null;
  let _inputSel = null;
  function inputState() {
    return model.get("input_state") || {};
  }
  function inputRequest(action, extra = {}) {
    const id = `in_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    _inputPending = { id, action };
    model.set("input_request", Object.assign({ id, action }, extra));
    model.save_changes();
    renderInputNodes();
  }
  function renderInputNodes() {
    if (state.nodes.some((n) => n.type === "input")) renderAll();
  }
  const onInputStateChange = () => {
    const st = inputState();
    const prevAction = _inputPending ? _inputPending.action : "";
    if (_inputPending && (st.id === _inputPending.id || _inputPending.id === "reading")) _inputPending = null;
    if (st.selected) _inputSel = st.selected;
    if (!_welcomeDismissed) refreshWelcomeFolderPicker();
    renderInputNodes();
    if (_progress.active && !_progress.completing && !_inputPending && prevAction !== "scan") {
      // Request completed without triggering change:payload (e.g., invalid JSON, merge conflict, or nothing new)
      finishInputProgress(false);
    }
  };
  model.on("change:input_state", onInputStateChange);

  function handleInputFile(f) {
    if (!f) return;
    if (!/\.json$/i.test(f.name) && f.type !== "application/json") {
      _inputLocalError = `${f.name}: only JSON files are LFP inputs today (MRI / CT inputs are planned).`;
      _inputSel = null;
      updateWelcomeError();
      renderInputNodes();
      return;
    }
    if (f.size > 160e6) {
      _inputLocalError = `${f.name} is ${(f.size / 1e6).toFixed(0)} MB — too large to send from the browser; copy it into the data folder and pick it from the list.`;
      updateWelcomeError();
      renderInputNodes();
      return;
    }
    _inputLocalError = "";
    _inputSel = `upload:${f.name}`;
    _inputPending = { id: "reading", action: "upload" };
    beginInputProgress([f.name], "upload");
    renderInputNodes();
    // Yield a frame so the welcome screen disappears and the progress bar paints before FileReader / btoa
    requestAnimationFrame(() => setTimeout(() => {
      const rd = new FileReader();
      rd.onprogress = (ev) => {
        if (ev.lengthComputable && ev.total > 0) {
          const frac = ev.loaded / ev.total;
          setProgressPhase(0, Math.round(8 + frac * 24), `Reading ${f.name} (${Math.round(frac * 100)}%)…`);
        }
      };
      rd.onerror = () => {
        _inputPending = null;
        _inputLocalError = `Could not read ${f.name}.`;
        finishInputProgress(false);
        renderInputNodes();
      };
      rd.onload = () => {
        setProgressPhase(1, 35, `Encoding & verifying ${f.name}…`);
        requestAnimationFrame(() => {
          const u8 = new Uint8Array(rd.result);
          let bin = "";
          for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
          inputRequest("upload", { name: f.name, b64: btoa(bin) });
        });
      };
      rd.readAsArrayBuffer(f);
    }, 20));
  }
  /** Read several JSON files to base64 and hand them to Python in one request. */
  function readFilesB64(files, done) {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    const bad = list.find((f) => !/\.json$/i.test(f.name) && f.type !== "application/json");
    if (bad) { _inputLocalError = `${bad.name}: only JSON files are LFP inputs today (MRI / CT inputs are planned).`; updateWelcomeError(); renderInputNodes(); return; }
    const big = list.find((f) => f.size > 160e6);
    if (big) { _inputLocalError = `${big.name} is ${(big.size / 1e6).toFixed(0)} MB — too large to send from the browser; copy it into the data folder and pick it from the list.`; updateWelcomeError(); renderInputNodes(); return; }
    _inputLocalError = "";
    _inputPending = { id: "reading", action: "add" };
    beginInputProgress(list.map((f) => f.name), "add");
    renderInputNodes();
    requestAnimationFrame(() => setTimeout(() => {
      const out = new Array(list.length);
      const totalBytes = list.reduce((s, f) => s + (f.size || 1), 0);
      const loadedBytes = new Array(list.length).fill(0);
      let left = list.length;
      list.forEach((f, i) => {
        const rd = new FileReader();
        rd.onprogress = (ev) => {
          if (ev.lengthComputable) {
            loadedBytes[i] = ev.loaded;
            const frac = clamp(loadedBytes.reduce((a, b) => a + b, 0) / totalBytes, 0, 1);
            setProgressPhase(0, Math.round(8 + frac * 24), `Reading ${list.length} JSON files (${Math.round(frac * 100)}%)…`);
          }
        };
        rd.onerror = () => {
          _inputPending = null;
          _inputLocalError = `Could not read ${f.name}.`;
          finishInputProgress(false);
          renderInputNodes();
        };
        rd.onload = () => {
          loadedBytes[i] = f.size || 1;
          const u8 = new Uint8Array(rd.result);
          let bin = "";
          for (let k = 0; k < u8.length; k += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(k, k + 0x8000));
          out[i] = { name: f.name, b64: btoa(bin) };
          if (--left === 0) {
            setProgressPhase(1, 36);
            requestAnimationFrame(() => done(out));
          }
        };
        rd.readAsArrayBuffer(f);
      });
    }, 20));
  }
  /** Merge more files into the loaded data (or start a dataset from several files with replace=true). */
  function addInputFiles(files, replace = false) {
    readFilesB64(files, (items) => inputRequest("add", { files: items, replace }));
  }
  function inputAddPicker() {
    const inp = el("input", { type: "file", accept: INPUT_MODALITIES.lfp.accept, multiple: "multiple", style: "display:none" });
    inp.addEventListener("change", () => addInputFiles(inp.files));
    document.body.appendChild(inp);
    inp.click();
    setTimeout(() => inp.remove(), 60000);
  }
  function inputUpload() {
    const inp = el("input", { type: "file", accept: INPUT_MODALITIES.lfp.accept, multiple: "multiple", style: "display:none" });
    inp.addEventListener("change", () => {
      const fs = Array.from(inp.files || []);
      if (fs.length > 1) addInputFiles(fs, true); // several files → one dataset (replaces what is loaded)
      else handleInputFile(fs[0]);
    });
    document.body.appendChild(inp);
    inp.click();
    setTimeout(() => inp.remove(), 60000);
  }
  let _inputLocalError = "";

  function buildInputSubbar(sub) {
    const st = inputState();
    const files = st.files || [];
    const cur = _inputSel || st.selected || st.loaded || "";
    const busy = !!_inputPending;
    const stop = (ev) => ev.stopPropagation();
    sub.appendChild(el("button", { class: "nr-pill nr-pill-black", text: "Browse…", title: "Choose an LFP JSON file (or drag & drop it onto the canvas)", onclick: (ev) => { stop(ev); inputUpload(); } }));
    const groups = {};
    for (const f of files) (groups[f.folder || "(data folder)"] ||= []).push(f);
    const opts = [el("option", { value: "", text: files.length ? `…or pick from data folder (${files.length})` : "Data folder is empty" })];
    const nSrc = ((st.report && st.report.sources) || st.sources || []).length;
    if (cur.startsWith("upload:")) opts.push(el("option", { value: cur, text: nSrc > 1 && st.report ? `⧉ ${st.report.file}` : `⤒ ${cur.slice(7)}` }));
    if (cur && !cur.startsWith("upload:") && !files.some((f) => f.path === cur)) opts.push(el("option", { value: cur, text: (st.report && st.report.file) || cur }));
    for (const [g, fs] of Object.entries(groups)) {
      opts.push(el("optgroup", { label: `Open · ${g}` }, fs.map((f) => el("option", { value: f.path, text: `${f.combined ? "⧉ " : ""}${f.name} · ${f.size}` }))));
    }
    if (st.loaded) {
      // same files again, as "add to the loaded data" entries
      opts.push(el("optgroup", { label: "＋ Add to the loaded data" },
        files.map((f) => el("option", { value: `add:${f.path}`, text: `＋ ${f.combined ? "⧉ " : ""}${f.name}` }))));
    }
    const sel = el("select", {
      class: "nr-select nr-input-file", title: `Data folder: ${st.data_dir || ""}`,
      onmousedown: stop, onclick: stop,
      onchange: (ev) => {
        const v = ev.target.value;
        if (!v || v.startsWith("upload:")) return;
        _inputLocalError = "";
        if (v.startsWith("add:")) {
          const p = v.slice(4);
          const picked = files.find((f) => f.path === p);
          ev.target.value = cur;
          beginInputProgress([picked ? picked.name : p.split(/[\\/]/).pop()], "add");
          requestAnimationFrame(() => setTimeout(() => { setProgressPhase(1, 36); inputRequest("add", { path: p }); }, 20));
          return;
        }
        const picked = files.find((f) => f.path === v);
        _inputSel = v;
        beginInputProgress([picked ? picked.name : v.split(/[\\/]/).pop()], "inspect_load");
        requestAnimationFrame(() => setTimeout(() => { setProgressPhase(1, 36); inputRequest("inspect_load", { path: v }); }, 20));
      },
    }, opts);
    sel.value = cur;
    if (files.length || (cur && !cur.startsWith("upload:"))) sub.appendChild(sel);
    if (st.loaded) {
      sub.appendChild(el("button", {
        class: "nr-pill nr-pill-crimson", text: "＋ Add file…",
        title: "Add more files of the same structure to the loaded data (merged into every object; conflicting files are rejected)",
        onclick: (ev) => { stop(ev); inputAddPicker(); },
      }));
      sub.appendChild(el("button", { class: "nr-pill", text: "✕ Clear", title: "This click will clear the studio and unload the current case", onclick: (ev) => { stop(ev); clearStudioToWelcome(); } }));
    }
    if (files.length) sub.appendChild(el("button", { class: "nr-pill", text: "⟳", title: "Rescan the data folder", onclick: (ev) => { stop(ev); inputRequest("scan"); } }));
    if (busy) sub.appendChild(el("span", { class: "nr-input-busy", text: _inputPending.action === "scan" ? "Scanning…" : _inputPending.action === "add" ? "Checking & merging…" : "Checking & loading…" }));
  }

  /** SVG verification panel of the Data Input object (also used for SVG/PNG/PDF export). */
  function buildInputSVG(node, width, height) {
    const st = inputState();
    const cur = _inputSel || st.selected || st.loaded || "";
    const rep = st.report && st.selected === cur ? st.report : null;
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
    const W = width - 8;
    let y = 6;
    const txt = (x, yy, t, o = {}) => svg.appendChild(svgEl("text", Object.assign({ x, y: yy, "font-size": 14, fill: C.black, text: t }, o)));

    const err = _inputLocalError || st.error;
    if (!rep && !err) {
      const zh = Math.max(170, height - 16);
      const zone = svgEl("g", { style: "cursor:pointer", class: "nr-drop-zone" });
      zone.appendChild(svgEl("rect", { x: 4, y, width: W, height: zh, rx: 10, fill: C.alabaster, stroke: C.crimson, "stroke-width": 2, "stroke-dasharray": "10 7" }));
      const cx = 4 + W / 2;
      y += Math.max(0, (zh - 180) / 2) - 6; // centre the glyph + text in the zone
      zone.appendChild(svgEl("path", { d: `M ${cx} ${y + 38} v 46 M ${cx - 18} ${y + 58} l 18 -20 l 18 20`, fill: "none", stroke: C.crimson, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }));
      zone.appendChild(svgEl("rect", { x: cx - 34, y: y + 92, width: 68, height: 6, rx: 3, fill: C.crimson }));
      zone.appendChild(svgEl("text", { x: cx, y: y + 128, "text-anchor": "middle", "font-size": 18, "font-weight": 700, fill: C.black, text: _inputPending ? "Checking & loading…" : "Drop an LFP JSON file" }));
      zone.appendChild(svgEl("text", { x: cx, y: y + 152, "text-anchor": "middle", "font-size": 14, fill: C.gray, text: "or click to browse" }));
      zone.addEventListener("click", (ev) => { ev.stopPropagation(); inputUpload(); });
      svg.appendChild(zone);
      return svg;
    }

    // Status banner
    const status = err && !rep ? "error" : rep.status;
    const isReady = status === "ready", isPartial = status === "partial";
    const stroke = isReady ? C.black : isPartial ? C.grayDark : C.crimson;
    const fill = isReady ? C.white : isPartial ? C.alabaster : C.crimsonTint;
    svg.appendChild(svgEl("rect", { x: 4, y, width: W, height: 66, rx: 6, fill, stroke, "stroke-width": 2 }));
    const tag = isReady ? "✓ VERIFIED" : isPartial ? "⚠ PARTIAL" : "✕ NOT USABLE";
    const tagW = textWidth(tag, 13, 700) + 18;
    svg.appendChild(svgEl("rect", { x: 16, y: y + 12, width: tagW, height: 22, rx: 3, fill: stroke }));
    txt(16 + tagW / 2, y + 28, tag, { "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: C.white });
    const fmt = rep ? rep.format_label : "Request failed";
    txt(28 + tagW, y + 29, fitText([fmt], W - tagW - 200, 15, 700), { "font-size": 15, "font-weight": 700 });
    const loadedHere = rep && st.loaded && st.loaded === cur;
    txt(W - 8, y + 29, loadedHere ? "● loaded in DAG" : (rep && rep.ok ? "ready to load" : ""), { "text-anchor": "end", "font-weight": 700, fill: loadedHere ? C.crimson : C.gray });
    const sumLine = rep ? `${rep.summary} · ${rep.file}${rep.size ? " · " + rep.size : ""} · checked in ${rep.elapsed_s}s` : err;
    txt(16, y + 54, fitText([sumLine], W - 24, 14), { fill: isReady || isPartial ? C.grayDark : C.crimson });
    y += 80;

    // Result of the last "＋ Add file" (merged / nothing new / rejected because of conflicts)
    const ar = st.add_result;
    if (ar && ar.message) {
      const okA = !!ar.ok, same = !!ar.nothing_new;
      const conf = okA ? [] : (ar.conflicts || []).slice(0, 4);
      const warns = (ar.warnings || []).slice(0, 2);
      const bh = 46 + (conf.length + warns.length) * 20;
      const strokeA = okA ? (same ? C.gray : C.black) : C.crimson;
      svg.appendChild(svgEl("rect", { x: 4, y, width: W, height: bh, rx: 6, fill: okA ? C.white : C.crimsonTint, stroke: strokeA, "stroke-width": 1.6, "stroke-dasharray": okA ? "none" : "6 4" }));
      const tagA = okA ? (same ? "= NO CHANGE" : "＋ ADDED") : "✕ NOT ADDED";
      const twA = textWidth(tagA, 12, 700) + 16;
      svg.appendChild(svgEl("rect", { x: 14, y: y + 10, width: twA, height: 20, rx: 3, fill: strokeA }));
      txt(14 + twA / 2, y + 24, tagA, { "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: C.white });
      txt(24 + twA, y + 25, fitText([ar.message], W - twA - 36, 14, 600), { "font-weight": 600, fill: okA ? C.black : C.crimson });
      let yy = y + 46;
      for (const c of conf) { txt(24, yy, "✕", { "font-weight": 700, fill: C.crimson }); txt(44, yy, fitText([c], W - 56, 13), { "font-size": 13, fill: C.crimson }); yy += 20; }
      for (const w of warns) { txt(24, yy, "⚠", { "font-weight": 700, fill: C.grayDark }); txt(44, yy, fitText([w], W - 56, 13), { "font-size": 13, fill: C.grayDark }); yy += 20; }
      y += bh + 10;
    }

    const section = (label) => { txt(10, y + 12, label, { "font-size": 12, "font-weight": 700, fill: C.crimson, "letter-spacing": "0.06em" }); y += 20; };
    const glyph = { ok: "✓", warn: "⚠", missing: "—", fail: "✕" };
    const gcol = { ok: C.black, warn: C.grayDark, missing: C.silver, fail: C.crimson };
    const rowH = 22;
    const colItem = Math.min(270, Math.max(222, W * 0.36));

    const srcs = (loadedHere && (rep.sources || st.sources)) || [];
    if (srcs.length > 1 || (srcs.length === 1 && loadedHere)) {
      section(`LOADED FILES (${srcs.length})${srcs.length > 1 ? " · merged into one dataset" : ""}`);
      srcs.forEach((f, i) => {
        if (y + rowH > height - 4) return;
        txt(14, y + 14, `${i + 1}`, { "font-weight": 700, fill: i ? C.crimson : C.black });
        const nmW = Math.min(360, Math.max(220, W * 0.46));
        txt(36, y + 14, fitText([`${f.name}${f.size ? " · " + f.size : ""}`, f.name], nmW - 30, 14, 700), { "font-weight": 700 });
        txt(nmW + 14, y + 14, fitText([f.added || ""], W - nmW - 22, 14), { fill: i ? C.grayDark : C.gray });
        y += rowH;
      });
      y += 8;
    }
    if (rep && rep.checks && rep.checks.length) {
      section("DETECTED DATA");
      rep.checks.forEach((c, i) => {
        if (y + rowH > height - 4) return;
        if (i % 2 === 0) svg.appendChild(svgEl("rect", { x: 4, y: y - 2, width: W, height: rowH, fill: C.alabaster }));
        txt(14, y + 14, glyph[c.status] || "·", { "font-weight": 700, fill: gcol[c.status] || C.gray });
        txt(36, y + 14, fitText([c.item], colItem - 30, 14, 700), { "font-weight": 700, fill: c.status === "missing" ? C.gray : C.black });
        txt(colItem + 14, y + 14, fitText([c.detail], W - colItem - 22, 14), { fill: C.grayDark });
        y += rowH;
      });
      y += 8;
    }
    if (rep && rep.capabilities && rep.capabilities.length && y + 40 < height) {
      section("PIPELINE OBJECTS");
      rep.capabilities.forEach((c) => {
        if (y + rowH > height - 4) return;
        txt(14, y + 14, c.ok ? "✓" : "—", { "font-weight": 700, fill: c.ok ? C.crimson : C.silver });
        const capW = Math.min(380, Math.max(300, W * 0.48));
        txt(36, y + 14, fitText([c.analysis], capW - 30, 14, c.ok ? 700 : 500), { "font-weight": c.ok ? 700 : 500, fill: c.ok ? C.black : C.gray });
        txt(capW + 14, y + 14, fitText([c.why], W - capW - 22, 14), { fill: C.gray });
        y += rowH;
      });
      y += 8;
    }
    const loadedHere2 = rep && st.loaded && st.loaded === cur;
    const skipped = loadedHere2 ? (state.presetSkipped || []) : [];
    if (skipped.length && y + 40 < height) {
      section(`SKIPPED IN THIS PRESET (${skipped.length})`);
      for (const sk of skipped) {
        if (y + rowH > height - 4) break;
        txt(14, y + 14, "—", { "font-weight": 700, fill: C.silver });
        const lab = `${(NODE_CATALOG[sk.type] || {}).badge || sk.type} · ${(NODE_CATALOG[sk.type] || {}).label || sk.type}`;
        txt(36, y + 14, fitText([lab], colItem + 40, 14, 600), { "font-weight": 600, fill: C.gray });
        txt(colItem + 84, y + 14, fitText([sk.why], W - colItem - 92, 14), { fill: C.gray });
        y += rowH;
      }
      y += 8;
    }
    const notes = []
      .concat((rep ? rep.errors : []).map((t) => ["✕", t, C.crimson]))
      .concat(err && rep ? [["✕", err, C.crimson]] : [])
      .concat((rep ? rep.warnings : []).map((t) => ["⚠", t, C.grayDark]))
      .concat((rep ? rep.fixes : []).map((t) => ["↻", t, C.gray]));
    if (notes.length && y + 34 < height) {
      section(rep && rep.ok ? "NOTES" : "WHY IT CANNOT BE LOADED");
      for (const [g, t, col] of notes) {
        if (y + rowH > height - 4) break;
        txt(14, y + 14, g, { "font-weight": 700, fill: col });
        // long messages: up to 2 lines, then ellipsis
        const maxW = W - 40;
        let rest = t, lines = 0;
        while (rest && lines < 2 && y + rowH <= height - 4) {
          let cut = rest.length;
          while (cut > 10 && textWidth(rest.slice(0, cut), 14) > maxW) cut = rest.lastIndexOf(" ", cut - 1) > 0 ? rest.lastIndexOf(" ", cut - 1) : cut - 5;
          const piece = lines === 1 && cut < rest.length ? fitText([rest], maxW, 14) : rest.slice(0, cut);
          txt(36, y + 14, piece, { fill: col });
          rest = rest.slice(cut).trim();
          lines++;
          y += rowH - 2;
        }
        y += 2;
      }
    }
    return svg;
  }

  function buildNodeSubbar(node) {
    const sub = el("div", { class: "nr-node-subbar" });
    const recs = getRecordings();
    if (node.type === "input") {
      buildInputSubbar(sub);
      return sub;
    }

    if (node.type === "lead") {
      for (const v of ["Bilateral", "Left", "Right"]) {
        sub.appendChild(
          el("button", {
            class: `nr-pill ${state.leadView === v ? "nr-pill-black" : ""}`,
            text: v,
            onclick: (ev) => { ev.stopPropagation(); state.leadView = v; renderAll(); },
          })
        );
      }
      sub.appendChild(
        el("button", {
          class: `nr-pill ${state.showImpedanceOnLead ? "nr-pill-crimson" : ""}`,
          text: "Ω",
          title: "Toggle impedance labels on lead",
          onclick: (ev) => { ev.stopPropagation(); state.showImpedanceOnLead = !state.showImpedanceOnLead; renderAll(); },
        })
      );
      const allDataContacts = getAllContactsWithData();
      const selCount = (state.selection.contacts || []).length;
      sub.appendChild(
        el("button", {
          class: `nr-pill ${selCount === allDataContacts.length ? "nr-pill-crimson" : ""}`,
          text: `All (${selCount}/${allDataContacts.length})`,
          title: "Select all contacts with recorded data",
          onclick: (ev) => {
            ev.stopPropagation();
            state.selection.contacts = getAllContactsWithData();
            applyContactCascade();
            renderAll();
            syncToPython();
          },
        })
      );
      sub.appendChild(
        el("button", {
          class: "nr-pill",
          text: "Clear",
          title: "Deselect all contacts",
          onclick: (ev) => {
            ev.stopPropagation();
            state.selection.contacts = [];
            applyContactCascade();
            renderAll();
            syncToPython();
          },
        })
      );
      return sub;
    }

    if (node.type === "ftg_controller") {
      const wrap = el("div", { style: "flex:none;display:flex;flex-direction:column;" });
      const slBar = el("div", { class: "nr-gt-sliders", onmousedown: (ev) => ev.stopPropagation() });
      const bwVal = el("span", { class: "nr-gt-slider-val", text: `±${Number(state.selection.ftg_half_bw_hz || 4.0).toFixed(1)} Hz` });
      const inp = el("input", {
        type: "range",
        min: 1.0,
        max: 8.0,
        step: 0.5,
        value: state.selection.ftg_half_bw_hz || 4.0,
        style: "width:110px;",
        oninput: (ev) => {
          state.selection.ftg_half_bw_hz = Number(ev.target.value);
          bwVal.textContent = `±${state.selection.ftg_half_bw_hz.toFixed(1)} Hz`;
          _gtCacheKey = "";
          updateCrossHighlights(true);
          updateStatusBar();
        },
        onchange: () => syncToPython(),
      });
      slBar.appendChild(
        el("label", { class: "nr-gt-slider-item" }, [
          texSpan(String.raw`\Delta f_{\mathrm{FTG}}`, "&Delta;<i>f</i><sub>FTG</sub>"),
          inp,
          bwVal,
        ])
      );
      for (const presetBw of [1.5, 2.5, 4.0, 6.0]) {
        slBar.appendChild(
          el("button", {
            class: `nr-pill ${Math.abs((state.selection.ftg_half_bw_hz || 4.0) - presetBw) < 0.05 ? "nr-pill-crimson" : ""}`,
            text: `±${presetBw}`,
            onclick: (ev) => {
              ev.stopPropagation();
              state.selection.ftg_half_bw_hz = presetBw;
              _gtCacheKey = "";
              renderAll();
              syncToPython();
            },
          })
        );
      }
      for (const sr of getPayload().config?.stim_rates_available || []) {
        slBar.appendChild(
          el("button", {
            class: `nr-pill ${Math.abs((state.selection.stim_rate_hz || 145) - sr) < 1 ? "nr-pill-black" : ""}`,
            text: `${Math.round(sr)} Hz`,
            onclick: (ev) => {
              ev.stopPropagation();
              state.selection.stim_rate_hz = sr;
              _gtCacheKey = "";
              renderAll();
              syncToPython();
            },
          })
        );
      }
      wrap.appendChild(slBar);
      return wrap;
    }

    if (["lfp", "psd", "spectrogram", "beta_ftg", "phase"].includes(node.type)) {
      const recSel = el("select", {
        class: "nr-mini-select",
        onclick: (ev) => ev.stopPropagation(),
        onchange: (ev) => {
          const r = getRecById(ev.target.value);
          if (r) {
            node.recordingId = r.id;
            node.hemisphere = r.hemisphere;
            node.pair = r.pair;
            state.selection.stim_rate_hz = r.stim_rate_hz || state.selection.stim_rate_hz;
            if (!state.selection.recordings.includes(r.id)) {
              state.selection.recordings = [...state.selection.recordings, r.id];
            }
            renderAll();
            syncToPython();
          }
        },
      });
      for (const r of recs) {
        recSel.appendChild(el("option", { value: r.id, text: r.label }));
      }
      recSel.value = node.recordingId || (recs[0]?.id || "");
      sub.appendChild(recSel);

      if (node.type === "psd") {
        const curMode = psdMode(node);
        const rSel = node.recordingId ? getRecById(node.recordingId) : null;
        const nOv = rSel ? psdOverlayRecs(rSel.hemisphere, rSel).length : 0;
        const hasM = (getPayload().montage || []).length > 0;
        const hasR = recs.length > 0 || getAllRecordings().length > 0;
        for (const [m, lbl] of [["overlay", `Contacts${nOv ? ` (${nOv})` : ""}`], ["db", "dB"], ["linear", "Linear"], ["survey", "Survey"]]) {
          if (m === "overlay" && nOv < 2) continue;
          if (m === "survey" && !hasM) continue;
          if ((m === "db" || m === "linear") && !hasR) continue;
          sub.appendChild(
            el("button", {
              class: `nr-pill ${curMode === m ? "nr-pill-crimson" : ""}`,
              title: m === "overlay" ? "Overlay the PSD of every sensing pair / stim contact in this hemisphere" : undefined,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
      }
      if (node.type === "beta_ftg") {
        for (const [m, lbl] of [["dose", "Dose (mA)"], ["envelope", "Envelope"], ["freq_sweep", "Sweep"]]) {
          sub.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "dose") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
      }
      return sub;
    }

    if (["montage", "impedance", "trend"].includes(node.type)) {
      for (const h of ["Left", "Right"]) {
        sub.appendChild(
          el("button", {
            class: `nr-pill ${node.hemisphere === h ? "nr-pill-black" : ""}`,
            text: h,
            onclick: (ev) => { ev.stopPropagation(); node.hemisphere = h; renderAll(); syncToPython(); },
          })
        );
      }
      if (node.type === "montage") {
        for (const [m, tex, fb] of [
          ["beta", String.raw`\beta`, "&beta;"],
          ["ftg", String.raw`\mathrm{FTG}`, "FTG"],
          ["peak", String.raw`\mathrm{Peak}\;\mu\mathrm{V}`, "Peak &mu;V"],
        ]) {
          sub.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "beta") === m ? "nr-pill-crimson" : ""}`,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            }, [texSpan(tex, fb)])
          );
        }
      }
      if (node.type === "impedance") {
        for (const [m, lbl] of [["monopolar", "Monopolar"], ["bipolar", `${leadContacts(node.hemisphere || "Left").length}×${leadContacts(node.hemisphere || "Left").length} Bipolar`]]) {
          sub.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "monopolar") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
      }
      return sub;
    }

    if (node.type.startsWith("gt_")) {
      const gp = getGTParams();
      const gt = computeGT();
      const wrap = el("div", { style: "flex:none;display:flex;flex-direction:column;" });
      const bar1 = el("div", { class: "nr-node-subbar" });

      // Hemisphere toggle shared across all GT nodes
      for (const h of ["Left", "Right"]) {
        bar1.appendChild(
          el("button", {
            class: `nr-pill ${gp.hemisphere === h ? "nr-pill-black" : ""}`,
            text: h,
            onclick: (ev) => {
              ev.stopPropagation();
              gp.hemisphere = h;
              _gtCacheKey = "";
              resetBandit(computeGT());
              renderAll();
              syncToPython();
            },
          })
        );
      }

      // Stimulation frequency filter pills (All / 125 / 145 / 165 Hz)
      const rateOpts = ["ALL", ...(gt.stimRates || [])];
      if (rateOpts.length > 2) {
        for (const rOpt of rateOpts) {
          const isAct = String(gp.stim_rate_filter) === String(rOpt);
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${isAct ? "nr-pill-crimson" : ""}`,
              text: rOpt === "ALL" ? "All Hz" : `${Math.round(Number(rOpt))} Hz`,
              onclick: (ev) => {
                ev.stopPropagation();
                gp.stim_rate_filter = rOpt;
                _gtCacheKey = "";
                resetBandit(computeGT());
                renderAll();
                syncToPython();
              },
            })
          );
        }
      }

      if (node.type === "gt_minimax") {
        for (const [m, lbl] of [["matrix", "Payoff Matrix"], ["convergence", "MWU Conv."]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "matrix") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
      }
      if (node.type === "gt_stackelberg") {
        for (const [m, tex, fb] of [
          ["leader", String.raw`\mathrm{Leader}\;U(a)`, "Leader <i>U</i>(<i>a</i>)"],
          ["follower", String.raw`\mathrm{Follower}\;\beta,\mathrm{FTG}`, "Follower &beta; &amp; FTG"],
        ]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "leader") === m ? "nr-pill-crimson" : ""}`,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            }, [texSpan(tex, fb)])
          );
        }
      }
      if (node.type === "gt_bandit") {
        const algoSel = el("select", {
          class: "nr-mini-select",
          onclick: (ev) => ev.stopPropagation(),
          onchange: (ev) => {
            gp.algo = ev.target.value;
            resetBandit(computeGT());
            renderAll();
            syncToPython();
          },
        }, [
          el("option", { value: "thompson", text: "Thompson" }),
          el("option", { value: "ucb1", text: "UCB1" }),
          el("option", { value: "safe", text: "Safe-UCB" }),
          el("option", { value: "linucb", text: "LinUCB" }),
          el("option", { value: "eps", text: "ε-Greedy" }),
          el("option", { value: "exhaustive", text: "Exhaustive" }),
        ]);
        algoSel.value = gp.algo || "thompson";
        bar1.appendChild(algoSel);
        bar1.appendChild(
          el("button", {
            class: `nr-pill ${state.bandit.running ? "nr-pill-crimson" : "nr-pill-black"}`,
            text: state.bandit.running ? "⏸ Pause" : "▶ Run",
            onclick: (ev) => { ev.stopPropagation(); toggleBanditRun(); },
          })
        );
        bar1.appendChild(
          el("button", {
            class: "nr-pill",
            text: "+1 Pull",
            onclick: (ev) => { ev.stopPropagation(); stepBandit(computeGT()); renderAll(); syncToPython(); },
          })
        );
        bar1.appendChild(
          el("button", {
            class: "nr-pill",
            text: "Reset",
            onclick: (ev) => { ev.stopPropagation(); resetBandit(computeGT()); renderAll(); syncToPython(); },
          })
        );
      }

      wrap.appendChild(bar1);

      // Weight sliders directly on GT Arms node (updates all GT nodes live!)
      if (node.type === "gt_arms") {
        const slBar = el("div", { class: "nr-gt-sliders", onmousedown: (ev) => ev.stopPropagation() });
        const addSl = (tex, fb, key, min, max, step) => {
          const valSpan = el("span", { class: "nr-gt-slider-val", text: Number(gp[key]).toFixed(1) });
          const inp = el("input", {
            type: "range",
            min,
            max,
            step,
            value: gp[key],
            oninput: (ev) => {
              gp[key] = Number(ev.target.value);
              valSpan.textContent = gp[key].toFixed(1);
              _gtCacheKey = "";
              rescoreBandit(computeGT());
              updateCrossHighlights(true);
              updateStatusBar();
            },
            onchange: () => syncToPython(),
          });
          slBar.appendChild(el("label", { class: "nr-gt-slider-item" }, [texSpan(tex, fb), inp, valSpan]));
        };
        addSl(String.raw`w_{\beta}`, "<i>w</i><sub>&beta;</sub>", "wb", 0.0, 2.0, 0.1);
        addSl(String.raw`w_{F}`, "<i>w</i><sub>F</sub>", "wf", 0.0, 2.0, 0.1);
        addSl(String.raw`w_{E}`, "<i>w</i><sub>E</sub>", "we", 0.0, 2.0, 0.1);
        addSl(String.raw`\tau\,(\mathrm{dB})`, "&tau; (dB)", "tau", 0.0, 6.0, 0.5);
        wrap.appendChild(slBar);
      }
      return wrap;
    }

    if (node.type.startsWith("risk_")) {
      const rp = getRiskParams();
      const rk = computeRisk();
      const wrap = el("div", { style: "flex:none;display:flex;flex-direction:column;" });
      const bar1 = el("div", { class: "nr-node-subbar" });

      // Hemisphere toggle shared across all Risk nodes
      for (const h of ["Left", "Right"]) {
        bar1.appendChild(
          el("button", {
            class: `nr-pill ${rp.hemisphere === h ? "nr-pill-black" : ""}`,
            text: h,
            onclick: (ev) => {
              ev.stopPropagation();
              rp.hemisphere = h;
              _riskCacheKey = "";
              renderAll();
              syncToPython();
            },
          })
        );
      }

      // Risk Target toggle: β bursts vs FTG surges
      for (const [tgKey, tgTex, tgFb] of [
        ["beta", String.raw`\beta\;\mathrm{bursts}`, "&beta; bursts"],
        ["ftg", String.raw`\mathrm{FTG}`, "FTG"],
      ]) {
        bar1.appendChild(
          el("button", {
            class: `nr-pill ${(rp.target || "beta") === tgKey ? "nr-pill-crimson" : ""}`,
            onclick: (ev) => {
              ev.stopPropagation();
              rp.target = tgKey;
              _riskCacheKey = "";
              renderAll();
              syncToPython();
            },
          }, [texSpan(tgTex, tgFb)])
        );
      }

      // Stim rate filter pills (when multiple rates exist)
      const rateOpts = ["ALL", ...(rk.stimRates || [])];
      if (rateOpts.length > 2) {
        for (const rOpt of rateOpts) {
          const isAct = String(rp.stim_rate_filter) === String(rOpt);
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${isAct ? "nr-pill-black" : ""}`,
              text: rOpt === "ALL" ? "All Hz" : `${Math.round(Number(rOpt))} Hz`,
              onclick: (ev) => {
                ev.stopPropagation();
                rp.stim_rate_filter = rOpt;
                _riskCacheKey = "";
                renderAll();
                syncToPython();
              },
            })
          );
        }
      }

      // Series selector on per-series Risk nodes
      if (["risk_envelope", "risk_tail", "risk_return", "risk_breach"].includes(node.type) && rk.series.length) {
        const curSer = resolveRiskSeries(node, rk);
        const serSel = el("select", {
          class: "nr-mini-select",
          onclick: (ev) => ev.stopPropagation(),
          onchange: (ev) => {
            node.seriesId = ev.target.value;
            const s = rk.series.find((x) => x.id === node.seriesId);
            if (s) {
              node.pair = s.pair;
              node.armId = null;
            }
            renderAll();
            syncToPython();
          },
        });
        for (const s of rk.series) {
          serSel.appendChild(el("option", { value: s.id, text: s.label }));
        }
        serSel.value = curSer ? curSer.id : "";
        bar1.appendChild(serSel);
      }

      if (node.type === "risk_map") {
        const metSel = el("select", {
          class: "nr-mini-select",
          onclick: (ev) => ev.stopPropagation(),
          onchange: (ev) => {
            rp.metric = ev.target.value;
            _riskCacheKey = "";
            renderAll();
            syncToPython();
          },
        }, [
          el("option", { value: "CVaR", text: "Metric: CVaR" }),
          el("option", { value: "VaR", text: "Metric: VaR" }),
          el("option", { value: "EVT", text: "Metric: EVT-VaR99.9" }),
          el("option", { value: "RL", text: "Metric: GEV Return Lvl" }),
          el("option", { value: "breach", text: "Metric: P(breach)" }),
          el("option", { value: "score", text: "Metric: Risk + κ·E" }),
        ]);
        metSel.value = rp.metric || "CVaR";
        bar1.appendChild(metSel);
      }

      if (node.type === "risk_map" || node.type === "risk_selection") {
        for (const [alVal, alLbl] of [[0.95, "α=95%"], [0.99, "α=99%"]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${Math.abs(Number(rp.alpha || 0.99) - alVal) < 0.01 ? "nr-pill-crimson" : ""}`,
              text: alLbl,
              onclick: (ev) => {
                ev.stopPropagation();
                rp.alpha = alVal;
                _riskCacheKey = "";
                renderAll();
                syncToPython();
              },
            })
          );
        }
      }

      if (node.type === "risk_tail") {
        for (const [m, lbl] of [["survival", "Log-Survival"], ["diagnostics", "MRL & ξ"]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "survival") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
        const curSer = resolveRiskSeries(node, rk);
        const sArms = curSer ? (curSer.targets[rk.target]?.arms || []) : [];
        if ((node.mode || "survival") === "survival" && sArms.length > 1) {
          const armSel = el("select", {
            class: "nr-mini-select",
            style: "max-width:110px;",
            onclick: (ev) => ev.stopPropagation(),
            onchange: (ev) => { node.armId = ev.target.value; renderAll(); },
          });
          for (const a of sArms) armSel.appendChild(el("option", { value: a.arm_id, text: `${a.amp} mA` }));
          armSel.value = node.armId || (sArms[sArms.length - 1]?.arm_id || "");
          bar1.appendChild(armSel);
        }
      }

      if (node.type === "risk_selection") {
        for (const [m, lbl] of [["selection", "5-Rule Picks"], ["backtest", "Kupiec Backtest"]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "selection") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
      }

      wrap.appendChild(bar1);

      // Live EVT / Selection sliders directly on risk_map (updates all Risk nodes & Python live!)
      if (node.type === "risk_map") {
        const slBar = el("div", { class: "nr-gt-sliders", onmousedown: (ev) => ev.stopPropagation() });
        const addRiskSl = (tex, fb, key, min, max, step, fmt) => {
          const valSpan = el("span", { class: "nr-gt-slider-val", text: fmt(Number(rp[key])) });
          const inp = el("input", {
            type: "range",
            min,
            max,
            step,
            value: rp[key],
            oninput: (ev) => {
              rp[key] = Number(ev.target.value);
              valSpan.textContent = fmt(rp[key]);
              _riskCacheKey = "";
              updateCrossHighlights(true);
              updateStatusBar();
            },
            onchange: () => syncToPython(),
          });
          slBar.appendChild(el("label", { class: "nr-gt-slider-item" }, [texSpan(tex, fb), inp, valSpan]));
        };
        addRiskSl(String.raw`H\,(\mathrm{s})`, "<i>H</i> (s)", "horizon", 10, 600, 10, (v) => `${Math.round(v)}s`);
        addRiskSl(String.raw`\kappa`, "&kappa;", "kappa", 0.0, 2.0, 0.05, (v) => v.toFixed(2));
        addRiskSl(String.raw`\varepsilon`, "&varepsilon;", "eps", 0.01, 0.50, 0.01, (v) => `${Math.round(100 * v)}%`);
        wrap.appendChild(slBar);
      }
      return wrap;
    }

    if (node.type.startsWith("opt_")) {
      const opP = getOptParams();
      const opD = computeOptions();
      const wrap = el("div", { style: "flex:none;display:flex;flex-direction:column;" });
      const bar1 = el("div", { class: "nr-node-subbar" });

      // Hemisphere toggle shared across all Option nodes
      for (const h of ["Left", "Right"]) {
        bar1.appendChild(
          el("button", {
            class: `nr-pill ${opP.hemisphere === h ? "nr-pill-black" : ""}`,
            text: h,
            onclick: (ev) => {
              ev.stopPropagation();
              opP.hemisphere = h;
              _optCacheKey = "";
              renderAll();
              syncToPython();
            },
          })
        );
      }

      // Strategy selector shared across Option nodes
      const stratSel = el("select", {
        class: "nr-mini-select",
        style: "max-width:142px;",
        onclick: (ev) => ev.stopPropagation(),
        onchange: (ev) => {
          opP.strategy = ev.target.value;
          _optCacheKey = "";
          renderAll();
          syncToPython();
        },
      }, OPT_STRATS.map(([v, t]) => el("option", { value: v, text: t })));
      stratSel.value = opP.strategy || "call";
      bar1.appendChild(stratSel);

      // Stim rate filter pills when multiple rates exist
      const rateOpts = ["ALL", ...(opD.stimRates || [])];
      if (rateOpts.length > 2) {
        for (const rOpt of rateOpts) {
          const isAct = String(opP.stim_rate_filter) === String(rOpt);
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${isAct ? "nr-pill-crimson" : ""}`,
              text: rOpt === "ALL" ? "All Hz" : `${Math.round(Number(rOpt))} Hz`,
              onclick: (ev) => {
                ev.stopPropagation();
                opP.stim_rate_filter = rOpt;
                _optCacheKey = "";
                renderAll();
                syncToPython();
              },
            })
          );
        }
      }

      // Series & arm selectors on per-series Option nodes
      if (["opt_payoff", "opt_lattice", "opt_chain", "opt_smile"].includes(node.type) && opD.series.length) {
        const curSer = resolveOptSeries(node, opD);
        const serSel = el("select", {
          class: "nr-mini-select",
          style: "max-width:165px;",
          onclick: (ev) => ev.stopPropagation(),
          onchange: (ev) => {
            node.seriesId = ev.target.value;
            const s = opD.series.find((x) => x.id === node.seriesId);
            if (s) { node.pair = s.pair; node.armId = null; }
            renderAll();
            syncToPython();
          },
        });
        for (const s of opD.series) serSel.appendChild(el("option", { value: s.id, text: s.label }));
        serSel.value = curSer ? curSer.id : "";
        bar1.appendChild(serSel);

        const sArms = curSer ? opD.arms.filter((a) => a.seriesId === curSer.id) : [];
        if (sArms.length > 1 && (node.type !== "opt_smile" || (node.mode || "alpha") === "smile") && (node.type !== "opt_payoff" || (node.mode || "payoff") === "payoff")) {
          const armSel = el("select", {
            class: "nr-mini-select",
            style: "max-width:96px;",
            onclick: (ev) => ev.stopPropagation(),
            onchange: (ev) => { node.armId = ev.target.value; renderAll(); },
          });
          for (const a of sArms) armSel.appendChild(el("option", { value: a.arm_id, text: `${a.amp} mA` }));
          armSel.value = node.armId || (sArms[0]?.arm_id || "");
          bar1.appendChild(armSel);
        }
      }

      if (node.type === "opt_payoff") {
        for (const [m, lbl] of [["payoff", "Payoff & S_T"], ["calibration", "Model vs Mkt"]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "payoff") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
      }

      if (node.type === "opt_lattice") {
        for (const stp of [6, 8, 10, 12]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${Math.round(opP.steps || 10) === stp ? "nr-pill-crimson" : ""}`,
              text: `${stp} stp`,
              onclick: (ev) => { ev.stopPropagation(); opP.steps = stp; _optCacheKey = ""; renderAll(); syncToPython(); },
            })
          );
        }
      }

      if (node.type === "opt_smile") {
        for (const [m, lbl] of [["alpha", "Alpha ∂Π/∂a"], ["smile", "IV Smile"]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "alpha") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
      }

      if (node.type === "opt_selection") {
        for (const [m, lbl] of [["selection", "5-Rule Picks"], ["params", "Log-OU Params"]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "selection") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
      }

      wrap.appendChild(bar1);

      // Live contract & portfolio sliders directly on opt_arena (updates all Option nodes & Python live!)
      if (node.type === "opt_arena") {
        const slBar = el("div", { class: "nr-gt-sliders", onmousedown: (ev) => ev.stopPropagation() });
        const addOptSl = (tex, fb, key, min, max, step, fmt) => {
          const valSpan = el("span", { class: "nr-gt-slider-val", text: fmt(Number(opP[key])) });
          const inp = el("input", {
            type: "range",
            min,
            max,
            step,
            value: opP[key],
            oninput: (ev) => {
              opP[key] = Number(ev.target.value);
              valSpan.textContent = fmt(opP[key]);
              _optCacheKey = "";
              updateCrossHighlights(true);
              updateStatusBar();
            },
            onchange: () => syncToPython(),
          });
          slBar.appendChild(el("label", { class: "nr-gt-slider-item" }, [texSpan(tex, fb), inp, valSpan]));
        };
        addOptSl(String.raw`T\,(\mathrm{s})`, "<i>T</i> (s)", "T", 0.05, 1.5, 0.05, (v) => `${v.toFixed(2)}s`);
        addOptSl(String.raw`K_{\mathrm{b}}\times`, "<i>K</i><sub>b</sub>&times;", "k_burst_mult", 0.7, 1.5, 0.05, (v) => `${v.toFixed(2)}×`);
        addOptSl(String.raw`w_{F}`, "<i>w</i><sub>F</sub>", "w_ftg", 0.0, 2.0, 0.05, (v) => v.toFixed(2));
        addOptSl(String.raw`w_{E}`, "<i>w</i><sub>E</sub>", "w_energy", 0.0, 0.10, 0.005, (v) => v.toFixed(3));
        wrap.appendChild(slBar);
      }
      return wrap;
    }

    if (node.type.startsWith("gsp_")) {
      const gp = getGspParams();
      const gd = computeGspData();
      const wrap = el("div", {});
      const bar1 = el("div", { class: "nr-node-subbar" });

      // Hemisphere toggle
      for (const h of ["Left", "Right"]) {
        bar1.appendChild(
          el("button", {
            class: `nr-pill ${gp.hemisphere === h ? "nr-pill-dark" : ""}`,
            text: h,
            onclick: (ev) => {
              ev.stopPropagation();
              gp.hemisphere = h;
              gp.series_id = "";
              state.selection.gsp_selected_node_idx = null;
              _gspCacheKey = "";
              renderAll();
              syncToPython();
            },
          })
        );
      }

      // Stim rate filter
      if ((gd.stimRates || []).length > 1) {
        const rSel = el("select", {
          class: "nr-mini-select",
          style: "max-width:92px;",
          onclick: (ev) => ev.stopPropagation(),
          onchange: (ev) => {
            gp.stim_rate_filter = ev.target.value;
            gp.series_id = "";
            state.selection.gsp_selected_node_idx = null;
            _gspCacheKey = "";
            renderAll();
            syncToPython();
          },
        });
        rSel.appendChild(el("option", { value: "ALL", text: "All Hz" }));
        for (const r of gd.stimRates) rSel.appendChild(el("option", { value: String(r), text: `${r} Hz` }));
        rSel.value = String(gp.stim_rate_filter || "ALL");
        bar1.appendChild(rSel);
      }

      // Series selector
      if (gd.series.length > 0) {
        const curSer = resolveGspSeries(node, gd);
        const sSel = el("select", {
          class: "nr-mini-select",
          style: "max-width:190px;",
          onclick: (ev) => ev.stopPropagation(),
          onchange: (ev) => {
            gp.series_id = ev.target.value;
            node.seriesId = ev.target.value;
            state.selection.gsp_selected_node_idx = null;
            _gspCacheKey = "";
            renderAll();
            syncToPython();
          },
        });
        for (const s of gd.series) sSel.appendChild(el("option", { value: s.id, text: s.label }));
        sSel.value = curSer ? curSer.id : "";
        bar1.appendChild(sSel);
      }

      // Node-specific mode pills
      if (node.type === "gsp_graph") {
        for (const [m, lbl] of [["local_ftg", "Size: FTG"], ["local_beta", "Size: β"]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(gp.node_size_metric || "local_ftg") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); gp.node_size_metric = m; renderAll(); syncToPython(); },
            })
          );
        }
      } else if (node.type === "gsp_matrix") {
        for (const [m, lbl] of [["W", "W"], ["L", "L"], ["Lsym", "L_sym"], ["d2", "d²"]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "W") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
      } else if (node.type === "gsp_gft") {
        for (const [m, lbl] of [["gft", "GFT Modes"], ["psd", "Node PSD X(f)"]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "gft") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
      } else if (node.type === "gsp_gtv") {
        for (const [m, lbl] of [["gtv", "GTV(f)"], ["lgfe", "LGFE(f)"], ["gse", "GSE(f)"], ["coh", "Coh(f)"]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "gtv") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
      } else if (node.type === "gsp_phase") {
        for (const [m, lbl] of [["clock", "Clock"], ["delay", "Takens"], ["loop", "Loop"]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "clock") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
        for (const [b, lbl] of [["ftg", "FTG"], ["beta", "β"]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(gp.phase_band || "ftg") === b ? "nr-pill-dark" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); gp.phase_band = b; renderAll(); syncToPython(); },
            })
          );
        }
      } else if (node.type === "gsp_sweep") {
        for (const [m, lbl] of [["sigma", "σ-Sweep"], ["board", "Contact Board"]]) {
          bar1.appendChild(
            el("button", {
              class: `nr-pill ${(node.mode || "sigma") === m ? "nr-pill-crimson" : ""}`,
              text: lbl,
              onclick: (ev) => { ev.stopPropagation(); node.mode = m; renderAll(); syncToPython(); },
            })
          );
        }
      }

      wrap.appendChild(bar1);

      // Live RBF kernel σ slider directly on gsp_graph (updates all GSP nodes & Python live!)
      if (node.type === "gsp_graph") {
        const slBar = el("div", { class: "nr-gt-sliders", onmousedown: (ev) => ev.stopPropagation() });
        const valSpan = el("span", { class: "nr-gt-slider-val", text: `${Number(gp.sigma || 2.0).toFixed(2)}` });
        const inp = el("input", {
          type: "range",
          min: 0.5,
          max: 8.0,
          step: 0.25,
          value: Number(gp.sigma || 2.0),
          oninput: (ev) => {
            gp.sigma = Number(ev.target.value);
            valSpan.textContent = gp.sigma.toFixed(2);
            _gspCacheKey = "";
            updateCrossHighlights(true);
            updateStatusBar();
          },
          onchange: () => syncToPython(),
        });
        slBar.appendChild(el("label", { class: "nr-gt-slider-item" }, [texSpan(String.raw`\text{RBF Kernel }\sigma`, "RBF Kernel &sigma;"), inp, valSpan]));
        if (state.selection.gsp_selected_node_idx !== null && state.selection.gsp_selected_node_idx !== undefined) {
          slBar.appendChild(
            el("button", {
              class: "nr-pill nr-pill-crimson",
              text: "Clear Highlight",
              onclick: (ev) => { ev.stopPropagation(); pickGspNode(null); },
            })
          );
        }
        wrap.appendChild(slBar);
      }

      return wrap;
    }

    return null;
  }

  function renderNodes() {
    nodesLayer.innerHTML = "";
    const lineage = state.hover.nodeId ? getLineageSet(state.hover.nodeId) : null;

    for (const node of state.nodes) {
      const spec = NODE_CATALOG[node.type] || NODE_CATALOG.psd;
      const isSel = (state.selection.selected_nodes || []).includes(node.id);
      const isLin = lineage ? lineage.nodesSet.has(node.id) : false;
      const isDim = lineage ? !isLin : false;

      const card = el("div", {
        class: `nr-node ${node.type === "lead" ? "nr-node-lead" : ""} ${isSel ? "nr-node-selected" : ""} ${isLin && !isSel ? "nr-node-lineage" : ""} ${isDim ? "nr-node-dim" : ""} ${node.collapsed ? "nr-node-collapsed" : ""}`,
        "data-node-id": node.id,
        style: `left:${node.x}px;top:${node.y}px;width:${node.w}px;${node.collapsed ? "" : `height:${node.h}px;`}`,
      });

      card.addEventListener("mouseenter", () => setHover({ nodeId: node.id }));
      card.addEventListener("mouseleave", () => setHover({ nodeId: null }));
      card.addEventListener("mousedown", () => {
        if (!state.selection.selected_nodes.includes(node.id)) {
          state.selection.selected_nodes = [node.id];
          for (const c of nodesLayer.querySelectorAll(".nr-node")) {
            c.classList.toggle("nr-node-selected", c.getAttribute("data-node-id") === node.id);
          }
          renderMinimap();
          syncToPython();
        }
      });
      card.addEventListener("contextmenu", (ev) => {
        if (ev.defaultPrevented) return;
        ev.preventDefault();
        ev.stopPropagation();
        openContextMenu(ev.clientX, ev.clientY, { kind: "node", nodeId: node.id });
      });

      // Multi-Edge Ports on ALL 4 Edges (3 ports per edge = 12 ports / expanded node!)
      const usedPorts = new Set();
      for (const e of state.edges) {
        if (e.source === node.id && e.sourcePort) usedPorts.add(e.sourcePort);
        if (e.target === node.id && e.targetPort) usedPorts.add(e.targetPort);
      }
      const nodePorts = getNodePorts(node);
      for (const pt of nodePorts) {
        const pEl = el("div", {
          class: `nr-port nr-port-edge-${pt.edge} ${usedPorts.has(pt.id) ? "nr-port-connected" : ""}`,
          style: `left:${pt.rx}px;top:${pt.ry}px;`,
          title: `Port ${pt.id} (${pt.edge}) — drag to connect or drop incoming edge`,
        });
        pEl.addEventListener("mousedown", (ev) => {
          ev.stopPropagation();
          state.connectingFrom = { nodeId: node.id, portId: pt.id, x: pt.x, y: pt.y, nx: pt.nx, ny: pt.ny };
          state.tempCursorWorld = { x: pt.x, y: pt.y };
          const onMove = (mv) => {
            const r = viewportEl.getBoundingClientRect();
            state.tempCursorWorld = {
              x: (mv.clientX - r.left - state.viewport.x) / state.viewport.zoom,
              y: (mv.clientY - r.top - state.viewport.y) / state.viewport.zoom,
            };
            renderEdges();
          };
          const onUp = () => {
            state.connectingFrom = null;
            state.tempCursorWorld = null;
            renderEdges();
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        });
        pEl.addEventListener("mouseup", (ev) => {
          if (state.connectingFrom && state.connectingFrom.nodeId !== node.id && !wouldCreateCycle(state.connectingFrom.nodeId, node.id)) {
            ev.stopPropagation();
            const exists = state.edges.some(
              (e) => e.source === state.connectingFrom.nodeId && e.target === node.id && e.sourcePort === state.connectingFrom.portId && e.targetPort === pt.id
            );
            if (!exists) {
              state.edges.push({
                id: nextId("edge"),
                source: state.connectingFrom.nodeId,
                target: node.id,
                sourcePort: state.connectingFrom.portId,
                targetPort: pt.id,
                label: `${spec.badge}`,
              });
              syncToPython();
            }
            state.connectingFrom = null;
            state.tempCursorWorld = null;
            renderAll();
          }
        });
        card.appendChild(pEl);
      }

      // Header Bar (Drag to move; Click without dragging toggles expand/collapse!)
      const toggleBtn = el("button", {
        class: "nr-icon-btn",
        text: node.collapsed ? "+" : "−",
        title: node.collapsed ? "Expand object" : "Collapse object",
        onclick: (ev) => {
          ev.stopPropagation();
          node.collapsed = !node.collapsed;
          renderAll();
          syncToPython();
        },
      });
      const focusBtn = el("button", {
        class: "nr-icon-btn",
        text: "⤢",
        title: "Expand to full stage",
        onclick: (ev) => {
          ev.stopPropagation();
          state.focusNodeId = node.id;
          renderFocusOverlay();
        },
      });
      const exportObjBtn = objectExportMenu(node);
      const addChildBtn = el("button", {
        class: "nr-icon-btn",
        text: "⊕",
        title: "Branch downstream object",
        onclick: (ev) => {
          ev.stopPropagation();
          openContextMenu(ev.clientX, ev.clientY, { kind: "node", nodeId: node.id });
        },
      });
      const actions = [toggleBtn, focusBtn, exportObjBtn, addChildBtn];
      if (node.id !== "lead_main" && node.id !== "input_main") {
        actions.push(
          el("button", {
            class: "nr-icon-btn",
            text: "✕",
            title: "Remove from DAG",
            onclick: (ev) => { ev.stopPropagation(); removeNode(node.id); },
          })
        );
      }

      const header = el("div", { class: "nr-node-header" }, [
        el("span", { class: `nr-node-badge ${isSel ? "nr-badge-crimson" : ""}`, text: spec.badge }),
        el("span", { class: "nr-node-title", text: node.title }),
        el("div", { class: "nr-node-actions" }, actions),
      ]);

      // Dragging + Click-to-Toggle Expand/Collapse
      header.addEventListener("mousedown", (ev) => {
        if (ev.button !== 0 || ev.target.closest(".nr-icon-btn, .nr-obj-export")) return;
        ev.stopPropagation();
        const sx = ev.clientX, sy = ev.clientY;
        const ox = node.x, oy = node.y;
        let moved = false;

        // Select node
        if (!state.selection.selected_nodes.includes(node.id)) {
          state.selection.selected_nodes = [node.id];
        }

        const onMove = (mv) => {
          const dx = (mv.clientX - sx) / state.viewport.zoom;
          const dy = (mv.clientY - sy) / state.viewport.zoom;
          if (Math.hypot(mv.clientX - sx, mv.clientY - sy) > 5) moved = true;
          if (moved) {
            node.x = Math.round(ox + dx);
            node.y = Math.round(oy + dy);
            card.style.left = `${node.x}px`;
            card.style.top = `${node.y}px`;
            renderEdges();
            renderMinimap();
          }
        };
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          if (!moved) {
            // Pure click on node header toggles expand/collapse!
            node.collapsed = !node.collapsed;
            renderAll();
          }
          syncToPython();
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });

      header.addEventListener("dblclick", (ev) => {
        ev.stopPropagation();
        state.focusNodeId = node.id;
        renderFocusOverlay();
      });

      card.appendChild(header);

      if (node.collapsed) {
        const rec = getRecById(node.recordingId);
        const bs = rec?.band_stats;
        const summary = el("div", {
          class: "nr-collapsed-summary",
          onclick: (ev) => {
            ev.stopPropagation();
            node.collapsed = false;
            renderAll();
            syncToPython();
          },
        }, [
          el("span", { text: `${node.hemisphere || "Bilateral"} · ${node.pair || ""}` }),
          bs ? el("span", { style: `color:${C.black};font-weight:700;` }, [texSpan(String.raw`\beta=${fmtNum(bs.beta_db, 1)}\,\mathrm{dB}`, `&beta; = ${fmtNum(bs.beta_db, 1)} dB`)]) : null,
          bs ? el("span", { style: `color:${C.crimson};font-weight:700;` }, [texSpan(String.raw`\mathrm{FTG}=${fmtNum(bs.ftg_db, 1)}\,\mathrm{dB}`, `FTG = ${fmtNum(bs.ftg_db, 1)} dB`)]) : null,
          el("span", { style: `margin-left:auto;color:${C.gray};`, text: "Click to expand" }),
        ]);
        card.appendChild(summary);
      } else {
        const formulaBar = buildFormulaBar(node.type, node.type === "lead" ? leadKindLabel() : null);
        if (formulaBar) card.appendChild(formulaBar);
        const subbar = safeNodeSubbar(node);
        if (subbar) card.appendChild(subbar);

        const bodyH = bodyHeightFor(node, !!subbar, !!formulaBar);
        const bodyW = Math.max(240, node.w - 20);
        const body = el("div", { class: "nr-node-body" });
        body.appendChild(safeNodeBody(node, bodyW, bodyH, BODY_SCALE));
        card.appendChild(body);

        // Resize Handles (SE, E, S)
        const attachResize = (handleEl, dir) => {
          handleEl.addEventListener("mousedown", (ev) => {
            ev.stopPropagation();
            const sx = ev.clientX, sy = ev.clientY;
            const ow = node.w, oh = node.h;
            const onMove = (mv) => {
              const dx = (mv.clientX - sx) / state.viewport.zoom;
              const dy = (mv.clientY - sy) / state.viewport.zoom;
              if (dir.includes("e")) node.w = Math.max(node._minW || 320, Math.round(ow + dx));
              if (dir.includes("s")) node.h = Math.max(240, Math.round(oh + dy));
              card.style.width = `${node.w}px`;
              card.style.height = `${node.h}px`;
              renderEdges();
            };
            const onUp = () => {
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
              renderAll();
              syncToPython();
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          });
        };

        const rSE = el("div", { class: "nr-resize-se", title: "Drag to resize object" });
        const rE = el("div", { class: "nr-resize-e" });
        const rS = el("div", { class: "nr-resize-s" });
        attachResize(rSE, "se");
        attachResize(rE, "e");
        attachResize(rS, "s");
        card.appendChild(rSE);
        card.appendChild(rE);
        card.appendChild(rS);
      }

      nodesLayer.appendChild(card);
    }
  }

  // ── Full-Stage Focus Overlay ────────────────────────────────────────
  function renderFocusOverlay() {
    focusContainer.innerHTML = "";
    if (!state.focusNodeId) return;
    const node = state.nodes.find((n) => n.id === state.focusNodeId);
    if (!node) return;

    const rect = viewportEl.getBoundingClientRect();
    const fw = Math.max(600, (rect.width || 1100) - 80);
    const fh = Math.max(420, (rect.height || 660) - 130);

    const backdrop = el("div", {
      class: "nr-focus-backdrop",
      onclick: (ev) => {
        if (ev.target === backdrop) { state.focusNodeId = null; renderFocusOverlay(); }
      },
    });
    const shell = el("div", { class: "nr-focus-shell" });
    shell.appendChild(
      el("div", { class: "nr-node-header", style: "cursor:default;" }, [
        el("span", { class: "nr-node-badge nr-badge-crimson", text: NODE_CATALOG[node.type]?.badge || "VIEW" }),
        el("span", { class: "nr-node-title", text: `${node.title} — Full-Stage Inspection` }),
        objectExportMenu(node, "nr-select nr-select-export", { width: fw + 24, height: fh + 92 }),
        el("button", {
          class: "nr-btn nr-btn-crimson",
          text: "✕ Restore to DAG",
          onclick: () => { state.focusNodeId = null; renderFocusOverlay(); },
        }),
      ])
    );
    const fBar = buildFormulaBar(node.type, node.type === "lead" ? leadKindLabel() : null);
    if (fBar) shell.appendChild(fBar);
    const sub = safeNodeSubbar(node);
    if (sub) shell.appendChild(sub);
    const body = el("div", { class: "nr-node-body" });
    body.appendChild(safeNodeBody(node, fw, fh, BODY_SCALE));
    shell.appendChild(body);
    backdrop.appendChild(shell);
    focusContainer.appendChild(backdrop);
  }

  // ── Minimap ─────────────────────────────────────────────────────────
  function renderMinimap() {
    minimapEl.innerHTML = "";
    if (!state.nodes.length) return;
    const mw = 210, mh = 132;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of state.nodes) {
      const eh = n.collapsed ? 115 : n.h;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + eh);
    }
    const pad = 120;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const sc = Math.min(mw / Math.max(1, maxX - minX), mh / Math.max(1, maxY - minY));
    const sx = (x) => (x - minX) * sc;
    const sy = (y) => (y - minY) * sc;

    const svg = svgEl("svg", { width: mw, height: mh, viewBox: `0 0 ${mw} ${mh}` });
    for (const e of state.edges) {
      const s = state.nodes.find((n) => n.id === e.source);
      const t = state.nodes.find((n) => n.id === e.target);
      if (s && t) {
        svg.appendChild(svgEl("line", { x1: sx(s.x + s.w), y1: sy(s.y + 24), x2: sx(t.x), y2: sy(t.y + 24), stroke: C.grayLight, "stroke-width": 1.2 }));
      }
    }
    for (const n of state.nodes) {
      const eh = n.collapsed ? 115 : n.h;
      const isSel = (state.selection.selected_nodes || []).includes(n.id);
      svg.appendChild(
        svgEl("rect", {
          x: sx(n.x),
          y: sy(n.y),
          width: Math.max(6, n.w * sc),
          height: Math.max(5, eh * sc),
          rx: 2,
          fill: n.type === "lead" ? C.black : isSel ? C.crimson : C.silver,
          stroke: isSel ? C.crimson : C.grayDark,
          "stroke-width": 0.8,
        })
      );
    }
    // Current viewport frame
    const vr = viewportEl.getBoundingClientRect();
    if (vr.width > 0) {
      const vx0 = -state.viewport.x / state.viewport.zoom;
      const vy0 = -state.viewport.y / state.viewport.zoom;
      const vw = vr.width / state.viewport.zoom;
      const vh = vr.height / state.viewport.zoom;
      svg.appendChild(
        svgEl("rect", {
          x: sx(vx0),
          y: sy(vy0),
          width: Math.max(10, vw * sc),
          height: Math.max(10, vh * sc),
          fill: "none",
          stroke: C.crimson,
          "stroke-width": 1.6,
        })
      );
    }
    minimapEl.appendChild(svg);
  }

  minimapEl.addEventListener("click", fitCanvasToNodes);

  // ── Fast Cross-Highlight Refresh & Status Bar ───────────────────────
  let crossTimer = null;
  let pendingDataRefresh = false;
  function updateCrossHighlights(dataChanged = true) {
    if (dataChanged) pendingDataRefresh = true;
    if (crossTimer) cancelAnimationFrame(crossTimer);
    crossTimer = requestAnimationFrame(() => {
      const doData = pendingDataRefresh;
      pendingDataRefresh = false;
      renderEdges();

      // Update node lineage/dim CSS classes in place (zero DOM teardown!)
      const lineage = state.hover.nodeId ? getLineageSet(state.hover.nodeId) : null;
      for (const card of nodesLayer.querySelectorAll(".nr-node")) {
        const nid = card.getAttribute("data-node-id");
        const isSel = (state.selection.selected_nodes || []).includes(nid);
        const isLin = lineage ? lineage.nodesSet.has(nid) : false;
        const isDim = lineage ? !isLin : false;
        card.classList.toggle("nr-node-lineage", isLin && !isSel);
        card.classList.toggle("nr-node-dim", isDim);

        // Only refresh SVG chart bodies when signal/contact/freq/time hover actually changed
        if (doData) {
          const node = state.nodes.find((n) => n.id === nid);
          if (node && !node.collapsed && !["therapy", "inspector", "input"].includes(node.type)) {
            const body = card.querySelector(".nr-node-body");
            if (body) {
              const hasSub = !!card.querySelector(".nr-node-subbar, .nr-gt-sliders");
              const hasForm = !!card.querySelector(".nr-formula-bar");
              const bodyH = bodyHeightFor(node, hasSub, hasForm);
              const bodyW = Math.max(240, node.w - 20);
              body.innerHTML = "";
              body.appendChild(safeNodeBody(node, bodyW, bodyH, BODY_SCALE));
            }
          }
        }
      }
      if (doData && state.focusNodeId) renderFocusOverlay();
    });
  }

  function updateStatusBar() {
    const sel = state.selection;
    const hov = state.hover;
    const ftg = getFtgBand(sel.stim_rate_hz);
    statusBar.innerHTML = "";
    if (!hasData()) {
      statusBar.appendChild(el("span", { class: "nr-stat-item", text: "Waiting for an LFP JSON file" }));
      return;
    }
    const addStat = (dotClass, lblNode, valNode, crimson = false) => {
      const lblEl = typeof lblNode === "string" ? el("span", { text: `${lblNode}:` }) : lblNode;
      const valEl = typeof valNode === "string"
        ? el("span", { class: `nr-stat-val ${crimson ? "nr-crimson" : ""}`, text: valNode })
        : el("span", { class: `nr-stat-val ${crimson ? "nr-crimson" : ""}` }, [valNode]);
      statusBar.appendChild(
        el("span", { class: "nr-stat-item" }, [
          dotClass ? el("span", { class: `nr-stat-dot ${dotClass}` }) : null,
          lblEl,
          valEl,
        ])
      );
    };

    addStat(
      "nr-dot-black",
      texSpan(String.raw`\beta\text{ band}:`, "&beta; band:"),
      texSpan(String.raw`[13,\,30]\,\mathrm{Hz}`, "[13, 30] Hz")
    );
    addStat(
      "nr-dot-crimson",
      texSpan(String.raw`\mathrm{FTG}\;(\tfrac{1}{2}f_{\mathrm{stim}}):`, "FTG (<i>f</i><sub>stim</sub>/2):"),
      texSpan(
        String.raw`${fmtNum(ftg.center, 1)}\pm${fmtNum(ftg.half_bw, 1)}\,\mathrm{Hz}\;([${fmtNum(ftg.lo, 1)},\,${fmtNum(ftg.hi, 1)}])`,
        `${fmtNum(ftg.center, 1)} &plusmn; ${fmtNum(ftg.half_bw, 1)} Hz ([${fmtNum(ftg.lo, 1)}, ${fmtNum(ftg.hi, 1)}])`
      ),
      true
    );
    addStat("nr-dot-gray", "Selected", `${(sel.contacts || []).length} contacts · ${(sel.pairs || []).length} pairs · ${(sel.recordings || []).length} recs`);
    addStat(null, "DAG", `${state.nodes.length} nodes · ${state.edges.length} edges`);

    if (hov.armId || hov.contact || hov.pair || hov.freqHz !== null || hov.timeS !== null) {
      const liveParts = [];
      if (hov.armId) liveParts.push(`Arm ${hov.armId.split("|").slice(1).join(" · ")}`);
      if (hov.contact) liveParts.push(`Contact ${hov.contact}`);
      if (hov.pair && !hov.armId) liveParts.push(`Pair ${hov.pair}`);
      if (hov.freqHz !== null) liveParts.push(`${hov.freqHz} Hz${hov.band ? ` [${hov.band.toUpperCase()}]` : ""}`);
      if (hov.timeS !== null) liveParts.push(`t=${hov.timeS}s${hov.ampMa !== null ? ` (${hov.ampMa} mA)` : ""}`);
      addStat("nr-dot-crimson", "Live Cursor", liveParts.join(" · "), true);
    }
  }

  function renderAll() {
    try { coerceHemispheres(); } catch (err) { console.warn("Titra: hemisphere check", err); }
    renderEdges();
    renderNodes();
    renderMinimap();
    updateStatusBar();
    if (state.focusNodeId) renderFocusOverlay();
  }

  // ── Pure-Vector Standalone SVG Canvas Exporter (Zero <foreignObject>) ─
  function buildStandaloneSVG() {
    if (!state.nodes.length) return "<svg xmlns='http://www.w3.org/2000/svg'></svg>";
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of state.nodes) {
      const eh = n.collapsed ? 112 : n.h;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + eh);
    }
    const pad = 44;
    const headerH = 62;
    const W = Math.ceil(maxX - minX + pad * 2);
    const H = Math.ceil(maxY - minY + pad * 2 + headerH);
    const ox = -minX + pad;
    const oy = -minY + pad + headerH;

    const ftg = getFtgBand(state.selection.stim_rate_hz);
    const parts = [];
    parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
    parts.push(`<defs>`);
    parts.push(`<marker id="exp-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto"><path d="M 1 1.5 L 10.5 6 L 1 10.5 z" fill="${C.crimson}"/></marker>`);
    parts.push(`<pattern id="exp-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${C.silver}"/></pattern>`);
    parts.push(`</defs>`);

    // Background & Editorial Top Masthead
    parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${C.alabaster}"/>`);
    parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#exp-dots)"/>`);
    parts.push(`<rect x="0" y="0" width="${W}" height="5" fill="${C.crimson}"/>`);
    parts.push(`<rect x="0" y="5" width="${W}" height="${headerH - 5}" fill="${C.white}" stroke="${C.silver}" stroke-width="1"/>`);
    parts.push(`<text x="28" y="40" font-family='${FONT_SERIF}' font-size="22" font-weight="700" fill="${C.black}">Titra<tspan fill="${C.crimson}"> · </tspan>DAG Canvas</text>`);
    parts.push(`<text x="${W - 28}" y="40" text-anchor="end" font-family='${FONT_SANS}' font-size="14" font-weight="600" fill="${C.grayDark}">${escXml(meta.file_name || "")} · Beta 13–30 Hz · FTG ${ftg.center} Hz (${fmtNum(ftg.lo, 1)}–${fmtNum(ftg.hi, 1)} Hz)</text>`);

    // Edges (Normal-Aware Multi-Port Bézier Curves)
    const nodeById = new Map(state.nodes.map((n) => [n.id, n]));
    const expOutCounts = new Map();
    const usedPortsByNode = new Map(); // nodeId → Set(portId) actually carrying an edge
    const markUsed = (nid, pid) => {
      if (!usedPortsByNode.has(nid)) usedPortsByNode.set(nid, new Set());
      usedPortsByNode.get(nid).add(pid);
    };
    for (const e of state.edges) {
      const s = nodeById.get(e.source);
      const t = nodeById.get(e.target);
      if (!s || !t) continue;
      const sib = expOutCounts.get(e.source) || 0;
      expOutCounts.set(e.source, sib + 1);
      const { p1, p2 } = resolveEdgePorts(e, s, t, sib);
      markUsed(s.id, p1.id);
      markUsed(t.id, p2.id);
      const sp1 = { ...p1, x: p1.x + ox, y: p1.y + oy };
      const sp2 = { ...p2, x: p2.x + ox, y: p2.y + oy };
      const { d, mx, my } = buildEdgeBezier(sp1, sp2);
      parts.push(`<path d="${d}" fill="none" stroke="${C.crimson}" stroke-width="2.4" marker-end="url(#exp-arrow)"/>`);
      if (e.label) {
        const ly = my - 8;
        const tw = Math.max(76, e.label.length * 8.2 + 18);
        parts.push(`<rect x="${mx - tw / 2}" y="${ly - 13}" width="${tw}" height="24" rx="4" fill="${C.white}" stroke="${C.crimson}" stroke-width="1.1"/>`);
        parts.push(`<text x="${mx}" y="${ly + 4}" text-anchor="middle" font-family='${FONT_SANS}' font-size="14" font-weight="600" fill="${C.crimson}">${escXml(e.label)}</text>`);
      }
    }

    // Nodes (pure vector cards + ALL 4-edge multi-ports + embedded vector inner SVGs)
    const serializer = new XMLSerializer();
    for (const n of state.nodes) {
      const spec = NODE_CATALOG[n.type] || NODE_CATALOG.psd;
      const nx = n.x + ox, ny = n.y + oy;
      const eh = n.collapsed ? 104 : n.h;
      const isSel = (state.selection.selected_nodes || []).includes(n.id);

      parts.push(`<g transform="translate(${nx},${ny})">`);
      parts.push(`<rect x="0" y="0" width="${n.w}" height="${eh}" rx="6" fill="${C.white}" stroke="${isSel ? C.crimson : C.silver}" stroke-width="${isSel ? 2 : 1.5}"/>`);
      parts.push(`<rect x="0" y="0" width="${n.w}" height="44" rx="6" fill="${C.alabaster}" stroke="${C.silverSoft}" stroke-width="1"/>`);
      parts.push(`<rect x="12" y="10" width="70" height="24" rx="3" fill="${isSel ? C.crimson : C.black}"/>`);
      parts.push(`<text x="47" y="27" text-anchor="middle" font-family='${FONT_SANS}' font-size="14" font-weight="700" fill="${C.white}">${escXml(spec.badge)}</text>`);
      parts.push(`<text x="92" y="28" font-family='${FONT_SANS}' font-size="15" font-weight="700" fill="${C.black}">${escXml(n.title)}</text>`);

      // Only the ports that actually carry an edge (unused ports are omitted from the export)
      const usedHere = usedPortsByNode.get(n.id);
      if (usedHere) {
        for (const pt of getNodePorts(n)) {
          if (!usedHere.has(pt.id)) continue;
          const pCol = pt.edge === "right" || pt.edge === "bottom" ? C.crimson : C.black;
          parts.push(`<circle cx="${pt.rx}" cy="${pt.ry}" r="3.2" fill="${C.white}" stroke="${pCol}" stroke-width="1.3"/>`);
        }
      }

      if (n.collapsed) {
        const rec = getRecById(n.recordingId);
        const bs = rec?.band_stats;
        const txt = `${n.hemisphere || "Bilateral"} ${n.pair || ""} ${bs ? `· Beta ${fmtNum(bs.beta_db, 1)} dB · FTG ${fmtNum(bs.ftg_db, 1)} dB` : ""}`;
        parts.push(`<text x="14" y="78" font-family='${FONT_SANS}' font-size="14" font-weight="600" fill="${C.grayDark}">${escXml(txt)}</text>`);
      } else {
        const bw = Math.max(240, n.w - 20);
        const bh = Math.max(n.type === "ftg_controller" ? 86 : 160, n.h - 60);
        const content = buildNodeBodyContent(n, bw, bh);
        if (content instanceof SVGElement) {
          content.setAttribute("x", "10");
          content.setAttribute("y", "50");
          content.setAttribute("width", String(bw));
          content.setAttribute("height", String(bh));
          // Ensure font-family on root inner SVG
          content.setAttribute("font-family", FONT_SANS);
          parts.push(serializer.serializeToString(content));
        } else if (n.type === "therapy") {
          const groups = (getPayload().groups || []).filter((g) => g.stage === "Final");
          groups.forEach((g, gi) => {
            const gy = 66 + gi * 68;
            parts.push(`<rect x="14" y="${gy}" width="${n.w - 28}" height="58" rx="4" fill="${g.active ? C.crimsonTint : C.alabaster}" stroke="${g.active ? C.crimson : C.silver}"/>`);
            parts.push(`<text x="24" y="${gy + 22}" font-family='${FONT_SANS}' font-size="14" font-weight="700" fill="${C.black}">${escXml(g.group_id)} · ${g.rate_hz} Hz (FTG ${g.ftg_center_hz} Hz)</text>`);
            const hLine = Object.entries(g.hemispheres || {}).map(([h, hp]) => `${h}: ${hp.total_ma} mA (${hp.sensing_pair || "—"})`).join("  |  ");
            parts.push(`<text x="24" y="${gy + 44}" font-family='${FONT_SANS}' font-size="14" fill="${C.grayDark}">${escXml(hLine)}</text>`);
          });
        } else if (n.type === "inspector") {
          const secs = (getPayload().json_sections || []).slice(0, 11);
          secs.forEach((s, si) => {
            const ry = 70 + si * 28;
            const pin = (state.selection.json_paths || []).includes(s.path);
            parts.push(`<text x="16" y="${ry}" font-family='${FONT_SANS}' font-size="14" font-weight="${pin ? 700 : 500}" fill="${pin ? C.crimson : C.black}">${escXml((pin ? "✓ " : "") + s.key)}: ${escXml(s.value || `${s.type}(${s.count})`)}</text>`);
          });
        }
      }
      parts.push(`</g>`);
    }

    parts.push(`</svg>`);
    return parts.join("\n");
  }

  // ── Individual Object Pure-Vector SVG Exporter (Zero <foreignObject>) ─
  function buildSingleNodeSVG(node, opts = {}) {
    const spec = NODE_CATALOG[node.type] || NODE_CATALOG.psd;
    const pad = 16;
    const cardW = Math.max(420, Math.round(opts.width || Math.max(node.w || 0, spec.w)));
    const cardH = Math.max(node.type === "ftg_controller" ? 180 : 300, Math.round(opts.height || Math.max(node.h || 0, spec.h)));
    const headerH = 54;
    const W = cardW + pad * 2;
    const H = cardH + pad * 2;
    const ftg = getFtgBand(state.selection.stim_rate_hz);
    const serializer = new XMLSerializer();

    const parts = [];
    parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
    parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${C.alabaster}"/>`);

    parts.push(`<g transform="translate(${pad},${pad})">`);
    parts.push(`<rect x="0" y="0" width="${cardW}" height="${cardH}" rx="6" fill="${C.white}" stroke="${C.silver}" stroke-width="1.5"/>`);
    parts.push(`<rect x="0" y="0" width="${cardW}" height="4" rx="2" fill="${C.crimson}"/>`);
    parts.push(`<rect x="0" y="4" width="${cardW}" height="${headerH - 4}" fill="${C.alabaster}" stroke="${C.silverSoft}" stroke-width="1"/>`);
    const badgeW = Math.max(66, spec.badge.length * 10 + 18);
    parts.push(`<rect x="14" y="16" width="${badgeW}" height="26" rx="3" fill="${C.crimson}"/>`);
    parts.push(`<text x="${14 + badgeW / 2}" y="34" text-anchor="middle" font-family='${FONT_SANS}' font-size="14" font-weight="700" fill="${C.white}">${escXml(spec.badge)}</text>`);
    parts.push(`<text x="${26 + badgeW}" y="34" font-family='${FONT_SANS}' font-size="16" font-weight="700" fill="${C.black}">${escXml(node.title)}</text>`);
    parts.push(`<text x="${cardW - 14}" y="34" text-anchor="end" font-family='${FONT_SANS}' font-size="14" font-weight="500" fill="${C.grayDark}">${escXml(meta.file_name || "")} · FTG ${fmtNum(ftg.center, 1)} Hz</text>`);

    const bw = Math.max(280, cardW - 24);
    const bh = Math.max(180, cardH - headerH - 18);
    const content = safeNodeBody(node, bw, bh);
    if (content instanceof SVGElement) {
      content.setAttribute("x", "12");
      content.setAttribute("y", String(headerH + 8));
      content.setAttribute("width", String(bw));
      content.setAttribute("height", String(bh));
      content.setAttribute("font-family", FONT_SANS);
      parts.push(serializer.serializeToString(content));
    } else if (node.type === "therapy") {
      const groups = (getPayload().groups || []).filter((g) => g.stage === "Final");
      groups.forEach((g, gi) => {
        const gy = headerH + 16 + gi * 74;
        if (gy + 62 > cardH) return;
        parts.push(`<rect x="14" y="${gy}" width="${cardW - 28}" height="62" rx="4" fill="${g.active ? C.crimsonTint : C.alabaster}" stroke="${g.active ? C.crimson : C.silver}"/>`);
        parts.push(`<text x="24" y="${gy + 24}" font-family='${FONT_SANS}' font-size="14" font-weight="700" fill="${C.black}">${escXml(g.group_id)} · ${g.rate_hz} Hz (FTG ${g.ftg_center_hz} Hz)</text>`);
        const hLine = Object.entries(g.hemispheres || {}).map(([h, hp]) => `${h}: ${hp.total_ma} mA (${hp.sensing_pair || "—"})`).join("  |  ");
        parts.push(`<text x="24" y="${gy + 48}" font-family='${FONT_SANS}' font-size="14" fill="${C.grayDark}">${escXml(hLine)}</text>`);
      });
    } else if (node.type === "inspector") {
      const secs = (getPayload().json_sections || []).slice(0, 14);
      secs.forEach((s, si) => {
        const ry = headerH + 28 + si * 28;
        if (ry > cardH - 10) return;
        const pin = (state.selection.json_paths || []).includes(s.path);
        parts.push(`<text x="16" y="${ry}" font-family='${FONT_SANS}' font-size="14" font-weight="${pin ? 700 : 500}" fill="${pin ? C.crimson : C.black}">${escXml((pin ? "✓ " : "") + s.key)}: ${escXml(s.value || `${s.type}(${s.count})`)}</text>`);
      });
    }

    parts.push(`</g>`);
    parts.push(`</svg>`);
    return parts.join("\n");
  }

  function exportCanvasSVG() {
    const svgStr = buildStandaloneSVG();
    model.set("svg_output", svgStr);
    model.save_changes();
    downloadSVG(svgStr, `titra_dag_${(meta.file_name || "canvas").replace(/\.json$/i, "")}.svg`);
    exportBadge.textContent = "Canvas SVG exported";
    setTimeout(() => { exportBadge.textContent = ""; }, 2600);
  }

  /** Per-object export: "svg" (browser, vector) · "png" / "pdf" (Python + Typst, same rendering). */
  function exportObject(node, fmt, opts = {}) {
    if (!node) return;
    if (fmt === "svg") { exportSingleNodeSVG(node, opts); return; }
    if (fmt === "png" && !CAPS.typst) { exportSingleNodePNG(node, opts); return; }
    if (fmt === "pdf" && BROWSER_TYPST) { browserObjectPDF(node, opts); return; }
    requestReport([`obj_${fmt}`], null, { node, opts });
  }

  /** Small ⤓ export menu used in every object header and in the full-stage view. */
  function objectExportMenu(node, cls = "nr-obj-export", opts = {}) {
    const stop = (ev) => ev.stopPropagation();
    return el(
      "select",
      {
        class: cls,
        title: "Export this object: SVG (vector) · PNG (high-res) · PDF",
        onmousedown: stop,
        onclick: stop,
        onchange: (ev) => {
          const f = ev.target.value;
          ev.target.value = "";
          if (f) exportObject(node, f, opts);
        },
      },
      [
        el("option", { value: "", text: cls === "nr-obj-export" ? "⤓" : "Export object ▾" }),
        el("option", { value: "svg", text: "SVG (vector)" }),
        el("option", { value: "png", text: "PNG (high-res)" }),
        OFFER_TYPST ? el("option", { value: "pdf", text: "PDF" }) : null,
      ]
    );
  }

  function exportSingleNodeSVG(node, opts = {}) {
    const spec = NODE_CATALOG[node.type] || NODE_CATALOG.psd;
    const svgStr = buildSingleNodeSVG(node, opts);
    model.set("svg_output", svgStr);
    model.save_changes();
    const safeTitle = String(node.title || node.type)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);
    downloadSVG(svgStr, `titra_${node.type}_${safeTitle || "object"}.svg`);
    exportBadge.textContent = `${spec.badge} SVG exported`;
    setTimeout(() => { exportBadge.textContent = ""; }, 2600);
  }

  // ── Report Export (PDF · DOCX · PNG · ZIP) ─────────────────────────
  // The browser collects pure-vector SVGs + live analysis picks; Python (nr_report.py) builds the files
  // and returns them through the `report_result` traitlet (also saved to the reports/ folder).
  function armLabel(a) {
    return a ? (a.label || a.short_label || a.arm_id || "—") : "—";
  }

  function collectAnalysisSummary() {
    const fam = new Set(state.nodes.map((n) => String(n.type).split("_")[0]));
    const out = {};
    if (fam.has("gt")) {
      try {
        const gt = computeGT();
        if (gt && gt.arms && gt.arms.length) {
          const gp = getGTParams();
          const bLive = state.selection.gt_bandit_live || {};
          const A = gt.arms;
          const picks = [
            { method: "Mean-utility oracle", arm: armLabel(A[gt.bestIdx]), value: `U = ${A[gt.bestIdx].U.toFixed(2)}`, id: A[gt.bestIdx].arm_id },
            gt.A && gt.A[gt.maximinIdx]
              ? { method: "Pure minimax", arm: armLabel(A[gt.maximinIdx]), value: `min U = ${Math.min(...gt.A[gt.maximinIdx]).toFixed(2)}`, id: A[gt.maximinIdx].arm_id }
              : null,
            Number.isFinite(gt.gameVal)
              ? { method: "Zero-sum Nash (mixed)", arm: armLabel(A[gt.topNashIdx]), value: `v* = ${gt.gameVal.toFixed(2)}`, id: A[gt.topNashIdx]?.arm_id }
              : null,
            A[gt.nbsIdx] ? { method: "Nash bargaining", arm: armLabel(A[gt.nbsIdx]), value: `U = ${A[gt.nbsIdx].U.toFixed(2)}`, id: A[gt.nbsIdx].arm_id } : null,
            gt.sb
              ? { method: "Stackelberg (fitted curve)", arm: `${gt.sb.pair} · ${Math.round(gt.sb.stim_hz)} Hz @ ${gt.sb.aStar.toFixed(2)} mA`, value: `U* = ${gt.sb.UStar.toFixed(2)}`, id: gt.sbArm?.arm_id }
              : null,
            gt.sr
              ? { method: "Robust Stackelberg", arm: `${gt.sr.pair} · ${Math.round(gt.sr.stim_hz)} Hz @ ${gt.sr.aRobust.toFixed(2)} mA`, value: `U = ${gt.sr.URobust.toFixed(2)}`, id: gt.srArm?.arm_id }
              : null,
            bLive.recommended_arm_id
              ? { method: `Bandit (${gp.algo})`, arm: bLive.recommended_label || bLive.recommended_arm_id, value: bLive.recommended_U !== undefined ? `U = ${bLive.recommended_U}` : "", id: bLive.recommended_arm_id }
              : null,
          ].filter(Boolean);
          const votes = {};
          for (const pk of picks) if (pk.id) votes[pk.id] = (votes[pk.id] || 0) + 1;
          let maj = null, cnt = 0;
          for (const [k, v] of Object.entries(votes)) if (v > cnt) { cnt = v; maj = k; }
          const majArm = A.find((a) => a.arm_id === maj);
          const total = picks.filter((pk) => pk.id).length;
          picks.unshift({ method: `Majority consensus (${cnt}/${total})`, arm: armLabel(majArm), value: majArm ? `U = ${majArm.U.toFixed(2)}` : "" });
          out.gt = {
            hemi: gt.hemi,
            picks: picks.map(({ id, ...r }) => r),
            note: `Utility weights wβ = ${gp.wb}, wF = ${gp.wf}, wE = ${gp.we}, τ = ${gp.tau} dB · ${A.length} candidate arms`,
          };
        }
      } catch (err) { console.warn("Titra report: GT summary failed", err); }
    }
    const ruleBlock = (rk, note) => ({
      hemi: rk.hemi,
      majority: rk.majCnt ? `${rk.majLabel} (${rk.majCnt}/${rk.totalVotes ?? rk.rules.filter((r) => r.arm).length})` : "—",
      note,
      rules: rk.rules.map((r) => ({ name: r.name, arm: r.label || (r.arm ? armLabel(r.arm) : "—"), val: String(r.val ?? "") })),
    });
    if (fam.has("risk")) {
      try {
        const rk = computeRisk();
        if (rk && rk.rules) out.risk = ruleBlock(rk, `Target ${rk.target} · α = ${rk.alpha} · horizon ${rk.H} s · κ = ${rk.kappa} · ε = ${rk.eps}`);
      } catch (err) { console.warn("Titra report: risk summary failed", err); }
    }
    if (fam.has("opt")) {
      try {
        const op = computeOptions();
        if (op && op.rules) out.options = ruleBlock(op, `Strategy ${op.stratTitle} · T = ${op.T} s · steps ${op.steps}`);
      } catch (err) { console.warn("Titra report: option summary failed", err); }
    }
    if (fam.has("gsp")) {
      try {
        const gd = computeGspData();
        const gn = state.nodes.find((n) => String(n.type).startsWith("gsp_"));
        const ser = gn ? resolveGspSeries(gn, gd) : null;
        const m = ser && gd.analysed && gd.analysed[ser.id] ? gd.analysed[ser.id].measures : null;
        if (m) {
          out.gsp = {
            note: `Series ${ser.label || ser.id}`,
            rows: [
              ["λ₂ Fiedler value", fmtNum(m.fiedler_value, 3)],
              ["GTV β", fmtNum(m.gtv_beta, 3)],
              ["GTV FTG", fmtNum(m.gtv_ftg, 3)],
              ["LGFE β", fmtNum(m.lgfe_beta, 3)],
              ["LGFE FTG", fmtNum(m.lgfe_ftg, 3)],
              ["Graph spectral entropy", fmtNum(m.gse_all, 2)],
              ["Coherence", fmtNum(m.coherence, 2)],
            ],
          };
        }
      } catch (err) { console.warn("Titra report: GSP summary failed", err); }
    }
    return out;
  }

  function collectReportRequest(formats) {
    const titleOf = new Map(state.nodes.map((n) => [n.id, n.title]));
    const objects = state.nodes.map((n) => {
      const spec = NODE_CATALOG[n.type] || NODE_CATALOG.psd;
      // Report-size render: 760 px wide (≈ 9–10 pt text on A4), node aspect ratio preserved
      const W = 760;
      const H = Math.round(clamp(W * ((n.h || spec.h) / Math.max(1, n.w || spec.w)), 420, 900));
      let svg = "";
      try { svg = buildSingleNodeSVG(n, { width: W, height: H }); }
      catch (err) { console.warn("Titra report: object SVG failed", n.id, err); }
      return { id: n.id, type: n.type, badge: spec.badge, title: n.title, desc: objectDesc(n, spec), w: W, h: H, svg };
    });
    const presetText = presetSel.options[presetSel.selectedIndex] ? presetSel.options[presetSel.selectedIndex].text : "";
    return {
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      formats,
      file_stem: (meta.file_name || "session").replace(/\.json$/i, ""),
      canvas_svg: buildStandaloneSVG(),
      objects,
      analysis: collectAnalysisSummary(),
      selection: Object.assign(JSON.parse(JSON.stringify(state.selection)), {
        selected_node_titles: (state.selection.selected_nodes || []).map((id) => titleOf.get(id) || id),
      }),
      dag: {
        preset: presetText.replace(/^.*?Preset:\s*/, ""),
        n_nodes: state.nodes.length,
        n_edges: state.edges.length,
        edges: state.edges.map((e) => ({ source: titleOf.get(e.source) || e.source, target: titleOf.get(e.target) || e.target, label: e.label || "" })),
      },
    };
  }

  // Result panel: full multi-line messages (errors, diagnostics, partial failures)
  function showReportPanel(title, text, kind = "info") {
    const old = root.querySelector(".nr-report-panel");
    if (old) old.remove();
    const panel = el("div", { class: `nr-report-panel nr-report-${kind}` }, [
      el("div", { class: "nr-report-panel-head" }, [
        el("span", { text: title }),
        el("button", { class: "nr-icon-btn", text: "✕", title: "Close", onclick: () => panel.remove() }),
      ]),
      el("pre", { class: "nr-report-panel-body", text }),
    ]);
    viewportEl.appendChild(panel);
  }

  function collectObjectRequest(formats, node, opts = {}) {
    const spec = NODE_CATALOG[node.type] || NODE_CATALOG.psd;
    const svg = buildSingleNodeSVG(node, opts);
    return {
      id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      formats,
      file_stem: (meta.file_name || "session").replace(/\.json$/i, ""),
      objects: [{ id: node.id, type: node.type, badge: spec.badge, title: node.title, desc: objectDesc(node, spec), svg }],
    };
  }

  function requestReport(formats, action = null, objectCtx = null, prebuilt = null) {
    if (_pendingReport) { exportBadge.textContent = "A report is already being built…"; return; }
    let req;
    try {
      req = prebuilt
        ? prebuilt
        : action
        ? { id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, action, formats: [] }
        : objectCtx
        ? collectObjectRequest(formats, objectCtx.node, objectCtx.opts)
        : collectReportRequest(formats);
    } catch (err) {
      console.error(err);
      exportBadge.textContent = "Export failed in the browser";
      showReportPanel("Export failed (browser)", String(err && err.stack ? err.stack : err), "error");
      return;
    }
    const label = action ? REPORT_ACTIONS[action] : formats.map((f) => REPORT_FORMATS[f] || f).join(", ");
    exportBadge.textContent = `${action ? "Running" : "Building"} ${label}…`;
    reportSel.disabled = true;
    const slow = action === "install_tools" || formats.some((f) => f === "zip");
    const timer = setTimeout(() => {
      if (_pendingReport && _pendingReport.id === req.id) {
        _pendingReport = null;
        reportSel.disabled = false;
        exportBadge.textContent = "No response from Python";
        showReportPanel(
          "No response from Python",
          "The notebook kernel did not answer.\n\n• Restart the kernel (marimo: ⟳ Restart kernel) so the updated nr_widget.py / nr_report.py are loaded, then re-run.\n• Then use Export ▾ → Check export setup.",
          "error"
        );
      }
    }, slow ? 900000 : 240000);
    _pendingReport = { id: req.id, timer };
    const send = () => {
      model.set("report_request", req);
      model.save_changes();
    };
    if (!CAPS.typst && !action && !objectCtx && !req.rasters) {
      // no Typst on the Python side: render the figures here and send them along
      exportBadge.textContent = "Rendering figures…";
      (async () => {
        const rasters = {};
        try {
          if (req.canvas_svg) rasters.canvas = await blobToB64(await svgToPngBlob(req.canvas_svg, 1.5));
          const objs = req.objects || [];
          for (let i = 0; i < objs.length; i++) {
            if (objs[i].svg) rasters[`fig_${String(i).padStart(2, "0")}`] = await blobToB64(await svgToPngBlob(objs[i].svg, 2));
          }
        } catch (err) { console.warn("Titra: figure rendering failed", err); }
        req.rasters = rasters;
        exportBadge.textContent = `Building ${label}…`;
        send();
      })();
    } else {
      send();
    }
  }

  // One-shot Python calls (browser report pipeline): id → resolver
  const _rpcWaiters = {};
  function pythonCall(req, timeoutMs = 240000) {
    return new Promise((resolve, reject) => {
      const id = `rpc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const timer = setTimeout(() => { delete _rpcWaiters[id]; reject(new Error("No response from Python")); }, timeoutMs);
      _rpcWaiters[id] = (res) => { clearTimeout(timer); res.ok ? resolve(res) : reject(new Error(res.error || "Python error")); };
      model.set("report_request", Object.assign({}, req, { id }));
      model.save_changes();
    });
  }

  // ── typst.ts: the Typst compiler as WebAssembly (browser build only; loaded on first PDF export) ──
  // Override for self-hosting / tests: window.TITRA_TYPST = { bundle, compiler, renderer, fonts: [urls] }
  let _typstPromise = null;
  function loadTypst() {
    if (_typstPromise) return _typstPromise;
    const V = "0.7.0";
    const cfg = Object.assign({
      bundle: `https://cdn.jsdelivr.net/npm/@myriaddreamin/typst.ts@${V}/dist/esm/contrib/all-in-one-lite.bundle.js`,
      compiler: `https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@${V}/pkg/typst_ts_web_compiler_bg.wasm`,
      renderer: `https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer@${V}/pkg/typst_ts_renderer_bg.wasm`,
      fonts: null, // null → Typst's default text fonts (New Computer Modern …) from the typst-assets CDN
    }, (typeof window !== "undefined" && window.TITRA_TYPST) || {});
    _typstPromise = new Promise((resolve, reject) => {
      const ready = () => {
        const ts = window.$typst;
        if (!ts) { reject(new Error("typst.ts loaded but $typst is missing")); return; }
        ts.setCompilerInitOptions({ getModule: () => cfg.compiler });
        ts.setRendererInitOptions({ getModule: () => cfg.renderer });
        if (cfg.fonts && window.TypstSnippet) {
          ts.use(window.TypstSnippet.disableDefaultFontAssets(), window.TypstSnippet.preloadFonts(cfg.fonts));
        }
        resolve(ts);
      };
      if (window.$typst) { ready(); return; }
      const sc = document.createElement("script");
      sc.type = "module";
      sc.src = cfg.bundle;
      sc.onload = ready;
      sc.onerror = () => { _typstPromise = null; reject(new Error(`Could not load the Typst compiler (${cfg.bundle}). Check the internet connection.`)); };
      document.head.appendChild(sc);
    });
    return _typstPromise;
  }
  let _typstQueue = Promise.resolve();
  /** Compile main source + files with typst.ts → PDF bytes or an SVG string (calls are serialised). */
  function typstCompile(main, files, kind) {
    const run = async () => {
      const ts = await loadTypst();
      const enc = new TextEncoder();
      await ts.resetShadow();
      for (const [name, content] of Object.entries(files)) {
        await ts.mapShadow(`/${name}`, typeof content === "string" ? enc.encode(content) : content);
      }
      await ts.addSource("/main.typ", main);
      if (kind === "png") {
        // render the first page to a <canvas> (typst.ts SVG output cannot be drawn as an <img>)
        const host = document.createElement("div");
        host.style.cssText = "position:fixed;left:-20000px;top:0;width:2000px;pointer-events:none;opacity:0;";
        document.body.appendChild(host);
        try {
          await ts.canvas(host, { mainFilePath: "/main.typ", pixelPerPt: 2.8, backgroundColor: "#ffffff" });
          const cv = host.querySelector("canvas");
          if (!cv) throw new Error("Typst rendered no page");
          return await new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("PNG encoding failed"))), "image/png"));
        } finally {
          host.remove();
        }
      }
      const out = kind === "pdf" ? await ts.pdf({ mainFilePath: "/main.typ" }) : await ts.svg({ mainFilePath: "/main.typ" });
      if (!out) throw new Error("Typst produced no output");
      return out;
    };
    const p = _typstQueue.then(run, run);
    _typstQueue = p.catch(() => {});
    return p;
  }
  function bytesToB64(u8) {
    let bin = "";
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  /** Browser build: PDF / infographic / Word / ZIP with the report compiled by typst.ts in this page. */
  async function browserReport(fmt) {
    if (_pendingReport || _browserBusy) { exportBadge.textContent = "A report is already being built…"; return; }
    _browserBusy = true;
    reportSel.disabled = true;
    const t0 = performance.now();
    try {
      const req = collectReportRequest([fmt]);
      exportBadge.textContent = "Preparing report data…";
      const res = await pythonCall(Object.assign({}, req, { action: "typst_bundle" }));
      const b = res.bundle;
      const first = !window.$typst;
      exportBadge.textContent = first ? "Loading the Typst compiler (first time only, ~10 MB)…" : "Typesetting…";
      const files = (mode) => Object.assign({}, b.files, { "data.json": b.data[mode] });
      let pdf = null, info = null;
      if (fmt === "pdf" || fmt === "zip") {
        pdf = await typstCompile(b.main, files("report"), "pdf");
      }
      if (fmt === "png_infographic" || fmt === "docx" || fmt === "zip") {
        exportBadge.textContent = "Rendering the infographic…";
        info = await typstCompile(b.main, files("infographic"), "png");
      }
      if (fmt === "pdf") {
        downloadBlob(new Blob([pdf], { type: "application/pdf" }), `${b.stem}.pdf`);
      } else if (fmt === "png_infographic") {
        downloadBlob(info, `${b.stem}_infographic.png`);
      } else {
        // Word / ZIP: Python assembles them with the browser-rendered figures, PDF and infographic
        exportBadge.textContent = "Rendering figures…";
        const rasters = {};
        if (req.canvas_svg) rasters.canvas = await blobToB64(await svgToPngBlob(req.canvas_svg, 1.5));
        for (let i = 0; i < (req.objects || []).length; i++) {
          const o = req.objects[i];
          if (o.svg) rasters[`fig_${String(i).padStart(2, "0")}`] = await blobToB64(await svgToPngBlob(o.svg, 2));
        }
        const full = Object.assign({}, req, {
          id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          rasters,
          client_infographic: info ? await blobToB64(info) : undefined,
          client_pdf: pdf ? bytesToB64(pdf) : undefined,
        });
        _browserBusy = false;
        requestReport([fmt], null, null, full);
        return;
      }
      exportBadge.textContent = `${fmt === "pdf" ? "PDF" : "PNG"} ready (${((performance.now() - t0) / 1000).toFixed(1)}s)`;
      setTimeout(() => { if (!_pendingReport) exportBadge.textContent = ""; }, 9000);
    } catch (err) {
      console.error(err);
      exportBadge.textContent = "Export failed — see message";
      showReportPanel("Export failed", String(err && err.message ? err.message : err), "error");
    } finally {
      _browserBusy = false;
      if (!_pendingReport) reportSel.disabled = false;
    }
  }
  let _browserBusy = false;

  /** Browser build: one object as a vector PDF (typst.ts, page sized to the object). */
  async function browserObjectPDF(node, opts = {}) {
    try {
      exportBadge.textContent = window.$typst ? "Typesetting object PDF…" : "Loading the Typst compiler (first time only)…";
      const svg = buildSingleNodeSVG(node, opts);
      const m = svg.match(/viewBox="([\d.\-]+)[ ,]+([\d.\-]+)[ ,]+([\d.]+)[ ,]+([\d.]+)"/);
      const w = m ? parseFloat(m[3]) : 1200, h = m ? parseFloat(m[4]) : 800;
      const main = `#set page(width: ${(w * 0.75).toFixed(2)}pt, height: ${(h * 0.75).toFixed(2)}pt, margin: 0pt)\n#image("object.svg", width: 100%)\n`;
      const pdf = await typstCompile(main, { "object.svg": svg }, "pdf");
      const safe = String(node.title || node.type).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48);
      downloadBlob(new Blob([pdf], { type: "application/pdf" }), `titra_${node.type}_${safe || "object"}.pdf`);
      exportBadge.textContent = "Object PDF exported";
    } catch (err) {
      exportBadge.textContent = "PDF export failed";
      showReportPanel("PDF export failed", String(err && err.message ? err.message : err), "error");
    }
    setTimeout(() => { exportBadge.textContent = ""; }, 4000);
  }

  function onReportResult() {
    const res = model.get("report_result") || {};
    if (res.id && _rpcWaiters[res.id]) {
      const w = _rpcWaiters[res.id];
      delete _rpcWaiters[res.id];
      w(res);
      return;
    }
    if (!_pendingReport || res.id !== _pendingReport.id) return;
    clearTimeout(_pendingReport.timer);
    _pendingReport = null;
    reportSel.disabled = false;
    if (!res.ok) {
      exportBadge.textContent = "Export failed — see message";
      showReportPanel("Export failed", `${res.error || "unknown error"}${res.log ? `\n\nDetails: ${res.log}` : ""}`, "error");
      return;
    }
    if (res.message) {
      exportBadge.textContent = `${res.title || "Done"} (${res.elapsed_s}s)`;
      showReportPanel(res.title || "Export", res.message, /✗/.test(res.message) ? "error" : "info");
      return;
    }
    for (const f of res.files || []) {
      if (f.b64) downloadB64(f.b64, f.name, f.mime);
    }
    const kinds = (res.files || []).map((f) => f.name.split(".").pop().toUpperCase()).join(" + ");
    exportBadge.textContent = `${kinds} ready (${res.elapsed_s}s)${CAPS.wasm ? "" : " · saved in reports/"}`;
    const errs = Object.entries(res.errors || {});
    if (errs.length) {
      showReportPanel(
        "Some formats could not be built",
        errs.map(([k, v]) => `${REPORT_FORMATS[k] || k}:\n  ${v}`).join("\n\n") + `\n\nDelivered: ${(res.files || []).map((f) => f.name).join(", ")}`,
        "error"
      );
    } else if ((res.warnings || []).length) {
      exportBadge.title = res.warnings.join("\n");
    }
    setTimeout(() => { if (!_pendingReport) exportBadge.textContent = ""; }, 12000);
  }
  model.on("change:report_result", onReportResult);

  function downloadB64(b64, filename, mime) {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    downloadBlob(new Blob([u8], { type: mime || "application/octet-stream" }), filename);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /** Render an SVG string to PNG in the browser (used where Typst is unavailable, e.g. the web build). */
  function svgToPngBlob(svgStr, scale = 2) {
    return new Promise((resolve, reject) => {
      const m = svgStr.match(/viewBox="([\d.\-]+)[ ,]+([\d.\-]+)[ ,]+([\d.]+)[ ,]+([\d.]+)"/);
      const w = m ? parseFloat(m[3]) : 1200, h = m ? parseFloat(m[4]) : 800;
      const k = Math.min(scale, 8000 / Math.max(w, h));
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" }));
      img.onload = () => {
        try {
          const cv = document.createElement("canvas");
          cv.width = Math.round(w * k); cv.height = Math.round(h * k);
          const ctx = cv.getContext("2d");
          ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
          URL.revokeObjectURL(url);
          cv.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))), "image/png");
        } catch (e) { reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("The SVG could not be rendered")); };
      img.src = url;
    });
  }
  function blobToB64(blob) {
    return new Promise((resolve) => {
      const rd = new FileReader();
      rd.onload = () => resolve(String(rd.result).split(",")[1] || "");
      rd.readAsDataURL(blob);
    });
  }
  async function exportCanvasPNG() {
    try {
      exportBadge.textContent = "Rendering canvas PNG…";
      const blob = await svgToPngBlob(buildStandaloneSVG(), 2);
      downloadBlob(blob, `titra_dag_${(meta.file_name || "canvas").replace(/\.json$/i, "")}.png`);
      exportBadge.textContent = "Canvas PNG exported";
    } catch (err) {
      exportBadge.textContent = "PNG export failed";
      showReportPanel("PNG export failed", String(err && err.message ? err.message : err), "error");
    }
    setTimeout(() => { exportBadge.textContent = ""; }, 2600);
  }
  async function exportSingleNodePNG(node, opts = {}) {
    try {
      const blob = await svgToPngBlob(buildSingleNodeSVG(node, opts), 3);
      const safe = String(node.title || node.type).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48);
      downloadBlob(blob, `titra_${node.type}_${safe || "object"}.png`);
    } catch (err) {
      showReportPanel("PNG export failed", String(err && err.message ? err.message : err), "error");
    }
  }

  function downloadSVG(svgStr, filename) {
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Initialize from saved dag_state or preset ───────────────────────
  const initialDag = model.get("dag_state");
  if (initialDag && Array.isArray(initialDag.nodes) && initialDag.nodes.length > 0) {
    state.nodes = JSON.parse(JSON.stringify(initialDag.nodes));
    state.edges = JSON.parse(JSON.stringify(initialDag.edges || []));
    if (initialDag.viewport) state.viewport = Object.assign(state.viewport, initialDag.viewport);
    renderAll();
    applyViewport();
  } else {
    loadPreset(model.get("preset") || "beta_ftg");
  }
  syncWelcomeVisibility();

  // Drag & drop an LFP JSON anywhere on the studio (welcome screen or DAG canvas) → LFP Input
  let _dragDepth = 0;
  const isFileDrag = (ev) => ev.dataTransfer && Array.from(ev.dataTransfer.types || []).includes("Files");
  const setWelcomeDragLabel = (active) => {
    welcomeDropTitleEl.textContent = active
      ? "Release to load into Titra"
      : "Drop an LFP JSON file here, or click to browse";
  };
  root.addEventListener("dragenter", (ev) => {
    if (!isFileDrag(ev)) return;
    ev.preventDefault();
    _dragDepth++;
    root.classList.add("nr-drop-active");
    root.setAttribute("data-drop-hint", inputState().loaded ? "Drop to ADD to the loaded data — merged into every object; conflicting files are rejected" : "Drop LFP JSON file(s) to load");
    setWelcomeDragLabel(true);
  });
  root.addEventListener("dragover", (ev) => { if (!isFileDrag(ev)) return; ev.preventDefault(); ev.dataTransfer.dropEffect = "copy"; });
  root.addEventListener("dragleave", (ev) => {
    if (!isFileDrag(ev)) return;
    _dragDepth = Math.max(0, _dragDepth - 1);
    if (!_dragDepth) {
      root.classList.remove("nr-drop-active");
      setWelcomeDragLabel(false);
    }
  });
  root.addEventListener("drop", (ev) => {
    if (!isFileDrag(ev)) return;
    ev.preventDefault();
    _dragDepth = 0;
    root.classList.remove("nr-drop-active");
    setWelcomeDragLabel(false);
    const fs = Array.from((ev.dataTransfer && ev.dataTransfer.files) || []);
    if (!fs.length) return;
    if (!state.nodes.some((n) => n.type === "input")) {
      state.nodes.unshift(inputRootNode(60, 60));
      renderAll();
    }
    if (inputState().loaded) addInputFiles(fs);          // data loaded → merge into it
    else if (fs.length > 1) addInputFiles(fs, true);     // several files → one dataset
    else handleInputFile(fs[0]);
  });

  // Data Input: ask Python for the file list if it has not provided one
  if (inputState().data_dir && !(inputState().files || []).length) setTimeout(() => inputRequest("scan"), 400);

  // Listen for Python-side payload / preset updates
  model.on("change:payload", () => {
    state.payload = model.get("payload") || {};
    // new data → new selection (Python sends it first) and session label
    state.selection = Object.assign({}, state.selection, model.get("selection") || {});
    meta = getPayload().metadata || {};
    _caps = null;
    refreshLeadKinds();
    const bs = root.querySelector(".nr-brand-session");
    if (bs) bs.textContent = meta.file_name ? `${meta.device_name || "Percept"} · ${meta.file_name}` : "No file loaded";
    _gtCacheKey = "";
    _riskCacheKey = "";
    _optCacheKey = "";
    _gspCacheKey = "";
    resetBandit(computeGT());
    if (hasData()) {
      _welcomeDismissed = true;
      welcomeStageEl.setAttribute("hidden", "");
      root.classList.remove("nr-welcome-mode");
    }
    loadPreset((presetSel && presetSel.value) || model.get("preset") || "beta_ftg");
    if (_progress.active) {
      finishInputProgress(hasData());
    } else {
      syncWelcomeVisibility();
    }
  });
  model.on("change:preset", () => {
    const p = model.get("preset");
    if (p) {
      presetSel.value = p;
      loadPreset(p);
    }
  });

  // Ensure KaTeX LaTeX renderer is ready, then refresh formula strips cleanly
  ensureKaTeX(() => renderAll());

  // Auto-refit canvas when entering/exiting fullscreen landscape
  let _fsTimer = null;
  const onFullscreenChange = () => {
    root.classList.toggle("nr-is-fullscreen", isRootFullscreen());
    if (_fsTimer) clearTimeout(_fsTimer);
    _fsTimer = setTimeout(() => { fitCanvasToNodes(); if (state.focusNodeId) renderFocusOverlay(); }, 90);
  };
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);

  // Refit when the canvas itself changes size (marimo cell expand, window resize, slide mode)
  let _lastVp = { w: 0, h: 0 };
  let _roTimer = null;
  const resizeObs = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver((entries) => {
        const cr = entries[0] && entries[0].contentRect;
        if (!cr || cr.width < 50 || cr.height < 50) return;
        if (Math.abs(cr.width - _lastVp.w) < 24 && Math.abs(cr.height - _lastVp.h) < 24) return;
        _lastVp = { w: cr.width, h: cr.height };
        if (_roTimer) clearTimeout(_roTimer);
        _roTimer = setTimeout(() => { fitCanvasToNodes(); if (state.focusNodeId) renderFocusOverlay(); }, 120);
      })
    : null;
  if (resizeObs) resizeObs.observe(viewportEl);

  // Fit once layout settles
  setTimeout(fitCanvasToNodes, 120);

  return () => {
    if (state.bandit.timer) clearInterval(state.bandit.timer);
    if (_clearedToastTimer) clearTimeout(_clearedToastTimer);
    _clearProgressTimers();
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    if (resizeObs) resizeObs.disconnect();
    if (_pendingReport) clearTimeout(_pendingReport.timer);
    model.off?.("change:report_result", onReportResult);
    model.off?.("change:input_state", onInputStateChange);
    closeCtxMenu();
  };
}

export default { render };
