/**
 * Build-time React TSX to Svelte 5 Compiler.
 *
 * Converts standard React TSX components into native Svelte 5 custom elements
 * at build time. When successful, the output component runs natively on Svelte 5
 * fine-grained runes ($state, $effect, $props) with ZERO React runtime overhead.
 *
 * For components using advanced React features (useContext, useReducer, external
 * React libraries), this converter gracefully indicates unconvertibility so the
 * build system can wrap them with ReactBridge instead.
 */

import { dmdTag } from "../../runtime/svelte-tag";

export interface ReactToSvelteResult {
  success: boolean;
  svelteSource?: string;
  reason?: string;
}

export interface ConvertOptions {
  name: string;
  tag?: string;
  filename?: string;
}

/**
 * Checks whether a React component source code contains advanced or unconvertible
 * React-specific idioms.
 */
function hasUnconvertibleReactFeatures(source: string): string | null {
  if (/\buseContext\b/.test(source)) return "Component uses React useContext";
  if (/\buseReducer\b/.test(source)) return "Component uses React useReducer";
  if (/\bcreatePortal\b/.test(source)) return "Component uses React createPortal";
  if (/\buseImperativeHandle\b/.test(source)) return "Component uses useImperativeHandle";
  if (/from\s+['"]@reduxjs|from\s+['"]zustand|from\s+['"]@tanstack\/react-query/i.test(source)) {
    return "Component imports external React state manager";
  }
  return null;
}

/**
 * Converts style={{ prop: "val", ... }} in JSX to HTML style string.
 */
function convertJsxStyleAttribute(jsx: string): string {
  return jsx.replace(/style=\{\{([^}]+)\}\}/g, (_, inner) => {
    const pairs = inner.split(",");
    const cssRules: string[] = [];

    for (const pair of pairs) {
      const colonIdx = pair.indexOf(":");
      if (colonIdx === -1) continue;

      let key = pair.slice(0, colonIdx).trim();
      let val = pair.slice(colonIdx + 1).trim();

      // Convert camelCase CSS key (e.g. backgroundColor) to kebab-case (background-color)
      key = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      // Remove quotes from string value
      val = val.replace(/^['"]|['"]$/g, "");

      if (key && val) {
        cssRules.push(`${key}:${val}`);
      }
    }

    return `style="${cssRules.join(";")}"`;
  });
}

/**
 * Converts JSX event handlers and attributes to Svelte HTML syntax.
 */
function convertJsxAttributes(jsx: string): string {
  let res = jsx;

  // 1. Convert style objects
  res = convertJsxStyleAttribute(res);

  // 2. className -> class
  res = res.replace(/\bclassName=/g, "class=");

  // 3. React event handlers to Svelte: onClick -> onclick, onChange -> oninput, etc.
  res = res.replace(/\bon([A-Z][a-zA-Z0-9_]*)=/g, (_, evtName) => {
    const lower = evtName.toLowerCase();
    // In Svelte 5, HTML events are standard lowercase onclick, oninput, onkeydown, etc.
    return `on${lower}=`;
  });

  // 4. Remove Fragments <> and </>
  res = res.replace(/<>\s*/g, "<div>");
  res = res.replace(/\s*<\/>/g, "</div>");

  return res;
}

/**
 * Replaces React state setter calls (e.g. setCount(count + 1) or setVal((v) => v + 50))
 * with direct Svelte variable assignments, properly tracking nested parentheses.
 */
function replaceSetterCalls(templateStr: string, setterName: string, stateVar: string): string {
  let result = "";
  let lastIndex = 0;
  const prefix = `${setterName}(`;
  let found = templateStr.indexOf(prefix, lastIndex);

  while (found !== -1) {
    const charBefore = found > 0 ? templateStr[found - 1] : "";
    if (/[a-zA-Z0-9_$]/.test(charBefore)) {
      result += templateStr.slice(lastIndex, found + prefix.length);
      lastIndex = found + prefix.length;
      found = templateStr.indexOf(prefix, lastIndex);
      continue;
    }

    let depth = 1;
    let i = found + prefix.length;
    while (i < templateStr.length && depth > 0) {
      if (templateStr[i] === "(") depth++;
      else if (templateStr[i] === ")") depth--;
      i++;
    }

    if (depth === 0) {
      const inner = templateStr.slice(found + prefix.length, i - 1).trim();
      result += templateStr.slice(lastIndex, found);

      const arrowMatch = inner.match(/^\(?([a-zA-Z0-9_$]+)\)?\s*=>\s*([\s\S]+)$/);
      if (arrowMatch) {
        const param = arrowMatch[1];
        const body = arrowMatch[2].replace(new RegExp(`\\b${param}\\b`, "g"), stateVar);
        result += `${stateVar} = ${body}`;
      } else {
        result += `${stateVar} = ${inner}`;
      }

      lastIndex = i;
      found = templateStr.indexOf(prefix, lastIndex);
    } else {
      break;
    }
  }

  result += templateStr.slice(lastIndex);
  return result;
}

/**
 * Extracts and converts the JSX return block of a React component into a Svelte template.
 */
function extractAndConvertTemplate(source: string): string | null {
  // Match `return (\s*<...>\s*);` or `return <...>;`
  const returnMatch = source.match(/return\s*\(\s*(<[\s\S]+?>[\s\S]*?<\/[A-Za-z0-9_]+>|<[A-Za-z0-9_]+[^>]*\/>)\s*\);?/);
  if (returnMatch) {
    return convertJsxAttributes(returnMatch[1].trim());
  }

  const directReturnMatch = source.match(
    /return\s+(<[A-Za-z0-9_]+[\s\S]*?>[\s\S]*?<\/[A-Za-z0-9_]+>|<[A-Za-z0-9_]+[^>]*\/>);?/,
  );
  if (directReturnMatch) {
    return convertJsxAttributes(directReturnMatch[1].trim());
  }

  return null;
}

/**
 * Converts a React TSX/JSX component source string into a native Svelte 5 component.
 */
export function convertReactToSvelte(source: string, options: ConvertOptions): ReactToSvelteResult {
  const unconvertibleReason = hasUnconvertibleReactFeatures(source);
  if (unconvertibleReason) {
    return { success: false, reason: unconvertibleReason };
  }

  const tag = options.tag || dmdTag(options.name);

  // 1. Extract JSX template
  const template = extractAndConvertTemplate(source);
  if (!template) {
    return { success: false, reason: "Could not locate JSX return statement in React component." };
  }

  // 2. Extract Props from component signature:
  // function Name({ prop1 = val, prop2 }: Props)
  // or const Name = ({ prop1, prop2 }: Props) =>
  let propsCode = "let { ...props } = $props();";
  const propsMatch = source.match(/(?:function\s+[A-Za-z0-9_$]+\s*|\s*=\s*)\(\s*\{([^}]+)\}\s*(?::\s*[^)]+)?\)/);
  if (propsMatch) {
    const rawProps = propsMatch[1]
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .join(", ");
    propsCode = `let { ${rawProps} } = $props();`;
  }

  // 3. Extract useState hooks with balanced parenthesis support: const [foo, setFoo] = useState(init);
  const stateLines: string[] = [];
  const stateSetters = new Map<string, string>(); // setterName -> stateVarName

  const useStatePrefixRegex = /const\s+\[([A-Za-z0-9_$]+),\s*([A-Za-z0-9_$]+)\]\s*=\s*useState\(/g;
  let stateMatch = useStatePrefixRegex.exec(source);
  while (stateMatch !== null) {
    const stateVar = stateMatch[1];
    const setterName = stateMatch[2];
    const startIndex = stateMatch.index + stateMatch[0].length;
    let depth = 1;
    let i = startIndex;
    while (i < source.length && depth > 0) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")") depth--;
      i++;
    }
    const initialVal = depth === 0 ? source.slice(startIndex, i - 1).trim() : "undefined";

    stateLines.push(`let ${stateVar} = $state(${initialVal || "undefined"});`);
    stateSetters.set(setterName, stateVar);
    stateMatch = useStatePrefixRegex.exec(source);
  }

  // 4. Extract useEffect hooks: useEffect(() => { ... }, [...]);
  const effectLines: string[] = [];
  const useEffectRegex = /useEffect\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*(?:,\s*\[[^\]]*\])?\);?/g;
  let effectMatch = useEffectRegex.exec(source);
  while (effectMatch !== null) {
    const effectBody = effectMatch[1].trim();
    effectLines.push(`$effect(() => {\n    ${effectBody}\n  });`);
    effectMatch = useEffectRegex.exec(source);
  }

  // 5. Replace state setter invocations in template with balanced parenthesis & updater function support
  let convertedTemplate = template;
  for (const [setter, stateVar] of stateSetters.entries()) {
    convertedTemplate = replaceSetterCalls(convertedTemplate, setter, stateVar);
  }

  // 6. Assemble complete Svelte 5 component code
  const scriptContent = [propsCode, ...stateLines, ...effectLines].filter(Boolean).join("\n  ");

  const svelteSource = `<svelte:options customElement={{ tag: "${tag}" }} />

<script>
  ${scriptContent}
</script>

${convertedTemplate}

<style>
  :host {
    display: block;
  }
</style>
`;

  return {
    success: true,
    svelteSource,
  };
}
