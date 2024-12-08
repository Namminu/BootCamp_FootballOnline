const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

// 로그인 처리
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        alert("Login successful!");
        window.location.href = "admin.html";
      } else {
        throw new Error("Invalid credentials");
      }
    } catch (error) {
      message.textContent = error.message;
    }
  });
}