"use strict";

(() => {
  const app = window.StayWise;

  app.state.employeePortal = null;
  app.state.adminPortal = null;

  const leaveLabels = {
    annual: "Nghỉ phép năm",
    sick: "Nghỉ ốm",
    personal: "Việc cá nhân",
    other: "Khác"
  };
  const feedbackLabels = {
    workload: "Khối lượng công việc",
    manager: "Quản lý và hỗ trợ",
    environment: "Môi trường làm việc",
    growth: "Cơ hội phát triển",
    other: "Khác"
  };
  const statusLabels = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Đã từ chối",
    enrolled: "Đang học",
    completed: "Hoàn thành",
    draft: "Bản nháp",
    submitted: "Đã gửi",
    reviewed: "Đã phản hồi"
  };

  const dateLabel = (value) => value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN")
    : "Chưa đặt hạn";

  const statusClass = (status) => {
    if (["approved", "completed", "reviewed"].includes(status)) return "active";
    if (["rejected"].includes(status)) return "inactive";
    return "pending";
  };

  const refreshEmployeePortal = async () => {
    app.state.employeePortal = await app.apiRequest("/employee-portal");
    app.renderEmployeePortal();
  };

  app.loadAdminEmployeePortal = async () => {
    if (!app.currentUser || app.currentUser.role !== "admin") return;
    app.state.adminPortal = await app.apiRequest("/admin/employee-portal");
    app.renderAdminEmployeePortal();
  };

  app.renderEmployeePortal = () => {
    const portal = app.state.employeePortal;
    if (!portal) return;
    const pendingLeaves = portal.leaveRequests.filter((item) => item.status === "pending").length;
    const activeGoals = portal.goals.filter((item) => !item.completed).length;
    const openTasks = portal.tasks.filter((item) => !item.completed).length;
    document.getElementById("portalPendingLeaves").textContent = pendingLeaves;
    document.getElementById("portalActiveGoals").textContent = activeGoals;
    document.getElementById("portalOpenTasks").textContent = openTasks;
    const reads = new Set(portal.readAnnouncementIds);
    const unreadCount = portal.announcements.filter((item) => !reads.has(item.id)).length;
    document.getElementById("portalUnreadCount").textContent = unreadCount
      ? `${unreadCount} thông báo chưa đọc`
      : "Bạn đã đọc tất cả thông báo.";
    document.getElementById("employeeAnnouncements").innerHTML = portal.announcements.length
      ? portal.announcements.map((item) => `<article class="portal-list-item ${reads.has(item.id) ? "portal-read" : ""}"><div class="portal-item-heading"><strong>${app.safeText(item.title)}</strong><span class="account-status ${reads.has(item.id) ? "active" : "pending"}">${reads.has(item.id) ? "Đã đọc" : "Mới"}</span></div><p>${app.safeText(item.body)}</p><small>${app.safeText(item.author || "StayWise")} · ${app.safeText(app.dateLabel(item.createdAt))}</small>${reads.has(item.id) ? "" : `<button class="button button-text" type="button" data-announcement-read="${app.safeText(item.id)}">Đánh dấu đã đọc</button>`}</article>`).join("")
      : `<p class="portal-empty">Chưa có thông báo.</p>`;
    document.getElementById("employeeLeaveRequests").innerHTML = portal.leaveRequests.length
      ? portal.leaveRequests.map((item) => `<article class="portal-list-item"><div class="portal-item-heading"><strong>${app.safeText(leaveLabels[item.type] || item.type)}</strong><span class="account-status ${statusClass(item.status)}">${app.safeText(statusLabels[item.status] || item.status)}</span></div><p>${app.safeText(dateLabel(item.startDate))} – ${app.safeText(dateLabel(item.endDate))}</p><small>${app.safeText(item.reason)}</small>${item.adminNote ? `<p class="portal-admin-note">Phản hồi admin: ${app.safeText(item.adminNote)}</p>` : ""}${item.status === "pending" ? `<button class="button button-text" type="button" data-leave-cancel="${app.safeText(item.id)}">Hủy đơn</button>` : ""}</article>`).join("")
      : `<p class="portal-empty">Bạn chưa gửi đơn nghỉ phép.</p>`;
    document.getElementById("employeeGoals").innerHTML = portal.goals.length
      ? portal.goals.map((item) => `<article class="portal-list-item"><div class="portal-item-heading"><strong>${app.safeText(item.title)}</strong><span>${item.progress}%</span></div>${item.description ? `<p>${app.safeText(item.description)}</p>` : ""}<progress max="100" value="${item.progress}"></progress><small>Hạn: ${app.safeText(dateLabel(item.dueDate))}</small><div class="portal-item-actions">${item.completed ? `<span class="account-status active">Hoàn thành</span>` : `<button class="button button-secondary" type="button" data-goal-complete="${app.safeText(item.id)}">Đánh dấu hoàn thành</button>`}<button class="button button-text" type="button" data-goal-delete="${app.safeText(item.id)}">Xóa</button></div></article>`).join("")
      : `<p class="portal-empty">Thêm mục tiêu đầu tiên của bạn.</p>`;
    document.getElementById("employeeTasks").innerHTML = portal.tasks.length
      ? portal.tasks.map((item) => `<article class="portal-list-item ${item.completed ? "portal-read" : ""}"><div class="portal-item-heading"><label class="portal-task-title"><input type="checkbox" data-task-toggle="${app.safeText(item.id)}" ${item.completed ? "checked" : ""}><strong>${app.safeText(item.title)}</strong></label><span class="account-status ${item.priority === "high" ? "inactive" : "pending"}">${item.priority === "high" ? "Ưu tiên cao" : item.priority === "low" ? "Ưu tiên thấp" : "Bình thường"}</span></div>${item.details ? `<p>${app.safeText(item.details)}</p>` : ""}<small>Ngày nhắc: ${app.safeText(dateLabel(item.dueDate))}</small><button class="button button-text" type="button" data-task-delete="${app.safeText(item.id)}">Xóa việc</button></article>`).join("")
      : `<p class="portal-empty">Lịch cá nhân chưa có việc cần làm.</p>`;
    const enrollments = new Map(portal.enrollments.map((item) => [item.courseId, item]));
    document.getElementById("employeeCourses").innerHTML = portal.courses.map((course) => {
      const enrollment = enrollments.get(course.id);
      return `<article class="portal-course-card"><span class="role-chip">${app.safeText(course.category)}</span><h3>${app.safeText(course.title)}</h3><p>${app.safeText(course.description)}</p><small>${app.safeText(course.duration)}</small><div>${enrollment ? `<span class="account-status ${statusClass(enrollment.status)}">${app.safeText(statusLabels[enrollment.status] || enrollment.status)}</span>${enrollment.status === "enrolled" ? `<button class="button button-secondary" type="button" data-training-complete="${app.safeText(course.id)}">Đánh dấu hoàn thành</button>` : ""}` : `<button class="button button-secondary" type="button" data-training-enroll="${app.safeText(course.id)}">Đăng ký học</button>`}</div></article>`;
    }).join("");
    document.getElementById("employeeReviews").innerHTML = portal.reviews.length
      ? portal.reviews.map((item) => `<article class="portal-list-item"><div class="portal-item-heading"><strong>Kỳ ${app.safeText(item.period)}</strong><span class="account-status ${statusClass(item.status)}">${app.safeText(statusLabels[item.status] || item.status)}</span></div><small>Hiệu quả ${item.ratings.performance}/5 · Cân bằng ${item.ratings.wellbeing}/5 · Phát triển ${item.ratings.growth}/5</small>${item.adminNote ? `<p class="portal-admin-note">Phản hồi: ${app.safeText(item.adminNote)}</p>` : ""}</article>`).join("")
      : `<p class="portal-empty">Bạn chưa gửi bản tự đánh giá nào.</p>`;
  };

  app.renderAdminEmployeePortal = () => {
    const portal = app.state.adminPortal;
    if (!portal) return;
    document.getElementById("adminAnnouncements").innerHTML = portal.announcements.length
      ? portal.announcements.map((item) => `<article class="portal-list-item"><strong>${app.safeText(item.title)}</strong><p>${app.safeText(item.body)}</p><small>${app.safeText(app.dateLabel(item.createdAt))}</small></article>`).join("")
      : `<p class="portal-empty">Chưa đăng thông báo.</p>`;
    document.getElementById("adminLeaveRequests").innerHTML = portal.leaveRequests.length
      ? portal.leaveRequests.map((item) => `<tr><td><strong>${app.safeText(item.name)}</strong><br><small>${app.safeText(item.email)}</small></td><td>${app.safeText(dateLabel(item.startDate))} – ${app.safeText(dateLabel(item.endDate))}</td><td>${app.safeText(leaveLabels[item.type] || item.type)}</td><td class="request-message">${app.safeText(item.reason)}</td><td><span class="account-status ${statusClass(item.status)}">${app.safeText(statusLabels[item.status] || item.status)}</span></td><td>${item.status === "pending" ? `<div class="table-actions"><button class="button button-secondary" data-leave-review="${app.safeText(item.id)}" data-status="approved">Duyệt</button><button class="button button-secondary" data-leave-review="${app.safeText(item.id)}" data-status="rejected">Từ chối</button></div>` : app.safeText(item.adminNote || "—")}</td></tr>`).join("")
      : `<tr><td colspan="6" class="empty-row">Chưa có đơn xin nghỉ.</td></tr>`;
    document.getElementById("adminFeedback").innerHTML = portal.feedback.length
      ? portal.feedback.map((item) => `<tr><td>${app.safeText(app.dateLabel(item.createdAt))}</td><td>${app.safeText(feedbackLabels[item.category] || item.category)}</td><td>${item.rating}/5</td><td class="request-message">${app.safeText(item.message || "Không có ghi chú.")}</td></tr>`).join("")
      : `<tr><td colspan="4" class="empty-row">Chưa nhận góp ý ẩn danh.</td></tr>`;
    document.getElementById("adminReviews").innerHTML = portal.reviews.length
      ? portal.reviews.map((item) => `<tr><td><strong>${app.safeText(item.name)}</strong><br><small>${app.safeText(item.email)}</small></td><td>${app.safeText(item.period)}</td><td>${item.ratings.performance}/5 · ${item.ratings.wellbeing}/5 · ${item.ratings.growth}/5</td><td class="request-message">${app.safeText(item.accomplishment || "—")}<br><small>Khó khăn: ${app.safeText(item.challenge || "—")}</small></td><td><span class="account-status ${statusClass(item.status)}">${app.safeText(statusLabels[item.status] || item.status)}</span>${item.adminNote ? `<br><small>${app.safeText(item.adminNote)}</small>` : ""}</td><td>${item.status === "submitted" ? `<button class="button button-secondary" data-review-reply="${app.safeText(item.id)}">Phản hồi</button>` : "—"}</td></tr>`).join("")
      : `<tr><td colspan="6" class="empty-row">Chưa có bản tự đánh giá.</td></tr>`;
  };

  const bindForm = (id, onSubmit, refresh = true) => {
    document.getElementById(id).addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      try {
        await onSubmit(new FormData(form));
        form.reset();
        if (refresh) await refreshEmployeePortal();
      } catch (error) {
        app.showToast(error.message || "Không thể lưu thông tin.", "error");
      }
    });
  };

  app.bindEmployeePortalActions = () => {
    bindForm("leaveForm", async (form) => {
      await app.apiRequest("/employee-portal/leaves", {
        method: "POST",
        body: Object.fromEntries(form)
      });
      app.showToast("Đã gửi đơn nghỉ phép.");
    });
    bindForm("goalForm", async (form) => {
      await app.apiRequest("/employee-portal/goals", {
        method: "POST",
        body: Object.fromEntries(form)
      });
      app.showToast("Đã thêm mục tiêu cá nhân.");
    });
    bindForm("taskForm", async (form) => {
      await app.apiRequest("/employee-portal/tasks", {
        method: "POST",
        body: Object.fromEntries(form)
      });
      app.showToast("Đã thêm việc cần làm.");
    });
    bindForm("feedbackForm", async (form) => {
      const body = Object.fromEntries(form);
      body.rating = Number(body.rating);
      await app.apiRequest("/employee-portal/feedback", { method: "POST", body });
      app.showToast("Đã gửi góp ý ẩn danh.");
    });
    bindForm("reviewForm", async (form) => {
      const body = Object.fromEntries(form);
      body.ratings = {
        performance: Number(body.performance),
        wellbeing: Number(body.wellbeing),
        growth: Number(body.growth)
      };
      delete body.performance;
      delete body.wellbeing;
      delete body.growth;
      body.submit = true;
      await app.apiRequest("/employee-portal/reviews", { method: "POST", body });
      app.showToast("Đã gửi bản tự đánh giá.");
    });
    bindForm("announcementForm", async (form) => {
      await app.apiRequest("/admin/employee-portal/announcements", {
        method: "POST",
        body: Object.fromEntries(form)
      });
      app.showToast("Đã đăng thông báo cho nhân viên.");
      await app.loadAdminEmployeePortal();
    }, false);

    document.getElementById("page-employee-tools").addEventListener("click", async (event) => {
      const button = event.target.closest("[data-announcement-read], [data-leave-cancel], [data-goal-complete], [data-goal-delete], [data-training-enroll], [data-training-complete], [data-task-delete]");
      if (!button) return;
      try {
        if (button.dataset.announcementRead) {
          await app.apiRequest(`/employee-portal/announcements/${encodeURIComponent(button.dataset.announcementRead)}/read`, { method: "POST" });
        } else if (button.dataset.leaveCancel) {
          await app.apiRequest(`/employee-portal/leaves/${encodeURIComponent(button.dataset.leaveCancel)}`, { method: "DELETE" });
          app.showToast("Đã hủy đơn nghỉ phép.");
        } else if (button.dataset.goalComplete) {
          const item = app.state.employeePortal.goals.find((goal) => goal.id === button.dataset.goalComplete);
          await app.apiRequest(`/employee-portal/goals/${encodeURIComponent(item.id)}`, {
            method: "PUT",
            body: { title: item.title, description: item.description, dueDate: item.dueDate, progress: 100 }
          });
          app.showToast("Đã hoàn thành mục tiêu.");
        } else if (button.dataset.goalDelete) {
          await app.apiRequest(`/employee-portal/goals/${encodeURIComponent(button.dataset.goalDelete)}`, { method: "DELETE" });
          app.showToast("Đã xóa mục tiêu.");
        } else if (button.dataset.trainingEnroll) {
          await app.apiRequest(`/employee-portal/training/${encodeURIComponent(button.dataset.trainingEnroll)}/enroll`, { method: "POST" });
          app.showToast("Đã đăng ký khóa học.");
        } else if (button.dataset.trainingComplete) {
          await app.apiRequest(`/employee-portal/training/${encodeURIComponent(button.dataset.trainingComplete)}`, { method: "PATCH", body: {} });
          app.showToast("Đã hoàn thành khóa học.");
        } else if (button.dataset.taskDelete) {
          await app.apiRequest(`/employee-portal/tasks/${encodeURIComponent(button.dataset.taskDelete)}`, { method: "DELETE" });
          app.showToast("Đã xóa nhắc việc.");
        }
        await refreshEmployeePortal();
      } catch (error) {
        app.showToast(error.message || "Không thể cập nhật tiện ích.", "error");
      }
    });

    document.getElementById("employeeTasks").addEventListener("change", async (event) => {
      const checkbox = event.target.closest("[data-task-toggle]");
      if (!checkbox) return;
      try {
        await app.apiRequest(`/employee-portal/tasks/${encodeURIComponent(checkbox.dataset.taskToggle)}`, {
          method: "PATCH",
          body: { completed: checkbox.checked }
        });
        await refreshEmployeePortal();
      } catch (error) {
        checkbox.checked = !checkbox.checked;
        app.showToast(error.message || "Không thể cập nhật lịch cá nhân.", "error");
      }
    });

    document.getElementById("page-admin").addEventListener("click", async (event) => {
      const leaveButton = event.target.closest("[data-leave-review]");
      const reviewButton = event.target.closest("[data-review-reply]");
      try {
        if (leaveButton) {
          const note = window.prompt("Ghi chú cho nhân viên (có thể để trống):", "");
          if (note === null) return;
          await app.apiRequest(`/admin/employee-portal/leaves/${encodeURIComponent(leaveButton.dataset.leaveReview)}`, {
            method: "PATCH",
            body: { status: leaveButton.dataset.status, adminNote: note }
          });
          app.showToast(leaveButton.dataset.status === "approved" ? "Đã duyệt đơn nghỉ." : "Đã từ chối đơn nghỉ.");
        } else if (reviewButton) {
          const note = window.prompt("Nhập phản hồi hỗ trợ cho nhân viên:");
          if (!note || !note.trim()) return;
          await app.apiRequest(`/admin/employee-portal/reviews/${encodeURIComponent(reviewButton.dataset.reviewReply)}`, {
            method: "PATCH",
            body: { adminNote: note.trim() }
          });
          app.showToast("Đã gửi phản hồi tự đánh giá.");
        } else {
          return;
        }
        await app.loadAdminEmployeePortal();
      } catch (error) {
        app.showToast(error.message || "Không thể cập nhật yêu cầu nhân viên.", "error");
      }
    });
  };
})();
