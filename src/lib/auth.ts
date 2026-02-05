  export function redirectToLogin() {
    if (typeof window === "undefined") return;
    window.location.href = "https://gallery.mrburstudio.com/";
  }
