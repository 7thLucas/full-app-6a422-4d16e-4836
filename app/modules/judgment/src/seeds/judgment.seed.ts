import { createLogger } from "~/lib/logger";
import { JudgmentConfigModel } from "../models/config.model";
import { normalizeGeneratedConfigPayload, validateConfigPayload } from "../lib/judgment.utils";

const logger = createLogger("JudgmentSeed");

type SeedConfig = Record<string, any>;

/**
 * Standard manual-scoring output envelope. The Amanah audit flow scores each
 * criterion deterministically (officer marks each item), so the judgment
 * configs here are used as the *source of truth for role checklists* — the
 * `criteria` array of each config defines the scoreable rows the auditor fills.
 */
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string" },
    evidenceSubmissionId: { type: "string" },
    criterionId: { type: "string" },
    verdict: { type: "string", enum: ["pass", "partial", "fail", "risk", "ready", "not_ready"] },
    score: { type: "number", minimum: 0, maximum: 100 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
    reason: { type: "string" },
    fixSuggestion: { type: "string" },
    requiresHumanReview: { type: "boolean" },
  },
  required: [
    "id", "evidenceSubmissionId", "criterionId", "verdict", "score",
    "confidence", "severity", "reason", "fixSuggestion", "requiresHumanReview",
  ],
} as const;

const BASE_INPUT_SCHEMA = {
  type: "object",
  properties: {
    employeeName: { type: "string", title: "Nama Pegawai", description: "Nama lengkap pegawai yang diaudit." },
    branch: { type: "string", title: "Cabang", description: "Unit / cabang tempat pegawai bertugas." },
    evidenceText: { type: "string", title: "Catatan / Bukti", description: "Catatan, observasi, atau bukti pendukung audit." },
  },
  required: ["employeeName", "branch"],
} as const;

function variables(unitLabel: string, workerLabel: string, title: string) {
  return {
    labels: { unitLabel, workerLabel, managerLabel: "Manajer Cabang" },
    actions: { defaultTaskDueHours: 72 },
    dashboard: { title, company: "Bank Syariah Indonesia" },
  };
}

const SEED_CONFIGS: SeedConfig[] = [
  {
    pluginId: "rm",
    name: "Relationship Manager",
    rules:
      "Checklist kepatuhan untuk Relationship Manager BSI. Menilai kelengkapan KYC/CDD, kepatuhan akad syariah, kelengkapan dokumen pembiayaan, dan standar layanan nasabah.",
    inputSchema: BASE_INPUT_SCHEMA,
    outputSchema: OUTPUT_SCHEMA,
    variables: variables("Cabang", "Relationship Manager", "Dashboard Kepatuhan RM"),
    criteria: [
      { id: "criterion_kyc_rm", category: "KYC / CDD", name: "Verifikasi Identitas Nasabah", passCriteria: "Dokumen identitas nasabah diverifikasi lengkap dan sesuai prosedur CDD.", severity: "critical", weight: 20, autoFailIfMissing: true },
      { id: "criterion_cdd_risk", category: "KYC / CDD", name: "Penilaian Profil Risiko Nasabah", passCriteria: "Profil risiko nasabah dinilai dan didokumentasikan sebelum pencairan.", severity: "high", weight: 15, autoFailIfMissing: false },
      { id: "criterion_akad", category: "Kepatuhan Syariah", name: "Kesesuaian Akad", passCriteria: "Akad pembiayaan sesuai prinsip syariah dan ditandatangani kedua pihak.", severity: "critical", weight: 25, autoFailIfMissing: true },
      { id: "criterion_doc_rm", category: "Kelengkapan Dokumen", name: "Kelengkapan Berkas Pembiayaan", passCriteria: "Seluruh dokumen pembiayaan lengkap dan terarsip dengan benar.", severity: "high", weight: 20, autoFailIfMissing: false },
      { id: "criterion_service_rm", category: "Standar Layanan", name: "Standar Layanan Nasabah", passCriteria: "Interaksi dengan nasabah memenuhi standar layanan BSI.", severity: "medium", weight: 20, autoFailIfMissing: false },
    ],
  },
  {
    pluginId: "teller",
    name: "Teller",
    rules:
      "Checklist kepatuhan untuk Teller BSI. Menilai akurasi transaksi, penerapan KYC pada transaksi tunai, pelaporan transaksi mencurigakan, dan standar layanan.",
    inputSchema: BASE_INPUT_SCHEMA,
    outputSchema: OUTPUT_SCHEMA,
    variables: variables("Cabang", "Teller", "Dashboard Kepatuhan Teller"),
    criteria: [
      { id: "criterion_cash_accuracy", category: "Operasional", name: "Akurasi Transaksi Tunai", passCriteria: "Transaksi tunai tercatat akurat dan saldo kas sesuai (selisih nol).", severity: "critical", weight: 25, autoFailIfMissing: true },
      { id: "criterion_kyc_teller", category: "KYC / CDD", name: "Verifikasi Nasabah Transaksi Besar", passCriteria: "Identitas nasabah diverifikasi untuk transaksi di atas ambang batas.", severity: "high", weight: 20, autoFailIfMissing: false },
      { id: "criterion_str", category: "Anti Pencucian Uang", name: "Pelaporan Transaksi Mencurigakan", passCriteria: "Transaksi mencurigakan diidentifikasi dan dilaporkan sesuai prosedur.", severity: "critical", weight: 20, autoFailIfMissing: true },
      { id: "criterion_doc_teller", category: "Kelengkapan Dokumen", name: "Kelengkapan Bukti Transaksi", passCriteria: "Slip dan bukti transaksi lengkap serta tervalidasi.", severity: "medium", weight: 15, autoFailIfMissing: false },
      { id: "criterion_service_teller", category: "Standar Layanan", name: "Standar Layanan Loket", passCriteria: "Pelayanan di loket memenuhi standar kecepatan dan keramahan BSI.", severity: "medium", weight: 20, autoFailIfMissing: false },
    ],
  },
  {
    pluginId: "cs",
    name: "Customer Service",
    rules:
      "Checklist kepatuhan untuk Customer Service BSI. Menilai pembukaan rekening sesuai KYC, kelengkapan dokumen, penjelasan produk syariah yang benar, dan standar layanan.",
    inputSchema: BASE_INPUT_SCHEMA,
    outputSchema: OUTPUT_SCHEMA,
    variables: variables("Cabang", "Customer Service", "Dashboard Kepatuhan CS"),
    criteria: [
      { id: "criterion_kyc_cs", category: "KYC / CDD", name: "Pembukaan Rekening Sesuai KYC", passCriteria: "Pembukaan rekening mengikuti prosedur KYC/CDD secara lengkap.", severity: "critical", weight: 25, autoFailIfMissing: true },
      { id: "criterion_doc_cs", category: "Kelengkapan Dokumen", name: "Kelengkapan Dokumen Nasabah", passCriteria: "Seluruh dokumen pembukaan rekening lengkap dan terverifikasi.", severity: "high", weight: 20, autoFailIfMissing: false },
      { id: "criterion_product_cs", category: "Kepatuhan Syariah", name: "Penjelasan Produk Syariah", passCriteria: "Produk syariah dijelaskan dengan benar tanpa mis-selling.", severity: "high", weight: 20, autoFailIfMissing: false },
      { id: "criterion_complaint_cs", category: "Standar Layanan", name: "Penanganan Keluhan", passCriteria: "Keluhan nasabah ditangani dan dicatat sesuai prosedur.", severity: "medium", weight: 15, autoFailIfMissing: false },
      { id: "criterion_service_cs", category: "Standar Layanan", name: "Standar Layanan CS", passCriteria: "Interaksi memenuhi standar layanan dan etika BSI.", severity: "medium", weight: 20, autoFailIfMissing: false },
    ],
  },
];

export async function seedJudgmentConfigs() {
  let seededCount = 0;

  for (const config of SEED_CONFIGS) {
    const normalized = normalizeGeneratedConfigPayload({ ...config, outputSchema: OUTPUT_SCHEMA });
    validateConfigPayload(normalized);

    await JudgmentConfigModel.findOneAndUpdate(
      { pluginId: normalized.pluginId },
      { $set: normalized },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    seededCount += 1;
    logger.info("Seeded judgment config", { pluginId: normalized.pluginId });
  }

  logger.info("Judgment config seeding completed", { seededCount });
}

export default seedJudgmentConfigs;
