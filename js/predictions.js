(() => {
  const app = window.StayWise;

  app.renderPrediction = (person) => {
    const level = app.riskLevel(person.risk);
    document.getElementById("resultPercent").textContent = `${person.risk}%`;
    document.getElementById("resultBadge").className = `risk-badge badge-${level}`;
    document.getElementById("resultBadge").textContent = app.riskLabel(level);
    document.getElementById("resultName").textContent = `${person.name} · ${person.department}`;
    const factors = [...person.factors].sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect)).slice(0, 4);
    document.getElementById("factorList").innerHTML = factors.map((factor) => {
      const positive = factor.effect > 0;
      const width = Math.max(5, Math.min(100, Math.abs(factor.effect) / 1.7 * 100));
      return `<div class="factor-item"><span class="factor-label">${app.safeText(factor.label)}</span><span class="factor-track"><i class="${positive ? "" : "negative-factor"}" style="width:${width}%"></i></span><span class="factor-direction ${positive ? "" : "factor-down"}">${positive ? "↑ Tăng" : "↓ Giảm"}</span></div>`;
    }).join("");
    let recommendation;
    if (person.satisfaction <= 2) recommendation = "<strong>Gợi ý:</strong> Trao đổi riêng về mức độ hài lòng, lắng nghe điều nhân viên muốn thay đổi và thống nhất bước hỗ trợ.";
    else if (person.overtime >= 10) recommendation = "<strong>Gợi ý:</strong> Rà soát khối lượng công việc, lịch làm và cơ hội phân bổ lại nhiệm vụ.";
    else if (person.tenure < 2) recommendation = "<strong>Gợi ý:</strong> Hỏi thăm trải nghiệm hội nhập, người hướng dẫn và cơ hội phát triển.";
    else recommendation = "<strong>Gợi ý:</strong> Duy trì trao đổi định kỳ về mục tiêu, động lực và điều kiện làm việc.";
    document.getElementById("resultRecommendation").innerHTML = `${recommendation} Đây chỉ là gợi ý tham khảo, hãy trao đổi trực tiếp với nhân viên.`;
  };

  app.predictFromForm = async (event) => {
    event.preventDefault();
    const person = {
      name: document.getElementById("predName").value.trim(),
      age: app.boundedNumber(document.getElementById("predAge").value, 18, 70, 30),
      department: document.getElementById("predDepartment").value,
      role: document.getElementById("predRole").value,
      tenure: app.boundedNumber(document.getElementById("predTenure").value, 0, 40, 0),
      salary: app.boundedNumber(document.getElementById("predSalary").value, 1000, 100000, 8000),
      satisfaction: app.boundedNumber(document.getElementById("predSatisfaction").value, 1, 5, 3),
      overtime: app.boundedNumber(document.getElementById("predOvertime").value, 0, 80, 0),
      distance: app.boundedNumber(document.getElementById("predDistance").value, 0, 200, 0),
      balance: app.boundedNumber(document.getElementById("predBalance").value, 1, 5, 3),
      email: ""
    };
    if (!person.name) {
      document.getElementById("predName").focus();
      return;
    }
    const button = document.querySelector(".predict-submit");
    button.disabled = true;
    try {
      const result = await app.apiRequest("/predict", { method: "POST", body: person });
      app.state.latestPrediction = result.prediction;
      app.state.predictions = result.history;
      app.renderPrediction(result.prediction);
      app.renderHistory();
      document.getElementById("predictionResult").classList.remove("hidden");
      document.getElementById("predictionResult").scrollIntoView({ behavior: "smooth", block: "nearest" });
      app.showToast("Đã phân tích và lưu vào lịch sử dự đoán.");
    } catch (error) {
      console.error("Không thể dự đoán:", error);
      app.showToast(error.message || "Không thể kết nối dịch vụ dự đoán.", "error");
    } finally {
      button.disabled = false;
    }
  };

  app.saveLatestPrediction = async () => {
    const prediction = app.state.latestPrediction;
    if (!prediction) return;
    if (app.state.employees.some((employee) => employee.name.toLocaleLowerCase("vi") === prediction.name.toLocaleLowerCase("vi"))) {
      app.showToast("Nhân viên cùng tên đã có trong danh sách. Hãy kiểm tra trước khi thêm.", "error");
      return;
    }
    const { factors, risk, predictionId, createdAt, ...employee } = prediction;
    try {
      const result = await app.apiRequest("/employees", { method: "POST", body: employee });
      app.state.employees.unshift(result.employee);
      app.state.lastUpdated = result.updatedAt;
      app.renderOverview();
      app.showToast(`Đã lưu ${prediction.name} vào danh sách nhân viên.`);
    } catch (error) {
      console.error("Không thể lưu dự đoán thành hồ sơ:", error);
      app.showToast(error.message || "Không thể lưu hồ sơ nhân viên.", "error");
    }
  };
})();
