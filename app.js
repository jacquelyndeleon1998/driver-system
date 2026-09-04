const WEBAPP_BASE = "https://script.google.com/macros/s/AKfycbwmIeIvWLqlT2h3pBQz_RoO7IjYFRz9QopTt8S_dhX1qq4fW7or6E8sMs-d3rQ36e4S/exec";
const SECRET_TOKEN = "VIP-Secure-2026-Dispatch"; 
const WEBAPP_URL = `${WEBAPP_BASE}?token=${encodeURIComponent(SECRET_TOKEN)}`;
const sheetURL = `${WEBAPP_BASE}?action=fetchScheduleCSV&token=${encodeURIComponent(SECRET_TOKEN)}`;
const approvalURL = `${WEBAPP_BASE}?action=fetchApprovalCSV&token=${encodeURIComponent(SECRET_TOKEN)}`;

let submittedDrivers = {};
let selectedReceipts = [];
let currentDriver = "", currentDate = "", currentPassengerCombined = "";
let currentTripType = "";
let isSubmitting = false;
let grouped = {};
let summaryDrivers = {};
let approvalDates = {};
let approvalNotes = {};
let approvalConfirmations = {};
let scheduleDates = [];
let globalParsedAllowances = [];
let loggedInDriverName = "";

function logoutUser() {
    localStorage.removeItem("driverLoggedIn");
    localStorage.removeItem("driverName");
    localStorage.removeItem("driverRole");
    localStorage.removeItem("username");
    localStorage.removeItem("userRole");
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("loginExpires");
    location.reload();
}

function standardizeDateStr(dateStr) {
    if (!dateStr) return "";
    const cleanStr = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        return cleanStr.toLowerCase();
    }
    const parsed = new Date(cleanStr);
    if (isNaN(parsed.getTime())) return cleanStr.toLowerCase();
    
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
    
function refreshLoginSession() {
    const now = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);

    localStorage.setItem("loginExpires", midnight.getTime());
}

function checkAdminSession() {
    const loggedIn = localStorage.getItem("driverLoggedIn") === "true" || localStorage.getItem("loggedIn") === "true";
    const expires = Number(localStorage.getItem("loginExpires") || 0);

    if (loggedIn && Date.now() >= expires) {
        logoutUser();
    }
}

function configureNavigation(role) {
    const allowanceBtn = document.getElementById("allowanceBtn");
    const requestBtn = document.getElementById("requestBtn");
    const sepAllowanceRequest = document.getElementById("sepAllowanceRequest");
    const adminBtn = document.getElementById("adminBtn");
    const manualBtn = document.getElementById("manualBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    const sepDashboardAllowance = document.getElementById("sepDashboardAllowance");
    const sepAllowanceAdmin = document.getElementById("sepAllowanceAdmin");
    const sepAdminManual = document.getElementById("sepAdminManual");
    const sepManualLogout = document.getElementById("sepManualLogout");
    const sepAdminLogout = document.getElementById("sepAdminLogout");

    if (allowanceBtn) allowanceBtn.style.display = "";
    if (requestBtn) requestBtn.style.display = "none";
    if (adminBtn) adminBtn.style.display = "";
    if (manualBtn) manualBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "";

    if (sepDashboardAllowance) sepDashboardAllowance.style.display = "";
    if (sepAllowanceRequest) sepAllowanceRequest.style.display = "none";
    if (sepAllowanceAdmin) sepAllowanceAdmin.style.display = "";
    if (sepAdminManual) sepAdminManual.style.display = "none";
    if (sepManualLogout) sepManualLogout.style.display = "none";
    if (sepAdminLogout) sepAdminLogout.style.display = "";

    switch (role) {
        case "driver":
            if (requestBtn) requestBtn.style.display = "";
            if (sepAllowanceRequest) sepAllowanceRequest.style.display = "";
            if (adminBtn) adminBtn.style.display = "none";
            if (manualBtn) manualBtn.style.display = "none";
            if (sepAllowanceAdmin) sepAllowanceAdmin.style.display = "none";
            if (sepAdminManual) sepAdminManual.style.display = "none";
            if (sepManualLogout) sepManualLogout.style.display = "none";
            if (sepAdminLogout) sepAdminLogout.style.display = "";
            break;

        case "admin":
            if (allowanceBtn) allowanceBtn.style.display = "none";
            if (requestBtn) requestBtn.style.display = "none";
            if (sepDashboardAllowance) sepDashboardAllowance.style.display = "none";
            if (sepAllowanceRequest) sepAllowanceRequest.style.display = "none";
            if (adminBtn) adminBtn.style.display = "";
            if (manualBtn) manualBtn.style.display = "";
            if (sepAllowanceAdmin) sepAllowanceAdmin.style.display = "";
            if (sepAdminManual) sepAdminManual.style.display = "";
            if (sepManualLogout) sepManualLogout.style.display = "";
            if (sepAdminLogout) sepAdminLogout.style.display = "none";
            break;

        case "organic":
            if (allowanceBtn) allowanceBtn.style.display = "none";
            if (requestBtn) requestBtn.style.display = "none";
            if (adminBtn) adminBtn.style.display = "none";
            if (manualBtn) manualBtn.style.display = "none";
            if (sepDashboardAllowance) sepDashboardAllowance.style.display = "none";
            if (sepAllowanceRequest) sepAllowanceRequest.style.display = "none";
            if (sepAllowanceAdmin) sepAllowanceAdmin.style.display = "none";
            if (sepAdminManual) sepAdminManual.style.display = "none";
            if (sepManualLogout) sepManualLogout.style.display = "none";
            if (sepAdminLogout) sepAdminLogout.style.display = "none";
            break;
    }
}

async function showAdminDashboard() {
    const driverDashboard = document.getElementById("driverDashboard");
    const scheduleApprovalPage = document.getElementById("scheduleApprovalPage");
    const driverAllowancePage = document.getElementById("driverAllowancePage");
    const driverRequestsPage = document.getElementById("driverRequestsPage");
    const scheduleViewerPage = document.getElementById("scheduleViewerPage");
    const allowanceSummaryBody = document.getElementById("allowanceSummaryBody");

    if (driverDashboard) driverDashboard.style.display = "none";
    if (driverAllowancePage) driverAllowancePage.style.display = "none";
    if (scheduleViewerPage) scheduleViewerPage.style.display = "none";
    if (driverRequestsPage) driverRequestsPage.style.display = "none";

    if (scheduleApprovalPage) {
        scheduleApprovalPage.style.display = "block";
    } else {
        console.error("scheduleApprovalPage was not found.");
        return;
    }

    const dashboardBtn = document.getElementById("dashboardBtn");
    const adminBtn = document.getElementById("adminBtn");
    const allowanceBtn = document.getElementById("allowanceBtn");

    if (dashboardBtn) dashboardBtn.classList.remove("active");
    if (adminBtn) adminBtn.classList.add("active");
    if (allowanceBtn) allowanceBtn.classList.remove("active");

    document.querySelectorAll(".approval-container").forEach(el => el.style.display = "");
    document.querySelectorAll(".schedule-header").forEach(el => el.style.display = "");
    document.querySelectorAll(".approval-footer").forEach(el => el.style.display = "");

    sessionStorage.setItem("view", "admin");

    if (allowanceSummaryBody) {
        allowanceSummaryBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; padding:16px; color:#6b7280;">
                    Loading allowance summary...
                </td>
            </tr>
        `;
    }

    try {
        await Promise.all([
            fetchLiveAllowancesFromSheet(),
            loadDriverRequests()
        ]);
    } catch (err) {
        console.warn("Could not refresh live admin data:", err);
    }

    if (typeof processAllowanceSummaryTable === "function") {
        try {
            processAllowanceSummaryTable();
        } catch (err) {
            console.warn("Allowance summary refresh failed:", err);
        }
    }

    if (typeof hideActionLoading === "function") {
        hideActionLoading();
    }

    window.scrollTo(0, 0);
}

function isVehicleCodingDay(vehicle, date) {
    const cleanVehicle = String(vehicle || "").trim().toUpperCase();
    if (!cleanVehicle || !date) return false;

    const scheduleDate = new Date(date);
    if (isNaN(scheduleDate.getTime())) return false;

    const day = scheduleDate.getDay();
    const codingVehicles = {
        2: ["NCS", "NCS 8464"],
        3: ["NDJ", "NDJ 7545", "NIB", "NIB 9125"],
        4: ["UOW", "UOW 338", "NKT", "NKT 4238"],
        5: ["NCJ", "NCJ 3650"]
    };

    const vehiclesForDay = codingVehicles[day] || [];
    return vehiclesForDay.some(codingVehicle => cleanVehicle === codingVehicle || cleanVehicle.startsWith(codingVehicle + " "));
}

function getCodingHighlightStyle(vehicle, date) {
    if (!isVehicleCodingDay(vehicle, date)) return "";
    return `background:#dcfce7; border-radius:4px; padding:2px 5px;`;
}
    
async function loadSubmittedAllowances() {
    try {
        const res = await fetch(`${WEBAPP_BASE}?action=submitted&token=${encodeURIComponent(SECRET_TOKEN)}&_nc=${Date.now()}`);
        if (!res.ok) return;

        const text = await res.text();
        if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) return;

        const data = JSON.parse(text);
        if (!Array.isArray(data.submitted)) return;

        submittedDrivers = {};
        data.submitted.forEach(item => {
            const [driver, rawDate] = item.split("|");
            const cleanDriver = driver.trim().replace(/\s+/g, " ").toLowerCase();
            const cleanKey = `${cleanDriver}|${standardizeDateStr(rawDate)}`;
            submittedDrivers[cleanKey] = true;
        });
    } catch (err) {
        console.warn("Error loading submitted allowances:", err);
    }
}

async function fetchLiveAllowancesFromSheet() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`${WEBAPP_BASE}?action=getAllowancesData&token=${encodeURIComponent(SECRET_TOKEN)}&_nc=${Date.now()}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) return;

        const text = await response.text();
        if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) return;

        const jsonResult = JSON.parse(text);
        if (!jsonResult || !jsonResult.success || !Array.isArray(jsonResult.data)) return;

        const newParsedAllowances = [];
        jsonResult.data.forEach(row => {
            const rawTripDate = row.date || "";
            const driverName = row.driver || "";
            const totalAllowance = parseFloat(row.total) || 0;
            const rawStatus = row.status || "";
            const lowerStatus = (rawStatus || "").trim().toLowerCase();

            let itemStatus = rawStatus || "For Review";
            if (lowerStatus === "approved" || lowerStatus === "paid") {
                itemStatus = "Paid";
            } else if (lowerStatus === "pay") {
                itemStatus = "Pay";
            } else if (lowerStatus === "for review") {
                itemStatus = "For Review";
            }

            if (driverName && rawTripDate) {
                newParsedAllowances.push({
                    name: driverName,
                    date: rawTripDate,
                    passenger: row.passenger || "",
                    timeIn: row.timeIn || "",
                    timeOut: row.timeOut || "",
                    breakfast: Number(row.breakfast) || 0,
                    lunch: Number(row.lunch) || 0,
                    dinner: Number(row.dinner) || 0,
                    parking: Number(row.parking) || 0,
                    receipt: row.receipt || "",
                    remarks: row.remarks || "",
                    amount: totalAllowance,
                    status: itemStatus
                });
            }
        });

        if (newParsedAllowances.length > 0 || globalParsedAllowances.length === 0) {
            globalParsedAllowances = newParsedAllowances;
        }
    } catch (err) {
        console.warn("fetchLiveAllowancesFromSheet error:", err);
    }
}

async function loadDriverRequests() {
    const body = document.getElementById("driverRequestBody");
    const driverBody = document.getElementById("driverRequestsTableBody");

    if (!body && !driverBody) return;

    try {
        const loadingBody = body || driverBody;
        if (loadingBody) {
            loadingBody.innerHTML = `<tr><td colspan="${body ? 6 : 5}" style="text-align:center; padding:16px;">Loading driver requests...</td></tr>`;
        }

        const url = `${WEBAPP_BASE}?action=fetchDriverRequestsCSV&token=${encodeURIComponent(SECRET_TOKEN)}&_nc=${Date.now()}`;
        let response = null;

        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                response = await fetch(url, { method: "GET", cache: "no-store", credentials: "omit" });
                if (response.ok) break;
            } catch (fetchError) {}
            if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!response || !response.ok) return;

        const csvText = await response.text();
        const trimmedCSV = csvText.trim();

        if (!trimmedCSV || trimmedCSV.startsWith("<!DOCTYPE") || trimmedCSV.startsWith("<html") || trimmedCSV === "UNAUTHORIZED") {
            return;
        }

        const lines = trimmedCSV.split(/\r?\n/);
        if (lines.length <= 1) {
            window.driverRequestRecords = [];
            if (body) renderDriverRequests();
            if (driverBody) renderDriverRequestsForDriver();
            return;
        }

        const records = lines.slice(1).map(line => {
            const cols = parseCSVRow(line);
            return {
                date: String(cols[0] || "").trim(),
                driverName: String(cols[1] || "").trim(),
                request: String(cols[2] || "").trim(),
                reason: String(cols[3] || "").trim(),
                requestedTime: String(cols[4] || "").trim(),
                requestStatus: String(cols[5] || "").trim()
            };
        }).filter(r => r.date || r.driverName || r.request);

        window.driverRequestRecords = records;

        if (body) renderDriverRequests();
        if (driverBody) renderDriverRequestsForDriver();
        if (typeof updateCutoffDropdownsDynamically === "function") updateCutoffDropdownsDynamically();
    } catch (error) {
        console.error("Error loading Driver Requests:", error);
    }
}

function renderDriverRequestsForDriver() {
    const body = document.getElementById("driverRequestsTableBody");
    if (!body) return;

    const driverName = (localStorage.getItem("username") || "").trim();
    if (!driverName) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:16px; color:#b91c1c;">Driver name not found.</td></tr>`;
        return;
    }

    const records = window.driverRequestRecords || [];
    const driverRecords = records.filter(record => String(record.driverName || "").trim().toLowerCase() === driverName.toLowerCase());

    if (driverRecords.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#6b7280; padding:25px;">No requests yet.</td></tr>`;
        return;
    }

    body.innerHTML = driverRecords.map(record => `
        <tr>
            <td>${record.date || ""}</td>
            <td>${record.request || ""}</td>
            <td>${record.reason || ""}</td>
            <td>${record.requestedTime || ""}</td>
            <td><span class="driver-request-status">${record.requestStatus || "Pending"}</span></td>
        </tr>
    `).join("");
}

function renderDriverRequests() {
    const body = document.getElementById("driverRequestBody");
    const cutoffSelect = document.getElementById("driverRequestCutoff");
    if (!body) return;

    const records = window.driverRequestRecords || [];
    const selectedCutoff = cutoffSelect?.value || "";

    if (records.length === 0) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#6b7280; padding:25px;">No driver requests found.</td></tr>`;
        return;
    }

    let cutoffMonth = null, cutoffBucket = null;
    if (selectedCutoff) {
        const parts = selectedCutoff.split("-");
        if (parts.length === 2) {
            cutoffMonth = Number(parts[0]);
            cutoffBucket = Number(parts[1]);
        }
    }

    let filteredRecords = records;
    if (cutoffMonth && cutoffBucket) {
        filteredRecords = records.filter(record => {
            const rawDate = String(record.date || "").trim();
            const match = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (!match) return false;

            const month = Number(match[2]);
            const day = Number(match[3]);

            if (month !== cutoffMonth) return false;
            return cutoffBucket === 1 ? (day >= 1 && day <= 15) : (day >= 16);
        });
    }

    if (filteredRecords.length === 0) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#6b7280; padding:25px;">No driver requests found for this cut-off window.</td></tr>`;
        return;
    }

    body.innerHTML = filteredRecords.map(record => {
        const status = String(record.requestStatus || "Pending").trim();
        return `
            <tr>
                <td>${record.date || ""}</td>
                <td>${record.driverName || ""}</td>
                <td>${record.request || ""}</td>
                <td>${record.reason || ""}</td>
                <td>${record.requestedTime || ""}</td>
                <td>
                    ${status.toLowerCase() === "pending"
                        ? `<button type="button" class="driver-request-status pending" style="background:#ffffff; color:#374151; border:1px solid #d1d5db; padding:5px 10px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;" onclick="showDriverRequestAction('${encodeURIComponent(record.date || "")}', '${encodeURIComponent(record.driverName || "")}', '${encodeURIComponent(record.request || "")}')">Pending</button>`
                        : `<span class="driver-request-status ${status.toLowerCase()}">${status}</span>`
                    }
                </td>
            </tr>
        `;
    }).join("");
}

let pendingDriverRequestSubmission = null;

function openRequestConfirmModal(requestDate, requestType, reasonDuty, requestedTime, submitFunction) {
    document.getElementById("confirmRequestDate").textContent = requestDate || "N/A";
    document.getElementById("confirmRequestType").textContent = requestType || "N/A";
    document.getElementById("confirmReasonDuty").textContent = reasonDuty || "N/A";
    document.getElementById("confirmRequestedTime").textContent = requestedTime || "N/A";
    pendingDriverRequestSubmission = submitFunction;
    document.getElementById("requestConfirmModal").style.display = "flex";
}

let selectedDriverRequestAction = null;

function showDriverRequestAction(requestDate, driverName, requestType) {
    selectedDriverRequestAction = {
        date: decodeURIComponent(requestDate),
        driverName: decodeURIComponent(driverName),
        request: decodeURIComponent(requestType)
    };
    const modal = document.getElementById("driverRequestActionModal");
    if (modal) modal.style.display = "flex";
}

function closeDriverRequestActionModal() {
    const modal = document.getElementById("driverRequestActionModal");
    if (modal) modal.style.display = "none";
    selectedDriverRequestAction = null;
}

let pendingDriverRequestStatus = "";

function processDriverRequestAction(status) {
    if (!selectedDriverRequestAction) return;
    pendingDriverRequestStatus = status;

    const message = document.getElementById("driverRequestConfirmMessage");
    const button = document.getElementById("driverRequestConfirmButton");

    if (message) message.textContent = status === "Approved" ? "Are you sure you want to approve this request?" : "Are you sure you want to deny this request?";
    if (button) {
        button.textContent = status === "Approved" ? "Approve" : "Deny";
        button.classList.remove("request-modal-submit", "request-modal-deny");
        button.classList.add(status === "Approved" ? "request-modal-submit" : "request-modal-deny");
    }

    const actionModal = document.getElementById("driverRequestActionModal");
    if (actionModal) actionModal.style.display = "none";

    const confirmModal = document.getElementById("driverRequestConfirmModal");
    if (confirmModal) confirmModal.style.display = "flex";
}

function closeDriverRequestConfirmModal() {
    const modal = document.getElementById("driverRequestConfirmModal");
    if (modal) modal.style.display = "none";
    pendingDriverRequestStatus = null;
}

async function confirmDriverRequestAction() {
    if (!selectedDriverRequestAction || !pendingDriverRequestStatus) return;

    const requestData = selectedDriverRequestAction;
    const status = pendingDriverRequestStatus;

    const confirmModal = document.getElementById("driverRequestConfirmModal");
    if (confirmModal) confirmModal.style.display = "none";

    try {
        showActionLoading(status === "Approved" ? "Approving Request..." : "Denying Request...", "Please wait while the request is being updated.");

        const requestURL = `${WEBAPP_BASE}?action=updateDriverRequestStatus&date=${encodeURIComponent(requestData.date)}&driverName=${encodeURIComponent(requestData.driverName)}&request=${encodeURIComponent(requestData.request)}&status=${encodeURIComponent(status)}&token=${encodeURIComponent(SECRET_TOKEN)}&_nc=${Date.now()}`;
        const response = await fetch(requestURL, { method: "GET", cache: "no-store", credentials: "omit" });
        const text = await response.text();
        const result = JSON.parse(text);

        if (!result.success) throw new Error(result.message || "Unable to update request status.");

        const records = window.driverRequestRecords || [];
        const matchingRecord = records.find(record =>
            String(record.date || "").trim() === requestData.date &&
            String(record.driverName || "").trim().toLowerCase() === requestData.driverName.toLowerCase() &&
            String(record.request || "").trim().toLowerCase() === requestData.request.toLowerCase()
        );

        if (matchingRecord) matchingRecord.requestStatus = status;
        if (typeof renderDriverRequests === "function") renderDriverRequests();

        selectedDriverRequestAction = null;
        pendingDriverRequestStatus = "";
        showDriverRequestApprovalSuccessModal(status);
    } catch (error) {
        console.error("Driver Request Status Error:", error);
        alert(error.message || "Unable to update request status. Please try again.");
    } finally {
        const overlay = document.getElementById("actionLoadingOverlay");
        if (overlay) overlay.style.display = "none";
    }
}

function showDriverRequestApprovalSuccessModal(status) {
    const modal = document.getElementById("driverRequestApprovalSuccessModal");
    const title = document.getElementById("driverRequestApprovalSuccessTitle");
    const message = document.getElementById("driverRequestApprovalSuccessMessage");

    if (!modal) return;
    if (title) title.textContent = status === "Approved" ? "Request Approved" : "Request Denied";
    if (message) message.textContent = status === "Approved" ? "Request approved successfully." : "Request denied successfully.";

    modal.style.display = "flex";
}

function closeDriverRequestApprovalSuccessModal() {
    const modal = document.getElementById("driverRequestApprovalSuccessModal");
    if (modal) modal.style.display = "none";
}

function closeRequestConfirmModal() {
    document.getElementById("requestConfirmModal").style.display = "none";
    pendingDriverRequestSubmission = null;
}

function confirmDriverRequestSubmission() {
    if (typeof pendingDriverRequestSubmission === "function") {
        const submitFunction = pendingDriverRequestSubmission;
        closeRequestConfirmModal();
        submitFunction();
    }
}

function showRequestSuccessModal() {
    document.getElementById("requestSuccessModal").style.display = "flex";
}

function closeRequestSuccessModal() {
    document.getElementById("requestSuccessModal").style.display = "none";
}

function updateCutoffDropdownsDynamically() {
    const scheduleSelect = document.getElementById("scheduleCutoff");
    const allowanceSelect = document.getElementById("allowanceCutoff");
    const driverViewSelect = document.getElementById("driverViewCutoff");
    const dutyTrackerSelect = document.getElementById("dutyTrackerCutoff");
    const driverRequestSelect = document.getElementById("driverRequestCutoff");
    
    if (!scheduleSelect || !allowanceSelect || !driverViewSelect || !dutyTrackerSelect || !driverRequestSelect) return;

    const activeCutoffs = new Set();
    const processDateString = (dateStr) => {
        if (!dateStr) return;
        const parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) return;

        const year = parsedDate.getFullYear();
        const monthNum = parsedDate.getMonth(); 
        const day = parsedDate.getDate();
        const bucket = day <= 15 ? "1" : "2";
        activeCutoffs.add(`${year}-${monthNum}-${bucket}`);
    };

    scheduleDates.forEach(date => processDateString(date));
    globalParsedAllowances.forEach(record => processDateString(record.date));
    if (window.driverRequestRecords) {
        window.driverRequestRecords.forEach(record => processDateString(record.date));
    }

    scheduleSelect.innerHTML = "";
    allowanceSelect.innerHTML = "";
    driverViewSelect.innerHTML = "";
    dutyTrackerSelect.innerHTML = "";
    driverRequestSelect.innerHTML = "";

    const sortedBuckets = Array.from(activeCutoffs).sort((a, b) => {
        const [yA, mA, bA] = a.split("-").map(Number);
        const [yB, mB, bB] = b.split("-").map(Number);
        return yA - yB || mA - mB || bA - bB;
    });

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    sortedBuckets.forEach(bucketKey => {
        const [year, monthNum, bucket] = bucketKey.split("-");
        const monthName = monthNames[Number(monthNum)];
        let labelText = "";
        let optionValue = "";

        if (bucket === "1") {
            labelText = `${monthName} 1 - 15, ${year}`;
            optionValue = `${String(Number(monthNum)+1).padStart(2, '0')}-1`; 
        } else {
            const totalDays = new Date(Number(year), Number(monthNum) + 1, 0).getDate();
            labelText = `${monthName} 16 - ${totalDays}, ${year}`;
            optionValue = `${String(Number(monthNum)+1).padStart(2, '0')}-2`;
        }

        scheduleSelect.add(new Option(labelText, optionValue));
        allowanceSelect.add(new Option(labelText, optionValue));
        driverViewSelect.add(new Option(labelText, optionValue));
        dutyTrackerSelect.add(new Option(labelText, optionValue));
        driverRequestSelect.add(new Option(labelText, optionValue));
    });

    if (scheduleSelect.options.length === 0) {
        const fallback = new Option("July 1 - 15, 2026", "07-1");
        scheduleSelect.add(fallback);
        allowanceSelect.add(fallback.cloneNode(true));
        driverViewSelect.add(fallback.cloneNode(true));
        dutyTrackerSelect.add(fallback.cloneNode(true));
        driverRequestSelect.add(fallback.cloneNode(true));
    }

    const currentCutoff = getCurrentCutoffValue();
    if(scheduleSelect.querySelector(`option[value="${currentCutoff}"]`)) scheduleSelect.value = currentCutoff;
    if(allowanceSelect.querySelector(`option[value="${currentCutoff}"]`)) allowanceSelect.value = currentCutoff;
    if(driverViewSelect.querySelector(`option[value="${currentCutoff}"]`)) driverViewSelect.value = currentCutoff;
    if(dutyTrackerSelect.querySelector(`option[value="${currentCutoff}"]`)) dutyTrackerSelect.value = currentCutoff;
    if(driverRequestSelect.querySelector(`option[value="${currentCutoff}"]`)) driverRequestSelect.value = currentCutoff;

    if (typeof processAllowanceSummaryTable === "function") processAllowanceSummaryTable();
    renderDriverDutyTracker();

    if (window.driverRequestRecords) {
        renderDriverRequests();
        renderDriverRequestsForDriver();
    }
}

function renderDriverDutyTracker() {
    const cutoffSelect = document.getElementById("dutyTrackerCutoff");
    const head = document.getElementById("driverDutyTrackerHead");
    const body = document.getElementById("driverDutyTrackerBody");

    if (!cutoffSelect || !head || !body) return;

    const cutoffValue = cutoffSelect.value;
    if (!cutoffValue) {
        head.innerHTML = "";
        body.innerHTML = "";
        return;
    }

    const [monthString, bucketString] = cutoffValue.split("-");
    const month = Number(monthString) - 1;
    const bucket = Number(bucketString);

    let selectedYear = new Date().getFullYear();
    const scheduleDateKeys = Object.keys(summaryDrivers || {});

    for (const dateKey of scheduleDateKeys) {
        const parsedDate = new Date(dateKey);
        if (isNaN(parsedDate.getTime())) continue;

        if (parsedDate.getMonth() === month && (parsedDate.getDate() <= 15 ? 1 : 2) === bucket) {
            selectedYear = parsedDate.getFullYear();
            break;
        }
    }

    const startDay = bucket === 1 ? 1 : 16;
    const endDay = bucket === 1 ? 15 : new Date(selectedYear, month + 1, 0).getDate();
    const dates = [];

    for (let day = startDay; day <= endDay; day++) {
        dates.push(new Date(selectedYear, month, day));
    }

    let headerHTML = '<tr><th style="text-align:center;">Driver</th>';
    dates.forEach(date => {
        const dayNumber = date.getDate();
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
        headerHTML += `
            <th style="text-align:center;">
                <div>${dayNumber}</div>
                <div style="font-size:11px;font-weight:600;">${dayName}</div>
            </th>
        `;
    });
    headerHTML += `<th style="text-align:center;">Duty Days</th><th style="text-align:center;">Rest Days</th></tr>`;
    head.innerHTML = headerHTML;

    const driverOrder = [
        "Jun Dela Pena", "Jerome Natividad", "Julius Sta. Rita",
        "Oscar Pangilinan", "Michael Guanlao", "Melvin Fausto"
    ];

    const dutyLookup = {};
    scheduleDateKeys.forEach(dateKey => {
        const parsedDate = new Date(dateKey);
        if (isNaN(parsedDate.getTime())) return;

        const year = parsedDate.getFullYear();
        const monthNumber = parsedDate.getMonth() + 1;
        const day = parsedDate.getDate();
        const normalizedKey = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        dutyLookup[normalizedKey] = summaryDrivers[dateKey] || {};
    });

    const driverSet = new Set();
    scheduleDateKeys.forEach(dateKey => {
        const dateData = summaryDrivers[dateKey];
        if (!dateData) return;
        Object.keys(dateData).forEach(driverName => driverSet.add(driverName));
    });

    const drivers = driverOrder.filter(driverName => driverSet.has(driverName));
    const phToday = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    phToday.setHours(0, 0, 0, 0);

    let bodyHTML = "";
    drivers.forEach(driverName => {
        bodyHTML += `<tr><td style="text-align:center;"><strong>${driverName}</strong></td>`;
        let consecutiveDutyDays = 0;
        const automaticRestDays = new Set();
        let dutyDayCount = 0;
        let restDayCount = 0;

        dates.forEach(targetDate => {
            const dateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
            const dateData = dutyLookup[dateKey] || {};
            const driverRecord = dateData[driverName] || null;
            const itinerary = driverRecord ? String(driverRecord.itinerary || "").trim() : "";
            const normalized = itinerary.toLowerCase();
            const isFuture = targetDate.getTime() > phToday.getTime();

            if (normalized === "rest day") {
                restDayCount++;
                consecutiveDutyDays = 0;
            } else if (itinerary !== "") {
                dutyDayCount++;
                consecutiveDutyDays++;
            } else if (isFuture) {
                if (consecutiveDutyDays >= 6) {
                    automaticRestDays.add(dateKey);
                    restDayCount++;
                    consecutiveDutyDays = 0;
                } else {
                    consecutiveDutyDays++;
                }
            } else {
                consecutiveDutyDays = 0;
            }
        });

        dates.forEach(targetDate => {
            const dateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
            const dateData = dutyLookup[dateKey] || {};
            const driverRecord = dateData[driverName] || null;
            const itinerary = driverRecord ? String(driverRecord.itinerary || "").trim() : "";
            const normalized = itinerary.toLowerCase();
            const isActualRestDay = normalized === "rest day";
            const isAutomaticRestDay = automaticRestDays.has(dateKey);
            const shouldHighlight = isActualRestDay || isAutomaticRestDay;

            bodyHTML += `<td class="${shouldHighlight ? "duty-tracker-rest-day" : ""}" style="text-align:center;">${itinerary}</td>`;
        });

        bodyHTML += `
            <td style="text-align:center; font-weight:700;">${dutyDayCount}</td>
            <td style="text-align:center; font-weight:700;">${restDayCount}</td>
        </tr>`;
    });

    body.innerHTML = bodyHTML;
}

function formatDateKeyForDutyTracker(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getCurrentCutoffValue(){
    const today = new Date(new Date().toLocaleString("en-US", { timeZone:"Asia/Manila" }));
    const month = String(today.getMonth() + 1).padStart(2,"0");
    const day = today.getDate();
    const bucket = day <= 15 ? "1" : "2";
    return `${month}-${bucket}`;
}

function processAllowanceSummaryTable() {
    const selectorElement = document.querySelectorAll("#allowanceCutoff")[0];
    let selectorValue = selectorElement ? selectorElement.value : "07-1";
    if(!selectorValue.includes("-")) selectorValue = "07-1";

    const [targetMonthStr, targetBucket] = selectorValue.split("-");
    const targetMonth = parseInt(targetMonthStr);

    const tableBody = document.getElementById("allowanceSummaryBody");
    tableBody.innerHTML = "";

    const aggregateGroup = {};
    globalParsedAllowances.forEach(record => {
        const parsedDate = new Date(record.date);
        if(isNaN(parsedDate.getTime())) return;

        const dayNumber = parsedDate.getDate();
        const monthNumber = parsedDate.getMonth() + 1;

        if (monthNumber !== targetMonth) return;
        if (targetBucket === "1" && dayNumber > 15) return;
        if (targetBucket === "2" && dayNumber <= 15) return;

        if (!aggregateGroup[record.name]) {
            aggregateGroup[record.name] = { approved: 0, pending: 0 };
        }
        if (record.status === "Paid" || record.status === "Approved") {
            aggregateGroup[record.name].approved += record.amount;
        } else {
            aggregateGroup[record.name].pending += record.amount;
        }
    });

    let overallApprovedTotal = 0;
    let overallPendingTotal = 0;
    const driverOrder = [
        "Jun Dela Pena", "Jerome Natividad", "Julius Sta. Rita",
        "Oscar Pangilinan", "Michael Guanlao", "Melvin Fausto"
    ];

    const driverKeys = Object.keys(aggregateGroup).sort((a, b) => {
        const indexA = driverOrder.indexOf(a.trim());
        const indexB = driverOrder.indexOf(b.trim());
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    if(driverKeys.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:16px; color:#6b7280;">No allowance records found for this cut-off window.</td></tr>`;
        return;
    }

    driverKeys.forEach(driver => {
        overallApprovedTotal += aggregateGroup[driver].approved;
        overallPendingTotal += aggregateGroup[driver].pending;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${driver}</td>
            <td style="text-align: center; color: #14532d; font-weight:700;">₱${aggregateGroup[driver].approved.toLocaleString()}</td>
            <td style="text-align: center; color: #b45309; font-weight:700;">₱${aggregateGroup[driver].pending.toLocaleString()}</td>
            <td style="text-align: center;">
                <button class="action-table-btn btn-view" onclick="openDriverDetailsModal('${driver}')">View</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    const summaryFooterRow = document.createElement("tr");
    summaryFooterRow.style.background = "#e5e7eb";
    summaryFooterRow.style.fontWeight = "700";
    summaryFooterRow.innerHTML = `
        <td style="color:#14532d; font-size: 11px; text-align: left;">Grand Total</td>
        <td style="text-align: center; color: #14532d;">₱${overallApprovedTotal.toLocaleString()}</td>
        <td style="text-align: center; color: #b45309;">₱${overallPendingTotal.toLocaleString()}</td>
        <td></td>
    `;
    tableBody.appendChild(summaryFooterRow);
}

function openDriverDetailsModal(driverName) {
    let cutoffId = document.getElementById("allowanceCutoff").value;
    if(!cutoffId.includes("-")) cutoffId = "07-1";
    const [targetMonthStr, targetBucket] = cutoffId.split("-");
    const targetMonth = parseInt(targetMonthStr);

    document.getElementById("detailsModalDriverName").textContent = driverName;
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById("detailsModalRange").textContent = "Selected Window: " + monthNames[targetMonth - 1] + (targetBucket === "1" ? " 1 - 15" : " 16 - End of Month");
    
    const targetBody = document.getElementById("driverDetailsModalBody");
    targetBody.innerHTML = "";

    const filteredRecords = globalParsedAllowances.filter(record => {
        if (record.name.toLowerCase().trim() !== driverName.toLowerCase().trim()) return false;
        const parsedDate = new Date(record.date);
        if(isNaN(parsedDate.getTime())) return false;

        const dayNumber = parsedDate.getDate();
        const monthNumber = parsedDate.getMonth() + 1;
        
        if (monthNumber !== targetMonth) return false;
        if (targetBucket === "1" && dayNumber > 15) return false;
        if (targetBucket === "2" && dayNumber <= 15) return false;

        return true;
    });

    filteredRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (filteredRecords.length === 0) {
        targetBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:12px; color:#9ca3af;">No records found for this driver inside this window.</td></tr>`;
        return;
    }

    filteredRecords.forEach(record => {
        const row = document.createElement("tr");
        let badgeDisplay = "";

        if (record.status === "Paid" || record.status === "Approved") {
            badgeDisplay = `<span class="status-badge status-approved">Paid</span>`;
        } else if (record.status === "Pay") {
            badgeDisplay = `<button class="action-table-btn btn-approve" style="padding:3px 8px;font-size:10px;" onclick="markAllowancePaid('${record.name}','${record.date}',this)">Pay</button>`;
            row.style.backgroundColor = "#f0fdf4";
        } else if (record.status === "For Review") {
            badgeDisplay = `<button class="action-table-btn" style="padding:3px 8px;font-size:10px;background:#d97706;color:white;" onclick="openReviewModal('${record.name}','${record.date}',this)">For Review</button>`;
            row.style.backgroundColor = "#fefce8";
        } else {
            badgeDisplay = `<button class="action-table-btn" style="padding:3px 8px;font-size:10px;background:#6b7280;color:white;" disabled>Pending</button>`;
        }

        row.innerHTML = `
            <td>${record.date}</td>
            <td style="text-align: right; font-weight:700; color:#1f2937;">&#8369;${record.amount.toLocaleString()}</td>
            <td style="text-align: center;">${badgeDisplay}</td>
        `;
        targetBody.appendChild(row);
    });

    document.getElementById("driverAllowanceDetailsModal").style.display = "block";
    document.body.style.overflow = "hidden";
}

function openReviewModal(driverName, date, button) {
    const record = globalParsedAllowances.find(r => r.name === driverName && r.date === date);
    if (!record) {
        alert("Allowance record not found.");
        return;
    }

    document.getElementById("reviewDriver").textContent = record.name;
    document.getElementById("reviewDate").textContent = record.date;
    document.getElementById("reviewAllowanceModal").dataset.driver = record.name;
    document.getElementById("reviewAllowanceModal").dataset.date = record.date;

    document.getElementById("reviewTimeIn").textContent = record.timeIn || "";
    document.getElementById("reviewTimeOut").textContent = record.timeOut || "";

    const scheduleKey = record.name + "_" + record.date;
    const scheduleRecord = grouped[scheduleKey];

    let reviewItinerary = "";
    let reviewChargeTo = "";

    if (scheduleRecord) {
        reviewItinerary = (scheduleRecord.itinerary || "").trim();
        if (scheduleRecord.trips && scheduleRecord.trips.length) {
            reviewChargeTo = scheduleRecord.trips.map(trip => (trip.chargeTo || "").trim()).find(Boolean) || "";
        }
    }

    document.getElementById("reviewItinerary").textContent = reviewItinerary || "None";
    document.getElementById("reviewChargeTo").textContent = reviewChargeTo || "None";
    document.getElementById("reviewBreakfast").value = record.breakfast;
    document.getElementById("reviewLunch").value = record.lunch;
    document.getElementById("reviewDinner").value = record.dinner;
    document.getElementById("reviewParking").value = record.parking;

    updateReviewTotal();

    const remarksRow = document.getElementById("reviewRemarksRow");
    const remarksCell = document.getElementById("reviewRemarks");

    if (record.remarks && record.remarks.trim() !== "") {
        remarksCell.textContent = record.remarks;
        remarksRow.style.display = "";
    } else {
        remarksRow.style.display = "none";
    }

    const receiptBtn = document.getElementById("reviewReceiptBtn");
    if (record.receipt) {
        receiptBtn.style.display = "";
        receiptBtn.dataset.url = record.receipt;
    } else {
        receiptBtn.style.display = "none";
    }

    document.getElementById("reviewAllowanceModal").style.display = "flex";
}

function closeReviewModal() {
    document.getElementById("reviewAllowanceModal").style.display = "none";
}

function updateReviewTotal() {
    const breakfast = Number(document.getElementById("reviewBreakfast").value) || 0;
    const lunch = Number(document.getElementById("reviewLunch").value) || 0;
    const dinner = Number(document.getElementById("reviewDinner").value) || 0;
    const parking = Number(document.getElementById("reviewParking").value) || 0;
    const total = breakfast + lunch + dinner + parking;
    document.getElementById("reviewTotal").textContent = "₱" + total.toLocaleString();
}

function closeDetailsModal() {
    document.getElementById("driverAllowanceDetailsModal").style.display = "none";
    document.body.style.overflow = "";
}

async function approveItemInline(name, date, element) {
    if (!confirm(`Approve allowance request for ${name} on ${date}?`)) return;

    if (element) {
        element.disabled = true;
        element.textContent = "Processing...";
    }

    showActionLoading("Approving Allowance...", "Please wait while we mark this allowance for payment.");

    try {
        const targetUrl = `${WEBAPP_BASE}?action=approveAllowanceItem&driver=${encodeURIComponent(name)}&date=${encodeURIComponent(date)}&token=${encodeURIComponent(SECRET_TOKEN)}`;
        const response = await fetch(targetUrl);
        const data = await response.json();

        if (!data.success) {
            if (element) {
                element.disabled = false;
                element.textContent = "Approve";
            }
            alert("❌ Error: " + (data.message || "Unable to approve allowance."));
            return;
        }

        if (Array.isArray(globalParsedAllowances)) {
            const targetDriver = String(name || "").trim().toLowerCase();
            const targetDate = typeof standardizeDateStr === "function" ? standardizeDateStr(date) : String(date || "").trim();

            globalParsedAllowances.forEach(record => {
                const recordDriver = String(record.name || "").trim().toLowerCase();
                const recordDate = typeof standardizeDateStr === "function" ? standardizeDateStr(record.date) : String(record.date || "").trim();

                if (recordDriver === targetDriver && recordDate === targetDate) {
                    record.status = "Pay";
                }
            });
        }

        if (element) {
            element.disabled = false;
            element.textContent = "Approve";
        }

        const reviewModal = document.getElementById("reviewAllowanceModal");
        if (reviewModal) reviewModal.style.display = "none";
        document.body.style.overflow = "";
        hideActionLoading();

        const successModal = document.getElementById("successModal");
        const successTitle = document.getElementById("successModalTitle");
        const successText = document.getElementById("successModalText");
        const successOK = document.getElementById("successOK");

        if (successTitle) successTitle.textContent = "Allowance Approved";
        if (successText) successText.textContent = "Allowance marked for pay.";
        if (successModal) successModal.style.display = "flex";

        if (successOK) {
            successOK.onclick = function () {
                if (successModal) successModal.style.display = "none";
                document.body.style.overflow = "";
                showAdminDashboard();
                fetchLiveAllowancesFromSheet().then(() => {
                    if (typeof processAllowanceSummaryTable === "function") {
                        processAllowanceSummaryTable();
                    }
                }).catch(err => console.warn("Allowance background refresh failed:", err));
            };
        }
    } catch (e) {
        console.error("Allowance approval error:", e);
        if (element) {
            element.disabled = false;
            element.textContent = "Approve";
        }
        hideActionLoading();
        alert("Network transmission failure.");
    } finally {
        hideActionLoading();
    }
}

async function markAllowancePaid(name, date, element) {
    if (!confirm(`Mark allowance for ${name} on ${date} as Paid?`)) return;

    element.disabled = true;
    element.textContent = "Processing...";
    showActionLoading("Processing Payment...", "Please wait while we update the payment status.");

    try {
        const targetUrl = `${WEBAPP_BASE}?action=markAllowancePaid&driver=${encodeURIComponent(name)}&date=${encodeURIComponent(date)}&token=${encodeURIComponent(SECRET_TOKEN)}`;
        const response = await fetch(targetUrl);
        const data = await response.json();

        if (data.success) {
            document.getElementById("successModalTitle").textContent = "Payment Completed";
            document.getElementById("successModalText").textContent = "Allowance marked as Paid.";
            document.getElementById("successModal").style.display = "flex";

            document.getElementById("successOK").onclick = async function () {
                document.getElementById("successModal").style.display = "none";
                await fetchLiveAllowancesFromSheet();
                showAdminDashboard();
            };
        } else {
            alert(data.message || "Unable to update payment status.");
            element.disabled = false;
            element.textContent = "Pay";
        }
    } catch (err) {
        console.error(err);
        alert("Network error. Please try again.");
        element.disabled = false;
        element.textContent = "Pay";
    } finally {
        hideActionLoading();
    }
}

document.getElementById("allowanceParking").addEventListener("input", function () {
    const value = parseFloat(this.value) || 0;
    const section = document.getElementById("receiptSection");
    if (value > 0) {
        section.style.display = "block";
    } else {
        section.style.display = "none";
        selectedReceipts = [];
        document.getElementById("cameraInput").value = "";
        document.getElementById("galleryInput").value = "";
        document.getElementById("receiptPreview").innerHTML = "";
    }
});

function addReceipts(files) {
    Array.from(files).forEach(file => { selectedReceipts.push(file); });
    refreshReceiptPreview();
}

document.getElementById("cameraInput").addEventListener("change", function () { addReceipts(this.files); this.value = ""; });
document.getElementById("galleryInput").addEventListener("change", function () { addReceipts(this.files); this.value = ""; });

function refreshReceiptPreview() {
    const preview = document.getElementById("receiptPreview");
    preview.innerHTML = "";
    selectedReceipts.forEach((file, index) => {
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "display: inline-block; position: relative; margin: 5px;";

        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.cssText = "width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #ccc;";

        const removeBtn = document.createElement("button");
        removeBtn.innerHTML = "&#x2715;";
        removeBtn.type = "button";
        removeBtn.style.cssText = "position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; border: none; border-radius: 50%; background: #dc2626; color: #fff; cursor: pointer; font-weight: bold;";
        removeBtn.onclick = function () {
            selectedReceipts.splice(index, 1);
            refreshReceiptPreview();
        };

        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        preview.appendChild(wrapper);
    });
}

function resetSubmitButton(btn) {
    isSubmitting = false;
    btn.disabled = false;
    btn.innerText = "Submit";
}

function convertTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return (h * 60) + m;
}

function calculateMealAllowance(tripType, timeIn, timeOut) {
    const result = { breakfast: 0, lunch: 0, dinner: 0 };
    let inTime = convertTimeToMinutes(timeIn);
    let outTime = convertTimeToMinutes(timeOut);

    if (outTime <= inTime) outTime += 1440;
    const isProvince = tripType.toLowerCase() === "province";

    function dutyPassed(hourMinute) {
        let checkTime = hourMinute;
        if (checkTime < inTime) checkTime += 1440;
        return checkTime >= inTime && checkTime <= outTime;
    }

    if (isProvince) {
        if (dutyPassed(60) || dutyPassed(120) || dutyPassed(180) || dutyPassed(240)) {
            result.breakfast = 75;
        }
    } else {
        let originalIn = convertTimeToMinutes(timeIn);
        if (outTime >= 1500 || (originalIn <= 179 && outTime >= 60)) {
            result.breakfast = 125;
        } else if (originalIn > 180 && originalIn <= 240) {
            result.breakfast = 75;
        } else if (originalIn === 180) {
            result.breakfast = 125;
        }
    }

    let lunchTime = 660, lunchEnd = 780;
    if (inTime <= lunchTime && outTime >= lunchEnd) {
        result.lunch = isProvince ? 75 : 125;
    } else if (outTime > 1440) {
        let nextDayOut = outTime - 1440;
        if (inTime >= 1080 && nextDayOut >= lunchEnd) {
            result.lunch = isProvince ? 75 : 125;
        }
    }

    let dinnerStart = 1020, dinnerEnd = 1140; 
    if (inTime <= dinnerStart && outTime >= dinnerEnd) {
        result.dinner = isProvince ? 75 : 125;
    } else if (outTime > 1440) {
        let nextDayOut = outTime - 1440;
        if (inTime >= 1080 && nextDayOut >= dinnerEnd) {
            result.dinner = isProvince ? 75 : 125;
        }
    }

    return result;
}

function autoComputeMeals() {
    if (!currentTripType) return;
    const timeIn = document.getElementById("allowanceTimeIn").value;
    const timeOut = document.getElementById("allowanceTimeOut").value;

    if (!timeIn || !timeOut) {
        document.getElementById("allowanceBreakfast").value = "";
        document.getElementById("allowanceLunch").value = "";
        document.getElementById("allowanceDinner").value = "";
        return;
    }

    const meal = calculateMealAllowance(currentTripType, timeIn, timeOut);
    document.getElementById("allowanceBreakfast").value = meal.breakfast;
    document.getElementById("allowanceLunch").value = meal.lunch;
    document.getElementById("allowanceDinner").value = meal.dinner;

    document.getElementById("allowanceBreakfast").readOnly = true;
    document.getElementById("allowanceLunch").readOnly = true;
    document.getElementById("allowanceDinner").readOnly = true;
}

document.addEventListener("DOMContentLoaded", function(){
    const closeViewerBtn = document.getElementById("closeViewerBtn");
    if (closeViewerBtn) {
        closeViewerBtn.addEventListener("click", function () {
            document.getElementById("scheduleViewerPage").style.display = "none";
            document.body.style.overflow = "";
        });
    }

    const driverViewBackBtn = document.getElementById("driverViewBackBtn");
    if (driverViewBackBtn) driverViewBackBtn.addEventListener("click", backToMainDashboard);

    const backToDriverBtn = document.getElementById("backToDriverBtn");
    if (backToDriverBtn) backToDriverBtn.addEventListener("click", backToMainDashboard);

    checkAdminSession();
    setInterval(checkAdminSession, 1000);
        
    const timeInField = document.getElementById("allowanceTimeIn");
    const timeOutField = document.getElementById("allowanceTimeOut");

    if(timeInField) timeInField.addEventListener("input", autoComputeMeals);
    if(timeOutField) timeOutField.addEventListener("input", autoComputeMeals);

    const confirmReminderBtn = document.getElementById("confirmReminderBtn");
    if (confirmReminderBtn) confirmReminderBtn.addEventListener("click", confirmReminder);
});

function openPassengerMessage(driver, date) {
    const messageKey = `${driver.trim().toLowerCase()}|${standardizeDateStr(date)}`;
    const data = window.passengerMessageData?.[messageKey];

    if (!data || !Array.isArray(data.trips)) {
        alert("Passenger information is not available.");
        return;
    }

    const passengerTrips = data.trips.filter(trip => (trip.passengerName || "").trim() !== "");
    if (passengerTrips.length === 0) {
        alert("No passenger is available for messaging.");
        return;
    }

    window.currentPassengerMessageData = data;
    window.currentPassengerMessageTrips = passengerTrips;

    const list = document.getElementById("passengerMessageList");
    list.innerHTML = "";

    passengerTrips.forEach((trip, index) => {
        const passengerName = (trip.passengerName || "").trim();
        const contactNumber = (trip.contactNumber || "").trim();

        const row = document.createElement("div");
        row.className = "passenger-message-row";
        row.innerHTML = `
            <input type="checkbox" class="passenger-message-checkbox" value="${index}">
            <label class="passenger-message-option">
                <span>${passengerName}</span>
                ${contactNumber ? `<small>${contactNumber}</small>` : `<small>No contact number</small>`}
            </label>
        `;
        list.appendChild(row);
    });

    document.getElementById("passengerMessageModal").style.display = "block";
    document.body.style.overflow = "hidden";
}

function closePassengerMessageModal() {
    document.getElementById("passengerMessageModal").style.display = "none";
    document.body.style.overflow = "";
}

function continuePassengerMessageSelection() {
    const checkboxes = document.querySelectorAll(".passenger-message-checkbox:checked");
    if (checkboxes.length === 0) {
        alert("Please select at least one passenger.");
        return;
    }

    const data = window.currentPassengerMessageData;
    const trips = window.currentPassengerMessageTrips || [];
    const selectedTrips = Array.from(checkboxes).map(checkbox => trips[Number(checkbox.value)]).filter(Boolean);

    if (selectedTrips.length === 0) {
        alert("No passenger was selected.");
        return;
    }

    window.selectedPassengerMessageTrips = selectedTrips;
    closePassengerMessageModal();

    if (selectedTrips.length === 1) {
        window.currentMessageRecipient = selectedTrips[0];
        openPassengerMessageCompose(data, selectedTrips);
        return;
    }

    openPassengerMessageCompose(data, selectedTrips);
}
    
function openPassengerMessageCompose(data, selectedTrips) {
    const driverName = (data.driver || "").trim();
    const tripDate = (data.date || "").trim();
    let tripDetails = "";

    selectedTrips.forEach((trip, index) => {
        const passengerName = (trip.passengerName || "").trim();
        const pickupTime = (trip.pickupTime || "").trim();
        const origin = (trip.origin || "").trim();
        const destination = (trip.destination || "").trim();
        const remarks = (trip.remarks || "").trim();

        let passengerDetails = [];
        if (passengerName) passengerDetails.push(`Passenger: ${passengerName}`);
        if (pickupTime) passengerDetails.push(`Pick-up Time: ${pickupTime}`);
        if (origin) passengerDetails.push(`Origin: ${origin}`);
        if (destination) passengerDetails.push(`Destination: ${destination}`);
        if (remarks) passengerDetails.push(`Remarks: ${remarks}`);

        tripDetails += passengerDetails.join("\n");
        if (index < selectedTrips.length - 1) tripDetails += "\n\n";
    });

    const message = `Hi, Ma'am/Sir!\n\nI am ${driverName}, your assigned driver for your trip on ${tripDate}.\n\nHere are the trip details:\n\n${tripDetails}\n\nIf there are any changes or concerns regarding your trip, please message me here and notify the admin as well.\n\nPlease be advised that the trip will proceed as scheduled even if I have not received your confirmation, unless you or the admin informs you that the trip has been cancelled or changed.\n\nThank you, and see you!`;

    const passengerNames = selectedTrips.map(trip => (trip.passengerName || "").trim()).filter(Boolean).join(", ");
    document.getElementById("messageComposePassenger").textContent = passengerNames;
    document.getElementById("passengerMessageText").value = message;

    window.originalPassengerMessage = message;
    document.getElementById("messageComposeModal").style.display = "block";
    document.body.style.overflow = "hidden";
}

function openMessageRecipientModal() {
    const selectedTrips = window.selectedPassengerMessageTrips || [];
    if (selectedTrips.length === 0) {
        alert("No passenger is available.");
        return;
    }

    const list = document.getElementById("messageRecipientList");
    if (!list) return;

    list.innerHTML = "";
    selectedTrips.forEach((trip, index) => {
        const passengerName = (trip.passengerName || "").trim();
        const contactNumber = (trip.contactNumber || "").trim();
        const messageStatus = String(trip.messageSent || "").trim().toLowerCase();
        const alreadySent = messageStatus === "sent";

        const row = document.createElement("label");
        row.className = "passenger-message-row";
        row.style.cssText = "display: flex; flex-direction: row; align-items: center; justify-content: flex-start; gap: 10px; width: 100%; box-sizing: border-box; padding: 10px 12px; margin-bottom: 8px; border: 1px solid #bbf7d0; border-radius: 10px; background: #f0fdf4; cursor: pointer; text-align: left;";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "messageRecipient";
        radio.className = "message-recipient-radio";
        radio.value = index;
        if (alreadySent) radio.disabled = true;
        radio.style.cssText = "flex: 0 0 auto; width: 18px; height: 18px; margin: 0; padding: 0; position: static; transform: none;";

        const info = document.createElement("span");
        info.style.cssText = "display: flex; flex-direction: row; align-items: center; gap: 8px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden;";

        const name = document.createElement("strong");
        name.textContent = passengerName || "Unnamed Passenger";
        name.style.cssText = "display: inline; flex: 0 1 auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";

        info.appendChild(name);
        row.appendChild(radio);
        row.appendChild(info);

        if (alreadySent) {
            const sentLabel = document.createElement("small");
            sentLabel.textContent = "✓ Message Sent";
            sentLabel.style.cssText = "color: #16a34a; font-weight: 700; margin-left: auto; white-space: nowrap;";
            row.appendChild(sentLabel);

            row.style.opacity = "0.65";
            row.style.cursor = "not-allowed";
            row.style.background = "#f3f4f6";
            row.style.borderColor = "#d1d5db";
        }

        list.appendChild(row);
    });

    const modal = document.getElementById("messageRecipientModal");
    if (modal) {
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
    }
}

async function markPassengerMessageSent(trip) {
    if (!trip) return;
    const passengerName = (trip.passengerName || "").trim();
    const contactNumber = (trip.contactNumber || "").trim();
    const pickupTime = (trip.pickupTime || "").trim();
    const driver = (window.currentPassengerMessageData?.driver || "").trim();
    const date = (window.currentPassengerMessageData?.date || "").trim();

    if (!passengerName && !contactNumber) return;

    const messageKey = `${passengerName.toLowerCase()}|${contactNumber}`;
    if (!window.messagedPassengers) window.messagedPassengers = {};
    window.messagedPassengers[messageKey] = true;

    let savedMessages = {};
    try {
        savedMessages = JSON.parse(localStorage.getItem("messagedPassengers") || "{}");
    } catch (e) {
        savedMessages = {};
    }
    savedMessages[messageKey] = true;
    localStorage.setItem("messagedPassengers", JSON.stringify(savedMessages));

    try {
        const markURL = `${WEBAPP_BASE}?action=markPassengerMessageSent&token=${encodeURIComponent(SECRET_TOKEN)}&driver=${encodeURIComponent(driver)}&date=${encodeURIComponent(date)}&passengerName=${encodeURIComponent(passengerName)}&contactNumber=${encodeURIComponent(contactNumber)}&pickupTime=${encodeURIComponent(pickupTime)}`;
        const response = await fetch(markURL);
        const result = await response.json();

        if (!result.success) {
            console.warn("Message saved locally, but Column O was not updated:", result.message);
        }
    } catch (error) {
        console.error("Could not update Message Sent in Google Sheet:", error);
    }
}
    
function isPassengerMessageSent(trip) {
    if (!trip) return false;
    const passengerName = (trip.passengerName || "").trim();
    const contactNumber = (trip.contactNumber || "").trim();
    const messageKey = `${passengerName.toLowerCase()}|${contactNumber}`;

    if (window.messagedPassengers && window.messagedPassengers[messageKey]) return true;

    try {
        const savedMessages = JSON.parse(localStorage.getItem("messagedPassengers") || "{}");
        return savedMessages[messageKey] === true;
    } catch (e) {
        return false;
    }
}

function closeMessageRecipientModal() {
    const modal = document.getElementById("messageRecipientModal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
}

async function confirmMessageRecipient() {
    const selected = document.querySelector(".message-recipient-radio:checked");
    if (!selected) {
        alert("Please choose a recipient.");
        return;
    }

    const selectedTrips = window.selectedPassengerMessageTrips || [];
    const index = Number(selected.value);
    const trip = selectedTrips[index];

    if (!trip) {
        alert("Passenger information is not available.");
        return;
    }

    window.currentMessageRecipient = trip;
    const passengerName = (trip.passengerName || "").trim();
    const contactNumber = (trip.contactNumber || "").trim();
    const messageElement = document.getElementById("passengerMessageText");
    const message = messageElement ? messageElement.value.trim() : "";

    if (!contactNumber) {
        closeMessageRecipientModal();
        setTimeout(function () {
            alert(`This message will be sent to ${passengerName}.\n\nNo contact number is available for this passenger.`);
        }, 50);
        return;
    }

    closeMessageRecipientModal();

    setTimeout(async function () {
        const confirmed = window.confirm(`This message will be sent to ${passengerName}.`);
        if (!confirmed) return;

        await markPassengerMessageSent(trip);
        closeMessageRecipientModal();
        closeMessageComposeModal();
        closePassengerMessageModal();
        document.body.style.overflow = "";

        const cleanNumber = contactNumber.replace(/[^\d+]/g, "");
        const encodedMessage = encodeURIComponent(message);
        window.location.href = `sms:${cleanNumber}?body=${encodedMessage}`;
    }, 50);
}
    
function handlePassengerMessageSend() {
    const selectedTrips = window.selectedPassengerMessageTrips || [];
    if (selectedTrips.length === 0) {
        alert("No passenger is selected.");
        return;
    }

    if (selectedTrips.length === 1) {
        const trip = selectedTrips[0];
        window.currentMessageRecipient = trip;
        const passengerName = (trip.passengerName || "").trim();
        const contactNumber = (trip.contactNumber || "").trim();
        const messageElement = document.getElementById("passengerMessageText");
        const message = messageElement ? messageElement.value.trim() : "";

        if (!contactNumber) {
            closeMessageComposeModal();
            setTimeout(function () {
                alert(`This message will be sent to ${passengerName}.\n\nNo contact number is available for this passenger.`);
            }, 50);
            return;
        }

        closeMessageComposeModal();

        setTimeout(function () {
            const confirmed = window.confirm(`This message will be sent to ${passengerName}.`);
            if (!confirmed) return;

            markPassengerMessageSent(trip).then(() => {
                if (typeof loadMainSchedulesAndApprovals === "function") {
                    loadMainSchedulesAndApprovals();
                }
            });

            closeMessageRecipientModal();
            closeMessageComposeModal();
            closePassengerMessageModal();
            document.body.style.overflow = "";

            const smsURL = `sms:${encodeURIComponent(contactNumber)}?body=${encodeURIComponent(message)}`;
            window.location.href = smsURL;
        }, 50);

        return;
    }

    openMessageRecipientModal();
}

function closeMessageComposeModal() {
    document.getElementById("messageComposeModal").style.display = "none";
    document.body.style.overflow = "";
}

function editPassengerMessage() {
    const messageBox = document.getElementById("passengerMessageText");
    const composeButtons = document.querySelector(".message-compose-buttons");
    const editButtons = document.getElementById("messageEditButtons");

    if (!messageBox || !composeButtons || !editButtons) return;

    messageBox.readOnly = false;
    messageBox.focus();
    composeButtons.style.display = "none";
    editButtons.style.display = "flex";
}

function cancelPassengerMessageEdit() {
    const messageBox = document.getElementById("passengerMessageText");
    const composeButtons = document.querySelector(".message-compose-buttons");
    const editButtons = document.getElementById("messageEditButtons");

    messageBox.value = window.originalPassengerMessage || messageBox.value;
    messageBox.readOnly = true;
    editButtons.style.display = "none";
    composeButtons.style.display = "flex";
}

function savePassengerMessageEdit() {
    const messageBox = document.getElementById("passengerMessageText");
    const composeButtons = document.querySelector(".message-compose-buttons");
    const editButtons = document.getElementById("messageEditButtons");

    window.originalPassengerMessage = messageBox.value;
    messageBox.readOnly = true;
    editButtons.style.display = "none";
    composeButtons.style.display = "flex";
}

function submitAllowance(driver, date, reqBy, pass, tripType){
    currentDriver = driver;
    currentDate = date;
    currentTripType = tripType;

    document.getElementById("allowanceBreakfast").readOnly = false;
    document.getElementById("allowanceLunch").readOnly = false;
    document.getElementById("allowanceDinner").readOnly = false;
    document.getElementById("allowanceBreakfast").value = "";
    document.getElementById("allowanceLunch").value = "";
    document.getElementById("allowanceDinner").value = "";
    
    const allowanceKey = driver + "_" + date;
    const allowanceDuty = grouped[allowanceKey];
    let chargeTo = "";

    if (allowanceDuty && allowanceDuty.trips) {
        chargeTo = allowanceDuty.trips.map(trip => (trip.chargeTo || "").trim()).find(Boolean) || "";
    }

    currentPassengerCombined = chargeTo || "None";

    document.getElementById("modalDriver").textContent = driver;
    document.getElementById("modalDate").textContent = date;
    
    if (reqBy) {
        document.getElementById("modalRequestedByRow").style.display = "flex";
        document.getElementById("modalRequestedBy").textContent = reqBy;
    } else {
        document.getElementById("modalRequestedByRow").style.display = "none";
    }

    if (pass) {
        document.getElementById("modalPassengerRow").style.display = "flex";
        document.getElementById("modalPassenger").textContent = pass;
    } else {
        document.getElementById("modalPassengerRow").style.display = "none";
    }

    document.getElementById("allowanceModal").style.display = "block";
    document.body.style.overflow = "hidden";
}

function resetAllowanceForm(){
    document.getElementById("allowanceTimeIn").value = "";
    document.getElementById("allowanceTimeOut").value = "";
    document.getElementById("allowanceBreakfast").value = "";
    document.getElementById("allowanceLunch").value = "";
    document.getElementById("allowanceDinner").value = "";
    document.getElementById("allowanceParking").value = "";
    document.getElementById("allowanceRemarks").value = "";
    selectedReceipts = [];
    document.getElementById("cameraInput").value = "";
    document.getElementById("galleryInput").value = "";
    document.getElementById("receiptPreview").innerHTML = "";
    document.getElementById("receiptSection").style.display = "none";
}

function closeModal(){
    resetAllowanceForm();
    document.getElementById("allowanceModal").style.display = "none";
    document.body.style.overflow = "";
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, base64: reader.result.split(",")[1] });
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function saveAllowance() {
    if (isSubmitting) return;
    isSubmitting = true;

    const btn = document.querySelector("#allowanceModal .submit-btn");
    btn.disabled = true;
    btn.innerText = "Submitting...";

    if (!document.getElementById("allowanceTimeIn").value || !document.getElementById("allowanceTimeOut").value) {
        alert("Please enter both Time In and Time Out.");
        resetSubmitButton(btn);
        return;
    }

    const parking = Number(document.getElementById("allowanceParking").value || 0);
    if (parking > 0 && selectedReceipts.length === 0) {
        alert("Please upload at least one parking receipt.");
        resetSubmitButton(btn);
        return;
    }

    document.getElementById("loadingOverlay").style.display = "flex";

    const payload = {
        tripDate: currentDate,
        driver: currentDriver,
        passenger: currentPassengerCombined,
        timeIn: document.getElementById("allowanceTimeIn").value,
        timeOut: document.getElementById("allowanceTimeOut").value,
        breakfast: document.getElementById("allowanceBreakfast").value || 0,
        lunch: document.getElementById("allowanceLunch").value || 0,
        dinner: document.getElementById("allowanceDinner").value || 0,
        parkingFee: parking,
        remarks: document.getElementById("allowanceRemarks").value.trim()
    };

    const receipts = [];
    for (const file of selectedReceipts) { receipts.push(await fileToBase64(file)); }

    try {
        const payloadData = { token: SECRET_TOKEN, data: payload, receipts: receipts };
        const response = await fetch(WEBAPP_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payloadData)
        });
        
        const text = await response.text();
        let result = JSON.parse(text);

        if (result.success === false && result.message === "DUPLICATE_ENTRY") {
            alert("Already submitted for this trip.");
            return;
        }
        if (!result.success) {
            alert("Error: " + result.message);
            return;
        }

        document.getElementById("successModalTitle").textContent = "Submitted Successfully";
        document.getElementById("successModalText").textContent = "Your meal allowance has been recorded for review and approval.";

        const submittedKey = `${currentDriver.trim().toLowerCase()}|${standardizeDateStr(currentDate)}`;
        submittedDrivers[submittedKey] = true;

        closeModal();
        await loadMainSchedulesAndApprovals();
        document.getElementById("successModal").style.display = "flex";

        document.getElementById("successOK").onclick = async function () {
            document.getElementById("successModal").style.display = "none";
        };
    } catch (err) {
        console.error(err);
        alert("Submission Error:\n\n" + err.message);
    } finally {
        document.getElementById("loadingOverlay").style.display = "none";
        resetSubmitButton(btn);
    }
}

function closeDriverLogin() {
    document.getElementById("driverLoginModal").style.display = "none";
}

function showDriverAllowanceSummary() {
    const loggedInDriverName = localStorage.getItem("driverName");
    const requestPage = document.getElementById("driverRequestsPage");

    document.getElementById("driverDashboard").style.display = "none";
    document.getElementById("scheduleApprovalPage").style.display = "none";
    document.getElementById("driverAllowancePage").style.display = "block";

    if (requestPage) requestPage.style.display = "none";

    document.getElementById("dashboardBtn").classList.remove("active");
    document.getElementById("adminBtn").classList.remove("active");
    document.getElementById("allowanceBtn").classList.add("active");

    document.getElementById("driverViewNameHeader").textContent = loggedInDriverName;
    renderDriverViewTable();
    window.scrollTo(0, 0);
}

async function showDriverRequestsPage() {
    const dashboardPage = document.getElementById("driverDashboard");
    const allowancePage = document.getElementById("driverAllowancePage");
    const requestPage = document.getElementById("driverRequestsPage");
    const scheduleApprovalPage = document.getElementById("scheduleApprovalPage");

    if (dashboardPage) dashboardPage.style.display = "none";
    if (allowancePage) allowancePage.style.display = "none";
    if (scheduleApprovalPage) scheduleApprovalPage.style.display = "none";
    if (requestPage) requestPage.style.display = "block";

    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    const requestBtn = document.getElementById("requestBtn");
    if (requestBtn) requestBtn.classList.add("active");

    if (typeof loadDriverRequests === "function") {
        await loadDriverRequests();
    }
    window.scrollTo(0, 0);
}

function renderDriverViewTable() {
    const loggedInDriverName = localStorage.getItem("driverName") || "";
    let selectorValue = document.getElementById("driverViewCutoff").value || "07-1";
    if(!selectorValue.includes("-")) selectorValue = "07-1";

    const [targetMonthStr, targetBucket] = selectorValue.split("-");
    const targetMonth = parseInt(targetMonthStr);

    const tableBody = document.getElementById("driverViewTableBody");
    tableBody.innerHTML = "";

    const filteredRecords = globalParsedAllowances.filter(record => {
        if (record.name.trim().toLowerCase() !== loggedInDriverName.trim().toLowerCase()) return false;
        const parsedDate = new Date(record.date);
        if(isNaN(parsedDate.getTime())) return false;

        const dayNumber = parsedDate.getDate();
        const monthNumber = parsedDate.getMonth() + 1;

        if (monthNumber !== targetMonth) return false;
        if (targetBucket === "1" && dayNumber > 15) return false;
        if (targetBucket === "2" && dayNumber <= 15) return false;

        return true;
    });

    filteredRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    let totalAmount = 0;

    if (filteredRecords.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:16px; color:#6b7280;">No allowance entries recorded for you in this cut-off window.</td></tr>`;
        return;
    }

    filteredRecords.forEach(record => {
        totalAmount += record.amount;
        const row = document.createElement("tr");
        let statusBadge = "";

        if (record.status === "Paid" || record.status === "Approved") {
            statusBadge = `<span class="status-badge status-approved">Paid</span>`;
        } else if (record.status === "Pay") {
            statusBadge = `<span class="status-badge status-pending">For Payment</span>`;
            row.style.backgroundColor = "#dbeafe";
        } else {
            statusBadge = `<span class="status-badge status-pending">For Review</span>`;
            row.style.backgroundColor = "#fef3c7";
        }

        row.innerHTML = `
            <td style="text-align: left;">${record.date}</td>
            <td style="text-align: center; font-weight:700;">₱${record.amount.toLocaleString()}</td>
            <td style="text-align: center;">${statusBadge}</td>
        `;
        tableBody.appendChild(row);
    });

    const totalRow = document.createElement("tr");
    totalRow.style.background = "#e5e7eb";
    totalRow.style.fontWeight = "700";
    totalRow.innerHTML = `
        <td style="color:#14532d; font-size: 11px; text-align: left;">Grand Total</td>
        <td style="text-align: center; color: #14532d;">₱${totalAmount.toLocaleString()}</td>
        <td></td>
    `;
    tableBody.appendChild(totalRow);
}

function openRequestScheduleModal() {
    const modal = document.getElementById("requestScheduleModal");
    if (!modal) return;

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    const requestDate = document.getElementById("requestDate");
    const requestType = document.getElementById("requestType");
    const requestDutyType = document.getElementById("requestDutyType");
    const requestReason = document.getElementById("requestReason");
    const requestTimeIn = document.getElementById("requestTimeIn");
    const requestTimeOut = document.getElementById("requestTimeOut");

    if (requestDate) requestDate.value = "";
    if (requestType) requestType.value = "";
    if (requestDutyType) requestDutyType.value = "";
    if (requestReason) requestReason.value = "";
    if (requestTimeIn) requestTimeIn.value = "";
    if (requestTimeOut) requestTimeOut.value = "";

    const dutyOptions = document.getElementById("requestDutyOptions");
    const timeFields = document.getElementById("requestTimeFields");

    if (dutyOptions) dutyOptions.style.display = "none";
    if (timeFields) timeFields.style.display = "none";
}

function closeRequestScheduleModal() {
    const modal = document.getElementById("requestScheduleModal");
    if (!modal) return;

    modal.style.display = "none";
    document.body.style.overflow = "";
}

function handleRequestTypeChange() {
    const requestType = document.getElementById("requestType").value;
    const dutyOptions = document.getElementById("requestDutyOptions");
    const timeFields = document.getElementById("requestTimeFields");
    const dutyType = document.getElementById("requestDutyType");
    const reason = document.getElementById("requestReason");

    if (requestType === "Request Duty") {
        if (dutyOptions) dutyOptions.style.display = "block";
        if (timeFields) timeFields.style.display = "block";
        if (reason) reason.placeholder = "Enter reason or schedule details";
    } else if (requestType === "Leave") {
        if (dutyOptions) dutyOptions.style.display = "none";
        if (timeFields) timeFields.style.display = "none";
        if (dutyType) dutyType.value = "";
        if (reason) reason.placeholder = "Enter reason for leave";
    } else {
        if (dutyOptions) dutyOptions.style.display = "none";
        if (timeFields) timeFields.style.display = "none";
        if (dutyType) dutyType.value = "";
        if (reason) reason.placeholder = "Enter reason or duty";
    }
}

function handleDutyTypeChange() {
    const dutyType = document.getElementById("requestDutyType").value;
    const reason = document.getElementById("requestReason");
    if (!reason) return;

    if (dutyType === "AM Carpool") {
        reason.placeholder = "Enter reason / AM Carpool details";
    } else if (dutyType === "PM Carpool") {
        reason.placeholder = "Enter reason / PM Carpool details";
    } else if (dutyType === "Others") {
        reason.placeholder = "Please indicate the schedule / duty details";
    } else {
        reason.placeholder = "Enter reason or schedule details";
    }
}

async function submitDriverRequest() {
    const requestDate = document.getElementById("requestDate")?.value.trim();
    const requestType = document.getElementById("requestType")?.value.trim();
    const requestDutyType = document.getElementById("requestDutyType")?.value.trim();
    const requestReason = document.getElementById("requestReason")?.value.trim();
    const requestTimeIn = document.getElementById("requestTimeIn")?.value.trim();
    const requestTimeOut = document.getElementById("requestTimeOut")?.value.trim();
    const driverName = localStorage.getItem("driverName") || localStorage.getItem("username") || "";

    if (!requestDate) {
        alert("Please select a date.");
        return;
    }
    if (!requestType) {
        alert("Please choose a request type.");
        return;
    }
    if (!requestReason) {
        alert("Please enter the reason or duty.");
        return;
    }

    if (requestType === "Request Duty") {
        if (!requestDutyType) {
            alert("Please choose the duty type.");
            return;
        }
        if (!requestTimeIn || !requestTimeOut) {
            alert("Please enter Time In and Time Out.");
            return;
        }
    }

    if (!driverName) {
        alert("Driver information could not be found. Please log in again.");
        return;
    }

    let requestedTime = "";
    if (requestType === "Request Duty") {
        requestedTime = `${requestTimeIn} to ${requestTimeOut}`;
    }

    let reasonDuty = requestReason;
    if (requestType === "Request Duty" && requestDutyType) {
        reasonDuty = `${requestDutyType} - ${requestReason}`;
    }

    openRequestConfirmModal(requestDate, requestType, reasonDuty, requestedTime, async function () {
        try {
            showActionLoading("Submitting Request...", "Please wait while your request is being submitted.");

            const requestURL = `${WEBAPP_BASE}?action=submitDriverRequest&date=${encodeURIComponent(requestDate)}&driverName=${encodeURIComponent(driverName)}&request=${encodeURIComponent(requestType)}&reasonDuty=${encodeURIComponent(reasonDuty)}&requestedTime=${encodeURIComponent(requestedTime)}&token=${encodeURIComponent(SECRET_TOKEN)}&_nc=${Date.now()}`;
            const response = await fetch(requestURL, { method: "GET", cache: "no-store", credentials: "omit" });
            const text = await response.text();

            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                throw new Error("The server returned an invalid response.");
            }

            if (!result.success) throw new Error(result.message || "Unable to submit request.");

            closeRequestScheduleModal();
            const overlay = document.getElementById("actionLoadingOverlay");
            if (overlay) overlay.style.display = "none";

            showRequestSuccessModal();
            if (typeof loadDriverRequests === "function") {
                await loadDriverRequests();
            }
        } catch (error) {
            console.error("Submit Driver Request Error:", error);
            alert(error.message || "Unable to submit request. Please try again.");
        } finally {
            const overlay = document.getElementById("actionLoadingOverlay");
            if (overlay) overlay.style.display = "none";
        }
    });
}

function showActionLoading(title, message){
    const t = document.getElementById("actionLoadingTitle");
    const m = document.getElementById("actionLoadingMessage");
    if (t) t.textContent = title;
    if (m) m.textContent = message;
    document.getElementById("actionLoadingOverlay").style.display = "flex";
}

function hideActionLoading(){ 
    document.getElementById("actionLoadingOverlay").style.display = "none"; 
}

function approveSchedule(date, buttonElement) {
    const confirmModal = document.getElementById("confirmApprovalModal");
    confirmModal.style.display = "flex";
    document.body.style.overflow = "hidden";

    document.getElementById("confirmApprovalOK").onclick = async function () {
        confirmModal.style.display = "none";
        document.body.style.overflow = "";

        buttonElement.disabled = true;
        buttonElement.innerText = "Processing...";
        showActionLoading("Approving Schedule...", "Updating system database. Please wait.");

        try {
            const res = await fetch(`${WEBAPP_BASE}?action=approve&date=${encodeURIComponent(date)}&token=${encodeURIComponent(SECRET_TOKEN)}`, {
                method: "GET",
                mode: "cors"
            });
            const result = await res.json();

            if (result.success === true) {
                document.getElementById("successModalTitle").textContent = "Schedule Approved";
                document.getElementById("successModalText").textContent = `Schedule for ${date} has been approved successfully!`;
                document.getElementById("successModal").style.display = "flex";

                document.getElementById("successOK").onclick = function() {
                    document.getElementById("successModal").style.display = "none";
                    document.getElementById("pageLoadingOverlay").style.display = "flex";
                    window.location.reload(); 
                };
            } else {
                buttonElement.disabled = false;
                buttonElement.innerText = "Approve";
                alert("❌ Failed to approve: " + (result.message || "Unknown error"));
            }
        } catch (err) {
            buttonElement.disabled = false;
            buttonElement.innerText = "Approve";
            console.error(err);
            alert("❌ Network error while approving. Please try again.");
        } finally {
            hideActionLoading();
        }
    };

    document.getElementById("confirmApprovalCancel").onclick = function () {
        confirmModal.style.display = "none";
        document.body.style.overflow = "";
    };
}

function loadScheduleApprovalPage(){
    const approvedDiv = document.getElementById("approvedSchedules");
    const pendingDiv = document.getElementById("pendingSchedules");

    if (!approvedDiv || !pendingDiv) return;

    approvedDiv.innerHTML = "";
    pendingDiv.innerHTML = "";

    const userRole = localStorage.getItem("userRole");
    const isAdmin = userRole !== "organic";

    let selectorValue = document.getElementById("scheduleCutoff") ? document.getElementById("scheduleCutoff").value : "07-1";
    if(!selectorValue.includes("-")) selectorValue = "07-1";

    const [targetMonthStr, targetBucket] = selectorValue.split("-");
    const targetMonth = parseInt(targetMonthStr);

    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    today.setHours(0,0,0,0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0,0,0,0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0,0,0,0);

    const isTomorrowApproved = scheduleDates.some(date => {
        const d = new Date(date);
        d.setHours(0,0,0,0);
        const status = (approvalDates[date] || "").toString().trim().toLowerCase();
        return d.getTime() === tomorrow.getTime() && status === "approved";
    });

    let approvedMainRowsHtml = "";
    let approvedDropdownItems = [];
    let pendingHtml = "";

    let hasApproved = false;
    let hasPending = false;

    scheduleDates.forEach(date => {
        const scheduleDate = new Date(date);
        if (isNaN(scheduleDate.getTime())) return;
        
        const dayNumber = scheduleDate.getDate();
        const monthNumber = scheduleDate.getMonth() + 1;

        if (monthNumber !== targetMonth) return;
        if (targetBucket === "1" && dayNumber > 15) return;
        if (targetBucket === "2" && dayNumber <= 15) return;

        scheduleDate.setHours(0,0,0,0);

        const status = (approvalDates[date] || "").toString().trim().toLowerCase();
        const weekday = formatWeekday(scheduleDate);

        if (status === "approved") {
            hasApproved = true;
            const row = createScheduleRow(
                weekday,
                date,
                `<div class="action-btn-grp justify-center"><button class="action-table-btn btn-view" onclick="viewSchedule('${date}')">View</button></div>`,
                true
            );
            if (isAdmin) {
                const scheduleTime = scheduleDate.getTime();
                let showUpfront = false;

                if (isTomorrowApproved) {
                    if (scheduleTime === today.getTime() || scheduleTime === tomorrow.getTime()) showUpfront = true;
                } else {
                    if (scheduleTime === yesterday.getTime() || scheduleTime === today.getTime()) showUpfront = true;
                }

                if (showUpfront) {
                    approvedMainRowsHtml += row;
                } else {
                    approvedDropdownItems.push({ date: date, html: row });
                }
            } else {
                approvedMainRowsHtml += row;
            }
        } else {
            hasPending = true;
            const pendingRow = createScheduleRow(weekday, date, createActionButtons(date, isAdmin));
            pendingHtml += pendingRow;
        }
    });

    if (hasApproved) {
        approvedDiv.innerHTML = approvedMainRowsHtml;
        if (isAdmin && approvedDropdownItems.length > 0) {
            approvedDropdownItems.sort((a, b) => new Date(a.date) - new Date(b.date));
            let dropdownRow = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 10px;">
                    <select onchange="if(this.value) { viewSchedule(this.value); this.selectedIndex=0; }" style="width: 90%; padding: 6px; font-size: 12px; font-weight: 600; border: 1px solid #14532d; border-radius: 6px; color: #14532d; background: #fff; cursor: pointer;">
                        <option value="" selected disabled>📂 View More Approved Schedules (${approvedDropdownItems.length})</option>
            `;
            approvedDropdownItems.forEach(item => {
                dropdownRow += `<option value="${item.date}">${item.date}</option>`;
            });
            dropdownRow += `</select></td></tr>`;
            approvedDiv.innerHTML += dropdownRow;
        }
    } else {
        approvedDiv.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#14532d; opacity:0.6; padding:16px;">No approved schedules found for this cut-off window.</td></tr>`;
    }

    if (hasPending) {
        pendingDiv.innerHTML = pendingHtml;
    } else {
        renderEmptyTable(pendingDiv, "No pending schedules found for this cut-off window.");
    }
}

function formatWeekday(date) {
    return new Date(date).toLocaleDateString("en-US", { weekday: "long" });
}

function renderEmptyTable(tableBody, message, colspan = 3) {
    tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; color:#14532d; opacity:0.6; padding:16px;">${message}</td></tr>`;
}

function createActionButtons(date, isAdmin) {
    let html = `<div class="action-btn-grp justify-center"><button class="action-table-btn btn-view" onclick="viewSchedule('${date}')">View</button>`;
    if (isAdmin) {
        html += `<button class="action-table-btn btn-approve" onclick="approveSchedule('${date}', this)">Approve</button>`;
    }
    html += `</div>`;
    return html;
}

function createScheduleRow(weekday, date, actionHtml, showLineBreak = false) {
    return `
        <tr>
            <td class="approval-day-name text-left">${weekday}</td>
            <td class="approval-date-val text-center">${date}${showLineBreak ? " <br>" : ""}</td>
            <td>${actionHtml}</td>
        </tr>
    `;
}

function parseCSVRow(row) {
    let cols = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
            cols.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    cols.push(current.trim());
    return cols.map(value => value.replace(/^"|"$/g, "").trim());
}

function isScheduleAcknowledged(date, driverName) {
    if (!date || !driverName) return false;
    const confirmations = approvalConfirmations[date] || {};
    return confirmations[driverName] === true;
}

function getLoggedInDriverName() {
    return (localStorage.getItem("driverName") || "").trim();
}

async function acknowledgeDriverSchedule(date, buttonElement) {
    const driverName = getLoggedInDriverName();
    if (!driverName) {
        alert("Driver name not found. Please log in again.");
        return;
    }
    if (!date) {
        alert("Schedule date is missing.");
        return;
    }

    if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.textContent = "Confirming...";
    }

    try {
        const targetUrl = `${WEBAPP_BASE}?action=acknowledgeSchedule&driver=${encodeURIComponent(driverName)}&date=${encodeURIComponent(date)}&token=${encodeURIComponent(SECRET_TOKEN)}`;
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error("Server returned an error.");

        const result = await response.json();
        if (!result.success) throw new Error(result.message || "Unable to acknowledge schedule.");

        const loaded = await loadMainSchedulesAndApprovals();
        if (!loaded) throw new Error("Schedule was confirmed, but the dashboard could not be refreshed.");
    } catch (error) {
        console.error("Acknowledge schedule error:", error);
        alert(error.message || "Unable to acknowledge this schedule. Please try again.");
        if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.textContent = "Acknowledge Schedule";
        }
    }
}

async function fetchDataWithRetry(url, options = {}, retries = 1, delay = 300) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

function hasPassengerMessageSent(trips) {
    if (!Array.isArray(trips)) return false;
    return trips.some(trip => String(trip.messageSent || "").trim().toLowerCase() === "sent");
}
    
async function loadMainSchedulesAndApprovals() {
    const role = localStorage.getItem("userRole");

    // 1. INSTANT DISPLAY FROM LOCALSTORAGE CACHE
    const cachedSchedules = localStorage.getItem("cached_schedules");
    const cachedApprovals = localStorage.getItem("cached_approvals");

    if (cachedSchedules && cachedApprovals) {
        try {
            processScheduleData(cachedSchedules, cachedApprovals, role);
        } catch (e) {
            console.warn("Error rendering cached schedules:", e);
        }
    }

    // 2. BACKGROUND FETCH FROM GOOGLE SHEETS
    try {
        const cacheBust = Date.now();
        const scheduleFetchURL = `${WEBAPP_BASE}?action=fetchScheduleCSV&token=${encodeURIComponent(SECRET_TOKEN)}&_nc=${cacheBust}`;
        const approvalFetchURL = `${WEBAPP_BASE}?action=fetchApprovalCSV&token=${encodeURIComponent(SECRET_TOKEN)}&_nc=${cacheBust}`;

        const [scheduleResponse, approvalResponse] = await Promise.all([
            fetchDataWithRetry(scheduleFetchURL, { method: "GET", cache: "no-store", credentials: "omit" }),
            fetchDataWithRetry(approvalFetchURL, { method: "GET", cache: "no-store", credentials: "omit" })
        ]);

        if (!scheduleResponse.ok || !approvalResponse.ok) return false;

        const [data, approvalData] = await Promise.all([
            scheduleResponse.text(),
            approvalResponse.text()
        ]);

        if (data.trim().startsWith("<!DOCTYPE") || approvalData.trim().startsWith("<!DOCTYPE")) return false;

        // Save fresh data to cache
        localStorage.setItem("cached_schedules", data);
        localStorage.setItem("cached_approvals", approvalData);

        // Render fresh data
        processScheduleData(data, approvalData, role);
        return true;
    } catch (err) {
        console.error("Safely handled schedule loading error:", err);
        return false;
    }
}

// Helper function to process and render schedule data
function processScheduleData(data, approvalData, role) {
    const rows = data.trim().split("\n").slice(1);
    const approvalAllRows = approvalData.trim().split("\n");
    const approvalHeaders = parseCSVRow(approvalAllRows[0] || "");
    const approvalRows = approvalAllRows.slice(1);

    grouped = {};
    summaryDrivers = {};
    approvalDates = {};
    approvalNotes = {};
    approvalConfirmations = {};

    approvalRows.forEach(row => {
        let cols = parseCSVRow(row);
        const date = (cols[0] || "").replace(/"/g, "").trim();
        const status = (cols[1] || "").replace(/"/g, "").trim().toLowerCase();
        const notes = (cols[2] || "").replace(/"/g, "").trim();

        if (!approvalDates[date] || status === "approved") {
            approvalDates[date] = status;
        }
        if (!approvalNotes[date] || notes) {
            approvalNotes[date] = notes;
        }

        if (!approvalConfirmations[date]) {
            approvalConfirmations[date] = {};
        }

        for (let i = 3; i <= 8; i++) {
            const driverName = (approvalHeaders[i] || "").replace(/"/g, "").trim();
            const confirmation = (cols[i] || "").replace(/"/g, "").trim();
            if (driverName) {
                approvalConfirmations[date][driverName] = confirmation.toLowerCase() === "confirm";
            }
        }
    });

    rows.forEach(row => {
        let cols = parseCSVRow(row);
        if (cols.length < 15) return;

        const [
            driver, date, timeIn, vehicle, itinerary,
            pickupTime, requestedBy, passengerName, contactNumber,
            origin, destination, remarks, tripType, chargeTo, messageSent
        ] = cols.map(v => (v || "").replace(/"/g, "").trim());

        const key = driver + "_" + date;

        if (!summaryDrivers[date]) summaryDrivers[date] = {};
        if (!summaryDrivers[date][driver]) {
            summaryDrivers[date][driver] = { driver, timeIn, vehicle, itinerary, tripType };
        }

        if (!grouped[key]) {
            grouped[key] = { driver, date, timeIn, vehicle, itinerary, tripType, trips: [] };
        }

        if (tripType && !grouped[key].tripType) grouped[key].tripType = tripType;
        grouped[key].trips.push({
            pickupTime, requestedBy, passengerName, contactNumber,
            origin, destination, remarks, chargeTo, messageSent
        });
    });

    scheduleDates = [...new Set(Object.values(grouped).map(d => d.date))].sort();

    const container = document.getElementById("driversContainer");
    let pageHTML = "";
    if (container) container.innerHTML = "";

    const phNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    today.setHours(0, 0, 0, 0);

    scheduleDates.sort((a, b) => {
        const da = new Date(a);
        const db = new Date(b);
        da.setHours(0, 0, 0, 0);
        db.setHours(0, 0, 0, 0);

        const aToday = da.getTime() === today.getTime();
        const bToday = db.getTime() === today.getTime();
        const aPast = da < today;
        const bPast = db < today;

        if (aPast && !bPast) return -1;
        if (!aPast && bPast) return 1;
        if (aToday && !bToday) return -1;
        if (!aToday && bToday) return 1;
        return da - db;
    });

    scheduleDates.forEach(date => {
        const scheduleDate = new Date(date);
        scheduleDate.setHours(0, 0, 0, 0);

        const isPast = scheduleDate.getTime() < today.getTime();
        const isToday = scheduleDate.getTime() === today.getTime();
        const dayName = scheduleDate.toLocaleDateString("en-US", { weekday: "long" });
        const status = (approvalDates[date] || "").toLowerCase();

        if (role === "organic") {
            if (isPast) return; 
        } else {
            if (status !== "approved" && !isPast && !isToday) return;
        }

        let pendingBadgeHeaderHtml = "";
        if (role === "organic" && status !== "approved") {
            pendingBadgeHeaderHtml = `
            <div style="display: inline-block; background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; margin-bottom: 6px;">
                Pending for Approval
            </div>`;
        }

        if (isToday) {
            const hideSummaryTable = phNow.getHours() >= 16;
            let tableRows = "";

            Object.values(summaryDrivers[date] || {}).forEach(driver => {
                let itineraryDisplay = (driver.itinerary || "").trim();
                const isRestDay = itineraryDisplay.toLowerCase() === "rest day";
                let rowClass = isRestDay ? "rest-day-row" : "";

                if (/\bam\b/i.test(itineraryDisplay)) itineraryDisplay = itineraryDisplay.replace(/\bam\b/gi, `<span style="color: #b45309; font-weight: 800;">AM</span>`);
                if (/\bpm\b/i.test(itineraryDisplay)) itineraryDisplay = itineraryDisplay.replace(/\bpm\b/gi, `<span style="color: #1e40af; font-weight: 800;">PM</span>`);

                const isAcknowledgedDriver = isScheduleAcknowledged(date, driver.driver);
                const driverNameDisplay = isAcknowledgedDriver ? `<strong>${driver.driver}</strong>` : driver.driver;

                tableRows += `
                <tr class="${rowClass}">
                    <td>${driverNameDisplay}</td>
                    <td>${driver.timeIn}</td>
                    <td><span style="${getCodingHighlightStyle(driver.vehicle, date)} padding:2px 6px; border-radius:5px; font-weight:700;">${driver.vehicle}</span></td>
                    <td>${itineraryDisplay}</td>
                </tr>`;
            });

            if (!hideSummaryTable) {
                pageHTML += `
                <div class="summary-card">
                    ${pendingBadgeHeaderHtml}
                    <div class="summary-header"><h2>${dayName} | ${date}</h2></div>
                    <table class="summary-table">
                        <thead><tr><th>Driver Name</th><th>Time In</th><th>Unit</th><th>Assignment</th></tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                    ${approvalNotes[date] && approvalNotes[date].trim() !== "" ? `<div class="schedule-notes-box"><div class="schedule-notes-header">Schedule Notes</div><div class="schedule-notes-body">${approvalNotes[date].replace(/\n/g,"<br>")}</div></div>` : ""}
                </div>`;
            }

            Object.values(grouped).filter(d => d.date === date).forEach(d => {
                const itinerary = (d.itinerary || "").trim();
                const noAllowanceItineraries = ["AM", "PM", "AM / Banking", "Banking / PM", "Rest Day", "Standby", "ED", "AM / ED", "ED / PM", "ED / Banking", "Banking"];
                if (noAllowanceItineraries.includes(itinerary)) return;

                let tripsHTML = "";
                d.trips.forEach((trip, index) => {
                    with (trip) {
                        tripsHTML += `
                        <div class="trip-title">Pick-Up ${index + 1}${String(trip.messageSent || "").trim().toLowerCase() === "sent" ? " ✉️" : ""}</div>
                        ${pickupTime ? `<div class="info-item"><div class="info-label">Pick Up Time</div><div class="info-value">${pickupTime}</div></div>` : ""}
                        ${requestedBy ? `<div class="info-item"><div class="info-label">Requested By</div><div class="info-value">${requestedBy} ${!passengerName && contactNumber ? ` | <a href="tel:${contactNumber}" class="phone-link">${contactNumber}</a>` : ""}</div></div>` : ""}
                        ${passengerName ? `<div class="info-item"><div class="info-label">Passenger</div><div class="info-value">${passengerName} ${contactNumber ? ` | <a href="tel:${contactNumber}" class="phone-link">${contactNumber}</a>` : ""}</div></div>` : ""}
                        ${origin ? `<div class="info-item"><div class="info-label">Origin</div><div class="info-value"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(origin)}" target="_blank" class="phone-link">${origin}</a></div></div>` : ""}
                        ${destination ? `<div class="info-item"><div class="info-label">Destination</div><div class="info-value"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}" target="_blank" class="phone-link">${destination}</a></div></div>` : ""}
                        ${remarks ? `<div class="info-item"><div class="info-label">Remarks</div><div class="info-value">${remarks}</div></div>` : ""}
                        `;
                    }
                });

                const distinctReq = [...new Set(d.trips.map(t => t.requestedBy))].filter(Boolean).join(", ");
                const distinctPass = [...new Set(d.trips.map(t => t.passengerName))].filter(Boolean).join(", ");

                const lookupKey = `${d.driver.trim().toLowerCase()}|${standardizeDateStr(d.date)}`;
                const isAlreadySubmitted = submittedDrivers[lookupKey] === true;

                if (!window.passengerMessageData) window.passengerMessageData = {};
                const messageKey = `${d.driver.trim().toLowerCase()}|${standardizeDateStr(d.date)}`;
                window.passengerMessageData[messageKey] = { driver: d.driver, date: d.date, trips: d.trips };

                const messagePassengerBtnHtml = role === "organic" ? "" : `<button class="message-passenger-btn" onclick="openPassengerMessage('${d.driver}','${d.date}')">Notify Passenger</button>`;
                const allowanceBtnHtml = role === "organic" ? "" : (
                    isAlreadySubmitted
                        ? `<button class="allowance-btn" style="background:#9ca3af;cursor:default;" disabled>Allowance Submitted</button>`
                        : `<button class="allowance-btn" onclick="submitAllowance('${d.driver}','${d.date}','${distinctReq}','${distinctPass}','${d.tripType}')">Submit Allowance</button>`
                );

                pageHTML += `
                <div class="driver-card" id="driver-${d.driver.replace(/\s+/g, '-')}">
                    <div class="driver-header">
                       <h2>${d.driver}</h2>
                        <div class="info-item"><div class="info-label">Date</div><div class="info-value">${d.date}</div></div>
                        <div class="info-item"><div class="info-label">Time In</div><div class="info-value">${d.timeIn}</div></div>
                        <div class="info-item"><div class="info-label">Unit</div><div class="info-value">${d.vehicle}</div></div>
                        <div class="info-item"><div class="info-label">Assignment</div><div class="info-value">${d.itinerary}</div></div>
                    </div>
                    ${tripsHTML}
                    <div class="driver-action-buttons">
                        ${messagePassengerBtnHtml}
                        ${allowanceBtnHtml}
                    </div>
                </div>`;
            });
        }

        if (!isPast && !isToday) {
            let tableRows = "";
            Object.values(summaryDrivers[date] || {}).forEach(driver => {
                let itineraryDisplay = (driver.itinerary || "").trim();
                const isRestDay = itineraryDisplay.toLowerCase() === "rest day";
                let rowClass = isRestDay ? "rest-day-row" : "";

                const isAcknowledgedDriver = isScheduleAcknowledged(date, driver.driver);
                const driverNameDisplay = isAcknowledgedDriver ? `<strong>${driver.driver}</strong>` : driver.driver;

                if (/\bam\b/i.test(itineraryDisplay)) itineraryDisplay = itineraryDisplay.replace(/\bam\b/gi, `<span style="color: #b45309; font-weight: 800;">AM</span>`);
                if (/\bpm\b/i.test(itineraryDisplay)) itineraryDisplay = itineraryDisplay.replace(/\bpm\b/gi, `<span style="color: #1e40af; font-weight: 800;">PM</span>`);

                tableRows += `
                    <tr class="${rowClass}">
                        <td>${driverNameDisplay}</td>
                        <td>${driver.timeIn}</td>
                        <td><span style="${getCodingHighlightStyle(driver.vehicle, date)}">${driver.vehicle}</span></td>
                        <td>${itineraryDisplay}</td>
                    </tr>`;
            });

            if (tableRows !== "") {
                pageHTML += `
                    <div class="summary-card ${role === "driver" && status === "approved" && !isScheduleAcknowledged(date, getLoggedInDriverName()) ? "schedule-locked" : ""}">
                        ${pendingBadgeHeaderHtml}
                        <div class="summary-header"><h2>${dayName} | ${date}</h2></div>
                        ${role === "driver" && status === "approved" && !isScheduleAcknowledged(date, getLoggedInDriverName()) ? `
                            <div class="acknowledge-schedule-box">
                                <p class="acknowledge-message">Kindly acknowledge this schedule.</p>
                                <p class="acknowledge-submessage">If there is any confusion about your schedule, just message the Admin.</p>
                                <button class="acknowledge-schedule-btn" onclick="acknowledgeDriverSchedule('${date}', this)">Acknowledge Schedule</button>
                            </div>
                        ` : ""}
                        <table class="summary-table">
                            <thead><tr><th>Driver Name</th><th>Time In</th><th>Unit</th><th>Assignment</th></tr></thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                        ${approvalNotes[date] && approvalNotes[date].trim() !== "" ? `<div class="schedule-notes-box"><div class="schedule-notes-header">Schedule Notes</div><div class="schedule-notes-body">${approvalNotes[date].replace(/\n/g, "<br>")}</div></div>` : ""}
                    </div>`;
            }

            Object.values(grouped).sort().filter(d => d.date === date).forEach(d => {
                const itinerary = (d.itinerary || "").trim();
                const noAllowanceItineraries = ["AM", "PM", "AM / Banking", "Banking / PM", "Rest Day", "Standby", "ED", "AM / ED", "ED / PM", "ED / Banking", "Banking"];
                if (noAllowanceItineraries.includes(itinerary)) return;

                let tripsHTML = "";
                d.trips.forEach((trip, index) => {
                    with (trip) {
                        tripsHTML += `
                            <div class="trip">
                               <div class="trip-title">Pick-Up ${index + 1}${String(trip.messageSent || "").trim().toLowerCase() === "sent" ? " ✉️" : ""}</div>
                                ${pickupTime ? `<div class="info-item"><div class="info-label">Pick Up Time</div><div class="info-value">${pickupTime}</div></div>` : ""}
                                ${requestedBy ? `<div class="info-item"><div class="info-label">Requested By</div><div class="info-value">${requestedBy} ${!passengerName && contactNumber ? ` | <a href="tel:${contactNumber}" class="phone-link">${contactNumber}</a>` : ""}</div></div>` : ""}
                                ${passengerName ? `<div class="info-item"><div class="info-label">Passenger</div><div class="info-value">${passengerName} ${contactNumber ? ` | <a href="tel:${contactNumber}" class="phone-link">${contactNumber}</a>` : ""}</div></div>` : ""}
                                ${origin ? `<div class="info-item"><div class="info-label">Origin</div><div class="info-value"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(origin)}" target="_blank" class="phone-link">${origin}</a></div></div>` : ""}
                                ${destination ? `<div class="info-item"><div class="info-label">Destination</div><div class="info-value"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}" target="_blank" class="phone-link">${destination}</a></div></div>` : ""}
                                ${remarks ? `<div class="info-item"><div class="info-label">Remarks</div><div class="info-value">${remarks}</div></div>` : ""}
                            </div>`;
                    }
                });

                if (!window.passengerMessageData) window.passengerMessageData = {};
                const messageKey = `${d.driver.trim().toLowerCase()}|${standardizeDateStr(d.date)}`;
                window.passengerMessageData[messageKey] = { driver: d.driver, date: d.date, trips: d.trips };

                pageHTML += `
                    <div class="driver-card ${role === "driver" && status === "approved" && !isScheduleAcknowledged(date, getLoggedInDriverName()) ? "schedule-locked" : ""}">
                        <div class="driver-header">
                           <h2>${d.driver}</h2>
                            <div class="info-item"><div class="info-label">Date</div><div class="info-value">${d.date}</div></div>
                            <div class="info-item"><div class="info-label">Time In</div><div class="info-value">${d.timeIn}</div></div>
                            <div class="info-item"><div class="info-label">Unit</div><div class="info-value">${d.vehicle}</div></div>
                            <div class="info-item"><div class="info-label">Assignment</div><div class="info-value">${d.itinerary}</div></div>
                        </div>
                        ${tripsHTML}
                        ${role !== "organic" ? `<div class="driver-action-buttons"><button type="button" class="message-passenger-btn" onclick="openPassengerMessage('${d.driver}','${d.date}')">Notify Passenger</button></div>` : ""}
                    </div>`;
            });
        }

        if (isPast && role !== "organic") {
           const pendingDrivers = Object.values(grouped).filter(d => {
                if (d.date !== date) return false;
                const itinerary = (d.itinerary || "").trim();
                const noAllowanceItineraries = ["AM","PM","AM / Banking","Banking / PM","Rest Day","Standby","ED","AM / ED","ED / PM","ED / Banking","Banking"];
                if (noAllowanceItineraries.includes(itinerary)) return false;

                const cleanDriver = d.driver.trim().replace(/\s+/g, " ").toLowerCase();
                const lookupKey = `${cleanDriver}|${standardizeDateStr(d.date)}`;
                return submittedDrivers[lookupKey] !== true;
            });

            if (pendingDrivers.length === 0) return;

            pageHTML += `<div class="pending-summary-card"><div class="pending-summary-header">${dayName} | ${date}</div><table class="pending-table"><tbody>`;
            pendingDrivers.forEach(d => {
                const distinctReq = [...new Set(d.trips.map(t => t.requestedBy))].filter(Boolean).join(", ");
                const distinctPass = [...new Set(d.trips.map(t => t.passengerName))].filter(Boolean).join(", ");
                pageHTML += `
                    <tr>
                        <td class="pending-driver-cell">${d.driver}</td>
                        <td class="pending-action-cell"><button class="pending-submit-btn" onclick="submitAllowance('${d.driver}','${d.date}','${distinctReq}','${distinctPass}','${d.tripType}')">Submit</button></td>
                    </tr>`;
            });
            pageHTML += `</tbody></table></div>`;
        }
    });

    if (container) {
        container.style.visibility = "visible";
        container.innerHTML = pageHTML;
    }

    updateCutoffDropdownsDynamically();
    loadScheduleApprovalPage();
}

function showHomePage() {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("driverDashboard").style.display = "none";
    document.getElementById("driverAllowancePage").style.display = "none";
    document.getElementById("scheduleApprovalPage").style.display = "none";
    document.getElementById("scheduleViewerPage").style.display = "none";

    backToMainDashboard();
}

function backToMainDashboard() {
    const driverDashboard = document.getElementById("driverDashboard");
    const scheduleApprovalPage = document.getElementById("scheduleApprovalPage");
    const driverAllowancePage = document.getElementById("driverAllowancePage");
    const scheduleViewerPage = document.getElementById("scheduleViewerPage");
    const driverRequestsPage = document.getElementById("driverRequestsPage");

    if (driverDashboard) driverDashboard.style.display = "block";
    if (scheduleApprovalPage) scheduleApprovalPage.style.display = "none";
    if (driverAllowancePage) driverAllowancePage.style.display = "none";
    if (scheduleViewerPage) scheduleViewerPage.style.display = "none";
    if (driverRequestsPage) driverRequestsPage.style.display = "none";

    document.body.style.overflow = "";

    const dashboardBtn = document.getElementById("dashboardBtn");
    const adminBtn = document.getElementById("adminBtn");
    const allowanceBtn = document.getElementById("allowanceBtn");

    if (dashboardBtn) dashboardBtn.classList.add("active");
    if (adminBtn) adminBtn.classList.remove("active");
    if (allowanceBtn) allowanceBtn.classList.remove("active");

    sessionStorage.removeItem("view");
    window.scrollTo(0, 0);
}

function viewSchedule(date){
    document.querySelector(".approval-container").style.display = "none";

    const viewerPage = document.getElementById("scheduleViewerPage");
    viewerPage.style.display = "block";
    document.getElementById("viewerTitle").textContent = "Driver Schedule • " + date;

    const viewerContent = document.getElementById("scheduleViewerContent");
    let viewerHTML = "";

    const scheduleDate = new Date(date);
    const dayName = scheduleDate.toLocaleDateString("en-US", { weekday: "long" });
    let tableRows = "";

    Object.values(summaryDrivers[date] || {}).forEach(driver => {
        let itineraryDisplay = (driver.itinerary || "").trim();
        const isRestDay = itineraryDisplay.toLowerCase() === "rest day";
        let rowClass = isRestDay ? "rest-day-row" : ""; 

        if (/\bam\b/i.test(itineraryDisplay)) itineraryDisplay = itineraryDisplay.replace(/\bam\b/gi, `<span style="color: #b45309; font-weight: 800;">AM</span>`);
        if (/\bpm\b/i.test(itineraryDisplay)) itineraryDisplay = itineraryDisplay.replace(/\bpm\b/gi, `<span style="color: #1e40af; font-weight: 800;">PM</span>`);

        tableRows += `
          <tr class="${rowClass}">
            <td style="padding:8px;border-bottom:1px solid #ddd;">${driver.driver}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;">${driver.timeIn}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;">${driver.vehicle}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;">${itineraryDisplay}</td>
          </tr>`;
    });

    if (tableRows !== "") {
        viewerHTML += `
        <div class="summary-card" id="viewer-summary-${date}">
            <div class="summary-header"><h2>${dayName} | ${date}</h2></div>
            <table class="summary-table">
                <thead><tr><th>Driver Name</th><th>Time In</th><th>Unit</th><th>Assignment</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;

        const scheduleNotes = approvalNotes[date] || "";
        if (scheduleNotes.trim() !== "") {
            viewerHTML += `
            <div class="schedule-notes-box">
                <div class="schedule-notes-header">Schedule Notes</div>
                <div class="schedule-notes-body">${scheduleNotes.replace(/\n/g,"<br>")}</div>
            </div>`;
        }
    }

    Object.values(grouped).filter(d => d.date === date).forEach(d => {
        if (["rest day", "am", "standby", "banking", "pm"].includes((d.itinerary || "").toLowerCase().trim())) return;

        let tripsHTML = "";
        d.trips.forEach((trip, index) => {
            with (trip) {
                tripsHTML += `
                <div class="trip">
                   <div class="trip-title">Pick-Up ${index + 1}${String(trip.messageSent || "").trim().toLowerCase() === "sent" ? " ✉️" : ""}</div>
                    ${pickupTime ? `<div class="info-item"><div class="info-label">Pick Up Time</div><div class="info-value">${pickupTime}</div></div>` : ""}
                    ${requestedBy ? `<div class="info-item"><div class="info-label">Requested By</div><div class="info-value">${requestedBy} ${!passengerName && contactNumber ? ` | <a href="tel:${contactNumber}" class="phone-link">${contactNumber}</a>` : ""}</div></div>` : ""}
                    ${passengerName ? `<div class="info-item"><div class="info-label">Passenger</div><div class="info-value">${passengerName} ${contactNumber ? ` | <a href="tel:${contactNumber}" class="phone-link">${contactNumber}</a>` : ""}</div></div>` : ""}
                    ${origin ? `<div class="info-item"><div class="info-label">Origin</div><div class="info-value"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(origin)}" target="_blank" class="phone-link">${origin}</a></div></div>` : ""}
                    ${destination ? `<div class="info-item"><div class="info-label">Destination</div><div class="info-value"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}" target="_blank" class="phone-link">${destination}</a></div></div>` : ""}
                    ${remarks ? `<div class="info-item"><div class="info-label">Remarks</div><div class="info-value">${remarks}</div></div>` : ""}
                </div>`;
            }
        });

        viewerHTML += `
        <div class="driver-card" style="margin-top: 15px;">
            <div class="driver-header">
              <h2>${d.driver}</h2>
                <div class="info-item"><div class="info-label">Date</div><div class="info-value">${d.date}</div></div>
                <div class="info-item"><div class="info-label">Time In</div><div class="info-value">${d.timeIn}</div></div>
                <div class="info-item"><div class="info-label">Unit</div><div class="info-value">${d.vehicle}</div></div>
                ${d.itinerary ? `<div class="info-item"><div class="info-label">Assignment</div><div class="info-value">${d.itinerary}</div></div>` : ""}
            </div>
            ${tripsHTML}
        </div>`;
    });

    if (viewerHTML === "") {
        viewerHTML = `<div class="driver-card" style="text-align:center; padding:30px; color:#6b7280;">Walang nakatalagang biyahe o active schedule para sa petsang ito.</div>`;
    }

    viewerContent.innerHTML = viewerHTML;
    document.getElementById("scheduleViewerPage").style.display = "block";
    document.body.style.overflow = "hidden"; 
}

window.onload = async function () {
    const role = localStorage.getItem("userRole");
    const driverLoggedIn = localStorage.getItem("driverLoggedIn") === "true";
    const driverExpires = Number(localStorage.getItem("loginExpires") || 0);

    const autoLogin = driverLoggedIn && Date.now() < driverExpires;

    if (!autoLogin) {
        localStorage.removeItem("driverLoggedIn");
        localStorage.removeItem("driverName");
        localStorage.removeItem("driverRole");
        localStorage.removeItem("username");
        localStorage.removeItem("userRole");
        localStorage.removeItem("loginExpires");

        document.getElementById("loginPage").style.display = "block";
        document.getElementById("pageLoadingOverlay").style.display = "none";
        return;
    }

    configureNavigation(role);
    document.getElementById("loginPage").style.display = "none";

    // Show homepage IMMEDIATELY
    showHomePage();

    // Fetch and sync in the background
    try {
        await Promise.all([
            loadSubmittedAllowances(),
            loadMainSchedulesAndApprovals(),
            loadDriverRequests(),
            fetchLiveAllowancesFromSheet()
        ]);
        updateCutoffDropdownsDynamically();
    } catch (err) {
        console.error("Initialization Sync Error:", err);
    } finally {
        document.getElementById("pageLoadingOverlay").style.display = "none";
    }
};

function openManualConfirmModal() {
    const modal = document.getElementById("manualConfirmModal");
    if (!modal) return;
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
}

function closeManualConfirmModal() {
    const modal = document.getElementById("manualConfirmModal");
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "";
}

function continueToManualSheet() {
    closeManualConfirmModal();
    window.open("https://docs.google.com/spreadsheets/d/1FIwwERah3guTaW33JdkK0bp_oQ5qjqUdbiY1SjrGMRY/edit?gid=0#gid=0", "_blank");
}

document.getElementById("loginBtn").addEventListener("click", loginDriver);
document.getElementById("manualBtn").addEventListener("click", () => openManualConfirmModal());

function showLoginSpinner(title, message) {
    document.getElementById("loadingTitle").textContent = title;
    document.getElementById("loadingMessage").textContent = message;
    document.getElementById("loginLoadingOverlay").style.display = "flex";
}

function hideLoginSpinner() {
    document.getElementById("loginLoadingOverlay").style.display = "none";
}

async function loginDriver() {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const errorDiv = document.getElementById("loginError");

    errorDiv.textContent = "";

    if (!username || !password) {
        errorDiv.textContent = "Please enter your username and password.";
        return;
    }

    try {
        showLoginSpinner("Signing In...", "Checking your login credentials...");

        const response = await fetch(`${WEBAPP_BASE}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&token=${encodeURIComponent(SECRET_TOKEN)}`);
        const result = await response.json();

        if (!result.success) {
            hideLoginSpinner();
            errorDiv.textContent = result.message || "Invalid username or password.";
            return;
        }

        localStorage.setItem("driverLoggedIn", "true");
        localStorage.setItem("username", result.name);
        localStorage.setItem("userRole", result.role);
        localStorage.setItem("driverName", result.name);
        localStorage.setItem("driverRole", result.role);

        refreshLoginSession();
        configureNavigation(result.role);
        hideLoginSpinner();

        document.getElementById("loginPage").style.display = "none";

        if (result.role === "driver") {
            showReminderModal();
            return;
        }

        showLoginSpinner("Loading Dashboard...", "Fetching latest schedules...");

        await Promise.all([
            loadSubmittedAllowances(),
            fetchLiveAllowancesFromSheet(),
            loadMainSchedulesAndApprovals()
        ]);

        updateCutoffDropdownsDynamically();
        hideLoginSpinner();
        showHomePage();
    } catch (err) {
        hideLoginSpinner();
        console.error("Login / Dashboard loading error:", err);
        errorDiv.textContent = "Unable to connect to the server.";
    }
}
    
function showReminderModal() {
    const driverName = localStorage.getItem("username") || "Driver";
    document.getElementById("driverNameText").textContent = driverName;
    document.getElementById("driverReminderModal").style.display = "flex";
}

async function confirmReminder() {
    document.getElementById("driverReminderModal").style.display = "none";
    
    // Open main page immediately
    showHomePage();

    // Background sync
    try {
        await Promise.all([
            loadSubmittedAllowances(),
            loadMainSchedulesAndApprovals(),
            fetchLiveAllowancesFromSheet(),
            loadDriverRequests()
        ]);
        updateCutoffDropdownsDynamically();
    } catch (err) {
        console.error("Error syncing driver dashboard:", err);
    }
}
