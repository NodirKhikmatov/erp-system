/** Server tomondagi `getTranslations("auth")` dan keladigan yozuvlar (client ichida kontekstsiz ishlaydi). */

export type LoginAuthLabels = {
  kicker: string;
  signIn: string;
  cardSubtitle: string;
  email: string;
  password: string;
  errorRequired: string;
  errorInvalid: string;
  errorUnreachable: string;
  submit: string;
  noAccount: string;
  signUp: string;
};

export type SignupAuthLabels = {
  kicker: string;
  signUp: string;
  registerSubtitle: string;
  fullName: string;
  email: string;
  password: string;
  passwordHint: string;
  roleLabel: string;
  roleWorker: string;
  roleManager: string;
  registerSubmit: string;
  registerSubmitting: string;
  registerErrorRequired: string;
  registerErrorEmailTaken: string;
  registerErrorInvalid: string;
  registerErrorServer: string;
  errorUnreachable: string;
  haveAccount: string;
  signIn: string;
};

/** Inglizcha — Fast Refresh bilan `labels` vaqtinchalik yoʻq boʻlganida chiqib ketmaslik uchun. */
const LOGIN_AUTH_FALLBACK_EN: LoginAuthLabels = {
  kicker: "Furniture ERP",
  signIn: "Sign in",
  cardSubtitle: "ERP · secure access",
  email: "Email",
  password: "Password",
  errorRequired: "Enter email and password.",
  errorInvalid: "Invalid credentials or server error.",
  errorUnreachable:
    "Cannot reach the API. Start the backend (port 4000) or check API_URL.",
  submit: "Continue",
  noAccount: "No account yet?",
  signUp: "Create account",
};

const SIGNUP_AUTH_FALLBACK_EN: SignupAuthLabels = {
  kicker: "Furniture ERP",
  signUp: "Create account",
  registerSubtitle:
    "Join as a worker or manager. Admins are created separately.",
  fullName: "Full name",
  email: "Email",
  password: "Password",
  passwordHint: "At least 6 characters.",
  roleLabel: "Role",
  roleWorker: "Worker",
  roleManager: "Manager",
  registerSubmit: "Register",
  registerSubmitting: "Creating account…",
  registerErrorRequired: "Fill in all fields.",
  registerErrorEmailTaken:
    "This email is already registered. Sign in or use another email.",
  registerErrorInvalid:
    "Check your details. Email must be valid; password at least 6 characters.",
  registerErrorServer: "Registration failed. Please try again later.",
  errorUnreachable:
    "Cannot reach the API. Start the backend (port 4000) or check API_URL.",
  haveAccount: "Already have an account?",
  signIn: "Sign in",
};

/** Hot reload bilan `labels` yoʻq boʻlsa ham forma ishlasin. */
export function loginLabelsWithFallback(
  labels: LoginAuthLabels | undefined | null,
): LoginAuthLabels {
  return { ...LOGIN_AUTH_FALLBACK_EN, ...(labels ?? {}) };
}

export function signupLabelsWithFallback(
  labels: SignupAuthLabels | undefined | null,
): SignupAuthLabels {
  return { ...SIGNUP_AUTH_FALLBACK_EN, ...(labels ?? {}) };
}
