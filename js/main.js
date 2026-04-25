// =============================================
// PROMISE WORKS – Shared JavaScript
// Cart uses localStorage for cross-page state
// =============================================

const WA_NUMBER = "918870855033";
const PRODUCTS = [
    {
        id: 1, name: "Bottle Flower Vase", badge: "Bestseller",
        desc: "Upcycled bottles turned into elegant flower vases, beautifully decorated with dried petals and twine.",
        price: 299, img: "images/bottle-vase.jpg"
    },
    {
        id: 2, name: "Hand Embroidered Shirt",
        desc: "Wearable art — shirts adorned with intricate hand-stitched floral or custom embroidery patterns.",
        price: 799, img: "images/embroidered-shirt.jpeg"
    },
    {
        id: 3, name: "Flower Bouquet", badge: "Fan Favourite",
        desc: "Handcrafted bouquets of fresh or dried flowers, wrapped in artisan paper with a personalised message tag.",
        price: 399, img: "images/flower.jpeg"
    },
    {
        id: 4, name: "Hand Embroidered Phone Case",
        desc: "Protect your phone in style with custom embroidered initials or florals, stitched with care.",
        price: 499, img: "images/phone-case.jpeg"
    },
    {
        id: 5, name: "Customized Hand Embroidered Kerchief",
        desc: "Soft fabric kerchiefs embroidered with names, initials, or patterns — a timeless keepsake.",
        price: 199, img: "images/kerchief.jpg"
    },
    {
        id: 6, name: "Customized Gift Hamper", badge: "Most Popular",
        desc: "Curated hampers with handmade goodies — bouquets, embroidered items, vases and more.",
        price: 999, img: "images/gift-hamper.jpeg"
    },
];




// ── Navbar ────────────────────────────────────
function initNavbar(transparent = false) {
    const nav = document.getElementById("navbar");
    if (!nav) return;
    if (!transparent) nav.classList.add("solid");
    window.addEventListener("scroll", () => {
        if (transparent) nav.classList.toggle("scrolled", scrollY > 60);
        document.getElementById("scrollTop")?.classList.toggle("visible", scrollY > 400);
    });
    // Active link
    const page = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a").forEach(a => {
        const href = a.getAttribute("href")?.split("/").pop();
        if (href === page) a.classList.add("active");
    });
}

function toggleMenu() {
    const open = document.getElementById("mobileMenu").classList.toggle("open");
    document.getElementById("hamburger").classList.toggle("active", open);
    document.body.style.overflow = open ? "hidden" : "";
}
function closeMenu() {
    document.getElementById("mobileMenu").classList.remove("open");
    document.getElementById("hamburger").classList.remove("active");
    document.body.style.overflow = "";
}

// ── Reveal Observer ───────────────────────────
function observeReveal() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(".reveal").forEach(el => obs.observe(el));
}

// ── Toast ──────────────────────────────────────
function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2800);
}

// ── Keyboard ESC ──────────────────────────────
document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeCart(); closeCheckout(); closeMenu(); }
});
