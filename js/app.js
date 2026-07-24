// js/app.js

/* ================= PRELOADER ================= */
/*
   Регистрируется первым делом, до любого другого кода. Если ниже по файлу
   что-то выбросит ошибку (например, элемент не найден из-за рассинхрона
   версий HTML/JS), прелоадер всё равно скроется и не оставит чёрный экран.
*/

window.addEventListener("load", () => {
	const preloader = document.getElementById("preloader");
	if (!preloader) return;
	setTimeout(() => {
		preloader.style.opacity = "0";
		setTimeout(() => {
			preloader.style.display = "none";
		}, 500);
	}, 800);
});

/* ================= FAQ ================= */

document.querySelectorAll(".faq-question").forEach(item => {
	const toggle = () => {
		const answer = item.nextElementSibling;
		const isOpen = answer.classList.toggle("active");
		item.setAttribute("aria-expanded", isOpen ? "true" : "false");
	};
	item.addEventListener("click", toggle);
	item.addEventListener("keydown", e => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			toggle();
		}
	});
});

/* ================= KEYBOARD SUPPORT FOR CUSTOM CONTROLS ================= */
/*
   .burger and .close-lightbox use role="button" on non-button elements,
   so they need explicit keyboard handling for accessibility.
*/

function makeKeyboardClickable(el, handler) {
	if (!el) return;
	el.addEventListener("keydown", e => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handler(e);
		}
	});
}

/* ================= CACHED ELEMENTS FOR SCROLL HANDLER ================= */

const topButton = document.getElementById("toTop");
const header = document.querySelector(".header");
const progress = document.getElementById("progress");
const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll("nav a");
const revealTargets = document.querySelectorAll(".card,.step,.feature-box,.review");

/* ================= SINGLE SCROLL HANDLER ================= */
/*
   Everything that needs to react to scroll position is handled in one
   listener, throttled with requestAnimationFrame, instead of several
   separate "scroll" listeners each doing their own work.
*/

let scrollTicking = false;

function onScroll() {

	// Reveal cards / steps / feature-box / review as they enter the viewport
	revealTargets.forEach(el => {
		const pos = el.getBoundingClientRect().top;
		if (pos < window.innerHeight - 100) {
			el.classList.add("show");
		}
	});

	// "Back to top" button visibility
	if (window.scrollY > 500) {
		topButton.classList.add("show");
	} else {
		topButton.classList.remove("show");
	}

	// Shrink header on scroll
	if (window.scrollY > 80) {
		header.classList.add("small");
	} else {
		header.classList.remove("small");
	}

	// Scroll progress bar (guarded against division by zero)
	const height = document.documentElement.scrollHeight - window.innerHeight;
	const scrolled = height > 0 ? (window.scrollY / height) * 100 : 0;
	progress.style.width = scrolled + "%";

	// Active menu link highlighting
	let current = "";
	sections.forEach(section => {
		const top = section.offsetTop - 120;
		if (window.scrollY >= top) {
			current = section.getAttribute("id");
		}
	});

	navLinks.forEach(link => {
		link.classList.remove("active");
		if (link.getAttribute("href") == "#" + current) {
			link.classList.add("active");
		}
	});

	scrollTicking = false;
}

window.addEventListener("scroll", () => {
	if (!scrollTicking) {
		requestAnimationFrame(onScroll);
		scrollTicking = true;
	}
});

// Run once on load so the correct state is set before the user scrolls
onScroll();

topButton.onclick = () => {
	window.scrollTo({ top: 0, behavior: "smooth" });
};

/* ================= SCROLL-IN EFFECT (sections) ================= */

const observer = new IntersectionObserver(entries => {
	entries.forEach(entry => {
		if (entry.isIntersecting) {
			entry.target.classList.add("show-section");
		}
	});
}, { threshold: .2 });

sections.forEach(section => {
	section.classList.add("hidden");
	observer.observe(section);
});

/* ================= BURGER MENU ================= */

const burger = document.querySelector(".burger");
const nav = document.querySelector("nav");
const overlay = document.querySelector(".menu-overlay");

const toggleMenu = () => {
	const isOpen = burger.classList.toggle("active");
	nav.classList.toggle("active");
	overlay.classList.toggle("active");
	burger.setAttribute("aria-expanded", isOpen ? "true" : "false");
};

const closeMenu = () => {
	burger.classList.remove("active");
	nav.classList.remove("active");
	overlay.classList.remove("active");
	burger.setAttribute("aria-expanded", "false");
};

burger.onclick = toggleMenu;
makeKeyboardClickable(burger, toggleMenu);

overlay.onclick = closeMenu;

// Close mobile menu automatically after choosing a section
nav.querySelectorAll("a").forEach(link => {
	link.addEventListener("click", closeMenu);
});

/* ================= COUNTERS ================= */

document.querySelectorAll(".counter").forEach(counter => {
	const target = +counter.dataset.target;
	const isFloat = !Number.isInteger(target);
	const duration = 1200; // ms
	const steps = 60;
	const inc = target / steps;
	let current = 0;
	let frame = 0;

	const update = () => {
		frame++;
		current += inc;

		if (frame < steps) {
			counter.innerText = isFloat ? current.toFixed(1) : Math.ceil(current);
			setTimeout(update, duration / steps);
		} else {
			counter.innerText = counter.dataset.target;
		}
	};

	update();
});

/* ================= GLOW (mouse-follow highlight) ================= */

document.querySelectorAll(".card,.step,.workflow-item,.feature-box").forEach(card => {
	card.addEventListener("mousemove", e => {
		const r = card.getBoundingClientRect();
		card.style.setProperty("--x", (e.clientX - r.left) + "px");
		card.style.setProperty("--y", (e.clientY - r.top) + "px");
	});
});

/* ================= LIGHTBOX ================= */

const lightbox = document.querySelector(".lightbox");
const lightboxImg = document.getElementById("lightbox-img");

document.querySelectorAll(".gallery-card img").forEach(img => {
	img.onclick = () => {
		lightbox.classList.add("active");
		lightboxImg.src = img.src;
	};
});

const closeLightboxBtn = document.querySelector(".close-lightbox");
const closeLightbox = () => lightbox.classList.remove("active");

closeLightboxBtn.onclick = closeLightbox;
makeKeyboardClickable(closeLightboxBtn, closeLightbox);

lightbox.onclick = e => {
	if (e.target === lightbox) {
		closeLightbox();
	}
};

/* ================= МОДАЛЬНОЕ ОКНО ПОКУПКИ ================= */
/*
   Обёрнуто проверкой на случай, если разметка модалки почему-то отсутствует
   в HTML (например, при рассинхроне версий файлов) — тогда просто пропускаем
   инициализацию, вместо того чтобы ронять ошибкой весь остальной скрипт.
*/

const buyModal = document.getElementById("buyModal");
const buyButtons = document.querySelectorAll(".btn-buy");
const closeModal = document.querySelector(".close-modal");
const orderFormEl = document.getElementById("orderForm");
const submitButtonEl = document.getElementById("submitOrder");
const successModal = document.getElementById("successModal");
const closeSuccessBtn = document.getElementById("closeSuccess");
const orderNumberEl = document.getElementById("orderNumber");

/* ---- Toast-уведомления ---- */
/* Вынесено на верхний уровень: это общий утилитарный компонент, не
   привязанный к модалке покупки, им сможет пользоваться и остальной сайт. */

const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");
const toastIcon = document.getElementById("toastIcon");
let toastTimer = null;

function showToast(message, type = "success") {
	if (!toast || !toastText || !toastIcon) {
		alert(message);
		return;
	}

	toastText.textContent = message;
	toast.className = "toast show " + type;
	toastIcon.textContent = type === "success" ? "✅" : "❌";

	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => {
		toast.classList.remove("show");
	}, 3500);
}

// Общая маска телефона — используется и в форме заказа, и в чат-боте.
// Объявлена на верхнем уровне (не внутри if-блока ниже), чтобы гарантированно
// быть доступной из чат-бота независимо от наличия элементов формы заказа.
function maskPhoneValue(rawValue) {
	let x = rawValue.replace(/\D/g, "");

	if (x.startsWith("380")) {
		x = x.substring(3);
	}

	x = x.substring(0, 9);

	let result = "+380";

	if (x.length > 0) result += " (" + x.substring(0, 2);
	if (x.length >= 2) result += ")";
	if (x.length > 2) result += " " + x.substring(2, 5);
	if (x.length > 5) result += "-" + x.substring(5, 7);
	if (x.length > 7) result += "-" + x.substring(7, 9);

	return result;
}

if (buyModal && closeModal && orderFormEl && submitButtonEl) {

const qtyInput = document.getElementById("qty");
const minusQty = document.getElementById("minusQty");
const plusQty = document.getElementById("plusQty");

const nameInput = document.getElementById("name");
const surnameInput = document.getElementById("surname");
const emailInput = document.getElementById("email");
const deliveryInput = document.getElementById("delivery");
const paymentInput = document.getElementById("payment");
const addressInput = document.getElementById("address");
const commentInput = document.getElementById("comment");

const phoneInput = document.getElementById("phone");

if (phoneInput) {
	phoneInput.addEventListener("input", function () {
		this.value = maskPhoneValue(this.value);
	});
}

const phoneRegex = /^\+380 \(\d{2}\) \d{3}-\d{2}-\d{2}$/;

let productPrice = 999;
let currentProduct = null;
const totalPrice = document.getElementById("totalPrice");

// Скидка за количество теперь настраивается прямо в админке двумя полями:
// "порог, шт." и "процент скидки" — вместо фиксированной таблицы тарифов.
function getBulkDiscount(qty) {
	if (!currentProduct || !currentProduct.bulk_discount_enabled) return 0;

	const threshold = Number(currentProduct.bulk_discount_threshold) || 0;
	const percent = Number(currentProduct.bulk_discount_percent) || 0;

	if (threshold > 0 && percent > 0 && qty >= threshold) {
		return percent;
	}

	return 0;
}

let discountCountdownTimer = null;

function stopDiscountCountdown() {
	clearInterval(discountCountdownTimer);
	discountCountdownTimer = null;
}

function startDiscountCountdown(endDate) {
	const timerEl = document.getElementById("discountTimer");
	if (!timerEl) return;

	const tick = () => {
		const diffMs = endDate.getTime() - Date.now();

		if (diffMs <= 0) {
			stopDiscountCountdown();
			timerEl.hidden = true;
			// Срок истёк, пока модалка была открыта — перезагружаем товар,
			// чтобы акция сразу пропала без обновления страницы
			loadProduct();
			return;
		}

		const totalSeconds = Math.floor(diffMs / 1000);
		const days = Math.floor(totalSeconds / 86400);
		const hours = Math.floor((totalSeconds % 86400) / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		const pad = n => String(n).padStart(2, "0");
		const parts = days > 0
			? `${days} дн. ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
			: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

		timerEl.textContent = `⏳ Акция закончится через: ${parts}`;
		timerEl.hidden = false;
	};

	tick();
	discountCountdownTimer = setInterval(tick, 1000);
}

function recalcTotal() {
	// Не перезаписывает qtyInput.value — вызывается при каждом нажатии
	// клавиши, перезапись поля здесь мешала бы вручную вводить число
	const qty = Math.max(1, parseInt(qtyInput.value) || 1);

	const discountLineEl = document.getElementById("discountLine");
	const percent = getBulkDiscount(qty);
	const unitPrice = percent > 0 ? productPrice * (1 - percent / 100) : productPrice;

	if (discountLineEl) {
		if (percent > 0) {
			discountLineEl.textContent = `🎉 Скидка ${percent}% при заказе от ${currentProduct.bulk_discount_threshold} шт.`;
			discountLineEl.hidden = false;
		} else {
			discountLineEl.hidden = true;
		}
	}

	const total = Math.round(qty * unitPrice);
	totalPrice.textContent = total + " грн";
}

function updatePrice() {
	// Полная версия с "подчисткой" поля — ограничивает диапазон 1..остаток.
	// Вызывается на blur, по кнопкам +/-, и при открытии/обновлении модалки,
	// НЕ при каждом нажатии клавиши (иначе нельзя стереть и ввести число).
	let qty = Math.max(1, parseInt(qtyInput.value) || 1);

	if (currentProduct && currentProduct.stock !== null && currentProduct.stock !== undefined) {
		qty = Math.min(qty, Math.max(1, currentProduct.stock));
	}

	qtyInput.value = qty;
	recalcTotal();
}

function applyProductToPage() {
	if (!currentProduct) return;

	productPrice = Number(currentProduct.price) || 0;

	const nameEl = document.getElementById("productName");
	const imgEl = document.getElementById("productImage");
	const priceEl = document.getElementById("productPrice");
	const oldPriceEl = document.getElementById("productOldPrice");
	const saleTextEl = document.getElementById("productSaleText");
	const stockEl = document.getElementById("productStock");
	const outOfStockEl = document.getElementById("outOfStockNotice");

	if (nameEl) nameEl.textContent = currentProduct.name || "SparkWatch";
	if (imgEl && currentProduct.image) imgEl.src = currentProduct.image;
	if (priceEl) priceEl.textContent = productPrice;

	// "Разовая" акция (старая цена + рекламный текст) показывается только
	// если явно включена галочкой discount_enabled в админке,
	// и (если задан срок) он ещё не истёк — считается автоматическое отключение
	const discountEndsAt = currentProduct.discount_ends_at ? new Date(currentProduct.discount_ends_at) : null;
	const discountExpired = discountEndsAt && discountEndsAt.getTime() <= Date.now();
	const promoActive = currentProduct.discount_enabled === true && !discountExpired;
	const oldPrice = Number(currentProduct.old_price) || 0;

	if (oldPriceEl) {
		if (promoActive && oldPrice > productPrice) {
			oldPriceEl.textContent = `${oldPrice} грн`;
			oldPriceEl.hidden = false;
		} else {
			oldPriceEl.hidden = true;
		}
	}

	stopDiscountCountdown();
	const timerEl = document.getElementById("discountTimer");
	if (promoActive && discountEndsAt && !discountExpired) {
		startDiscountCountdown(discountEndsAt);
	} else if (timerEl) {
		timerEl.hidden = true;
	}

	const inStock = currentProduct.in_stock !== false;

	if (saleTextEl) {
		if (promoActive && currentProduct.sale_text && inStock) {
			saleTextEl.textContent = currentProduct.sale_text;
			saleTextEl.hidden = false;
		} else {
			saleTextEl.hidden = true;
		}
	}

	if (stockEl) {
		if (inStock && currentProduct.stock !== null && currentProduct.stock !== undefined) {
			stockEl.textContent = `В наличии: ${currentProduct.stock} шт.`;
			stockEl.hidden = false;
		} else {
			stockEl.hidden = true;
		}
	}

	if (outOfStockEl) outOfStockEl.hidden = inStock;
	if (submitButton) submitButton.disabled = !inStock;
	if (minusQty) minusQty.disabled = !inStock;
	if (plusQty) plusQty.disabled = !inStock;
	if (qtyInput) qtyInput.disabled = !inStock;

	updatePrice();
}

async function loadProduct() {
	try {
		const { data, error } = await supabaseClient
			.from("products")
			.select("*")
			.order("id", { ascending: true })
			.limit(1)
			.maybeSingle();

		if (error) throw error;
		if (data) currentProduct = data;

	} catch (err) {
		console.error("Failed to load product:", err);
		// currentProduct остаётся null — модалка покажет значения из вёрстки по умолчанию
	}

	applyProductToPage();
}

loadProduct();

// Мгновенная реакция на изменения товара в админке (например, если продавец
// выключит "В наличии" прямо во время оформления заказа у покупателя) —
// без Realtime это применилось бы только при следующей загрузке страницы.
supabaseClient
	.channel("products-changes")
	.on(
		"postgres_changes",
		{ event: "UPDATE", schema: "public", table: "products" },
		payload => {
			currentProduct = payload.new;
			applyProductToPage();
		}
	)
	.subscribe();

function openBuyModal(e) {
	e.preventDefault();
	buyModal.classList.add("active");
	document.body.style.overflow = "hidden";
	applyProductToPage();
}

function closeBuyModal() {
	buyModal.classList.remove("active");
	document.body.style.overflow = "";
}

buyButtons.forEach(btn => {
	btn.addEventListener("click", openBuyModal);
});

closeModal.addEventListener("click", closeBuyModal);
makeKeyboardClickable(closeModal, closeBuyModal);

buyModal.addEventListener("click", e => {
	if (e.target === buyModal) {
		closeBuyModal();
	}
});

plusQty.addEventListener("click", () => {
	qtyInput.value = Number(qtyInput.value) + 1;
	updatePrice();
});

minusQty.addEventListener("click", () => {
	if (Number(qtyInput.value) > 1) {
		qtyInput.value = Number(qtyInput.value) - 1;
		updatePrice();
	}
});

qtyInput.addEventListener("input", recalcTotal);
qtyInput.addEventListener("blur", updatePrice);

const submitButton = submitButtonEl;
const buttonText = submitButton.querySelector(".btn-text");
const buttonLoader = submitButton.querySelector(".btn-loader");

function startSending() {
	submitButton.disabled = true;
	buttonText.hidden = true;
	buttonLoader.hidden = false;
}

function stopSending() {
	submitButton.disabled = false;
	buttonText.hidden = false;
	buttonLoader.hidden = true;
}

/* ---- Окно подтверждения заказа ---- */

function generateOrderNumber() {
	const now = new Date();

	const date =
		now.getFullYear().toString() +
		String(now.getMonth() + 1).padStart(2, "0") +
		String(now.getDate()).padStart(2, "0");

	const random = Math.floor(Math.random() * 9000) + 1000;

	return `SW-${date}-${random}`;
}

function showSuccessModal(number) {
	// Если разметки окна почему-то нет — не теряем подтверждение, а откатываемся на toast
	if (!successModal || !orderNumberEl) {
		showToast(`Заказ успешно оформлен! Номер: ${number}`);
		return;
	}
	orderNumberEl.textContent = number;
	successModal.classList.add("active");
	document.body.style.overflow = "hidden";
}

function closeSuccessModal() {
	if (!successModal) return;
	successModal.classList.remove("active");
	document.body.style.overflow = "";
}

if (successModal && closeSuccessBtn) {
	closeSuccessBtn.addEventListener("click", closeSuccessModal);

	successModal.addEventListener("click", e => {
		if (e.target === successModal) {
			closeSuccessModal();
		}
	});
}

orderFormEl.addEventListener("submit", async function (e) {
	e.preventDefault();

	updatePrice(); // подчищаем количество на случай, если blur не успел сработать

	startSending();

	if (phoneInput && !phoneRegex.test(phoneInput.value)) {
		showToast("Введите корректный номер телефона.", "error");
		stopSending();
		phoneInput.focus();
		return;
	}

	if (currentProduct && currentProduct.in_stock === false) {
		showToast("Товар закончился, оформление недоступно.", "error");
		stopSending();
		return;
	}

	if (currentProduct && currentProduct.stock !== null && currentProduct.stock !== undefined) {
		const requestedQty = Number(qtyInput.value) || 1;
		if (requestedQty > currentProduct.stock) {
			showToast(`В наличии только ${currentProduct.stock} шт. Уменьшите количество.`, "error");
			stopSending();
			qtyInput.value = currentProduct.stock;
			updatePrice();
			return;
		}
	}

	try {
		const requestedQty = Number(qtyInput.value) || 1;

		// Атомарная резервация остатка ДО создания заказа — блокирует строку
		// товара в базе на время проверки+списания, поэтому даже если два
		// покупателя одновременно жмут "Оформить", второй гарантированно
		// увидит уже уменьшённый остаток, а не то же самое число, что первый.
		const { data: reserved, error: reserveError } = await supabaseClient
			.rpc("reserve_stock", { purchase_qty: requestedQty });

		if (reserveError) throw reserveError;

		if (reserved === false) {
			stopSending();
			showToast("Извините, товара уже не осталось в нужном количестве. Уменьшите количество и попробуйте снова.", "error");
			await loadProduct();
			return;
		}

		const number = generateOrderNumber();

		const fullName = [
			nameInput.value.trim(),
			surnameInput ? surnameInput.value.trim() : ""
		].filter(Boolean).join(" ");

		const { error } = await supabaseClient
			.from("orders")
			.insert([
				{
					order_number: number,
					name: fullName,
					phone: phoneInput.value.trim(),
					email: emailInput ? emailInput.value.trim() : "",
					delivery: deliveryInput ? deliveryInput.value : "",
					address: addressInput.value.trim(),
					payment: paymentInput ? paymentInput.value : "",
					quantity: Number(qtyInput.value),
					total: Number(totalPrice.textContent.replace(/[^\d]/g, "")),
					comment: commentInput.value.trim()
				}
			]);

		if (error) {
			// Заказ не создался, а остаток уже зарезервирован/списан — возвращаем его
			try {
				await supabaseClient.rpc("release_stock", { purchase_qty: requestedQty });
			} catch (releaseError) {
				console.error("Stock release failed:", releaseError);
			}
			throw error;
		}

		// Подтягиваем свежие данные о товаре — на случай, если модалку
		// откроют повторно в этой же сессии без перезагрузки страницы
		loadProduct();

		// Уведомление в Telegram — в отдельном try/catch: если оно упадёт
		// (например, Edge Function недоступна), заказ всё равно должен
		// считаться успешным, ведь запись в Supabase уже прошла.
		try {
			await supabaseClient.functions.invoke("telegram-notify", {
				body: {
					orderNumber: number,
					customerName: fullName,
					phone: phoneInput.value.trim(),
					email: emailInput ? emailInput.value.trim() : "",
					product: "Spark Watch",
					quantity: Number(qtyInput.value),
					total: Number(totalPrice.textContent.replace(/[^\d]/g, "")),
					delivery: deliveryInput ? deliveryInput.value : "",
					address: addressInput.value.trim(),
					payment: paymentInput ? paymentInput.value : "",
					comment: commentInput.value.trim()
				}
			});
		} catch (notifyError) {
			console.error("Telegram notify failed:", notifyError);
		}

		stopSending();

		closeBuyModal();
		this.reset();

		qtyInput.value = 1;
		updatePrice();

		showSuccessModal(number);
	} catch (error) {
		console.error(error);

		stopSending();

		showToast(
			"Не удалось отправить заказ. Попробуйте ещё раз.",
			"error"
		);
	}
});

} // конец блока if (buyModal && closeModal && orderFormEl && submitButtonEl)

document.addEventListener("keydown", e => {
	if (e.key === "Escape") {
		closeLightbox();
		if (buyModal) buyModal.classList.remove("active");
		if (successModal) successModal.classList.remove("active");
		document.body.style.overflow = "";
		closeMenu();
	}
});

/* ================= AUTO REVIEWS SLIDER ================= */

const slider = document.querySelector(".review-slider");
const prevArrow = document.querySelector(".slider-arrow.prev");
const nextArrow = document.querySelector(".slider-arrow.next");
let position = 0;
let sliderTimer = null;

const getStep = () => {
	const card = slider.querySelector(".review");
	return card ? card.getBoundingClientRect().width + 30 : 370; // 30px = gap из CSS, fallback на фиксированный шаг
};

const scrollNext = () => {
	const maxScroll = slider.scrollWidth - slider.clientWidth;
	const step = getStep();

	position = slider.scrollLeft + step;
	if (maxScroll <= 0 || position >= maxScroll) {
		position = 0;
	}

	slider.scrollTo({ left: position, behavior: "smooth" });
};

const scrollPrev = () => {
	const step = getStep();

	position = slider.scrollLeft - step;
	if (position < 0) {
		const maxScroll = slider.scrollWidth - slider.clientWidth;
		position = Math.max(0, maxScroll);
	}

	slider.scrollTo({ left: position, behavior: "smooth" });
};

const startSlider = () => {
	sliderTimer = setInterval(scrollNext, 4000);
};

const stopSlider = () => {
	clearInterval(sliderTimer);
};

// Ручная прокрутка сбрасывает таймер, чтобы авто-прокрутка
// не "дёргала" слайдер сразу следом за кликом пользователя
const restartSlider = () => {
	stopSlider();
	startSlider();
};

if (slider) {
	startSlider();
	// Pause auto-scroll while the user is interacting with the slider
	slider.addEventListener("mouseenter", stopSlider);
	slider.addEventListener("mouseleave", startSlider);
	// То же самое для тач-устройств, где mouseenter/mouseleave не срабатывают
	slider.addEventListener("touchstart", stopSlider, { passive: true });
	slider.addEventListener("touchend", startSlider, { passive: true });
}

if (prevArrow) {
	prevArrow.addEventListener("click", () => {
		scrollPrev();
		restartSlider();
	});
}

if (nextArrow) {
	nextArrow.addEventListener("click", () => {
		scrollNext();
		restartSlider();
	});
}

/* ================= ОДОБРЕННЫЕ ОТЗЫВЫ ИЗ SUPABASE ================= */
/*
   Секция отзывов раньше была полностью статичной вёрсткой. Здесь
   подгружаем реальные отзывы (approved = true) и добавляем их карточками
   в начало слайдера, рядом с демонстрационными.
*/

async function loadApprovedReviews() {

	try {
		const { data, error } = await supabaseClient
			.from("reviews")
			.select("*")
			.eq("approved", true)
			.order("created_at", { ascending: false });

		if (error) throw error;

		updateAverageRating(data);

		if (!slider) return;

		data.forEach(review => {
			const stars = Math.max(0, Math.min(5, Number(review.rating) || 0));

			const card = document.createElement("div");
			card.className = "review";

			const starsEl = document.createElement("div");
			starsEl.textContent = "★".repeat(stars) + "☆".repeat(5 - stars);

			const textEl = document.createElement("p");
			textEl.textContent = review.review;

			const nameEl = document.createElement("h4");
			nameEl.textContent = review.name;

			const dateEl = document.createElement("span");
			dateEl.className = "review-date";
			if (review.created_at) {
				dateEl.textContent = new Date(review.created_at).toLocaleDateString("ru-RU", {
					day: "numeric",
					month: "long",
					year: "numeric"
				});
			}

			card.append(starsEl, textEl, nameEl, dateEl);
			card.classList.add("show"); // добавлена уже после инициализации
			                             // scroll-reveal — observer её не увидит,
			                             // поэтому показываем сразу
			slider.prepend(card);
		});

	} catch (err) {
		console.error("Failed to load approved reviews:", err);
	}
}

function updateAverageRating(approvedReviews) {

	const starsEl = document.getElementById("avgRatingStars");
	const labelEl = document.getElementById("avgRatingLabel");
	const valueEl = document.getElementById("avgRatingValue");

	if (!valueEl) return;

	const count = approvedReviews.length;

	if (count === 0) {
		// Нет ни одного одобренного отзыва — оставляем заглушку "5.0/5"
		// из статичной вёрстки, просто уточняем подпись
		if (labelEl) labelEl.textContent = "Пока нет отзывов";
		return;
	}

	const sum = approvedReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
	const average = sum / count;

	const roundedForStars = Math.round(average);
	const fullStars = Math.max(0, Math.min(5, roundedForStars));

	if (starsEl) {
		starsEl.textContent = "★".repeat(fullStars) + "☆".repeat(5 - fullStars);
	}

	// Собираем "4.8/5" отдельным span'ом рядом со звёздами
	const numberEl = document.getElementById("avgRatingNumber");
	if (numberEl) {
		numberEl.textContent = `${average.toFixed(1)}/5`;
	}

	if (labelEl) {
		const reviewWord = count === 1 ? "отзыва" : "отзывов";
		labelEl.textContent = `На основе ${count} ${reviewWord}`;
	}

}

loadApprovedReviews();

/* ================= REVIEW FORM ================= */

const reviewForm = document.querySelector(".review-form");

if (reviewForm) {
	reviewForm.addEventListener("submit", async e => {
		e.preventDefault();

		const nameInput = reviewForm.querySelector('input[type="text"]');
		const emailInput = reviewForm.querySelector('input[type="email"]');
		const ratingSelect = reviewForm.querySelector("select");
		const textArea = reviewForm.querySelector("textarea");
		const submitBtn = reviewForm.querySelector("button");

		const name = nameInput.value.trim();
		const email = emailInput.value.trim();
		const rating = Number(ratingSelect.value);
		const text = textArea.value.trim();

		if (!name || !email || !text) {
			showToast("Пожалуйста, заполните все поля перед отправкой.", "error");
			return;
		}

		if (!rating) {
			showToast("Пожалуйста, выберите оценку.", "error");
			return;
		}

		const originalLabel = submitBtn.textContent;
		submitBtn.disabled = true;
		submitBtn.textContent = "Отправка...";

		try {
			const { error } = await supabaseClient
				.from("reviews")
				.insert([
					{
						name,
						email,
						rating,
						review: text
					}
				]);

			if (error) throw error;

			showToast(
				"Спасибо! Ваш отзыв отправлен и появится после проверки.",
				"success"
			);

			reviewForm.reset();

		} catch (err) {
			console.error("Review submission failed:", err);
			showToast("Не удалось отправить отзыв. Попробуйте позже.", "error");

		} finally {
			submitBtn.disabled = false;
			submitBtn.textContent = originalLabel;
		}
	});
}

/* ================= LAZY VIDEO (YouTube facade) ================= */
/*
   Avoids loading the YouTube iframe (and the third-party JS it pulls in)
   until the user actually wants to watch the video — better Performance.
*/

const videoBox = document.getElementById("videoBox");

if (videoBox) {
	videoBox.addEventListener("click", () => {
		const videoId = videoBox.dataset.videoId;
		const iframe = document.createElement("iframe");
		iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
		iframe.title = "SparkWatch";
		iframe.allow = "autoplay; encrypted-media";
		iframe.allowFullscreen = true;
		videoBox.innerHTML = "";
		videoBox.appendChild(iframe);
	}, { once: true });
}

/* ================= COOKIES ================= */

if (localStorage.getItem("cookie") == "ok") {
	document.getElementById("cookie").style.display = "none";
}

document.getElementById("cookieBtn").onclick = () => {
	localStorage.setItem("cookie", "ok");
	document.getElementById("cookie").style.display = "none";
};

/* ================= СЧЁТЧИК ПОСЕЩЕНИЙ ================= */
/*
   Пишет одну запись в Supabase при каждой загрузке главной страницы.
   Ошибка не должна ничего ломать на сайте, поэтому не бросаем исключение
   дальше и просто логируем в консоль.
*/

if (typeof supabaseClient !== "undefined") {
	supabaseClient
		.from("visits")
		.insert([{ page: window.location.pathname }])
		.then(({ error }) => {
			if (error) console.error("Visit log failed:", error);
		});
}

/* ================= РЕЖИМ ТЕХНИЧЕСКИХ РАБОТ ================= */
/*
   Проверяется при загрузке страницы и обновляется мгновенно через Realtime,
   если админ включит/выключит режим, пока посетитель уже на сайте.
*/

function applyMaintenanceMode(settings) {
	const overlay = document.getElementById("maintenanceOverlay");
	const messageEl = document.getElementById("maintenanceMessage");
	if (!overlay || !settings) return;

	if (settings.maintenance_mode) {
		if (messageEl && settings.maintenance_message) {
			messageEl.textContent = settings.maintenance_message;
		}
		overlay.hidden = false;
		document.body.style.overflow = "hidden";
	} else {
		overlay.hidden = true;
		document.body.style.overflow = "";
	}
}

if (typeof supabaseClient !== "undefined") {

	supabaseClient
		.from("site_settings")
		.select("*")
		.order("id", { ascending: true })
		.limit(1)
		.maybeSingle()
		.then(({ data, error }) => {
			if (error) {
				console.error("Failed to load site settings:", error);
				return;
			}
			applyMaintenanceMode(data);
		});

	supabaseClient
		.channel("site-settings-changes")
		.on(
			"postgres_changes",
			{ event: "UPDATE", schema: "public", table: "site_settings" },
			payload => applyMaintenanceMode(payload.new)
		)
		.subscribe();

}

/* ================= ЧАТ-ПОМОЩНИК ================= */
/*
   Бот на кнопках (без ИИ) — полностью предсказуемый, не может ответить
   что-то неверное. База знаний FAQ берётся прямо из секции #faq на странице,
   чтобы не дублировать контент и не давать ему разъезжаться с реальным FAQ.
   Остальные тексты — в js/chat-knowledge.js (CHAT_KNOWLEDGE).
   Отдельный сценарий — проверка статуса заказа по номеру + телефону через
   защищённую RPC-функцию (не даёт просто перебирать чужие заказы).
*/

(function () {

	const toggleBtn = document.getElementById("chatToggleBtn");
	const panel = document.getElementById("chatPanel");
	const closeBtn = document.getElementById("chatCloseBtn");
	const body = document.getElementById("chatBody");
	const quickRepliesEl = document.getElementById("chatQuickReplies");
	const inputForm = document.getElementById("chatInputForm");
	const input = document.getElementById("chatInput");

	if (!toggleBtn || !panel || typeof CHAT_KNOWLEDGE === "undefined") return;

	let state = "menu";
	let pendingOrderNumber = "";
	let opened = false;

	function buildFaqKnowledgeBase() {
		return Array.from(document.querySelectorAll(".faq-item")).map(item => {
			const questionEl = item.querySelector(".faq-question");
			const answerEl = item.querySelector(".faq-answer");
			const question = questionEl
				? questionEl.textContent.replace("+", "").trim()
				: "";
			const answer = answerEl ? answerEl.textContent.trim() : "";
			return { question, answer };
		}).filter(item => item.question && item.answer);
	}

	const faqBase = buildFaqKnowledgeBase();

	function addMessage(text, sender) {
		const msg = document.createElement("div");
		msg.className = `chat-msg ${sender}`;
		msg.textContent = text;
		body.appendChild(msg);
		body.scrollTop = body.scrollHeight;
	}

	function addLinkMessage(text, url, linkLabel) {
		const msg = document.createElement("div");
		msg.className = "chat-msg bot";
		msg.textContent = text + "\n";

		const link = document.createElement("a");
		link.href = url;
		link.target = "_blank";
		link.rel = "noopener";
		link.className = "chat-link-btn";
		link.textContent = linkLabel;

		msg.appendChild(link);
		body.appendChild(msg);
		body.scrollTop = body.scrollHeight;
	}

	function setQuickReplies(options) {
		quickRepliesEl.innerHTML = "";
		options.forEach(({ label, action }) => {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.textContent = label;
			btn.addEventListener("click", action);
			quickRepliesEl.appendChild(btn);
		});
	}

	function showInput(placeholder, mode) {
		inputForm.hidden = false;
		input.placeholder = placeholder;
		input.value = "";
		input.dataset.mode = mode || "";
		input.focus();
	}

	function hideInput() {
		inputForm.hidden = true;
		input.dataset.mode = "";
	}

	// Маска телефона — только пока реально спрашиваем телефон
	input.addEventListener("input", function () {
		if (this.dataset.mode === "phone") {
			this.value = maskPhoneValue(this.value);
		}
	});

	function goToMenu() {
		state = "menu";
		hideInput();
		stopPolling();
		setQuickReplies(CHAT_KNOWLEDGE.menu.map(item => ({
			label: item.label,
			action: {
				faq: showFaqList,
				track: startOrderTracking,
				seller: startSellerContact
			}[item.action]
		})));
	}

	function backToMenuOption(label) {
		return {
			label: label || "🏠 В меню",
			action: () => { addMessage(label || "В меню", "user"); goToMenu(); }
		};
	}

	function showFaqList() {
		state = "faq_list";
		hideInput();
		addMessage("Выберите вопрос:", "bot");

		const options = faqBase.map(item => ({
			label: item.question,
			action: () => {
				addMessage(item.question, "user");
				addMessage(item.answer, "bot");
				setQuickReplies([
					{ label: "⬅️ Ещё вопросы", action: showFaqList },
					backToMenuOption()
				]);
			}
		}));

		options.push(backToMenuOption());
		setQuickReplies(options);
	}

	function startOrderTracking() {
		addMessage("📦 Статус заказа", "user");
		state = "awaiting_order_number";
		pendingOrderNumber = "";
		setQuickReplies([ backToMenuOption("🏠 Отмена, в меню") ]);
		addMessage(CHAT_KNOWLEDGE.orderNumberPrompt, "bot");
		showInput("Например, SW-20260721-1234", "order");
	}

	async function lookupOrder(orderNumber, phone) {
		try {
			// Регистронезависимо — покупатель мог ввести номер строчными буквами
			const { data, error } = await supabaseClient.rpc("get_order_status", {
				p_order_number: orderNumber.trim().toUpperCase(),
				p_phone: phone.trim()
			});

			if (error) throw error;

			if (!data || data.length === 0) {
				addMessage(CHAT_KNOWLEDGE.orderNotFound, "bot");
				goToMenu();
				return;
			}

			const order = Array.isArray(data) ? data[0] : data;
			addMessage(formatOrderStatus(order), "bot");
			goToMenu();

		} catch (err) {
			console.error("Order lookup failed:", err);
			addMessage(CHAT_KNOWLEDGE.orderLookupError, "bot");
			goToMenu();
		}
	}

	function formatOrderStatus(order) {
		let line = CHAT_KNOWLEDGE.statusMessages[order.status]
			|| `Текущий статус: ${order.status || "неизвестен"}`;

		if (order.status === "Отправлен") {
			line += order.tracking_number
				? `\nНомер ТТН: ${order.tracking_number}`
				: "\nНомер ТТН пока не указан — уточните у поддержки.";
		}

		return `Заказ ${order.order_number}\n${line}`;
	}

	function showContacts() {
		addMessage("📞 Связаться с человеком", "user");
		addLinkMessage(
			CHAT_KNOWLEDGE.telegramPromptText,
			`https://t.me/${CHAT_KNOWLEDGE.telegramUsername}`,
			"Открыть Telegram ↗"
		);
		goToMenu();
	}

	/* ---- Живой чат с продавцом ---- */

	let conversationId = null;
	let clientToken = null;
	let pendingCustomerName = "";
	let pollTimer = null;
	const knownMessageIds = new Set();

	function startSellerContact() {
		addMessage("👨‍💼 Связаться с продавцом", "user");

		// Разговор в этой сессии уже начат — просто возвращаемся к нему
		if (conversationId && clientToken) {
			enterLiveChat(false);
			return;
		}

		state = "awaiting_seller_name";
		setQuickReplies([ backToMenuOption("🏠 Отмена, в меню") ]);
		addMessage(CHAT_KNOWLEDGE.sellerNamePrompt, "bot");
		showInput("Ваше имя", "text");
	}

	async function createConversationAndEnter(name, phone) {
		addMessage(CHAT_KNOWLEDGE.sellerConnecting, "bot");

		try {
			const { data, error } = await supabaseClient.rpc("start_conversation", {
				p_name: name,
				p_phone: phone,
				p_order_number: pendingOrderNumber || null
			});

			if (error) throw error;

			const row = Array.isArray(data) ? data[0] : data;
			conversationId = row.conversation_id;
			clientToken = row.client_token;

			enterLiveChat(true);

		} catch (err) {
			console.error("Failed to start conversation:", err);
			addMessage(CHAT_KNOWLEDGE.sellerConnectError, "bot");
			goToMenu();
		}
	}

	function enterLiveChat(isNew) {
		state = "live_chat";
		if (isNew) addMessage(CHAT_KNOWLEDGE.sellerReady, "bot");
		setQuickReplies([
			{ label: "🏠 Закрыть диалог", action: () => { stopPolling(); goToMenu(); } }
		]);
		showInput(CHAT_KNOWLEDGE.sellerInputPlaceholder, "chat");
		startPolling();
	}

	async function sendCustomerMessage(text) {
		try {
			const { data, error } = await supabaseClient.rpc("send_customer_message", {
				p_conversation_id: conversationId,
				p_client_token: clientToken,
				p_message: text
			});

			if (error || data === false) throw error || new Error("rejected");

		} catch (err) {
			console.error("Send failed:", err);
			addMessage(CHAT_KNOWLEDGE.sellerSendError, "bot");
		}
	}

	function startPolling() {
		stopPolling();
		fetchNewMessages();
		pollTimer = setInterval(fetchNewMessages, 3000);
	}

	function stopPolling() {
		clearInterval(pollTimer);
		pollTimer = null;
	}

	async function fetchNewMessages() {
		if (!conversationId || !clientToken) return;

		try {
			const { data, error } = await supabaseClient.rpc("get_conversation_messages", {
				p_conversation_id: conversationId,
				p_client_token: clientToken
			});

			if (error) throw error;

			(data || []).forEach(m => {
				if (knownMessageIds.has(m.id)) return;
				knownMessageIds.add(m.id);
				if (m.sender === "customer") return; // уже показано локально при отправке
				// Для покупателя ответ оператора выглядит как ответ "бота" —
				// единая переписка, как и просили
				addMessage(m.message, "bot");
			});

		} catch (err) {
			console.error("Polling failed:", err);
		}
	}

	inputForm.addEventListener("submit", e => {
		e.preventDefault();
		const value = input.value.trim();
		if (!value) return;

		if (state === "awaiting_order_number") {
			pendingOrderNumber = value;
			addMessage(value, "user");
			state = "awaiting_phone";
			addMessage(CHAT_KNOWLEDGE.phonePrompt, "bot");
			showInput("+380 (99) 123-45-67", "phone");
			return;
		}

		if (state === "awaiting_phone") {
			addMessage(value, "user");
			hideInput();
			addMessage("Проверяю…", "bot");
			lookupOrder(pendingOrderNumber, value);
			return;
		}

		if (state === "awaiting_seller_name") {
			pendingCustomerName = value;
			addMessage(value, "user");
			state = "awaiting_seller_phone";
			addMessage(CHAT_KNOWLEDGE.sellerPhonePrompt, "bot");
			showInput("+380 (99) 123-45-67", "phone");
			return;
		}

		if (state === "awaiting_seller_phone") {
			addMessage(value, "user");
			hideInput();
			createConversationAndEnter(pendingCustomerName, value);
			return;
		}

		if (state === "live_chat") {
			addMessage(value, "user");
			input.value = "";
			input.focus();
			sendCustomerMessage(value);
			return;
		}
	});

	toggleBtn.addEventListener("click", () => {
		panel.hidden = !panel.hidden;
		if (!panel.hidden && !opened) {
			opened = true;
			addMessage(CHAT_KNOWLEDGE.greeting, "bot");
			goToMenu();
		}
	});

	closeBtn.addEventListener("click", () => {
		panel.hidden = true;
	});

})();
