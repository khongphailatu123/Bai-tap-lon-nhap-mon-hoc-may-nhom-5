"use strict";

window.StayWise = {
  state: {
    employees: [],
    predictions: [],
    supportRequests: [],
    lastUpdated: null,
    pendingDeleteId: null,
    editingEmployeeId: null,
    latestPrediction: null,
    employeePage: 1,
    pageSize: 10,
    employeeSort: "risk-desc"
  },
  departments: ["Kỹ thuật", "Kinh doanh", "Nhân sự", "Marketing", "Tài chính", "Vận hành"],
  avatarColors: [
    ["#eeeaff", "#705ed7"], ["#eaf5ff", "#5485c6"], ["#fff1e9", "#d58656"],
    ["#eaf8f1", "#429978"], ["#fff4dd", "#bd9844"], ["#fcecf3", "#c46e93"]
  ]
};

(() => {
  const app = window.StayWise;

  app.apiRequest = async (path, options = {}) => {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Lỗi API (${response.status}).`);
    return payload;
  };

  app.riskLevel = (score) => score >= 65 ? "high" : score >= 35 ? "medium" : "low";
  app.riskLabel = (level) => level === "high" ? "Rủi ro cao" : level === "medium" ? "Rủi ro trung bình" : "Rủi ro thấp";
  app.boundedNumber = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };
  app.initials = (name) => name.trim().split(/\s+/).slice(-2).map((part) => part[0] || "").join("").toUpperCase();
  app.avatarStyle = (name) => {
    const index = Array.from(name).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % app.avatarColors.length;
    return `background:${app.avatarColors[index][0]};color:${app.avatarColors[index][1]}`;
  };
  app.safeText = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  app.fmtNumber = (number, digits = 0) => Number(number).toLocaleString("vi-VN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
  app.showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.getElementById("toastContainer").append(toast);
    window.setTimeout(() => toast.remove(), 3700);
  };
  app.updateLastUpdated = () => {
    const { lastUpdated } = app.state;
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
  };
  app.getCounts = () => {
    const counts = { low: 0, medium: 0, high: 0 };
    app.state.employees.forEach((employee) => { counts[app.riskLevel(employee.risk)] += 1; });
    return counts;
  };
  app.downloadBlob = (content, filename, type) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  app.navigateTo = (page) => {
    const target = document.getElementById(`page-${page}`);
    if (!target) return;
    document.querySelectorAll(".page-view").forEach((view) => view.classList.remove("active"));
    target.classList.add("active");
    document.querySelectorAll(".nav-item[data-page]").forEach((item) => item.classList.toggle("active", item.dataset.page === page));
    const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
    document.getElementById("breadcrumbCurrent").textContent = activeNav
      ? activeNav.querySelector("span:nth-child(2)").textContent
      : target.querySelector("h1")?.textContent || "StayWise";
    document.getElementById("sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
})();
