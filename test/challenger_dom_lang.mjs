/**
 * Adversarial Empirical Verification Suite for DOM Structure & Language Purity
 * NASA Microgravity Combustion Science SCADA Application
 * 
 * Verifies:
 * 1. Language Purity in Nasa_FINAL (zero Vietnamese diacritics in frontend & pitch, siDisclosureMap validity)
 * 2. DOM Layout & Tree Invariants in both Nasa and Nasa_FINAL (Tab 3 layout, si-compliance-bar relocation, zero duplicate IDs)
 * 3. Responsive CSS rules in styles.css across both repositories
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const NASA_PATH = 'C:/Users/Admin/.gemini/antigravity/scratch/Nasa';
const NASA_FINAL_PATH = 'C:/Users/Admin/.gemini/antigravity/scratch/Nasa_FINAL';

const VIETNAMESE_REGEX = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/g;

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function reportPass(description, details = '') {
  totalChecks++;
  passedChecks++;
  console.log(`  ✔ [PASS] ${description}${details ? ' (' + details + ')' : ''}`);
}

function reportFail(description, details = '') {
  totalChecks++;
  failedChecks++;
  console.error(`  ✖ [FAIL] ${description}: ${details}`);
}

console.log('========================================================================');
console.log('🛡️  EMPIRICAL ADVERSARIAL CHALLENGER — DOM & LANGUAGE PURITY');
console.log('========================================================================\n');

// ============================================================================
// SUITE 1: Language Purity Challenge in Nasa_FINAL
// ============================================================================
console.log('▶ Suite 1: Language Purity Challenge in Nasa_FINAL');

const frontendFiles = [
  path.join(NASA_FINAL_PATH, 'public', 'app.js'),
  path.join(NASA_FINAL_PATH, 'public', 'index.html'),
  path.join(NASA_FINAL_PATH, 'public', 'styles.css'),
  path.join(NASA_FINAL_PATH, 'public', 'visualizer.js'),
];

// Add all files in pitch/
const pitchDir = path.join(NASA_FINAL_PATH, 'pitch');
if (fs.existsSync(pitchDir)) {
  const pitchFiles = fs.readdirSync(pitchDir).map(f => path.join(pitchDir, f));
  frontendFiles.push(...pitchFiles);
}

let totalMatchesInFinal = 0;
const violationsPerFile = {};

for (const filePath of frontendFiles) {
  if (!fs.existsSync(filePath)) {
    reportFail(`File existence check`, `${filePath} not found on disk`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileViolations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = line.match(VIETNAMESE_REGEX);
    if (matches && matches.length > 0) {
      fileViolations.push({
        lineNum: i + 1,
        matches: [...new Set(matches)],
        sample: line.trim().slice(0, 80)
      });
      totalMatchesInFinal += matches.length;
    }
  }

  const relPath = path.relative(NASA_FINAL_PATH, filePath).replace(/\\/g, '/');
  if (fileViolations.length === 0) {
    reportPass(`Language purity in ${relPath}`, `0 diacritic matches`);
  } else {
    violationsPerFile[relPath] = fileViolations;
    reportFail(`Language purity in ${relPath}`, `${fileViolations.length} violating lines found: ${JSON.stringify(fileViolations.slice(0, 3))}`);
  }
}

if (totalMatchesInFinal === 0) {
  reportPass(`Total Vietnamese diacritics across all Nasa_FINAL frontend & pitch files`, `Exactly 0 matches`);
} else {
  reportFail(`Total Vietnamese diacritics across all Nasa_FINAL frontend & pitch files`, `Found ${totalMatchesInFinal} matches across files`);
}

// Check siDisclosureMap in public/app.js
const appJsPath = path.join(NASA_FINAL_PATH, 'public', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

const mapMatch = appJsContent.match(/const\s+siDisclosureMap\s*=\s*\{([\s\S]*?)\};/);
if (!mapMatch) {
  reportFail('siDisclosureMap definition in app.js', 'Object definition not matched');
} else {
  reportPass('siDisclosureMap definition in app.js', 'Found object definition');
  const rawObjStr = '{' + mapMatch[1] + '}';
  let parsedMap = null;
  try {
    // Safely evaluate object literal
    parsedMap = new Function(`return (${rawObjStr});`)();
  } catch (err) {
    reportFail('siDisclosureMap evaluation', err.message);
  }

  if (parsedMap) {
    const requiredKeys = ['code_gen', 'edge_pinn', 'visual_sim', 'psi_data'];
    for (const key of requiredKeys) {
      if (key in parsedMap) {
        const val = parsedMap[key];
        const valMatches = (typeof val === 'string') ? val.match(VIETNAMESE_REGEX) : ['non-string'];
        if (typeof val === 'string' && val.length > 20 && (!valMatches || valMatches.length === 0)) {
          reportPass(`siDisclosureMap.${key}`, `Length: ${val.length} chars, pure English: "${val.slice(0, 45)}..."`);
        } else {
          reportFail(`siDisclosureMap.${key}`, `Invalid value: ${val}`);
        }
      } else {
        reportFail(`siDisclosureMap.${key}`, `Key missing from map`);
      }
    }
  }
}

// ============================================================================
// SUITE 2: DOM Layout & Tree Invariants Challenge
// ============================================================================
console.log('\n▶ Suite 2: DOM Layout & Tree Invariants Challenge');

/**
 * Lightweight HTML Tree Tokenizer & Parser
 * Construct parent-child node graph to rigorously assert descendant relationships
 */
function parseHtmlTree(htmlStr) {
  // Regex for HTML tags
  const tagRegex = /<!--[\s\S]*?-->|<(\/)?([a-zA-Z0-9\-]+)([^>]*)>/g;
  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);

  const root = {
    tag: 'ROOT',
    attrs: {},
    id: null,
    classes: [],
    children: [],
    parent: null
  };

  const stack = [root];
  let match;

  while ((match = tagRegex.exec(htmlStr)) !== null) {
    const fullTag = match[0];
    if (fullTag.startsWith('<!--')) continue; // skip comments

    const isClosing = match[1] === '/';
    const tagName = match[2].toLowerCase();
    const attrStr = match[3] || '';

    if (isClosing) {
      // Pop until matching tag
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tagName) {
          stack.splice(i);
          break;
        }
      }
    } else {
      // Parse attributes
      const idMatch = attrStr.match(/\bid\s*=\s*["']([^"']+)["']/i);
      const classMatch = attrStr.match(/\bclass\s*=\s*["']([^"']+)["']/i);
      const isSelfClosing = attrStr.trim().endsWith('/') || voidTags.has(tagName);

      const node = {
        tag: tagName,
        rawAttrs: attrStr,
        id: idMatch ? idMatch[1] : null,
        classes: classMatch ? classMatch[1].trim().split(/\s+/) : [],
        children: [],
        parent: stack[stack.length - 1]
      };

      stack[stack.length - 1].children.push(node);

      if (!isSelfClosing) {
        stack.push(node);
      }
    }
  }

  return root;
}

function findNodeById(root, targetId) {
  if (root.id === targetId) return root;
  for (const child of root.children) {
    const found = findNodeById(child, targetId);
    if (found) return found;
  }
  return null;
}

function findNodesByClass(root, targetClass) {
  const result = [];
  function walk(node) {
    if (node.classes && node.classes.includes(targetClass)) {
      result.push(node);
    }
    for (const child of node.children) {
      walk(child);
    }
  }
  walk(root);
  return result;
}

function isDescendantOf(childNode, ancestorNode) {
  let curr = childNode.parent;
  while (curr) {
    if (curr === ancestorNode) return true;
    curr = curr.parent;
  }
  return false;
}

const targets = [
  { name: 'Nasa (Vietnamese Showcase)', dir: NASA_PATH },
  { name: 'Nasa_FINAL (English Showcase)', dir: NASA_FINAL_PATH }
];

for (const target of targets) {
  console.log(`\n  --- Checking Repository: ${target.name} ---`);
  const indexHtmlPath = path.join(target.dir, 'public', 'index.html');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  // Check 1: Duplicate IDs across entire DOM tree
  const idRegex = /\bid\s*=\s*["']([^"']+)["']/gi;
  const idCounts = {};
  let idMatch;
  let totalIdAttributes = 0;

  while ((idMatch = idRegex.exec(indexHtml)) !== null) {
    totalIdAttributes++;
    const idVal = idMatch[1];
    idCounts[idVal] = (idCounts[idVal] || 0) + 1;
  }

  const duplicateIds = Object.entries(idCounts).filter(([_, count]) => count > 1);
  if (duplicateIds.length === 0) {
    reportPass(`[${target.name}] Duplicate IDs across entire DOM tree`, `Total IDs: ${totalIdAttributes}, Duplicates: 0`);
  } else {
    reportFail(`[${target.name}] Duplicate IDs across entire DOM tree`, `Found ${duplicateIds.length} duplicate IDs: ${JSON.stringify(duplicateIds)}`);
  }

  // Parse DOM tree
  const treeRoot = parseHtmlTree(indexHtml);

  const viewScada = findNodeById(treeRoot, 'view-scada');
  const viewMathSpinoff = findNodeById(treeRoot, 'view-math_spinoff');
  const siBar = findNodeById(treeRoot, 'si-compliance-bar');

  if (!viewScada) reportFail(`[${target.name}] Node #view-scada`, 'Not found in DOM');
  else reportPass(`[${target.name}] Node #view-scada exists`);

  if (!viewMathSpinoff) reportFail(`[${target.name}] Node #view-math_spinoff`, 'Not found in DOM');
  else reportPass(`[${target.name}] Node #view-math_spinoff exists`);

  if (!siBar) reportFail(`[${target.name}] Node #si-compliance-bar`, 'Not found in DOM');
  else reportPass(`[${target.name}] Node #si-compliance-bar exists`);

  if (siBar && viewScada) {
    const isUnderScada = isDescendantOf(siBar, viewScada);
    if (!isUnderScada) {
      reportPass(`[${target.name}] Invariant: #si-compliance-bar is NOT a descendant of #view-scada`);
    } else {
      reportFail(`[${target.name}] Invariant: #si-compliance-bar is NOT a descendant of #view-scada`, 'Still inside #view-scada');
    }
  }

  if (siBar && viewMathSpinoff) {
    const isUnderMath = isDescendantOf(siBar, viewMathSpinoff);
    if (isUnderMath) {
      reportPass(`[${target.name}] Invariant: #si-compliance-bar IS a descendant of #view-math_spinoff`);
    } else {
      reportFail(`[${target.name}] Invariant: #si-compliance-bar IS a descendant of #view-math_spinoff`, 'Not inside #view-math_spinoff');
    }
  }

  // Check .two-cols-row inside #view-math_spinoff
  if (viewMathSpinoff) {
    const twoColRows = findNodesByClass(viewMathSpinoff, 'two-cols-row');
    if (twoColRows.length >= 1) {
      reportPass(`[${target.name}] Invariant: .two-cols-row exists inside #view-math_spinoff`, `Found ${twoColRows.length} instances`);
      const row = twoColRows[0];
      const hasSiBar = isDescendantOf(siBar, row);
      const colCards = findNodesByClass(row, 'scada-col-card');

      if (hasSiBar) {
        reportPass(`[${target.name}] Invariant: .two-cols-row contains #si-compliance-bar`);
      } else {
        reportFail(`[${target.name}] Invariant: .two-cols-row contains #si-compliance-bar`, 'si-compliance-bar is not inside .two-cols-row');
      }

      if (colCards.length >= 1) {
        reportPass(`[${target.name}] Invariant: .two-cols-row contains .scada-col-card (Spaceflight Lessons)`);
      } else {
        reportFail(`[${target.name}] Invariant: .two-cols-row contains .scada-col-card`, 'No .scada-col-card inside .two-cols-row');
      }
    } else {
      reportFail(`[${target.name}] Invariant: .two-cols-row exists inside #view-math_spinoff`, '0 instances found');
    }

    // Check .scada-formulas-panel is at top of #view-math_spinoff
    const mathChildren = viewMathSpinoff.children;
    const formulasPanelIndex = mathChildren.findIndex(c => c.classes && c.classes.includes('scada-formulas-panel'));
    const twoColsRowIndex = mathChildren.findIndex(c => c.classes && c.classes.includes('two-cols-row'));

    if (formulasPanelIndex !== -1 && twoColsRowIndex !== -1 && formulasPanelIndex < twoColsRowIndex) {
      reportPass(`[${target.name}] Invariant: .scada-formulas-panel is at top of #view-math_spinoff (index ${formulasPanelIndex} < twoColsRow index ${twoColsRowIndex})`);
    } else {
      reportFail(`[${target.name}] Invariant: .scada-formulas-panel ordering`, `formulasPanelIndex: ${formulasPanelIndex}, twoColsRowIndex: ${twoColsRowIndex}`);
    }

    // Check redundant static columns are absent
    // The two static columns were:
    // "1. Mathematical Foundations of Microgravity Combustion" / "1. Cơ Sở Toán Học Vật Lý Cháy Vi Trọng Lực"
    // "2. Edge SI Algorithms & Physics-Informed AI" / "2. Thuật Toán Edge SI & Physics-Informed AI"
    const mathHtml = indexHtml.substring(indexHtml.indexOf('id="view-math_spinoff"'), indexHtml.indexOf('</section>', indexHtml.indexOf('id="view-math_spinoff"')));
    
    const redundantHeader1En = 'Mathematical Foundations of Microgravity Combustion';
    const redundantHeader1Vi = 'Cơ Sở Toán Học Vật Lý Cháy Vi Trọng Lực';
    const redundantHeader2En = 'Edge SI Algorithms &amp; Physics-Informed AI';
    const redundantHeader2Vi = 'Thuật Toán Edge SI &amp; Physics-Informed AI';

    const hasRedundant1 = mathHtml.includes(redundantHeader1En) || mathHtml.includes(redundantHeader1Vi);
    const hasRedundant2 = mathHtml.includes(redundantHeader2En) || mathHtml.includes(redundantHeader2Vi);

    if (!hasRedundant1 && !hasRedundant2) {
      reportPass(`[${target.name}] Invariant: 2 redundant static columns are completely absent from Tab 3`);
    } else {
      reportFail(`[${target.name}] Invariant: 2 redundant static columns absent`, `Found redundant1=${hasRedundant1}, redundant2=${hasRedundant2}`);
    }

    // Check all retained formula IDs are intact
    const retainedFormulaIds = [
      'formula-live-d2',
      'formula-live-qrad',
      'formula-live-result',
      'formula-live-pinn',
      'formula-live-ensemble'
    ];
    let allFormulasPresent = true;
    for (const fid of retainedFormulaIds) {
      if (!findNodeById(viewMathSpinoff, fid)) {
        allFormulasPresent = false;
        reportFail(`[${target.name}] Retained formula ID: #${fid}`, 'Missing in #view-math_spinoff');
      }
    }
    if (allFormulasPresent) {
      reportPass(`[${target.name}] All 5 live formula badge IDs retained inside .scada-formulas-panel`);
    }
  }

  // Check CSS: public/styles.css
  const stylesCssPath = path.join(target.dir, 'public', 'styles.css');
  const stylesCss = fs.readFileSync(stylesCssPath, 'utf8');

  // Check .two-cols-row rule
  const twoColsRegex = /\.two-cols-row\s*\{[^}]*grid-template-columns\s*:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/;
  if (twoColsRegex.test(stylesCss)) {
    reportPass(`[${target.name}] CSS: .two-cols-row grid definition exists`);
  } else {
    reportFail(`[${target.name}] CSS: .two-cols-row grid definition`, 'repeat(2, minmax(0, 1fr)) not found');
  }

  // Check media query @media (max-width: 1120px)
  const mediaQueryRegex = /@media\s*\(\s*max-width\s*:\s*1120px\s*\)\s*\{[\s\S]*?\.two-cols-row\s*\{[\s\S]*?grid-template-columns\s*:\s*1fr/i;
  if (mediaQueryRegex.test(stylesCss)) {
    reportPass(`[${target.name}] CSS: @media (max-width: 1120px) responsive 1fr column collapse exists`);
  } else {
    reportFail(`[${target.name}] CSS: responsive media query (max-width: 1120px)`, 'Responsive rule for .two-cols-row not matched');
  }
}

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n========================================================================');
console.log('📊 EMPIRICAL VERIFICATION HARNESS RESULTS');
console.log('========================================================================');
console.log(`Total Invariants Tested : ${totalChecks}`);
console.log(`Passed Invariants       : ${passedChecks}`);
console.log(`Failed Invariants       : ${failedChecks}`);
const verdict = failedChecks === 0 ? 'APPROVE' : 'REQUEST_CHANGES';
console.log(`FINAL VERDICT           : ${verdict}`);
console.log('========================================================================\n');

if (failedChecks > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
