import { readFileSync, existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { demand, dryRunTrial, executeAtomicTrial, prepareTrial, TrialError, trialPolicy, validateTrialConnection, verifyWorkbookBytes, type WorkbookExtraction } from "./expanded-base-trial";
import { inTrialTransaction, prismaTrialSession, verifyTrialDatabase } from "./expanded-base-trial-prisma";

// No import of ../index, dotenv, Prisma config, or shared/global client.
async function main() {
  let reader: PrismaClient | undefined;
  let writer: PrismaClient | undefined;
  try {
    const args = process.argv.slice(2);
    demand(args.every(arg => ["--apply", "--confirm-test-branch"].includes(arg)) && new Set(args).size === args.length, "ARGUMENTS_INVALID");
    const apply = args.includes("--apply");
    demand(!apply || args.includes("--confirm-test-branch"), "EXPLICIT_TEST_CONFIRMATION_REQUIRED");
    const connection = validateTrialConnection(process.env.DATABASE_URL);
    const directory = dirname(fileURLToPath(import.meta.url));
    const root = resolve(directory, "../../../..");
    demand([root, join(root, "apps/web")].includes(resolve(process.cwd())), "RUN_FROM_PROJECT_ROOT_OR_WEB_WORKSPACE");
    const workbook = join(root, trialPolicy.filename);
    verifyWorkbookBytes(basename(workbook), readFileSync(workbook));
    const python = join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe");
    demand(existsSync(python), "EXISTING_PYTHON_RUNTIME_REQUIRED");
    // Reader receives no DB credentials, and uses only the standard Python library.
    const extraction: WorkbookExtraction = JSON.parse(execFileSync(python, ["-B", join(directory, "read-expanded-base-trial.py"), workbook], {
      encoding: "utf8", timeout: 60000, maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, TEMP: process.env.TEMP, TMP: process.env.TMP }
    }));
    verifyWorkbookBytes(basename(workbook), readFileSync(workbook));
    const readOnly = new URL(connection);
    readOnly.searchParams.set("options", "-c default_transaction_read_only=on");
    reader = new PrismaClient({ adapter: new PrismaPg({ connectionString: readOnly.toString() }), log: [] });
    const mode = await reader.$queryRawUnsafe<{ default_transaction_read_only: string }[]>("SHOW default_transaction_read_only");
    demand(mode[0]?.default_transaction_read_only === "on", "READ_ONLY_PREFLIGHT_REQUIRED");
    await verifyTrialDatabase(reader, root);
    const session = prismaTrialSession(reader);
    const plan = prepareTrial(extraction, await session.snapshot());
    await dryRunTrial(session, plan);
    console.log("PREFLIGHT OK: branch de teste; XLSX auditado; exatamente 527 TACO PARCIAL novos, UNKNOWN; historicos preservados.");
    if (!apply) {
      console.log("DRY_RUN: nenhuma escrita. Aplicacao exige --apply --confirm-test-branch.");
      return;
    }
    await reader.$disconnect();
    reader = undefined;
    demand(process.env.DATABASE_URL === connection, "CONNECTION_CHANGED");
    validateTrialConnection(process.env.DATABASE_URL);
    verifyWorkbookBytes(basename(workbook), readFileSync(workbook));
    writer = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }), log: [] });
    const result = await inTrialTransaction(writer, async transactionSession => {
      const approved = await executeAtomicTrial(transactionSession, plan);
      verifyWorkbookBytes(basename(workbook), readFileSync(workbook));
      return approved;
    }, root);
    // All source-value, protected-snapshot and idempotency checks ran BEFORE COMMIT.
    console.log(JSON.stringify({ status: "TEST_BRANCH_TRIAL_COMMITTED", ...result }));
    console.log("OK: null/zero, CUSTOM, usuarios, receitas, barcodes e historicos preservados; segunda execucao inseriu 0.");
  } catch (error) {
    // Never echo DB errors, subprocess output, data snapshots, URLs or credentials.
    console.error(`PARE: ${error instanceof TrialError ? error.message : "TRIAL_FAILED_DETAILS_SUPPRESSED"}. Nao repetir automaticamente.`);
    process.exitCode = 1;
  } finally {
    if (reader) await reader.$disconnect().catch(() => { process.exitCode = 1; });
    if (writer) await writer.$disconnect().catch(() => { process.exitCode = 1; });
  }
}

void main();
