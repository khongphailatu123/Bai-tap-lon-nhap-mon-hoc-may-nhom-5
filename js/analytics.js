(() => {
  const app = window.StayWise;

  app.renderAnalytics = () => {
    const { employees } = app.state;
    const total = employees.length;
    const counts = app.getCounts();
    const average = (property) => total ? employees.reduce((sum, employee) => sum + Number(employee[property] || 0), 0) / total : 0;
    const satisfaction = average("satisfaction");
    const tenure = average("tenure");
    const salary = average("salary");
    const overtime = employees.filter((employee) => employee.overtime >= 10).length;
    document.getElementById("avgSatisfaction").textContent = `${satisfaction.toFixed(1)} / 5`;
    document.getElementById("avgTenure").textContent = `${tenure.toFixed(1)} năm`;
    document.getElementById("avgSalary").textContent = `${app.fmtNumber(Math.round(salary))} $`;
    document.getElementById("overtimeRate").textContent = `${total ? Math.round(overtime / total * 100) : 0}%`;
    document.getElementById("satisfactionProgress").style.width = `${satisfaction * 20}%`;
    document.getElementById("tenureProgress").style.width = `${Math.min(tenure / 10 * 100, 100)}%`;
    document.getElementById("salaryProgress").style.width = `${Math.min(salary / 25000 * 100, 100)}%`;
    document.getElementById("overtimeProgress").style.width = `${total ? overtime / total * 100 : 0}%`;
    const chart = [...new Set([...app.departments, ...employees.map((employee) => employee.department)])].map((department) => {
      const people = employees.filter((employee) => employee.department === department);
      const levels = { low: 0, medium: 0, high: 0 };
      people.forEach((employee) => levels[app.riskLevel(employee.risk)]++);
      return { department, people, levels };
    }).filter((item) => item.people.length).sort((a, b) => b.people.length - a.people.length);
    document.getElementById("stackedChart").innerHTML = chart.length ? chart.map((item) => {
      const pct = (count) => count / item.people.length * 100;
      return `<div class="stacked-row"><span class="stacked-label" title="${app.safeText(item.department)}">${app.safeText(item.department)}</span><div class="stacked-track" title="Thấp: ${item.levels.low} · Trung bình: ${item.levels.medium} · Cao: ${item.levels.high}"><i class="stacked-seg stacked-low" style="width:${pct(item.levels.low)}%"></i><i class="stacked-seg stacked-medium" style="width:${pct(item.levels.medium)}%"></i><i class="stacked-seg stacked-high" style="width:${pct(item.levels.high)}%"></i></div><span class="stacked-count">${item.people.length}</span></div>`;
    }).join("") : `<div class="empty-chart">Chưa có dữ liệu để phân tích.</div>`;
    const factors = [
      ["Mức hài lòng thấp", "tăng nguy cơ", 92],
      ["Làm thêm nhiều giờ", "tăng nguy cơ", 79],
      ["Cân bằng công việc thấp", "tăng nguy cơ", 70],
      ["Thâm niên ngắn", "tăng nguy cơ", 47],
      ["Mức lương thấp", "tăng nguy cơ", 42]
    ];
    document.getElementById("globalFactors").innerHTML = factors.map(([label, direction, width]) => `<div class="factor-row"><span>${label}</span><span class="factor-strength"><i style="width:${width}%"></i></span><span class="factor-direction-label">${direction}</span></div>`).join("");
    const title = document.getElementById("insightTitle");
    const text = document.getElementById("insightText");
    if (!total) {
      title.textContent = "Chưa có hồ sơ nhân viên";
      text.textContent = "Nhập bộ dữ liệu hoặc thêm nhân viên để bắt đầu khám phá các xu hướng.";
    } else if (counts.high) {
      title.textContent = `${counts.high} nhân viên có mức rủi ro cao cần được lắng nghe`;
      text.textContent = `Mức hài lòng trung bình hiện là ${satisfaction.toFixed(1)}/5. Hãy xem xét trao đổi bảo mật để hiểu thêm bối cảnh thay vì dựa riêng vào điểm số.`;
    } else {
      title.textContent = "Các hồ sơ hiện có chủ yếu ở mức rủi ro thấp hoặc trung bình";
      text.textContent = `Điểm hài lòng trung bình là ${satisfaction.toFixed(1)}/5. Duy trì trao đổi định kỳ và rà soát điều kiện làm việc.`;
    }
  };
})();
