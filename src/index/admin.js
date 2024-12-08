// 관리자 페이지 처리

fetch("/admin", {
    method: "GET",
})
    .then((response) => {
        if (!response.ok) throw new Error("Access denied");
        return response.json();
    })
    .then((data) => {
        message.textContent = data.message;
    })
    .catch((error) => {
        message.textContent = error.message;
    });
