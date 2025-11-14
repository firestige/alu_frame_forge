import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Minimal metadata guard to keep persistent docs aligned with workflow rules.
const DOCS_TO_CHECK = [
  'doc/Architecture.md',
  'doc/DevelopLog.md',
  'doc/WorkflowGuidelines.md',
  'TODO.md',
];

const LAST_UPDATED_PATTERN = /\*\*最后更新\*\*\s*:\s*\d{4}-\d{2}-\d{2}/;

const failures = [];

for (const relativePath of DOCS_TO_CHECK) {
  const absolutePath = resolve(process.cwd(), relativePath);
  const contents = await readFile(absolutePath, 'utf8');
  const headerSnippet = contents.slice(0, 300);

  if (!LAST_UPDATED_PATTERN.test(headerSnippet)) {
    failures.push(`${relativePath}: missing or malformed “最后更新”字段`);
  }
}

if (failures.length > 0) {
  console.error('❌ 文档元信息检查失败:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('✅ 文档元信息检查通过');
