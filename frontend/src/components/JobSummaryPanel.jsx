import CollapsibleCard from "./CollapsibleCard";

function SkillChips({ items, tone }) {
  const styles =
    tone === "accent"
      ? "border-accent/20 bg-accent/10 text-accent"
      : "border-stone-200 bg-stone-100 text-stone-700";

  if (!items?.length) {
    return <p className="text-sm text-stone-500">No keywords detected yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full border px-3 py-2 text-sm font-medium ${styles}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function JobSummaryPanel({ parsedJob }) {
  return (
    <div className="space-y-5">
      <CollapsibleCard
        title={parsedJob?.job_title || "Job Summary"}
        subtitle={parsedJob?.company_name || "Analyze a job description to see the target profile."}
      >
        {parsedJob ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Required Skills</p>
              <div className="mt-3">
                <SkillChips items={parsedJob.required_skills} tone="accent" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Preferred Skills</p>
              <div className="mt-3">
                <SkillChips items={parsedJob.preferred_skills} tone="muted" />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-stone-500">Parsed job requirements will appear here.</p>
        )}
      </CollapsibleCard>

      <CollapsibleCard title="Requirements" defaultOpen={false}>
        {parsedJob ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Experience</p>
              <p className="mt-2 text-sm text-stone-700">
                {parsedJob.experience_years ? `${parsedJob.experience_years}+ years` : "Not explicitly detected"}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Education</p>
              <p className="mt-2 text-sm text-stone-700">
                {parsedJob.education_requirement || "No formal education requirement detected"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-500">No job requirements loaded yet.</p>
        )}
      </CollapsibleCard>

      <CollapsibleCard title="Job Description" defaultOpen={false}>
        {parsedJob ? (
          <div className="max-h-72 overflow-auto rounded-3xl border border-stone-200 bg-white p-4 text-sm leading-7 text-stone-700">
            {parsedJob.raw_text}
          </div>
        ) : (
          <p className="text-sm text-stone-500">The original job description text will appear here.</p>
        )}
      </CollapsibleCard>
    </div>
  );
}
