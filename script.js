// ===== Mobile nav toggle =====
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const navbar = document.querySelector('.navbar');


navToggle.addEventListener('click', () => {

    const isOpen = navLinks.classList.toggle('open');
    navbar.classList.toggle('menu-open', isOpen);
    navToggle.classList.toggle('active');

    document.body.classList.toggle('menu-open', isOpen);


    updateNavbarOnScroll();

    navToggle.setAttribute('aria-expanded', String(isOpen));

});

// Close menu when a nav link is clicked
navLinks.querySelectorAll('a').forEach(link => {

    link.addEventListener('click', () => {

        navLinks.classList.remove('open');
        navToggle.classList.remove('active');
        navbar.classList.remove('menu-open');   // <-- ADD THIS
        document.body.classList.remove('menu-open');

        updateNavbarOnScroll();

    });

});
// ===== Accordion (Why Choose Us) =====
document.querySelectorAll('.acc-trigger').forEach(trigger => {

    trigger.addEventListener('click', () => {

        const item = trigger.closest('.acc-item');
        const wasOpen = item.classList.contains('open');

        // Close all items
        document.querySelectorAll('.acc-item').forEach(i =>
            i.classList.remove('open')
        );

        // Open the clicked one
        if (!wasOpen) {
            item.classList.add('open');
        }

    });

});
// ===== Contact form =====
const form = document.getElementById("contactForm");
const status = document.getElementById("formStatus");

if (form) {

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        status.textContent = "Sending...";

        const formData = new FormData(form);

        try {

            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (result.success) {

                status.textContent = "Message sent successfully!";
                form.reset();

            } else {

                status.textContent = "Failed to send message.";

            }

        } catch (error) {

            status.textContent = "❌ Something went wrong. Please try again.";

        }

    });

}

// ===== Case inquiry form (services page) =====
const caseForm = document.getElementById("caseForm");
const caseFormStatus = document.getElementById("caseFormStatus");

if (caseForm) {

    caseForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        caseFormStatus.textContent = "Sending...";
        caseFormStatus.className = "scf-status";

        const formData = new FormData(caseForm);

        try {

            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (result.success) {

                caseFormStatus.textContent = "Thanks we'll be in touch within one business day.";
                caseFormStatus.className = "scf-status success";
                caseForm.reset();

            } else {

                caseFormStatus.textContent = "Failed to send message.";
                caseFormStatus.className = "scf-status error";

            }

        } catch (error) {

            caseFormStatus.textContent = "❌ Something went wrong. Please try again.";
            caseFormStatus.className = "scf-status error";

        }

    });

}

/* ===========================
   TRUSTED BY SIDEBAR
=========================== */

const categories = document.querySelectorAll(".category");
const panels = document.querySelectorAll(".panel");

categories.forEach(category => {

    category.addEventListener("click", () => {

        categories.forEach(btn =>
            btn.classList.remove("active")
        );

        panels.forEach(panel =>
            panel.classList.remove("active")
        );

        category.classList.add("active");

        const target = category.dataset.tab;

        document
            .querySelector(`.panel[data-panel="${target}"]`)
            .classList.add("active");

    });

});

/* ===========================
   STICKY NAVBAR
=========================== */
function updateNavbarOnScroll() {

    // Keep navbar dark while the mobile menu is open
    if (navLinks.classList.contains("open")) {
        navbar.classList.add("scrolled");
        return;
    }

    // Otherwise, follow the scroll position
    if (window.scrollY > 50) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }
}
window.addEventListener("scroll", updateNavbarOnScroll);
updateNavbarOnScroll();

/* ===========================
   GOOGLE REVIEWS CAROUSEL
=========================== */
(function () {

    const track = document.getElementById("reviewsTrack");
    const nextBtn = document.getElementById("reviewsNext");
    const prevBtn = document.getElementById("reviewsPrev");
    const dotsWrap = document.getElementById("reviewsDots");

    if (!track || !nextBtn || !dotsWrap) return;

    const cards = Array.from(track.children);
    let cardsPerView = 4;
    let currentIndex = 0; // index of the first fully-visible card
    let maxIndex = 0;

    function getCardsPerView() {
        const w = window.innerWidth;
        if (w <= 480) return 1;
        if (w <= 900) return 2;
        return 4;
    }

    function totalPages() {
        return Math.ceil(cards.length / cardsPerView);
    }

    function buildDots() {
        dotsWrap.innerHTML = "";
        const pages = totalPages();
        for (let i = 0; i < pages; i++) {
            const dot = document.createElement("button");
            dot.setAttribute("aria-label", `Go to review page ${i + 1}`);
            dot.addEventListener("click", () => goToIndex(i * cardsPerView));
            dotsWrap.appendChild(dot);
        }
        updateDots();
    }

    function updateDots() {
        const pages = totalPages();
        const activePage = Math.min(Math.round(currentIndex / cardsPerView), pages - 1);
        Array.from(dotsWrap.children).forEach((dot, i) => {
            dot.classList.toggle("active", i === activePage);
        });
    }

    // Pop up the card sitting in the middle of the current view
    function updateCenterCard() {
        const centerOffset = Math.floor((cardsPerView - 1) / 2);
        const centerIdx = Math.min(currentIndex + centerOffset, cards.length - 1);
        cards.forEach((card, i) => {
            card.classList.toggle("r-card-center", i === centerIdx);
        });
    }

    function updateArrows() {
    // Keep arrows always enabled for infinite looping
    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = false;
}

    function goToIndex(index) {
        maxIndex = Math.max(cards.length - cardsPerView, 0);
        currentIndex = Math.max(0, Math.min(index, maxIndex));

        const cardWidth = cards[0].getBoundingClientRect().width;
        const gap = parseFloat(getComputedStyle(track).gap || 0);
        const offset = currentIndex * (cardWidth + gap);

        track.style.transform = `translateX(-${offset}px)`;

        updateDots();
        updateCenterCard();
        updateArrows();
    }

    function handleResize() {
        const newCardsPerView = getCardsPerView();
        if (newCardsPerView !== cardsPerView) {
            cardsPerView = newCardsPerView;
            currentIndex = 0;
            buildDots();
        }
        goToIndex(currentIndex);
    }

    nextBtn.addEventListener("click", () => {

    if (currentIndex >= maxIndex) {
        goToIndex(0);          // Go back to the first card
    } else {
        goToIndex(currentIndex + 1);
    }

});

if (prevBtn) {

    prevBtn.addEventListener("click", () => {

        if (currentIndex <= 0) {
            goToIndex(maxIndex);   // Go to the last card
        } else {
            goToIndex(currentIndex - 1);
        }

    });

}
    window.addEventListener("resize", handleResize);

    cardsPerView = getCardsPerView();
    buildDots();
    goToIndex(0);

    // "Read more" toggle for long review text
    cards.forEach(card => {
        const p = card.querySelector(".r-text");
        if (!p) return;

        requestAnimationFrame(() => {
            if (p.scrollHeight > p.clientHeight + 2) {
                const readMore = document.createElement("button");
                readMore.className = "r-readmore";
                readMore.textContent = "Read more";
                readMore.addEventListener("click", () => {
                    const expanded = p.classList.toggle("expanded");
                    readMore.textContent = expanded ? "Read less" : "Read more";
                    goToIndex(currentIndex); // recalc offsets if heights changed
                });
                card.appendChild(readMore);
            }
        });
    });

})();

/* ===========================
   SCROLL REVEAL
=========================== */
(function () {

    const targets = document.querySelectorAll(".reveal");
    if (!targets.length) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
        targets.forEach(el => el.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });

    targets.forEach(el => observer.observe(el));

})();

/* ===========================
   QUICKNAV SCROLLSPY
=========================== */
(function () {

    const quicknavLinks = document.querySelectorAll(".quicknav a");
    if (!quicknavLinks.length) return;

    const sections = Array.from(quicknavLinks)
        .map(link => document.querySelector(link.getAttribute("href")))
        .filter(Boolean);

    if (!sections.length || !("IntersectionObserver" in window)) return;

    const setActive = (id) => {
        quicknavLinks.forEach(link => {
            link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
        });
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setActive(entry.target.id);
            }
        });
    }, { rootMargin: "-160px 0px -60% 0px", threshold: 0 });

    sections.forEach(section => observer.observe(section));

})();

/* ===========================
   SERVICE "CONTACT NOW" BUTTONS
=========================== */
(function () {

    const contactBtns = document.querySelectorAll(".cat-contact-btn");
    const caseSelect = document.getElementById("scf-case");

    if (!contactBtns.length || !caseSelect) return;

    contactBtns.forEach(btn => {

        btn.addEventListener("click", (e) => {

            const service = btn.dataset.service;
            if (!service) return;

            // Set the dropdown to match this service
            caseSelect.value = service;
            caseSelect.dispatchEvent(new Event("change"));

            // Briefly highlight the field so it's obvious it was auto-filled
            const field = caseSelect.closest(".scf-field");
            if (field) {
                field.classList.remove("just-selected");
                // force reflow so the animation restarts if clicked again
                void field.offsetWidth;
                field.classList.add("just-selected");
                setTimeout(() => field.classList.remove("just-selected"), 1300);
            }

        });

    });

})();

/* ===========================
   TRUSTED-BY LOGO LIGHTBOX
=========================== */
(function () {

    const lightbox = document.getElementById("logoLightbox");
    const lightboxImg = document.getElementById("logoLightboxImg");
    const closeBtn = document.getElementById("logoLightboxClose");

    if (!lightbox || !lightboxImg || !closeBtn) return;

    function openLightbox(img) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || "";
        lightbox.classList.add("open");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.classList.add("lightbox-open");
    }

    function closeLightbox() {
        lightbox.classList.remove("open");
        lightbox.setAttribute("aria-hidden", "true");
        document.body.classList.remove("lightbox-open");
    }

    document.querySelectorAll(".logo-circle img").forEach(img => {
        img.addEventListener("click", () => openLightbox(img));
    });

    closeBtn.addEventListener("click", closeLightbox);

    // Click outside the image (on the dark overlay) also closes it
    lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    // Esc key closes it
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && lightbox.classList.contains("open")) {
            closeLightbox();
        }
    });

})();