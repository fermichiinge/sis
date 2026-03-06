"use strict";

const EXCHANGE_RATE = 7.8;
const MAX_TICKETS = 5;
const STORAGE = {
  prefs: "lumicine.retro.prefs",
  seats: "lumicine.retro.seats",
  reservations: "lumicine.retro.reservations"
};

const MOVIES = [
  {
    id: "reino-estrellas",
    title: "Reino de Estrellas",
    duration: "1h 45m",
    priceGTQ: 68,
    poster: "assets/posters/reino-estrellas.svg",
    showtimes: ["13:30", "16:30", "19:00", "21:15"],
    tagline: "Fantasia musical para toda la familia"
  },
  {
    id: "aventura-aurora",
    title: "Aventura Aurora",
    duration: "2h 00m",
    priceGTQ: 75,
    poster: "assets/posters/aventura-aurora.svg",
    showtimes: ["14:00", "17:00", "19:30", "22:00"],
    tagline: "Aventura clasica con colores retro"
  },
  {
    id: "guardianes-rio",
    title: "Guardianes del Rio",
    duration: "1h 58m",
    priceGTQ: 82,
    poster: "assets/posters/guardianes-rio.svg",
    showtimes: ["12:45", "15:30", "18:45", "21:30"],
    tagline: "Leyendas del agua en gran formato"
  },
  {
    id: "festival-fantasia",
    title: "Festival Fantasia",
    duration: "2h 12m",
    priceGTQ: 90,
    poster: "assets/posters/festival-fantasia.svg",
    showtimes: ["13:15", "16:15", "19:15", "22:15"],
    tagline: "Gran final musical estilo vintage"
  }
];

const SEAT_LAYOUT = [
  { row: "A", seats: [3, 4, 5, 6, 7, 8], aisleAfter: 3, inset: 34 },
  { row: "B", seats: [2, 3, 4, 5, 6, 7, 8, 9], aisleAfter: 4, inset: 24 },
  { row: "C", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], aisleAfter: 5, inset: 16 },
  { row: "D", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], aisleAfter: 5, inset: 12 },
  { row: "E", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], aisleAfter: 5, inset: 8 },
  { row: "F", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], aisleAfter: 5, inset: 5 },
  { row: "G", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], aisleAfter: 5, inset: 3 },
  { row: "H", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], aisleAfter: 5, inset: 0 }
];

const EXTRAS = [
  { id: "poporopos", name: "Poporopos clasicos", priceGTQ: 25 },
  { id: "bebida", name: "Bebida grande", priceGTQ: 18 },
  { id: "nachos", name: "Nachos con queso", priceGTQ: 22 },
  { id: "combo", name: "Combo retro", priceGTQ: 38 },
  { id: "dulces", name: "Dulces de cine", priceGTQ: 14 }
];

const ui = {
  movieSearch: document.getElementById("movieSearch"),
  currencySelect: document.getElementById("currencySelect"),
  themeToggle: document.getElementById("themeToggle"),
  movieCount: document.getElementById("movieCount"),
  moviesGrid: document.getElementById("moviesGrid"),
  selectedMovieInfo: document.getElementById("selectedMovieInfo"),
  showDate: document.getElementById("showDate"),
  showTime: document.getElementById("showTime"),
  seatsContainer: document.getElementById("seatsContainer"),
  extrasTableBody: document.getElementById("extrasTableBody"),
  selectedSeatsText: document.getElementById("selectedSeatsText"),
  ticketCountText: document.getElementById("ticketCountText"),
  ticketTotalText: document.getElementById("ticketTotalText"),
  extrasTotalText: document.getElementById("extrasTotalText"),
  grandTotalText: document.getElementById("grandTotalText"),
  payButton: document.getElementById("payButton"),
  clearSelectionButton: document.getElementById("clearSelectionButton"),
  reservationsList: document.getElementById("reservationsList"),
  paymentModal: document.getElementById("paymentModal"),
  closePaymentModal: document.getElementById("closePaymentModal"),
  paymentSummary: document.getElementById("paymentSummary"),
  paymentForm: document.getElementById("paymentForm"),
  customerName: document.getElementById("customerName"),
  buyerEmail: document.getElementById("buyerEmail"),
  paymentTypeRadios: document.querySelectorAll("input[name='paymentType']"),
  cardFields: document.getElementById("cardFields"),
  transferFields: document.getElementById("transferFields"),
  bankName: document.getElementById("bankName"),
  voucherNumber: document.getElementById("voucherNumber"),
  transferAmount: document.getElementById("transferAmount"),
  cashFields: document.getElementById("cashFields"),
  termsCheck: document.getElementById("termsCheck"),
  paymentError: document.getElementById("paymentError"),
  confirmPaymentBtn: document.getElementById("confirmPaymentBtn"),
  invoiceModal: document.getElementById("invoiceModal"),
  closeInvoiceModal: document.getElementById("closeInvoiceModal"),
  invoiceContent: document.getElementById("invoiceContent"),
  printInvoiceBtn: document.getElementById("printInvoiceBtn"),
  downloadInvoicePdfBtn: document.getElementById("downloadInvoicePdfBtn"),
  toast: document.getElementById("toast")
};

const movieById = new Map(MOVIES.map((m) => [m.id, m]));
const validSeatCodes = new Set(SEAT_LAYOUT.flatMap((l) => l.seats.map((n) => `${l.row}${n}`)));

let searchQuery = "";
let currency = "GTQ";
let selectedMovieId = MOVIES[0].id;
let selectedDate = todayISO();
let selectedTime = MOVIES[0].showtimes[0];
let selectedSeats = new Set();
let extrasState = emptyExtras();
let seatState = {};
let reservations = [];
let activeInvoiceId = null;
let processingPayment = false;
let toastTimer = null;

init();

function init() {
  loadState();
  ui.currencySelect.value = currency;
  ui.showDate.min = todayISO();
  if (!selectedDate || selectedDate < todayISO()) {
    selectedDate = todayISO();
  }
  ui.showDate.value = selectedDate;
  applyTheme(readJson(STORAGE.prefs)?.theme === "retro-dark" ? "retro-dark" : "retro-light");
  ensureMovieTime();
  ensureSeatSet();
  bindEvents();
  bindPaymentModalEvents();
  renderAll();
}

function bindEvents() {
  ui.themeToggle.addEventListener("click", () => {
    const next = document.body.dataset.theme === "retro-dark" ? "retro-light" : "retro-dark";
    applyTheme(next);
    saveState();
  });

  ui.currencySelect.addEventListener("change", () => {
    currency = ui.currencySelect.value === "USD" ? "USD" : "GTQ";
    saveState();
    renderAll();
  });

  ui.movieSearch.addEventListener("input", () => {
    searchQuery = ui.movieSearch.value.trim().toLowerCase();
    renderMovies();
  });

  ui.moviesGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='choose-movie']");
    if (!button) return;
    const movieId = button.dataset.movieId;
    if (!movieById.has(movieId)) return;
    selectedMovieId = movieId;
    selectedSeats.clear();
    extrasState = emptyExtras();
    ensureMovieTime();
    ensureSeatSet();
    renderAll();
  });

  ui.showDate.addEventListener("change", () => {
    const value = ui.showDate.value;
    if (!value) return;
    if (value < todayISO()) {
      ui.showDate.value = todayISO();
      selectedDate = todayISO();
      toast("No puedes elegir fechas pasadas.", true);
    } else {
      selectedDate = value;
    }
    selectedSeats.clear();
    ensureSeatSet();
    renderSelectedMovieInfo();
    renderSeats();
    renderSummary();
  });

  ui.showTime.addEventListener("change", () => {
    if (!ui.showTime.value) return;
    selectedTime = ui.showTime.value;
    selectedSeats.clear();
    ensureSeatSet();
    renderSelectedMovieInfo();
    renderSeats();
    renderSummary();
  });

  ui.seatsContainer.addEventListener("click", (event) => {
    const seatButton = event.target.closest("button.seat");
    if (!seatButton || seatButton.disabled) return;
    const code = seatButton.dataset.seat;
    if (!validSeatCodes.has(code)) return;
    if (selectedSeats.has(code)) {
      selectedSeats.delete(code);
    } else {
      if (selectedSeats.size >= MAX_TICKETS) {
        toast(`Limite: ${MAX_TICKETS} boletos por persona.`, true);
        return;
      }
      selectedSeats.add(code);
    }
    renderSeats();
    renderSummary();
  });

  ui.extrasTableBody.addEventListener("change", (event) => {
    const select = event.target.closest("select[data-extra-id]");
    if (!select) return;
    extrasState[select.dataset.extraId] = Number(select.value) || 0;
    renderExtrasTable();
    renderSummary();
  });

  ui.clearSelectionButton.addEventListener("click", () => {
    selectedSeats.clear();
    extrasState = emptyExtras();
    renderSeats();
    renderExtrasTable();
    renderSummary();
  });

  ui.payButton.addEventListener("click", openPaymentModal);
}

function renderAll() {
  renderMovies();
  renderTimeOptions();
  renderSelectedMovieInfo();
  renderSeats();
  renderExtrasTable();
  renderSummary();
  renderReservations();
}

function renderMovies() {
  const filtered = MOVIES.filter((movie) => !searchQuery || `${movie.title} ${movie.tagline}`.toLowerCase().includes(searchQuery));
  ui.movieCount.textContent = `${filtered.length} de ${MOVIES.length} peliculas`;
  if (filtered.length === 0) {
    ui.moviesGrid.innerHTML = "<p class='empty-state'>No se encontraron peliculas.</p>";
    return;
  }
  ui.moviesGrid.innerHTML = filtered.map((movie) => {
    const active = movie.id === selectedMovieId ? "active" : "";
    const p1 = currency === "GTQ" ? money(movie.priceGTQ, "GTQ") : money(toUSD(movie.priceGTQ), "USD");
    const p2 = currency === "GTQ" ? money(toUSD(movie.priceGTQ), "USD") : money(movie.priceGTQ, "GTQ");
    return `
      <article class="movie-card ${active}">
        <img src="${movie.poster}" alt="Poster ${escapeHtml(movie.title)}" />
        <div class="movie-meta">
          <h3>${escapeHtml(movie.title)}</h3>
          <p>${movie.duration}</p>
          <p>${escapeHtml(movie.tagline)}</p>
          <div class="price-chip">${p1}<span>${p2}</span></div>
          <button class="btn-select" type="button" data-action="choose-movie" data-movie-id="${movie.id}">${movie.id === selectedMovieId ? "Seleccionada" : "Elegir"}</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderTimeOptions() {
  const movie = movieById.get(selectedMovieId);
  if (!movie) return;
  if (!movie.showtimes.includes(selectedTime)) selectedTime = movie.showtimes[0];
  ui.showTime.innerHTML = movie.showtimes.map((time) => `<option value="${time}" ${time === selectedTime ? "selected" : ""}>${time}</option>`).join("");
  ui.showTime.value = selectedTime;
}

function renderSelectedMovieInfo() {
  const movie = movieById.get(selectedMovieId);
  if (!movie) {
    ui.selectedMovieInfo.innerHTML = "<p>Selecciona una pelicula.</p>";
    return;
  }
  ui.selectedMovieInfo.innerHTML = `
    <img src="${movie.poster}" alt="Poster ${escapeHtml(movie.title)}" />
    <div>
      <h3>${escapeHtml(movie.title)}</h3>
      <p>Funcion: ${dateNice(selectedDate)} ${selectedTime}</p>
      <p>Precio por boleto: ${money(movie.priceGTQ, "GTQ")} | ${money(toUSD(movie.priceGTQ), "USD")}</p>
      <p>Horarios: ${movie.showtimes.join(" | ")}</p>
    </div>
  `;
}
function renderSeats() {
  ensureSeatSet();
  const occupied = seatState[currentShowKey()] || new Set();
  ui.seatsContainer.innerHTML = SEAT_LAYOUT.map((layout) => {
    const seatsHtml = layout.seats.map((seatNumber, index) => {
      const code = `${layout.row}${seatNumber}`;
      const isOccupied = occupied.has(code);
      const isSelected = selectedSeats.has(code);
      const status = isOccupied ? "occupied" : isSelected ? "selected" : "available";
      const gap = index === layout.aisleAfter ? "aisle-gap" : "";
      return `<button type="button" class="seat ${status} ${gap}" data-seat="${code}" ${isOccupied ? "disabled" : ""}>${seatNumber}</button>`;
    }).join("");

    return `
      <div class="seat-row" style="padding-inline:${layout.inset}px;">
        <span class="row-label">${layout.row}</span>
        <div class="row-seats">${seatsHtml}</div>
        <span class="row-label">${layout.row}</span>
      </div>
    `;
  }).join("");
}

function renderExtrasTable() {
  ui.extrasTableBody.innerHTML = EXTRAS.map((item) => {
    const qty = extrasState[item.id] || 0;
    return `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${money(item.priceGTQ, "GTQ")}</td>
        <td>
          <select class="quantity-select" data-extra-id="${item.id}">${qtyOptions(qty)}</select>
        </td>
        <td>${money(qty * item.priceGTQ, "GTQ")}</td>
      </tr>
    `;
  }).join("");
}

function renderSummary() {
  const totals = totalsNow();
  const seats = sortSeats(Array.from(selectedSeats));
  ui.selectedSeatsText.textContent = `Asientos: ${seats.length ? seats.join(", ") : "ninguno"}`;
  ui.ticketCountText.textContent = `Boletos: ${seats.length} / ${MAX_TICKETS}`;
  ui.ticketTotalText.textContent = `Boletos total: ${moneyByCurrency(totals.ticketsGTQ)}`;
  ui.extrasTotalText.textContent = `Acompanamientos: ${moneyByCurrency(totals.extrasGTQ)}`;
  ui.grandTotalText.textContent = `Total final: ${moneyByCurrency(totals.totalGTQ)}`;
  ui.payButton.disabled = seats.length === 0;
  ui.clearSelectionButton.disabled = seats.length === 0 && totals.extrasGTQ === 0;
}

function openPaymentModal() {
  if (selectedSeats.size === 0) {
    toast("Selecciona asientos primero.", true);
    return;
  }

  const movie = movieById.get(selectedMovieId);
  const totals = totalsNow();
  const extras = selectedExtras();
  const extrasText = extras.length ? extras.map((x) => `${x.name} x${x.qty}`).join(", ") : "Sin extras";

  ui.paymentSummary.textContent = `${movie.title} | ${dateNice(selectedDate)} ${selectedTime} | Asientos ${sortSeats(Array.from(selectedSeats)).join(", ")} | Extras: ${extrasText} | Total: ${money(totals.totalGTQ, "GTQ")}`;
  ui.transferAmount.value = totals.totalGTQ.toFixed(2);

  ui.paymentModal.classList.remove("hidden");
  ui.paymentModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  resetPaymentFormUI();
  bindPaymentModalEvents();
  togglePaymentGroups();
  ui.customerName.focus();
}

function bindPaymentModalEvents() {
  if (ui.paymentModal.dataset.bound === "1") return;
  ui.paymentModal.dataset.bound = "1";

  ui.closePaymentModal.addEventListener("click", () => closePaymentModal(true));
  ui.paymentModal.addEventListener("click", (event) => {
    if (event.target === ui.paymentModal) closePaymentModal(true);
  });

  ui.paymentTypeRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      togglePaymentGroups();
      formError("");
    });
  });

  ui.customerName.addEventListener("input", () => {
    ui.customerName.value = ui.customerName.value.replace(/[^A-Za-zÀ-ÿ' ]+/g, "").replace(/\s{2,}/g, " ");
    formError("");
  });

  ui.voucherNumber.addEventListener("input", () => {
    ui.voucherNumber.value = ui.voucherNumber.value.replace(/[^A-Za-z0-9-]/g, "").slice(0, 25);
    formError("");
  });

  ui.paymentForm.addEventListener("submit", handlePaymentSubmit);

  ui.closeInvoiceModal.addEventListener("click", closeInvoiceModal);
  ui.invoiceModal.addEventListener("click", (event) => {
    if (event.target === ui.invoiceModal) closeInvoiceModal();
  });

  ui.printInvoiceBtn.addEventListener("click", () => activeInvoiceId && printInvoice(activeInvoiceId));
  ui.downloadInvoicePdfBtn.addEventListener("click", () => activeInvoiceId && printInvoice(activeInvoiceId));

  ui.reservationsList.addEventListener("click", handleReservationActions);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!ui.paymentModal.classList.contains("hidden")) closePaymentModal(true);
    if (!ui.invoiceModal.classList.contains("hidden")) closeInvoiceModal();
  });
}

function handlePaymentSubmit(event) {
  event.preventDefault();
  if (processingPayment) return;

  const errors = validatePayment();
  if (errors.length) {
    formError(errors[0]);
    return;
  }

  processingPayment = true;
  ui.confirmPaymentBtn.disabled = true;
  ui.confirmPaymentBtn.textContent = "Procesando...";

  window.setTimeout(() => {
    processingPayment = false;
    ui.confirmPaymentBtn.disabled = false;
    ui.confirmPaymentBtn.textContent = "Confirmar pago";
    createReservation();
  }, 850);
}

function validatePayment() {
  const errors = [];
  const type = paymentType();
  const totals = totalsNow();

  if (!/^[A-Za-zÀ-ÿ' ]{3,60}$/.test(ui.customerName.value.trim())) {
    errors.push("El nombre solo permite letras y espacios.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(ui.buyerEmail.value.trim())) {
    errors.push("Correo invalido.");
  }

  if (selectedSeats.size === 0 || selectedSeats.size > MAX_TICKETS) {
    errors.push(`Debes elegir entre 1 y ${MAX_TICKETS} asientos.`);
  }

  if (type === "Transferencia") {
    if (!ui.bankName.value) errors.push("Selecciona un banco.");
    if (!/^[A-Za-z0-9-]{6,25}$/.test(ui.voucherNumber.value.trim())) errors.push("No. de boleta invalido.");
    const amount = Number(ui.transferAmount.value);
    if (!Number.isFinite(amount) || amount < totals.totalGTQ) errors.push("Monto transferido insuficiente.");
  }

  if (!ui.termsCheck.checked) errors.push("Debes confirmar los datos.");

  const occupied = seatState[currentShowKey()] || new Set();
  for (const code of selectedSeats) {
    if (occupied.has(code)) {
      errors.push("Un asiento ya no esta disponible.");
      break;
    }
  }

  return errors;
}

function createReservation() {
  const movie = movieById.get(selectedMovieId);
  const seats = sortSeats(Array.from(selectedSeats));
  const totals = totalsNow();
  const extras = selectedExtras();
  const type = paymentType();

  const reservation = {
    id: `R-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 900 + 100)}`,
    movieId: movie.id,
    showDate: selectedDate,
    showTime: selectedTime,
    showKey: currentShowKey(),
    seats,
    ticketCount: seats.length,
    ticketPriceGTQ: movie.priceGTQ,
    ticketTotalGTQ: totals.ticketsGTQ,
    extras,
    extrasTotalGTQ: totals.extrasGTQ,
    totalGTQ: totals.totalGTQ,
    customerName: cleanText(ui.customerName.value, 60),
    email: cleanText(ui.buyerEmail.value, 80),
    paymentType: type,
    paymentDetails: paymentDetails(type),
    createdAt: new Date().toISOString()
  };

  reservations.unshift(reservation);
  if (!seatState[reservation.showKey]) seatState[reservation.showKey] = new Set();
  seats.forEach((s) => seatState[reservation.showKey].add(s));

  selectedSeats.clear();
  extrasState = emptyExtras();
  saveState();

  closePaymentModal(true);
  renderSeats();
  renderExtrasTable();
  renderSummary();
  renderReservations();
  openInvoice(reservation.id);
  toast("Reserva confirmada. Factura lista.");
}
function renderReservations() {
  if (!reservations.length) {
    ui.reservationsList.innerHTML = "<p class='empty-state'>Aun no tienes reservas activas.</p>";
    return;
  }

  ui.reservationsList.innerHTML = reservations.map((r) => {
    const movie = movieById.get(r.movieId);
    return `
      <article class="reservation-item">
        <img src="${movie ? movie.poster : "assets/logo-lumicine.svg"}" alt="Poster" />
        <div>
          <h4>${movie ? escapeHtml(movie.title) : "Pelicula"} | ${dateNice(r.showDate)} ${r.showTime}</h4>
          <p>Reserva: ${escapeHtml(r.id)} | Cliente: ${escapeHtml(r.customerName)}</p>
          <p>Asientos: ${escapeHtml(r.seats.join(", "))} | Boletos: ${r.ticketCount}</p>
          <p>Pago: ${escapeHtml(r.paymentType)} | Total: ${money(r.totalGTQ, "GTQ")}</p>
          <p>Creada: ${dateTimeNice(r.createdAt)}</p>
        </div>
        <div class="reservation-actions">
          <button type="button" class="btn-secondary" data-action="invoice" data-id="${escapeHtml(r.id)}">Factura</button>
          <button type="button" class="btn-primary" data-action="pdf" data-id="${escapeHtml(r.id)}">PDF</button>
          <button type="button" class="btn-danger" data-action="cancel" data-id="${escapeHtml(r.id)}">Cancelar</button>
        </div>
      </article>
    `;
  }).join("");
}

function handleReservationActions(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  const action = button.dataset.action;
  if (action === "invoice") return openInvoice(id);
  if (action === "pdf") return printInvoice(id);
  if (action === "cancel") return cancelReservation(id);
}

function openInvoice(reservationId) {
  const reservation = reservations.find((x) => x.id === reservationId);
  if (!reservation) return;
  activeInvoiceId = reservation.id;
  drawInvoice(reservation);
  ui.invoiceModal.classList.remove("hidden");
  ui.invoiceModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeInvoiceModal() {
  activeInvoiceId = null;
  ui.invoiceModal.classList.add("hidden");
  ui.invoiceModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function drawInvoice(reservation) {
  const movie = movieById.get(reservation.movieId);
  const rows = reservation.seats.map((seat) => `<tr><td>Boleto ${escapeHtml(movie.title)} - Asiento ${escapeHtml(seat)}</td><td>1</td><td>${money(reservation.ticketPriceGTQ, "GTQ")}</td><td>${money(reservation.ticketPriceGTQ, "GTQ")}</td></tr>`);

  if (reservation.extras.length) {
    reservation.extras.forEach((e) => rows.push(`<tr><td>${escapeHtml(e.name)}</td><td>${e.qty}</td><td>${money(e.priceGTQ, "GTQ")}</td><td>${money(e.totalGTQ, "GTQ")}</td></tr>`));
  } else {
    rows.push("<tr><td colspan='4'>Sin acompanamientos</td></tr>");
  }

  ui.invoiceContent.innerHTML = `
    <article class="invoice-box">
      <header class="invoice-header">
        <img src="assets/logo-lumicine.svg" class="invoice-logo" alt="Logo LumiCine Retro" />
        <div>
          <h4>Factura LumiCine Retro</h4>
          <p>Reserva ${escapeHtml(reservation.id)} | ${dateTimeNice(reservation.createdAt)}</p>
        </div>
      </header>

      <section class="invoice-grid">
        <div class="invoice-field"><strong>Cliente</strong><span>${escapeHtml(reservation.customerName)}</span></div>
        <div class="invoice-field"><strong>Correo</strong><span>${escapeHtml(reservation.email)}</span></div>
        <div class="invoice-field"><strong>Pelicula</strong><span>${escapeHtml(movie.title)}</span></div>
        <div class="invoice-field"><strong>Funcion</strong><span>${dateNice(reservation.showDate)} ${reservation.showTime}</span></div>
        <div class="invoice-field"><strong>Asientos</strong><span>${escapeHtml(reservation.seats.join(", "))}</span></div>
        <div class="invoice-field"><strong>Pago</strong><span>${escapeHtml(paymentLabel(reservation))}</span></div>
        <div class="invoice-field"><strong>Boletos individuales</strong><span>${reservation.seats.map((seat) => `${reservation.id}-${seat}`).join(", ")}</span></div>
      </section>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Cantidad</th>
            <th>Precio unitario</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>

      <p class="invoice-total">Total: ${money(reservation.totalGTQ, "GTQ")} (${money(toUSD(reservation.totalGTQ), "USD")})</p>
    </article>
  `;
}

function printInvoice(id) {
  const reservation = reservations.find((r) => r.id === id);
  const movie = reservation ? movieById.get(reservation.movieId) : null;
  if (!reservation || !movie) return toast("No se pudo generar PDF.", true);

  const logoUrl = new URL("assets/logo-lumicine.svg", window.location.href).href;
  const extrasText = reservation.extras.length
    ? reservation.extras.map((e) => `${e.name} x${e.qty}`).join(", ")
    : "Sin acompanamientos";

  const ticketPages = reservation.seats.map((seat) => `
    <section class='ticket'>
      <header class='head'>
        <img src='${logoUrl}' alt='logo'>
        <div>
          <h1>Boleto LumiCine Retro</h1>
          <p>Reserva ${escapeHtml(reservation.id)} | Boleto ${escapeHtml(reservation.id)}-${escapeHtml(seat)}</p>
        </div>
      </header>

      <section class='grid'>
        <div class='field'><strong>Cliente</strong>${escapeHtml(reservation.customerName)}</div>
        <div class='field'><strong>Correo</strong>${escapeHtml(reservation.email)}</div>
        <div class='field'><strong>Pelicula</strong>${escapeHtml(movie.title)}</div>
        <div class='field'><strong>Funcion</strong>${dateNice(reservation.showDate)} ${reservation.showTime}</div>
        <div class='field'><strong>Asiento</strong>${escapeHtml(seat)}</div>
        <div class='field'><strong>Pago</strong>${escapeHtml(paymentLabel(reservation))}</div>
      </section>

      <table>
        <thead>
          <tr><th>Concepto</th><th>Cantidad</th><th>Precio</th></tr>
        </thead>
        <tbody>
          <tr><td>Boleto ${escapeHtml(movie.title)} - Asiento ${escapeHtml(seat)}</td><td>1</td><td>${money(reservation.ticketPriceGTQ, "GTQ")}</td></tr>
          <tr><td>Extras compartidos</td><td>-</td><td>${escapeHtml(extrasText)}</td></tr>
        </tbody>
      </table>

      <p class='total'>Valor del boleto: ${money(reservation.ticketPriceGTQ, "GTQ")} | Total reserva: ${money(reservation.totalGTQ, "GTQ")} (${money(toUSD(reservation.totalGTQ), "USD")})</p>
      <p class='foot'>Emitido: ${dateTimeNice(reservation.createdAt)}</p>
    </section>
  `).join("");

  const popup = window.open("", "_blank", "width=900,height=760");
  if (!popup) return toast("Habilita ventanas emergentes para PDF.", true);

  popup.document.write(`<!doctype html><html lang='es'><head><meta charset='UTF-8'><title>Boletos ${escapeHtml(reservation.id)}</title>
    <style>
      body{font-family:Arial;margin:20px;color:#2f1c0c}
      .ticket{border:2px solid #866137;border-radius:10px;padding:14px;break-inside:avoid}
      .head{display:flex;gap:12px;align-items:center;border-bottom:1px dashed #866137;padding-bottom:10px;margin-bottom:10px}
      .head img{width:70px;height:70px}
      h1{margin:0;font-size:26px}
      p{margin:4px 0}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
      .field{border:1px solid #b6966f;border-radius:6px;padding:6px}
      strong{display:block;font-size:11px;color:#6a4724}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #b6966f;padding:6px;text-align:left}
      th{background:#f1dcc1}
      .total{margin-top:10px;font-size:14px;font-weight:700}
      .foot{font-size:12px;color:#6a4724}
      @media print{
        body{margin:0.5cm}
        .ticket{
          min-height:260mm;
          page-break-after:always;
          break-after:page;
        }
        .ticket:last-of-type{
          page-break-after:auto;
          break-after:auto;
        }
      }
    </style>
    </head><body>
    ${ticketPages}
    <script>window.addEventListener('load',function(){window.print();});</script></body></html>`);
  popup.document.close();
}

function cancelReservation(id) {
  const index = reservations.findIndex((r) => r.id === id);
  if (index === -1) return;
  const reservation = reservations[index];
  if (!window.confirm(`Cancelar reserva ${reservation.id}?`)) return;
  if (seatState[reservation.showKey]) reservation.seats.forEach((s) => seatState[reservation.showKey].delete(s));
  reservations.splice(index, 1);
  saveState();
  renderReservations();
  if (reservation.showKey === currentShowKey()) {
    renderSeats();
    renderSummary();
  }
  if (activeInvoiceId === reservation.id) closeInvoiceModal();
  toast("Reserva cancelada y asientos liberados.");
}

function closePaymentModal(reset) {
  if (processingPayment) return;
  ui.paymentModal.classList.add("hidden");
  ui.paymentModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (!reset) return;
  resetPaymentFormUI();
}

function resetPaymentFormUI() {
  ui.paymentForm.reset();
  ui.paymentError.textContent = "";
  ui.confirmPaymentBtn.textContent = "Confirmar pago";
  ui.confirmPaymentBtn.disabled = false;
  if (ui.paymentTypeRadios[0]) ui.paymentTypeRadios[0].checked = true;
  togglePaymentGroups();
}

function togglePaymentGroups() {
  const type = paymentType();
  ui.cardFields.classList.toggle("hidden", type !== "Tarjeta");
  ui.transferFields.classList.toggle("hidden", type !== "Transferencia");
  ui.cashFields.classList.toggle("hidden", type !== "Taquilla");
  if (type === "Transferencia") ui.transferAmount.value = totalsNow().totalGTQ.toFixed(2);
}

function paymentType() {
  const checked = Array.from(ui.paymentTypeRadios).find((r) => r.checked);
  return checked ? checked.value : "Tarjeta";
}

function paymentDetails(type) {
  if (type === "Transferencia") {
    return {
      bank: ui.bankName.value,
      voucher: ui.voucherNumber.value.trim(),
      amountGTQ: Number(ui.transferAmount.value)
    };
  }
  if (type === "Tarjeta") {
    return { note: "Tarjeta simplificada" };
  }
  return { note: "Pago en taquilla" };
}

function paymentLabel(reservation) {
  if (reservation.paymentType === "Transferencia") return `Transferencia ${reservation.paymentDetails.bank} / Boleta ${reservation.paymentDetails.voucher}`;
  if (reservation.paymentType === "Tarjeta") return "Pago con tarjeta simplificado";
  return "Pago en taquilla";
}
function ensureMovieTime() {
  const movie = movieById.get(selectedMovieId);
  if (!movie) return;
  if (!movie.showtimes.includes(selectedTime)) selectedTime = movie.showtimes[0];
}

function ensureSeatSet() {
  const key = currentShowKey();
  if (!seatState[key]) seatState[key] = randomSeatSet(10);
}

function currentShowKey() {
  return `${selectedMovieId}|${selectedDate}|${selectedTime}`;
}

function randomSeatSet(count) {
  const all = Array.from(validSeatCodes);
  const set = new Set();
  const target = Math.min(count, all.length - 5);
  while (set.size < target) {
    set.add(all[Math.floor(Math.random() * all.length)]);
  }
  return set;
}

function selectedExtras() {
  return EXTRAS
    .map((x) => ({ id: x.id, name: x.name, priceGTQ: x.priceGTQ, qty: Number(extrasState[x.id] || 0), totalGTQ: Number(extrasState[x.id] || 0) * x.priceGTQ }))
    .filter((x) => x.qty > 0);
}

function totalsNow() {
  const movie = movieById.get(selectedMovieId);
  const ticketsGTQ = movie ? selectedSeats.size * movie.priceGTQ : 0;
  const extrasGTQ = selectedExtras().reduce((sum, x) => sum + x.totalGTQ, 0);
  return { ticketsGTQ, extrasGTQ, totalGTQ: ticketsGTQ + extrasGTQ };
}

function qtyOptions(selected) {
  const out = [];
  for (let i = 0; i <= 8; i += 1) out.push(`<option value="${i}" ${i === selected ? "selected" : ""}>${i}</option>`);
  return out.join("");
}

function moneyByCurrency(amountGTQ) {
  const main = currency === "GTQ" ? money(amountGTQ, "GTQ") : money(toUSD(amountGTQ), "USD");
  const alt = currency === "GTQ" ? money(toUSD(amountGTQ), "USD") : money(amountGTQ, "GTQ");
  return `${main} | ${alt}`;
}

function money(value, curr) {
  return new Intl.NumberFormat(curr === "GTQ" ? "es-GT" : "en-US", { style: "currency", currency: curr, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function toUSD(gtq) {
  return gtq / EXCHANGE_RATE;
}

function sortSeats(list) {
  return list.slice().sort((a, b) => {
    const row = a.charCodeAt(0) - b.charCodeAt(0);
    if (row !== 0) return row;
    return Number(a.slice(1)) - Number(b.slice(1));
  });
}

function dateNice(iso) {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("es-GT", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  } catch (_e) {
    return iso;
  }
}

function dateTimeNice(iso) {
  try {
    return new Date(iso).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
  } catch (_e) {
    return iso;
  }
}

function validMonth(value) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

function luhn(number) {
  let sum = 0;
  let dbl = false;
  for (let i = number.length - 1; i >= 0; i -= 1) {
    let d = Number(number[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function formError(message) {
  ui.paymentError.textContent = message;
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  ui.themeToggle.textContent = theme === "retro-dark" ? "Modo claro" : "Modo nocturno";
  ui.themeToggle.setAttribute("aria-pressed", String(theme === "retro-dark"));
}

function toast(message, error) {
  if (toastTimer) window.clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.toggle("error", Boolean(error));
  ui.toast.classList.add("show");
  toastTimer = window.setTimeout(() => ui.toast.classList.remove("show"), 2600);
}

function emptyExtras() {
  return EXTRAS.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {});
}

function cleanText(value, max) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function saveState() {
  const safeSeats = {};
  Object.entries(seatState).forEach(([key, set]) => {
    safeSeats[key] = Array.from(set);
  });

  const prefs = {
    currency,
    theme: document.body.dataset.theme
  };

  writeRaw(STORAGE.prefs, JSON.stringify(prefs));
  writeRaw(STORAGE.seats, JSON.stringify(safeSeats));
  writeRaw(STORAGE.reservations, JSON.stringify(reservations));
}

function loadState() {
  const prefs = readJson(STORAGE.prefs);
  if (prefs && typeof prefs === "object") {
    currency = prefs.currency === "USD" ? "USD" : "GTQ";
  }

  const seatsRaw = readJson(STORAGE.seats);
  if (seatsRaw && typeof seatsRaw === "object") {
    Object.entries(seatsRaw).forEach(([key, list]) => {
      if (!Array.isArray(list)) return;
      seatState[key] = new Set(list.filter((x) => validSeatCodes.has(x)));
    });
  }

  const reservationsRaw = readJson(STORAGE.reservations);
  if (Array.isArray(reservationsRaw)) {
    reservations = reservationsRaw
      .filter((x) => x && x.id && x.movieId && Array.isArray(x.seats))
      .map((x) => ({
        id: cleanText(x.id, 40),
        movieId: x.movieId,
        showDate: /^\d{4}-\d{2}-\d{2}$/.test(String(x.showDate || "")) ? x.showDate : todayISO(),
        showTime: /^\d{2}:\d{2}$/.test(String(x.showTime || "")) ? x.showTime : "19:00",
        showKey: x.showKey || `${x.movieId}|${x.showDate || todayISO()}|${x.showTime || "19:00"}`,
        seats: sortSeats(x.seats.filter((s) => validSeatCodes.has(s))),
        ticketCount: Number(x.ticketCount || x.seats.length || 0),
        ticketPriceGTQ: Number(x.ticketPriceGTQ || 0),
        ticketTotalGTQ: Number(x.ticketTotalGTQ || 0),
        extras: Array.isArray(x.extras)
          ? x.extras
              .map((e) => ({
                id: cleanText(e.id, 30),
                name: cleanText(e.name, 50),
                priceGTQ: Number(e.priceGTQ || 0),
                qty: Number(e.qty ?? e.quantity ?? 0),
                totalGTQ: Number(e.totalGTQ || 0)
              }))
              .filter((e) => e.qty > 0)
          : [],
        extrasTotalGTQ: Number(x.extrasTotalGTQ || 0),
        totalGTQ: Number(x.totalGTQ || 0),
        customerName: cleanText(x.customerName, 60) || "Cliente",
        email: cleanText(x.email, 80) || "sin-correo@local",
        paymentType: cleanText(x.paymentType, 30) || "Taquilla",
        paymentDetails: x.paymentDetails && typeof x.paymentDetails === "object" ? x.paymentDetails : {},
        createdAt: x.createdAt || new Date().toISOString()
      }));
    reservations.forEach((r) => {
      if (!seatState[r.showKey]) seatState[r.showKey] = new Set();
      r.seats.forEach((s) => validSeatCodes.has(s) && seatState[r.showKey].add(s));
    });
  }
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

function writeRaw(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_e) {
    // ignore storage errors
  }
}
