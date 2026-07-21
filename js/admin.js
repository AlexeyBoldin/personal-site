const tbody = document.getElementById("ordersBody");
const searchInput = document.getElementById("searchOrder");
const reviewsTable = document.getElementById("reviewsTable");

const ordersSection = document.getElementById("ordersSection");
const reviewsSection = document.getElementById("reviewsSection");
const showOrdersBtn = document.getElementById("showOrdersBtn");
const showReviewsBtn = document.getElementById("showReviewsBtn");

let orders = [];
let reviews = [];

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

async function loadReviews() {

    const { data, error } = await supabaseClient
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    reviews = data;
    renderReviews(reviews);

}

function renderReviews(list) {

    reviewsTable.innerHTML = "";

    list.forEach(review => {

        reviewsTable.innerHTML += `
<tr>

<td>${review.name}</td>

<td>${"⭐".repeat(review.rating)}</td>

<td>${review.review}</td>

<td>${new Date(review.created_at).toLocaleDateString()}</td>

<td>
${review.approved ? "✅ Одобрен" : "⏳ Ожидает"}
</td>

<td>

<button onclick="approveReview(${review.id})">
✔
</button>

<button onclick="deleteReview(${review.id})">
🗑
</button>

</td>

</tr>
`;

    });

}

async function approveReview(id) {

    const { error } = await supabaseClient
        .from("reviews")
        .update({ approved: true })
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

    const review = reviews.find(r => String(r.id) === String(id));
    if (review) review.approved = true;

    renderReviews(reviews);

}

async function deleteReview(id) {

    if (!confirm("Удалить этот отзыв безвозвратно?")) {
        return;
    }

    const { error } = await supabaseClient
        .from("reviews")
        .delete()
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

    reviews = reviews.filter(r => String(r.id) !== String(id));

    renderReviews(reviews);

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

showOrdersBtn.addEventListener("click", () => {
    ordersSection.style.display = "";
    reviewsSection.style.display = "none";
    showOrdersBtn.classList.add("active");
    showReviewsBtn.classList.remove("active");
});

showReviewsBtn.addEventListener("click", () => {
    ordersSection.style.display = "none";
    reviewsSection.style.display = "";
    showReviewsBtn.classList.add("active");
    showOrdersBtn.classList.remove("active");
});

(async () => {
    const isLoggedIn = await checkAuth();
    if (isLoggedIn) {
        loadOrders();
        loadReviews();
    }
})();
