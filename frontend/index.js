// ============================================================
// GLOBAL STATE
// ============================================================

let mediaRecorder = null;

let recordingChunks = [];

let recordedBlob = null;

let currentAudio = null;

let currentSubject = null;

let isSpeaking = false;

let authToken =
    localStorage.getItem("authToken");

let currentUser = JSON.parse(
    localStorage.getItem(
        "currentUser"
    ) || "null"
);


// ============================================================
// DASHBOARD LAUNCH CONFIGURATION
// ============================================================

const interviewParams =
    new URLSearchParams(
        window.location.search
    );


const dashboardSelectedSubject =
    interviewParams.get("subject") ||
    localStorage.getItem(
        "selectedSubject"
    );


const dashboardDurationParam =
    Number(
        interviewParams.get("duration")
    );


const storedDuration =
    Number(
        localStorage.getItem(
            "selectedDuration"
        )
    );


const dashboardAutoStart =
    interviewParams.get("autoStart") ===
    "true";


// ============================================================
// INTERVIEW DURATION
// ============================================================

let selectedDuration = 20;


if (
    Number.isFinite(
        dashboardDurationParam
    ) &&
    dashboardDurationParam >= 10 &&
    dashboardDurationParam <= 60
) {

    selectedDuration =
        dashboardDurationParam;

} else if (
    Number.isFinite(
        storedDuration
    ) &&
    storedDuration >= 10 &&
    storedDuration <= 60
) {

    selectedDuration =
        storedDuration;
}


console.log(
    "[Interview Room] Launch configuration:",
    {
        subject:
            dashboardSelectedSubject,

        duration:
            selectedDuration,

        autoStart:
            dashboardAutoStart
    }
);


// ============================================================
// TIMER STATE
// ============================================================

let interviewExpiresAt = null;

let interviewTimer = null;


// ============================================================
// API
// ============================================================

const BASE_URL =
    "http://127.0.0.1:8000";


const startInterviewApiUrl =
    `${BASE_URL}/start-interview`;


const submitAnswerApiUrl =
    `${BASE_URL}/submit-answer`;


const endInterviewApiUrl =
    `${BASE_URL}/end-interview`;


const getFeedbackApiUrl =
    `${BASE_URL}/get-feedback`;


const saveFeedbackApiUrl =
    `${BASE_URL}/auth/dashboard/save-feedback`;


// ============================================================
// DOM ELEMENTS
// ============================================================

const welcomeState =
    document.getElementById(
        "welcomeState"
    );


const interviewState =
    document.getElementById(
        "interviewState"
    );


const currentUserName =
    document.getElementById(
        "currentUserName"
    );


const currentUserEmail =
    document.getElementById(
        "currentUserEmail"
    );


const subjectBadge =
    document.getElementById(
        "subjectBadge"
    );


const subjectName =
    document.getElementById(
        "subjectName"
    );


const subjectIcon =
    document.getElementById(
        "subjectIcon"
    );


const questionNum =
    document.getElementById(
        "questionNum"
    );


const questionText =
    document.getElementById(
        "questionText"
    );


const timeRemaining =
    document.getElementById(
        "timeRemaining"
    );


const interviewerImageWrap =
    document.getElementById(
        "interviewerImageWrap"
    );


const speakingBubble =
    document.getElementById(
        "speakingBubble"
    );


const readyBubble =
    document.getElementById(
        "readyBubble"
    );


const speakerStateBadge =
    document.getElementById(
        "speakerStateBadge"
    );


const speakerStateDot =
    document.getElementById(
        "speakerStateDot"
    );


const recordingStatus =
    document.getElementById(
        "recordingStatus"
    );


const startInterviewBtn =
    document.getElementById(
        "startInterviewBtn"
    );


const recordBtn =
    document.getElementById(
        "recordBtn"
    );


const micIcon =
    document.getElementById(
        "micIcon"
    );


const stopIcon =
    document.getElementById(
        "stopIcon"
    );


const submitBtn =
    document.getElementById(
        "submitBtn"
    );


const endInterviewBtn =
    document.getElementById(
        "endInterviewBtn"
    );


const feedbackSection =
    document.getElementById(
        "feedbackSection"
    );


const getFeedbackArea =
    document.getElementById(
        "getFeedbackArea"
    );


const getFeedbackBtn =
    document.getElementById(
        "getFeedbackBtn"
    );


const feedbackContent =
    document.getElementById(
        "feedbackContent"
    );


const feedbackSubject =
    document.getElementById(
        "feedbackSubject"
    );


const scoreCircle =
    document.getElementById(
        "scoreCircle"
    );


const scoreValue =
    document.getElementById(
        "scoreValue"
    );


const feedbackText =
    document.getElementById(
        "feedbackText"
    );


const improvementText =
    document.getElementById(
        "improvementText"
    );


const newInterviewBtn =
    document.getElementById(
        "newInterviewBtn"
    );


const dashboardBtn =
    document.getElementById(
        "dashboardBtn"
    );


const welcomeDashboardBtn =
    document.getElementById(
        "welcomeDashboardBtn"
    );


const feedbackDashboardBtn =
    document.getElementById(
        "feedbackDashboardBtn"
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
// AUTH
// ============================================================

function authHeaders(
    headers = {}
) {

    if (!authToken) {

        return headers;
    }


    return {

        ...headers,

        Authorization:
            `Bearer ${authToken}`

    };

}


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
// LOGOUT
// ============================================================

function logout() {

    stopInterviewTimer();


    if (
        currentAudio
    ) {

        currentAudio.pause();

        currentAudio.src =
            "";

        currentAudio =
            null;

    }


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


if (dashboardBtn) {

    dashboardBtn.addEventListener(
        "click",
        goToDashboard
    );

}


if (welcomeDashboardBtn) {

    welcomeDashboardBtn.addEventListener(
        "click",
        goToDashboard
    );

}


if (feedbackDashboardBtn) {

    feedbackDashboardBtn.addEventListener(
        "click",
        goToDashboard
    );

}


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        logout
    );

}


// ============================================================
// TIMER
// ============================================================

function formatTime(
    totalSeconds
) {

    const safeSeconds =
        Math.max(
            0,
            Number(
                totalSeconds
            ) || 0
        );


    const minutes =
        Math.floor(
            safeSeconds / 60
        );


    const seconds =
        safeSeconds % 60;


    return (
        `${String(
            minutes
        ).padStart(2, "0")}:` +

        `${String(
            seconds
        ).padStart(2, "0")}`
    );

}


function updateTimerDisplay() {

    if (!timeRemaining) {

        return;
    }


    if (
        !interviewExpiresAt
    ) {

        timeRemaining.textContent =
            "--:--";

        return;

    }


    const remainingMilliseconds =
        interviewExpiresAt -
        Date.now();


    const remainingSeconds =
        Math.max(
            0,
            Math.ceil(
                remainingMilliseconds /
                1000
            )
        );


    timeRemaining.textContent =
        formatTime(
            remainingSeconds
        );


    // --------------------------------------------------------
    // Visual warning
    // --------------------------------------------------------

    if (
        remainingSeconds <= 30 &&
        remainingSeconds > 0
    ) {

        timeRemaining.classList.remove(
            "text-white"
        );

        timeRemaining.classList.add(
            "text-red-400"
        );

    } else {

        timeRemaining.classList.remove(
            "text-red-400"
        );

        timeRemaining.classList.add(
            "text-white"
        );

    }

}


function startInterviewTimer(
    expiresAt
) {

    stopInterviewTimer();


    const parsedExpiry =
        new Date(
            expiresAt
        ).getTime();


    if (
        Number.isNaN(
            parsedExpiry
        )
    ) {

        console.error(
            "Invalid interview expiry:",
            expiresAt
        );

        interviewExpiresAt =
            null;

        return;

    }


    interviewExpiresAt =
        parsedExpiry;


    updateTimerDisplay();


    interviewTimer =
        setInterval(
            updateTimerDisplay,
            250
        );

}


function stopInterviewTimer() {

    if (
        interviewTimer
    ) {

        clearInterval(
            interviewTimer
        );

        interviewTimer =
            null;

    }


    interviewExpiresAt =
        null;


    if (timeRemaining) {

        timeRemaining.textContent =
            "--:--";

        timeRemaining.classList.remove(
            "text-red-400"
        );

        timeRemaining.classList.add(
            "text-white"
        );

    }

}


// ============================================================
// SPEAKER STATE
// ============================================================

function setSpeakerState(
    state
) {

    if (
        !speakerStateBadge ||
        !speakerStateDot
    ) {

        return;
    }


    speakerStateDot.className =
        "status-dot";


    if (
        state === "speaking"
    ) {

        speakerStateDot.classList.add(
            "bg-indigo-400"
        );


        speakerStateBadge.className =
            "inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3 py-1.5 text-xs text-indigo-300";


        speakerStateBadge.lastChild.textContent =
            " Speaking";

    } else if (
        state === "ready"
    ) {

        speakerStateDot.classList.add(
            "bg-green-400"
        );


        speakerStateBadge.className =
            "inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-3 py-1.5 text-xs text-green-300";


        speakerStateBadge.lastChild.textContent =
            " Your turn";

    } else {

        speakerStateDot.classList.add(
            "bg-zinc-600"
        );


        speakerStateBadge.className =
            "inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5 text-xs text-zinc-500";


        speakerStateBadge.lastChild.textContent =
            " Waiting";
    }

}


// ============================================================
// UI STATE
// ============================================================

function showInterviewRoom(
    subject
) {

    currentSubject =
        subject;


    localStorage.setItem(
        "selectedSubject",
        subject
    );


    if (welcomeState) {

        welcomeState.classList.add(
            "hidden"
        );

    }


    if (interviewState) {

        interviewState.classList.remove(
            "hidden"
        );

    }


    if (subjectName) {

        subjectName.textContent =
            subject;

    }


    if (subjectBadge) {

        subjectBadge.classList.remove(
            "hidden"
        );

    }


    if (subjectIcon) {

        const icon =
            iconMap[
                subject
            ] ||
            "fas fa-robot";


        subjectIcon.className =
            `${icon} text-sm`;

    }


    if (questionNum) {

        questionNum.textContent =
            "1";

    }


    if (questionText) {

        questionText.textContent =
            "Waiting for Natalie to start the interview...";

    }


    if (startInterviewBtn) {

        startInterviewBtn.classList.remove(
            "hidden"
        );

        startInterviewBtn.disabled =
            false;

    }


    if (recordBtn) {

        recordBtn.classList.add(
            "hidden"
        );

        recordBtn.disabled =
            true;

    }


    if (submitBtn) {

        submitBtn.classList.add(
            "hidden"
        );

        submitBtn.disabled =
            true;

    }


    if (endInterviewBtn) {

        endInterviewBtn.disabled =
            true;

    }


    if (feedbackSection) {

        feedbackSection.classList.add(
            "hidden"
        );

    }


    if (speakingBubble) {

        speakingBubble.classList.add(
            "hidden"
        );

    }


    if (readyBubble) {

        readyBubble.classList.remove(
            "hidden"
        );

    }


    if (interviewerImageWrap) {

        interviewerImageWrap.classList.remove(
            "speaking-ring"
        );

        interviewerImageWrap.classList.add(
            "interviewer-ring"
        );

    }


    if (recordingStatus) {

        recordingStatus.textContent =
            "Click Start Interview to begin";

    }


    setSpeakerState(
        "waiting"
    );


    stopInterviewTimer();

}


function updateQuestionNumber(
    number
) {

    if (questionNum) {

        questionNum.textContent =
            number;

    }

}


function updateQuestionText(
    text
) {

    if (questionText) {

        questionText.textContent =
            text;

    }

}


// ============================================================
// RECORDING UI
// ============================================================

function prepareRecordingUI() {

    if (startInterviewBtn) {

        startInterviewBtn.classList.add(
            "hidden"
        );

    }


    if (recordBtn) {

        recordBtn.classList.remove(
            "hidden"
        );

        recordBtn.disabled =
            true;

        recordBtn.classList.remove(
            "bg-red-500",
            "text-white",
            "recording-ring"
        );

        recordBtn.classList.add(
            "bg-zinc-900",
            "text-zinc-300"
        );

    }


    if (submitBtn) {

        submitBtn.classList.add(
            "hidden"
        );

        submitBtn.disabled =
            true;

    }


    if (endInterviewBtn) {

        endInterviewBtn.disabled =
            false;

    }


    setSpeakerState(
        "waiting"
    );

}


function enableRecording() {

    if (recordBtn) {

        recordBtn.disabled =
            false;

        recordBtn.classList.remove(
            "bg-zinc-900"
        );

        recordBtn.classList.add(
            "bg-zinc-800"
        );

    }


    if (recordingStatus) {

        recordingStatus.textContent =
            "Your turn — click the microphone to answer";

    }


    if (readyBubble) {

        readyBubble.classList.remove(
            "hidden"
        );

    }


    if (speakingBubble) {

        speakingBubble.classList.add(
            "hidden"
        );

    }


    setSpeakerState(
        "ready"
    );

}


function disableRecording() {

    if (recordBtn) {

        recordBtn.disabled =
            true;

    }


    if (submitBtn) {

        submitBtn.disabled =
            true;

    }

}


function setRecordingActive(
    active
) {

    if (
        !recordBtn
    ) {

        return;
    }


    if (active) {

        recordBtn.classList.remove(
            "bg-zinc-800",
            "text-zinc-300"
        );

        recordBtn.classList.add(
            "bg-red-500",
            "text-white",
            "recording-ring"
        );


        if (micIcon) {

            micIcon.classList.add(
                "hidden"
            );

        }


        if (stopIcon) {

            stopIcon.classList.remove(
                "hidden"
            );

        }


        if (recordingStatus) {

            recordingStatus.textContent =
                "Recording... click again to stop";

        }

    } else {

        recordBtn.classList.remove(
            "bg-red-500",
            "text-white",
            "recording-ring"
        );

        recordBtn.classList.add(
            "bg-zinc-800",
            "text-zinc-300"
        );


        if (micIcon) {

            micIcon.classList.remove(
                "hidden"
            );

        }


        if (stopIcon) {

            stopIcon.classList.add(
                "hidden"
            );

        }

    }

}


// ============================================================
// FEEDBACK UI
// ============================================================

function showFeedbackSection() {

    stopInterviewTimer();


    if (feedbackSection) {

        feedbackSection.classList.remove(
            "hidden"
        );

    }


    if (getFeedbackArea) {

        getFeedbackArea.classList.remove(
            "hidden"
        );

    }


    if (feedbackContent) {

        feedbackContent.classList.add(
            "hidden"
        );

    }


    if (endInterviewBtn) {

        endInterviewBtn.disabled =
            true;

    }


    disableRecording();


    if (recordingStatus) {

        recordingStatus.textContent =
            "Interview completed";

    }


    setSpeakerState(
        "waiting"
    );

}


function displayFeedback(
    feedback
) {

    const score =
        Number(
            feedback.candidate_score
        ) || 0;


    if (feedbackSubject) {

        feedbackSubject.textContent =
            feedback.subject ||
            currentSubject ||
            "Interview";

    }


    if (scoreValue) {

        scoreValue.textContent =
            score;

    }


    if (scoreCircle) {

        const circumference =
            301.6;


        const offset =
            circumference -
            (
                score /
                5
            ) *
            circumference;


        scoreCircle.style.strokeDashoffset =
            offset;

    }


    if (feedbackText) {

        feedbackText.textContent =
            feedback.feedback ||
            "No feedback available.";

    }


    if (improvementText) {

        improvementText.textContent =
            feedback.areas_of_improvement ||
            "No suggestions available.";

    }


    if (getFeedbackArea) {

        getFeedbackArea.classList.add(
            "hidden"
        );

    }


    if (feedbackContent) {

        feedbackContent.classList.remove(
            "hidden"
        );

    }

}


// ============================================================
// SAVE FEEDBACK TO DASHBOARD
// ============================================================

async function saveFeedbackToDashboard(
    feedback
) {

    try {

        const response =
            await fetch(
                saveFeedbackApiUrl,
                {

                    method:
                        "POST",

                    headers:
                        authHeaders({
                            "Content-Type":
                                "application/json"
                        }),

                    body:
                        JSON.stringify({

                            candidate_score:
                                Number(
                                    feedback.candidate_score
                                ) || 1,

                            feedback:
                                feedback.feedback ||
                                "",

                            areas_of_improvement:
                                feedback.areas_of_improvement ||
                                ""

                        })

                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "Dashboard feedback save failed:",
                response.status,
                errorText
            );


            return;

        }


        const data =
            await response.json();


        console.log(
            "Dashboard feedback saved:",
            data
        );

    } catch (error) {

        console.error(
            "Dashboard feedback save error:",
            error
        );

    }

}


// ============================================================
// RESET ROOM
// ============================================================

function resetToWelcome() {

    stopInterviewTimer();


    if (
        mediaRecorder &&
        mediaRecorder.state ===
            "recording"
    ) {

        mediaRecorder.stop();

    }


    mediaRecorder =
        null;


    recordingChunks =
        [];


    recordedBlob =
        null;


    if (currentAudio) {

        currentAudio.pause();

        currentAudio.src =
            "";

        currentAudio =
            null;

    }


    currentSubject =
        null;


    isSpeaking =
        false;


    if (welcomeState) {

        welcomeState.classList.remove(
            "hidden"
        );

    }


    if (interviewState) {

        interviewState.classList.add(
            "hidden"
        );

    }


    if (feedbackSection) {

        feedbackSection.classList.add(
            "hidden"
        );

    }


    if (recordBtn) {

        recordBtn.classList.remove(
            "bg-red-500",
            "text-white",
            "recording-ring"
        );

        recordBtn.classList.add(
            "bg-zinc-800",
            "text-zinc-300"
        );

    }


    if (micIcon) {

        micIcon.classList.remove(
            "hidden"
        );

    }


    if (stopIcon) {

        stopIcon.classList.add(
            "hidden"
        );

    }


    if (submitBtn) {

        submitBtn.classList.add(
            "hidden"
        );

    }


    if (scoreCircle) {

        scoreCircle.style.strokeDashoffset =
            "301.6";

    }


    if (scoreValue) {

        scoreValue.textContent =
            "0";

    }

}


// ============================================================
// AUDIO STREAM HANDLING
// ============================================================

async function handleAudioStream(
    response,
    onComplete = null
) {

    if (!response.ok) {

        throw new Error(
            `Audio request failed: HTTP ${response.status}`
        );

    }


    if (!response.body) {

        throw new Error(
            "The browser did not receive an audio response."
        );

    }


    isSpeaking =
        true;


    if (recordBtn) {

        recordBtn.disabled =
            true;

    }


    if (endInterviewBtn) {

        endInterviewBtn.disabled =
            true;

    }


    if (speakingBubble) {

        speakingBubble.classList.remove(
            "hidden"
        );

    }


    if (readyBubble) {

        readyBubble.classList.add(
            "hidden"
        );

    }


    if (interviewerImageWrap) {

        interviewerImageWrap.classList.remove(
            "interviewer-ring"
        );

        interviewerImageWrap.classList.add(
            "speaking-ring"
        );

    }


    setSpeakerState(
        "speaking"
    );


    if (recordingStatus) {

        recordingStatus.textContent =
            "Natalie is speaking...";

    }


    if (currentAudio) {

        currentAudio.pause();

        currentAudio.src =
            "";

        currentAudio =
            null;

    }


    const reader =
        response.body.getReader();


    const decoder =
        new TextDecoder();


    let textBuffer =
        "";


    const audioChunks =
        [];


    while (true) {

        const {
            done,
            value
        } =
            await reader.read();


        if (done) {

            break;

        }


        textBuffer +=
            decoder.decode(
                value,
                {
                    stream:
                        true
                }
            );


        const lines =
            textBuffer.split(
                "\n"
            );


        textBuffer =
            lines.pop() ||
            "";


        for (
            const line of lines
        ) {

            const trimmedLine =
                line.trim();


            if (!trimmedLine) {

                continue;

            }


            const binaryString =
                atob(
                    trimmedLine
                );


            const bytes =
                new Uint8Array(
                    binaryString.length
                );


            for (
                let index = 0;
                index <
                binaryString.length;
                index++
            ) {

                bytes[index] =
                    binaryString.charCodeAt(
                        index
                    );

            }


            audioChunks.push(
                bytes
            );

        }

    }


    const finalLine =
        textBuffer.trim();


    if (finalLine) {

        const binaryString =
            atob(
                finalLine
            );


        const bytes =
            new Uint8Array(
                binaryString.length
            );


        for (
            let index = 0;
            index <
            binaryString.length;
            index++
        ) {

            bytes[index] =
                binaryString.charCodeAt(
                    index
                );

        }


        audioChunks.push(
            bytes
        );

    }


    if (
        audioChunks.length ===
        0
    ) {

        throw new Error(
            "The backend returned no audio data."
        );

    }


    const audioBlob =
        new Blob(
            audioChunks,
            {
                type:
                    "audio/mpeg"
            }
        );


    const audioUrl =
        URL.createObjectURL(
            audioBlob
        );


    currentAudio =
        new Audio(
            audioUrl
        );


    currentAudio.preload =
        "auto";


    try {

        await currentAudio.play();

    } catch (error) {

        console.error(
            "Audio playback error:",
            error
        );


        if (recordingStatus) {

            recordingStatus.textContent =
                "Click the page once to allow interviewer audio.";

        }


        isSpeaking =
            false;


        if (speakingBubble) {

            speakingBubble.classList.add(
                "hidden"
            );

        }


        if (interviewerImageWrap) {

            interviewerImageWrap.classList.remove(
                "speaking-ring"
            );

            interviewerImageWrap.classList.add(
                "interviewer-ring"
            );

        }


        setSpeakerState(
            "waiting"
        );


        URL.revokeObjectURL(
            audioUrl
        );


        return;

    }


    await new Promise(
        (resolve) => {

            const finishAudio =
                () => {

                    if (
                        currentAudio
                    ) {

                        currentAudio.onended =
                            null;

                        currentAudio.onerror =
                            null;

                    }


                    isSpeaking =
                        false;


                    if (speakingBubble) {

                        speakingBubble.classList.add(
                            "hidden"
                        );

                    }


                    if (interviewerImageWrap) {

                        interviewerImageWrap.classList.remove(
                            "speaking-ring"
                        );

                        interviewerImageWrap.classList.add(
                            "interviewer-ring"
                        );

                    }


                    URL.revokeObjectURL(
                        audioUrl
                    );


                    if (onComplete) {

                        onComplete();

                    }


                    resolve();

                };


            currentAudio.onended =
                finishAudio;


            currentAudio.onerror =
                finishAudio;

        }
    );

}


// ============================================================
// RECORDING
// ============================================================

async function startRecording() {

    try {

        const stream =
            await navigator.mediaDevices
                .getUserMedia({
                    audio:
                        true
                });


        let mimeType =
            "audio/webm;codecs=opus";


        if (
            !MediaRecorder.isTypeSupported(
                mimeType
            )
        ) {

            mimeType =
                "audio/webm";

        }


        mediaRecorder =
            new MediaRecorder(
                stream,
                {
                    mimeType
                }
            );


        recordingChunks =
            [];


        recordedBlob =
            null;


        mediaRecorder.ondataavailable =
            (event) => {

                if (
                    event.data &&
                    event.data.size >
                        0
                ) {

                    recordingChunks.push(
                        event.data
                    );

                }

            };


        mediaRecorder.onstop =
            () => {

                recordedBlob =
                    new Blob(
                        recordingChunks,
                        {
                            type:
                                "audio/webm"
                        }
                    );


                stream
                    .getTracks()
                    .forEach(
                        (
                            track
                        ) =>
                            track.stop()
                    );


                setRecordingActive(
                    false
                );


                if (recordingStatus) {

                    recordingStatus.textContent =
                        "Recording complete — ready to submit";

                }


                if (submitBtn) {

                    submitBtn.classList.remove(
                        "hidden"
                    );

                    submitBtn.disabled =
                        false;

                }


                if (recordBtn) {

                    recordBtn.disabled =
                        true;

                }


                if (endInterviewBtn) {

                    endInterviewBtn.disabled =
                        false;

                }

            };


        mediaRecorder.start();


        setRecordingActive(
            true
        );


        setSpeakerState(
            "ready"
        );


        if (endInterviewBtn) {

            endInterviewBtn.disabled =
                true;

        }

    } catch (error) {

        console.error(
            "Microphone error:",
            error
        );


        if (recordingStatus) {

            recordingStatus.textContent =
                "Microphone access denied or unavailable.";

        }

    }

}


function stopRecording() {

    if (
        !mediaRecorder
    ) {

        return;

    }


    if (
        mediaRecorder.state ===
        "inactive"
    ) {

        return;

    }


    if (recordingStatus) {

        recordingStatus.textContent =
            "Processing recording...";

    }


    if (submitBtn) {

        submitBtn.disabled =
            true;

    }


    mediaRecorder.stop();

}


// ============================================================
// START INTERVIEW
// ============================================================

async function startInterview() {

    if (
        !requireAuthentication()
    ) {

        return;

    }


    if (
        !currentSubject
    ) {

        throw new Error(
            "No interview subject selected."
        );

    }


    if (startInterviewBtn) {

        startInterviewBtn.disabled =
            true;

        startInterviewBtn.classList.add(
            "hidden"
        );

    }


    if (recordBtn) {

        recordBtn.classList.remove(
            "hidden"
        );

        recordBtn.disabled =
            true;

    }


    if (recordingStatus) {

        recordingStatus.textContent =
            "Connecting to Natalie...";

    }


    updateQuestionText(
        "Natalie is preparing your first question..."
    );


    setSpeakerState(
        "speaking"
    );


    try {

        const response =
            await fetch(
                startInterviewApiUrl,
                {

                    method:
                        "POST",

                    headers:
                        authHeaders({
                            "Content-Type":
                                "application/json"
                        }),

                    body:
                        JSON.stringify({

                            subject:
                                currentSubject,

                            duration_minutes:
                                selectedDuration

                        })

                }
            );


        if (
            response.status ===
            401
        ) {

            logout();

            return;

        }


        if (!response.ok) {

            throw new Error(
                `Failed to start interview. HTTP ${response.status}`
            );

        }


        const expiresAt =
            response.headers.get(
                "X-Interview-Expires-At"
            );


        const questionNumber =
            response.headers.get(
                "X-Question-Number"
            );


        if (!expiresAt) {

            throw new Error(
                "Server did not return interview expiry time."
            );

        }


        if (
            questionNumber
        ) {

            updateQuestionNumber(
                questionNumber
            );

        }


        startInterviewTimer(
            expiresAt
        );


        prepareRecordingUI();


        await handleAudioStream(
            response,
            () => {

                if (
                    interviewExpiresAt &&
                    Date.now() <
                        interviewExpiresAt
                ) {

                    enableRecording();

                }

            }
        );

    } catch (error) {

        console.error(
            "Start interview error:",
            error
        );


        if (recordingStatus) {

            recordingStatus.textContent =
                error.message ||
                "Unable to start the interview.";

        }


        setSpeakerState(
            "waiting"
        );


        stopInterviewTimer();


        if (recordBtn) {

            recordBtn.classList.add(
                "hidden"
            );

        }


        if (startInterviewBtn) {

            startInterviewBtn.classList.remove(
                "hidden"
            );

            startInterviewBtn.disabled =
                false;

        }

    }

}


// ============================================================
// SUBMIT ANSWER
// ============================================================

async function submitAnswer() {

    if (
        !recordedBlob
    ) {

        alert(
            "Please record an answer first."
        );

        return;

    }


    disableRecording();


    if (recordingStatus) {

        recordingStatus.textContent =
            "Submitting your answer...";

    }


    const formData =
        new FormData();


    formData.append(
        "audio",
        recordedBlob,
        "answer.webm"
    );


    try {

        const response =
            await fetch(
                submitAnswerApiUrl,
                {

                    method:
                        "POST",

                    headers:
                        authHeaders(),

                    body:
                        formData

                }
            );


        if (
            response.status ===
            401
        ) {

            logout();

            return;

        }


        const isComplete =
            response.headers.get(
                "X-Interview-Complete"
            ) ===
            "true";


        const questionNumber =
            response.headers.get(
                "X-Question-Number"
            );


        if (!response.ok) {

            throw new Error(
                `Backend error: HTTP ${response.status}`
            );

        }


        if (
            questionNumber
        ) {

            updateQuestionNumber(
                questionNumber
            );

        }


        recordedBlob =
            null;


        recordingChunks =
            [];


        if (isComplete) {

            stopInterviewTimer();


            if (recordingStatus) {

                recordingStatus.textContent =
                    "Interview time has ended. Preparing feedback...";

            }


            await handleAudioStream(
                response,
                () => {}
            );


            showFeedbackSection();

            return;

        }


        updateQuestionText(
            "Natalie is preparing the next question..."
        );


        if (recordingStatus) {

            recordingStatus.textContent =
                "Natalie is thinking...";

        }


        setSpeakerState(
            "speaking"
        );


        await handleAudioStream(
            response,
            () => {

                if (
                    !interviewExpiresAt ||
                    Date.now() <
                        interviewExpiresAt
                ) {

                    enableRecording();

                }

            }
        );


    } catch (error) {

        console.error(
            "Submit answer error:",
            error
        );


        if (recordingStatus) {

            recordingStatus.textContent =
                error.message ||
                "Unable to submit your answer.";

        }


        if (
            !interviewExpiresAt ||
            Date.now() <
                interviewExpiresAt
        ) {

            enableRecording();

            if (endInterviewBtn) {

                endInterviewBtn.disabled =
                    false;

            }

        }

    }

}


// ============================================================
// MANUAL END INTERVIEW
// ============================================================

async function endInterview() {

    const confirmed =
        confirm(
            "End the interview and generate feedback?"
        );


    if (!confirmed) {

        return;

    }


    disableRecording();


    if (endInterviewBtn) {

        endInterviewBtn.disabled =
            true;

    }


    if (recordingStatus) {

        recordingStatus.textContent =
            "Ending interview...";

    }


    try {

        const response =
            await fetch(
                endInterviewApiUrl,
                {

                    method:
                        "POST",

                    headers:
                        authHeaders({
                            "Content-Type":
                                "application/json"
                        })

                }
            );


        if (
            response.status ===
            401
        ) {

            logout();

            return;

        }


        if (!response.ok) {

            throw new Error(
                `Failed to end interview. HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Failed to end interview."
            );

        }


        stopInterviewTimer();


        if (recordingStatus) {

            recordingStatus.textContent =
                "Interview completed. Generate your AI feedback.";

        }


        showFeedbackSection();

    } catch (error) {

        console.error(
            "End interview error:",
            error
        );


        if (recordingStatus) {

            recordingStatus.textContent =
                error.message ||
                "Could not end interview.";

        }


        if (endInterviewBtn) {

            endInterviewBtn.disabled =
                false;

        }

    }

}


// ============================================================
// GET FEEDBACK
// ============================================================

async function getFeedback() {

    showFeedbackSection();


    if (getFeedbackBtn) {

        getFeedbackBtn.disabled =
            true;

        getFeedbackBtn.textContent =
            "Generating feedback...";

    }


    try {

        const response =
            await fetch(
                getFeedbackApiUrl,
                {

                    method:
                        "POST",

                    headers:
                        authHeaders({
                            "Content-Type":
                                "application/json"
                        }),

                    body:
                        JSON.stringify({})

                }
            );


        if (
            response.status ===
            401
        ) {

            logout();

            return;

        }


        if (!response.ok) {

            throw new Error(
                `Feedback request failed. HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Failed to generate feedback."
            );

        }


        // ----------------------------------------------------
        // Save the score and feedback permanently
        // ----------------------------------------------------

        await saveFeedbackToDashboard(
            data.feedback
        );


        displayFeedback(
            data.feedback
        );


        if (getFeedbackBtn) {

            getFeedbackBtn.textContent =
                "Feedback Generated";

        }

    } catch (error) {

        console.error(
            "Feedback error:",
            error
        );


        if (getFeedbackBtn) {

            getFeedbackBtn.textContent =
                "Retry Feedback";

            getFeedbackBtn.disabled =
                false;

        }


        if (recordingStatus) {

            recordingStatus.textContent =
                error.message ||
                "Could not generate feedback.";

        }

    }

}


// ============================================================
// EVENT LISTENERS
// ============================================================

if (startInterviewBtn) {

    startInterviewBtn.addEventListener(
        "click",
        startInterview
    );

}


if (recordBtn) {

    recordBtn.addEventListener(
        "click",
        () => {

            if (
                isSpeaking ||
                recordBtn.disabled
            ) {

                return;

            }


            if (
                !mediaRecorder ||
                mediaRecorder.state ===
                    "inactive"
            ) {

                startRecording();

            } else {

                stopRecording();

            }

        }
    );

}


if (submitBtn) {

    submitBtn.addEventListener(
        "click",
        submitAnswer
    );

}


if (endInterviewBtn) {

    endInterviewBtn.addEventListener(
        "click",
        endInterview
    );

}


if (getFeedbackBtn) {

    getFeedbackBtn.addEventListener(
        "click",
        getFeedback
    );

}


if (newInterviewBtn) {

    newInterviewBtn.addEventListener(
        "click",
        resetToWelcome
    );

}


// ============================================================
// DASHBOARD → INTERVIEW INITIALIZATION
// ============================================================

function initializeDashboardLaunch() {

    if (
        !dashboardSelectedSubject
    ) {

        if (welcomeState) {

            welcomeState.classList.remove(
                "hidden"
            );

        }

        if (interviewState) {

            interviewState.classList.add(
                "hidden"
            );

        }

        return;

    }


    showInterviewRoom(
        dashboardSelectedSubject
    );


    if (
        dashboardAutoStart
    ) {

        setTimeout(
            () => {

                startInterview();

            },
            700
        );

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


    if (
        dashboardSelectedSubject
    ) {

        initializeDashboardLaunch();

    }

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