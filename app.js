/**
 * Core Application Logic for Scholarship Screening System (GitHub Pages Static Version)
 * Ethics & Explainable AI Showcase
 */

// Application State
let appConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
let applicants = [];
let auditLogs = [];
let recentBatch = { newCodes: [], updatedCodes: [] };
let activeTab = 'dashboard';
let currentDetailApplicant = null;

// Initialize Data from LocalStorage or Data Defaults
function initData() {
  const savedApplicants = localStorage.getItem('scholarship_applicants');
  const savedConfig = localStorage.getItem('scholarship_config');
  const savedLogs = localStorage.getItem('scholarship_audit_logs');
  const savedBatch = localStorage.getItem('scholarship_recent_batch');

  if (savedApplicants) {
    try { applicants = JSON.parse(savedApplicants); } catch (e) { applicants = JSON.parse(JSON.stringify(INITIAL_APPLICANTS)); }
  } else {
    applicants = JSON.parse(JSON.stringify(INITIAL_APPLICANTS));
  }

  if (savedConfig) {
    try { appConfig = JSON.parse(savedConfig); } catch (e) { appConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG)); }
  }

  if (savedLogs) {
    try { auditLogs = JSON.parse(savedLogs); } catch (e) { auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)); }
  } else {
    auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
  }

  if (savedBatch) {
    try { recentBatch = JSON.parse(savedBatch); } catch (e) { recentBatch = { newCodes: [], updatedCodes: [] }; }
  }

  // Recalculate all scores using active config
  recalculateAllApplicants();
}

function persistData() {
  localStorage.setItem('scholarship_applicants', JSON.stringify(applicants));
  localStorage.setItem('scholarship_config', JSON.stringify(appConfig));
  localStorage.setItem('scholarship_audit_logs', JSON.stringify(auditLogs));
  localStorage.setItem('scholarship_recent_batch', JSON.stringify(recentBatch));
}

function resetToDefault() {
  if (confirm("ต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นข้อมูลตัวอย่างเริ่มต้น 20 คน ใช่หรือไม่?")) {
    applicants = JSON.parse(JSON.stringify(INITIAL_APPLICANTS));
    appConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
    recentBatch = { newCodes: [], updatedCodes: [] };
    persistData();
    recalculateAllApplicants();
    renderCurrentTab();
    alert("รีเซ็ตข้อมูลเริ่มต้นเรียบร้อยแล้ว");
  }
}

// ----------------------------------------------------
// Scoring Engine (Exact algorithmic fidelity from Next.js)
// ----------------------------------------------------
const AWARD_BONUS = {
  NONE: 0,
  SCHOOL: 1,
  PROVINCE: 2,
  NATIONAL: 4
};

function hoursBase(totalHours) {
  if (totalHours <= 0) return 0;
  if (totalHours <= 20) return 8;
  if (totalHours <= 50) return 12;
  if (totalHours <= 100) return 16;
  return 18;
}

function scoreApplicant(applicant, config = appConfig) {
  const reasons = [];
  const flags = [];

  // 1. GPA
  let gpa = applicant.gpa;
  if (!Number.isFinite(gpa)) {
    flags.push("INCOMPLETE_DATA");
    reasons.push("GPA ไม่ถูกต้องหรือหายไป ให้ 0 คะแนนในหมวดนี้");
    gpa = 0;
  }
  if (gpa < 0 || gpa > 4) {
    flags.push("GPA_OUT_OF_RANGE");
    reasons.push(`GPA ${applicant.gpa} อยู่นอกช่วง 0.00–4.00 ถูกปรับให้อยู่ในช่วงก่อนคำนวณ`);
    gpa = Math.min(4, Math.max(0, gpa));
  }
  const scoreGpa = Math.round((gpa / 4) * config.weights.gpa * 100) / 100;
  reasons.push(`GPA ${gpa.toFixed(2)} → ${scoreGpa}/${config.weights.gpa} คะแนน`);
  if (config.minGpa != null && gpa < config.minGpa) {
    flags.push("MIN_GPA_FAIL");
    reasons.push(`GPA ต่ำกว่าเกณฑ์ขั้นต่ำ ${config.minGpa.toFixed(2)}`);
  }

  // 2. Finance
  let members = applicant.familyMembers;
  let income = applicant.householdIncome;
  if (!Number.isFinite(income) || income < 0) {
    flags.push("INCOMPLETE_DATA");
    reasons.push("รายได้ครัวเรือนไม่ถูกต้อง ให้ตรวจสอบอีกครั้ง");
    income = Math.max(0, Number.isFinite(income) ? income : 0);
  }
  if (!Number.isInteger(members) || members < 1) {
    flags.push("INCOMPLETE_DATA");
    reasons.push(`จำนวนสมาชิก (${applicant.familyMembers}) ไม่ถูกต้อง ใช้ 1 คนในการคำนวณชั่วคราว`);
    members = 1;
  }
  if (income === 0) {
    reasons.push("รายได้รวมครัวเรือนเป็น 0 — ถือว่ามีความจำเป็นสูงสุดในหมวดนี้ (ตรวจสอบเอกสารประกอบ)");
  }
  const perCapita = income / members;
  const band = config.incomeBands.find((b) => b.max == null || perCapita <= b.max);
  const scoreFinance = band ? band.score : 0;
  reasons.push(
    `รายได้เฉลี่ยต่อคน ${perCapita.toLocaleString("th-TH", { maximumFractionDigits: 0 })} บาท/เดือน → ${scoreFinance}/${config.weights.finance} คะแนน`
  );

  // 3. Activity
  const activities = applicant.activities || [];
  const totalHours = activities.reduce(
    (s, a) => s + (Number.isFinite(a.hours) && a.hours > 0 ? a.hours : 0),
    0
  );
  const bestAward = activities.reduce(
    (best, a) => Math.max(best, AWARD_BONUS[a.awardLevel] ?? 0),
    0
  );
  let scoreActivity = Math.min(config.weights.activity, hoursBase(totalHours) + bestAward);
  const anyProof = activities.some((a) => a.hasProof);
  if (totalHours > 0 && !anyProof) {
    scoreActivity = Math.max(0, scoreActivity - 3);
    flags.push("NO_ACTIVITY_PROOF");
    reasons.push("กิจกรรมไม่มีหลักฐานแนบเลย หัก 3 คะแนน");
  }
  if (activities.length === 0) {
    reasons.push("ไม่มีข้อมูลกิจกรรม → 0 คะแนนในหมวดนี้");
  } else {
    reasons.push(
      `กิจกรรม ${activities.length} รายการ รวม ${totalHours} ชม. รางวัลสูงสุด +${bestAward} → ${scoreActivity}/${config.weights.activity} คะแนน`
    );
  }

  // 4. Essay
  let scoreEssay = null;
  const essayPending = applicant.essayScore == null;
  if (essayPending) {
    flags.push("ESSAY_PENDING");
    reasons.push("เรียงความรอการประเมิน — ยังไม่รวมคะแนนหมวดนี้");
  } else {
    const e = Number(applicant.essayScore);
    if (!Number.isFinite(e) || e < 0 || e > config.weights.essay) {
      flags.push("INCOMPLETE_DATA");
      reasons.push("คะแนนเรียงความผิดปกติ ให้ตรวจสอบผลจากผู้ตรวจ");
      scoreEssay = 0;
    } else {
      scoreEssay = e;
      reasons.push(`เรียงความ ${e}/${config.weights.essay} คะแนน (ประเมินโดย AI/กรรมการ)`);
    }
  }

  // Total & Grouping with Ethical Safeguards
  let total = null;
  let groupSystem = "PENDING_ESSAY";

  if (!essayPending && scoreEssay != null) {
    total = Math.round((scoreGpa + scoreFinance + scoreActivity + scoreEssay) * 100) / 100;
    if (total >= config.passThreshold) groupSystem = "PASS";
    else if (total >= config.reviewThreshold) groupSystem = "REVIEW";
    else groupSystem = "FAIL";

    // Ethical Safeguard 1: Missing or unreadable documents should NEVER be auto-failed or auto-passed
    if (applicant.missingDocs || applicant.unreadableDocs) {
      if (applicant.missingDocs) {
        flags.push("MISSING_DOCS");
        reasons.push("เอกสารสำคัญขาด — บังคับปรับเป็น 'รอพิจารณา' เพื่อให้มนุษย์ตรวจสอบ");
      }
      if (applicant.unreadableDocs) {
        flags.push("UNREADABLE_DOCS");
        reasons.push("เอกสารอ่านไม่ได้ — บังคับปรับเป็น 'รอพิจารณา' ห้ามตัดสิทธิ์อัตโนมัติ");
      }
      groupSystem = "REVIEW";
    }

    // Ethical Safeguard 2: Any abnormal flag should not result in auto-fail
    const abnormal = flags.some((f) =>
      ["MIN_GPA_FAIL", "GPA_OUT_OF_RANGE", "NO_ACTIVITY_PROOF", "PROMPT_INJECTION", "AI_SUSPECT"].includes(f)
    );
    if (abnormal && groupSystem === "FAIL") {
      groupSystem = "REVIEW";
      reasons.push("มี flag ความผิดปกติ — ตามหลักจริยธรรมห้ามตัดสินไม่ผ่านอัตโนมัติ ปรับเป็นรอพิจารณา");
    }
  } else {
    if (applicant.missingDocs) flags.push("MISSING_DOCS");
    if (applicant.unreadableDocs) flags.push("UNREADABLE_DOCS");
  }

  return {
    scoreGpa,
    scoreFinance,
    scoreActivity,
    scoreEssay,
    perCapita,
    total,
    groupSystem,
    reasons,
    flags
  };
}

function recalculateAllApplicants() {
  applicants.forEach((a) => {
    a.eval = scoreApplicant(a, appConfig);
  });
}

// ----------------------------------------------------
// UI Rendering Functions
// ----------------------------------------------------

function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-view').forEach((view) => {
    view.classList.toggle('hidden', view.id !== `view-${tabId}`);
  });
  renderCurrentTab();
}

function renderCurrentTab() {
  if (activeTab === 'dashboard') renderDashboard();
  else if (activeTab === 'applicants') renderApplicants();
  else if (activeTab === 'settings') renderSettings();
  else if (activeTab === 'import') renderImport();
  else if (activeTab === 'audit') renderAuditLogs();
  else if (activeTab === 'ethics') renderEthics();
}

// 1. Dashboard View
function renderDashboard() {
  const counts = { PASS: 0, REVIEW: 0, FAIL: 0, PENDING_ESSAY: 0 };
  let flaggedCount = 0;
  const buckets = [0, 0, 0, 0, 0]; // 0-19, 20-39, 40-59, 60-79, 80-100

  applicants.forEach((a) => {
    const finalGroup = a.groupFinal || a.eval.groupSystem;
    if (counts[finalGroup] !== undefined) counts[finalGroup]++;
    if (a.eval.flags && a.eval.flags.length > 0) flaggedCount++;

    if (a.eval.total != null) {
      const bIdx = Math.min(4, Math.floor(a.eval.total / 20));
      buckets[bIdx]++;
    }
  });

  // Render Stats
  document.getElementById('stat-pass-count').textContent = counts.PASS;
  document.getElementById('stat-review-count').textContent = counts.REVIEW;
  document.getElementById('stat-fail-count').textContent = counts.FAIL;
  document.getElementById('stat-pending-count').textContent = counts.PENDING_ESSAY;
  document.getElementById('stat-flag-count').textContent = flaggedCount;

  // Render Chart Bars
  const maxBucket = Math.max(...buckets, 1);
  const barsContainer = document.getElementById('score-chart-bars');
  barsContainer.innerHTML = '';

  const labels = ['0–19', '20–39', '40–59', '60–79', '80–100'];
  buckets.forEach((count, i) => {
    const heightPercent = Math.max(6, (count / maxBucket) * 100);
    const groupEl = document.createElement('div');
    groupEl.className = 'score-bar-group';
    groupEl.innerHTML = `
      <div class="bar-wrapper">
        <div class="score-bar" style="height: ${heightPercent}%;">
          <span class="bar-count">${count}</span>
        </div>
      </div>
      <div class="bar-label">${labels[i]} คะแนน</div>
    `;
    barsContainer.appendChild(groupEl);
  });
}

// 2. Applicants View
function renderApplicants() {
  const query = (document.getElementById('filter-search')?.value || '').toLowerCase().trim();
  const groupFilter = document.getElementById('filter-group')?.value || '';
  const flagFilter = document.getElementById('filter-flag')?.value || '';
  const sortOption = document.getElementById('filter-sort')?.value || 'code';

  let filtered = [...applicants];

  // Search filter
  if (query) {
    filtered = filtered.filter((a) =>
      a.code.toLowerCase().includes(query) || a.fullName.toLowerCase().includes(query)
    );
  }

  // Group filter
  if (groupFilter) {
    filtered = filtered.filter((a) => {
      const effGroup = a.groupFinal || a.eval.groupSystem;
      return effGroup === groupFilter;
    });
  }

  // Flag filter
  if (flagFilter === 'flagged') {
    filtered = filtered.filter((a) => a.eval.flags && a.eval.flags.length > 0);
  }

  // Sorting
  if (sortOption === 'score_desc') {
    filtered.sort((a, b) => (b.eval.total ?? -1) - (a.eval.total ?? -1));
  } else if (sortOption === 'score_asc') {
    filtered.sort((a, b) => (a.eval.total ?? 999) - (b.eval.total ?? 999));
  } else if (sortOption === 'gpa_desc') {
    filtered.sort((a, b) => b.gpa - a.gpa);
  } else {
    filtered.sort((a, b) => a.code.localeCompare(b.code));
  }

  document.getElementById('applicants-count-badge').textContent = `${filtered.length} จาก ${applicants.length} รายการ`;

  const tbody = document.getElementById('applicants-table-body');
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2.5rem;">ไม่พบข้อมูลผู้สมัครที่ตรงกับเงื่อนไขการค้นหา</td></tr>`;
    return;
  }

  filtered.forEach((a) => {
    const isNew = recentBatch.newCodes.includes(a.code);
    const isUpdated = recentBatch.updatedCodes.includes(a.code);
    const rowClass = isNew ? 'row-new' : isUpdated ? 'row-updated' : '';

    const sysGroup = GROUP_INFO[a.eval.groupSystem] || { label: a.eval.groupSystem, badgeClass: 'badge-pending' };
    const finalGroup = a.groupFinal ? GROUP_INFO[a.groupFinal] : null;

    const tr = document.createElement('tr');
    tr.className = rowClass;

    // Badges for flags
    const flagsHtml = (a.eval.flags && a.eval.flags.length > 0)
      ? a.eval.flags.map((f) => `<span class="badge-flag" title="${FLAG_DESCRIPTIONS[f]?.desc || f}">${FLAG_DESCRIPTIONS[f]?.title || f}</span>`).join('')
      : '<span class="text-muted">-</span>';

    tr.innerHTML = `
      <td>
        <button class="applicant-code-btn" onclick="openDetailModal('${a.code}')">${a.code}</button>
        ${isNew ? '<span class="badge badge-new" title="ไฟล์ใหม่จากชุดนำเข้าล่าสุด">ใหม่</span>' : ''}
        ${isUpdated ? '<span class="badge badge-updated" title="แก้ไขจากชุดนำเข้าล่าสุด">อัปเดต</span>' : ''}
      </td>
      <td>
        <div class="font-bold">${a.fullName}</div>
        <div class="text-muted" style="font-size: 0.75rem;">ครอบครัว ${a.familyMembers} คน</div>
      </td>
      <td><span class="font-bold">${a.gpa.toFixed(2)}</span></td>
      <td>
        <span class="font-bold" style="font-size: 1rem;">${a.eval.total !== null ? a.eval.total : '-'}</span>
        <span class="text-muted" style="font-size: 0.75rem;">/ 100</span>
      </td>
      <td>
        <span class="badge ${sysGroup.badgeClass}">${sysGroup.label}</span>
      </td>
      <td>
        ${finalGroup
          ? `<span class="badge ${finalGroup.badgeClass}" title="ยืนยันโดย ${a.overrideBy || 'กรรมการ'}">${finalGroup.label} (ปรับโดยมนุษย์)</span>`
          : '<span class="text-muted">ใช้ผลระบบ</span>'
        }
      </td>
      <td>${flagsHtml}</td>
      <td class="text-right">
        <button class="btn btn-outline btn-sm" onclick="openDetailModal('${a.code}')">รายละเอียด</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 3. Detail & Override Modal
function openDetailModal(code) {
  const applicant = applicants.find((a) => a.code === code);
  if (!applicant) return;
  currentDetailApplicant = applicant;

  const e = applicant.eval;
  const sysGroup = GROUP_INFO[e.groupSystem] || { label: e.groupSystem, badgeClass: '' };

  document.getElementById('modal-applicant-code').textContent = `${applicant.code} — ${applicant.fullName}`;

  // Sensitive Personal Data
  const perCapitaStr = applicant.familyMembers > 0
    ? (applicant.householdIncome / applicant.familyMembers).toLocaleString('th-TH', { maximumFractionDigits: 0 })
    : '0';

  document.getElementById('modal-gpa').textContent = applicant.gpa.toFixed(2);
  document.getElementById('modal-income').textContent = `${applicant.householdIncome.toLocaleString('th-TH')} บาท/เดือน`;
  document.getElementById('modal-members').textContent = `${applicant.familyMembers} คน (เฉลี่ย ${perCapitaStr} บ./คน)`;
  document.getElementById('modal-essay-snippet').textContent = applicant.essayText || 'ไม่มีข้อมูล';

  // Activities
  const actListEl = document.getElementById('modal-activities-list');
  actListEl.innerHTML = '';
  if (applicant.activities && applicant.activities.length > 0) {
    applicant.activities.forEach((act) => {
      const li = document.createElement('li');
      li.style.marginBottom = '0.35rem';
      li.innerHTML = `<strong>${act.name}</strong> — ${act.hours} ชม. [รางวัล: ${act.awardLevel}] ${act.hasProof ? '✅ มีหลักฐาน' : '❌ <span style="color:var(--danger)">ไม่มีหลักฐาน</span>'}`;
      actListEl.appendChild(li);
    });
  } else {
    actListEl.innerHTML = '<li class="text-muted">ไม่มีข้อมูลกิจกรรม</li>';
  }

  // Documents
  const docListEl = document.getElementById('modal-documents-list');
  docListEl.innerHTML = '';
  if (applicant.documents && applicant.documents.length > 0) {
    applicant.documents.forEach((doc) => {
      const li = document.createElement('li');
      li.innerHTML = `📄 ${doc.type}: <code style="font-size:0.75rem">${doc.filePath}</code> ${doc.readable ? ' (อ่านได้ปกติ)' : ' <span class="badge badge-fail">อ่านไม่ออก/ชำรุด</span>'}`;
      docListEl.appendChild(li);
    });
  } else {
    docListEl.innerHTML = '<li style="color:var(--danger)">⚠️ ไม่มีเอกสารแนบในระบบ</li>';
  }

  // Score Breakdown
  document.getElementById('modal-score-gpa').textContent = `${e.scoreGpa} / ${appConfig.weights.gpa}`;
  document.getElementById('modal-score-finance').textContent = `${e.scoreFinance} / ${appConfig.weights.finance}`;
  document.getElementById('modal-score-activity').textContent = `${e.scoreActivity} / ${appConfig.weights.activity}`;
  document.getElementById('modal-score-essay').textContent = e.scoreEssay !== null ? `${e.scoreEssay} / ${appConfig.weights.essay}` : 'รอการประเมิน';
  document.getElementById('modal-score-total').textContent = e.total !== null ? `${e.total} / 100` : '—';

  // Reasons list (Explainability)
  const reasonsListEl = document.getElementById('modal-reasons-list');
  reasonsListEl.innerHTML = '';
  e.reasons.forEach((r) => {
    const li = document.createElement('li');
    li.style.marginBottom = '0.25rem';
    li.textContent = r;
    reasonsListEl.appendChild(li);
  });

  // Flags list
  const flagsBoxEl = document.getElementById('modal-flags-container');
  if (e.flags && e.flags.length > 0) {
    flagsBoxEl.innerHTML = e.flags.map((f) => {
      const desc = FLAG_DESCRIPTIONS[f];
      return `
        <div style="background:#fee2e2; border-left:4px solid var(--danger); padding:0.5rem 0.75rem; border-radius:4px; margin-bottom:0.5rem;">
          <div style="font-weight:700; color:var(--danger-text); font-size:0.8125rem;">🚩 ${desc?.title || f}</div>
          <div style="font-size:0.75rem; color:#7f1d1d;">${desc?.desc || ''}</div>
        </div>
      `;
    }).join('');
  } else {
    flagsBoxEl.innerHTML = '<div style="color:var(--success-text); font-size:0.8125rem;">✅ ไม่มี Flag ความผิดปกติ</div>';
  }

  // AI Essay Analysis Preview
  const essayEl = document.getElementById('modal-essay-analysis');
  if (applicant.essayAnalysis) {
    essayEl.textContent = JSON.stringify(applicant.essayAnalysis, null, 2);
  } else {
    essayEl.textContent = "ยังไม่มีผลการวิเคราะห์เรียงความจาก AI";
  }

  // Override Form setup
  const finalSelect = document.getElementById('override-status-select');
  finalSelect.value = applicant.groupFinal || e.groupSystem || 'REVIEW';
  document.getElementById('override-actor-name').value = applicant.overrideBy || '';
  document.getElementById('override-reason-input').value = applicant.overrideReason || '';

  const overrideHistoryEl = document.getElementById('override-history-badge');
  if (applicant.groupFinal) {
    overrideHistoryEl.innerHTML = `<span class="badge badge-updated">เคยมีการปรับโดยมนุษย์: ${applicant.overrideBy} (${applicant.overrideReason})</span>`;
  } else {
    overrideHistoryEl.innerHTML = '';
  }

  // Open modal
  const modal = document.getElementById('applicant-modal');
  modal.classList.add('show');
}

function closeDetailModal() {
  document.getElementById('applicant-modal').classList.remove('show');
  currentDetailApplicant = null;
}

function handleSaveOverride(event) {
  event.preventDefault();
  if (!currentDetailApplicant) return;

  const newStatus = document.getElementById('override-status-select').value;
  const actorName = document.getElementById('override-actor-name').value.trim();
  const reason = document.getElementById('override-reason-input').value.trim();

  if (!actorName) {
    alert("ตามหลักจริยธรรมและความรับผิดชอบ (Accountability): ต้องระบุชื่อกรรมการผู้มีอำนาจตัดสินใจ");
    return;
  }
  if (!reason) {
    alert("ตามหลักความโปร่งใส (Transparency): ต้องระบุเหตุผลในการแก้ไขสถานะ");
    return;
  }

  const oldStatus = currentDetailApplicant.groupFinal || currentDetailApplicant.eval.groupSystem;

  currentDetailApplicant.groupFinal = newStatus;
  currentDetailApplicant.overrideBy = actorName;
  currentDetailApplicant.overrideReason = reason;

  // Add to Audit Log
  const newLog = {
    id: `LOG-${Date.now().toString().slice(-4)}`,
    timestamp: new Date().toLocaleString('th-TH'),
    actorName: actorName,
    action: "STATUS_OVERRIDE",
    applicantCode: currentDetailApplicant.code,
    detail: `ปรับสถานะผู้สมัคร ${currentDetailApplicant.code} จาก [${GROUP_INFO[oldStatus]?.label || oldStatus}] เป็น [${GROUP_INFO[newStatus]?.label || newStatus}] เนื่องจาก: ${reason}`
  };

  auditLogs.unshift(newLog);
  persistData();

  alert(`บันทึกการพิจารณาของกรรมการสำหรับ ${currentDetailApplicant.code} เรียบร้อยแล้ว`);
  closeDetailModal();
  renderCurrentTab();
}

// 4. Policy & Simulation View
function renderSettings() {
  document.getElementById('cfg-gpa').value = appConfig.weights.gpa;
  document.getElementById('cfg-fin').value = appConfig.weights.finance;
  document.getElementById('cfg-act').value = appConfig.weights.activity;
  document.getElementById('cfg-essay').value = appConfig.weights.essay;

  document.getElementById('val-gpa').textContent = `${appConfig.weights.gpa}%`;
  document.getElementById('val-fin').textContent = `${appConfig.weights.finance}%`;
  document.getElementById('val-act').textContent = `${appConfig.weights.activity}%`;
  document.getElementById('val-essay').textContent = `${appConfig.weights.essay}%`;

  document.getElementById('cfg-pass').value = appConfig.passThreshold;
  document.getElementById('cfg-review').value = appConfig.reviewThreshold;

  updateWeightTotalIndicator();
  runPolicySimulation();
}

function updateWeightTotalIndicator() {
  const gpa = Number(document.getElementById('cfg-gpa').value);
  const fin = Number(document.getElementById('cfg-fin').value);
  const act = Number(document.getElementById('cfg-act').value);
  const essay = Number(document.getElementById('cfg-essay').value);

  document.getElementById('val-gpa').textContent = `${gpa}%`;
  document.getElementById('val-fin').textContent = `${fin}%`;
  document.getElementById('val-act').textContent = `${act}%`;
  document.getElementById('val-essay').textContent = `${essay}%`;

  const total = gpa + fin + act + essay;
  const indEl = document.getElementById('weight-total-indicator');
  indEl.textContent = `น้ำหนักรวม: ${total}% (ต้องเท่ากับ 100%)`;

  if (total === 100) {
    indEl.style.color = 'var(--success-text)';
  } else {
    indEl.style.color = 'var(--danger-text)';
  }
}

function runPolicySimulation() {
  const gpa = Number(document.getElementById('cfg-gpa').value);
  const fin = Number(document.getElementById('cfg-fin').value);
  const act = Number(document.getElementById('cfg-act').value);
  const essay = Number(document.getElementById('cfg-essay').value);
  const pass = Number(document.getElementById('cfg-pass').value);
  const review = Number(document.getElementById('cfg-review').value);

  const testConfig = {
    ...appConfig,
    weights: { gpa, finance: fin, activity: act, essay },
    passThreshold: pass,
    reviewThreshold: review
  };

  const changes = [];
  applicants.forEach((a) => {
    const curSystem = a.eval.groupSystem;
    const nextEval = scoreApplicant(a, testConfig);
    if (curSystem !== nextEval.groupSystem) {
      changes.push({
        code: a.code,
        name: a.fullName,
        from: curSystem,
        to: nextEval.groupSystem
      });
    }
  });

  const previewBox = document.getElementById('simulation-impact-results');
  if (changes.length === 0) {
    previewBox.innerHTML = `<div class="text-muted" style="font-size: 0.875rem;">ไม่มีผู้สมัครที่เปลี่ยนสถานะด้วยเกณฑ์จำลองนี้</div>`;
  } else {
    previewBox.innerHTML = `
      <div style="font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">
        มีผู้สมัครได้รับผลกระทบทั้งหมด ${changes.length} คน:
      </div>
      <ul style="padding-left: 1.25rem; font-size: 0.8125rem;">
        ${changes.map((c) => `
          <li style="margin-bottom: 0.25rem;">
            <strong>${c.code}</strong> (${c.name}):
            <span class="badge ${GROUP_INFO[c.from]?.badgeClass}">${GROUP_INFO[c.from]?.label}</span>
            ➔
            <span class="badge ${GROUP_INFO[c.to]?.badgeClass}">${GROUP_INFO[c.to]?.label}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }
}

function applyNewConfig() {
  const gpa = Number(document.getElementById('cfg-gpa').value);
  const fin = Number(document.getElementById('cfg-fin').value);
  const act = Number(document.getElementById('cfg-act').value);
  const essay = Number(document.getElementById('cfg-essay').value);
  const pass = Number(document.getElementById('cfg-pass').value);
  const review = Number(document.getElementById('cfg-review').value);

  if (gpa + fin + act + essay !== 100) {
    alert("ผลรวมของค่าน้ำหนักทั้ง 4 หมวดต้องเท่ากับ 100% พอดี");
    return;
  }
  if (pass <= review) {
    alert("คะแนนเกณฑ์ผ่าน ต้องมากกว่า คะแนนเกณฑ์รอพิจารณา");
    return;
  }

  appConfig.version += 1;
  appConfig.weights = { gpa, finance: fin, activity: act, essay };
  appConfig.passThreshold = pass;
  appConfig.reviewThreshold = review;

  recalculateAllApplicants();

  // Log to audit
  auditLogs.unshift({
    id: `LOG-${Date.now().toString().slice(-4)}`,
    timestamp: new Date().toLocaleString('th-TH'),
    actorName: "คณะกรรมการนโยบายทุน",
    action: "CONFIG_UPDATE",
    applicantCode: "ALL",
    detail: `ปรับปรุงเกณฑ์การให้คะแนนเป็น v${appConfig.version}: น้ำหนัก [GPA:${gpa}, Fin:${fin}, Act:${act}, Essay:${essay}] เกณฑ์ผ่าน ≥${pass}, รอพิจารณา ≥${review}`
  });

  persistData();
  alert(`บันทึกเกณฑ์การคัดกรองเวอร์ชัน v${appConfig.version} และคำนวณคะแนนใหม่ทุกคนสำเร็จ!`);
  renderCurrentTab();
}

// 5. CSV Import & Export View
function renderImport() {
  document.getElementById('import-file-input').value = '';
  document.getElementById('import-preview-box').innerHTML = `
    <div class="text-center text-muted" style="padding: 1.5rem;">
      เลือกไฟล์ CSV หรือคลิกปุ่ม "ทดสอบโหลดไฟล์ตัวอย่าง (Sample CSV)" ด้านล่างเพื่อจำลอง
    </div>
  `;
}

function loadSampleCSV() {
  const sampleCSV = `code,fullName,gpa,income,members,hours,award,proof,essay
APP-101,นางสาวสุทธิดา เรียนดีเยี่ยม,3.95,4500,4,140,NATIONAL,true,24
APP-102,นายธนกร ช่วยเหลืองานวัด,3.25,8000,5,85,PROVINCE,true,19
APP-103,นางสาวมณีรัตน์ ขาดเอกสาร,3.88,5000,3,90,SCHOOL,false,22
APP-104,นายพงษ์ศักดิ์ ข้อมูลผิดพลาด,5.50,15000,0,10,NONE,false,12`;

  parseAndPreviewCSV(sampleCSV);
}

function handleCSVFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target?.result;
    if (typeof text === 'string') {
      parseAndPreviewCSV(text);
    }
  };
  reader.readAsText(file);
}

let pendingImportData = null;

function parseAndPreviewCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    alert("ไฟล์ CSV ว่างเปล่าหรือไม่มีข้อมูลแถว");
    return;
  }

  const header = lines[0].split(',').map((h) => h.trim());
  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 8) {
      errors.push(`แถวที่ ${i + 1}: ข้อมูลไม่ครบ ${header.length} คอลัมน์`);
      continue;
    }

    const [code, fullName, gpaStr, incomeStr, membersStr, hoursStr, award, proofStr, essayStr] = cols;
    const gpa = parseFloat(gpaStr);
    const income = parseFloat(incomeStr);
    const members = parseInt(membersStr, 10);
    const hours = parseFloat(hoursStr);
    const proof = proofStr.toLowerCase() === 'true';
    const essay = essayStr !== undefined && essayStr !== '' ? parseFloat(essayStr) : null;

    if (!code || !fullName) {
      errors.push(`แถวที่ ${i + 1}: ขาด code หรือ ชื่อ-นามสกุล`);
      continue;
    }

    const appObj = {
      code,
      fullName,
      gpa: Number.isFinite(gpa) ? gpa : 0,
      householdIncome: Number.isFinite(income) ? income : 0,
      familyMembers: Number.isFinite(members) && members > 0 ? members : 1,
      essayText: `เรียงความนำเข้าจาก CSV ของ ${fullName}`,
      activities: [{ name: "กิจกรรมที่นำเข้าจาก CSV", hours: Number.isFinite(hours) ? hours : 0, awardLevel: award || "NONE", hasProof: proof }],
      documents: [{ type: "TRANSCRIPT", filePath: `imported/${code}-transcript.pdf`, readable: true }],
      essayScore: Number.isFinite(essay) ? essay : null,
      missingDocs: false,
      unreadableDocs: false,
      essayAnalysis: { summary_th: "นำเข้าจากระบบภายนอก (CSV Batch)", confidence: 0.8 }
    };

    appObj.eval = scoreApplicant(appObj, appConfig);
    const isExisting = applicants.some((a) => a.code === code);

    rows.push({
      item: appObj,
      isExisting
    });
  }

  pendingImportData = rows;

  // Render Preview
  const previewBox = document.getElementById('import-preview-box');
  previewBox.innerHTML = `
    <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong>พร้อมนำเข้า: ${rows.length} รายการ</strong>
        (ใหม่: ${rows.filter((r) => !r.isExisting).length}, อัปเดต: ${rows.filter((r) => r.isExisting).length})
        ${errors.length > 0 ? `<span style="color:var(--danger)">พบข้อผิดพลาด ${errors.length} แถว</span>` : ''}
      </div>
      <button class="btn btn-primary btn-sm" onclick="confirmImport()">ยืนยันนำเข้าข้อมูลลงระบบ</button>
    </div>
    ${errors.length > 0 ? `
      <div style="background:#fee2e2; padding:0.5rem; border-radius:4px; font-size:0.75rem; color:#991b1b; margin-bottom:0.75rem;">
        ${errors.map((e) => `<div>❌ ${e}</div>`).join('')}
      </div>
    ` : ''}
    <div class="table-responsive" style="max-height: 250px;">
      <table class="data-table" style="font-size:0.75rem;">
        <thead>
          <tr><th>Code</th><th>ชื่อ-สกุล</th><th>GPA</th><th>รายได้ต่อคน</th><th>คะแนนประเมิน</th><th>สถานะเบื้องต้น</th><th>ประเภท</th></tr>
        </thead>
        <tbody>
          ${rows.map((r) => {
            const a = r.item;
            return `
              <tr>
                <td><strong>${a.code}</strong></td>
                <td>${a.fullName}</td>
                <td>${a.gpa.toFixed(2)}</td>
                <td>${(a.householdIncome / a.familyMembers).toLocaleString('th-TH')} บ.</td>
                <td><strong>${a.eval.total ?? '-'}</strong></td>
                <td><span class="badge ${GROUP_INFO[a.eval.groupSystem]?.badgeClass}">${GROUP_INFO[a.eval.groupSystem]?.label}</span></td>
                <td>${r.isExisting ? '<span class="badge badge-updated">อัปเดต</span>' : '<span class="badge badge-new">ใหม่</span>'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function confirmImport() {
  if (!pendingImportData || pendingImportData.length === 0) return;

  const actor = (document.getElementById('import-actor-name')?.value || '').trim() || 'คณะกรรมการฝ่ายทะเบียน';
  const newCodes = [];
  const updatedCodes = [];

  pendingImportData.forEach((r) => {
    const idx = applicants.findIndex((a) => a.code === r.item.code);
    if (idx >= 0) {
      applicants[idx] = r.item;
      updatedCodes.push(r.item.code);
    } else {
      applicants.push(r.item);
      newCodes.push(r.item.code);
    }
  });

  recentBatch = { newCodes, updatedCodes };

  auditLogs.unshift({
    id: `LOG-${Date.now().toString().slice(-4)}`,
    timestamp: new Date().toLocaleString('th-TH'),
    actorName: actor,
    action: "CSV_IMPORT",
    applicantCode: "BATCH",
    detail: `นำเข้าข้อมูลผ่านไฟล์ CSV สำเร็จ: สร้างใหม่ ${newCodes.length} คน, อัปเดต ${updatedCodes.length} คน`
  });

  persistData();
  alert(`นำเข้าสำเร็จเรียบร้อย! (ใหม่: ${newCodes.length}, อัปเดต: ${updatedCodes.length})`);
  pendingImportData = null;
  switchTab('applicants');
}

function downloadCSVTemplate() {
  const template = `code,fullName,gpa,income,members,hours,award,proof,essay
APP-099,ชื่อ-นามสกุล ตัวอย่าง,3.50,12000,4,50,PROVINCE,true,20`;

  const blob = new Blob(["\uFEFF" + template], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scholarship_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function exportCurrentApplicantsCSV() {
  const headers = ["code", "fullName", "gpa", "totalScore", "systemGroup", "finalGroup", "overrideBy", "flags"];
  const rows = applicants.map((a) => [
    a.code,
    `"${a.fullName.replace(/"/g, '""')}"`,
    a.gpa.toFixed(2),
    a.eval.total !== null ? a.eval.total : "",
    a.eval.groupSystem,
    a.groupFinal || "",
    a.overrideBy ? `"${a.overrideBy.replace(/"/g, '""')}"` : "",
    `"${(a.eval.flags || []).join(', ')}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scholarship_evaluation_results_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// 6. Audit Log View
function renderAuditLogs() {
  const tbody = document.getElementById('audit-table-body');
  tbody.innerHTML = '';

  if (auditLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">ยังไม่มีประวัติการบันทึก</td></tr>`;
    return;
  }

  auditLogs.forEach((log) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: monospace; font-size: 0.75rem;">${log.id}</td>
      <td style="white-space: nowrap; font-size: 0.8125rem;">${log.timestamp}</td>
      <td><strong>${log.actorName}</strong></td>
      <td><span class="badge" style="background:#e0f2fe; color:#0369a1;">${log.action}</span></td>
      <td><strong>${log.applicantCode}</strong></td>
      <td style="font-size: 0.8125rem;">${log.detail}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 7. Ethics Showcase View
function renderEthics() {
  // Static content already inside HTML, no dynamic rendering needed
}

// ----------------------------------------------------
// Event Listeners & Bootstrapping
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initData();

  // Navigation tabs
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Filter & Search events
  document.getElementById('filter-search')?.addEventListener('input', renderApplicants);
  document.getElementById('filter-group')?.addEventListener('change', renderApplicants);
  document.getElementById('filter-flag')?.addEventListener('change', renderApplicants);
  document.getElementById('filter-sort')?.addEventListener('change', renderApplicants);

  // Policy sliders
  ['cfg-gpa', 'cfg-fin', 'cfg-act', 'cfg-essay', 'cfg-pass', 'cfg-review'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      updateWeightTotalIndicator();
      runPolicySimulation();
    });
  });

  // Modal events
  document.getElementById('modal-close-button')?.addEventListener('click', closeDetailModal);
  document.getElementById('applicant-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'applicant-modal') closeDetailModal();
  });
  document.getElementById('override-form')?.addEventListener('submit', handleSaveOverride);

  // CSV file listener
  document.getElementById('import-file-input')?.addEventListener('change', handleCSVFileUpload);

  // Initial render
  renderCurrentTab();
});
