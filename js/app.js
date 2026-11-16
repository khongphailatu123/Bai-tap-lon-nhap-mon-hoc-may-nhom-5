"use strict";

(() => {
  const app = window.StayWise;

  async function deleteEmployee(event) {
    event.preventDefault();
    const employeeId = app.state.pendingDeleteId;
    if (!employeeId) return;
    try {
      const result = await app.apiRequest(`/employees/${encodeURIComponent(employeeId)}`, { method: "DELETE" });
      app.state.employees = app.state.employees.filter((employee) => employee.id !== employeeId);
      app.state.lastUpdated = result.updatedAt;
      app.state.pendingDeleteId = null;
      app.state.employeePage = 1;
      app.renderOverview();
      document.getElementById("confirmDialog").close();
      app.showToast("Đã xóa hồ sơ nhân viên.");
    } catch (error) {
      console.error("Không thể xóa nhân viên:", error);
      app.showToast(error.message || "Không thể xóa hồ sơ nhân viên.", "error");
    }
  }

  function bindNavigation() {
    document.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", () => app.navigateTo(button.dataset.page));
    });
    document.getElementById("menuToggle").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
    document.addEventListener("click", (event) => {
      const sidebar = document.getElementById("sidebar");
      if (sidebar.classList.contains("open") && !sidebar.contains(event.target) && !document.getElementById("menuToggle").contains(event.target)) {
        sidebar.classList.remove("open");
      }
    });
    document.getElementById("dismissBanner").addEventListener("click", () => document.querySelector(".demo-banner").remove());
    document.getElementById("notificationButton").addEventListener("click", () => app.showToast("Đây là bản demo: bạn không có thông báo mới.", "info"));
  }

  function bindEmployeeActions() {
    ["employeeSearch", "departmentFilter", "riskFilter", "employeeSort"].forEach((id) => {
      document.getElementById(id).addEventListener(id === "employeeSearch" ? "input" : "change", () => {
        app.state.employeePage = 1;
        if (id === "employeeSort") app.state.employeeSort = document.getElementById(id).value;
        app.renderEmployees();
      });
    });
    document.getElementById("pageSize").addEventListener("change", (event) => {
      app.state.pageSize = Number(event.target.value);
      app.state.employeePage = 1;
      app.renderEmployees();
    });
    document.getElementById("resetFilters").addEventListener("click", () => {
      document.getElementById("employeeSearch").value = "";
      document.getElementById("departmentFilter").value = "";
      document.getElementById("riskFilter").value = "";
      document.getElementById("employeeSort").value = "risk-desc";
      app.state.employeeSort = "risk-desc";
      app.state.employeePage = 1;
      app.renderEmployees();
    });
    document.getElementById("addEmployeeButton").addEventListener("click", () => app.openEmployeeDialog());
    document.getElementById("closeEmployeeDialog").addEventListener("click", () => document.getElementById("employeeDialog").close());
    document.getElementById("cancelEmployee").addEventListener("click", () => document.getElementById("employeeDialog").close());
    document.getElementById("addEmployeeForm").addEventListener("submit", app.saveEmployee);
    document.getElementById("confirmDelete").addEventListener("click", deleteEmployee);
  }

  function bindPredictionActions() {
    document.getElementById("predictionForm").addEventListener("submit", app.predictFromForm);
    ["predSatisfaction", "predBalance"].forEach((id) => {
      document.getElementById(id).addEventListener("input", (event) => {
        document.getElementById(id === "predSatisfaction" ? "satisfactionValue" : "balanceValue").textContent = event.target.value;
      });
    });
    document.getElementById("closeResult").addEventListener("click", () => document.getElementById("predictionResult").classList.add("hidden"));
    document.getElementById("savePrediction").addEventListener("click", app.saveLatestPrediction);
    document.getElementById("printPrediction").addEventListener("click", () => window.print());
    document.getElementById("clearHistory").addEventListener("click", app.clearPredictionHistory);
    document.getElementById("exportHistory").addEventListener("click", app.exportPredictionHistory);
    document.getElementById("riskPeriod").addEventListener("click", (event) => {
      const button = event.currentTarget;
      button.dataset.period = button.dataset.period === "30" ? "month" : "30";
      button.innerHTML = `${button.dataset.period === "30" ? "30 ngày qua" : "Tháng này"} <span>⌄</span>`;
      app.showToast("Biểu đồ hiển thị phân bố hiện tại; chưa có dữ liệu lịch sử theo thời gian.", "info");
    });
  }

  app.loadApplicationData = async (authResult = null) => {
    try {
      const sessionInfo = authResult || await app.apiRequest("/auth/me");
      if (!sessionInfo.user) {
        app.currentUser = null;
        app.currentEmployee = null;
        app.showAuthView("login");
        return;
      }
      app.currentUser = sessionInfo.user;
      app.currentEmployee = sessionInfo.employee;
      app.prepareRoleView(sessionInfo.user);
      if (sessionInfo.user.role === "admin") {
        const [employeeResult, historyResult] = await Promise.all([
          app.apiRequest("/employees"),
          app.apiRequest("/predictions")
        ]);
        app.state.employees = employeeResult.employees;
        app.state.predictions = historyResult.history;
        app.state.lastUpdated = employeeResult.updatedAt;
        app.state.supportRequests = [];
        app.renderOverview();
        await app.loadAdminAccounts();
      } else {
        if (!sessionInfo.employee) throw new Error("Tài khoản chưa được liên kết hồ sơ nhân viên.");
        const [historyResult, requestResult] = await Promise.all([
          app.apiRequest("/me/predictions"),
          app.apiRequest("/me/support-requests")
        ]);
        app.state.employees = [sessionInfo.employee];
        app.state.predictions = historyResult.history;
        app.state.supportRequests = requestResult.requests;
        app.renderOverview();
        app.renderEmployeeProfile();
        app.renderMyHistory();
      }
    } catch (error) {
      if (!authResult && error.message.includes("đăng nhập")) {
        app.currentUser = null;
        app.currentEmployee = null;
        app.showAuthView("login");
        return;
      }
      console.error("Không thể tải dữ liệu từ backend:", error);
      if (app.currentUser) app.showToast(error.message || "Không thể tải dữ liệu tài khoản.", "error");
      else app.showAuthView("login", "Không kết nối được ứng dụng. Hãy chạy lệnh python app.py.");
    }
  };

  async function init() {
    const now = new Date();
    document.getElementById("todayDate").textContent = now.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).toUpperCase();
    document.querySelectorAll(".current-year").forEach((element) => { element.textContent = now.getFullYear(); });
    app.bindAuthActions();
    bindNavigation();
    bindEmployeeActions();
    bindPredictionActions();
    app.bindDataActions();
    await app.loadApplicationData();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
