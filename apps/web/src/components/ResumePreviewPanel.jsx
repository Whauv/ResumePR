import CollapsibleCard from "./CollapsibleCard";

export default function ResumePreviewPanel({ parsedResume, metadata }) {
  return (
    <div className="space-y-5">
      <CollapsibleCard
        title={parsedResume?.name || "Resume Preview"}
        subtitle={metadata ? `${metadata.fileName} - ${metadata.resumeId}` : "Upload a resume to inspect section coverage."}
      >
        {parsedResume ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Contact</p>
              <pre className="mt-2 overflow-x-auto rounded-[1.4rem] border border-stone-200/80 bg-white/70 p-4 text-sm text-stone-700">
                {JSON.stringify(parsedResume.contact, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Summary</p>
              <p className="mt-2 text-sm leading-7 text-stone-700">{parsedResume.summary || "No summary detected yet."}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-stone-500">Your uploaded resume will appear here.</p>
        )}
      </CollapsibleCard>

      <CollapsibleCard title="Experience" defaultOpen={false}>
        <div className="space-y-4">
          {(parsedResume?.experience || []).length ? (
            parsedResume.experience.map((item, index) => (
              <article key={`${item.title}-${index}`} className="rounded-[1.5rem] border border-stone-200/80 bg-white/70 p-4">
                <h3 className="font-semibold text-stone-900">{item.title || "Untitled role"}</h3>
                <p className="mt-1 text-sm text-stone-600">
                  {[item.company, item.dates].filter(Boolean).join(" - ") || "Details unavailable"}
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
                  {item.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex} className="rounded-xl bg-white/90 px-3 py-2 shadow-sm">
                      {bullet}
                    </li>
                  ))}
                </ul>
              </article>
            ))
          ) : (
            <p className="text-sm text-stone-500">No experience entries detected yet.</p>
          )}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Skills" defaultOpen={false}>
        {(parsedResume?.skills || []).length ? (
          <div className="flex flex-wrap gap-2">
            {parsedResume.skills.map((skill, index) => (
              <span
                key={`${skill}-${index}`}
                className="rounded-full border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-medium text-accent shadow-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500">No skills detected yet.</p>
        )}
      </CollapsibleCard>

      <CollapsibleCard title="Education" defaultOpen={false}>
        <div className="space-y-4">
          {(parsedResume?.education || []).length ? (
            parsedResume.education.map((item, index) => (
              <article key={`${item.degree}-${index}`} className="rounded-[1.5rem] border border-stone-200/80 bg-white/70 p-4">
                <h3 className="font-semibold text-stone-900">{item.degree || "Degree not detected"}</h3>
                <p className="mt-1 text-sm text-stone-600">
                  {[item.institution, item.dates].filter(Boolean).join(" - ") || "Details unavailable"}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-stone-500">No education entries detected yet.</p>
          )}
        </div>
      </CollapsibleCard>
    </div>
  );
}
