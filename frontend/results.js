// ============================================================
// RESULTS PAGE STATE
// ============================================================

let authToken =
    localStorage.getItem("authToken");

let currentUser =
    JSON.parse(
        localStorage.getItem(
            "currentUser"
        ) || "null"
    );


// ============================================================
// DOM ELEMENTS
// ============================================================

const loadingState =
    document.getElementById(
        "loadingState"
    );

const resultsState =
    document.getElementById(
        "resultsState"
    );

const emptyState =
    document.getElementById(
        "emptyState"
    );

const currentUserName =
    document.getElementById(
        "currentUserName"
    );

const currentUserEmail =
    document.getElementById(
        "currentUserEmail"
    );

const subjectName =
    document.getElementById(
        "subjectName"
    );

const subjectIcon =
    document.getElementById(
        "subjectIcon"
    );

const summarySubject =
    document.getElementById(
        "summarySubject"
    );

const summaryDuration =
    document.getElementById(
        "summaryDuration"
    );

const scoreCircle =
    document.getElementById(
        "scoreCircle"
    );

const scoreValue =
    document.getElementById(
        "scoreValue"
    );

const scoreLabel =
    document.getElementById(
        "scoreLabel"
    );

const feedbackText =
    document.getElementById(
        "feedbackText"
    );

const improvementText =
    document.getElementById(
        "improvementText"
    );

const dashboardBtn =
    document.getElementById(
        "dashboardBtn"
    );

const resultsDashboardBtn =
    document.getElementById(
        "resultsDashboardBtn"
    );

const emptyDashboardBtn =
    document.getElementById(
        "emptyDashboardBtn"
    );

const newInterviewBtn =
    document.getElementById(
        "newInterviewBtn"
    );

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


// ============================================================
// SUBJECT ICONS
// ============================================================

const iconMap = {

    "Self Introduction":
        "fas fa-user",

    "Generative AI":
        "fas fa-brain",

    "Python":
        "fab fa-python",

    "English":
        "fas fa-language",

    "HTML":
        "fab fa-html5",

    "CSS":
        "fab fa-css3-alt"

};


// ============================================================
// AUTH
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

function renderUserInformation() {

    if (!currentUser) {

        return;

    }


    const email =
        currentUser.email ||
        "Candidate";


    const username =
        email.split("@")[0] ||
        "Candidate";


    const displayName =
        username.charAt(0).toUpperCase() +
        username.slice(1);


    if (currentUserName) {

        currentUserName.textContent =
            displayName;

    }


    if (currentUserEmail) {

        currentUserEmail.textContent =
            email;

    }

}


// ============================================================
// LOGOUT
// ============================================================

function logout() {

    authToken =
        null;

    currentUser =
        null;


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

    sessionStorage.removeItem(
        "latestInterviewResult"
    );

    window.location.href =
        "login.html";

}


// ============================================================
// NAVIGATION
// ============================================================

function goToDashboard() {

    window.location.href =
        "dashboard.html";

}


function startNewInterview() {

    sessionStorage.removeItem(
        "latestInterviewResult"
    );

    window.location.href =
        "dashboard.html";

}


if (dashboardBtn) {

    dashboardBtn.addEventListener(
        "click",
        goToDashboard
    );

}


if (resultsDashboardBtn) {

    resultsDashboardBtn.addEventListener(
        "click",
        goToDashboard
    );

}


if (emptyDashboardBtn) {

    emptyDashboardBtn.addEventListener(
        "click",
        goToDashboard
    );

}


if (newInterviewBtn) {

    newInterviewBtn.addEventListener(
        "click",
        startNewInterview
    );

}


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        logout
    );

}


// ============================================================
// SCORE HELPERS
// ============================================================

function getScoreLabel(
    score
) {

    if (score >= 4.5) {

        return "Excellent performance";

    }

    if (score >= 4) {

        return "Strong performance";

    }

    if (score >= 3) {

        return "Good foundation";

    }

    if (score >= 2) {

        return "Keep practicing";

    }

    return "Needs more practice";

}


// ============================================================
// DISPLAY RESULTS
// ============================================================

function displayResults(
    result
) {

    const score =
        Math.min(
            5,
            Math.max(
                1,
                Number(
                    result.candidate_score
                ) || 1
            )
        );


    const subject =
        result.subject ||
        "Interview";


    const duration =
        Number(
            result.duration_minutes
        ) || 0;


    // --------------------------------------------------------
    // SUBJECT
    // --------------------------------------------------------

    if (subjectName) {

        subjectName.textContent =
            subject;

    }


    if (summarySubject) {

        summarySubject.textContent =
            subject;

    }


    if (subjectIcon) {

        subjectIcon.className =
            `${iconMap[subject] || "fas fa-robot"} text-sm`;

    }


    // --------------------------------------------------------
    // DURATION
    // --------------------------------------------------------

    if (summaryDuration) {

        summaryDuration.textContent =
            duration > 0
                ? `${duration} min`
                : "--";

    }


    // --------------------------------------------------------
    // SCORE
    // --------------------------------------------------------

    if (scoreValue) {

        scoreValue.textContent =
            score;

    }


    if (scoreLabel) {

        scoreLabel.textContent =
            getScoreLabel(
                score
            );

    }


    if (feedbackText) {

        feedbackText.textContent =
            result.feedback ||
            "No feedback available.";

    }


    if (improvementText) {

        improvementText.textContent =
            result.areas_of_improvement ||
            "No improvement suggestions available.";

    }


    // --------------------------------------------------------
    // SCORE RING
    // --------------------------------------------------------

    if (scoreCircle) {

        const circumference =
            301.6;


        const offset =
            circumference -
            (
                score / 5
            ) *
            circumference;


        scoreCircle.style.strokeDashoffset =
            String(
                circumference
            );


        requestAnimationFrame(
            () => {

                setTimeout(
                    () => {

                        scoreCircle.style.strokeDashoffset =
                            String(
                                offset
                            );

                    },
                    150
                );

            }
        );

    }


    // --------------------------------------------------------
    // SWITCH PAGE STATE
    // --------------------------------------------------------

    if (loadingState) {

        loadingState.classList.add(
            "hidden"
        );

    }


    if (emptyState) {

        emptyState.classList.add(
            "hidden"
        );

    }


    if (resultsState) {

        resultsState.classList.remove(
            "hidden"
        );

    }

}


// ============================================================
// LOAD RESULT
// ============================================================

function loadLatestResult() {

    const storedResult =
        sessionStorage.getItem(
            "latestInterviewResult"
        );


    if (!storedResult) {

        if (loadingState) {

            loadingState.classList.add(
                "hidden"
            );

        }

        if (emptyState) {

            emptyState.classList.remove(
                "hidden"
            );

        }

        return;

    }


    try {

        const result =
            JSON.parse(
                storedResult
            );


        displayResults(
            result
        );

    } catch (error) {

        console.error(
            "Could not parse interview result:",
            error
        );


        sessionStorage.removeItem(
            "latestInterviewResult"
        );


        if (loadingState) {

            loadingState.classList.add(
                "hidden"
            );

        }

        if (emptyState) {

            emptyState.classList.remove(
                "hidden"
            );

        }

    }

}


// ============================================================
// INITIALIZATION
// ============================================================

function initialize() {

    if (
        !requireAuthentication()
    ) {

        return;

    }


    renderUserInformation();

    loadLatestResult();

}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

} else {

    initialize();

}