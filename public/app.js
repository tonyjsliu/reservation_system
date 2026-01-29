const TOKEN_KEY = "hilton_token";

const userText = document.getElementById("userText");
const userContact = document.getElementById("userContact");
const logoutBtn = document.getElementById("logoutBtn");
const message = document.getElementById("message");
const authSection = document.getElementById("authSection");
const guestSection = document.getElementById("guestSection");
const employeeSection = document.getElementById("employeeSection");
const guestTitle = document.getElementById("guestTitle");
const guestManageSection = document.getElementById("guestManageSection");
const guestIdentityFields = document.getElementById("guestIdentityFields");

const guestName = document.getElementById("guestName");
const guestPhone = document.getElementById("guestPhone");
const guestEmail = document.getElementById("guestEmail");
const arrivalDate = document.getElementById("arrivalDate");
const arrivalTime = document.getElementById("arrivalTime");
const mealPeriod = document.getElementById("mealPeriod");
const tableSize = document.getElementById("tableSize");
const createReservationBtn = document.getElementById("createReservationBtn");

const registerName = document.getElementById("registerName");
const registerEmail = document.getElementById("registerEmail");
const registerPhone = document.getElementById("registerPhone");
const registerPassword = document.getElementById("registerPassword");
const registerRole = document.getElementById("registerRole");
const registerBtn = document.getElementById("registerBtn");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");

const loadMyReservationsBtn = document.getElementById("loadMyReservationsBtn");
const guestReservationList = document.getElementById("guestReservationList");

const filterDate = document.getElementById("filterDate");
const filterStatus = document.getElementById("filterStatus");
const loadReservationsBtn = document.getElementById("loadReservationsBtn");
const reservationList = document.getElementById("reservationList");

let currentUser = null;
let reservations = [];
let guestReservations = [];

const MEAL_TIME_RANGE = {
  Lunch: { start: "10:30", end: "14:30" },
  Dinner: { start: "17:00", end: "22:00" }
};

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function showMessage(text, isError) {
  if (!text) {
    message.classList.add("hidden");
    message.textContent = "";
    return;
  }
  message.classList.remove("hidden");
  message.textContent = text;
  message.style.background = isError ? "#fecaca" : "#e2e8f0";
}

async function request(url, options) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options && options.headers ? options.headers : {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

async function gql(query, variables) {
  const response = await request("/graphql", {
    method: "POST",
    body: JSON.stringify({ query, variables })
  });
  if (response.errors && response.errors.length > 0) {
    throw new Error(response.errors[0].message);
  }
  return response.data;
}

function renderUser() {
  if (currentUser) {
    userText.textContent = `${currentUser.name} (${currentUser.role})`;
    logoutBtn.classList.remove("hidden");
  } else {
    userText.textContent = "Not signed in";
    logoutBtn.classList.add("hidden");
  }
}

function updateVisibility() {
  if (!currentUser) {
    authSection.classList.remove("hidden");
    guestSection.classList.remove("hidden");
    guestTitle.textContent = "Quick Reservation";
    userContact.classList.add("hidden");
    guestIdentityFields.classList.remove("hidden");
    guestManageSection.classList.add("hidden");
    employeeSection.classList.add("hidden");
    return;
  }

  authSection.classList.add("hidden");
  if (currentUser.role === "guest") {
    guestSection.classList.remove("hidden");
    guestTitle.textContent = "Guest Reservation";
    guestManageSection.classList.remove("hidden");
    userContact.classList.remove("hidden");
    userContact.textContent = `${currentUser.phone} · ${currentUser.email}`;
    guestIdentityFields.classList.add("hidden");
    employeeSection.classList.add("hidden");
  } else {
    guestSection.classList.add("hidden");
    userContact.classList.add("hidden");
    employeeSection.classList.remove("hidden");
  }
}

function renderReservations() {
  reservationList.innerHTML = "";
  if (reservations.length === 0) {
    reservationList.innerHTML = "<p>No data</p>";
    return;
  }
  const sorted = [...reservations].sort((a, b) =>
    b.expectedArrivalTime.localeCompare(a.expectedArrivalTime)
  );
  sorted.forEach((item) => {
    const card = document.createElement("div");
    card.className = "list-item";
    const parsed = splitArrivalDateTime(item.expectedArrivalTime);
    const dateText = parsed ? parsed.date : item.expectedArrivalTime;
    const timeText = parsed ? parsed.time : "";
    const timePart = timeText ? ` ${timeText}` : "";
    const isReadonly = item.status === "Cancelled" || item.status === "Completed";
    let actionsHtml = "";
    if (!isReadonly) {
      if (item.status === "Requested") {
        actionsHtml = `<div class="actions">
          <button data-id="${item.id}" data-status="Approved">Approve</button>
          <button data-id="${item.id}" data-status="Cancelled">Cancel</button>
        </div>`;
      } else if (item.status === "Approved") {
        actionsHtml = `<div class="actions">
          <button data-id="${item.id}" data-status="Completed">Complete</button>
          <button data-id="${item.id}" data-status="Cancelled">Cancel</button>
        </div>`;
      }
    }
    card.innerHTML = `
      <div>${dateText}${timePart} | ${formatMealPeriod(item.mealPeriod)} | ${item.tableSize}</div>
      <div>${item.guestName} · ${item.guestPhone} · ${item.guestEmail}</div>
      <div class="status-row">
        <span class="status ${item.status.toLowerCase()}">${item.status}</span>
        ${currentUser && currentUser.role === "employee" ? actionsHtml : ""}
      </div>
    `;
    reservationList.appendChild(card);
  });

  reservationList.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const status = btn.getAttribute("data-status");
      await handleUpdateStatus(id, status);
    });
  });
}

function renderGuestReservations() {
  guestReservationList.innerHTML = "";
  if (guestReservations.length === 0) {
    guestReservationList.innerHTML = "<p>No data</p>";
    return;
  }
  const sorted = [...guestReservations].sort((a, b) =>
    b.expectedArrivalTime.localeCompare(a.expectedArrivalTime)
  );
  sorted.forEach((item) => {
    const card = document.createElement("div");
    card.className = "list-item";
    const parsed = splitArrivalDateTime(item.expectedArrivalTime);
    const isReadonly = item.status === "Cancelled" || item.status === "Completed";
    const dateText = parsed ? parsed.date : item.expectedArrivalTime;
    const timeText = parsed ? parsed.time : "";
    const timePart = timeText ? ` ${timeText}` : "";
    const actionButtons = isReadonly
      ? ""
      : `
        <div class="actions">
          <button data-action="update" data-id="${item.id}">Update</button>
          <button data-action="cancel" data-id="${item.id}">Cancel</button>
        </div>
      `;
    card.innerHTML = `
      <div>${dateText}${timePart} | ${formatMealPeriod(item.mealPeriod)} | ${item.tableSize}</div>
      <div class="status-row">
        <span class="status ${item.status.toLowerCase()}">${item.status}</span>
      </div>
      <div class="grid">
        <input type="date" data-field="date" data-id="${item.id}" value="${parsed ? parsed.date : ""}" ${isReadonly ? "disabled" : ""} />
        <input type="time" data-field="time" data-id="${item.id}" value="${parsed ? parsed.time : ""}" ${isReadonly ? "disabled" : ""} />
        <select data-field="meal" data-id="${item.id}" ${isReadonly ? "disabled" : ""}>
          <option value="Lunch" ${item.mealPeriod === "Lunch" ? "selected" : ""}>Lunch</option>
          <option value="Dinner" ${item.mealPeriod === "Dinner" ? "selected" : ""}>Dinner</option>
        </select>
        <input type="number" min="1" max="10" data-field="size" data-id="${item.id}" value="${item.tableSize}" ${isReadonly ? "disabled" : ""} />
      </div>
      ${actionButtons}
      <div class="inline-result" data-result-id="${item.id}"></div>
    `;
    guestReservationList.appendChild(card);
    const dateInput = card.querySelector("input[data-field='date']");
    if (dateInput) {
      dateInput.min = getTodayDate();
    }
  });

  guestReservationList.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!id) return;
      if (action === "update") {
        await handleUpdateReservationFromList(id);
        return;
      }
      if (action === "cancel") {
        await handleCancelReservationFromList(id);
      }
    });
  });

  guestReservationList
    .querySelectorAll("select[data-field='meal']")
    .forEach((select) => {
      const id = select.getAttribute("data-id");
      const timeInput = guestReservationList.querySelector(
        `input[data-field='time'][data-id='${id}']`
      );
      if (timeInput) {
        updateTimeRange(select, timeInput);
      }
      select.addEventListener("change", () => {
        const timeInputNext = guestReservationList.querySelector(
          `input[data-field='time'][data-id='${id}']`
        );
        if (timeInputNext) {
          updateTimeRange(select, timeInputNext);
        }
      });
    });
}

function formatMealPeriod(value) {
  return value === "Lunch" ? "Lunch" : "Dinner";
}

async function handleRegister() {
  try {
    const data = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: registerName.value.trim(),
        email: registerEmail.value.trim(),
        phone: registerPhone.value.trim(),
        password: registerPassword.value,
        role: registerRole.value
      })
    });
    showMessage(`Registered: ${data.email}`);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function handleLogin() {
  try {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: loginEmail.value.trim(),
        password: loginPassword.value
      })
    });
    setToken(data.token);
    currentUser = data.user;
    renderUser();
    updateVisibility();
    showMessage(`Welcome, ${data.user.name}`);
    if (currentUser.role === "employee") {
      await handleLoadReservations();
    } else {
      await handleLoadMyReservations();
    }
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function handleLogout() {
  setToken(null);
  currentUser = null;
  reservations = [];
  guestReservations = [];
  renderUser();
  updateVisibility();
  renderReservations();
  renderGuestReservations();
}

async function initSession() {
  const token = getToken();
  if (!token) {
    renderUser();
    updateVisibility();
    return;
  }
  try {
    const user = await request("/auth/me");
    currentUser = user;
    renderUser();
    updateVisibility();
    if (currentUser.role === "employee") {
      await handleLoadReservations();
    } else {
      await handleLoadMyReservations();
    }
  } catch {
    setToken(null);
    currentUser = null;
    renderUser();
    updateVisibility();
  }
}

async function handleCreateReservation() {
  try {
    if (!arrivalDate.value || !arrivalTime.value || !tableSize.value) {
      showMessage("Please complete all fields for reservation", true);
      return;
    }
    const isQuickReservation = !currentUser;
    if (
      isQuickReservation &&
      (!guestName.value.trim() ||
        !guestPhone.value.trim() ||
        !guestEmail.value.trim())
    ) {
      showMessage("Please complete all fields for quick reservation", true);
      return;
    }
    const expectedArrivalTime = buildArrivalDateTime(
      arrivalDate.value,
      arrivalTime.value
    );
    validateArrivalTime({
      dateValue: arrivalDate.value,
      timeValue: arrivalTime.value,
      mealPeriod: mealPeriod.value
    });
    const data = await gql(
      `mutation Create($input: ReservationInput!) {
        createReservation(input: $input) {
          id
          guestName
          guestEmail
          guestPhone
          expectedArrivalTime
          mealPeriod
          tableSize
          status
        }
      }`,
      {
        input: {
          guestName: isQuickReservation ? guestName.value.trim() : currentUser.name,
          guestPhone: isQuickReservation ? guestPhone.value.trim() : currentUser.phone,
          guestEmail: isQuickReservation ? guestEmail.value.trim() : currentUser.email,
          expectedArrivalTime,
          mealPeriod: mealPeriod.value,
          tableSize: Number(tableSize.value)
        }
      }
    );
    reservations = [data.createReservation, ...reservations];
    renderReservations();
    showMessage("Reservation submitted");
  } catch (error) {
    showMessage(error.message, true);
  }
}

function buildArrivalDateTime(dateValue, timeValue) {
  if (!dateValue) {
    throw new Error("Please select a reservation date");
  }
  if (!timeValue) {
    throw new Error("Please select an arrival time");
  }
  return `${dateValue} ${timeValue}`;
}


function validateArrivalTime({ dateValue, timeValue, mealPeriod }) {
  if (!dateValue || !timeValue) {
    throw new Error("Please provide both date and time");
  }
  const range = MEAL_TIME_RANGE[mealPeriod];
  if (!range) {
    throw new Error("Please choose a meal period");
  }
  if (timeValue < range.start || timeValue > range.end) {
    throw new Error(
      mealPeriod === "Lunch"
        ? "Lunch arrival time must be between 10:30 and 14:30"
        : "Dinner arrival time must be between 17:00 and 22:00"
    );
  }

  const now = new Date();
  const candidate = new Date(`${dateValue}T${timeValue}:00`);
  if (Number.isNaN(candidate.getTime())) {
    throw new Error("Invalid arrival time format");
  }
  if (candidate.getTime() < now.getTime()) {
    throw new Error("Past time is not allowed");
  }
}

function updateDateMin() {
  arrivalDate.min = getTodayDate();
}

function updateTimeRange(targetSelect, targetInput) {
  const range = MEAL_TIME_RANGE[targetSelect.value];
  if (!range) return;
  targetInput.min = range.start;
  targetInput.max = range.end;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function splitArrivalDateTime(value) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
  if (!match) return null;
  return { date: match[1], time: match[2] };
}

function getListFieldValue(id, field) {
  const input = guestReservationList.querySelector(
    `[data-field='${field}'][data-id='${id}']`
  );
  return input ? input.value : "";
}

function setInlineResult(id, text, isError) {
  const container = guestReservationList.querySelector(
    `[data-result-id='${id}']`
  );
  if (!container) return;
  container.textContent = text || "";
  container.classList.toggle("error", Boolean(isError));
}

async function handleUpdateReservationFromList(id) {
  try {
    const dateValue = getListFieldValue(id, "date");
    const timeValue = getListFieldValue(id, "time");
    const mealValue = getListFieldValue(id, "meal");
    const sizeValue = getListFieldValue(id, "size");
    if (!dateValue || !timeValue || !mealValue || !sizeValue) {
      showMessage("Please complete all fields before updating", true);
      return;
    }
    const expectedArrivalTime = buildArrivalDateTime(dateValue, timeValue);
    validateArrivalTime({
      dateValue,
      timeValue,
      mealPeriod: mealValue
    });
    const input = {
      expectedArrivalTime,
      mealPeriod: mealValue,
      tableSize: Number(sizeValue)
    };
    const data = await gql(
      `mutation Update($id: ID!, $input: ReservationUpdateInput!) {
        updateReservation(id: $id, input: $input) {
          id
          status
          expectedArrivalTime
          mealPeriod
          tableSize
        }
      }`,
      { id, input }
    );
    setInlineResult(
      id,
      data.updateReservation ? "Reservation updated" : "Reservation not found",
      !data.updateReservation
    );
    await handleLoadMyReservations();
  } catch (error) {
    setInlineResult(id, error.message, true);
  }
}

async function handleCancelReservationFromList(id) {
  try {
    const data = await gql(
      `mutation Cancel($id: ID!) {
        cancelReservation(id: $id) {
          id
          status
        }
      }`,
      { id }
    );
    setInlineResult(
      id,
      data.cancelReservation ? "Reservation cancelled" : "Reservation not found",
      !data.cancelReservation
    );
    await handleLoadMyReservations();
  } catch (error) {
    setInlineResult(id, error.message, true);
  }
}

async function handleLoadReservations() {
  try {
    const data = await gql(
      `query List($date: String, $status: ReservationStatus) {
        reservations(date: $date, status: $status) {
          id
          guestName
          guestEmail
          guestPhone
          expectedArrivalTime
          mealPeriod
          tableSize
          status
        }
      }`,
      {
        date: filterDate.value.trim() || undefined,
        status: filterStatus.value || undefined
      }
    );
    reservations = data.reservations;
    renderReservations();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function handleLoadMyReservations() {
  try {
    const data = await gql(
      `query MyReservations {
        myReservations {
          id
          guestName
          guestEmail
          guestPhone
          expectedArrivalTime
          mealPeriod
          tableSize
          status
        }
      }`
    );
    guestReservations = data.myReservations;
    renderGuestReservations();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function handleUpdateStatus(id, status) {
  try {
    const data = await gql(
      `mutation UpdateStatus($id: ID!, $status: ReservationStatus!) {
        updateReservationStatus(id: $id, status: $status) {
          id
          status
        }
      }`,
      { id, status }
    );
    reservations = reservations.map((item) =>
      item.id === id ? { ...item, status: data.updateReservationStatus.status } : item
    );
    renderReservations();
  } catch (error) {
    showMessage(error.message, true);
  }
}

createReservationBtn.addEventListener("click", handleCreateReservation);
registerBtn.addEventListener("click", handleRegister);
loginBtn.addEventListener("click", handleLogin);
logoutBtn.addEventListener("click", handleLogout);
loadReservationsBtn.addEventListener("click", handleLoadReservations);
loadMyReservationsBtn.addEventListener("click", handleLoadMyReservations);
mealPeriod.addEventListener("change", () =>
  updateTimeRange(mealPeriod, arrivalTime)
);
filterDate.addEventListener("change", () => {
  if (currentUser && currentUser.role === "employee") {
    handleLoadReservations();
  }
});
filterStatus.addEventListener("change", () => {
  if (currentUser && currentUser.role === "employee") {
    handleLoadReservations();
  }
});

renderReservations();
renderGuestReservations();
updateDateMin();
updateTimeRange(mealPeriod, arrivalTime);
initSession();
