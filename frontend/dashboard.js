// ============================================================
// DASHBOARD STATE
// ============================================================

let authToken =
    localStorage.getItem("authToken");

let currentUser = JSON.parse(
    localStorage.getItem("currentUser") || "null"
);

let selectedTopic =
    "Python";

let selectedDuration =
    10;


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
    document.querySelectorAll(".topic-card");

const durationButtons =
    document.querySelectorAll(".duration-btn");


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

    console.log(
        "Dashboard duration selected:",
        selectedDuration
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
// START INTERVIEW
// ============================================================
//
// The dashboard passes the configuration directly in the URL.
// This makes the handoff deterministic and easy to debug.
//
// Example:
//
// index.html?subject=Generative+AI&duration=20&autoStart=true
// ============================================================

function openInterviewRoom() {

    if (!requireAuthentication()) {

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


    const interviewUrl =
        `index.html?${params.toString()}`;


    console.log(
        "Launching interview:",
        {
            subject:
                selectedTopic,

            duration:
                selectedDuration,

            url:
                interviewUrl
        }
    );


    window.location.href =
        interviewUrl;
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

function initializeDashboard() {

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
}


initializeDashboard();
