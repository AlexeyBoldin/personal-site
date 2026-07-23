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

function escapeAttr(value) {
    return String(value ?? "").replace(/"/g, "&quot;");
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
                <td>
                    <input
                        type="text"
                        class="ttnInput"
                        data-id="${order.id}"
                        value="${escapeAttr(order.tracking_number)}"
                        placeholder="номер ТТН">
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

    document.querySelectorAll(".ttnInput").forEach(input => {

        input.addEventListener("blur", async function () {

            const id = this.dataset.id;
            const tracking_number = this.value.trim();

            const order = orders.find(o => String(o.id) === String(id));
            if (order && (order.tracking_number || "") === tracking_number) {
                return; // ничего не изменилось — лишний запрос не нужен
            }

            const { error } = await supabaseClient
                .from("orders")
                .update({ tracking_number })
                .eq("id", id);

            if (error) {
                alert(error.message);
                return;
            }

            if (order) order.tracking_number = tracking_number;

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

const showSiteBtn = document.getElementById("showSiteBtn");
const siteSection = document.getElementById("siteSection");

const tabs = [
    { btn: showOrdersBtn, section: ordersSection },
    { btn: showReviewsBtn, section: reviewsSection },
    { btn: showProductBtn, section: productSection },
    { btn: showSiteBtn, section: siteSection }
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
showSiteBtn.addEventListener("click", () => showTab(showSiteBtn));

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
const pDiscountEnabledInput = document.getElementById("pDiscountEnabled");
const pBulkDiscountEnabledInput = document.getElementById("pBulkDiscountEnabled");
const pBulkThresholdInput = document.getElementById("pBulkThreshold");
const pBulkPercentInput = document.getElementById("pBulkPercent");
const pDiscountEndsAtInput = document.getElementById("pDiscountEndsAt");
const pStockReadout = document.getElementById("pStockReadout");
const quickStockForm = document.getElementById("quickStockForm");
const pStockQuickInput = document.getElementById("pStockQuick");

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

// datetime-local input работает в локальном времени без таймзоны,
// а в базе храним ISO-строку (timestamptz) — конвертируем в обе стороны
function isoToLocalInputValue(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputValueToIso(value) {
    if (!value) return null;
    return new Date(value).toISOString();
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
        if (pStockReadout) pStockReadout.textContent = "—";
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
    if (pDiscountEnabledInput) pDiscountEnabledInput.checked = data.discount_enabled === true;
    if (pBulkDiscountEnabledInput) pBulkDiscountEnabledInput.checked = data.bulk_discount_enabled === true;
    if (pBulkThresholdInput) pBulkThresholdInput.value = data.bulk_discount_threshold ?? "";
    if (pBulkPercentInput) pBulkPercentInput.value = data.bulk_discount_percent ?? "";
    if (pDiscountEndsAtInput) pDiscountEndsAtInput.value = isoToLocalInputValue(data.discount_ends_at);

    if (pStockReadout) {
        pStockReadout.textContent = (data.stock === null || data.stock === undefined)
            ? "не ограничен"
            : data.stock;
    }

    updateImagePreview();

}

// Быстрое обновление только остатка — не требует заполнения остальной формы
if (quickStockForm) {
    quickStockForm.addEventListener("submit", async e => {
        e.preventDefault();

        if (currentProductId === null) {
            alert("Сначала сохраните товар через форму ниже хотя бы один раз.");
            return;
        }

        const newStock = pStockQuickInput.value === "" ? null : Number(pStockQuickInput.value);

        const { error } = await supabaseClient
            .from("products")
            .update({
                stock: newStock,
                in_stock: newStock === null ? true : newStock > 0,
                updated_at: new Date().toISOString()
            })
            .eq("id", currentProductId);

        if (error) {
            alert(error.message);
            return;
        }

        pStockQuickInput.value = "";
        await loadProduct();
        alert("✅ Остаток обновлён.");

    });
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
            discount_enabled: pDiscountEnabledInput ? pDiscountEnabledInput.checked : false,
            bulk_discount_enabled: pBulkDiscountEnabledInput ? pBulkDiscountEnabledInput.checked : false,
            bulk_discount_threshold: pBulkThresholdInput && pBulkThresholdInput.value ? Number(pBulkThresholdInput.value) : null,
            bulk_discount_percent: pBulkPercentInput && pBulkPercentInput.value ? Number(pBulkPercentInput.value) : null,
            discount_ends_at: pDiscountEndsAtInput ? localInputValueToIso(pDiscountEndsAtInput.value) : null,
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

        await loadProduct();
        alert("✅ Товар обновлён — изменения уже видны на сайте.");

    });
}

/* ================= НАСТРОЙКИ САЙТА (РЕЖИМ ТЕХРАБОТ) ================= */

let currentSiteSettingsId = null;
const siteForm = document.getElementById("siteForm");
const sMaintenanceModeInput = document.getElementById("sMaintenanceMode");
const sMaintenanceMessageInput = document.getElementById("sMaintenanceMessage");
const sSaveBtn = document.getElementById("sSaveBtn");

async function loadSiteSettings() {

    const { data, error } = await supabaseClient
        .from("site_settings")
        .select("*")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(error);
        return;
    }

    if (!data) return;

    currentSiteSettingsId = data.id;
    if (sMaintenanceModeInput) sMaintenanceModeInput.checked = data.maintenance_mode === true;
    if (sMaintenanceMessageInput) sMaintenanceMessageInput.value = data.maintenance_message ?? "";

}

if (siteForm) {
    siteForm.addEventListener("submit", async e => {
        e.preventDefault();

        const originalLabel = sSaveBtn.textContent;
        sSaveBtn.disabled = true;
        sSaveBtn.textContent = "Сохранение...";

        const payload = {
            maintenance_mode: sMaintenanceModeInput.checked,
            maintenance_message: sMaintenanceMessageInput.value.trim(),
            updated_at: new Date().toISOString()
        };

        let saveError;

        if (currentSiteSettingsId === null) {
            const { data, error } = await supabaseClient
                .from("site_settings")
                .insert([payload])
                .select()
                .single();

            saveError = error;
            if (!error && data) currentSiteSettingsId = data.id;
        } else {
            const { error } = await supabaseClient
                .from("site_settings")
                .update(payload)
                .eq("id", currentSiteSettingsId);

            saveError = error;
        }

        sSaveBtn.disabled = false;
        sSaveBtn.textContent = originalLabel;

        if (saveError) {
            alert(saveError.message);
            return;
        }

        alert("✅ Настройки сайта обновлены.");

    });
}

loadSiteSettings();

/* ================= ВЫХОД ИЗ АДМИНКИ ================= */

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
    });
}
