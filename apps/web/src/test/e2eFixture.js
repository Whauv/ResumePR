export const E2E_RESUME_PAYLOAD = {
  resume_id: "resume-e2e-1",
  file_name: "jane-doe.docx",
  file_type: "docx",
  parsed_resume: {
    name: "Jane Doe",
    contact: {
      email: "jane@example.com",
      phone: "(555) 123-4567",
      location: "Denver, CO"
    },
    summary: "Platform-oriented engineer with React, Python, and FastAPI experience.",
    experience: [
      {
        title: "Software Engineer",
        company: "Acme Corp",
        dates: "2022 - Present",
        bullets: [
          "Built React dashboards for recruiting teams.",
          "Automated resume parsing workflows in Python."
        ]
      }
    ],
    education: [
      {
        degree: "B.S. Computer Science",
        institution: "University of Colorado",
        dates: "2018 - 2022"
      }
    ],
    skills: ["Python", "React", "FastAPI", "SQL"]
  }
};

export const E2E_JOB = {
  job_id: "job-e2e-1",
  job_title: "Platform Engineer",
  company_name: "Example Co",
  required_skills: ["Python", "AWS", "Docker"],
  preferred_skills: ["Kubernetes", "React"],
  experience_years: 3,
  education_requirement: "Bachelor's degree in Computer Science",
  raw_text: "We are hiring a Platform Engineer with Python, AWS, Docker, Kubernetes, and React experience."
};

export const E2E_ANALYSIS = {
  analysis_id: "analysis-e2e-1",
  resume_id: "resume-e2e-1",
  job_id: "job-e2e-1",
  report: {
    overall_score: 78,
    sections: {
      skills: { matched: ["Python", "React"], missing: ["AWS", "Docker"], semantic_matches: [], score: 74 },
      experience: { matched: ["Python"], missing: ["AWS", "Docker", "Kubernetes"], semantic_matches: [], score: 69 },
      summary: { matched: ["Python"], missing: ["AWS"], semantic_matches: [], score: 62 }
    },
    top_missing_keywords: ["AWS", "Docker", "Kubernetes"],
    ats_red_flags: []
  }
};

export const E2E_SUGGESTIONS = {
  suggestion_batch_id: "batch-e2e-1",
  resume_id: "resume-e2e-1",
  job_id: "job-e2e-1",
  suggestions: [
    {
      id: "suggestion-e2e-1",
      section: "experience",
      section_index: 0,
      bullet_index: 1,
      original_text: "Automated resume parsing workflows in Python.",
      suggested_text: "Automated Docker-ready resume parsing workflows in Python to support scalable platform tooling.",
      reason: "Adds missing platform keywords while staying grounded in the existing work.",
      keywords_added: ["Docker"],
      confidence: 0.88
    }
  ]
};

export const E2E_VERSION = {
  version_id: "version-e2e-1",
  base_resume_id: "resume-e2e-1",
  metadata: {
    version_number: 1,
    job_id: "job-e2e-1",
    company_name: "Example Co",
    role: "Platform Engineer",
    timestamp: "2026-04-06T12:00:00.000Z",
    accepted_count: 1,
    rejected_count: 0,
    ats_score_before: 61,
    ats_score_after: 78
  },
  resume_json: {
    ...E2E_RESUME_PAYLOAD.parsed_resume,
    summary: "Platform-oriented engineer with React, Python, FastAPI, and Docker-adjacent tooling experience."
  }
};

export const E2E_VERSION_SUMMARY = {
  version_id: "version-e2e-1",
  version_number: 1,
  job_title: "Platform Engineer",
  company_name: "Example Co",
  timestamp: "2026-04-06T12:00:00.000Z",
  accepted_edits_count: 1,
  ats_score_before: 61,
  ats_score_after: 78
};
