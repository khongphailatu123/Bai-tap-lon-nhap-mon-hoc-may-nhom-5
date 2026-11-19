"use strict";

(() => {
  const app = window.StayWise;

  app.currentUser = null;
  app.currentEmployee = null;

  app.showAuthView = (tab = "login", message = "") => {
    document.getElementById("authView").hidden = false;
    document.getElementById("appShell").hidden = true;
    const registering = tab === "register";
    document.getElementById("loginForm").classList.toggle("hidden", registering);
    document.getElementById("registerForm").classList.toggle("hidden", !registering);
    document.getElementById("loginTab").classList.toggle("active", !registering);
    document.getElementById("registerTab").classList.toggle("active", registering);
    document.getElementById("loginTab").setAttribute("aria-selected", String(!registering));
    document.getElementById("registerTab").setAttribute("aria-selected", String(registering));
    document.getElementById("authTitle").textContent = registering ? "Tạo tài khoản nhân viên" : "Chào mừng trở lại";
    document.getElementById("authSubtitle").textContent = registering
      ? "Tài khoản mới sẽ có quyền nhân viên và hồ sơ cá nhân riêng."
      : "Đăng nhập để tiếp tục tới không gian StayWise.";
    const error = document.getElementById("authError");
    error.textContent = message;
    error.classList.toggle("hidden", !message);
  };

  app.prepareRoleView = (user) => {
    app.currentUser = user;
    const isAdmin = user.role === "admin";
    document.querySelectorAll("[data-admin-only]").forEach((element) => { element.hidden = !isAdmin; });
    document.querySelectorAll(".employee-only").forEach((element) => { element.hidden = isAdmin; });
    document.getElementById("sidebarUserName").textContent = user.name;
    document.getElementById("sidebarUserRole").textContent = isAdmin ? "Quản trị hệ thống" : "Tài khoản nhân viên";
    document.getElementById("employeeSidebarName").textContent = user.name;
    document.getElementById("employeeSidebarEmail").textContent = user.email;
    app.updateAvatarElement(document.getElementById("employeeAvatar"), user);
    app.updateAvatarElement(document.getElementById("adminAvatar"), user);
    app.updateAvatarElement(document.getElementById("topAvatar"), user);
    document.getElementById("topAvatar").title = user.email;
    document.querySelectorAll(".page-view").forEach((view) => view.classList.remove("active"));
    app.navigateTo(isAdmin ? "overview" : "employee-tools");
    document.getElementById("authView").hidden = true;
    document.getElementById("appShell").hidden = false;
  };

  app.updateAvatarElement = (element, user) => {
    if (!element || !user) return;
    const image = element.querySelector("img");
    const fallback = element.querySelector("span");
    if (image && user.avatarDataUrl) {
      image.src = user.avatarDataUrl;
      image.hidden = false;
      if (fallback) fallback.hidden = true;
    } else {
      if (image) {
        image.removeAttribute("src");
        image.hidden = true;
      }
      if (fallback) {
        fallback.textContent = app.initials(user.name);
        fallback.hidden = false;
      } else {
        element.textContent = app.initials(user.name);
      }
    }
  };

  app.renderEmployeeProfile = () => {
    const employee = app.currentEmployee;
    const form = document.getElementById("myProfileForm");
    const user = app.currentUser;
    if (!user) return;
    form.elements.name.value = user.name;
    form.elements.email.value = user.email;
    document.getElementById("accountRoleLabel").textContent = user.role === "admin" ? "Quản trị viên" : "Nhân viên";
    document.getElementById("accountCreatedLabel").textContent = app.dateLabel(user.createdAt);
    document.getElementById("accountEmailLabel").textContent = user.email;
    app.updateAvatarElement(document.getElementById("accountAvatarPreview"), user);
    document.getElementById("removeAvatar").disabled = !user.avatarDataUrl;
    if (!employee) return;
    for (const field of form.elements) {
      if (field.name && field.name !== "name" && field.name !== "email" && Object.hasOwn(employee, field.name)) {
        field.value = employee[field.name];
      }
    }
    document.getElementById("myRiskScore").textContent = `${employee.risk}%`;
    document.getElementById("myRiskHistoryCount").textContent = app.state.predictions.length;
    const requests = app.state.supportRequests || [];
    document.getElementById("mySupportRequests").innerHTML = requests.length
      ? requests.map((item) => `<tr><td>${app.safeText(app.dateLabel(item.createdAt))}</td><td>${app.safeText(item.subject)}</td><td class="request-message">${app.safeText(item.message)}</td><td><span class="account-status ${item.status === "resolved" ? "active" : "inactive"}">${app.supportStatusLabel(item.status)}</span></td></tr>`).join("")
      : `<tr><td colspan="4" class="empty-row">Bạn chưa gửi yêu cầu hỗ trợ nào.</td></tr>`;
  };

  app.renderMyHistory = () => {
    const history = app.state.predictions;
    const average = history.length
      ? `${Math.round(history.reduce((sum, item) => sum + item.risk, 0) / history.length)}%`
      : "—";
    document.getElementById("myHistoryCount").textContent = history.length;
    document.getElementById("myPredictionCount").textContent = history.length;
    document.getElementById("myAverageRisk").textContent = average;
    document.getElementById("myRiskHistoryCount").textContent = history.length;
    document.getElementById("myHistoryTable").innerHTML = history.length
      ? history.map((entry) => {
        const level = app.riskLevel(entry.risk);
        return `<tr><td>${app.safeText(app.dateLabel(entry.createdAt))}</td><td>${entry.risk}%</td><td><span class="risk-badge badge-${level}">${app.riskLabel(level)}</span></td></tr>`;
      }).join("")
      : `<tr><td colspan="3" class="empty-row">Chưa có lần dự đoán nào trong tài khoản này.</td></tr>`;
  };

  app.loadAdminAccounts = async () => {
    if (!app.currentUser || app.currentUser.role !== "admin") return;
    const [accountResult, requestResult] = await Promise.all([
      app.apiRequest("/admin/accounts"),
      app.apiRequest("/admin/support-requests")
    ]);
    document.getElementById("adminAccountsTable").innerHTML = accountResult.accounts.length
      ? accountResult.accounts.map((account) => {
        const status = account.active ? "Đang hoạt động" : "Đã khóa";
        const role = account.role === "admin" ? "Quản trị viên" : "Nhân viên";
        const isCurrent = account.id === app.currentUser.id;
        return `<tr><td><strong>${app.safeText(account.name)}</strong><br><small>${app.safeText(account.email)}</small></td><td><span class="role-chip">${role}</span></td><td><span class="account-status ${account.active ? "active" : "inactive"}">${status}</span></td><td>${app.safeText(app.dateLabel(account.createdAt))}</td><td><div class="table-actions">${!isCurrent ? `<button class="button button-secondary" data-account-toggle="${app.safeText(account.id)}" data-active="${account.active}">${account.active ? "Khóa" : "Mở khóa"}</button><button class="button button-secondary" data-account-role="${app.safeText(account.id)}" data-role="${account.role}">${account.role === "admin" ? "Hạ quyền" : "Cấp admin"}</button>` : `<small>Tài khoản hiện tại</small>`}</div></td></tr>`;
      }).join("")
      : `<tr><td colspan="5" class="empty-row">Chưa có tài khoản.</td></tr>`;
    app.state.supportRequests = requestResult.requests;
    document.getElementById("adminSupportTable").innerHTML = requestResult.requests.length
      ? requestResult.requests.map((item) => `<tr><td><strong>${app.safeText(item.name)}</strong><br><small>${app.safeText(item.email)}</small></td><td>${app.safeText(item.subject)}</td><td class="request-message">${app.safeText(item.message)}</td><td>${app.safeText(app.dateLabel(item.createdAt))}</td><td><select class="request-status-select" data-request-status="${app.safeText(item.id)}" aria-label="Trạng thái yêu cầu"><option value="open" ${item.status === "open" ? "selected" : ""}>Mới</option><option value="in_progress" ${item.status === "in_progress" ? "selected" : ""}>Đang xử lý</option><option value="resolved" ${item.status === "resolved" ? "selected" : ""}>Đã xử lý</option></select></td></tr>`).join("")
      : `<tr><td colspan="5" class="empty-row">Chưa có yêu cầu hỗ trợ.</td></tr>`;
  };

  app.supportStatusLabel = (status) => ({
    open: "Mới gửi",
    in_progress: "Đang xử lý",
    resolved: "Đã xử lý"
  })[status] || "Không xác định";

  app.dateLabel = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Không rõ"
      : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
  };

  app.readImageDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Không thể đọc nội dung ảnh."));
    }, { once: true });
    reader.addEventListener("error", () => reject(new Error("Không thể đọc tệp ảnh.")), { once: true });
    reader.readAsDataURL(file);
  });

  app.bindAuthActions = () => {
    document.getElementById("loginTab").addEventListener("click", () => app.showAuthView("login"));
    document.getElementById("registerTab").addEventListener("click", () => app.showAuthView("register"));
    document.getElementById("loginForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      try {
        const result = await app.apiRequest("/auth/login", {
          method: "POST",
          body: { email: form.get("email"), password: form.get("password") }
        });
        await app.loadApplicationData(result);
        formElement.reset();
      } catch (error) {
        app.showAuthView("login", error.message);
      }
    });
    document.getElementById("registerForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      if (form.get("password") !== form.get("confirmPassword")) {
        app.showAuthView("register", "Mật khẩu xác nhận không khớp.");
        return;
      }
      try {
        const result = await app.apiRequest("/auth/register", {
          method: "POST",
          body: { name: form.get("name"), email: form.get("email"), department: form.get("department"), password: form.get("password") }
        });
        await app.loadApplicationData(result);
        formElement.reset();
      } catch (error) {
        app.showAuthView("register", error.message);
      }
    });
    ["logoutButton", "employeeLogoutButton"].forEach((id) => {
      document.getElementById(id).addEventListener("click", async () => {
        try {
          await app.apiRequest("/auth/logout", { method: "POST" });
          app.currentUser = null;
          app.showAuthView("login");
        } catch (error) {
          app.showToast(error.message || "Không thể đăng xuất.", "error");
        }
      });
    });
    document.getElementById("myProfileForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.currentTarget));
      if (app.currentUser.role === "admin") {
        for (const field of ["department", "tenure", "age", "salary", "overtime", "distance", "satisfaction", "balance"]) {
          delete body[field];
        }
      }
      try {
        const result = await app.apiRequest("/me", { method: "PUT", body });
        app.currentEmployee = result.employee;
        app.currentUser = result.user;
        if (result.employee) {
          app.state.employees = [result.employee];
          app.state.lastUpdated = result.updatedAt;
        }
        document.getElementById("employeeSidebarName").textContent = result.user.name;
        document.getElementById("employeeSidebarEmail").textContent = result.user.email;
        document.getElementById("sidebarUserName").textContent = result.user.name;
        document.getElementById("sidebarUserRole").textContent = result.user.role === "admin" ? "Quản trị hệ thống" : "Tài khoản nhân viên";
        document.getElementById("topAvatar").title = result.user.email;
        app.updateAvatarElement(document.getElementById("employeeAvatar"), result.user);
        app.updateAvatarElement(document.getElementById("adminAvatar"), result.user);
        app.updateAvatarElement(document.getElementById("topAvatar"), result.user);
        app.renderEmployeeProfile();
        if (result.employee) app.renderOverview();
        app.showToast("Đã cập nhật hồ sơ của bạn.");
      } catch (error) {
        app.showToast(error.message || "Không thể cập nhật hồ sơ.", "error");
      }
    });
    document.getElementById("passwordForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        if (form.get("newPassword") !== form.get("confirmPassword")) {
          app.showToast("Mật khẩu mới nhập lại chưa khớp.", "error");
          return;
        }
        try {
          await app.apiRequest("/me/password", {
            method: "POST",
            body: { currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }
          });
          formElement.reset();
          app.showToast("Đã đổi mật khẩu.");
        } catch (error) {
          app.showToast(error.message || "Không thể đổi mật khẩu.", "error");
        }
    });
    document.getElementById("avatarUpload").addEventListener("change", async (event) => {
      const input = event.currentTarget;
      const file = input.files && input.files[0];
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        app.showToast("Chỉ chấp nhận ảnh PNG, JPEG hoặc WebP.", "error");
        input.value = "";
        return;
      }
      if (file.size > 512 * 1024) {
        app.showToast("Ảnh đại diện không được lớn hơn 512 KB.", "error");
        input.value = "";
        return;
      }
      try {
        const result = await app.apiRequest("/me/avatar", {
          method: "PUT",
          body: { image: await app.readImageDataUrl(file) }
        });
        app.currentUser = result.user;
        app.updateAvatarElement(document.getElementById("employeeAvatar"), result.user);
        app.updateAvatarElement(document.getElementById("adminAvatar"), result.user);
        app.updateAvatarElement(document.getElementById("topAvatar"), result.user);
        app.renderEmployeeProfile();
        document.getElementById("avatarStatus").textContent = `Đã cập nhật ảnh ${file.name}.`;
        app.showToast("Đã đổi ảnh đại diện.");
      } catch (error) {
        app.showToast(error.message || "Không thể đổi ảnh đại diện.", "error");
      } finally {
        input.value = "";
      }
    });
    document.getElementById("removeAvatar").addEventListener("click", async () => {
      if (!app.currentUser.avatarDataUrl) return;
      try {
        const result = await app.apiRequest("/me/avatar", { method: "PUT", body: { image: null } });
        app.currentUser = result.user;
        app.updateAvatarElement(document.getElementById("employeeAvatar"), result.user);
        app.updateAvatarElement(document.getElementById("adminAvatar"), result.user);
        app.updateAvatarElement(document.getElementById("topAvatar"), result.user);
        app.renderEmployeeProfile();
        document.getElementById("avatarStatus").textContent = "Đã xóa ảnh; đang dùng chữ viết tắt từ tên.";
        app.showToast("Đã xóa ảnh đại diện.");
      } catch (error) {
        app.showToast(error.message || "Không thể xóa ảnh đại diện.", "error");
      }
    });
    document.getElementById("revokeSessions").addEventListener("click", async () => {
      if (!window.confirm("Đăng xuất tài khoản này khỏi tất cả trình duyệt và thiết bị khác?")) return;
      try {
        await app.apiRequest("/me/sessions/revoke-others", { method: "POST" });
        app.showToast("Đã đăng xuất các phiên khác. Phiên hiện tại vẫn được giữ.");
      } catch (error) {
        app.showToast(error.message || "Không thể thu hồi phiên đăng nhập.", "error");
      }
    });
    document.getElementById("exportMyData").addEventListener("click", async () => {
      try {
        const result = await app.apiRequest("/me/export");
        app.downloadBlob(JSON.stringify(result, null, 2), "staywise-du-lieu-tai-khoan.json", "application/json");
        app.showToast("Đã tải bản sao dữ liệu cá nhân.");
      } catch (error) {
        app.showToast(error.message || "Không thể xuất dữ liệu cá nhân.", "error");
      }
    });
    document.getElementById("supportForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const body = Object.fromEntries(new FormData(formElement));
      try {
        await app.apiRequest("/me/support-requests", { method: "POST", body });
        const result = await app.apiRequest("/me/support-requests");
        app.state.supportRequests = result.requests;
        app.renderEmployeeProfile();
        formElement.reset();
        app.showToast("Đã gửi yêu cầu hỗ trợ tới admin.");
      } catch (error) {
        app.showToast(error.message || "Không thể gửi yêu cầu.", "error");
      }
    });
    document.getElementById("myRiskCheck").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const result = await app.apiRequest("/me/predict", { method: "POST", body: {} });
        app.state.predictions = result.history;
        app.renderEmployeeProfile();
        app.renderMyHistory();
        app.showToast(`Dự đoán tham khảo của bạn: ${result.prediction.risk}%.`);
      } catch (error) {
        app.showToast(error.message || "Không thể cập nhật dự đoán.", "error");
      } finally {
        button.disabled = false;
      }
    });
    document.getElementById("adminAccountsTable").addEventListener("click", async (event) => {
      const button = event.target.closest("[data-account-toggle], [data-account-role]");
      if (!button) return;
      const isRole = button.hasAttribute("data-account-role");
      const currentRole = button.dataset.role;
      const body = isRole
        ? { role: currentRole === "admin" ? "employee" : "admin", active: true }
        : { active: button.dataset.active !== "true" };
      if (isRole && body.role === "admin" && !window.confirm("Cấp quyền admin cho tài khoản này? Admin có thể xem và quản lý toàn bộ dữ liệu.")) return;
      try {
        await app.apiRequest(`/admin/accounts/${encodeURIComponent(button.dataset.accountToggle || button.dataset.accountRole)}`, { method: "PATCH", body });
        await app.loadAdminAccounts();
        app.showToast("Đã cập nhật quyền tài khoản.");
      } catch (error) {
        app.showToast(error.message || "Không thể cập nhật tài khoản.", "error");
      }
    });
    document.getElementById("adminSupportTable").addEventListener("change", async (event) => {
      const select = event.target.closest("[data-request-status]");
      if (!select) return;
      try {
        await app.apiRequest(`/admin/support-requests/${encodeURIComponent(select.dataset.requestStatus)}`, {
          method: "PATCH",
          body: { status: select.value }
        });
        await app.loadAdminAccounts();
        app.showToast("Đã cập nhật trạng thái yêu cầu.");
      } catch (error) {
        app.showToast(error.message || "Không thể cập nhật yêu cầu.", "error");
      }
    });
  };
})();
