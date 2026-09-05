// ============================================================
// DASHBOARD STATE
// ============================================================

const BASE_URL = "http://127.0.0.1:8000";

let authToken =
    localStorage.getItem("authToken");

let currentUser = JSON.parse(
    localStorage.getItem("currentUser") || "null"
);

let selectedTopic = "Python";
let selectedDuration = 10;


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

    if (authToken) {
        return true;
    }

    window.location.href =
        "login.html";

    return false;
}


// ============================================================
// USER DISPLAY
// ============================================================

function getDisplayName() {

    if (!currentUser) {
        return "Candidate";
    }

    const email =
        currentUser.email || "";

    if (!email) {
        return "Candidate";
    }

    const namePart =
        email.split("@")[0];

    if (!namePart) {
        return "Candidate";
    }

    return namePart.charAt(0).toUpperCase()
        + namePart.slice(1);
}


function renderUserInformation() {

    const displayName =
        getDisplayName();

    const email =
        currentUser?.email || "--";

    welcomeUserName.textContent =
        displayName;

    navUserName.textContent =
        displayName;

    navUserEmail.textContent =
        email;

    profileEmail.textContent =
        email;
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
                button.dataset.topic === topic
            );

        }
    );

    selectedTopicLabel.textContent =
        `${topic} selected`;

    ctaTopic.textContent =
        topic;

    focusArea.textContent =
        topic;
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

    selectedDuration =
        Number(duration);

    durationButtons.forEach(
        (button) => {

            button.classList.toggle(
                "active",
                Number(button.dataset.duration) ===
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
// START INTERVIEW
// ============================================================

function openInterviewRoom() {

    if (!requireAuthentication()) {
        return;
    }

    hideDashboardMessage();

    // --------------------------------------------------------
    // Store the selected configuration so the interview room
    // can use the same values.
    // --------------------------------------------------------

    localStorage.setItem(
        "selectedSubject",
        selectedTopic
    );

    localStorage.setItem(
        "selectedDuration",
        String(selectedDuration)
    );

    // --------------------------------------------------------
    // Navigate to the existing working interview room.
    // The actual backend API call remains inside index.js.
    // --------------------------------------------------------

    window.location.href =
        "index.html";
}


heroStartBtn.addEventListener(
    "click",
    () => {

        openInterviewRoom();

    }
);


startInterviewBtn.addEventListener(
    "click",
    () => {

        openInterviewRoom();

    }
);


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

    window.location.href =
        "login.html";
}


logoutBtn.addEventListener(
    "click",
    logout
);


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