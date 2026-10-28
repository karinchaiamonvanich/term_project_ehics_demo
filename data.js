/**
 * Data and Configuration for Scholarship Screening System (Ethics & AI Demo)
 */

const DEFAULT_CONFIG = {
  version: 1,
  weights: {
    gpa: 25,
    finance: 30,
    activity: 20,
    essay: 25
  },
  incomeBands: [
    { max: 3000, score: 30, label: "รายได้ ≤ 3,000 บ./คน (30 คะแนน)" },
    { max: 6000, score: 20, label: "รายได้ 3,001 - 6,000 บ./คน (20 คะแนน)" },
    { max: 10000, score: 10, label: "รายได้ 6,001 - 10,000 บ./คน (10 คะแนน)" },
    { max: null, score: 5, label: "รายได้ > 10,000 บ./คน (5 คะแนน)" }
  ],
  passThreshold: 70,
  reviewThreshold: 50,
  minGpa: null
};

const GROUP_INFO = {
  PASS: { label: "ผ่าน", color: "success", badgeClass: "badge-pass", desc: "คะแนนรวมผ่านเกณฑ์ และไม่มีเงื่อนไขยับยั้ง" },
  REVIEW: { label: "รอพิจารณา", color: "warning", badgeClass: "badge-review", desc: "ต้องส่งให้คณะกรรมการพิจารณาโดยมนุษย์ (มี Flag หรือคะแนนก้ำกึ่ง)" },
  FAIL: { label: "ไม่ผ่านเบื้องต้น", color: "danger", badgeClass: "badge-fail", desc: "คะแนนไม่ถึงเกณฑ์ขั้นต่ำเบื้องต้น" },
  PENDING_ESSAY: { label: "รอประเมินเรียงความ", color: "info", badgeClass: "badge-pending", desc: "รอผลการวิเคราะห์เรียงความจากระบบหรือ AI" }
};

const FLAG_DESCRIPTIONS = {
  MISSING_DOCS: { title: "เอกสารสำคัญขาด", severity: "high", desc: "ขาดเอกสารสำคัญที่จำเป็น ต้องส่งให้กรรมการตรวจเอกสารเพิ่มเติม" },
  UNREADABLE_DOCS: { title: "เอกสารอ่านไม่ได้", severity: "high", desc: "ไฟล์เอกสารไม่ชัดเจนหรือชำรุด ระบบไม่อนุญาตให้ตัดสิทธิ์ ต้องให้มนุษย์ตรวจสอบ" },
  NO_ACTIVITY_PROOF: { title: "ไม่มีหลักฐานกิจกรรม", severity: "medium", desc: "ระบุกิจกรรมแต่ไม่มีเอกสารรับรอง ถูกหักคะแนนส่วนกิจกรรมและขึ้น flag" },
  GPA_OUT_OF_RANGE: { title: "GPA ผิดปกติ", severity: "high", desc: "ค่า GPA ไม่อยู่ระหว่าง 0.00 - 4.00" },
  MIN_GPA_FAIL: { title: "GPA ต่ำกว่าเกณฑ์ขั้นต่ำ", severity: "medium", desc: "เกรดเฉลี่ยต่ำกว่าข้อกำหนดเฉพาะ" },
  INCOMPLETE_DATA: { title: "ข้อมูลไม่สมบูรณ์", severity: "medium", desc: "ข้อมูลตัวเลขหรือฟิลด์บังคับบางอย่างไม่ถูกต้อง" },
  PROMPT_INJECTION: { title: "สงสัยการแอบแทรกคำสั่ง AI", severity: "critical", desc: "ตรวจพบข้อความในเรียงความที่พยายามสั่งให้ AI ให้คะแนนเต็ม" },
  AI_SUSPECT: { title: "เรียงความอาจใช้ AI สร้าง", severity: "medium", desc: "ค่าความน่าจะเป็นจากการตรวจจับบ่งชี้ว่าอาจไม่ได้เขียนด้วยตนเอง" },
  ESSAY_PENDING: { title: "ยังไม่ประเมินเรียงความ", severity: "low", desc: "ยังไม่มีคะแนนในส่วนของเรียงความ" }
};

const INITIAL_APPLICANTS = [
  {
    code: "APP-001",
    fullName: "นายสมมติ ก้าวหน้า (01)",
    gpa: 3.85,
    householdIncome: 8000,
    familyMembers: 4,
    essayText: "ข้าพเจ้าเติบโตมาในครอบครัวชาวสวนที่มีรายได้ไม่แน่นอน ตั้งใจเรียนเพื่อนำความรู้ด้านเทคโนโลยีกลับไปพัฒนาบ้านเกิด...",
    activities: [{ name: "ค่ายพัฒนาชนบทและสอนหนังสือน้อง", hours: 120, awardLevel: "NATIONAL", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-001-transcript.pdf", readable: true }],
    essayScore: 22,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "แสดงเป้าหมายชัดเจน มุ่งมั่นพัฒนาชุมชนและสอดคล้องกับวัตถุประสงค์ทุน", confidence: 0.88, ai_generated: false }
  },
  {
    code: "APP-002",
    fullName: "นางสาวสมมติ ใฝ่รู้ (02)",
    gpa: 3.70,
    householdIncome: 6000,
    familyMembers: 5,
    essayText: "ครอบครัวประกอบอาชีพรับจ้างทั่วไป รายได้เฉลี่ยต่อคนค่อนข้างน้อย แต่พยายามใช้เวลาว่างช่วยเหลืองานส่วนรวม...",
    activities: [{ name: "จิตอาสาโรงพยาบาลส่งเสริมสุขภาพตำบล", hours: 80, awardLevel: "PROVINCE", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-002-transcript.pdf", readable: true }],
    essayScore: 21,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "สะท้อนความยากลำบากจริงใจ มีทัศนคติเชิงบวกต่อการศึกษา", confidence: 0.85, ai_generated: false }
  },
  {
    code: "APP-003",
    fullName: "นายสมมติ มุ่งมั่น (03)",
    gpa: 3.90,
    householdIncome: 5000,
    familyMembers: 4,
    essayText: "มีความตั้งใจศึกษาต่อสาขาวิทยาศาสตร์ แม้ฐานะยากจนแต่ไม่ย่อท้อต่ออุปสรรคชีวิต...",
    activities: [{ name: "การแข่งขันโครงงานวิทยาศาสตร์ระดับภาค", hours: 100, awardLevel: "PROVINCE", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-003-transcript.pdf", readable: true }],
    essayScore: 23,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "ผลงานทางวิชาการโดดเด่น มีความมุ่งมั่นสูง", confidence: 0.92, ai_generated: false }
  },
  {
    code: "APP-004",
    fullName: "นางสาวสมมติ มีวินัย (04)",
    gpa: 3.60,
    householdIncome: 9000,
    familyMembers: 3,
    essayText: "คุณแม่เป็นเสาหลักคนเดียว ข้าพเจ้าหารายได้พิเศษช่วงวันหยุดและเข้าร่วมกิจกรรมชมรม...",
    activities: [{ name: "ประธานชมรมบำเพ็ญประโยชน์โรงเรียน", hours: 60, awardLevel: "SCHOOL", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-004-transcript.pdf", readable: true }],
    essayScore: 20,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "มีภาวะผู้นำและสำนึกรับผิดชอบต่อครอบครัว", confidence: 0.80, ai_generated: false }
  },
  {
    code: "APP-005",
    fullName: "นายสมมติ ขยันยิ่ง (05)",
    gpa: 3.45,
    householdIncome: 0,
    familyMembers: 4,
    essayText: "ครอบครัวประสบวิกฤตสูญเสียรายได้หลัก ปัจจุบันอาศัยข้าวสารจากวัดและเงินสงเคราะห์...",
    activities: [{ name: "อาสาจัดส่งอาหารผู้ยากไร้", hours: 90, awardLevel: "SCHOOL", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-005-transcript.pdf", readable: true }],
    essayScore: 19,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "ความจำเป็นเร่งด่วนทางเศรษฐกิจสูงมาก ควรพิจารณาเป็นกรณีพิเศษ", confidence: 0.90, ai_generated: false }
  },
  {
    code: "APP-006",
    fullName: "นายสมมติ ธรรมดา (06)",
    gpa: 3.10,
    householdIncome: 15000,
    familyMembers: 4,
    essayText: "สนใจด้านคอมพิวเตอร์ อยากต่อยอดทักษะเพื่อประกอบอาชีพดูแลบิดามารดา...",
    activities: [{ name: "ช่วยงานห้องสมุดประชาชน", hours: 40, awardLevel: "SCHOOL", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-006-transcript.pdf", readable: true }],
    essayScore: 16,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "เนื้อหาเรียงความระดับปานกลาง ครอบคลุมประเด็นหลัก", confidence: 0.75, ai_generated: false }
  },
  {
    code: "APP-007",
    fullName: "นางสาวสมมติ พอใจ (07)",
    gpa: 2.90,
    householdIncome: 18000,
    familyMembers: 3,
    essayText: "อยากได้รับทุนเพื่อแบ่งเบาภาระค่าใช้จ่ายในการซื้ออุปกรณ์การเรียน...",
    activities: [{ name: "กิจกรรมทำความสะอาดชุมชน", hours: 25, awardLevel: "NONE", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-007-transcript.pdf", readable: true }],
    essayScore: 15,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "เรียบเรียงธรรมดา แรงผลักดันทั่วไป", confidence: 0.70, ai_generated: false }
  },
  {
    code: "APP-008",
    fullName: "นายสมมติ ไร้หลักฐาน (08)",
    gpa: 3.20,
    householdIncome: 20000,
    familyMembers: 4,
    essayText: "ทำกิจกรรมบำเพ็ญประโยชน์ต่อเนื่องหลายปี เป็นนักกีฬาโรงเรียนด้วย...",
    activities: [{ name: "นักกีฬาตัวแทนโรงเรียนและอาสาสมัคร", hours: 50, awardLevel: "SCHOOL", hasProof: false }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-008-transcript.pdf", readable: true }],
    essayScore: 17,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "ระบุกิจกรรมหลายอย่างแต่น่าเสียดายที่ไม่มีใบรับรองแนบ", confidence: 0.78, ai_generated: false }
  },
  {
    code: "APP-009",
    fullName: "นางสาวสมมติ อดทน (09)",
    gpa: 2.75,
    householdIncome: 12000,
    familyMembers: 5,
    essayText: "แม้ผลการเรียนจะไม่โดดเด่น แต่ข้าพเจ้ามีความมุ่งมั่นที่จะพัฒนาตนเองอย่างต่อเนื่อง...",
    activities: [{ name: "ช่วยงานวัดในวันพระ", hours: 35, awardLevel: "NONE", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-009-transcript.pdf", readable: true }],
    essayScore: 14,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "ความมุ่งมั่นดีแต่ผลการเรียนค่อนข้างต่ำ", confidence: 0.72, ai_generated: false }
  },
  {
    code: "APP-010",
    fullName: "นายสมมติ ปานกลาง (10)",
    gpa: 3.00,
    householdIncome: 25000,
    familyMembers: 3,
    essayText: "อยากศึกษาต่อในสาขาที่รัก เพื่อสร้างความมั่นคงให้แก่ครอบครัว...",
    activities: [{ name: "อบรมสัมมนาเยาวชน", hours: 20, awardLevel: "NONE", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-010-transcript.pdf", readable: true }],
    essayScore: 15,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "เป้าหมายชัดเจนแต่ฐานะปานกลางเมื่อเทียบกับผู้สมัครอื่น", confidence: 0.74, ai_generated: false }
  },
  {
    code: "APP-011",
    fullName: "นายสมมติ ไม่พร้อม (11)",
    gpa: 2.40,
    householdIncome: 30000,
    familyMembers: 4,
    essayText: "ต้องการทุนสนับสนุนค่าใช้จ่ายส่วนตัว...",
    activities: [{ name: "กิจกรรมรับน้อง", hours: 10, awardLevel: "NONE", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-011-transcript.pdf", readable: true }],
    essayScore: 10,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "เรียงความสั้นมาก ไม่แสดงความตั้งใจที่ชัดเจน", confidence: 0.65, ai_generated: false }
  },
  {
    code: "APP-012",
    fullName: "นางสาวสมมติ เบื้องต้น (12)",
    gpa: 2.10,
    householdIncome: 40000,
    familyMembers: 3,
    essayText: "ขอสมัครทุนเพื่อเป็นเกียรติประวัติ...",
    activities: [{ name: "งานเปิดบ้านมหาวิทยาลัย", hours: 5, awardLevel: "NONE", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-012-transcript.pdf", readable: true }],
    essayScore: 8,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "ขาดความจำเป็นทางเศรษฐกิจ และผลการเรียนไม่ผ่านเกณฑ์", confidence: 0.85, ai_generated: false }
  },
  {
    code: "APP-013",
    fullName: "นายสมมติ หลุดเกณฑ์ (13)",
    gpa: 1.90,
    householdIncome: 45000,
    familyMembers: 4,
    essayText: "หวังว่าจะได้รับการพิจารณา...",
    activities: [],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-013-transcript.pdf", readable: false }],
    essayScore: 7,
    missingDocs: false,
    unreadableDocs: true,
    essayAnalysis: { summary_th: "ไม่ปรากฏเป้าหมายการศึกษา รายได้เกินเกณฑ์", confidence: 0.88, ai_generated: false }
  },
  {
    code: "APP-014",
    fullName: "นางสาวสมมติ รายได้สูง (14)",
    gpa: 2.00,
    householdIncome: 35000,
    familyMembers: 2,
    essayText: "ต้องการเงินทุนสำหรับใช้จ่ายทั่วไป...",
    activities: [{ name: "ร่วมงานวิ่งการกุศล", hours: 8, awardLevel: "NONE", hasProof: false }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-014-transcript.pdf", readable: false }],
    essayScore: 9,
    missingDocs: false,
    unreadableDocs: true,
    essayAnalysis: { summary_th: "ไม่มีหลักฐานกิจกรรม และเอกสารอ่านไม่ออก", confidence: 0.80, ai_generated: false }
  },
  {
    code: "APP-015",
    fullName: "นายสมมติ เรียนดีขาดเอกสาร (15)",
    gpa: 3.80,
    householdIncome: 7000,
    familyMembers: 4,
    essayText: "มีความมุ่งมั่นศึกษาด้านแพทย์แผนไทยเพื่อกลับไปรักษาคนยากจนในภูมิลำเนา...",
    activities: [{ name: "แข่งขันวิชาการโอลิมปิกระดับชาติ", hours: 110, awardLevel: "NATIONAL", hasProof: true }],
    documents: [],
    essayScore: 24,
    missingDocs: true,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "คะแนนศักยภาพสูงมาก แต่ขาดเอกสารสำคัญ ระบบบังคับเข้าโหมดรอพิจารณา (REVIEW) ห้ามตัดสิทธิ์", confidence: 0.94, ai_generated: false }
  },
  {
    code: "APP-016",
    fullName: "นางสาวสมมติ เอกสารชำรุด (16)",
    gpa: 3.50,
    householdIncome: 10000,
    familyMembers: 1,
    essayText: "เป็นเด็กกำพร้า อาศัยอยู่คนเดียว พยายามหาเงินส่งเสียตัวเองเรียน...",
    activities: [{ name: "อาสาดูแลผู้สูงอายุติดเตียง", hours: 45, awardLevel: "PROVINCE", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-016-damaged.pdf", readable: false }],
    essayScore: 18,
    missingDocs: false,
    unreadableDocs: true,
    essayAnalysis: { summary_th: "ไฟล์ Transcript สแกนไม่ชัด ระบบล็อคให้อยู่ในสถานะ REVIEW เพื่อให้เจ้าหน้าที่ติดต่อขอเอกสารใหม่", confidence: 0.82, ai_generated: false }
  },
  {
    code: "APP-017",
    fullName: "นายสมมติ รอตรวจเรียงความ (17)",
    gpa: 3.30,
    householdIncome: 14000,
    familyMembers: 4,
    essayText: "กำลังอยู่ระหว่างกระบวนการตรวจสอบโดยระบบประเมิน...",
    activities: [{ name: "อบรมสิ่งแวดล้อมเยาวชน", hours: 55, awardLevel: "SCHOOL", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-017-transcript.pdf", readable: true }],
    essayScore: null,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: null
  },
  {
    code: "APP-018",
    fullName: "นางสาวสมมติ ยอดเยี่ยมรอตรวจ (18)",
    gpa: 4.00,
    householdIncome: 11000,
    familyMembers: 4,
    essayText: "เกียรตินิยมอันดับหนึ่ง กิจกรรมระดับจังหวัด รอผลการให้คะแนนเรียงความ...",
    activities: [{ name: "ประธานสภานักเรียนและจิตอาสา", hours: 70, awardLevel: "PROVINCE", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-018-transcript.pdf", readable: true }],
    essayScore: null,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: null
  },
  {
    code: "APP-019",
    fullName: "นายสมมติ ครอบครัวใหญ่ (19)",
    gpa: 2.50,
    householdIncome: 16000,
    familyMembers: 6,
    essayText: "ในบ้านมีเด็กและผู้สูงอายุรวม 6 คน ต้องแบ่งปันรายได้เฉลี่ยไม่ถึงสามพันบาทต่อคน...",
    activities: [{ name: "ช่วยงานพัฒนาหมู่บ้าน", hours: 30, awardLevel: "NONE", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-019-transcript.pdf", readable: true }],
    essayScore: 13,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "แม้เกรดไม่สูง แต่ความเดือดร้อนต่อหัวสูงมาก (2,666 บ./คน) ผ่านเกณฑ์การเงินขั้นสูงสุด", confidence: 0.77, ai_generated: false }
  },
  {
    code: "APP-020",
    fullName: "นางสาวสมมติ ทุนเต็มขั้น (20)",
    gpa: 3.95,
    householdIncome: 5500,
    familyMembers: 3,
    essayText: "ข้าพเจ้าทุ่มเทเวลาให้กับการค้นคว้าและการช่วยเหลือผู้ด้อยโอกาส ได้รับรางวัลคุณธรรมระดับชาติ...",
    activities: [{ name: "รางวัลเยาวชนดีเด่นแห่งชาติ", hours: 130, awardLevel: "NATIONAL", hasProof: true }],
    documents: [{ type: "TRANSCRIPT", filePath: "docs/APP-020-transcript.pdf", readable: true }],
    essayScore: 24,
    missingDocs: false,
    unreadableDocs: false,
    essayAnalysis: { summary_th: "คะแนนโดดเด่นรอบด้าน ได้รับการจัดกลุ่มเป็น PASS โดยอัตโนมัติ", confidence: 0.95, ai_generated: false }
  }
];

const INITIAL_AUDIT_LOGS = [
  {
    id: "LOG-001",
    timestamp: "2026-10-28 09:30:15",
    actorName: "ผศ.ดร. นริศรา (ประธานกรรมการ)",
    action: "STATUS_OVERRIDE",
    applicantCode: "APP-015",
    detail: "ตรวจสอบเอกสารฉบับจริงนอกรอบแล้ว ได้รับ Transcript รับรองถูกต้อง จึงปรับสถานะจาก 'รอพิจารณา' เป็น 'ผ่าน'"
  },
  {
    id: "LOG-002",
    timestamp: "2026-10-28 10:15:00",
    actorName: "นายวิโรจน์ (กรรมการคัดกรอง)",
    action: "STATUS_OVERRIDE",
    applicantCode: "APP-019",
    detail: "พิจารณาความยากลำบากพิเศษ มีผู้ป่วยติดเตียงในบ้าน ให้ทุนสำรองกรณีมีสละสิทธิ์ ปรับเป็น 'รอพิจารณา'"
  },
  {
    id: "LOG-003",
    timestamp: "2026-10-28 11:00:22",
    actorName: "ระบบอัตโนมัติ (System Engine)",
    action: "SEED_INIT",
    applicantCode: "ALL",
    detail: "ประมวลผลข้อมูลตั้งต้น 20 รายชื่อด้วยน้ำหนักเกณฑ์ v1 (GPA 25, Fin 30, Act 20, Essay 25)"
  }
];
