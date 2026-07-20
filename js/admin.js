const tbody = document.getElementById("ordersBody");
const searchInput = document.getElementById("searchOrder");

let orders = [];

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
                <td>${order.status ?? "Новый"}</td>
                <td>${new Date(order.created_at).toLocaleString()}</td>
            </tr>
        `;

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

loadOrders();
