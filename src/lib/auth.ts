  export function redirectToLogin() {
    if (typeof window === "undefined") return;
    window.location.href = "/";
  }
