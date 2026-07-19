// js/app.js

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

const buyModal = document.getElementById("buyModal");
const buyButtons = document.querySelectorAll(".btn-buy");
const closeModal = document.querySelector(".close-modal");

const qtyInput = document.getElementById("qty");
const minusQty = document.getElementById("minusQty");
const plusQty = document.getElementById("plusQty");

const productPrice = 999;
const totalPrice = document.getElementById("totalPrice");

function updatePrice() {
	const qty = Math.max(1, parseInt(qtyInput.value) || 1);
	qtyInput.value = qty;
	totalPrice.textContent = (qty * productPrice) + " грн";
}

function openBuyModal(e) {
	e.preventDefault();
	buyModal.classList.add("active");
	document.body.style.overflow = "hidden";
	updatePrice();
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

qtyInput.addEventListener("input", updatePrice);

document.getElementById("orderForm").addEventListener("submit", function (e) {
	e.preventDefault();

	alert("✅ Спасибо!\n\nВаш заказ принят.\nМы свяжемся с вами в ближайшее время.");

	closeBuyModal();
	this.reset();

	qtyInput.value = 1;
	updatePrice();
});

document.addEventListener("keydown", e => {
	if (e.key === "Escape") {
		closeLightbox();
		closeBuyModal();
		closeMenu();
	}
});

/* ================= AUTO REVIEWS SLIDER ================= */

const slider = document.querySelector(".review-slider");
let position = 0;
let sliderTimer = null;

const startSlider = () => {
	sliderTimer = setInterval(() => {
		const card = slider.querySelector(".review");
		const step = card ? card.getBoundingClientRect().width + 20 : 370; // fall back to fixed step
		const maxScroll = slider.scrollWidth - slider.clientWidth;

		position += step;
		if (maxScroll <= 0 || position >= maxScroll) {
			position = 0;
		}

		slider.scrollTo({ left: position, behavior: "smooth" });
	}, 4000);
};

const stopSlider = () => {
	clearInterval(sliderTimer);
};

if (slider) {
	startSlider();
	// Pause auto-scroll while the user is interacting with the slider
	slider.addEventListener("mouseenter", stopSlider);
	slider.addEventListener("mouseleave", startSlider);
}

/* ================= REVIEW FORM ================= */

const reviewForm = document.querySelector(".review-form");

// Replace with your own Formspree (or similar) endpoint — see notes below.
const REVIEW_FORM_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";

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
		const text = textArea.value.trim();

		if (!name || !email || !text) {
			alert("Пожалуйста, заполните все поля перед отправкой.");
			return;
		}

		const originalLabel = submitBtn.textContent;
		submitBtn.disabled = true;
		submitBtn.textContent = "Отправка...";

		try {
			const response = await fetch(REVIEW_FORM_ENDPOINT, {
				method: "POST",
				headers: { "Accept": "application/json" },
				body: new FormData(reviewForm)
			});

			if (!response.ok) {
				throw new Error("Request failed with status " + response.status);
			}

			alert("Спасибо! Ваш отзыв отправлен.");
			reviewForm.reset();

		} catch (err) {
			console.error("Review submission failed:", err);
			alert("Не удалось отправить отзыв. Попробуйте ещё раз чуть позже.");

		} finally {
			submitBtn.disabled = false;
			submitBtn.textContent = originalLabel;
		}
	});
}

/* ================= PRELOADER ================= */

window.addEventListener("load", () => {
	const preloader = document.getElementById("preloader");
	setTimeout(() => {
		preloader.style.opacity = "0";
		setTimeout(() => {
			preloader.style.display = "none";
		}, 500);
	}, 800);
});

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
