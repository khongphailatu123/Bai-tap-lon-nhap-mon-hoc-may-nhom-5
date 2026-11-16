(() => {
  const app = window.StayWise;

  app.renderHistory = () => {
    const history = app.state.predictions;
    document.getElementById("historyCount").textContent = history.length;
    document.getElementById("navPredictionCount").textContent = history.length;
    document.getElementById("historyAverageRisk").textContent = history.length
      ? `${Math.round(history.reduce((sum, entry) => sum + entry.risk, 0) / history.length)}%`
      : "—";
    document.getElementById("historyUniquePeople").textContent = new Set(history.map((entry) => entry.name.trim().toLocaleLowerCase("vi"))).size;
    document.getElementById("historyTable").innerHTML = history.length
      ? history.map((entry) => {
        const level = app.riskLevel(entry.risk);
        const date = new Date(entry.createdAt);
        const dateLabel = Number.isNaN(date.getTime()) ? "Không rõ" : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
        return `<tr><td>${dateLabel}</td><td><strong>${app.safeText(entry.name)}</strong></td><td>${app.safeText(entry.department)}</td><td>${entry.risk}%</td><td><span class="risk-badge badge-${level}">${app.riskLabel(level)}</span></td><td><button class="button button-text" data-history-view="${app.safeText(entry.id)}">Xem</button></td></tr>`;
      }).join("")
      : `<tr><td colspan="6" class="empty-row">Chưa có dự đoán nào. Hãy tạo một dự đoán để theo dõi lịch sử.</td></tr>`;
    document.querySelectorAll("[data-history-view]").forEach((button) => {
      button.addEventListener("click", () => {
        const prediction = history.find((entry) => entry.id === button.dataset.historyView);
        if (!prediction) return;
        app.state.latestPrediction = prediction;
        app.renderPrediction(prediction);
        document.getElementById("predictionResult").classList.remove("hidden");
        app.navigateTo("predict");
        document.getElementById("predictionResult").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  app.clearPredictionHistory = async () => {
    if (!app.state.predictions.length) return;
    if (!window.confirm("Xóa toàn bộ lịch sử dự đoán? Thao tác này không xóa hồ sơ nhân viên.")) return;
    try {
      const result = await app.apiRequest("/predictions", { method: "DELETE" });
      app.state.predictions = result.history;
      app.renderHistory();
      app.showToast("Đã xóa lịch sử dự đoán.");
    } catch (error) {
      console.error("Không thể xóa lịch sử dự đoán:", error);
      app.showToast(error.message || "Không thể xóa lịch sử.", "error");
    }
  };

  app.exportPredictionHistory = () => {
    const headers = ["createdAt", "name", "department", "role", "risk", "riskLevel"];
    const rows = app.state.predictions.map((entry) => [
      entry.createdAt,
      entry.name,
      entry.department,
      entry.role,
      entry.risk,
      app.riskLabel(app.riskLevel(entry.risk))
    ].map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","));
    app.downloadBlob(`\uFEFF${[headers.join(","), ...rows].join("\r\n")}`, "staywise-lich-su-du-doan.csv", "text/csv;charset=utf-8");
    app.showToast(`Đã xuất ${app.state.predictions.length} lần dự đoán.`);
  };
})();
