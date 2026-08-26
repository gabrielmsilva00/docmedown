import type { DocFrontmatter, SidebarItemConfig, SidebarTreeNode } from "../types";

export function formatTitleFromFilename(name: string): string {
  // Remove extension
  let clean = name.replace(/\.(md|mdx|html)$/i, "");
  // Remove leading numbers used for ordering (e.g. "01-intro" -> "intro")
  clean = clean.replace(/^\d+[-_.]/, "");

  if (clean.toLowerCase() === "readme" || clean.toLowerCase() === "index") {
    return "Overview";
  }

  // Convert kebab/snake case to words
  return clean
    .split(/[-_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function buildSidebarTree(
  files: string[],
  frontmatters: Record<string, DocFrontmatter> = {},
  manualSidebar?: SidebarItemConfig[],
): SidebarTreeNode[] {
  // If user defined explicit manual sidebar in docs.json, use that
  if (manualSidebar && manualSidebar.length > 0) {
    return mapManualSidebar(manualSidebar);
  }

  const rootNodes: SidebarTreeNode[] = [];
  const categoryMap: Map<string, SidebarTreeNode> = new Map();

  for (const filePath of files) {
    const cleanPath = filePath.replace(/^\.?\//, "");
    const parts = cleanPath.split("/");
    const fm = frontmatters[cleanPath] || {};

    if (fm.hidden) continue;

    if (parts.length === 1) {
      // Root level document
      const filename = parts[0];
      const slug = filename.replace(/\.(md|mdx)$/i, "");
      const isOverview = slug.toLowerCase() === "readme" || slug.toLowerCase() === "index";

      rootNodes.push({
        id: slug,
        title: fm.title || fm.sidebar_label || (isOverview ? "Overview" : formatTitleFromFilename(filename)),
        slug: isOverview ? "README" : slug,
        path: cleanPath,
        icon: fm.icon,
        badge: fm.badge,
        badgeType: fm.badge_type,
        order: fm.order ?? fm.sidebar_position ?? (isOverview ? -999 : 0),
        isCategory: false,
      });
    } else {
      // Nested under directories
      let currentCategory = "";
      let parentNodeList = rootNodes;

      for (let i = 0; i < parts.length - 1; i++) {
        const catSegment = parts[i];
        currentCategory = currentCategory ? `${currentCategory}/${catSegment}` : catSegment;

        let catNode = categoryMap.get(currentCategory);
        if (!catNode) {
          catNode = {
            id: currentCategory,
            title: formatTitleFromFilename(catSegment),
            order: 10,
            isCategory: true,
            collapsed: false,
            children: [],
          };
          categoryMap.set(currentCategory, catNode);
          parentNodeList.push(catNode);
        }
        parentNodeList = catNode.children!;
      }

      const filename = parts[parts.length - 1];
      const slug = cleanPath.replace(/\.(md|mdx)$/i, "");
      const isOverview =
        filename.replace(/\.(md|mdx)$/i, "").toLowerCase() === "readme" ||
        filename.replace(/\.(md|mdx)$/i, "").toLowerCase() === "index";

      parentNodeList.push({
        id: slug,
        title: fm.title || fm.sidebar_label || (isOverview ? "Overview" : formatTitleFromFilename(filename)),
        slug,
        path: cleanPath,
        icon: fm.icon,
        badge: fm.badge,
        badgeType: fm.badge_type,
        order: fm.order ?? fm.sidebar_position ?? (isOverview ? -100 : 0),
        isCategory: false,
      });
    }
  }

  // Sort nodes recursively
  sortTreeNodes(rootNodes);
  return rootNodes;
}

function sortTreeNodes(nodes: SidebarTreeNode[]) {
  nodes.sort((a, b) => {
    // Categories and files sorting by order first
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    // Overview always first
    if (a.slug === "README") return -1;
    if (b.slug === "README") return 1;
    // Categories after single files or alphabetical
    return a.title.localeCompare(b.title);
  });

  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      sortTreeNodes(node.children);
    }
  }
}

function mapManualSidebar(items: SidebarItemConfig[]): SidebarTreeNode[] {
  return items.map((item, idx) => {
    const isCategory = Boolean(item.children && item.children.length > 0);
    const slug = item.slug || (item.path ? item.path.replace(/\.(md|mdx)$/i, "") : `item-${idx}`);
    return {
      id: slug,
      title: item.title || formatTitleFromFilename(slug),
      slug: isCategory ? undefined : slug,
      path: item.path,
      icon: item.icon,
      badge: item.badge,
      badgeType: item.badgeType,
      order: idx,
      isCategory,
      collapsed: item.collapsed ?? false,
      children: item.children ? mapManualSidebar(item.children) : undefined,
    };
  });
}
