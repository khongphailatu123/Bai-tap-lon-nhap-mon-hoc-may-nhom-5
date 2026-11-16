(() => {
  const app = window.StayWise;

  app.suggestionFor = (employee) => {
    if (employee.satisfaction <= 2) return "Gợi ý: trò chuyện riêng về mức độ hài lòng và điều nhân viên mong muốn thay đổi.";
    if (employee.overtime >= 10) return "Gợi ý: rà soát khối lượng công việc và khả năng phân bổ lại nhiệm vụ.";
    if (employee.tenure < 2) return "Gợi ý: kiểm tra trải nghiệm hội nhập, người hướng dẫn và lộ trình phát triển.";
    if (employee.balance <= 2) return "Gợi ý: cùng trao đổi về cân bằng thời gian, lịch làm và hỗ trợ phù hợp.";
    return "Gợi ý: hỏi thăm định kỳ về mục tiêu nghề nghiệp và cơ hội phát triển.";
  };

  app.actionEntry = (employee) => `<div class="action-person"><span class="person-avatar" style="${app.avatarStyle(employee.name)}">${app.safeText(app.initials(employee.name))}</span><span class="action-person-info"><strong>${app.safeText(employee.name)} · ${employee.risk}%</strong><span>${app.safeText(employee.department)} · ${app.safeText(employee.role)}</span></span><p>${app.suggestionFor(employee)}</p></div>`;

  app.renderActions = () => {
    const counts = app.getCounts();
    document.getElementById("actionHighCount").textContent = counts.high;
    document.getElementById("actionMediumCount").textContent = counts.medium;
    document.getElementById("actionLowCount").textContent = counts.low;
    const high = [...app.state.employees].filter((employee) => app.riskLevel(employee.risk) === "high").sort((a, b) => b.risk - a.risk).slice(0, 4);
    const medium = [...app.state.employees].filter((employee) => app.riskLevel(employee.risk) === "medium").sort((a, b) => b.risk - a.risk).slice(0, 4);
    document.getElementById("highActionList").innerHTML = high.length ? high.map(app.actionEntry).join("") : `<div class="empty-chart">Hiện chưa có hồ sơ ở mức rủi ro cao.</div>`;
    document.getElementById("mediumActionList").innerHTML = medium.length ? medium.map(app.actionEntry).join("") : `<div class="empty-chart">Hiện chưa có hồ sơ ở mức rủi ro trung bình.</div>`;
  };
})();
