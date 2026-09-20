// ============================================================
// DASHBOARD STATE
// ============================================================

const BASE_URL = "http://127.0.0.1:8000";
const MAX_RESUME_SIZE = 5 * 1024 * 1024;

const dashboardStatsApiUrl =
    `${BASE_URL}/auth/dashboard/stats`;

let authToken =
    localStorage.getItem("authToken");

let currentUser = JSON.parse(
    localStorage.getItem("currentUser") || "null"
);

let selectedTopic =
    "Python";

let selectedDuration =
    10;

let selectedResumeFile = null;
let resumeReady = false;


// ============================================================
// DOM ELEMENTS
// ============================================================

const welcomeUserName =
    document.getElementById("welcomeUserName");

const navUserName =
    document.getElementById("navUserName");

const navUserEmail =
    document.getElementById("navUserEmail");

const profileEmail =
    document.getElementById("profileEmail");

const interviewCount =
    document.getElementById("interviewCount");

const latestScore =
    document.getElementById("latestScore");

const practiceTime =
    document.getElementById("practiceTime");

const focusArea =
    document.getElementById("focusArea");

const selectedTopicLabel =
    document.getElementById("selectedTopicLabel");

const ctaTopic =
    document.getElementById("ctaTopic");

const dashboardMessage =
    document.getElementById("dashboardMessage");

const logoutBtn =
    document.getElementById("logoutBtn");

const heroStartBtn =
    document.getElementById("heroStartBtn");

const startInterviewBtn =
    document.getElementById("startInterviewBtn");

const topicButtons =
    document.querySelectorAll(
        ".topic-card"
    );

const durationButtons =
    document.querySelectorAll(
        ".duration-btn"
    );

// Resume upload elements.
const resumeDropzone =
    document.getElementById("resumeDropzone");

const resumeBrowseBtn =
    document.getElementById("resumeBrowseBtn");

const resumeInput =
    document.getElementById("resumeInput");

const resumeFileName =
    document.getElementById("resumeFileName");

const resumeStatusCard =
    document.getElementById("resumeStatusCard");

const resumeStatusIcon =
    document.getElementById("resumeStatusIcon");

const resumeStatusTitle =
    document.getElementById("resumeStatusTitle");

const resumeStatusText =
    document.getElementById("resumeStatusText");

const resumeSelectedSize =
    document.getElementById("resumeSelectedSize");

const resumeServerFile =
    document.getElementById("resumeServerFile");

const resumeUploadBtn =
    document.getElementById("resumeUploadBtn");

const resumeUploadMessage =
    document.getElementById("resumeUploadMessage");


// ============================================================
// AUTHENTICATION GUARD
// ============================================================

function requireAuthentication() {

    if (
        authToken &&
        currentUser
    ) {

        return true;
    }

    window.location.href =
        "login.html";

    return false;
}


// ============================================================
// USER-SCOPED RESUME STATE
// ============================================================

function getResumeStorageKey() {

    const email =
        currentUser?.email ||
        "anonymous";

    return (
        `resumeUploadState:${email.toLowerCase()}`
    );
}


function saveResumeState(metadata) {

    try {

        localStorage.setItem(
            getResumeStorageKey(),
            JSON.stringify(metadata)
        );

    } catch (error) {

        console.warn(
            "Unable to save resume UI state:",
            error
        );
    }
}


function readResumeState() {

    try {

        return JSON.parse(
            localStorage.getItem(
                getResumeStorageKey()
            ) || "null"
        );

    } catch (error) {

        console.warn(
            "Unable to read resume UI state:",
            error
        );

        return null;
    }
}


// ============================================================
// USER INFORMATION
// ============================================================

function getDisplayName() {

    const email =
        currentUser?.email || "";

    if (!email) {
        return "Candidate";
    }

    const username =
        email.split("@")[0];

    if (!username) {
        return "Candidate";
    }

    return (
        username.charAt(0).toUpperCase() +
        username.slice(1)
    );
}


function renderUserInformation() {

    const name =
        getDisplayName();

    const email =
        currentUser?.email || "--";

    if (welcomeUserName) {
        welcomeUserName.textContent =
            name;
    }

    if (navUserName) {
        navUserName.textContent =
            name;
    }

    if (navUserEmail) {
        navUserEmail.textContent =
            email;
    }

    if (profileEmail) {
        profileEmail.textContent =
            email;
    }
}


// ============================================================
// DASHBOARD MESSAGE
// ============================================================

function showDashboardMessage(
    message,
    type = "error"
) {

    if (!dashboardMessage) {
        return;
    }

    dashboardMessage.classList.remove(
        "hidden",
        "bg-red-500/10",
        "border-red-500/20",
        "text-red-400",
        "bg-green-500/10",
        "border-green-500/20",
        "text-green-400"
    );

    if (type === "success") {

        dashboardMessage.classList.add(
            "bg-green-500/10",
            "border-green-500/20",
            "text-green-400"
        );

    } else {

        dashboardMessage.classList.add(
            "bg-red-500/10",
            "border-red-500/20",
            "text-red-400"
        );
    }

    dashboardMessage.textContent =
        message;
}


function hideDashboardMessage() {

    if (dashboardMessage) {
        dashboardMessage.classList.add(
            "hidden"
        );
    }
}


// ============================================================
// RESUME UPLOAD MESSAGE
// ============================================================

function showResumeUploadMessage(
    message,
    type = "error"
) {

    if (!resumeUploadMessage) {
        return;
    }

    resumeUploadMessage.classList.remove(
        "hidden",
        "bg-red-500/10",
        "border-red-500/20",
        "text-red-400",
        "bg-green-500/10",
        "border-green-500/20",
        "text-green-400"
    );

    if (type === "success") {

        resumeUploadMessage.classList.add(
            "bg-green-500/10",
            "border-green-500/20",
            "text-green-400"
        );

    } else {

        resumeUploadMessage.classList.add(
            "bg-red-500/10",
            "border-red-500/20",
            "text-red-400"
        );
    }

    resumeUploadMessage.textContent =
        message;
}


function hideResumeUploadMessage() {

    if (resumeUploadMessage) {
        resumeUploadMessage.classList.add(
            "hidden"
        );
    }
}


// ============================================================
// RESUME UI HELPERS
// ============================================================

function formatFileSize(bytes) {

    const value =
        Number(bytes) || 0;

    if (value < 1024) {
        return `${value} B`;
    }

    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)} KB`;
    }

    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}


function setInterviewButtonsEnabled(enabled) {

    [
        heroStartBtn,
        startInterviewBtn
    ].forEach(
        (button) => {

            if (!button) {
                return;
            }

            button.disabled =
                !enabled;

            button.classList.toggle(
                "action-disabled",
                !enabled
            );
        }
    );
}


function updateResumeStatusCard({
    ready = false,
    uploading = false,
    filename = "",
    fileSize = null,
} = {}) {

    if (resumeStatusCard) {
        resumeStatusCard.classList.toggle(
            "border-green-500/20",
            ready
        );

        resumeStatusCard.classList.toggle(
            "bg-green-500/5",
            ready
        );
    }

    if (resumeStatusIcon) {
        resumeStatusIcon.className =
            ready
                ? "fas fa-circle-check text-green-400"
                : uploading
                    ? "fas fa-spinner fa-spin text-indigo-400"
                    : "fas fa-file-circle-question text-indigo-400";
    }

    if (resumeStatusTitle) {
        resumeStatusTitle.textContent =
            ready
                ? "Resume ready"
                : uploading
                    ? "Processing resume"
                    : "Resume required";
    }

    if (resumeStatusText) {

        if (ready) {
            resumeStatusText.textContent =
                "Your candidate profile is ready. Interviews can now use your resume for personalized questions and follow-ups.";

        } else if (uploading) {
            resumeStatusText.textContent =
                "Uploading your PDF, extracting the text, and building your AI candidate profile...";

        } else {
            resumeStatusText.textContent =
                "Upload a PDF before starting a resume-based interview.";
        }
    }

    if (resumeServerFile) {
        resumeServerFile.textContent =
            filename ||
            (ready ? "Uploaded resume" : "No uploaded resume");
    }

    if (resumeSelectedSize) {

        if (fileSize !== null) {
            resumeSelectedSize.textContent =
                formatFileSize(fileSize);
        } else if (ready) {
            resumeSelectedSize.textContent =
                "Uploaded";
        } else {
            resumeSelectedSize.textContent =
                "--";
        }
    }

    if (resumeUploadBtn) {

        const disabled =
            uploading ||
            !selectedResumeFile;

        resumeUploadBtn.disabled =
            disabled;

        resumeUploadBtn.classList.toggle(
            "action-disabled",
            disabled
        );

        resumeUploadBtn.innerHTML =
            uploading
                ? '<i class="fas fa-spinner fa-spin mr-2"></i>Processing Resume...'
                : ready
                    ? '<i class="fas fa-rotate mr-2"></i>Replace Resume & Rebuild Profile'
                    : '<i class="fas fa-cloud-arrow-up mr-2"></i>Upload & Build Profile';
    }
}


function restoreResumeState() {

    const storedState =
        readResumeState();

    if (!storedState) {

        resumeReady = false;

        updateResumeStatusCard({
            ready: false
        });

        setInterviewButtonsEnabled(false);

        return;
    }

    resumeReady = true;

    const filename =
        storedState.filename ||
        "Uploaded resume";

    updateResumeStatusCard({
        ready: true,
        filename,
        fileSize:
            storedState.file_size ?? null,
    });

    if (resumeFileName) {
        resumeFileName.textContent =
            storedState.file_size
                ? `${filename} · ${formatFileSize(storedState.file_size)}`
                : filename;
    }

    setInterviewButtonsEnabled(true);
}


// ============================================================
// RESUME VALIDATION
// ============================================================

function validateResumeFile(file) {

    if (!file) {
        return "Please select a resume PDF.";
    }

    const filename =
        String(file.name || "").toLowerCase();

    const isPdf =
        file.type === "application/pdf" ||
        filename.endsWith(".pdf");

    if (!isPdf) {
        return "Only PDF resumes are supported.";
    }

    if (!file.size) {
        return "The selected resume is empty.";
    }

    if (file.size > MAX_RESUME_SIZE) {
        return "Resume is too large. Please choose a PDF smaller than 5 MB.";
    }

    return null;
}


function selectResumeFile(file) {

    hideResumeUploadMessage();

    const validationError =
        validateResumeFile(file);

    if (validationError) {

        selectedResumeFile = null;

        showResumeUploadMessage(
            validationError,
            "error"
        );

        updateResumeStatusCard({
            ready: resumeReady
        });

        return;
    }

    selectedResumeFile =
        file;

    if (resumeFileName) {
        resumeFileName.textContent =
            `${file.name} · ${formatFileSize(file.size)}`;
    }

    updateResumeStatusCard({
        ready: resumeReady,
        filename: file.name,
        fileSize: file.size,
    });
}


// ============================================================
// RESUME UPLOAD
// ============================================================

async function uploadResume() {

    if (!requireAuthentication()) {
        return;
    }

    if (!selectedResumeFile) {

        showResumeUploadMessage(
            "Please select a PDF resume first.",
            "error"
        );

        return;
    }

    const validationError =
        validateResumeFile(selectedResumeFile);

    if (validationError) {

        showResumeUploadMessage(
            validationError,
            "error"
        );

        return;
    }

    const fileBeingUploaded =
        selectedResumeFile;

    updateResumeStatusCard({
        ready: resumeReady,
        uploading: true,
        filename: fileBeingUploaded.name,
        fileSize: fileBeingUploaded.size,
    });

    showResumeUploadMessage(
        "Uploading resume and building your candidate profile. This may take a moment...",
        "success"
    );

    try {

        const formData =
            new FormData();

        // backend/routes/resume.py expects the field name "file".
        formData.append(
            "file",
            fileBeingUploaded,
            fileBeingUploaded.name
        );

        const response =
            await fetch(
                `${BASE_URL}/resume/upload`,
                {
                    method: "POST",
                    headers: {
                        Authorization:
                            `Bearer ${authToken}`
                    },
                    body: formData
                }
            );

        if (response.status === 401) {
            logout();
            return;
        }

        const responseText =
            await response.text();

        let result = {};

        try {
            result =
                responseText
                    ? JSON.parse(responseText)
                    : {};
        } catch (error) {
            result = {};
        }

        if (!response.ok) {
            throw new Error(
                result.detail ||
                result.message ||
                `Resume upload failed. HTTP ${response.status}`
            );
        }

        // Current backend response shape:
        // result.resume.resume_id
        // result.resume.filename
        // result.resume.file_size
        // result.candidate_profile.profile_id
        const serverResume =
            result.resume || {};

        const serverProfile =
            result.candidate_profile || {};

        const serverFilename =
            serverResume.filename ||
            fileBeingUploaded.name;

        const fileSize =
            serverResume.file_size ??
            fileBeingUploaded.size;

        const resumeMetadata = {
            resume_id:
                serverResume.resume_id ??
                result.resume_id ??
                null,

            profile_id:
                serverProfile.profile_id ??
                result.profile_id ??
                null,

            filename:
                serverFilename,

            file_size:
                fileSize,

            uploaded_at:
                serverResume.uploaded_at ??
                new Date().toISOString(),
        };

        saveResumeState(
            resumeMetadata
        );

        selectedResumeFile = null;
        resumeReady = true;

        if (resumeInput) {
            resumeInput.value = "";
        }

        if (resumeFileName) {
            resumeFileName.textContent =
                `${serverFilename} · ${formatFileSize(fileSize)}`;
        }

        updateResumeStatusCard({
            ready: true,
            filename: serverFilename,
            fileSize,
        });

        setInterviewButtonsEnabled(true);

        showResumeUploadMessage(
            "Resume uploaded successfully. Your AI candidate profile is ready, and the next interview will use it.",
            "success"
        );

        showDashboardMessage(
            "Resume ready. Your interview will now be personalized from your uploaded resume.",
            "success"
        );

    } catch (error) {

        console.error(
            "Resume upload error:",
            error
        );

        showResumeUploadMessage(
            error.message ||
            "Unable to upload your resume.",
            "error"
        );

        updateResumeStatusCard({
            ready: resumeReady,
            filename: fileBeingUploaded.name,
            fileSize: fileBeingUploaded.size,
        });

        setInterviewButtonsEnabled(
            resumeReady
        );
    }
}


// ============================================================
// RESUME EVENTS
// ============================================================

if (resumeBrowseBtn && resumeInput) {

    resumeBrowseBtn.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();
            resumeInput.click();
        }
    );
}


if (resumeInput) {

    resumeInput.addEventListener(
        "change",
        (event) => {

            const file =
                event.target.files?.[0] ||
                null;

            selectResumeFile(file);
        }
    );
}


if (resumeDropzone) {

    resumeDropzone.addEventListener(
        "click",
        (event) => {

            if (
                resumeBrowseBtn &&
                event.target === resumeBrowseBtn
            ) {
                return;
            }

            if (resumeInput) {
                resumeInput.click();
            }
        }
    );

    resumeDropzone.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                if (resumeInput) {
                    resumeInput.click();
                }
            }
        }
    );

    resumeDropzone.addEventListener(
        "dragover",
        (event) => {

            event.preventDefault();

            resumeDropzone.classList.add(
                "dragover"
            );
        }
    );

    resumeDropzone.addEventListener(
        "dragleave",
        () => {

            resumeDropzone.classList.remove(
                "dragover"
            );
        }
    );

    resumeDropzone.addEventListener(
        "drop",
        (event) => {

            event.preventDefault();

            resumeDropzone.classList.remove(
                "dragover"
            );

            const file =
                event.dataTransfer?.files?.[0] ||
                null;

            selectResumeFile(file);
        }
    );
}


if (resumeUploadBtn) {

    resumeUploadBtn.addEventListener(
        "click",
        uploadResume
    );
}


// ============================================================
// TOPIC SELECTION
// ============================================================

function selectTopic(topic) {

    selectedTopic =
        topic;

    topicButtons.forEach(
        (button) => {

            button.classList.toggle(
                "active",
                button.dataset.topic ===
                    selectedTopic
            );
        }
    );

    if (selectedTopicLabel) {
        selectedTopicLabel.textContent =
            `${selectedTopic} selected`;
    }

    if (ctaTopic) {
        ctaTopic.textContent =
            selectedTopic;
    }

    if (focusArea) {
        focusArea.textContent =
            selectedTopic;
    }
}


topicButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                selectTopic(
                    button.dataset.topic
                );
            }
        );
    }
);


// ============================================================
// DURATION SELECTION
// ============================================================

function selectDuration(duration) {

    const value =
        Number(duration);

    if (
        !Number.isFinite(value) ||
        value < 10 ||
        value > 60
    ) {
        return;
    }

    selectedDuration =
        value;

    durationButtons.forEach(
        (button) => {

            button.classList.toggle(
                "active",
                Number(
                    button.dataset.duration
                ) ===
                    selectedDuration
            );
        }
    );
}


durationButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                selectDuration(
                    button.dataset.duration
                );
            }
        );
    }
);


// ============================================================
// FORMAT PRACTICE TIME
// ============================================================

function formatPracticeTime(
    totalSeconds
) {

    const safeSeconds =
        Math.max(
            0,
            Number(totalSeconds) || 0
        );

    const totalMinutes =
        Math.floor(
            safeSeconds / 60
        );

    const hours =
        Math.floor(
            totalMinutes / 60
        );

    const minutes =
        totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
}


// ============================================================
// LOAD DASHBOARD STATS
// ============================================================

async function loadDashboardStats() {

    if (!requireAuthentication()) {
        return;
    }

    try {

        const response =
            await fetch(
                dashboardStatsApiUrl,
                {
                    method: "GET",
                    headers: {
                        Authorization:
                            `Bearer ${authToken}`
                    }
                }
            );

        if (!response.ok) {

            if (response.status === 401) {
                logout();
                return;
            }

            throw new Error(
                `Dashboard stats failed: HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        if (interviewCount) {
            interviewCount.textContent =
                data.interview_count ?? 0;
        }

        if (latestScore) {
            latestScore.textContent =
                data.latest_score !== null &&
                data.latest_score !== undefined
                    ? data.latest_score
                    : "--";
        }

        if (practiceTime) {
            practiceTime.textContent =
                formatPracticeTime(
                    data.practice_time_seconds
                );
        }

    } catch (error) {

        console.error(
            "Dashboard stats error:",
            error
        );

        if (interviewCount) {
            interviewCount.textContent = "--";
        }

        if (latestScore) {
            latestScore.textContent = "--";
        }

        if (practiceTime) {
            practiceTime.textContent = "--";
        }
    }
}


// ============================================================
// START INTERVIEW
// ============================================================

function openInterviewRoom() {

    if (!requireAuthentication()) {
        return;
    }

    if (!resumeReady) {

        showDashboardMessage(
            "Upload your resume first. Your interview is personalized from your uploaded resume.",
            "error"
        );

        if (resumeDropzone) {
            resumeDropzone.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

        return;
    }

    hideDashboardMessage();

    const params =
        new URLSearchParams();

    params.set(
        "subject",
        selectedTopic
    );

    params.set(
        "duration",
        String(selectedDuration)
    );

    params.set(
        "autoStart",
        "true"
    );

    // Keep the localStorage handoff used by the interview room
    // as a fallback when the URL parameters are not available.
    localStorage.setItem(
        "selectedSubject",
        selectedTopic
    );

    localStorage.setItem(
        "selectedDuration",
        String(selectedDuration)
    );

    localStorage.setItem(
        "autoStartInterview",
        "true"
    );

    window.location.href =
        `index.html?${params.toString()}`;
}


if (heroStartBtn) {

    heroStartBtn.addEventListener(
        "click",
        openInterviewRoom
    );
}


if (startInterviewBtn) {

    startInterviewBtn.addEventListener(
        "click",
        openInterviewRoom
    );
}


// ============================================================
// LOGOUT
// ============================================================

function logout() {

    localStorage.removeItem(
        "authToken"
    );

    localStorage.removeItem(
        "currentUser"
    );

    localStorage.removeItem(
        "selectedSubject"
    );

    localStorage.removeItem(
        "selectedDuration"
    );

    localStorage.removeItem(
        "autoStartInterview"
    );

    selectedResumeFile = null;
    resumeReady = false;

    window.location.href =
        "login.html";
}


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        logout
    );
}


// ============================================================
// INITIALIZE DASHBOARD
// ============================================================

async function initializeDashboard() {

    if (!requireAuthentication()) {
        return;
    }

    renderUserInformation();

    selectTopic(
        selectedTopic
    );

    selectDuration(
        selectedDuration
    );

    restoreResumeState();

    await loadDashboardStats();
}


initializeDashboard();


window.addEventListener(
    "pageshow",
    () => {
        loadDashboardStats();
    }
);
