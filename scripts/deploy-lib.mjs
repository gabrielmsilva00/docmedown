export function incrementPatchVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Automatic patch bumps require a stable semantic version, received ${version}.`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

export function promoteChangelog(content, version, date) {
  if (new RegExp(`^## ${version.replace(/\./g, "\\.")}\\b`, "m").test(content)) return content;

  const heading = /^## Unreleased\s*$/m.exec(content);
  if (!heading || heading.index === undefined) {
    throw new Error("CHANGELOG.md must contain an '## Unreleased' section before automatic deployment.");
  }

  const notesStart = heading.index + heading[0].length;
  const separator = /\n---\s*\n/g;
  separator.lastIndex = notesStart;
  const separatorMatch = separator.exec(content);
  if (!separatorMatch || separatorMatch.index === undefined) {
    throw new Error("CHANGELOG.md must separate Unreleased notes from releases with '---'.");
  }

  const notes = content.slice(notesStart, separatorMatch.index).trim();
  if (!notes) throw new Error("Add at least one CHANGELOG.md note under '## Unreleased' before deploying.");

  const prefix = content.slice(0, notesStart).trimEnd();
  const released = content.slice(separatorMatch.index + separatorMatch[0].length).trimStart();
  return `${prefix}\n\n---\n\n## ${version} - ${date}\n\n${notes}\n\n${released}`;
}

export function listOutputLines(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
