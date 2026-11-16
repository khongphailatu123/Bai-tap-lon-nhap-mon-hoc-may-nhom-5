(() => {
  const app = window.StayWise;

  app.renderEmployees = () => {
    const { employees, employeePage, pageSize, employeeSort } = app.state;
    const counts = app.getCounts();
    document.getElementById("employeePageTotal").textContent = employees.length;
    document.getElementById("employeePageHigh").textContent = counts.high;
    document.getElementById("employeePageMedium").textContent = counts.medium;
    document.getElementById("employeePageLow").textContent = counts.low;

    const departmentSelect = document.getElementById("departmentFilter");
    const selectedDepartment = departmentSelect.value;
    const allDepartments = [...new Set([...app.departments, ...employees.map((employee) => employee.department)])].sort((a, b) => a.localeCompare(b, "vi"));
    departmentSelect.innerHTML = `<option value="">Tất cả phòng ban</option>${allDepartments.map((department) => `<option value="${app.safeText(department)}">${app.safeText(department)}</option>`).join("")}`;
    if (allDepartments.includes(selectedDepartment)) departmentSelect.value = selectedDepartment;

    const query = document.getElementById("employeeSearch").value.trim().toLocaleLowerCase("vi");
    const department = departmentSelect.value;
    const level = document.getElementById("riskFilter").value;
    const filtered = employees.filter((employee) => {
      const searchText = `${employee.name} ${employee.email} ${employee.department} ${employee.role}`.toLocaleLowerCase("vi");
      return (!query || searchText.includes(query))
        && (!department || employee.department === department)
        && (!level || app.riskLevel(employee.risk) === level);
    });
    const sorters = {
      "risk-desc": (a, b) => b.risk - a.risk,
      "risk-asc": (a, b) => a.risk - b.risk,
      "name-asc": (a, b) => a.name.localeCompare(b.name, "vi"),
      "tenure-desc": (a, b) => b.tenure - a.tenure
    };
    filtered.sort(sorters[employeeSort] || sorters["risk-desc"]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    app.state.employeePage = Math.min(employeePage, totalPages);
    const start = (app.state.employeePage - 1) * pageSize;
    const visible = filtered.slice(start, start + pageSize);
    document.getElementById("employeeTable").innerHTML = visible.map((employee) => app.employeeRow(employee)).join("");
    document.getElementById("emptyEmployees").classList.toggle("hidden", filtered.length > 0);
    document.querySelector(".employee-data-table").classList.toggle("hidden", filtered.length === 0);
    document.getElementById("employeeResultCount").textContent = filtered.length
      ? `Hiển thị ${start + 1}–${Math.min(start + pageSize, filtered.length)} / ${filtered.length} kết quả (tổng ${employees.length})`
      : `Hiển thị 0 / ${employees.length} nhân viên`;
    const controls = document.getElementById("employeePagination");
    controls.innerHTML = `<button class="pagination-button" data-page-step="-1" aria-label="Trang trước" ${app.state.employeePage <= 1 ? "disabled" : ""}>‹</button>${Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => `<button class="pagination-button ${page === app.state.employeePage ? "current-page" : ""}" data-page-number="${page}" aria-label="Trang ${page}" ${page === app.state.employeePage ? 'aria-current="page"' : ""}>${page}</button>`).join("")}<button class="pagination-button" data-page-step="1" aria-label="Trang sau" ${app.state.employeePage >= totalPages ? "disabled" : ""}>›</button>`;
    controls.querySelectorAll("[data-page-number]").forEach((button) => button.addEventListener("click", () => {
      app.state.employeePage = Number(button.dataset.pageNumber);
      app.renderEmployees();
    }));
    controls.querySelectorAll("[data-page-step]").forEach((button) => button.addEventListener("click", () => {
      app.state.employeePage += Number(button.dataset.pageStep);
      app.renderEmployees();
    }));
    app.attachEmployeeRowActions();
  };

  app.openEmployeeDialog = (employee = null) => {
    const form = document.getElementById("addEmployeeForm");
    app.state.editingEmployeeId = employee ? employee.id : null;
    document.getElementById("employeeDialogTitle").textContent = employee ? "Cập nhật nhân viên" : "Thêm nhân viên";
    document.getElementById("submitEmployee").textContent = employee ? "Lưu thay đổi" : "Thêm nhân viên";
    form.reset();
    if (employee) {
      const values = {
        newName: employee.name,
        newEmail: employee.email,
        newDepartment: employee.department,
        newRole: employee.role,
        newTenure: employee.tenure,
        newSatisfaction: employee.satisfaction,
        newSalary: employee.salary,
        newOvertime: employee.overtime,
        newDistance: employee.distance,
        newAge: employee.age,
        newBalance: employee.balance
      };
      Object.entries(values).forEach(([id, value]) => { document.getElementById(id).value = value; });
    }
    document.getElementById("employeeDialog").showModal();
  };

  app.attachEmployeeRowActions = () => {
    document.querySelectorAll("[data-delete]").forEach((button) => {
      button.onclick = () => {
        app.state.pendingDeleteId = button.dataset.delete;
        const employee = app.state.employees.find((entry) => entry.id === app.state.pendingDeleteId);
        document.getElementById("confirmText").textContent = employee
          ? `Hồ sơ của ${employee.name} sẽ bị xóa khỏi dữ liệu trên máy chủ.`
          : "Hồ sơ sẽ bị xóa khỏi dữ liệu trên máy chủ.";
        document.getElementById("confirmDialog").showModal();
      };
    });
    document.querySelectorAll("[data-edit]").forEach((button) => {
      button.onclick = () => {
        const employee = app.state.employees.find((entry) => entry.id === button.dataset.edit);
        if (employee) app.openEmployeeDialog(employee);
      };
    });
  };

  app.saveEmployee = async (event) => {
    event.preventDefault();
    const employee = {
      name: document.getElementById("newName").value,
      email: document.getElementById("newEmail").value,
      department: document.getElementById("newDepartment").value,
      role: document.getElementById("newRole").value,
      tenure: document.getElementById("newTenure").value,
      satisfaction: document.getElementById("newSatisfaction").value,
      salary: document.getElementById("newSalary").value,
      overtime: document.getElementById("newOvertime").value,
      distance: document.getElementById("newDistance").value,
      age: document.getElementById("newAge").value,
      balance: document.getElementById("newBalance").value
    };
    const editingId = app.state.editingEmployeeId;
    try {
      const result = await app.apiRequest(
        editingId ? `/employees/${encodeURIComponent(editingId)}` : "/employees",
        { method: editingId ? "PUT" : "POST", body: employee }
      );
      if (editingId) {
        app.state.employees = app.state.employees.map((item) => item.id === editingId ? result.employee : item);
      } else {
        app.state.employees.unshift(result.employee);
      }
      app.state.lastUpdated = result.updatedAt;
      app.state.employeePage = 1;
      app.renderOverview();
      document.getElementById("employeeDialog").close();
      document.getElementById("addEmployeeForm").reset();
      app.showToast(editingId ? "Đã cập nhật hồ sơ nhân viên." : `Đã thêm ${employee.name} vào danh sách.`);
      app.state.editingEmployeeId = null;
    } catch (error) {
      console.error("Không thể lưu hồ sơ nhân viên:", error);
      app.showToast(error.message || "Không thể lưu hồ sơ nhân viên.", "error");
    }
  };
})();
