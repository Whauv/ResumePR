const sendButton = document.getElementById("send-button");
const signInButton = document.getElementById("signin-button");
const jobTitle = document.getElementById("job-title");
const companyName = document.getElementById("company-name");
const authStatus = document.getElementById("auth-status");
const toast = document.getElementById("toast");

let latestPayload = null;
let authToken = "";
let webOrigin = "http://localhost:5173";

function showToast(message, variant) {
  toast.textContent = message;
  toast.className = `toast show ${variant}`;
}

function updateView(payload) {
  latestPayload = payload;
  if (payload?.job_title || payload?.company_name) {
    jobTitle.textContent = payload.job_title || "Job description detected";
    companyName.textContent = payload.company_name || payload.url || "Ready to send";
    sendButton.disabled = !authToken;
  } else {
    jobTitle.textContent = "Waiting for job page";
    companyName.textContent = "Open a supported job board tab to begin.";
    sendButton.disabled = true;
  }
}

function updateAuthState() {
  authStatus.textContent = authToken
    ? "Signed in. Job descriptions can be sent directly."
    : "Open Resume Modifier to sign in before sending this job.";
  signInButton.style.display = authToken ? "none" : "block";
  updateView(latestPayload);
}

async function syncTokenFromWebApp() {
  const tabs = await chrome.tabs.query({});
  const candidate = tabs.find((tab) => tab.url?.startsWith("http://localhost:5173") || tab.url?.includes(".vercel.app"));
  if (!candidate?.id) return;

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: candidate.id },
      func: () => ({
        token: window.localStorage.getItem("resumepr_auth_token"),
        origin: window.location.origin
      })
    });
    if (result?.token) {
      authToken = result.token;
      webOrigin = result.origin || webOrigin;
      await chrome.storage.local.set({
        resumepr_auth_token: authToken,
        resumepr_web_origin: webOrigin
      });
    }
  } catch (_error) {
    // Ignore tabs where we cannot read storage.
  }
}

async function hydrateFromStorage() {
  const stored = await chrome.storage.local.get(["resumepr_pending_job", "resumepr_auth_token", "resumepr_web_origin"]);
  authToken = stored.resumepr_auth_token || "";
  webOrigin = stored.resumepr_web_origin || webOrigin;
  updateView(stored.resumepr_pending_job || null);
  if (!authToken) {
    await syncTokenFromWebApp();
  }
  updateAuthState();
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "JOB_DATA_EXTRACTED") {
    updateView(message.payload);
  }
});

sendButton.addEventListener("click", async () => {
  if (!authToken) {
    showToast("Open Resume Modifier to sign in first.", "error");
    return;
  }
  if (!latestPayload?.raw_text) {
    showToast("No job description found on this page yet.", "error");
    return;
  }

  sendButton.disabled = true;
  try {
    const response = await fetch("http://localhost:8000/api/jobs/parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify(latestPayload)
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "Failed to send job description.");
    }

    await chrome.storage.local.set({
      resumepr_latest_job_id: payload.job_id,
      resumepr_latest_job: payload
    });
    chrome.tabs.create({ url: `${webOrigin}/analyze?job_id=${payload.job_id}` });
    showToast("Job description sent! Open Resume Modifier to see your analysis.", "success");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    sendButton.disabled = false;
  }
});

signInButton.addEventListener("click", () => {
  chrome.tabs.create({ url: `${webOrigin}/login` });
});

hydrateFromStorage();
