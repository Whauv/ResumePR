// Workspace sub-pages, shared by the router (URL<->page sync) and the nav bar.
export const WORKSPACE_NAV = [
  { id: "resume", label: "Resume Upload" },
  { id: "jobs", label: "Job Intake" },
  { id: "diff", label: "Diff Editor" },
  { id: "versions", label: "Version History" }
];

export const WORKSPACE_PAGE_IDS = WORKSPACE_NAV.map((item) => item.id);
