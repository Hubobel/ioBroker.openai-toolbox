"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const releaseType = process.argv[2];
const description = process.argv.slice(3).join(" ").trim();

if (!["patch", "minor", "major"].includes(releaseType)) {
  console.error(
    "Usage: node scripts/release.js <patch|minor|major> <description>",
  );
  process.exit(1);
}

if (!description) {
  console.error("A release description is required.");
  process.exit(1);
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(root, filename), "utf8"));
}

function writeJson(filename, value) {
  fs.writeFileSync(
    path.join(root, filename),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

function nextVersion(currentVersion, type) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(currentVersion);

  if (!match) {
    throw new Error(`Invalid version: ${currentVersion}`);
  }

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (type === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const ioPackage = readJson("io-package.json");

const oldVersion = packageJson.version;
const newVersion = nextVersion(oldVersion, releaseType);

if (ioPackage.common.version !== oldVersion) {
  throw new Error(
    `Version mismatch: package.json=${oldVersion}, io-package.json=${ioPackage.common.version}`,
  );
}

packageJson.version = newVersion;
packageLock.version = newVersion;

if (packageLock.packages?.[""]) {
  packageLock.packages[""].version = newVersion;
}

ioPackage.common.version = newVersion;

const oldNews = ioPackage.common.news || {};
const newestNews = Object.values(oldNews)[0];
const languages =
  newestNews && typeof newestNews === "object"
    ? Object.keys(newestNews)
    : ["en", "de"];

const releaseNews = {};

for (const language of languages) {
  releaseNews[language] = description;
}

ioPackage.common.news = {
  [newVersion]: releaseNews,
  ...oldNews,
};

const newsVersions = Object.keys(ioPackage.common.news);

for (const version of newsVersions.slice(20)) {
  delete ioPackage.common.news[version];
}

writeJson("package.json", packageJson);
writeJson("package-lock.json", packageLock);
writeJson("io-package.json", ioPackage);

console.log(`Version updated: ${oldVersion} -> ${newVersion}`);
console.log(`Release note: ${description}`);
