// ============================================================
// AUTHENTICATION PAGE LOGIC
// ============================================================

const AUTH_API_BASE_URL =
    "http://127.0.0.1:8000";


// ============================================================
// SHARED UI HELPERS
// ============================================================

function showAuthMessage(
    message,
    type = "error"
) {

    const element =
        document.getElementById("authMessage");

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.classList.remove(
        "hidden",
        "bg-red-500/10",
        "border-red-500/20",
        "text-red-400",
        "bg-green-500/10",
        "border-green-500/20",
        "text-green-400"
    );

    element.classList.add(
        "border"
    );

    if (type === "success") {

        element.classList.add(
            "bg-green-500/10",
            "border-green-500/20",
            "text-green-400"
        );

    } else {

        element.classList.add(
            "bg-red-500/10",
            "border-red-500/20",
            "text-red-400"
        );
    }
}


function hideAuthMessage() {

    const element =
        document.getElementById("authMessage");

    if (element) {

        element.classList.add(
            "hidden"
        );
    }
}


// ============================================================
// PASSWORD VISIBILITY
// ============================================================

function setupPasswordToggle() {

    const toggleButton =
        document.getElementById("togglePassword");

    const passwordInput =
        document.getElementById("password");

    const passwordIcon =
        document.getElementById("passwordIcon");

    if (
        !toggleButton ||
        !passwordInput ||
        !passwordIcon
    ) {
        return;
    }

    toggleButton.addEventListener(
        "click",
        () => {

            const isPassword =
                passwordInput.type ===
                "password";

            passwordInput.type =
                isPassword
                    ? "text"
                    : "password";

            passwordIcon.className =
                isPassword
                    ? "fas fa-eye-slash"
                    : "fas fa-eye";
        }
    );
}


// ============================================================
// REDIRECT IF ALREADY AUTHENTICATED
// ============================================================
//
// CHANGED:
// Authenticated users now go to the dashboard instead of
// directly entering the interview room.
// ============================================================

function redirectAuthenticatedUser() {

    const token =
        localStorage.getItem(
            "authToken"
        );

    if (token) {

        window.location.href =
            "dashboard.html";
    }
}


// ============================================================
// STORE AUTHENTICATION
// ============================================================

function storeAuthentication(data) {

    if (!data.access_token) {

        throw new Error(
            "Authentication response did not contain a token."
        );
    }

    localStorage.setItem(
        "authToken",
        data.access_token
    );

    if (data.user) {

        localStorage.setItem(
            "currentUser",
            JSON.stringify(data.user)
        );
    }
}


// ============================================================
// LOGIN
// ============================================================

function initLoginPage() {

    redirectAuthenticatedUser();

    setupPasswordToggle();

    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");

    const loginButton =
        document.getElementById("loginBtn");

    const buttonText =
        document.getElementById("loginBtnText");

    const spinner =
        document.getElementById("loginSpinner");

    if (!loginButton) {
        return;
    }

    async function login() {

        hideAuthMessage();

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;

        if (!email || !password) {

            showAuthMessage(
                "Please enter your email and password."
            );

            return;
        }

        loginButton.disabled =
            true;

        buttonText.textContent =
            "Signing in...";

        spinner.classList.remove(
            "hidden"
        );

        try {

            const response =
                await fetch(
                    `${AUTH_API_BASE_URL}/auth/login`,
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

            let data;

            try {

                data =
                    await response.json();

            } catch {

                throw new Error(
                    "The server returned an invalid response."
                );
            }

            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Login failed. Please check your credentials."
                );
            }

            storeAuthentication(
                data
            );

            showAuthMessage(
                "Login successful. Redirecting...",
                "success"
            );

            setTimeout(
                () => {

                    window.location.href =
                        "dashboard.html";

                },
                400
            );

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            showAuthMessage(
                error.message ||
                "Unable to login."
            );

        } finally {

            loginButton.disabled =
                false;

            buttonText.textContent =
                "Sign In";

            spinner.classList.add(
                "hidden"
            );
        }
    }

    loginButton.addEventListener(
        "click",
        login
    );

    passwordInput.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                "Enter"
            ) {
                login();
            }
        }
    );

    emailInput.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                "Enter"
            ) {

                passwordInput.focus();
            }
        }
    );
}


// ============================================================
// REGISTER
// ============================================================

function initRegisterPage() {

    redirectAuthenticatedUser();

    setupPasswordToggle();

    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");

    const registerButton =
        document.getElementById("registerBtn");

    const buttonText =
        document.getElementById("registerBtnText");

    const spinner =
        document.getElementById("registerSpinner");

    if (!registerButton) {
        return;
    }

    async function register() {

        hideAuthMessage();

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;

        if (!email || !password) {

            showAuthMessage(
                "Please enter your email and password."
            );

            return;
        }

        if (password.length < 8) {

            showAuthMessage(
                "Password must contain at least 8 characters."
            );

            return;
        }

        registerButton.disabled =
            true;

        buttonText.textContent =
            "Creating account...";

        spinner.classList.remove(
            "hidden"
        );

        try {

            const response =
                await fetch(
                    `${AUTH_API_BASE_URL}/auth/register`,
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

            let data;

            try {

                data =
                    await response.json();

            } catch {

                throw new Error(
                    "The server returned an invalid response."
                );
            }

            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Registration failed."
                );
            }

            storeAuthentication(
                data
            );

            showAuthMessage(
                "Account created successfully. Redirecting...",
                "success"
            );

            // ==================================================
            // FIX:
            // Registration now goes to the dashboard.
            // ==================================================

            setTimeout(
                () => {

                    window.location.href =
                        "dashboard.html";

                },
                500
            );

        } catch (error) {

            console.error(
                "Registration error:",
                error
            );

            showAuthMessage(
                error.message ||
                "Unable to create account."
            );

        } finally {

            registerButton.disabled =
                false;

            buttonText.textContent =
                "Create Account";

            spinner.classList.add(
                "hidden"
            );
        }
    }

    registerButton.addEventListener(
        "click",
        register
    );

    passwordInput.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                "Enter"
            ) {
                register();
            }
        }
    );
}