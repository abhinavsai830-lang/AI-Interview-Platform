// ============================================================
// GLOBAL STATE
// ============================================================

let mediaRecorder = null;
let recordingChunks = [];
let recordedBlob = null;

let currentSubject = null;

let isSpeaking = false;
let currentAudio = null;

let authMode = "login";

let authToken =
    localStorage.getItem("authToken");

let currentUser = JSON.parse(
    localStorage.getItem("currentUser") || "null"
);


// ============================================================
// DASHBOARD INTERVIEW CONFIGURATION
// ============================================================
//
// The dashboard opens the interview room like this:
//
// index.html?subject=Generative+AI&duration=20&autoStart=true
//
// URL values are the primary source of truth.
// localStorage is kept only as a fallback for older sessions.
// ============================================================

const interviewParams =
    new URLSearchParams(
        window.location.search
    );

const dashboardSelectedSubject =
    interviewParams.get("subject") ||
    localStorage.getItem("selectedSubject");

const dashboardDurationParam =
    Number(
        interviewParams.get("duration")
    );

const storedDuration =
    Number(
        localStorage.getItem("selectedDuration")
    );

const dashboardAutoStart =
    interviewParams.get("autoStart") === "true";


// ============================================================
// INTERVIEW DURATION
// ============================================================

let selectedDuration = 20;

if (
    Number.isFinite(dashboardDurationParam) &&
    dashboardDurationParam >= 10 &&
    dashboardDurationParam <= 60
) {
    selectedDuration =
        dashboardDurationParam;

} else if (
    Number.isFinite(storedDuration) &&
    storedDuration >= 10 &&
    storedDuration <= 60
) {
    selectedDuration =
        storedDuration;
}


// ============================================================
// DASHBOARD LAUNCH DEBUG
// ============================================================

console.log(
    "[Dashboard Launch]",
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

const subjectBtns =
    document.querySelectorAll(
        ".subject-btn"
    );

const subjectBadge =
    document.getElementById(
        "subjectBadge"
    );

const subjectIcon =
    document.getElementById(
        "subjectIcon"
    );

const questionNum =
    document.getElementById(
        "questionNum"
    );

const speakingBubble =
    document.getElementById(
        "speakingBubble"
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

const recordingStatus =
    document.getElementById(
        "recordingStatus"
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


// ============================================================
// AUTH DOM ELEMENTS
// ============================================================

const authForms =
    document.getElementById(
        "authForms"
    );

const authTitle =
    document.getElementById(
        "authTitle"
    );

const authEmail =
    document.getElementById(
        "authEmail"
    );

const authPassword =
    document.getElementById(
        "authPassword"
    );

const authMessage =
    document.getElementById(
        "authMessage"
    );

const authSubmitBtn =
    document.getElementById(
        "authSubmitBtn"
    );

const toggleAuthModeBtn =
    document.getElementById(
        "toggleAuthModeBtn"
    );

const userPanel =
    document.getElementById(
        "userPanel"
    );

const currentUserEmail =
    document.getElementById(
        "currentUserEmail"
    );

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


// ============================================================
// TIMER DOM ELEMENT
// ============================================================

const timeRemaining =
    document.getElementById(
        "timeRemaining"
    );


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


// ============================================================
// SUBJECT ICONS
// ============================================================

const iconMap = {

    "Self Introduction":
        "fas fa-user text-blue-400",

    "Generative AI":
        "fas fa-brain text-purple-400",

    "Python":
        "fab fa-python text-yellow-400",

    "English":
        "fas fa-language text-green-400",

    "HTML":
        "fab fa-html5 text-orange-400",

    "CSS":
        "fab fa-css3-alt text-blue-400"
};


// ============================================================
// AUTH
// ============================================================

function authHeaders(
    headers = {}
) {

    return authToken
        ? {
            ...headers,

            Authorization:
                `Bearer ${authToken}`
        }

        : headers;
}


function setAuthMessage(
    message,
    isError = false
) {

    if (!authMessage) {
        return;
    }

    authMessage.textContent =
        message;

    authMessage.classList.remove(
        "hidden",
        "text-red-400",
        "text-green-400"
    );

    authMessage.classList.add(
        isError
            ? "text-red-400"
            : "text-green-400"
    );
}


function renderAuthState() {

    if (
        !authForms ||
        !userPanel
    ) {

        return;
    }


    if (
        authToken &&
        currentUser
    ) {

        authForms.classList.add(
            "hidden"
        );

        userPanel.classList.remove(
            "hidden"
        );

        if (currentUserEmail) {

            currentUserEmail.textContent =
                currentUser.email;
        }

        return;
    }


    authForms.classList.remove(
        "hidden"
    );

    userPanel.classList.add(
        "hidden"
    );


    if (authTitle) {

        authTitle.textContent =
            authMode === "login"
                ? "Login"
                : "Register";
    }


    if (authSubmitBtn) {

        authSubmitBtn.textContent =
            authMode === "login"
                ? "Login"
                : "Create Account";
    }


    if (toggleAuthModeBtn) {

        toggleAuthModeBtn.textContent =
            authMode === "login"
                ? "Need an account? Register"
                : "Already have an account? Login";
    }
}


function requireAuth() {

    if (authToken) {
        return true;
    }


    setAuthMessage(
        "Please login before starting an interview.",
        true
    );


    return false;
}


async function submitAuth() {

    if (
        !authEmail ||
        !authPassword
    ) {

        return;
    }


    const email =
        authEmail.value.trim();

    const password =
        authPassword.value;


    if (
        !email ||
        !password
    ) {

        setAuthMessage(
            "Email and password are required.",
            true
        );

        return;
    }


    authSubmitBtn.disabled =
        true;


    setAuthMessage(
        authMode === "login"
            ? "Logging in..."
            : "Creating account..."
    );


    try {

        const response =
            await fetch(
                `${BASE_URL}/auth/${authMode}`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Authentication failed"
            );
        }


        authToken =
            data.access_token;

        currentUser =
            data.user;


        localStorage.setItem(
            "authToken",
            authToken
        );

        localStorage.setItem(
            "currentUser",
            JSON.stringify(
                currentUser
            )
        );


        authPassword.value =
            "";


        renderAuthState();


    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );

        setAuthMessage(
            error.message,
            true
        );


    } finally {

        authSubmitBtn.disabled =
            false;
    }
}


function logout() {

    stopInterviewTimer();


    authToken =
        null;

    currentUser =
        null;

    interviewExpiresAt =
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
// TIMER
// ============================================================

function formatTime(
    totalSeconds
) {

    const safeSeconds =
        Math.max(
            0,
            totalSeconds
        );


    const minutes =
        Math.floor(
            safeSeconds / 60
        );


    const seconds =
        safeSeconds % 60;


    return (
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`
    );
}


function updateTimerDisplay() {

    if (!timeRemaining) {
        return;
    }


    if (!interviewExpiresAt) {

        timeRemaining.textContent =
            "--:--";

        return;
    }


    const now =
        Date.now();


    const remainingMilliseconds =
        interviewExpiresAt -
        now;


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
}


function startInterviewTimer(
    expiresAt
) {

    stopInterviewTimer();


    interviewExpiresAt =
        new Date(
            expiresAt
        ).getTime();


    if (
        Number.isNaN(
            interviewExpiresAt
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


    updateTimerDisplay();


    interviewTimer =
        setInterval(
            () => {

                updateTimerDisplay();

            },
            250
        );
}


function stopInterviewTimer() {

    if (interviewTimer) {

        clearInterval(
            interviewTimer
        );

        interviewTimer =
            null;
    }
}


// ============================================================
// UI STATE
// ============================================================

function showInterviewPanel(
    subject
) {

    currentSubject =
        subject;


    // ========================================================
    // Keep the selected subject available to the application.
    // ========================================================

    localStorage.setItem(
        "selectedSubject",
        subject
    );


    subjectBtns.forEach(
        (btn) => {

            btn.classList.toggle(
                "active",
                btn.dataset.subject ===
                    subject
            );
        }
    );


    welcomeState.classList.add(
        "hidden"
    );


    interviewState.classList.remove(
        "hidden"
    );


    feedbackSection.classList.add(
        "hidden"
    );


    subjectBadge.textContent =
        subject;


    subjectIcon.className =
        iconMap[subject] +
        " text-2xl";


    questionNum.textContent =
        "1";


    speakingBubble.classList.add(
        "hidden"
    );


    startInterviewBtn.classList.remove(
        "hidden"
    );


    startInterviewBtn.disabled =
        false;


    recordBtn.classList.add(
        "hidden"
    );


    recordBtn.disabled =
        true;


    submitBtn.disabled =
        true;


    endInterviewBtn.disabled =
        true;


    recordingStatus.textContent =
        "Click Start Interview to begin";


    stopInterviewTimer();


    interviewExpiresAt =
        null;


    if (timeRemaining) {

        timeRemaining.textContent =
            "--:--";
    }
}


function updateQuestionNumber(
    number
) {

    if (questionNum) {

        questionNum.textContent =
            number;
    }
}


function showSpeakingBubble() {

    if (speakingBubble) {

        speakingBubble.classList.remove(
            "hidden"
        );
    }
}


function hideSpeakingBubble() {

    if (speakingBubble) {

        speakingBubble.classList.add(
            "hidden"
        );
    }
}


function enableRecording() {

    recordBtn.disabled =
        false;


    endInterviewBtn.disabled =
        false;


    recordingStatus.textContent =
        "Click to record";
}


function disableRecording() {

    recordBtn.disabled =
        true;


    submitBtn.disabled =
        true;


    submitBtn.classList.add(
        "hidden"
    );
}


function showFeedbackSection() {

    feedbackSection.classList.remove(
        "hidden"
    );


    getFeedbackArea.classList.remove(
        "hidden"
    );


    feedbackContent.classList.add(
        "hidden"
    );


    endInterviewBtn.disabled =
        true;


    disableRecording();


    recordingStatus.textContent =
        "Interview ended";


    hideSpeakingBubble();
}


function displayFeedback(
    data
) {

    feedbackSubject.textContent =
        data.subject ||
        currentSubject;


    scoreValue.textContent =
        data.candidate_score ||
        0;


    const offset =
        301.6 -
        (
            (data.candidate_score || 0)
            / 5
        ) *
        301.6;


    scoreCircle.style.strokeDashoffset =
        offset;


    feedbackText.textContent =
        data.feedback ||
        "No feedback available";


    improvementText.textContent =
        data.areas_of_improvement ||
        "No suggestions available";


    getFeedbackArea.classList.add(
        "hidden"
    );


    feedbackContent.classList.remove(
        "hidden"
    );
}


function resetToWelcome() {

    stopInterviewTimer();


    interviewExpiresAt =
        null;


    if (timeRemaining) {

        timeRemaining.textContent =
            "--:--";
    }


    currentSubject =
        null;


    isSpeaking =
        false;


    if (mediaRecorder) {

        if (
            mediaRecorder.state ===
            "recording"
        ) {

            mediaRecorder.stop();
        }


        mediaRecorder =
            null;
    }


    recordingChunks =
        [];


    recordedBlob =
        null;


    if (currentAudio) {

        currentAudio.pause();

        currentAudio.src = "";

        currentAudio =
            null;
    }


    subjectBtns.forEach(
        (btn) => {

            btn.classList.remove(
                "active"
            );
        }
    );


    welcomeState.classList.remove(
        "hidden"
    );


    interviewState.classList.add(
        "hidden"
    );


    recordBtn.classList.remove(
        "bg-red-500",
        "text-white",
        "recording-active"
    );


    recordBtn.classList.add(
        "bg-zinc-800/80",
        "text-gray-400"
    );


    micIcon.classList.remove(
        "hidden"
    );


    stopIcon.classList.add(
        "hidden"
    );


    submitBtn.classList.add(
        "hidden"
    );


    speakingBubble.classList.add(
        "hidden"
    );


    scoreCircle.style.strokeDashoffset =
        301.6;


    getFeedbackBtn.textContent =
        "Get Feedback";


    getFeedbackBtn.disabled =
        false;
}


// ============================================================
// AUDIO RESPONSE HANDLER
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
            "The browser did not receive an audio response body."
        );
    }


    isSpeaking =
        true;


    recordBtn.disabled =
        true;


    endInterviewBtn.disabled =
        true;


    showSpeakingBubble();


    recordingStatus.textContent =
        "Natalie is speaking...";


    if (currentAudio) {

        currentAudio.pause();

        currentAudio.src = "";

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
        } = await reader.read();


        if (done) {
            break;
        }


        textBuffer +=
            decoder.decode(
                value,
                {
                    stream: true
                }
            );


        const lines =
            textBuffer.split(
                "\n"
            );


        textBuffer =
            lines.pop() || "";


        for (
            const line of lines
        ) {

            const trimmedLine =
                line.trim();


            if (!trimmedLine) {
                continue;
            }


            try {

                const binaryString =
                    atob(
                        trimmedLine
                    );


                const bytes =
                    new Uint8Array(
                        binaryString.length
                    );


                for (
                    let i = 0;
                    i < binaryString.length;
                    i++
                ) {

                    bytes[i] =
                        binaryString.charCodeAt(
                            i
                        );
                }


                audioChunks.push(
                    bytes
                );


            } catch (error) {

                console.error(
                    "Base64 decode error:",
                    error
                );


                throw new Error(
                    "Unable to decode interviewer audio."
                );
            }
        }
    }


    const finalLine =
        textBuffer.trim();


    if (finalLine) {

        try {

            const binaryString =
                atob(
                    finalLine
                );


            const bytes =
                new Uint8Array(
                    binaryString.length
                );


            for (
                let i = 0;
                i < binaryString.length;
                i++
            ) {

                bytes[i] =
                    binaryString.charCodeAt(
                        i
                    );
            }


            audioChunks.push(
                bytes
            );


        } catch (error) {

            console.error(
                "Final base64 decode error:",
                error
            );


            throw new Error(
                "Unable to decode final interviewer audio."
            );
        }
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
                type: "audio/mpeg"
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


        recordingStatus.textContent =
            "Click the page once to allow interviewer audio.";


        isSpeaking =
            false;


        hideSpeakingBubble();


        URL.revokeObjectURL(
            audioUrl
        );


        return;
    }


    await new Promise(
        (resolve) => {

            currentAudio.onended =
                () => {

                    isSpeaking =
                        false;


                    hideSpeakingBubble();


                    URL.revokeObjectURL(
                        audioUrl
                    );


                    if (onComplete) {

                        onComplete();
                    }


                    resolve();
                };


            currentAudio.onerror =
                () => {

                    isSpeaking =
                        false;


                    hideSpeakingBubble();


                    URL.revokeObjectURL(
                        audioUrl
                    );


                    resolve();
                };
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
                    audio: true
                });


        const options = {
            mimeType:
                "audio/webm;codecs=opus"
        };


        if (
            !MediaRecorder.isTypeSupported(
                options.mimeType
            )
        ) {

            options.mimeType =
                "audio/webm";
        }


        mediaRecorder =
            new MediaRecorder(
                stream,
                options
            );


        recordingChunks =
            [];


        mediaRecorder.ondataavailable =
            (event) => {

                if (
                    event.data.size > 0
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
                        (track) =>
                            track.stop()
                    );


                recordBtn.classList.remove(
                    "bg-red-500",
                    "text-white",
                    "recording-active"
                );


                recordBtn.classList.add(
                    "bg-zinc-800/80",
                    "text-gray-400"
                );


                micIcon.classList.remove(
                    "hidden"
                );


                stopIcon.classList.add(
                    "hidden"
                );


                recordingStatus.textContent =
                    "Recording complete";


                submitBtn.classList.remove(
                    "hidden"
                );


                submitBtn.disabled =
                    false;
            };


        mediaRecorder.start();


        recordBtn.classList.remove(
            "bg-zinc-800/80",
            "text-gray-400"
        );


        recordBtn.classList.add(
            "bg-red-500",
            "text-white",
            "recording-active"
        );


        micIcon.classList.add(
            "hidden"
        );


        stopIcon.classList.remove(
            "hidden"
        );


        recordingStatus.textContent =
            "Recording...";


        submitBtn.classList.add(
            "hidden"
        );


        endInterviewBtn.disabled =
            true;


    } catch (error) {

        console.error(
            "Microphone error:",
            error
        );


        recordingStatus.textContent =
            "Microphone access denied.";
    }
}


function stopRecording() {

    if (!mediaRecorder) {
        return;
    }


    if (
        mediaRecorder.state ===
        "inactive"
    ) {

        return;
    }


    recordingStatus.textContent =
        "Processing recording...";


    submitBtn.disabled =
        true;


    mediaRecorder.stop();
}


// ============================================================
// START INTERVIEW
// ============================================================

async function startInterview() {

    if (!requireAuth()) {
        return;
    }


    // ========================================================
    // Safety check:
    // Make sure a subject exists before calling the backend.
    // ========================================================

    if (!currentSubject) {

        throw new Error(
            "No interview subject selected."
        );
    }


    startInterviewBtn.disabled =
        true;


    startInterviewBtn.classList.add(
        "hidden"
    );


    recordBtn.classList.remove(
        "hidden"
    );


    recordingStatus.textContent =
        "Connecting...";


    console.log(
        "Starting interview with:",
        {
            subject:
                currentSubject,

            duration_minutes:
                selectedDuration
        }
    );


    try {

        const response =
            await fetch(
                startInterviewApiUrl,
                {

                    method: "POST",

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


        if (!response.ok) {

            throw new Error(
                `Failed to start interview. HTTP ${response.status}`
            );
        }


        const expiresAt =
            response.headers.get(
                "X-Interview-Expires-At"
            );


        if (!expiresAt) {

            throw new Error(
                "Server did not return interview expiry time."
            );
        }


        interviewExpiresAt =
            new Date(
                expiresAt
            ).getTime();


        startInterviewTimer(
            expiresAt
        );


        console.log(
            "Interview expires at:",
            expiresAt
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


                endInterviewBtn.disabled =
                    false;
            }
        );


    } catch (error) {

        console.error(
            "Start interview error:",
            error
        );


        recordingStatus.textContent =
            error.message ||
            "Backend not connected";


        hideSpeakingBubble();


        recordBtn.classList.add(
            "hidden"
        );


        startInterviewBtn.classList.remove(
            "hidden"
        );


        startInterviewBtn.disabled =
            false;


        stopInterviewTimer();


        interviewExpiresAt =
            null;
    }
}


// ============================================================
// SUBMIT ANSWER
// ============================================================

async function submitAnswer() {

    if (!recordedBlob) {

        alert(
            "Recording is still processing."
        );

        return;
    }


    disableRecording();


    recordingStatus.textContent =
        "Submitting answer...";


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

                    method: "POST",

                    headers:
                        authHeaders(),

                    body: formData
                }
            );


        const isComplete =
            response.headers.get(
                "X-Interview-Complete"
            ) === "true";


        const questionNumber =
            response.headers.get(
                "X-Question-Number"
            );


        console.log(
            "Submit answer response:",
            response.status
        );


        console.log(
            "Question number:",
            questionNumber
        );


        console.log(
            "Interview complete:",
            isComplete
        );


        if (questionNumber) {

            updateQuestionNumber(
                questionNumber
            );
        }


        if (!response.ok) {

            throw new Error(
                `Backend error: HTTP ${response.status}`
            );
        }


        recordedBlob =
            null;


        recordingChunks =
            [];


        await handleAudioStream(
            response,
            () => {}
        );


        if (isComplete) {

            stopInterviewTimer();


            interviewExpiresAt =
                null;


            showFeedbackSection();


            return;
        }


        enableRecording();


        endInterviewBtn.disabled =
            false;


    } catch (error) {

        console.error(
            "Submit answer error:",
            error
        );


        recordingStatus.textContent =
            error.message ||
            "Connection error";


        hideSpeakingBubble();


        if (
            !interviewExpiresAt ||
            Date.now() <
                interviewExpiresAt
        ) {

            enableRecording();


            endInterviewBtn.disabled =
                false;
        }
    }
}


// ============================================================
// MANUAL END INTERVIEW
// ============================================================

async function endInterview() {

    if (
        !confirm(
            "End interview and get feedback?"
        )
    ) {

        return;
    }


    disableRecording();


    endInterviewBtn.disabled =
        true;


    recordingStatus.textContent =
        "Ending interview...";


    try {

        const response =
            await fetch(
                endInterviewApiUrl,
                {

                    method: "POST",

                    headers:
                        authHeaders({
                            "Content-Type":
                                "application/json"
                        })
                }
            );


        if (!response.ok) {

            throw new Error(
                "Failed to end interview."
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


        interviewExpiresAt =
            null;


        recordingStatus.textContent =
            "Interview completed. Generating feedback...";


        await getFeedback();


    } catch (error) {

        console.error(
            "End interview error:",
            error
        );


        recordingStatus.textContent =
            "Could not end interview";


        endInterviewBtn.disabled =
            false;
    }
}


// ============================================================
// GET FEEDBACK
// ============================================================

async function getFeedback() {

    showFeedbackSection();


    getFeedbackBtn.textContent =
        "Generating...";


    getFeedbackBtn.disabled =
        true;


    try {

        const response =
            await fetch(
                getFeedbackApiUrl,
                {

                    method: "POST",

                    headers:
                        authHeaders({
                            "Content-Type":
                                "application/json"
                        }),

                    body:
                        JSON.stringify({})
                }
            );


        const data =
            await response.json();


        if (data.success) {

            displayFeedback(
                data.feedback
            );


        } else {

            throw new Error(
                data.message ||
                "Failed to generate feedback."
            );
        }


    } catch (error) {

        console.error(
            "Feedback error:",
            error
        );


        getFeedbackBtn.textContent =
            "Error - Retry";


        getFeedbackBtn.disabled =
            false;
    }
}


// ============================================================
// EVENT LISTENERS
// ============================================================

subjectBtns.forEach(
    (btn) => {

        btn.addEventListener(
            "click",
            () => {

                if (
                    !requireAuth()
                ) {

                    return;
                }


                if (
                    currentSubject ===
                    btn.dataset.subject
                ) {

                    return;
                }


                resetToWelcome();


                showInterviewPanel(
                    btn.dataset.subject
                );
            }
        );
    }
);


startInterviewBtn.addEventListener(
    "click",
    startInterview
);


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


submitBtn.addEventListener(
    "click",
    submitAnswer
);


endInterviewBtn.addEventListener(
    "click",
    endInterview
);


getFeedbackBtn.addEventListener(
    "click",
    getFeedback
);


newInterviewBtn.addEventListener(
    "click",
    resetToWelcome
);


if (toggleAuthModeBtn) {

    toggleAuthModeBtn.addEventListener(
        "click",
        () => {

            authMode =
                authMode === "login"
                    ? "register"
                    : "login";


            if (authMessage) {

                authMessage.classList.add(
                    "hidden"
                );
            }


            renderAuthState();
        }
    );
}


if (authSubmitBtn) {

    authSubmitBtn.addEventListener(
        "click",
        submitAuth
    );
}


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        logout
    );
}


// ============================================================
// DASHBOARD LAUNCH INITIALIZATION
// ============================================================
//
// When launched from dashboard.html:
//
// 1. Apply the selected subject.
// 2. Apply the selected duration.
// 3. Show the interview room.
// 4. Automatically start the interview.
// ============================================================

function initializeDashboardLaunch() {

    if (!dashboardSelectedSubject) {

        console.log(
            "[Dashboard Launch] No dashboard configuration found."
        );

        return;
    }


    console.log(
        "[Dashboard Launch] Applying subject:",
        dashboardSelectedSubject
    );


    showInterviewPanel(
        dashboardSelectedSubject
    );


    if (dashboardAutoStart) {

        console.log(
            "[Dashboard Launch] Auto-start enabled."
        );


        setTimeout(
            () => {

                startInterview();

            },
            700
        );
    }
}


// ============================================================
// DOM READY
// ============================================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboardLaunch
    );

} else {

    initializeDashboardLaunch();
}

// ============================================================
// INITIAL AUTH STATE
// ============================================================

renderAuthState();