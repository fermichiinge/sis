"use strict";

const EXCHANGE_RATE = 7.8;
const SEAT_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const SEATS_PER_ROW = 10;
const INITIAL_OCCUPIED_PER_MOVIE = 12;

const STORAGE_KEYS = {
  reservations: "lumicine.reservations",
  seats: "lumicine.seats",
  currency: "lumicine.currency",
  theme: "lumicine.theme"
};

const movies = [
  {
    id: "reino-estrellas",
    title: "Reino de Estrellas",
    schedule: "16:30",
    duration: "1h 45m",
    priceGTQ: 68,
    poster: "assets/posters/reino-estrellas.svg"
  },
  {
    id: "aventura-aurora",
    title: "Aventura Aurora",
    schedule: "18:45",
    duration: "2h 00m",
    priceGTQ: 75,
    poster: "assets/posters/aventura-aurora.svg"
  },
  {
    id: "guardianes-rio",
    title: "Guardianes del Rio",
    schedule: "20:15",
    duration: "1h 58m",
    priceGTQ: 82,
    poster: "assets/posters/guardianes-rio.svg"
  },
  {
    id: "festival-fantasia",
    title: "Festival Fantasia",
    schedule: "21:50",
    duration: "2h 12m",
    priceGTQ: 90,
    poster: "assets/posters/festival-fantasia.svg"
  }
];

const movieById = new Map(movies.map((movie) => [movie.id, movie]));

const ui = {
  currencySelect: document.getElementById("currencySelect"),
  themeToggle: document.getElementById("themeToggle"),
  moviesGrid: document.getElementById("moviesGrid"),
  selectedMovieInfo: document.getElementById("selectedMovieInfo"),
  seatsContainer: document.getElementById("seatsContainer"),
  selectedSeatsText: document.getElementById("selectedSeatsText"),
  ticketCountText: document.getElementById("ticketCountText"),
  totalText: document.getElementById("totalText"),
  payButton: document.getElementById("payButton"),
  clearSelectionButton: document.getElementById("clearSelectionButton"),
  paymentModal: document.getElementById("paymentModal"),
  closePaymentModal: document.getElementById("closePaymentModal"),
  paymentSummary: document.getElementById("paymentSummary"),
  paymentForm: document.getElementById("paymentForm"),
  cardHolder: document.getElementById("cardHolder"),
  buyerEmail: document.getElementById("buyerEmail"),
  cardNumber: document.getElementById("cardNumber"),
  expiryDate: document.getElementById("expiryDate"),
  cvv: document.getElementById("cvv"),
  paymentMethod: document.getElementById("paymentMethod"),
  termsCheck: document.getElementById("termsCheck"),
  paymentError: document.getElementById("paymentError"),
  confirmPaymentBtn: document.getElementById("confirmPaymentBtn"),
  reservationsList: document.getElementById("reservationsList"),
  toast: document.getElementById("toast")
};

let selectedMovieId = movies[0].id;
let selectedSeats = new Set();
let seatAvailability = {};
let reservations = [];
let preferredCurrency = "GTQ";
let paymentInProgress = false;
let toastTimer = null;

bootstrap();

function bootstrap() {
  preferredCurrency = readStorage(STORAGE_KEYS.currency) === "USD" ? "USD" : "GTQ";
  ui.currencySelect.value = preferredCurrency;

  applyTheme(readStorage(STORAGE_KEYS.theme) === "dark" ? "dark" : "light");
  hydrateSeatAvailability();
  hydrateReservations();

  renderMovies();
  renderSelectedMovieInfo();
  renderSeats();
  updateSummary();
  renderReservations();

  bindEvents();
}

function bindEvents() {
  ui.currencySelect.addEventListener("change", () => {
    preferredCurrency = ui.currencySelect.value === "USD" ? "USD" : "GTQ";
    writeStorage(STORAGE_KEYS.currency, preferredCurrency);
    renderMovies();
    renderSelectedMovieInfo();
    updateSummary();
    renderReservations();
  });

  ui.themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });

  ui.moviesGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='select-movie']");
    if (!button) {
      return;
    }

    const movieId = button.dataset.movieId;
    if (!movieById.has(movieId)) {
      return;
    }

    if (movieId !== selectedMovieId) {
      selectedMovieId = movieId;
      selectedSeats.clear();
      renderMovies();
      renderSelectedMovieInfo();
      renderSeats();
      updateSummary();
    }
  });

  ui.seatsContainer.addEventListener("click", (event) => {
    const seatButton = event.target.closest("button.seat");
    if (!seatButton || seatButton.disabled) {
      return;
    }

    const seatCode = seatButton.dataset.seat;
    if (!isValidSeatCode(seatCode)) {
      return;
    }

    if (selectedSeats.has(seatCode)) {
      selectedSeats.delete(seatCode);
    } else {
      selectedSeats.add(seatCode);
    }

    renderSeats();
    updateSummary();
  });

  ui.clearSelectionButton.addEventListener("click", () => {
    selectedSeats.clear();
    renderSeats();
    updateSummary();
  });

  ui.payButton.addEventListener("click", () => {
    if (selectedSeats.size === 0) {
      showToast("Selecciona al menos un asiento.", true);
      return;
    }

    openPaymentModal();
  });

  ui.closePaymentModal.addEventListener("click", () => {
    closePaymentModal(true);
  });

  ui.paymentModal.addEventListener("click", (event) => {
    if (event.target === ui.paymentModal) {
      closePaymentModal(true);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !ui.paymentModal.classList.contains("hidden")) {
      closePaymentModal(true);
    }
  });

  setupPaymentInputGuards();
  ui.paymentForm.addEventListener("submit", handlePaymentSubmit);

  ui.reservationsList.addEventListener("click", handleReservationActions);
}

function setupPaymentInputGuards() {
  ui.cardHolder.addEventListener("input", () => {
    const cleaned = ui.cardHolder.value.replace(/[^A-Za-zÀ-ÿ' ]+/g, "").replace(/\s{2,}/g, " ");
    ui.cardHolder.value = cleaned.slice(0, 60);
    setFormError("");
  });

  ui.cardNumber.addEventListener("input", () => {
    const digits = ui.cardNumber.value.replace(/\D/g, "").slice(0, 16);
    ui.cardNumber.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    setFormError("");
  });

  ui.expiryDate.addEventListener("input", () => {
    const digits = ui.expiryDate.value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      ui.expiryDate.value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      ui.expiryDate.value = digits;
    }
    setFormError("");
  });

  ui.cvv.addEventListener("input", () => {
    ui.cvv.value = ui.cvv.value.replace(/\D/g, "").slice(0, 3);
    setFormError("");
  });

  ui.buyerEmail.addEventListener("input", () => setFormError(""));
  ui.paymentMethod.addEventListener("change", () => setFormError(""));
  ui.termsCheck.addEventListener("change", () => setFormError(""));
}

function renderMovies() {
  ui.moviesGrid.innerHTML = movies
    .map((movie, index) => {
      const primaryPrice = preferredCurrency === "GTQ" ? formatCurrency(movie.priceGTQ, "GTQ") : formatCurrency(gtqToUsd(movie.priceGTQ), "USD");
      const secondaryPrice = preferredCurrency === "GTQ" ? formatCurrency(gtqToUsd(movie.priceGTQ), "USD") : formatCurrency(movie.priceGTQ, "GTQ");
      const activeClass = movie.id === selectedMovieId ? "active" : "";
      const buttonLabel = movie.id === selectedMovieId ? "Seleccionada" : "Elegir pelicula";

      return `
        <article class="movie-card ${activeClass}" style="animation-delay:${index * 60}ms;">
          <img src="${movie.poster}" alt="Poster de ${escapeHtml(movie.title)}" />
          <div class="movie-meta">
            <h3>${escapeHtml(movie.title)}</h3>
            <p>Horario: ${movie.schedule}</p>
            <p>Duracion: ${movie.duration}</p>
            <div class="price-chip">${primaryPrice}<span>${secondaryPrice}</span></div>
            <button class="btn-select" type="button" data-action="select-movie" data-movie-id="${movie.id}">${buttonLabel}</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSelectedMovieInfo() {
  const movie = movieById.get(selectedMovieId);
  if (!movie) {
    ui.selectedMovieInfo.innerHTML = "<p>Selecciona una pelicula para comenzar.</p>";
    return;
  }

  const priceText = `${formatCurrency(movie.priceGTQ, "GTQ")} | ${formatCurrency(gtqToUsd(movie.priceGTQ), "USD")}`;
  ui.selectedMovieInfo.innerHTML = `
    <img src="${movie.poster}" alt="Poster de ${escapeHtml(movie.title)}" />
    <div>
      <h3>${escapeHtml(movie.title)}</h3>
      <p>Horario: ${movie.schedule} | Precio por boleto: ${priceText}</p>
    </div>
  `;
}

function renderSeats() {
  const movie = movieById.get(selectedMovieId);
  if (!movie) {
    ui.seatsContainer.innerHTML = "";
    return;
  }

  const occupiedSet = seatAvailability[selectedMovieId] || new Set();
  const rowHtml = SEAT_ROWS.map((row) => {
    const seatButtons = [];

    for (let seatNumber = 1; seatNumber <= SEATS_PER_ROW; seatNumber += 1) {
      const seatCode = `${row}${seatNumber}`;
      const isOccupied = occupiedSet.has(seatCode);
      const isSelected = selectedSeats.has(seatCode);
      const statusClass = isOccupied ? "occupied" : isSelected ? "selected" : "available";
      const gapClass = seatNumber === 6 ? "aisle-gap" : "";
      const disabledAttr = isOccupied ? "disabled" : "";

      seatButtons.push(
        `<button type="button" class="seat ${statusClass} ${gapClass}" data-seat="${seatCode}" ${disabledAttr} title="Asiento ${seatCode}">${seatNumber}</button>`
      );
    }

    return `
      <div class="seat-row">
        <span class="row-label">${row}</span>
        <div class="row-seats">${seatButtons.join("")}</div>
      </div>
    `;
  }).join("");

  ui.seatsContainer.innerHTML = rowHtml;
}

function updateSummary() {
  const movie = movieById.get(selectedMovieId);
  const selectedList = sortSeatCodes(Array.from(selectedSeats));
  const ticketCount = selectedList.length;

  ui.selectedSeatsText.textContent = `Asientos: ${ticketCount > 0 ? selectedList.join(", ") : "ninguno"}`;
  ui.ticketCountText.textContent = `Boletos: ${ticketCount}`;

  if (!movie) {
    ui.totalText.textContent = "Total: Q0.00";
    ui.payButton.disabled = true;
    ui.clearSelectionButton.disabled = true;
    return;
  }

  const totalGTQ = ticketCount * movie.priceGTQ;
  const primary = preferredCurrency === "GTQ" ? formatCurrency(totalGTQ, "GTQ") : formatCurrency(gtqToUsd(totalGTQ), "USD");
  const secondary = preferredCurrency === "GTQ" ? formatCurrency(gtqToUsd(totalGTQ), "USD") : formatCurrency(totalGTQ, "GTQ");

  ui.totalText.textContent = `Total (${preferredCurrency}): ${primary} | ${secondary}`;
  ui.payButton.disabled = ticketCount === 0;
  ui.clearSelectionButton.disabled = ticketCount === 0;
}

function openPaymentModal() {
  const movie = movieById.get(selectedMovieId);
  const seats = sortSeatCodes(Array.from(selectedSeats));
  if (!movie || seats.length === 0) {
    showToast("Selecciona pelicula y asientos para pagar.", true);
    return;
  }

  const totalGTQ = seats.length * movie.priceGTQ;
  const totalText = `${formatCurrency(totalGTQ, "GTQ")} | ${formatCurrency(gtqToUsd(totalGTQ), "USD")}`;
  ui.paymentSummary.textContent = `${movie.title} - ${movie.schedule} | Asientos: ${seats.join(", ")} | Total: ${totalText}`;

  ui.paymentModal.classList.remove("hidden");
  ui.paymentModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  ui.cardHolder.focus();
}

function closePaymentModal(resetForm) {
  if (paymentInProgress) {
    return;
  }

  ui.paymentModal.classList.add("hidden");
  ui.paymentModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  if (resetForm) {
    resetPaymentForm();
  }
}

function resetPaymentForm() {
  ui.paymentForm.reset();
  ui.confirmPaymentBtn.disabled = false;
  ui.confirmPaymentBtn.textContent = "Pagar ahora";
  setFormError("");
}

function handlePaymentSubmit(event) {
  event.preventDefault();

  if (paymentInProgress) {
    return;
  }

  const errors = validatePayment();
  if (errors.length > 0) {
    setFormError(errors[0]);
    return;
  }

  setFormError("");
  paymentInProgress = true;
  ui.confirmPaymentBtn.disabled = true;
  ui.confirmPaymentBtn.textContent = "Procesando pago...";

  window.setTimeout(() => {
    paymentInProgress = false;
    ui.confirmPaymentBtn.disabled = false;
    ui.confirmPaymentBtn.textContent = "Pagar ahora";
    finalizeReservation();
  }, 900);
}

function validatePayment() {
  const errors = [];
  const holder = ui.cardHolder.value.trim();
  const email = ui.buyerEmail.value.trim();
  const cardDigits = ui.cardNumber.value.replace(/\s/g, "");
  const expiry = ui.expiryDate.value.trim();
  const cvv = ui.cvv.value.trim();

  if (!/^[A-Za-zÀ-ÿ' ]{3,60}$/.test(holder)) {
    errors.push("Ingresa un nombre de titular valido.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.push("Ingresa un correo valido.");
  }

  if (!/^\d{16}$/.test(cardDigits) || !passesLuhn(cardDigits)) {
    errors.push("Numero de tarjeta invalido.");
  }

  if (!isValidExpiry(expiry)) {
    errors.push("Fecha de vencimiento invalida.");
  }

  if (!/^\d{3}$/.test(cvv)) {
    errors.push("CVV invalido.");
  }

  if (!ui.paymentMethod.value) {
    errors.push("Selecciona un metodo de pago.");
  }

  if (!ui.termsCheck.checked) {
    errors.push("Debes confirmar que los datos son correctos.");
  }

  const occupiedSet = seatAvailability[selectedMovieId] || new Set();
  for (const seat of selectedSeats) {
    if (occupiedSet.has(seat)) {
      errors.push("Uno o mas asientos ya no estan disponibles.");
      break;
    }
  }

  return errors;
}

function finalizeReservation() {
  const movie = movieById.get(selectedMovieId);
  const seats = sortSeatCodes(Array.from(selectedSeats));

  if (!movie || seats.length === 0) {
    showToast("No hay asientos seleccionados para reservar.", true);
    closePaymentModal(true);
    return;
  }

  const totalGTQ = seats.length * movie.priceGTQ;
  const reservation = {
    id: buildReservationId(),
    movieId: movie.id,
    seats,
    quantity: seats.length,
    totalGTQ,
    cardHolder: sanitizeText(ui.cardHolder.value, 60),
    email: sanitizeText(ui.buyerEmail.value, 80),
    paymentMethod: sanitizeText(ui.paymentMethod.value, 40),
    createdAt: new Date().toISOString()
  };

  reservations.unshift(reservation);

  if (!seatAvailability[selectedMovieId]) {
    seatAvailability[selectedMovieId] = new Set();
  }

  for (const seat of seats) {
    seatAvailability[selectedMovieId].add(seat);
  }

  selectedSeats.clear();

  persistState();
  renderSeats();
  updateSummary();
  renderReservations();
  closePaymentModal(true);

  showToast("Reserva confirmada. Tu boleto PDF se descargo.");
  downloadTicketPdf(reservation);
}

function renderReservations() {
  if (reservations.length === 0) {
    ui.reservationsList.innerHTML = "<p class='empty-state'>Aun no tienes reservas activas.</p>";
    return;
  }

  ui.reservationsList.innerHTML = reservations
    .map((reservation) => {
      const movie = movieById.get(reservation.movieId);
      if (!movie) {
        return "";
      }

      const totalPrimary = preferredCurrency === "GTQ" ? formatCurrency(reservation.totalGTQ, "GTQ") : formatCurrency(gtqToUsd(reservation.totalGTQ), "USD");
      const totalSecondary = preferredCurrency === "GTQ" ? formatCurrency(gtqToUsd(reservation.totalGTQ), "USD") : formatCurrency(reservation.totalGTQ, "GTQ");

      return `
        <article class="reservation-item">
          <img src="${movie.poster}" alt="Poster de ${escapeHtml(movie.title)}" />
          <div>
            <h4>${escapeHtml(movie.title)} - ${movie.schedule}</h4>
            <p>Codigo: ${escapeHtml(reservation.id)}</p>
            <p>Asientos: ${escapeHtml(reservation.seats.join(", "))} | Boletos: ${reservation.quantity}</p>
            <p>Total: ${totalPrimary} | ${totalSecondary}</p>
            <p>Cliente: ${escapeHtml(reservation.cardHolder)} | ${escapeHtml(reservation.email)}</p>
            <p>Metodo: ${escapeHtml(reservation.paymentMethod)} | Fecha: ${formatDate(reservation.createdAt)}</p>
          </div>
          <div class="reservation-actions">
            <button type="button" class="btn-secondary" data-action="pdf" data-id="${escapeHtml(reservation.id)}">Boleto PDF</button>
            <button type="button" class="btn-danger" data-action="cancel" data-id="${escapeHtml(reservation.id)}">Cancelar</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function handleReservationActions(event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;
  const reservationId = actionButton.dataset.id;
  const reservation = reservations.find((item) => item.id === reservationId);
  if (!reservation) {
    return;
  }

  if (action === "pdf") {
    downloadTicketPdf(reservation);
    return;
  }

  if (action === "cancel") {
    cancelReservation(reservation.id);
  }
}

function cancelReservation(reservationId) {
  const reservationIndex = reservations.findIndex((item) => item.id === reservationId);
  if (reservationIndex === -1) {
    return;
  }

  const reservation = reservations[reservationIndex];
  const confirmed = window.confirm(`Cancelar la reserva ${reservation.id}?`);
  if (!confirmed) {
    return;
  }

  const occupiedSet = seatAvailability[reservation.movieId] || new Set();
  for (const seat of reservation.seats) {
    occupiedSet.delete(seat);
  }
  seatAvailability[reservation.movieId] = occupiedSet;

  reservations.splice(reservationIndex, 1);

  persistState();
  if (selectedMovieId === reservation.movieId) {
    renderSeats();
    updateSummary();
  }
  renderReservations();

  showToast("Reserva cancelada. Asientos liberados.");
}

function downloadTicketPdf(reservation) {
  const blob = createTicketPdfBlob(reservation);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeId = reservation.id.replace(/[^A-Za-z0-9_-]/g, "");

  anchor.href = url;
  anchor.download = `boleto-${safeId || "cine"}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function createTicketPdfBlob(reservation) {
  const movie = movieById.get(reservation.movieId);
  const lines = [
    "LumiCine Magic - Boleto Oficial",
    `Codigo: ${reservation.id}`,
    `Pelicula: ${movie ? movie.title : "N/A"}`,
    `Horario: ${movie ? movie.schedule : "N/A"}`,
    `Asientos: ${reservation.seats.join(", ")}`,
    `Boletos: ${reservation.quantity}`,
    `Total GTQ: ${formatCurrency(reservation.totalGTQ, "GTQ")}`,
    `Total USD: ${formatCurrency(gtqToUsd(reservation.totalGTQ), "USD")}`,
    `Cliente: ${reservation.cardHolder}`,
    `Correo: ${reservation.email}`,
    `Pago: ${reservation.paymentMethod}`,
    `Fecha: ${new Date(reservation.createdAt).toLocaleString("es-GT")}`,
    "Gracias por tu compra."
  ];

  const streamContent = buildPdfTextStream(lines);

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${byteLength(streamContent)} >>\nstream\n${streamContent}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefStart = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function buildPdfTextStream(lines) {
  const textLines = ["BT", "/F1 17 Tf", "50 760 Td", `(${escapePdfText(toPdfAscii(lines[0]))}) Tj`, "/F1 12 Tf"];

  for (let index = 1; index < lines.length; index += 1) {
    textLines.push(`0 -22 Td (${escapePdfText(toPdfAscii(lines[index]))}) Tj`);
  }

  textLines.push("ET");
  return textLines.join("\n");
}

function applyTheme(theme) {
  const safeTheme = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = safeTheme;
  ui.themeToggle.textContent = safeTheme === "dark" ? "Modo claro" : "Modo oscuro";
  ui.themeToggle.setAttribute("aria-pressed", String(safeTheme === "dark"));
  writeStorage(STORAGE_KEYS.theme, safeTheme);
}

function hydrateSeatAvailability() {
  const parsed = safeParseJson(readStorage(STORAGE_KEYS.seats));

  if (!parsed || typeof parsed !== "object") {
    initializeSeatAvailability();
    return;
  }

  for (const movie of movies) {
    if (Array.isArray(parsed[movie.id])) {
      const validSeats = parsed[movie.id].filter((seat) => isValidSeatCode(seat));
      seatAvailability[movie.id] = new Set(validSeats);
    } else {
      seatAvailability[movie.id] = buildRandomOccupiedSeats();
    }
  }
}

function initializeSeatAvailability() {
  seatAvailability = {};
  for (const movie of movies) {
    seatAvailability[movie.id] = buildRandomOccupiedSeats();
  }
}

function buildRandomOccupiedSeats() {
  const occupied = new Set();
  while (occupied.size < INITIAL_OCCUPIED_PER_MOVIE) {
    const row = SEAT_ROWS[Math.floor(Math.random() * SEAT_ROWS.length)];
    const seatNumber = 1 + Math.floor(Math.random() * SEATS_PER_ROW);
    occupied.add(`${row}${seatNumber}`);
  }
  return occupied;
}

function hydrateReservations() {
  const parsed = safeParseJson(readStorage(STORAGE_KEYS.reservations));

  if (!Array.isArray(parsed)) {
    reservations = [];
    return;
  }

  reservations = parsed
    .map((item) => normalizeReservation(item))
    .filter((item) => item !== null);

  for (const reservation of reservations) {
    if (!seatAvailability[reservation.movieId]) {
      seatAvailability[reservation.movieId] = new Set();
    }

    for (const seat of reservation.seats) {
      seatAvailability[reservation.movieId].add(seat);
    }
  }
}

function normalizeReservation(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  if (!movieById.has(item.movieId)) {
    return null;
  }

  const safeSeats = Array.isArray(item.seats) ? sortSeatCodes(Array.from(new Set(item.seats.filter((seat) => isValidSeatCode(seat))))) : [];
  if (safeSeats.length === 0) {
    return null;
  }

  const movie = movieById.get(item.movieId);
  const totalGTQ = Number.isFinite(Number(item.totalGTQ)) && Number(item.totalGTQ) > 0 ? Number(item.totalGTQ) : safeSeats.length * movie.priceGTQ;

  return {
    id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : buildReservationId(),
    movieId: item.movieId,
    seats: safeSeats,
    quantity: safeSeats.length,
    totalGTQ,
    cardHolder: sanitizeText(item.cardHolder, 60) || "Cliente",
    email: sanitizeText(item.email, 80) || "sin-correo@local",
    paymentMethod: sanitizeText(item.paymentMethod, 40) || "Tarjeta",
    createdAt: isValidDate(item.createdAt) ? item.createdAt : new Date().toISOString()
  };
}

function persistState() {
  writeStorage(STORAGE_KEYS.reservations, JSON.stringify(reservations));
  writeStorage(STORAGE_KEYS.seats, JSON.stringify(serializeSeatAvailability()));
  writeStorage(STORAGE_KEYS.currency, preferredCurrency);
}

function serializeSeatAvailability() {
  const serialized = {};
  for (const movie of movies) {
    const seats = seatAvailability[movie.id] ? Array.from(seatAvailability[movie.id]) : [];
    serialized[movie.id] = sortSeatCodes(seats);
  }
  return serialized;
}

function isValidSeatCode(seatCode) {
  return /^[A-H](10|[1-9])$/.test(String(seatCode || ""));
}

function sortSeatCodes(seats) {
  return seats.sort((first, second) => {
    const rowDiff = first.charCodeAt(0) - second.charCodeAt(0);
    if (rowDiff !== 0) {
      return rowDiff;
    }
    return Number(first.slice(1)) - Number(second.slice(1));
  });
}

function formatCurrency(value, currency) {
  const locale = currency === "GTQ" ? "es-GT" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function gtqToUsd(amountGTQ) {
  return amountGTQ / EXCHANGE_RATE;
}

function passesLuhn(digits) {
  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function isValidExpiry(value) {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  return year > currentYear || (year === currentYear && month >= currentMonth);
}

function setFormError(message) {
  ui.paymentError.textContent = message;
}

function showToast(message, isError) {
  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  ui.toast.textContent = message;
  ui.toast.classList.toggle("error", Boolean(isError));
  ui.toast.classList.add("show");

  toastTimer = window.setTimeout(() => {
    ui.toast.classList.remove("show");
  }, 2800);
}

function buildReservationId() {
  const now = Date.now().toString().slice(-8);
  const randomPart = Math.floor(Math.random() * 900 + 100);
  return `R-${now}-${randomPart}`;
}

function formatDate(isoDate) {
  try {
    return new Date(isoDate).toLocaleString("es-GT", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch (_error) {
    return "Fecha invalida";
  }
}

function safeParseJson(raw) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_error) {
    // Ignore storage errors to keep UI usable.
  }
}

function sanitizeText(value, maxLength) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidDate(dateValue) {
  return !Number.isNaN(new Date(dateValue).getTime());
}

function toPdfAscii(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdfText(text) {
  return text.replace(/[\\()]/g, "\\$&");
}

function byteLength(text) {
  return new TextEncoder().encode(text).length;
}
