const CONFIG = {
  xProfileUrl: "https://x.com/Hoodcabals",
  pinnedPostUrl: "https://x.com/Hoodcabals/status/2089650153703780788",
};

const form = document.querySelector("#whitelist-form");
const submitButton = document.querySelector("#submit-button");
const formStatus = document.querySelector("#form-status");
const progressFill = document.querySelector("#progress-fill");
const progressLabel = document.querySelector("#progress-label");
const successState = document.querySelector("#success-state");
const steps = [...document.querySelectorAll(".step")];

for (const link of document.querySelectorAll("[data-x-profile]"))
  link.href = CONFIG.xProfileUrl;
for (const link of document.querySelectorAll("[data-pinned-post]"))
  link.href = CONFIG.pinnedPostUrl;

const X_USERNAME_RE = /^@?[A-Za-z0-9_]{1,15}$/;
const EVM_WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

function validXUrl(value) {
  try {
    const url = new URL(value);
    return (
      ["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(
        url.hostname.toLowerCase(),
      ) && Boolean(url.pathname && url.pathname !== "/")
    );
  } catch {
    return false;
  }
}

function setError(id, message) {
  const field = document.getElementById(id);
  const error = document.querySelector(`[data-error-for="${id}"]`);
  field?.classList.toggle("invalid", Boolean(message));
  if (error) error.textContent = message || "";
}

function checkXUsername() {
  const value = document.querySelector("#x-username").value.trim();
  const valid = X_USERNAME_RE.test(value);
  setError(
    "x-username",
    valid
      ? ""
      : "Enter a valid X username (1-15 letters, numbers, or underscores).",
  );
  return valid;
}

function checkEngagement() {
  const checked = document.querySelector("#engagement-confirmed").checked;
  setError("engagement-confirmed", checked ? "" : "Confirm the pinned post task.");
  return checked;
}

function checkPostLink() {
  const value = document.querySelector("#post-link").value.trim();
  const valid = validXUrl(value);
  setError("post-link", valid ? "" : "Use a valid X or Twitter post URL.");
  return valid;
}

function checkWallet() {
  const value = document.querySelector("#wallet-address").value.trim();
  const valid = EVM_WALLET_RE.test(value);
  setError(
    "wallet-address",
    valid ? "" : "Enter a valid EVM wallet address (0x followed by 40 hex characters).",
  );
  return valid;
}

function validate() {
  const validUsername = checkXUsername();
  const validEngagement = checkEngagement();
  const validPostLink = checkPostLink();
  const validWallet = checkWallet();
  return validUsername && validEngagement && validPostLink && validWallet;
}

function updateProgress() {
  const current = steps.findIndex((step) => {
    const fields = [...step.querySelectorAll("input")];
    return fields.some((field) =>
      field.type === "checkbox" ? !field.checked : !field.value.trim(),
    );
  });
  const stepNumber = current === -1 ? 4 : current + 1;
  progressFill.style.width = `${stepNumber * 25}%`;
  progressLabel.textContent = `${String(stepNumber).padStart(2, "0")} / 04`;
}

form.addEventListener("input", updateProgress);
form.addEventListener("change", updateProgress);

document.querySelector("#x-username").addEventListener("blur", (event) => {
  if (event.target.value.trim()) checkXUsername();
});
document.querySelector("#post-link").addEventListener("blur", (event) => {
  if (event.target.value.trim()) checkPostLink();
});
document.querySelector("#wallet-address").addEventListener("blur", (event) => {
  if (event.target.value.trim()) checkWallet();
});
document
  .querySelector("#engagement-confirmed")
  .addEventListener("change", checkEngagement);

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    },
    { threshold: 0.25 },
  );
  for (const step of steps) {
    step.classList.add("reveal");
    revealObserver.observe(step);
  }
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "";
  if (!validate()) {
    formStatus.textContent = "Complete every required step to continue.";
    document
      .querySelector(".invalid, input[type='checkbox']:required:not(:checked)")
      ?.focus();
    return;
  }
  submitButton.disabled = true;
  submitButton.querySelector(".button-text").textContent = "TRANSMITTING...";
  try {
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        xUsername: document.querySelector("#x-username").value.trim(),
        xPostLink: document.querySelector("#post-link").value.trim(),
        walletAddress: document.querySelector("#wallet-address").value.trim(),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Transmission failed.");
    form.hidden = true;
    successState.hidden = false;
  } catch (error) {
    formStatus.textContent = error.message;
    submitButton.disabled = false;
    submitButton.querySelector(".button-text").textContent =
      "SUBMIT APPLICATION";
  }
});

updateProgress();
