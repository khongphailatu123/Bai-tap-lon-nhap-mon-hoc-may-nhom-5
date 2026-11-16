(() => {
  const app = window.StayWise;

  app.employeeRow = (employee, compact = false) => {
    const level = app.riskLevel(employee.risk);
    const nameCell = `<div class="person-cell"><span class="person-avatar" style="${app.avatarStyle(employee.name)}">${app.safeText(app.initials(employee.name))}</span><span class="person-info"><strong>${app.safeText(employee.name)}</strong><span>${employee.email ? app.safeText(employee.email) : "Chưa có email"}</span></span></div>`;
    const scoreCell = `<span class="risk-score">${employee.risk}%</span><div class="risk-meter"><i class="risk-${level}-fill" style="width:${employee.risk}%"></i></div>`;
    const badge = `<span class="risk-badge badge-${level}">${app.riskLabel(level)}</span>`;
    const actions = `<button class="icon-button row-edit" data-edit="${app.safeText(employee.id)}" title="Sửa hồ sơ" aria-label="Sửa ${app.safeText(employee.name)}">✎</button><button class="icon-button row-menu" data-delete="${app.safeText(employee.id)}" title="Xóa hồ sơ" aria-label="Xóa ${app.safeText(employee.name)}">×</button>`;
    if (compact) return `<tr><td>${nameCell}</td><td>${app.safeText(employee.department)}</td><td>${app.fmtNumber(employee.tenure, 1)} năm</td><td>${scoreCell}</td><td>${badge}</td><td>${actions}</td></tr>`;
    return `<tr><td>${nameCell}</td><td>${app.safeText(employee.department)}</td><td>${app.safeText(employee.role)}</td><td>${app.fmtNumber(employee.tenure, 1)} năm</td><td>${employee.satisfaction} / 5</td><td>${scoreCell}</td><td>${badge}</td><td>${actions}</td></tr>`;
  };

  app.renderOverview = () => {
    const { employees, lastUpdated } = app.state;
    const counts = app.getCounts();
    const total = employees.length;
    const highRate = total ? Math.round(counts.high / total * 100) : 0;
    document.getElementById("totalEmployees").textContent = app.fmtNumber(total);
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
    document.getElementById("navPredictionCount").textContent = app.state.predictions.length;
    const highRisk = [...employees].filter((employee) => employee.risk >= 65).sort((a, b) => b.risk - a.risk).slice(0, 5);
    document.getElementById("highRiskTable").innerHTML = highRisk.length
      ? highRisk.map((employee) => app.employeeRow(employee, true)).join("")
      : `<tr><td colspan="6" class="empty-row">Chưa có nhân viên thuộc mức rủi ro cao.</td></tr>`;
    app.renderDepartmentCharts();
    app.renderEmployees();
    app.renderAnalytics();
    app.renderActions();
    app.renderHistory();
    document.getElementById("dataTotal").textContent = total;
    app.state.lastUpdated = lastUpdated;
    app.updateLastUpdated();
    app.attachEmployeeRowActions();
  };

  app.renderDepartmentCharts = () => {
    const { employees } = app.state;
    const departments = app.departments;
    const allDepartments = [...new Set([...departments, ...employees.map((employee) => employee.department)])];
    const stats = allDepartments.map((department) => {
      const people = employees.filter((employee) => employee.department === department);
      const high = people.filter((employee) => app.riskLevel(employee.risk) === "high").length;
      return { department, total: people.length, rate: people.length ? Math.round(high / people.length * 100) : 0 };
    }).filter((entry) => entry.total).sort((a, b) => b.rate - a.rate || b.total - a.total).slice(0, 5);
    document.getElementById("departmentChart").innerHTML = stats.length
      ? stats.map((entry) => `<div class="dept-bar-row"><span class="dept-name" title="${app.safeText(entry.department)}">${app.safeText(entry.department)}</span><div class="dept-bar-bg"><div class="dept-bar" style="width:${Math.max(entry.rate, 2)}%"></div></div><span class="dept-value">${entry.rate}%</span></div>`).join("")
      : `<div class="empty-chart">Chưa có dữ liệu phòng ban.</div>`;
  };
})();
