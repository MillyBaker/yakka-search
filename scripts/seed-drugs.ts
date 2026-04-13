import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// .env.local から環境変数を読み込む
function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local ファイルが見つかりません: " + envPath);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// CSV の1行をパースする（カンマ区切り、クォート対応）
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされたダブルクォート
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

interface DrugRow {
  iyaku_code: string | null;
  name_kanji: string | null;
  name_kana: string | null;
  unit_name: string | null;
  price: number | null;
  controlled_drugs: string | null;
  dosage_form: string | null;
  yakkasyusai_code: string | null;
  transitional_measures: string | null;
  generic_code: string | null;
  generic_name: string | null;
  additional_fee: number | null;
}

const COLUMNS = [
  "iyaku_code",
  "name_kanji",
  "name_kana",
  "unit_name",
  "price",
  "controlled_drugs",
  "dosage_form",
  "yakkasyusai_code",
  "transitional_measures",
  "generic_code",
  "generic_name",
  "additional_fee",
] as const;

const BATCH_SIZE = 100;

async function main(): Promise<void> {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("使い方: tsx scripts/seed-drugs.ts <CSVファイルパス>");
    process.exit(1);
  }

  const resolvedPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error("CSVファイルが見つかりません: " + resolvedPath);
    process.exit(1);
  }

  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "環境変数 NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY（または NEXT_PUBLIC_SUPABASE_ANON_KEY）を .env.local に設定してください"
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 行数を先にカウント（進捗表示のため）
  console.log("CSVファイルを読み込み中...");
  const fileStream = fs.createReadStream(resolvedPath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isHeader = true;
  let batch: DrugRow[] = [];
  let totalInserted = 0;
  let totalRows = 0;

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line.trim()) continue;
    totalRows++;
  }

  console.log(`合計 ${totalRows} 件のレコードを検出しました`);
  console.log("投入開始...");

  // 再度読み込んで投入
  const fileStream2 = fs.createReadStream(resolvedPath, { encoding: "utf-8" });
  const rl2 = readline.createInterface({ input: fileStream2, crlfDelay: Infinity });

  let isHeader2 = true;

  for await (const line of rl2) {
    if (isHeader2) {
      isHeader2 = false;
      continue;
    }
    if (!line.trim()) continue;

    const fields = parseCsvLine(line);
    const row: DrugRow = {
      iyaku_code: fields[0] || null,
      name_kanji: fields[1] || null,
      name_kana: fields[2] || null,
      unit_name: fields[3] || null,
      price: fields[4] ? parseFloat(fields[4]) : null,
      controlled_drugs: fields[5] || null,
      dosage_form: fields[6] || null,
      yakkasyusai_code: fields[7] || null,
      transitional_measures: fields[8] || null,
      generic_code: fields[9] || null,
      generic_name: fields[10] || null,
      additional_fee: fields[11] ? parseFloat(fields[11]) : null,
    };

    batch.push(row);

    if (batch.length >= BATCH_SIZE) {
      const { error } = await supabase.from("drugs").insert(batch);
      if (error) {
        console.error("挿入エラー:", error.message);
        process.exit(1);
      }
      totalInserted += batch.length;
      process.stdout.write(`\r${totalInserted}/${totalRows}件完了`);
      batch = [];
    }
  }

  // 残りのバッチを投入
  if (batch.length > 0) {
    const { error } = await supabase.from("drugs").insert(batch);
    if (error) {
      console.error("挿入エラー:", error.message);
      process.exit(1);
    }
    totalInserted += batch.length;
    process.stdout.write(`\r${totalInserted}/${totalRows}件完了`);
  }

  console.log("\n完了！");
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
