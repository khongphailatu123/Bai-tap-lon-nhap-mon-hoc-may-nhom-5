(() => {
  const app = window.StayWise;

  app.exportCsv = (list = app.state.employees, filename = "staywise-nhan-vien.csv") => {
    const headers = ["name", "email", "department", "role", "tenure", "satisfaction", "salary", "overtime", "distance", "age", "balance", "risk"];
    const rows = list.map((employee) => headers.map((header) => `"${String(employee[header] ?? "").replace(/"/g, '""')}"`).join(","));
    app.downloadBlob(`\uFEFF${[headers.join(","), ...rows].join("\r\n")}`, filename, "text/csv;charset=utf-8");
    app.showToast(`Đã xuất ${list.length} hồ sơ nhân viên.`);
  };

  app.parseCsv = (text) => {
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
  };

  app.bindDataActions = () => {
    ["overviewExport", "analyticsExport", "employeeExport", "dataExportCsv"].forEach((id) => {
      document.getElementById(id).addEventListener("click", () => app.exportCsv());
    });
    document.getElementById("dataExportJson").addEventListener("click", () => {
      app.downloadBlob(JSON.stringify({
        exportedAt: new Date().toISOString(),
        employees: app.state.employees,
        predictionHistory: app.state.predictions
      }, null, 2), "staywise-sao-luu.json", "application/json");
      app.showToast("Đã tải bản sao lưu JSON.");
    });
    document.getElementById("templateDownload").addEventListener("click", () => {
      const template = "\uFEFFname,email,department,role,tenure,satisfaction,salary,overtime,distance,age,balance\r\nNguyễn Minh Anh,minhanh@example.com,Kỹ thuật,Chuyên viên,3,4,12000,5,10,30,4";
      app.downloadBlob(template, "staywise-mau-nhap-lieu.csv", "text/csv;charset=utf-8");
      app.showToast("Đã tải tệp CSV mẫu.");
    });
    document.getElementById("csvUpload").addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        app.showToast("Tệp vượt quá giới hạn 2 MB.", "error");
        event.target.value = "";
        return;
      }
      try {
        const imported = app.parseCsv(await file.text());
        const existing = new Set(app.state.employees.map((employee) => `${employee.name.toLocaleLowerCase("vi")}|${employee.department.toLocaleLowerCase("vi")}`));
        const unique = imported.filter((employee) => !existing.has(`${employee.name.toLocaleLowerCase("vi")}|${employee.department.toLocaleLowerCase("vi")}`));
        if (!unique.length) {
          app.showToast("Không có hồ sơ mới; các tên và phòng ban đã tồn tại.", "info");
          return;
        }
        const result = await app.apiRequest("/employees/import", { method: "POST", body: { employees: unique } });
        app.state.employees = result.employees;
        app.state.lastUpdated = result.updatedAt;
        app.state.employeePage = 1;
        app.renderOverview();
        document.getElementById("uploadHint").textContent = `Đã nhập ${result.added} hồ sơ mới từ ${file.name}.`;
        app.showToast(`Đã nhập ${result.added} hồ sơ nhân viên.`);
      } catch (error) {
        console.error("Không thể nhập CSV:", error);
        app.showToast(error.message || "Không thể đọc tệp CSV.", "error");
      } finally {
        event.target.value = "";
      }
    });
    document.getElementById("resetData").addEventListener("click", async () => {
      if (!window.confirm("Khôi phục bộ dữ liệu mẫu? Dữ liệu nhân viên hiện tại sẽ bị thay thế.")) return;
      try {
        const result = await app.apiRequest("/reset", { method: "POST" });
        app.state.employees = result.employees;
        app.state.predictions = result.predictions || [];
        app.state.lastUpdated = result.updatedAt;
        app.state.employeePage = 1;
        app.renderOverview();
        document.getElementById("uploadHint").textContent = "Tối đa 2 MB · Tệp CSV UTF-8";
        app.showToast("Đã khôi phục bộ dữ liệu minh họa.");
      } catch (error) {
        console.error("Không thể khôi phục dữ liệu mẫu:", error);
        app.showToast(error.message || "Không thể khôi phục dữ liệu.", "error");
      }
    });
  };
})();
