
const STORAGE_KEY = "topib_ber_items_v1";

let items = loadItems();
let activeFilter = "all";
let photoData = "";
let toastTimer;

const $ = id => document.getElementById(id);

function loadItems() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
        return [];
    }
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        updateStats();
    } catch {
        showToast("Xotira to‘ldi. Kichikroq rasm tanlang.");
    }
}

function uid() {
    return "item-" + Date.now() + "-" +
        Math.random().toString(16).slice(2, 7);
}

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[ch]));
}

function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

function openModal(id) {
    $(id).classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeModal(id) {
    $(id).classList.remove("open");
    document.body.style.overflow = "";
}

document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
});

document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", e => {
        if (e.target === backdrop) closeModal(backdrop.id);
    });
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        closeModal("itemModal");
        closeModal("detailModal");
    }
});

function updateStats() {
    $("totalCount").textContent = items.length;

    $("lentCount").textContent =
        items.filter(x => x.status === "Berdim").length;

    $("reminderCount").textContent =
        items.filter(x => x.reminder || x.due).length;
}

function iconFor(category) {
    const icons = {
        "Hujjat": "▤",
        "Elektronika": "⌁",
        "Kalit": "⚿",
        "Aksessuar": "◇",
        "Uy-ro‘zg‘or": "⌂",
        "Boshqa": "✧"
    };

    return icons[category] || "✧";
}

function formatDate(dateString) {
    if (!dateString) return "—";

    const d = new Date(dateString + "T00:00:00");

    if (Number.isNaN(d.getTime())) return dateString;

    return d.toLocaleDateString("uz-UZ", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function render() {
    const query = $("searchInput").value
        .trim().toLocaleLowerCase("uz");

    const filtered = items.filter(item => {
        const haystack = [
            item.name,
            item.category,
            item.place,
            item.note,
            item.borrower
        ].join(" ").toLocaleLowerCase("uz");

        const matchesQuery = haystack.includes(query);

        const matchesFilter =
            activeFilter === "all" ||
            (activeFilter === "joy" && item.status !== "Berdim") ||
            (activeFilter === "lent" && item.status === "Berdim") ||
            (activeFilter === "document" && item.category === "Hujjat");

        return matchesQuery && matchesFilter;
    });

    const grid = $("itemsGrid");

    if (!filtered.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⌕</div>
                <h3>${items.length ? "Hech narsa topilmadi" : "Hali xotirangiz bo‘sh"}</h3>
                <p>${items.length
                    ? "Boshqa so‘z bilan qidirib ko‘ring."
                    : "Birinchi buyumingizni saqlang."}</p>
                ${items.length ? "" :
                    '<button class="secondary-button" id="emptyAddBtn">＋ Birinchi buyumni qo‘shish</button>'}
            </div>
        `;

        $("emptyAddBtn")?.addEventListener("click", () => openItemForm());

    } else {
        grid.innerHTML = filtered.map(item => `
            <article class="item-card" data-id="${escapeHTML(item.id)}">
                <div class="item-image">
                    ${item.photo
                        ? `<img src="${item.photo}" alt="${escapeHTML(item.name)}">`
                        : iconFor(item.category)}
                </div>

                <div class="item-content">
                    <div class="item-top">
                        <h3>${escapeHTML(item.name)}</h3>
                        <span class="category-tag">${escapeHTML(item.category)}</span>
                    </div>

                    <p class="item-place">
                        ⌖ ${escapeHTML(item.status === "Berdim"
                            ? "Berilgan: " + (item.borrower || "Noma'lum")
                            : (item.place || "Joylashuv kiritilmagan"))}
                    </p>

                    <div class="item-meta">
                        <span class="status-tag ${item.status === "Berdim" ? "lent" : ""}">
                            ● ${item.status === "Berdim" ? "Berilgan" : "Menda"}
                        </span>
                        <span>${item.reminder ? "◷ " + formatDate(item.reminder) : "Saqlangan"}</span>
                    </div>
                </div>
            </article>
        `).join("");

        grid.querySelectorAll(".item-card").forEach(card => {
            card.addEventListener("click", () => {
                showDetails(card.dataset.id);
            });
        });
    }

    renderReminders();
    updateStats();
}

function renderReminders() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming = items.flatMap(item => {
        const list = [];

        if (item.reminder) {
            list.push({
                item,
                date: item.reminder,
                label: "Eslatma"
            });
        }

        if (item.due && item.status === "Berdim") {
            list.push({
                item,
                date: item.due,
                label: "Qaytarish"
            });
        }

        return list;
    })
    .filter(x => new Date(x.date + "T00:00:00") >= now)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

    $("reminderList").innerHTML = upcoming.length
        ? upcoming.map(x => `
            <div class="reminder-row">
                <div>
                    <strong>${escapeHTML(x.item.name)}</strong>
                    <small>${x.label} · ${escapeHTML(x.item.borrower || x.item.place || "")}</small>
                </div>
                <span class="reminder-date">${formatDate(x.date)}</span>
            </div>
        `).join("")
        : '<p class="muted">Hozircha yaqin eslatmalar yo‘q.</p>';
}

function updateStatusFields() {
    const lent = $("itemStatus").value === "Berdim";

    $("borrowerWrap").classList.toggle("hidden", !lent);
    $("dueWrap").classList.toggle("hidden", !lent);
}

$("itemStatus").addEventListener("change", updateStatusFields);

function openItemForm(item = null) {
    $("itemForm").reset();

    $("itemId").value = item?.id || "";
    $("modalTitle").textContent =
        item ? "Buyumni tahrirlash" : "Buyum qo‘shish";

    $("itemName").value = item?.name || "";
    $("itemCategory").value = item?.category || "Boshqa";
    $("itemPlace").value = item?.place || "";
    $("itemNote").value = item?.note || "";
    $("itemStatus").value = item?.status || "Menda";
    $("itemBorrower").value = item?.borrower || "";
    $("itemDue").value = item?.due || "";
    $("itemReminder").value = item?.reminder || "";

    photoData = item?.photo || "";

    updateStatusFields();

    $("photoPreview").innerHTML = photoData
        ? `<img src="${photoData}" alt="Rasm">Rasm tanlangan`
        : "＋ Rasm tanlash";

    closeModal("detailModal");
    openModal("itemModal");
}

$("addItemBtn").addEventListener("click", () => openItemForm());

$("itemPhoto").addEventListener("change", e => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Rasm faylini tanlang.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast("Rasm 5 MB dan kichik bo‘lsin.");
        e.target.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const max = 900;

            const scale = Math.min(
                1,
                max / Math.max(img.width, img.height)
            );

            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);

            canvas.getContext("2d").drawImage(
                img, 0, 0, canvas.width, canvas.height
            );

            photoData = canvas.toDataURL("image/jpeg", .78);

            $("photoPreview").innerHTML =
                `<img src="${photoData}" alt="Tanlangan rasm">Rasm tanlandi`;
        };

        img.src = reader.result;
    };

    reader.readAsDataURL(file);
});

$("itemForm").addEventListener("submit", e => {
    e.preventDefault();

    const id = $("itemId").value;
    const old = items.find(x => x.id === id);

    const item = {
        id: id || uid(),
        name: $("itemName").value.trim(),
        category: $("itemCategory").value,
        place: $("itemPlace").value.trim(),
        note: $("itemNote").value.trim(),
        status: $("itemStatus").value,

        borrower: $("itemStatus").value === "Berdim"
            ? $("itemBorrower").value.trim()
            : "",

        due: $("itemStatus").value === "Berdim"
            ? $("itemDue").value
            : "",

        reminder: $("itemReminder").value,
        photo: photoData,
        createdAt: old?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (!item.name) {
        showToast("Buyum nomini kiriting.");
        return;
    }

    if (id) {
        items = items.map(x => x.id === id ? item : x);
    } else {
        items.unshift(item);
    }

    persist();
    render();
    closeModal("itemModal");

    showToast(id
        ? "Buyum ma’lumoti yangilandi."
        : "Buyum xotiraga saqlandi.");
});

function showDetails(id) {
    const item = items.find(x => x.id === id);

    if (!item) return;

    $("detailTitle").textContent = item.name;

    const photo = item.photo
        ? `<img class="detail-image" src="${item.photo}" alt="${escapeHTML(item.name)}">`
        : `<div class="detail-placeholder">${iconFor(item.category)}</div>`;

    $("detailContent").innerHTML = `
        ${photo}

        <div class="detail-info">
            <div class="detail-cell">
                <small>Kategoriya</small>
                <strong>${escapeHTML(item.category)}</strong>
            </div>

            <div class="detail-cell">
                <small>Holati</small>
                <strong>${item.status === "Berdim" ? "Berilgan" : "Sizda"}</strong>
            </div>

            <div class="detail-cell">
                <small>Joylashuvi</small>
                <strong>${escapeHTML(item.place || "Kiritilmagan")}</strong>
            </div>

            <div class="detail-cell">
                <small>Kimga berilgan</small>
                <strong>${escapeHTML(item.borrower || "—")}</strong>
            </div>

            <div class="detail-cell">
                <small>Qaytarish sanasi</small>
                <strong>${formatDate(item.due)}</strong>
            </div>

            <div class="detail-cell">
                <small>Eslatma sanasi</small>
                <strong>${formatDate(item.reminder)}</strong>
            </div>
        </div>

        ${item.note
            ? `<p class="detail-note">${escapeHTML(item.note)}</p>`
            : ""}

        <div class="detail-actions">
            <button class="primary-button" id="editItemBtn">Tahrirlash</button>

            <button class="secondary-button" id="toggleLentBtn">
                ${item.status === "Berdim" ? "Qaytarib oldim" : "Birovga berdim"}
            </button>

            <button class="danger-button" id="deleteItemBtn">O‘chirish</button>
        </div>
    `;

    openModal("detailModal");

    $("editItemBtn").addEventListener("click", () => {
        openItemForm(item);
    });

    $("toggleLentBtn").addEventListener("click", () => {
        if (item.status === "Berdim") {
            item.status = "Menda";
            item.borrower = "";
            item.due = "";

            persist();
            render();
            showDetails(id);
            showToast("Buyum qaytarib olindi deb belgilandi.");
        } else {
            openItemForm({...item, status: "Berdim"});
        }
    });

    $("deleteItemBtn").addEventListener("click", () => {
        if (!confirm(`“${item.name}” o‘chirilsinmi?`)) return;

        items = items.filter(x => x.id !== id);

        persist();
        render();
        closeModal("detailModal");

        showToast("Buyum o‘chirildi.");
    });
}

$("searchInput").addEventListener("input", render);

$("filters").addEventListener("click", e => {
    const btn = e.target.closest("[data-filter]");

    if (!btn) return;

    activeFilter = btn.dataset.filter;

    document.querySelectorAll(".filter").forEach(x => {
        x.classList.toggle("active", x === btn);
    });

    render();
});

function startVoice(mode) {
    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        showToast("Bu brauzer ovozli tanishni qo‘llamaydi.");
        $("voiceStatus").textContent =
            "Ovozli tanish mavjud emas. Chrome orqali sinab ko‘ring.";
        return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "uz-UZ";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const btn = $("voiceBtn");
    btn.classList.add("listening");

    $("voiceStatus").textContent = "Tinglayapman... Gapiring.";

    recognition.onresult = event => {
        const transcript =
            event.results[0][0].transcript.trim();

        if (mode === "search") {
            $("searchInput").value = transcript;
            render();

            $("searchHint").textContent =
                "Ovozli qidiruv: " + transcript;
        } else {
            openItemForm();

            $("itemName").value = transcript;
            $("itemNote").value =
                "Ovoz orqali kiritildi: " + transcript;

            $("voiceStatus").textContent =
                "Ovozli qayd qabul qilindi.";
        }
    };

    recognition.onerror = event => {
        $("voiceStatus").textContent =
            "Ovoz aniqlanmadi. Qayta urinib ko‘ring.";

        showToast("Ovoz aniqlash xatosi: " + event.error);
    };

    recognition.onend = () => {
        btn.classList.remove("listening");
    };

    recognition.start();
}

$("voiceBtn").addEventListener("click", () => {
    startVoice("search");
});

$("voiceAddBtn").addEventListener("click", () => {
    startVoice("add");
});

render();
