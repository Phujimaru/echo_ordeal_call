// ============================================================
//  ลบตัวติดตั้งเก่าบน R2 (updates/ECHO-Setup-<เวอร์ชัน>.exe + .blockmap)
//
//  node desktop/scripts/prune-installers.js            ดูอย่างเดียวว่าจะลบอะไร
//  node desktop/scripts/prune-installers.js --apply    ลบจริง (กู้คืนไม่ได้)
//  --keep=3                                            เก็บกี่เวอร์ชันล่าสุด (ค่าเริ่มต้น 3)
//
//  ไม่แตะไฟล์อื่น · เวอร์ชันที่ latest.yml ชี้อยู่ไม่ถูกลบเสมอ
//  "ล่าสุด" = วันที่อัปโหลด ไม่ใช่เลขเวอร์ชัน (เลขเคยย้อนจาก 5.6.36 กลับมา 5.6.7)
// ============================================================
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const APPLY = process.argv.includes("--apply");
const keepArg = process.argv.find((a) => a.startsWith("--keep="));
const KEEP = keepArg ? Number(keepArg.slice(7)) : 3;
const INSTALLER = /^updates\/ECHO-Setup-(\d+\.\d+\.\d+)\.exe(\.blockmap)?$/;

function fail(msg) { console.error(`✖ ${msg}`); process.exit(1); }
// ราก repo หลัก (.env + node_modules อยู่ที่นั่น แม้รันจาก worktree)
function mainRepo() {
  const here = path.resolve(__dirname, "..", "..");
  if (fs.existsSync(path.join(here, ".env"))) return here;
  const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: here, encoding: "utf8" }).trim();
  return path.dirname(common);
}
const mb = (n) => `${(n / 1e6).toFixed(0)} MB`;

async function main() {
  if (!Number.isInteger(KEEP) || KEEP < 1) fail("--keep ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป");
  const repo = mainRepo();
  const envFile = path.join(repo, ".env");
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const missing = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"].filter((k) => !process.env[k]);
  if (missing.length) fail(`ไม่มีค่า ${missing.join(", ")} ใน ${envFile}`);
  const { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectsCommand } = require(path.join(repo, "desktop", "node_modules", "@aws-sdk", "client-s3"));
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
  const Bucket = process.env.R2_BUCKET;

  const all = [];
  let ContinuationToken;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket, Prefix: "updates/", ContinuationToken }));
    all.push(...(page.Contents || []));
    ContinuationToken = page.NextContinuationToken;
  } while (ContinuationToken);

  // เวอร์ชันที่ผู้เล่นได้รับตอนนี้ — อ่านไม่ได้ = หยุด ไม่เดาเอง
  const latest = await client.send(new GetObjectCommand({ Bucket, Key: "updates/latest.yml" }));
  const live = ((await latest.Body.transformToString()).match(/^version:\s*(\S+)/m) || [])[1];
  if (!live) fail("อ่านเวอร์ชันจาก updates/latest.yml ไม่ได้");

  const versions = new Map();
  for (const o of all) {
    const m = o.Key.match(INSTALLER);
    if (!m) continue;
    const name = m[1];
    if (!versions.has(name)) versions.set(name, { name, at: 0, files: [] });
    const v = versions.get(name);
    v.files.push(o);
    v.at = Math.max(v.at, new Date(o.LastModified).getTime());
  }
  const sorted = [...versions.values()].sort((a, b) => b.at - a.at);
  const kept = sorted.filter((v, i) => i < KEEP || v.name === live);
  const drop = sorted.filter((v) => !kept.includes(v));
  const keys = drop.flatMap((v) => v.files.map((f) => f.Key));
  const bytes = drop.flatMap((v) => v.files).reduce((s, f) => s + f.Size, 0);

  console.log(`เวอร์ชันที่ผู้เล่นได้รับ: ${live}`);
  console.log(`เก็บไว้ ${kept.length} เวอร์ชัน: ${kept.map((v) => v.name).join(", ")}`);
  console.log(`จะลบ ${drop.length} เวอร์ชัน · ${keys.length} ไฟล์ · ${mb(bytes)}`);
  if (drop.length) console.log(`  ${drop[drop.length - 1].name} ถึง ${drop[0].name}`);
  if (!keys.length) return;
  if (!APPLY) { console.log("ยังไม่ได้ลบ — ใส่ --apply เพื่อลบจริง"); return; }

  for (let i = 0; i < keys.length; i += 1000) {
    const res = await client.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })) } }));
    if (res.Errors && res.Errors.length) fail(`ลบไม่สำเร็จ ${res.Errors.length} ไฟล์: ${res.Errors[0].Key}`);
  }
  console.log(`✔ ลบแล้ว ${keys.length} ไฟล์ · คืนพื้นที่ ${mb(bytes)}`);
}

main().catch((err) => fail(err.message));
