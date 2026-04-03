const sendButton = document.getElementById("send-button");
const jobTitle = document.getElementById("job-title");
const companyName = document.getElementById("company-name");
const toast = document.getElementById("toast");

let latestPayload = null;

function showToast(message, variant) {
  toast.textContent = message;
  toast.className = `toast show ${variant}`;
}

function updateView(payload) {
  latestPayload = payload;
  if (payload?.job_title || payload?.company_name) {
    jobTitle.textContent = payload.job_title || "Job description detected";
    companyName.textContent = payload.company_name || payload.url || "Ready to send";
    sendButton.disabled = false;
  } else {
    jobTitle.textContent = "Waiting for job page";
    companyName.textContent = "Open a supported job board tab to begin.";
    sendButton.disabled = true;
  }
}

async function hydrateFromStorage() {
  const stored = await chrome.storage.local.get(["resumepr_pending_job"]);
  updateView(stored.resumepr_pending_job || null);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "JOB_DATA_EXTRACTED") {
    updateView(message.payload);
  }
});

sendButton.addEventListener("click", async () => {
  if (!latestPayload?.raw_text) {
    showToast("No job description found on this page yet.", "error");
    return;
  }

  sendButton.disabled = true;
  try {
    const response = await fetch("http://localhost:8000/api/jobs/parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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
    showToast("Job description sent! Open Resume Modifier to see your analysis.", "success");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    sendButton.disabled = false;
  }
});

hydrateFromStorage();
