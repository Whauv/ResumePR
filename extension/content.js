const BOARD_SELECTORS = {
  linkedin: {
    description: [".description__text"],
    title: ["h1", ".top-card-layout__title"],
    company: [".topcard__org-name-link", ".job-details-jobs-unified-top-card__company-name"]
  },
  greenhouse: {
    description: ["#content"],
    title: ["h1.app-title", "h1"],
    company: [".company-name", "#header .company-name"]
  },
  workday: {
    description: [".css-129m7dg", ".job-description"],
    title: ["h1", '[data-automation-id="jobPostingHeader"]'],
    company: [".css-1ioh6j8", '[data-automation-id="company"]']
  },
  lever: {
    description: [".posting-description"],
    title: [".posting-headline h2", "h2"],
    company: [".posting-categories .sort-by-location", ".main-header-text"]
  },
  indeed: {
    description: ["#jobDescriptionText", "[data-testid='jobsearch-JobComponent-description']"],
    title: ["h1", '[data-testid="jobsearch-JobInfoHeader-title"]'],
    company: ["[data-testid='inlineHeader-companyName']", ".jobsearch-CompanyInfoContainer a"]
  },
  glassdoor: {
    description: [".JobDetails_jobDescription__uW_fK", ".jobDescriptionContent"],
    title: ["h1", '[data-test="job-title"]'],
    company: ["[data-test='employer-name']", ".EmployerProfile_compactEmployerName__9MGcV"]
  }
};

function detectBoard(hostname) {
  if (hostname.includes("linkedin.com")) return "linkedin";
  if (hostname.includes("greenhouse.io")) return "greenhouse";
  if (hostname.includes("lever.co")) return "lever";
  if (hostname.includes("workday.com") || hostname.includes("myworkdayjobs.com")) return "workday";
  if (hostname.includes("indeed.com")) return "indeed";
  if (hostname.includes("glassdoor.com")) return "glassdoor";
  return null;
}

function extractFirstText(selectors) {
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (node?.innerText?.trim()) {
      return node.innerText.trim();
    }
  }
  return "";
}

function extractGenericDescription() {
  const container = document.querySelector("main, article") || document.body;
  const nodes = Array.from(container.querySelectorAll("p, li"));
  return nodes.map((node) => node.innerText.trim()).filter(Boolean).join("\n");
}

function buildPayload() {
  const board = detectBoard(window.location.hostname);
  const selectors = BOARD_SELECTORS[board] || {};
  const rawText = extractFirstText(selectors.description || []) || extractGenericDescription();
  const payload = {
    board,
    url: window.location.href,
    raw_text: rawText,
    job_title: extractFirstText(selectors.title || ["h1"]) || document.title,
    company_name: extractFirstText(selectors.company || [])
  };
  return payload;
}

function publishPayload() {
  const payload = buildPayload();
  chrome.storage.local.set({ resumepr_pending_job: payload });
  chrome.runtime.sendMessage({ type: "JOB_DATA_EXTRACTED", payload });
}

publishPayload();
window.addEventListener("load", publishPayload);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    publishPayload();
  }
});
