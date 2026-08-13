

// Global State
let mediaRecorder = null;
let recordingChunks = [];
let recordedBlob = null;
let currentSubject = null;
let isSpeaking = false;
let currentAudio = null;
let authMode = "login";
let authToken = localStorage.getItem("authToken");
let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

// DOM Elements
const welcomeState = document.getElementById("welcomeState");
const interviewState = document.getElementById("interviewState");
const subjectBtns = document.querySelectorAll(".subject-btn");
const subjectBadge = document.getElementById("subjectBadge");
const subjectIcon = document.getElementById("subjectIcon");
const questionNum = document.getElementById("questionNum");
const speakingBubble = document.getElementById("speakingBubble");
const startInterviewBtn = document.getElementById("startInterviewBtn");
const recordBtn = document.getElementById("recordBtn");
const micIcon = document.getElementById("micIcon");
const stopIcon = document.getElementById("stopIcon");
const recordingStatus = document.getElementById("recordingStatus");
const submitBtn = document.getElementById("submitBtn");
const endInterviewBtn = document.getElementById("endInterviewBtn");
const feedbackSection = document.getElementById("feedbackSection");
const getFeedbackArea = document.getElementById("getFeedbackArea");
const getFeedbackBtn = document.getElementById("getFeedbackBtn");
const feedbackContent = document.getElementById("feedbackContent");
const feedbackSubject = document.getElementById("feedbackSubject");
const scoreCircle = document.getElementById("scoreCircle");
const scoreValue = document.getElementById("scoreValue");
const feedbackText = document.getElementById("feedbackText");
const improvementText = document.getElementById("improvementText");
const newInterviewBtn = document.getElementById("newInterviewBtn");
const authForms = document.getElementById("authForms");
const authTitle = document.getElementById("authTitle");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const toggleAuthModeBtn = document.getElementById("toggleAuthModeBtn");
const userPanel = document.getElementById("userPanel");
const currentUserEmail = document.getElementById("currentUserEmail");
const logoutBtn = document.getElementById("logoutBtn");

// Subject Icons Map
const iconMap = {
    "Self Introduction": "fas fa-user text-blue-400",
    "Generative AI": "fas fa-brain text-purple-400",
    "Python": "fab fa-python text-yellow-400",
    "English": "fas fa-language text-green-400",
    "HTML": "fab fa-html5 text-orange-400",
    "CSS": "fab fa-css3-alt text-blue-400"
};


// ========== UI STATE FUNCTIONS ==========
const BASE_URL = "http://127.0.0.1:8000";

function authHeaders(headers = {}) {
    return authToken ? { ...headers, Authorization: `Bearer ${authToken}` } : headers;
}

function setAuthMessage(message, isError = false) {
    authMessage.textContent = message;
    authMessage.classList.remove("hidden", "text-red-400", "text-green-400");
    authMessage.classList.add(isError ? "text-red-400" : "text-green-400");
}

function renderAuthState() {
    if (authToken && currentUser) {
        authForms.classList.add("hidden");
        userPanel.classList.remove("hidden");
        currentUserEmail.textContent = currentUser.email;
        return;
    }

    authForms.classList.remove("hidden");
    userPanel.classList.add("hidden");
    authTitle.textContent = authMode === "login" ? "Login" : "Register";
    authSubmitBtn.textContent = authMode === "login" ? "Login" : "Create Account";
    toggleAuthModeBtn.textContent = authMode === "login" ? "Need an account? Register" : "Already have an account? Login";
}

function requireAuth() {
    if (authToken) return true;
    setAuthMessage("Please login or register before starting an interview.", true);
    return false;
}

async function submitAuth() {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) {
        setAuthMessage("Email and password are required.", true);
        return;
    }

    authSubmitBtn.disabled = true;
    setAuthMessage(authMode === "login" ? "Logging in..." : "Creating account...");

    try {
        const response = await fetch(`${BASE_URL}/auth/${authMode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || "Authentication failed");
        }

        authToken = data.access_token;
        currentUser = data.user;
        localStorage.setItem("authToken", authToken);
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        authPassword.value = "";
        renderAuthState();
    } catch (error) {
        setAuthMessage(error.message, true);
    } finally {
        authSubmitBtn.disabled = false;
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    resetToWelcome();
    renderAuthState();
}


function showInterviewPanel(subject) {
    currentSubject = subject;
    
    subjectBtns.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.subject === subject);
    });
    
    welcomeState.classList.add("hidden");
    interviewState.classList.remove("hidden");
    feedbackSection.classList.add("hidden");
    
    subjectBadge.textContent = subject;
    subjectIcon.className = iconMap[subject] + " text-2xl";
    questionNum.textContent = "1";
    
    speakingBubble.classList.add("hidden");
    startInterviewBtn.classList.remove("hidden");
    recordBtn.classList.add("hidden");
    recordBtn.disabled = true;
    submitBtn.disabled = true;
    endInterviewBtn.disabled = true;
    recordingStatus.textContent = "Click Start Interview to begin";
}

function updateQuestionNumber(number) {
    questionNum.textContent = number;
}

function showSpeakingBubble() {
    speakingBubble.classList.remove("hidden");
}

function hideSpeakingBubble() {
    speakingBubble.classList.add("hidden");
}

function enableRecording() {
    recordBtn.disabled = false;
    endInterviewBtn.disabled = false;
    recordingStatus.textContent = "Click to record";
}

function disableRecording() {
    recordBtn.disabled = true;
    submitBtn.disabled = true;
    submitBtn.classList.add("hidden");
}

function showFeedbackSection() {
    feedbackSection.classList.remove("hidden");
    getFeedbackArea.classList.remove("hidden");
    feedbackContent.classList.add("hidden");
    endInterviewBtn.disabled = true;
    disableRecording();
    recordingStatus.textContent = "Interview ended";
    hideSpeakingBubble();
}

function displayFeedback(data) {
    feedbackSubject.textContent = data.subject || currentSubject;
    scoreValue.textContent = data.candidate_score || 0;
    
    const offset = 301.6 - ((data.candidate_score || 0) / 5) * 301.6;
    scoreCircle.style.strokeDashoffset = offset;
    
    feedbackText.textContent = data.feedback || "No feedback available";
    improvementText.textContent = data.areas_of_improvement || "No suggestions available";
    
    getFeedbackArea.classList.add("hidden");
    feedbackContent.classList.remove("hidden");
}

function resetToWelcome() {
    currentSubject = null;
    isSpeaking = false;
    mediaRecorder = null;
    recordingChunks = [];
    recordedBlob = null;
    
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    subjectBtns.forEach((btn) => {
        btn.classList.remove("active");
    });
    
    welcomeState.classList.remove("hidden");
    interviewState.classList.add("hidden");
    
    recordBtn.classList.remove("bg-red-500", "text-white", "recording-active");
    recordBtn.classList.add("bg-zinc-800/80", "text-gray-400");
    micIcon.classList.remove("hidden");
    stopIcon.classList.add("hidden");
    submitBtn.classList.add("hidden");
    
    speakingBubble.classList.add("hidden");
    
    scoreCircle.style.strokeDashoffset = 301.6;
    getFeedbackBtn.textContent = "Get Feedback";
    getFeedbackBtn.disabled = false;
}


// ========== AUDIO FUNCTIONS ==========

function handleAudioStream(response, onComplete) {
    const reader = response.body.getReader();
     let streamFinished = false;
    const decoder = new TextDecoder();
    let mediaSource = new MediaSource();
    let audioUrl = URL.createObjectURL(mediaSource);
    let sourceBuffer;
    let queue = [];
    let isSourceBufferReady = false;

    // Only show speaking bubble when actually streaming audio
    speakingBubble.classList.remove("hidden");
    isSpeaking = true;
    recordBtn.disabled = true;
    recordingStatus.textContent = "Listening...";

    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    currentAudio = new Audio(audioUrl);
    //currentAudio.play().catch(() => {});

    mediaSource.addEventListener("sourceopen", () => {
        sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
         currentAudio.play().catch(() => {});

        isSourceBufferReady = true;
        while (queue.length > 0 && !sourceBuffer.updating) {
            sourceBuffer.appendBuffer(queue.shift());
        }
        sourceBuffer.addEventListener("updateend", () => {
            if (queue.length > 0) {
                        sourceBuffer.appendBuffer(queue.shift());

            }else if (
                 streamFinished &&
                 mediaSource.readyState === "open"
    ) {

        mediaSource.endOfStream();

    }
        });
    });

    function processChunk({ done, value }) {
        console.log("Processing chunk:", value, done);
        if (done) {
            streamFinished = true;
            if (mediaSource.readyState === "open" && queue.length === 0 &&
            !sourceBuffer.updating) {
                try {
                    mediaSource.endOfStream();
                } catch (e) {}
            }
            if (onComplete) onComplete();
            return;
        }
        const textChunk = decoder.decode(value, { stream: true });
        textChunk.split("\n").forEach((line) => {
            if (line.trim()) {
                try {
                    const binaryString = atob(line);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    if (isSourceBufferReady && !sourceBuffer.updating) {
                        sourceBuffer.appendBuffer(bytes);
                    } else {
                        queue.push(bytes);
                    }
                } catch (e) {
                    console.error("Base64 decode error:", e);
                }
            }
        });
        reader.read().then(processChunk);
    }

    reader.read().then(processChunk);

    currentAudio.onended = () => {
        isSpeaking = false;
        speakingBubble.classList.add("hidden");
        enableRecording();
        URL.revokeObjectURL(audioUrl);
    };

    currentAudio.onerror = () => {
        isSpeaking = false;
        speakingBubble.classList.add("hidden");
        enableRecording();
        URL.revokeObjectURL(audioUrl);
    };
}


// ========== RECORDING FUNCTIONS ==========

function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const options = { mimeType: "audio/webm;codecs=opus" };
        
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = "audio/webm";
        }
        
        mediaRecorder = new MediaRecorder(stream, options);
        recordingChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordingChunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop=()=>{
            recordedBlob=new Blob(
                recordingChunks,
                {type:"audio/webm"}
            );
        stream.getTracks().forEach(track=>track.stop());
        recordBtn.classList.remove(
            "bg-red-500",
            "text-white",
            "recording-active"
        );
        recordBtn.classList.add("bg-zinc-800/80", "text-gray-400");
        micIcon.classList.remove("hidden");
        stopIcon.classList.add("hidden");
        recordingStatus.textContent = "Recording complete";
        submitBtn.classList.remove("hidden");
        submitBtn.disabled = false;
        };
        

        mediaRecorder.start();
        
        recordBtn.classList.remove("bg-zinc-800/80", "text-gray-400");
        recordBtn.classList.add("bg-red-500", "text-white", "recording-active");
        micIcon.classList.add("hidden");
        stopIcon.classList.remove("hidden");
        recordingStatus.textContent = "Recording...";
        submitBtn.classList.add("hidden");
        endInterviewBtn.disabled = true;
    });
}

function stopRecording() {
  if(!mediaRecorder) return;
  if (mediaRecorder.state=='inactive')return;
  recordingStatus.textContent="Processing recording...";
  submitBtn.disabled=true;
  mediaRecorder.stop();
}


// ========== API FUNCTIONS ==========

const startInterviewApiUrl = `${BASE_URL}/start-interview`;


async function startInterview() {
    startInterviewBtn.classList.add("hidden");
    recordBtn.classList.remove("hidden");
    recordingStatus.textContent = "Connecting...";
    
    try {
        const response = await fetch(startInterviewApiUrl, {
            method: "POST",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ subject: currentSubject })
        });
        
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("text/plain")) {
            handleAudioStream(response, () => {
                endInterviewBtn.disabled = false;
            });
        } else {
            const data = await response.json();
            console.log("Question:", data.question);
            enableRecording();
            endInterviewBtn.disabled = false;
        }
    } catch (error) {
        recordingStatus.textContent = "Backend not connected";
        hideSpeakingBubble();
        recordBtn.classList.add("hidden");
        startInterviewBtn.classList.remove("hidden");
    }
}

const submitAnswerApiUrl = `${BASE_URL}/submit-answer`;

async function submitAnswer() {
    if (!recordedBlob){
        alert("Recording is still processing.");
        return ;
    }

    disableRecording();
    recordingStatus.textContent = "Submitting...";

    const formData = new FormData();
    formData.append("audio", recordedBlob, "answer.webm");

    try {
        const response = await fetch(submitAnswerApiUrl, {
            method: "POST",
            headers: authHeaders(),
            body: formData
        });
        
        const contentType = response.headers.get("content-type");
        const isComplete = response.headers.get('X-Interview-Complete') === 'true';
        const questionNumber = response.headers.get('X-Question-Number');
        
        if (questionNumber) {
            updateQuestionNumber(questionNumber);
        }
        
        if (contentType && contentType.includes("text/plain")) {
            handleAudioStream(response, () => {
                recordedBlob = null;
                recordingChunks = [];
                
                const previousHandler = currentAudio.onended;

                currentAudio.onended = () => {
                previousHandler?.();

                 if(isComplete){
                  showFeedbackSection();
                }
                };
            });
        } else {
            if (!response.ok) {
                throw new Error("Backend Error");
                    }

            const data = await response.json();
            recordedBlob = null;
            recordingChunks = [];
            
            if (isComplete) {
                showFeedbackSection();
            } else {
                enableRecording();
                endInterviewBtn.disabled = false;
            }
        }
    } catch (error) {
        recordingStatus.textContent = "Connection error";
        hideSpeakingBubble();
        enableRecording();
    }
}



async function endInterview() {
    if (!confirm("End interview and get feedback?")) return;

    disableRecording();
    endInterviewBtn.disabled = true;
    recordingStatus.textContent = "Ending interview...";
    
    await getFeedback();
}

const getFeedbackApiUrl =`${BASE_URL}/get-feedback`;
async function getFeedback() {
    showFeedbackSection();
    getFeedbackBtn.textContent = "Generating...";
    getFeedbackBtn.disabled = true;

    try {
        const response = await fetch(getFeedbackApiUrl, {
            method: "POST",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({})
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayFeedback(data.feedback);
        }
    } catch (error) {
        getFeedbackBtn.textContent = "Error - Retry";
        getFeedbackBtn.disabled = false;
    }
}


// ========== EVENT LISTENERS ==========

subjectBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        if (!requireAuth()) return;
        if (currentSubject === btn.dataset.subject) return;
        resetToWelcome();
        showInterviewPanel(btn.dataset.subject);
    });
});

startInterviewBtn.addEventListener("click", startInterview);

recordBtn.addEventListener("click", () => {
    if (isSpeaking || recordBtn.disabled) return;
    
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        startRecording();
    } else {
        stopRecording();
    }
});

submitBtn.addEventListener("click", submitAnswer);
endInterviewBtn.addEventListener("click", endInterview);
getFeedbackBtn.addEventListener("click", getFeedback);
newInterviewBtn.addEventListener("click", resetToWelcome);

toggleAuthModeBtn.addEventListener("click", () => {
    authMode = authMode === "login" ? "register" : "login";
    authMessage.classList.add("hidden");
    renderAuthState();
});
authSubmitBtn.addEventListener("click", submitAuth);
logoutBtn.addEventListener("click", logout);
renderAuthState();
