const tbody = document.getElementById("ordersBody");
const searchInput = document.getElementById("searchOrder");
const reviewsTable = document.getElementById("reviewsTable");

const ordersSection = document.getElementById("ordersSection");
const reviewsSection = document.getElementById("reviewsSection");
const productSection = document.getElementById("productSection");
const showOrdersBtn = document.getElementById("showOrdersBtn");
const showReviewsBtn = document.getElementById("showReviewsBtn");
const showProductBtn = document.getElementById("showProductBtn");

let orders = [];
let reviews = [];
let currentProductId = null;

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

    const newCount = data.filter(o => {
        const status = (o.status || "").trim().toLowerCase();
        return status === "" || status === "новый" || status === "new";
    }).length;

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
                <td>${order.quantity ?? "-"}</td>
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

const tabs = [
    { btn: showOrdersBtn, section: ordersSection },
    { btn: showReviewsBtn, section: reviewsSection },
    { btn: showProductBtn, section: productSection }
];

function showTab(activeBtn) {
    tabs.forEach(({ btn, section }) => {
        const isActive = btn === activeBtn;
        section.style.display = isActive ? "" : "none";
        btn.classList.toggle("active", isActive);
    });
}

showOrdersBtn.addEventListener("click", () => showTab(showOrdersBtn));
showReviewsBtn.addEventListener("click", () => showTab(showReviewsBtn));
showProductBtn.addEventListener("click", () => showTab(showProductBtn));

async function loadVisits() {

    const { count, error } = await supabaseClient
        .from("visits")
        .select("*", { count: "exact", head: true });

    if (error) {
        console.error(error);
        return;
    }

    document.getElementById("visitsCount").textContent = count ?? 0;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count: todayCount, error: todayError } = await supabaseClient
        .from("visits")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfDay.toISOString());

    if (todayError) {
        console.error(todayError);
        return;
    }

    document.getElementById("visitsToday").textContent = todayCount ?? 0;

}

(async () => {
    const isLoggedIn = await checkAuth();
    if (isLoggedIn) {
        loadOrders();
        loadReviews();
        loadVisits();
        loadProduct();
    }
})();

/* ================= ТОВАР ================= */

const productForm = document.getElementById("productForm");
const pNameInput = document.getElementById("pName");
const pPriceInput = document.getElementById("pPrice");
const pOldPriceInput = document.getElementById("pOldPrice");
const pStockInput = document.getElementById("pStock");
const pInStockInput = document.getElementById("pInStock");
const pSaleTextInput = document.getElementById("pSaleText");
const pImageInput = document.getElementById("pImage");
const pImagePreview = document.getElementById("pImagePreview");
const pSaveBtn = document.getElementById("pSaveBtn");

function updateImagePreview() {
    const url = pImageInput.value.trim();
    if (url) {
        pImagePreview.src = url;
        pImagePreview.style.display = "block";
    } else {
        pImagePreview.style.display = "none";
    }
}

if (pImageInput) {
    pImageInput.addEventListener("input", updateImagePreview);
}

async function loadProduct() {

    const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(error);
        return;
    }

    if (!data) {
        // Таблица products пуста — форма останется пустой до первого сохранения.
        // При сабмите без currentProductId вставим первую строку, а не обновим.
        return;
    }

    currentProductId = data.id;

    pNameInput.value = data.name ?? "";
    pPriceInput.value = data.price ?? "";
    pOldPriceInput.value = data.old_price ?? "";
    pStockInput.value = data.stock ?? "";
    pInStockInput.checked = data.in_stock !== false;
    pSaleTextInput.value = data.sale_text ?? "";
    pImageInput.value = data.image ?? "";

    updateImagePreview();

}

if (productForm) {
    productForm.addEventListener("submit", async e => {
        e.preventDefault();

        const originalLabel = pSaveBtn.textContent;
        pSaveBtn.disabled = true;
        pSaveBtn.textContent = "Сохранение...";

        const payload = {
            name: pNameInput.value.trim(),
            price: Number(pPriceInput.value) || 0,
            old_price: pOldPriceInput.value ? Number(pOldPriceInput.value) : null,
            stock: pStockInput.value ? Number(pStockInput.value) : null,
            in_stock: pInStockInput.checked,
            sale_text: pSaleTextInput.value.trim(),
            image: pImageInput.value.trim(),
            updated_at: new Date().toISOString()
        };

        let saveError;

        if (currentProductId === null) {
            // Первое сохранение — строки в таблице ещё не было
            const { data, error } = await supabaseClient
                .from("products")
                .insert([payload])
                .select()
                .single();

            saveError = error;
            if (!error && data) currentProductId = data.id;
        } else {
            const { error } = await supabaseClient
                .from("products")
                .update(payload)
                .eq("id", currentProductId);

            saveError = error;
        }

        pSaveBtn.disabled = false;
        pSaveBtn.textContent = originalLabel;

        if (saveError) {
            alert(saveError.message);
            return;
        }

        alert("✅ Товар обновлён — изменения уже видны на сайте.");

    });
}
