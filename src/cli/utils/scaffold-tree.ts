import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { ColorMode, ThemeFamily } from "../../runtime/types";
import { buildCommand } from "../commands/build";
import { detectRootMarkdownFiles, linkRootMarkdownFiles } from "./link-root";

export interface ScaffoldItem {
  relPath: string;
  type: "file" | "directory" | "symlink";
  action: "create" | "link" | "skip";
  target?: string;
  annotation?: string;
}

export interface ScaffoldPlan {
  targetDir: string;
  displayDir: string;
  rootDir: string;
  items: ScaffoldItem[];
  includeSamples: boolean;
  linkedRootFiles: string[];
}

export interface ProjectInfo {
  name: string;
  description: string;
}

export interface ScaffoldConfig {
  projectName?: string;
  tagline?: string;
  themeFamily?: ThemeFamily | string;
  colorMode?: ColorMode | string;
}

export interface ScaffoldResult {
  created: string[];
  linked: string[];
  skipped: string[];
}

interface TreeNode {
  name: string;
  isDir: boolean;
  annotation?: string;
  children: Map<string, TreeNode>;
}

const PRIORITY_ORDER = ["index.html", "favicon.svg", "docs.json", "README.md", "getting-started.md"];

export function getActiveTemplateDir(): string {
  const candidates = [
    path.resolve(__dirname, "../../../templates"),
    path.resolve(__dirname, "../../templates"),
    path.resolve(__dirname, "../templates"),
    path.resolve(process.cwd(), "templates"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || path.resolve(__dirname, "../../../templates");
}

export function detectProjectInfo(rootDir: string = process.cwd()): ProjectInfo {
  let name = path.basename(rootDir) || "My Project Docs";
  let description = "The simplest Markdown documentation yet";

  try {
    const pkgPath = path.join(rootDir, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.name && typeof pkg.name === "string") {
        name = pkg.name;
      }
      if (pkg.description && typeof pkg.description === "string") {
        description = pkg.description;
      }
    }
  } catch {
    // ignore
  }

  return { name, description };
}

export function planScaffold(options: {
  targetDirArg: string;
  rootDir?: string;
  includeSamples?: boolean;
}): ScaffoldPlan {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const targetDir = path.resolve(rootDir, options.targetDirArg);
  const includeSamples = options.includeSamples !== false;

  let displayDir = options.targetDirArg;
  if (!displayDir.startsWith(".") && !path.isAbsolute(displayDir)) {
    displayDir = `./${displayDir}`;
  }

  const isSubfolder =
    path.resolve(rootDir).toLowerCase() !== path.resolve(targetDir).toLowerCase() &&
    path.dirname(targetDir).toLowerCase() === path.resolve(rootDir).toLowerCase();

  const rootMdFiles = isSubfolder ? detectRootMarkdownFiles(rootDir) : [];
  const rootHasReadme = rootMdFiles.some((f) => f.toLowerCase() === "readme.md");

  const items: ScaffoldItem[] = [];

  // 1. index.html
  const hasIndex = fs.existsSync(path.join(targetDir, "index.html"));
  items.push({
    relPath: "index.html",
    type: "file",
    action: hasIndex ? "skip" : "create",
    annotation: hasIndex ? "(already exists, will keep)" : undefined,
  });

  // 2. favicon.svg
  const activeTemplateDir = getActiveTemplateDir();
  const templateFavicon = path.join(activeTemplateDir, "favicon.svg");
  if (fs.existsSync(templateFavicon)) {
    const hasFavicon = fs.existsSync(path.join(targetDir, "favicon.svg"));
    items.push({
      relPath: "favicon.svg",
      type: "file",
      action: hasFavicon ? "skip" : "create",
      annotation: hasFavicon ? "(already exists, will keep)" : undefined,
    });
  }

  // 3. docs.json
  const hasConfig = fs.existsSync(path.join(targetDir, "docs.json"));
  items.push({
    relPath: "docs.json",
    type: "file",
    action: hasConfig ? "skip" : "create",
    annotation: hasConfig ? "(already exists, will keep)" : undefined,
  });

  // 4. README.md
  const hasTargetReadme = fs.existsSync(path.join(targetDir, "README.md"));
  if (rootHasReadme) {
    items.push({
      relPath: "README.md",
      type: "symlink",
      action: hasTargetReadme ? "skip" : "link",
      target: path.relative(targetDir, path.join(rootDir, "README.md")),
      annotation: hasTargetReadme ? "(already exists, will keep)" : "(linked from root)",
    });
  } else {
    items.push({
      relPath: "README.md",
      type: "file",
      action: hasTargetReadme ? "skip" : "create",
      annotation: hasTargetReadme ? "(already exists, will keep)" : undefined,
    });
  }

  // 5. getting-started.md
  const hasGs = fs.existsSync(path.join(targetDir, "getting-started.md"));
  items.push({
    relPath: "getting-started.md",
    type: "file",
    action: hasGs ? "skip" : "create",
    annotation: hasGs ? "(already exists, will keep)" : undefined,
  });

  // 6. Other root markdown files linked
  for (const fileName of rootMdFiles) {
    if (fileName.toLowerCase() === "readme.md") continue;
    const hasDest = fs.existsSync(path.join(targetDir, fileName));
    items.push({
      relPath: fileName,
      type: "symlink",
      action: hasDest ? "skip" : "link",
      target: path.relative(targetDir, path.join(rootDir, fileName)),
      annotation: hasDest ? "(already exists, will keep)" : "(linked from root)",
    });
  }

  // 7. Sample guides and components
  if (includeSamples) {
    const hasGuide = fs.existsSync(path.join(targetDir, "guides/custom-components.md"));
    items.push({
      relPath: "guides/custom-components.md",
      type: "file",
      action: hasGuide ? "skip" : "create",
      annotation: hasGuide ? "(already exists, will keep)" : undefined,
    });

    const hasDmd = fs.existsSync(path.join(targetDir, ".dmd/CounterWidget.svelte"));
    items.push({
      relPath: ".dmd/CounterWidget.svelte",
      type: "file",
      action: hasDmd ? "skip" : "create",
      annotation: hasDmd ? "(already exists, will keep)" : undefined,
    });
  }

  return {
    targetDir,
    displayDir,
    rootDir,
    items,
    includeSamples,
    linkedRootFiles: rootMdFiles,
  };
}

function sortChildren(a: TreeNode, b: TreeNode): number {
  if (a.isDir !== b.isDir) {
    return a.isDir ? 1 : -1;
  }
  if (!a.isDir && !b.isDir) {
    const aIndex = PRIORITY_ORDER.indexOf(a.name);
    const bIndex = PRIORITY_ORDER.indexOf(b.name);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
  }
  return a.name.localeCompare(b.name);
}

function renderTreeLines(node: TreeNode, prefix: string, isLast: boolean, isRoot: boolean): string[] {
  const lines: string[] = [];
  if (isRoot) {
    const rootName = node.name.endsWith("/") ? node.name : `${node.name}/`;
    lines.push(chalk.cyan.bold(rootName));
  } else {
    const connector = isLast ? "└── " : "├── ";
    const displayName = node.isDir ? chalk.cyan.bold(`${node.name}/`) : chalk.white(node.name);
    const annotationStr = node.annotation ? ` ${chalk.dim(node.annotation)}` : "";
    lines.push(`${chalk.gray(prefix + connector)}${displayName}${annotationStr}`);
  }

  const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
  const children = Array.from(node.children.values()).sort(sortChildren);

  for (let i = 0; i < children.length; i++) {
    const childIsLast = i === children.length - 1;
    lines.push(...renderTreeLines(children[i], childPrefix, childIsLast, false));
  }

  return lines;
}

export function renderScaffoldTree(plan: ScaffoldPlan): string {
  let rootLabel = path.basename(plan.targetDir);
  if (!rootLabel || rootLabel === "." || rootLabel === "/") {
    rootLabel = plan.displayDir;
  }

  const rootNode: TreeNode = {
    name: rootLabel,
    isDir: true,
    children: new Map(),
  };

  for (const item of plan.items) {
    const parts = item.relPath.split(/[/\\]+/).filter(Boolean);
    let current = rootNode;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (isLast) {
        current.children.set(part, {
          name: part,
          isDir: item.type === "directory",
          annotation: item.annotation,
          children: current.children.get(part)?.children || new Map(),
        });
      } else {
        if (!current.children.has(part)) {
          current.children.set(part, {
            name: part,
            isDir: true,
            children: new Map(),
          });
        }
        current = current.children.get(part)!;
      }
    }
  }

  return renderTreeLines(rootNode, "", true, true).join("\n");
}

export async function executeScaffold(plan: ScaffoldPlan, config: ScaffoldConfig = {}): Promise<ScaffoldResult> {
  const result: ScaffoldResult = {
    created: [],
    linked: [],
    skipped: [],
  };

  // 1. Ensure target directory exists
  if (!fs.existsSync(plan.targetDir)) {
    fs.mkdirSync(plan.targetDir, { recursive: true });
  }

  // 2. Link root markdown files
  if (plan.linkedRootFiles.length > 0) {
    const linkRes = linkRootMarkdownFiles(plan.rootDir, plan.targetDir);
    result.linked.push(...linkRes.linked);
    result.skipped.push(...linkRes.skipped);
    for (const file of linkRes.linked) {
      console.log(chalk.green(`  ✔ Linked root markdown file: ${file}`));
    }
  }

  const activeTemplateDir = getActiveTemplateDir();

  // 3. index.html
  const indexPath = path.join(plan.targetDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    const templateHtml = fs.readFileSync(path.join(activeTemplateDir, "index.html"), "utf-8");
    fs.writeFileSync(indexPath, templateHtml, "utf-8");
    result.created.push("index.html");
    console.log(chalk.green("  ✔ Created index.html"));
  } else {
    result.skipped.push("index.html");
  }

  // 4. favicon.svg
  const faviconPath = path.join(plan.targetDir, "favicon.svg");
  const templateFavicon = path.join(activeTemplateDir, "favicon.svg");
  if (!fs.existsSync(faviconPath) && fs.existsSync(templateFavicon)) {
    fs.copyFileSync(templateFavicon, faviconPath);
    result.created.push("favicon.svg");
    console.log(chalk.green("  ✔ Created favicon.svg"));
  }

  // 5. docs.json
  const configPath = path.join(plan.targetDir, "docs.json");
  if (!fs.existsSync(configPath)) {
    const templateConfigRaw = fs.readFileSync(path.join(activeTemplateDir, "docs.json"), "utf-8");
    let configObj: any = {};
    try {
      configObj = JSON.parse(templateConfigRaw);
    } catch {
      configObj = {};
    }

    if (config.projectName) {
      configObj.name = config.projectName;
    }
    if (config.tagline) {
      configObj.tagline = config.tagline;
    }
    if (config.themeFamily) {
      configObj.theme = configObj.theme || {};
      configObj.theme.family = config.themeFamily;
    }
    if (config.colorMode) {
      configObj.theme = configObj.theme || {};
      configObj.theme.defaultMode = config.colorMode;
    }
    if (!plan.includeSamples) {
      if (Array.isArray(configObj.nav)) {
        configObj.nav = configObj.nav.filter((item: any) => !item.href?.includes("custom-components"));
      }
    }

    fs.writeFileSync(configPath, JSON.stringify(configObj, null, 2), "utf-8");
    result.created.push("docs.json");
    console.log(chalk.green("  ✔ Created docs.json"));
  } else {
    result.skipped.push("docs.json");
  }

  // 6. README.md (only created from template if not already present/linked)
  const readmePath = path.join(plan.targetDir, "README.md");
  if (!fs.existsSync(readmePath)) {
    let templateReadme = fs.readFileSync(path.join(activeTemplateDir, "README.md"), "utf-8");
    if (config.projectName && config.projectName !== "My Project Docs") {
      templateReadme = templateReadme
        .replace(/^# Welcome to DocMeDown/m, `# Welcome to ${config.projectName}`)
        .replace(/title: Welcome to DocMeDown/, `title: Welcome to ${config.projectName}`);
    }
    fs.writeFileSync(readmePath, templateReadme, "utf-8");
    result.created.push("README.md");
    console.log(chalk.green("  ✔ Created README.md"));
  }

  // 7. getting-started.md
  const gsPath = path.join(plan.targetDir, "getting-started.md");
  if (!fs.existsSync(gsPath)) {
    const templateGs = fs.readFileSync(path.join(activeTemplateDir, "getting-started.md"), "utf-8");
    fs.writeFileSync(gsPath, templateGs, "utf-8");
    result.created.push("getting-started.md");
    console.log(chalk.green("  ✔ Created getting-started.md"));
  } else {
    result.skipped.push("getting-started.md");
  }

  // 8. guides/ and custom-components.md
  if (plan.includeSamples) {
    const guidesDir = path.join(plan.targetDir, "guides");
    if (!fs.existsSync(guidesDir)) {
      fs.mkdirSync(guidesDir, { recursive: true });
    }
    const guidePath = path.join(guidesDir, "custom-components.md");
    if (!fs.existsSync(guidePath)) {
      const templateGuide = fs.readFileSync(path.join(activeTemplateDir, "guides/custom-components.md"), "utf-8");
      fs.writeFileSync(guidePath, templateGuide, "utf-8");
      result.created.push("guides/custom-components.md");
      console.log(chalk.green("  ✔ Created guides/custom-components.md"));
    } else {
      result.skipped.push("guides/custom-components.md");
    }

    // 9. .dmd/ and CounterWidget.svelte
    const dmdDir = path.join(plan.targetDir, ".dmd");
    if (!fs.existsSync(dmdDir)) {
      fs.mkdirSync(dmdDir, { recursive: true });
    }
    const dmdComponentPath = path.join(dmdDir, "CounterWidget.svelte");
    if (!fs.existsSync(dmdComponentPath)) {
      const templateDmd = fs.readFileSync(path.join(activeTemplateDir, ".dmd/CounterWidget.svelte"), "utf-8");
      fs.writeFileSync(dmdComponentPath, templateDmd, "utf-8");
      result.created.push(".dmd/CounterWidget.svelte");
      console.log(chalk.green("  ✔ Created .dmd/CounterWidget.svelte"));
    } else {
      result.skipped.push(".dmd/CounterWidget.svelte");
    }
  }

  // 10. Generate the serveable and offline artifacts as docmedown build
  await buildCommand(plan.targetDir);

  return result;
}
