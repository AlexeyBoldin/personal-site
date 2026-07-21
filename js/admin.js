const tbody = document.getElementById("ordersBody");
const searchInput = document.getElementById("searchOrder");

let orders = [];

async function checkAuth() {

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "login.html";
        return false;
    }

    return true;
}

async function loadOrders() {

    const { data, error } = await supabaseClient
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        alert("Не удалось загрузить заказы.");
        return;
    }

    orders = data;
    renderOrders(orders);
    updateDashboard(orders);
}

function updateDashboard(data) {

    document.getElementById("ordersCount").textContent = data.length;

    const total = data.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
    );

    document.getElementById("salesTotal").textContent =
        total.toLocaleString() + " ₴";

    const newCount = data.filter(
        o => (o.status || "Новый") === "Новый"
    ).length;

    document.getElementById("newOrders").textContent = newCount;

    const today = new Date().toDateString();

    const todayCount = data.filter(
        o => new Date(o.created_at).toDateString() === today
    ).length;

    document.getElementById("todayOrders").textContent = todayCount;

}

function renderOrders(list) {

    tbody.innerHTML = "";

    list.forEach(order => {

        tbody.innerHTML += `
            <tr>
                <td>${order.order_number}</td>
                <td>${order.name}</td>
                <td>${order.phone}</td>
                <td>${order.total} ₴</td>
                <td>
                    <select class="statusSelect" data-id="${order.id}">
                        <option ${order.status === "Новый" ? "selected" : ""}>Новый</option>
                        <option ${order.status === "В работе" ? "selected" : ""}>В работе</option>
                        <option ${order.status === "Отправлен" ? "selected" : ""}>Отправлен</option>
                        <option ${order.status === "Доставлен" ? "selected" : ""}>Доставлен</option>
                        <option ${order.status === "Отменён" ? "selected" : ""}>Отменён</option>
                    </select>
                </td>
                <td>${new Date(order.created_at).toLocaleString()}</td>
                <td>
                    <button class="deleteOrder" data-id="${order.id}" type="button">🗑️</button>
                </td>
            </tr>
        `;

    });

    attachRowHandlers();

}

function attachRowHandlers() {

    document.querySelectorAll(".statusSelect").forEach(select => {

        select.addEventListener("change", async function () {

            const id = this.dataset.id;
            const status = this.value;

            const { error } = await supabaseClient
                .from("orders")
                .update({ status })
                .eq("id", id);

            if (error) {
                alert(error.message);
                return;
            }

            const order = orders.find(o => String(o.id) === String(id));
            if (order) order.status = status;
            updateDashboard(orders);

        });

    });

    document.querySelectorAll(".deleteOrder").forEach(button => {

        button.addEventListener("click", async function () {

            const id = this.dataset.id;

            if (!confirm("Удалить этот заказ безвозвратно?")) {
                return;
            }

            const { error } = await supabaseClient
                .from("orders")
                .delete()
                .eq("id", id);

            if (error) {
                alert(error.message);
                return;
            }

            orders = orders.filter(o => String(o.id) !== String(id));
            renderOrders(orders);
            updateDashboard(orders);

        });

    });

}

searchInput.addEventListener("input", function () {

    const value = this.value.toLowerCase();

    const filtered = orders.filter(order =>
        (order.order_number ?? "").toLowerCase().includes(value) ||
        (order.name ?? "").toLowerCase().includes(value) ||
        (order.phone ?? "").toLowerCase().includes(value)
    );

    renderOrders(filtered);

});

(async () => {
    const isLoggedIn = await checkAuth();
    if (isLoggedIn) {
        loadOrders();
    }
})();
