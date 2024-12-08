// 관리자 페이지 처리

fetch("/api/admin", {
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

document.getElementById("fetchItems").addEventListener("click", async () => {
    const response = await fetch("/api/playersAll");
    const players = await response.json();
    console.log(players);
    const tbody = document.getElementById("itemsTable").querySelector("tbody");
    tbody.innerHTML = ""; // 기존 항목 제거
    players.forEach((player) => {
        const row = `<tr>
            <td>${player.player_id}</td>
            <td>${player.player_name}</td>
            <td>${player.player_speed}</td>
            <td>${player.player_finish}</td>
            <td>${player.player_power}</td>
            <td>${player.player_defense}</td>
            <td>${player.player_stamina}</td>
            <td>${player.player_average}</td>
            <td>
              <button onclick="deleteItem(${player.name})">Delete</button>
              <button onclick="editItem(${player.name})">Edit</button>
            </td>
          </tr>`;
        tbody.insertAdjacentHTML("beforeend", row);
    });
});