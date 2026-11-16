"use strict";

const departments = ["Kỹ thuật", "Kinh doanh", "Nhân sự", "Marketing", "Tài chính", "Vận hành"];
const avatarColors = [
  ["#eeeaff", "#705ed7"], ["#eaf5ff", "#5485c6"], ["#fff1e9", "#d58656"],
  ["#eaf8f1", "#429978"], ["#fff4dd", "#bd9844"], ["#fcecf3", "#c46e93"]
];

let employees = [];
let lastUpdated = null;
let pendingDeleteId = null;
let latestPrediction = null;
let selectedRiskPeriod = "Tháng này";

async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Lỗi API (${response.status}).`);
  }
  return payload;
}

function boundedNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function riskLevel(score) {
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function riskLabel(level) {
  return level === "high" ? "Rủi ro cao" : level === "medium" ? "Rủi ro trung bình" : "Rủi ro thấp";
}

function initials(name) {
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0] || "").join("").toUpperCase();
}

function avatarStyle(name) {
  const index = Array.from(name).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % avatarColors.length;
  return `background:${avatarColors[index][0]};color:${avatarColors[index][1]}`;
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function fmtNumber(number, digits = 0) {
  return Number(number).toLocaleString("vi-VN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.append(toast);
  window.setTimeout(() => toast.remove(), 3700);
}

function updateLastUpdated() {
  const label = document.getElementById("lastUpdated");
  const dataDate = document.getElementById("dataUpdatedAt");
  if (!lastUpdated) {
    label.textContent = "Dữ liệu mẫu";
    dataDate.textContent = "Dữ liệu mẫu";
    return;
  }
  const date = new Date(lastUpdated);
  if (Number.isNaN(date.getTime())) {
    label.textContent = "Dữ liệu đã đồng bộ";
    dataDate.textContent = "Không xác định";
    return;
  }
  label.textContent = `Đã lưu ${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  dataDate.textContent = date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getCounts() {
  const counts = { low: 0, medium: 0, high: 0 };
  employees.forEach((employee) => { counts[riskLevel(employee.risk)] += 1; });
  return counts;
}

function employeeRow(employee, compact = false) {
  const level = riskLevel(employee.risk);
  const email = employee.email ? safeText(employee.email) : "Chưa có email";
  const nameCell = `<div class="person-cell"><span class="person-avatar" style="${avatarStyle(employee.name)}">${safeText(initials(employee.name))}</span><span class="person-info"><strong>${safeText(employee.name)}</strong><span>${email}</span></span></div>`;
  const scoreCell = `<span class="risk-score">${employee.risk}%</span><div class="risk-meter"><i class="risk-${level}-fill" style="width:${employee.risk}%"></i></div>`;
  const badge = `<span class="risk-badge badge-${level}">${riskLabel(level)}</span>`;
  const deleteButton = `<button class="icon-button row-menu" data-delete="${safeText(employee.id)}" title="Xóa hồ sơ" aria-label="Xóa ${safeText(employee.name)}">×</button>`;
  if (compact) {
    return `<tr><td>${nameCell}</td><td>${safeText(employee.department)}</td><td>${fmtNumber(employee.tenure, 1)} năm</td><td>${scoreCell}</td><td>${badge}</td><td>${deleteButton}</td></tr>`;
  }
  return `<tr><td>${nameCell}</td><td>${safeText(employee.department)}</td><td>${safeText(employee.role)}</td><td>${fmtNumber(employee.tenure, 1)} năm</td><td>${employee.satisfaction} / 5</td><td>${scoreCell}</td><td>${badge}</td><td>${deleteButton}</td></tr>`;
}

function renderOverview() {
  const counts = getCounts();
  const total = employees.length;
  const highRate = total ? Math.round(counts.high / total * 100) : 0;
  document.getElementById("totalEmployees").textContent = fmtNumber(total);
  document.getElementById("highRiskCount").innerHTML = `${counts.high}<small> NV</small>`;
  document.getElementById("highRiskRate").textContent = highRate;
  document.getElementById("mediumRiskCount").innerHTML = `${counts.medium}<small> NV</small>`;
  document.getElementById("turnoverRate").innerHTML = `${total ? Math.round(employees.reduce((sum, employee) => sum + employee.risk, 0) / total) : 0}<small>%</small>`;
  document.getElementById("donutTotal").textContent = total;
  document.getElementById("lowLegend").textContent = counts.low;
  document.getElementById("mediumLegend").textContent = counts.medium;
  document.getElementById("highLegend").textContent = counts.high;
  document.getElementById("lowPercent").textContent = `${total ? Math.round(counts.low / total * 100) : 0}%`;
  document.getElementById("mediumPercent").textContent = `${total ? Math.round(counts.medium / total * 100) : 0}%`;
  document.getElementById("highPercent").textContent = `${highRate}%`;
  const lowEnd = total ? counts.low / total * 100 : 0;
  const midEnd = total ? lowEnd + counts.medium / total * 100 : 0;
  document.getElementById("riskDonut").style.background = total
    ? `conic-gradient(#63bd96 0 ${lowEnd}%, #e8ba53 ${lowEnd}% ${midEnd}%, #e97c7d ${midEnd}% 100%)`
    : "conic-gradient(#e9eaf0 0 100%)";
  document.getElementById("navEmployeeCount").textContent = total;
  document.getElementById("actionCount").textContent = counts.high + counts.medium;
  const highRisk = [...employees].filter((employee) => employee.risk >= 65).sort((a, b) => b.risk - a.risk).slice(0, 5);
  document.getElementById("highRiskTable").innerHTML = highRisk.length
    ? highRisk.map((employee) => employeeRow(employee, true)).join("")
    : `<tr><td colspan="6" class="empty-row">Chưa có nhân viên thuộc mức rủi ro cao.</td></tr>`;
  renderDepartmentCharts();
  renderEmployeePage();
  renderAnalytics();
  renderActions();
  document.getElementById("dataTotal").textContent = total;
  updateLastUpdated();
}

function renderDepartmentCharts() {
  const departmentsWithPeople = [...new Set([...departments, ...employees.map((employee) => employee.department)])];
  const stats = departmentsWithPeople.map((department) => {
    const people = employees.filter((employee) => employee.department === department);
    const high = people.filter((employee) => riskLevel(employee.risk) === "high").length;
    return { department, total: people.length, rate: people.length ? Math.round(high / people.length * 100) : 0 };
  }).filter((entry) => entry.total);
  const top = stats.sort((a, b) => b.rate - a.rate || b.total - a.total).slice(0, 5);
  const chart = document.getElementById("departmentChart");
  chart.innerHTML = top.length ? top.map((entry) => `<div class="dept-bar-row"><span class="dept-name" title="${safeText(entry.department)}">${safeText(entry.department)}</span><div class="dept-bar-bg"><div class="dept-bar" style="width:${Math.max(entry.rate, 2)}%"></div></div><span class="dept-value">${entry.rate}%</span></div>`).join("") : `<div class="empty-chart">Chưa có dữ liệu phòng ban.</div>`;
}

function renderEmployeePage() {
  const counts = getCounts();
  document.getElementById("employeePageTotal").textContent = employees.length;
  document.getElementById("employeePageHigh").textContent = counts.high;
  document.getElementById("employeePageMedium").textContent = counts.medium;
  document.getElementById("employeePageLow").textContent = counts.low;
  const departmentSelect = document.getElementById("departmentFilter");
  const selectedDepartment = departmentSelect.value;
  const allDepartments = [...new Set([...departments, ...employees.map((employee) => employee.department)])].sort((a, b) => a.localeCompare(b, "vi"));
  departmentSelect.innerHTML = `<option value="">Tất cả phòng ban</option>${allDepartments.map((department) => `<option value="${safeText(department)}">${safeText(department)}</option>`).join("")}`;
  if (allDepartments.includes(selectedDepartment)) departmentSelect.value = selectedDepartment;
  const query = document.getElementById("employeeSearch").value.trim().toLocaleLowerCase("vi");
  const department = departmentSelect.value;
  const level = document.getElementById("riskFilter").value;
  const filtered = employees.filter((employee) => {
    const searchText = `${employee.name} ${employee.email} ${employee.department} ${employee.role}`.toLocaleLowerCase("vi");
    return (!query || searchText.includes(query))
      && (!department || employee.department === department)
      && (!level || riskLevel(employee.risk) === level);
  }).sort((a, b) => b.risk - a.risk);
  document.getElementById("employeeTable").innerHTML = filtered.map((employee) => employeeRow(employee)).join("");
  document.getElementById("emptyEmployees").classList.toggle("hidden", filtered.length > 0);
  document.querySelector(".employee-data-table").classList.toggle("hidden", filtered.length === 0);
  document.getElementById("employeeResultCount").textContent = `Hiển thị ${filtered.length} / ${employees.length} nhân viên`;
  attachDeleteHandlers();
}

function renderAnalytics() {
  const total = employees.length;
  const counts = getCounts();
  const average = (property) => total ? employees.reduce((sum, employee) => sum + Number(employee[property] || 0), 0) / total : 0;
  const satisfaction = average("satisfaction");
  const tenure = average("tenure");
  const salary = average("salary");
  const overtime = employees.filter((employee) => employee.overtime >= 10).length;
  document.getElementById("avgSatisfaction").textContent = `${satisfaction.toFixed(1)} / 5`;
  document.getElementById("avgTenure").textContent = `${tenure.toFixed(1)} năm`;
  document.getElementById("avgSalary").textContent = `${fmtNumber(Math.round(salary))} $`;
  document.getElementById("overtimeRate").textContent = `${total ? Math.round(overtime / total * 100) : 0}%`;
  document.getElementById("satisfactionProgress").style.width = `${satisfaction * 20}%`;
  document.getElementById("tenureProgress").style.width = `${Math.min(tenure / 10 * 100, 100)}%`;
  document.getElementById("salaryProgress").style.width = `${Math.min(salary / 25000 * 100, 100)}%`;
  document.getElementById("overtimeProgress").style.width = `${total ? overtime / total * 100 : 0}%`;
  const departmentsWithPeople = [...new Set([...departments, ...employees.map((employee) => employee.department)])];
  const chart = departmentsWithPeople.map((department) => {
    const people = employees.filter((employee) => employee.department === department);
    const departmentCounts = { low: 0, medium: 0, high: 0 };
    people.forEach((employee) => departmentCounts[riskLevel(employee.risk)]++);
    return { department, people, departmentCounts };
  }).filter((item) => item.people.length).sort((a, b) => b.people.length - a.people.length);
  document.getElementById("stackedChart").innerHTML = chart.length ? chart.map((item) => {
    const pct = (count) => item.people.length ? count / item.people.length * 100 : 0;
    return `<div class="stacked-row"><span class="stacked-label" title="${safeText(item.department)}">${safeText(item.department)}</span><div class="stacked-track" title="Thấp: ${item.departmentCounts.low} · Trung bình: ${item.departmentCounts.medium} · Cao: ${item.departmentCounts.high}"><i class="stacked-seg stacked-low" style="width:${pct(item.departmentCounts.low)}%"></i><i class="stacked-seg stacked-medium" style="width:${pct(item.departmentCounts.medium)}%"></i><i class="stacked-seg stacked-high" style="width:${pct(item.departmentCounts.high)}%"></i></div><span class="stacked-count">${item.people.length}</span></div>`;
  }).join("") : `<div class="empty-chart">Chưa có dữ liệu để phân tích.</div>`;
  const factorInfo = [
    ["Mức hài lòng thấp", "tăng nguy cơ", 92],
    ["Làm thêm nhiều giờ", "tăng nguy cơ", 79],
    ["Cân bằng công việc thấp", "tăng nguy cơ", 70],
    ["Thâm niên ngắn", "tăng nguy cơ", 47],
    ["Mức lương thấp", "tăng nguy cơ", 42]
  ];
  document.getElementById("globalFactors").innerHTML = factorInfo.map(([label, direction, width]) => `<div class="factor-row"><span>${label}</span><span class="factor-strength"><i style="width:${width}%"></i></span><span class="factor-direction-label">${direction}</span></div>`).join("");
  if (!total) {
    document.getElementById("insightTitle").textContent = "Chưa có hồ sơ nhân viên";
    document.getElementById("insightText").textContent = "Nhập bộ dữ liệu hoặc thêm nhân viên để bắt đầu khám phá các xu hướng.";
  } else if (counts.high) {
    document.getElementById("insightTitle").textContent = `${counts.high} nhân viên có mức rủi ro cao cần được lắng nghe`;
    document.getElementById("insightText").textContent = `Mức hài lòng trung bình hiện là ${satisfaction.toFixed(1)}/5. Hãy xem xét trao đổi bảo mật để hiểu thêm bối cảnh thay vì dựa riêng vào điểm số.`;
  } else {
    document.getElementById("insightTitle").textContent = "Các hồ sơ hiện có chủ yếu ở mức rủi ro thấp hoặc trung bình";
    document.getElementById("insightText").textContent = `Điểm hài lòng trung bình là ${satisfaction.toFixed(1)}/5. Duy trì trao đổi định kỳ và rà soát điều kiện làm việc.`;
  }
}

function actionEntry(employee, suggestion) {
  return `<div class="action-person"><span class="person-avatar" style="${avatarStyle(employee.name)}">${safeText(initials(employee.name))}</span><span class="action-person-info"><strong>${safeText(employee.name)} · ${employee.risk}%</strong><span>${safeText(employee.department)} · ${safeText(employee.role)}</span></span><p>${suggestion}</p></div>`;
}

function renderActions() {
  const counts = getCounts();
  document.getElementById("actionHighCount").textContent = counts.high;
  document.getElementById("actionMediumCount").textContent = counts.medium;
  document.getElementById("actionLowCount").textContent = counts.low;
  const high = [...employees].filter((employee) => riskLevel(employee.risk) === "high").sort((a, b) => b.risk - a.risk).slice(0, 4);
  const medium = [...employees].filter((employee) => riskLevel(employee.risk) === "medium").sort((a, b) => b.risk - a.risk).slice(0, 4);
  document.getElementById("highActionList").innerHTML = high.length
    ? high.map((employee) => actionEntry(employee, suggestionFor(employee))).join("")
    : `<div class="empty-chart">Hiện chưa có hồ sơ ở mức rủi ro cao.</div>`;
  document.getElementById("mediumActionList").innerHTML = medium.length
    ? medium.map((employee) => actionEntry(employee, suggestionFor(employee))).join("")
    : `<div class="empty-chart">Hiện chưa có hồ sơ ở mức rủi ro trung bình.</div>`;
}

function suggestionFor(employee) {
  if (employee.satisfaction <= 2) return "Gợi ý: trò chuyện riêng về mức độ hài lòng và điều nhân viên mong muốn thay đổi.";
  if (employee.overtime >= 10) return "Gợi ý: rà soát khối lượng công việc và khả năng phân bổ lại nhiệm vụ.";
  if (employee.tenure < 2) return "Gợi ý: kiểm tra trải nghiệm hội nhập, người hướng dẫn và lộ trình phát triển.";
  if (employee.balance <= 2) return "Gợi ý: cùng trao đổi về cân bằng thời gian, lịch làm và hỗ trợ phù hợp.";
  return "Gợi ý: hỏi thăm định kỳ về mục tiêu nghề nghiệp và cơ hội phát triển.";
}

function attachDeleteHandlers() {
  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      pendingDeleteId = button.dataset.delete;
      const employee = employees.find((entry) => entry.id === pendingDeleteId);
      document.getElementById("confirmText").textContent = employee
        ? `Hồ sơ của ${employee.name} sẽ bị xóa khỏi dữ liệu trên thiết bị này.`
        : "Hồ sơ sẽ bị xóa khỏi dữ liệu trên thiết bị này.";
      document.getElementById("confirmDialog").showModal();
    });
  });
}

function navigateTo(page) {
  const target = document.getElementById(`page-${page}`);
  if (!target) return;
  document.querySelectorAll(".page-view").forEach((view) => view.classList.remove("active"));
  target.classList.add("active");
  document.querySelectorAll(".nav-item[data-page]").forEach((item) => item.classList.toggle("active", item.dataset.page === page));
  const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
  document.getElementById("breadcrumbCurrent").textContent = activeNav ? activeNav.querySelector("span:nth-child(2)").textContent : page === "data" ? "Dữ liệu & báo cáo" : "Tổng quan";
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function exportCsv(list = employees, filename = "staywise-nhan-vien.csv") {
  const headers = ["name", "email", "department", "role", "tenure", "satisfaction", "salary", "overtime", "distance", "age", "balance", "risk"];
  const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = list.map((employee) => headers.map((header) => escapeCell(employee[header])).join(","));
  downloadBlob(`\uFEFF${[headers.join(","), ...rows].join("\r\n")}`, filename, "text/csv;charset=utf-8");
  showToast(`Đã xuất ${list.length} hồ sơ nhân viên.`, "success");
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"' && value === "") {
      quoted = true;
    } else if (char === ",") {
      row.push(value.trim());
      value = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);
  if (quoted) throw new Error("Tệp CSV có dấu ngoặc kép chưa được đóng.");
  if (rows.length < 2) throw new Error("Tệp CSV cần có dòng tiêu đề và ít nhất một hồ sơ.");
  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
  const nameIndex = headers.findIndex((header) => ["name", "tên", "ho ten", "họ tên", "employee"].includes(header));
  if (nameIndex < 0) throw new Error("Không tìm thấy cột name (hoặc tên / họ tên).");
  return rows.slice(1).map((cells, rowIndex) => {
    const valueFor = (...names) => {
      const index = headers.findIndex((header) => names.includes(header));
      return index >= 0 ? cells[index] : "";
    };
    const name = cells[nameIndex];
    if (!name) throw new Error(`Dòng ${rowIndex + 2}: thiếu tên nhân viên.`);
    const numeric = (fallback, ...names) => {
      const raw = valueFor(...names);
      if (raw === "") return fallback;
      const number = Number(raw);
      if (!Number.isFinite(number)) throw new Error(`Dòng ${rowIndex + 2}: giá trị ${names[0]} không hợp lệ.`);
      return number;
    };
    return {
      name,
      email: valueFor("email"),
      department: valueFor("department", "phòng ban", "phong ban") || "Khác",
      role: valueFor("role", "chức vụ", "chuc vu") || "Nhân viên",
      tenure: numeric(0, "tenure", "thâm niên", "tham nien"),
      satisfaction: numeric(3, "satisfaction", "hài lòng", "hai long"),
      salary: numeric(8000, "salary", "lương", "luong"),
      overtime: numeric(0, "overtime", "làm thêm", "lam them"),
      distance: numeric(0, "distance", "khoảng cách", "khoang cach"),
      age: numeric(30, "age", "tuổi", "tuoi"),
      balance: numeric(3, "balance", "cân bằng", "can bang")
    };
  });
}

async function predictFromForm(event) {
  event.preventDefault();
  const person = {
    name: document.getElementById("predName").value.trim(),
    age: boundedNumber(document.getElementById("predAge").value, 18, 70, 30),
    department: document.getElementById("predDepartment").value,
    role: document.getElementById("predRole").value,
    tenure: boundedNumber(document.getElementById("predTenure").value, 0, 40, 0),
    salary: boundedNumber(document.getElementById("predSalary").value, 1000, 100000, 8000),
    satisfaction: boundedNumber(document.getElementById("predSatisfaction").value, 1, 5, 3),
    overtime: boundedNumber(document.getElementById("predOvertime").value, 0, 80, 0),
    distance: boundedNumber(document.getElementById("predDistance").value, 0, 200, 0),
    balance: boundedNumber(document.getElementById("predBalance").value, 1, 5, 3),
    email: ""
  };
  if (!person.name) {
    document.getElementById("predName").focus();
    return;
  }
  const submitButton = document.querySelector(".predict-submit");
  submitButton.disabled = true;
  try {
    latestPrediction = await apiRequest("/predict", { method: "POST", body: person });
    renderPrediction(latestPrediction);
    document.getElementById("predictionResult").classList.remove("hidden");
    document.getElementById("predictionResult").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    console.error("Không thể dự đoán:", error);
    showToast(error.message || "Không thể kết nối dịch vụ dự đoán.", "error");
  } finally {
    submitButton.disabled = false;
  }
}

function renderPrediction(person) {
  const level = riskLevel(person.risk);
  document.getElementById("resultPercent").textContent = `${person.risk}%`;
  document.getElementById("resultBadge").className = `risk-badge badge-${level}`;
  document.getElementById("resultBadge").textContent = riskLabel(level);
  document.getElementById("resultName").textContent = `${person.name} · ${person.department}`;
  const factors = [...person.factors].sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect)).slice(0, 4);
  document.getElementById("factorList").innerHTML = factors.map((factor) => {
    const positive = factor.effect > 0;
    const width = Math.max(5, Math.min(100, Math.abs(factor.effect) / 1.7 * 100));
    return `<div class="factor-item"><span class="factor-label">${factor.label}</span><span class="factor-track"><i class="${positive ? "" : "negative-factor"}" style="width:${width}%"></i></span><span class="factor-direction ${positive ? "" : "factor-down"}">${positive ? "↑ Tăng" : "↓ Giảm"}</span></div>`;
  }).join("");
  let recommendation;
  if (person.satisfaction <= 2) recommendation = "<strong>Gợi ý:</strong> Trao đổi riêng về mức độ hài lòng, lắng nghe điều nhân viên muốn thay đổi và thống nhất bước hỗ trợ.";
  else if (person.overtime >= 10) recommendation = "<strong>Gợi ý:</strong> Rà soát khối lượng công việc, lịch làm và cơ hội phân bổ lại nhiệm vụ.";
  else if (person.tenure < 2) recommendation = "<strong>Gợi ý:</strong> Hỏi thăm trải nghiệm hội nhập, người hướng dẫn và cơ hội phát triển.";
  else recommendation = "<strong>Gợi ý:</strong> Duy trì trao đổi định kỳ về mục tiêu, động lực và điều kiện làm việc.";
  document.getElementById("resultRecommendation").innerHTML = `${recommendation} Đây chỉ là gợi ý tham khảo, hãy trao đổi trực tiếp với nhân viên.`;
}

async function addEmployeeFromDialog(event) {
  event.preventDefault();
  const newEmployee = {
    name: document.getElementById("newName").value,
    email: document.getElementById("newEmail").value,
    department: document.getElementById("newDepartment").value,
    role: document.getElementById("newRole").value,
    tenure: document.getElementById("newTenure").value,
    satisfaction: document.getElementById("newSatisfaction").value,
    salary: document.getElementById("newSalary").value,
    overtime: document.getElementById("newOvertime").value,
    distance: 0,
    age: 30,
    balance: 3
  };
  try {
    const result = await apiRequest("/employees", { method: "POST", body: newEmployee });
    employees.unshift(result.employee);
    lastUpdated = result.updatedAt;
    renderOverview();
    document.getElementById("employeeDialog").close();
    document.getElementById("addEmployeeForm").reset();
    showToast(`Đã thêm ${newEmployee.name} vào danh sách.`);
  } catch (error) {
    console.error("Không thể thêm nhân viên:", error);
    showToast(error.message || "Không thể lưu hồ sơ nhân viên.", "error");
  }
}

async function init() {
  const now = new Date();
  document.getElementById("todayDate").textContent = now.toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();
  document.querySelectorAll(".current-year").forEach((element) => { element.textContent = now.getFullYear(); });
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => navigateTo(button.dataset.page));
  });
  document.getElementById("menuToggle").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
  document.getElementById("dismissBanner").addEventListener("click", () => document.querySelector(".demo-banner").remove());
  document.getElementById("notificationButton").addEventListener("click", () => showToast("Đây là bản demo: bạn không có thông báo mới.", "info"));
  document.getElementById("riskPeriod").addEventListener("click", () => {
    selectedRiskPeriod = selectedRiskPeriod === "Tháng này" ? "30 ngày qua" : "Tháng này";
    document.getElementById("riskPeriod").innerHTML = `${selectedRiskPeriod} <span>⌄</span>`;
    showToast("Biểu đồ hiển thị phân bố hiện tại; chưa có dữ liệu lịch sử theo thời gian.", "info");
  });
  ["employeeSearch", "departmentFilter", "riskFilter"].forEach((id) => {
    document.getElementById(id).addEventListener(id === "employeeSearch" ? "input" : "change", renderEmployeePage);
  });
  document.getElementById("resetFilters").addEventListener("click", () => {
    document.getElementById("employeeSearch").value = "";
    document.getElementById("departmentFilter").value = "";
    document.getElementById("riskFilter").value = "";
    renderEmployeePage();
  });
  document.getElementById("addEmployeeButton").addEventListener("click", () => document.getElementById("employeeDialog").showModal());
  document.getElementById("closeEmployeeDialog").addEventListener("click", () => document.getElementById("employeeDialog").close());
  document.getElementById("cancelEmployee").addEventListener("click", () => document.getElementById("employeeDialog").close());
  document.getElementById("addEmployeeForm").addEventListener("submit", addEmployeeFromDialog);
  document.getElementById("confirmDelete").addEventListener("click", async (event) => {
    event.preventDefault();
    if (!pendingDeleteId) return;
    try {
      const result = await apiRequest(`/employees/${encodeURIComponent(pendingDeleteId)}`, { method: "DELETE" });
      employees = employees.filter((employee) => employee.id !== pendingDeleteId);
      lastUpdated = result.updatedAt;
      pendingDeleteId = null;
      renderOverview();
      document.getElementById("confirmDialog").close();
      showToast("Đã xóa hồ sơ nhân viên.");
    } catch (error) {
      console.error("Không thể xóa nhân viên:", error);
      showToast(error.message || "Không thể xóa hồ sơ nhân viên.", "error");
    }
  });
  document.getElementById("predictionForm").addEventListener("submit", predictFromForm);
  ["predSatisfaction", "predBalance"].forEach((id) => {
    document.getElementById(id).addEventListener("input", (event) => {
      document.getElementById(id === "predSatisfaction" ? "satisfactionValue" : "balanceValue").textContent = event.target.value;
    });
  });
  document.getElementById("closeResult").addEventListener("click", () => document.getElementById("predictionResult").classList.add("hidden"));
  document.getElementById("savePrediction").addEventListener("click", async () => {
    if (!latestPrediction) return;
    if (employees.some((employee) => employee.name.toLocaleLowerCase("vi") === latestPrediction.name.toLocaleLowerCase("vi"))) {
      showToast("Nhân viên cùng tên đã có trong danh sách. Hãy kiểm tra trước khi thêm.", "error");
      return;
    }
    const { factors, risk, ...savedPrediction } = latestPrediction;
    try {
      const result = await apiRequest("/employees", { method: "POST", body: savedPrediction });
      employees.unshift(result.employee);
      lastUpdated = result.updatedAt;
      renderOverview();
      showToast(`Đã lưu dự đoán của ${latestPrediction.name}.`);
    } catch (error) {
      console.error("Không thể lưu dự đoán:", error);
      showToast(error.message || "Không thể lưu hồ sơ nhân viên.", "error");
    }
  });
  document.getElementById("printPrediction").addEventListener("click", () => window.print());
  ["overviewExport", "analyticsExport", "employeeExport", "dataExportCsv"].forEach((id) => {
    document.getElementById(id).addEventListener("click", () => exportCsv());
  });
  document.getElementById("dataExportJson").addEventListener("click", () => {
    downloadBlob(JSON.stringify({ exportedAt: new Date().toISOString(), employees }, null, 2), "staywise-sao-luu.json", "application/json");
    showToast("Đã tải bản sao lưu JSON.");
  });
  document.getElementById("templateDownload").addEventListener("click", () => {
    const template = "\uFEFFname,email,department,role,tenure,satisfaction,salary,overtime,distance,age,balance\r\nNguyễn Minh Anh,minhanh@example.com,Kỹ thuật,Chuyên viên,3,4,12000,5,10,30,4";
    downloadBlob(template, "staywise-mau-nhap-lieu.csv", "text/csv;charset=utf-8");
    showToast("Đã tải tệp CSV mẫu.");
  });
  document.getElementById("csvUpload").addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Tệp vượt quá giới hạn 2 MB.", "error");
      event.target.value = "";
      return;
    }
    try {
      const imported = parseCsv(await file.text());
      const existing = new Set(employees.map((employee) => `${employee.name.toLocaleLowerCase("vi")}|${employee.department.toLocaleLowerCase("vi")}`));
      const unique = imported.filter((employee) => !existing.has(`${employee.name.toLocaleLowerCase("vi")}|${employee.department.toLocaleLowerCase("vi")}`));
      if (!unique.length) {
        showToast("Không có hồ sơ mới; các tên và phòng ban đã tồn tại.", "info");
      } else {
        const result = await apiRequest("/employees/import", { method: "POST", body: { employees: unique } });
        employees = result.employees;
        lastUpdated = result.updatedAt;
        renderOverview();
        document.getElementById("uploadHint").textContent = `Đã nhập ${result.added} hồ sơ mới từ ${file.name}.`;
        showToast(`Đã nhập ${result.added} hồ sơ nhân viên.`);
      }
    } catch (error) {
      console.error("Không thể nhập CSV:", error);
      showToast(error instanceof Error ? error.message : "Không thể đọc tệp CSV.", "error");
    } finally {
      event.target.value = "";
    }
  });
  document.getElementById("resetData").addEventListener("click", async () => {
    const approved = window.confirm("Khôi phục bộ dữ liệu mẫu? Dữ liệu nhân viên hiện tại sẽ bị thay thế.");
    if (!approved) return;
    try {
      const result = await apiRequest("/reset", { method: "POST" });
      employees = result.employees;
      lastUpdated = result.updatedAt;
      renderOverview();
      document.getElementById("uploadHint").textContent = "Tối đa 2 MB · Tệp CSV UTF-8";
      showToast("Đã khôi phục bộ dữ liệu minh họa.");
    } catch (error) {
      console.error("Không thể khôi phục dữ liệu mẫu:", error);
      showToast(error.message || "Không thể khôi phục dữ liệu.", "error");
    }
  });
  document.addEventListener("click", (event) => {
    const sidebar = document.getElementById("sidebar");
    if (sidebar.classList.contains("open") && !sidebar.contains(event.target) && !document.getElementById("menuToggle").contains(event.target)) {
      sidebar.classList.remove("open");
    }
  });
  try {
    const result = await apiRequest("/employees");
    employees = result.employees;
    lastUpdated = result.updatedAt;
    renderOverview();
  } catch (error) {
    console.error("Không thể tải dữ liệu nhân viên:", error);
    showToast("Không kết nối được backend. Hãy chạy lệnh python backend/app.py.", "error");
  }
}

document.addEventListener("DOMContentLoaded", init);
