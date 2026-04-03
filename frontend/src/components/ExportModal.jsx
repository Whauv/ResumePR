import { useEffect, useMemo, useState } from "react";

const templates = ["modern", "classic", "minimal"];

function ResumeHtml({ resume, template }) {
  const theme = {
    modern: "border-t-4 border-accent",
    classic: "border border-stone-300",
    minimal: "border-l-4 border-stone-300"
  }[template];

  return (
    <div className={`rounded-3xl bg-white p-8 shadow-panel ${theme}`}>
      <h2 className="text-3xl font-semibold text-stone-950">{resume.name || "Resume"}</h2>
      <p className="mt-2 text-sm text-stone-500">
        {Object.entries(resume.contact || {}).map(([key, value]) => `${key}: ${value}`).join(" | ")}
      </p>

      {resume.summary ? (
        <section className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Summary</h3>
          <p className="mt-2 text-sm leading-7 text-stone-700">{resume.summary}</p>
        </section>
      ) : null}

      {resume.skills?.length ? (
        <section className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Skills</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {resume.skills.map((skill) => (
              <span key={skill} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                {skill}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {resume.experience?.length ? (
        <section className="mt-6 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Experience</h3>
          {resume.experience.map((item, index) => (
            <article key={`${item.title}-${index}`}>
              <p className="font-semibold text-stone-900">{[item.title, item.company].filter(Boolean).join(" - ")}</p>
              <p className="text-sm text-stone-500">{item.dates}</p>
              <ul className="mt-2 space-y-1 text-sm text-stone-700">
                {item.bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex}>* {bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export default function ExportModal({ version, initialFormat = "pdf", onClose }) {
  const [format, setFormat] = useState(initialFormat);
  const [template, setTemplate] = useState("modern");
  const [state, setState] = useState("idle");
  const previewResume = useMemo(() => version?.resume_json || { contact: {}, skills: [], experience: [] }, [version]);

  useEffect(() => {
    setFormat(initialFormat);
  }, [initialFormat]);

  async function handleDownload() {
    if (!version) return;
    setState("loading");
    const response = await fetch(`/api/versions/${version.version_id}/export?format=${format}&template=${template}`, {
      method: "POST"
    });
    if (!response.ok) {
      setState("error");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resume-v${version.metadata.version_number}.${format}`;
    link.click();
    window.URL.revokeObjectURL(url);
    setState("success");
  }

  if (!version) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[2rem] border border-stone-200 bg-stone-100 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.25)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Export Resume</p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">Version {version.metadata.version_number}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-700">
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.35fr_0.65fr]">
          <section className="space-y-5 rounded-[2rem] bg-white p-5 shadow-panel">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Format</p>
              <div className="mt-3 flex gap-2">
                {["pdf", "docx"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFormat(item)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      format === item ? "bg-accent text-white" : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Template</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {templates.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTemplate(item)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      template === item ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {item[0].toUpperCase() + item.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
            >
              {state === "loading" ? "Preparing..." : `Download ${format.toUpperCase()}`}
            </button>
          </section>

          <section className="rounded-[2rem] bg-stone-50 p-5">
            <ResumeHtml resume={previewResume} template={template} />
          </section>
        </div>
      </div>
    </div>
  );
}
