const GITHUB_REPO_URL = "https://github.com/Whauv/ResumePR";

const productHighlights = [
  {
    label: "Pull Request Resume Review",
    title: "Accept or reject every suggested edit.",
    body:
      "ResumePR treats resume tailoring like a code review, so users can inspect before-and-after wording instead of accepting a full rewrite blindly."
  },
  {
    label: "Section-Level Gap Analysis",
    title: "See what is missing by skills, summary, and experience.",
    body:
      "The product breaks down ATS alignment per section and highlights the highest-value missing keywords before any AI edits are proposed."
  },
  {
    label: "Version History",
    title: "Keep every tailored version tied to a job application.",
    body:
      "Users can compare revisions, restore older variants, and export the resume version that best fits a specific company and role."
  },
  {
    label: "Extension Sync",
    title: "Pull job descriptions directly from supported job boards.",
    body:
      "The Chrome extension captures active-tab job details and sends them into the web app so the editing workflow starts with less manual copy-paste."
  }
];

const workflowSteps = [
  {
    step: "01",
    title: "Upload a source resume",
    body: "Import a PDF or DOCX resume so ResumePR can parse the structure into summary, skills, education, and experience bullets."
  },
  {
    step: "02",
    title: "Ingest a job description",
    body: "Paste a job URL, paste raw text, or use the extension to pull the job description from the page you are already viewing."
  },
  {
    step: "03",
    title: "Review the skills gap",
    body: "Inspect matched keywords, missing requirements, ATS red flags, and section-by-section alignment before making any changes."
  },
  {
    step: "04",
    title: "Approve only the edits you trust",
    body: "Generate targeted AI suggestions, accept or reject them one by one, then save a new version and export the final document."
  }
];

const installSteps = [
  {
    title: "1. Clone and configure",
    body: "Clone the repo, create the backend and frontend env files, and add your Firebase plus Groq or Gemini credentials."
  },
  {
    title: "2. Start the backend",
    body: "Install Python dependencies, download the spaCy model, and run the FastAPI server on port 8000."
  },
  {
    title: "3. Start the frontend",
    body: "Install the Vite app dependencies and run the web client on port 5173."
  },
  {
    title: "4. Load the extension",
    body: "Enable Chrome developer mode, load the unpacked extension folder, and start sending job descriptions into the product."
  }
];

export default function LandingPage() {
  return (
    <main className="lp-root">
      <div className="lp-wrap">
        <header className="lp-nav-shell">
          <div className="lp-nav-row">
            <div className="lp-brand">
              <p className="lp-brand-main">RESUMEPR</p>
              <p className="lp-brand-sub">Resume tailoring with pull request clarity</p>
            </div>
            <nav className="lp-nav-links">
              <a href="#how-it-works">How it works</a>
              <a href="#install">Install</a>
              <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">GitHub Repo</a>
            </nav>
            <a href="/app" className="lp-cta-open">Open Product</a>
          </div>
          <div className="lp-version-strip">
            <div className="lp-marquee">
              <span>v1.0 · Section-level gap analysis · Accept/reject diffs · Version history · Chrome extension sync · FastAPI + NLP backend · Firebase auth ·</span>
            </div>
          </div>
        </header>

        <section className="lp-hero">
          <div className="lp-hero-grid">
            <div>
              <span className="lp-hero-badge">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 5v6m0 0a3 3 0 100 6 3 3 0 000-6zm0 0h10m0 0a3 3 0 110 6 3 3 0 010-6zm0 0V5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"></path></svg>
                Resume review workflow for real job applications
              </span>

              <h1 className="lp-h1">
                <span className="lp-hline">Turn resume tailoring</span>
                <span className="lp-hline">into a <span className="lp-teal">review flow</span></span>
                <span className="lp-hline">instead of a</span>
                <span className="lp-hline"><span className="lp-strike">black-box rewrite.</span></span>
              </h1>

              <p className="lp-hero-body">
                ResumePR compares a resume against a live job description, surfaces section-level gaps, generates targeted AI edits,
                and lets the user accept or reject each suggestion one by one before exporting a final version.
              </p>

              <div className="lp-hero-actions">
                <a href="/app" className="lp-btn-primary">Launch the app</a>
                <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className="lp-btn-secondary">View source on GitHub</a>
              </div>

              <div className="lp-pipeline">
                <div className="lp-stage">
                  <p className="lp-stage-label">Input</p>
                  <p className="lp-stage-value">Resume upload, URL ingestion, raw job text, and Chrome extension sync.</p>
                </div>
                <span className="lp-arrow">→</span>
                <div className="lp-stage lp-stage-active">
                  <p className="lp-stage-label">Review</p>
                  <p className="lp-stage-value">Gap analysis, diff review, edit approval, and version comparisons.</p>
                </div>
                <span className="lp-arrow">→</span>
                <div className="lp-stage">
                  <p className="lp-stage-label">Output</p>
                  <p className="lp-stage-value">Saved tailored resumes plus export and restore support for each application.</p>
                </div>
              </div>
            </div>

            <aside className="lp-right">
              <article className="lp-diff-panel">
                <div className="lp-diff-head">
                  <div className="lp-diff-file"><span className="lp-dot"></span>resume-v2.diff</div>
                  <span className="lp-ver-pill">v2 ← v1</span>
                </div>
                <div className="lp-diff-body">
                  <div className="lp-diff-row"><span className="lp-no">L18</span><span className="lp-change"><span className="lp-del">- built dashboards</span> <span className="lp-add">+ built analytics dashboards with SQL + Python</span></span><span className="lp-status lp-accept">accept</span></div>
                  <div className="lp-diff-row"><span className="lp-no">L24</span><span className="lp-change"><span className="lp-del">- improved process</span> <span className="lp-add">+ improved release process, cutting cycle time by 28%</span></span><span className="lp-status lp-accept">accept</span></div>
                  <div className="lp-diff-row"><span className="lp-no">L31</span><span className="lp-change"><span className="lp-del">- worked with team</span> <span className="lp-add">+ partnered with product + design on A/B experiments</span></span><span className="lp-status lp-reject">reject</span></div>
                  <div className="lp-diff-row"><span className="lp-no">L39</span><span className="lp-change"><span className="lp-del">- managed deployment</span> <span className="lp-add">+ managed CI/CD deployment workflows in GitHub Actions</span></span><span className="lp-status lp-accept">accept</span></div>
                  <div className="lp-diff-row"><span className="lp-no">L44</span><span className="lp-change"><span className="lp-del">- mentored interns</span> <span className="lp-add">+ mentored 3 interns through sprint planning and code reviews</span></span><span className="lp-status lp-accept">accept</span></div>
                </div>
              </article>

              <article className="lp-aside">
                <p className="lp-eyebrow">Why this product exists</p>
                <h2 className="lp-h2">ResumePR helps users tailor resumes without losing trust in the final wording.</h2>
                <div className="lp-subcards">
                  <section className="lp-sub"><h4>Problem</h4><p>Most resume tools either give a shallow ATS score or rewrite content so aggressively that the user stops trusting it.</p></section>
                  <section className="lp-sub"><h4>Approach</h4><p>This product keeps the user in control by surfacing targeted, job-aware suggestions against the original resume text.</p></section>
                  <section className="lp-sub"><h4>Built with</h4><p>React, FastAPI, Firebase Auth, local NLP tooling, and free-tier AI providers for practical portfolio-ready deployment.</p></section>
                </div>
                <div className="lp-quick">
                  <h4>Quick start links</h4>
                  <div className="lp-q-links">
                    <a href="/login">Sign in to ResumePR</a>
                    <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">Open the repository</a>
                  </div>
                </div>
              </article>
            </aside>
          </div>
        </section>

        <section className="lp-block">
          <header className="lp-section-head">
            <p className="lp-eyebrow">What users get</p>
            <h3>A product page that sets expectations before the workspace opens.</h3>
            <p className="lp-desc">This landing page makes the project easier to understand for recruiters, collaborators, and first-time users before they enter the tool itself.</p>
          </header>
          <div className="lp-feature-grid">
            {productHighlights.map((item) => (
              <article key={item.title} className="lp-feature-card">
                <p className="lp-lbl">{item.label}</p>
                <h4>{item.title}</h4>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="lp-block">
          <header className="lp-section-head">
            <p className="lp-eyebrow">Workflow</p>
            <h3>How ResumePR moves from job posting to polished export.</h3>
          </header>
          <div className="lp-workflow-grid">
            {workflowSteps.map((item) => (
              <article key={item.step} className="lp-workflow-card">
                <div className="lp-workflow-top"><span className="lp-step">Step {item.step}</span><span className="lp-tag">Review flow</span></div>
                <h4>{item.title}</h4>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="install" className="lp-block">
          <div className="lp-install-grid">
            <article className="lp-install-main">
              <p className="lp-eyebrow">Install</p>
              <h3>Set up the full stack locally.</h3>
              <p>The repo already contains the web app, API, and Chrome extension. These are the core steps users need before trying the product.</p>
              <div className="lp-cmds">
                <div className="lp-cmd">git clone https://github.com/Whauv/ResumePR.git</div>
                <div className="lp-cmd">cd ResumePR</div>
                <div className="lp-cmd">npm run dev:web</div>
                <div className="lp-cmd">uvicorn resumepr_api.main:app --reload --app-dir apps/api/src</div>
              </div>
            </article>
            <div className="lp-install-steps">
              {installSteps.map((item) => (
                <article key={item.title} className="lp-install-step">
                  <h4>{item.title}</h4>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-ready">
          <div className="lp-ready-left">
            <p className="lp-eyebrow">Ready to try it</p>
            <h3>Use the landing page as the front door, then move into the authenticated product workspace.</h3>
            <p>The GitHub link gives technical context, and the product link drops users into the actual app you have already built.</p>
          </div>
          <div className="lp-ready-actions">
            <a href="/app" className="lp-open">Open ResumePR</a>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className="lp-repo">Explore the repo</a>
          </div>
        </section>
      </div>
    </main>
  );
}
