import { createLogger } from "~/lib/logger";
import { JudgmentConfigModel } from "../models/config.model";
import { normalizeGeneratedConfigPayload, validateConfigPayload } from "../lib/judgment.utils";

const logger = createLogger("JudgmentSeed");

type SeedConfig = Record<string, any>;

const SEED_CONFIGS: SeedConfig[] = [];

export async function seedJudgmentConfigs() {
  let seededCount = 0;

  for (const config of SEED_CONFIGS) {
    const normalized = normalizeGeneratedConfigPayload(config);
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
