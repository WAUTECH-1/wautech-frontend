import fs from 'node:fs/promises';

// Send only public Maven coordinates, never source, environment or credentials.
const inventory = await fs.readFile(
  process.argv[2] ?? 'docs/phase6-backend-dependencies.txt',
  'utf8',
);
const queries = [
  ...inventory.matchAll(
    /^\s+([^\s:]+):([^:]+):jar:([^:]+):(compile|runtime)/gm,
  ),
].map(([, group, artifact, version]) => ({
  package: { ecosystem: 'Maven', name: `${group}:${artifact}` },
  version,
}));
if (!queries.length) throw new Error('No resolved dependencies found');
const response = await fetch('https://api.osv.dev/v1/querybatch', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ queries }),
});
if (!response.ok) throw new Error(`OSV HTTP ${response.status}`);
const { results } = await response.json();
if (!Array.isArray(results) || results.length !== queries.length)
  throw new Error('Incomplete OSV response; scan cannot establish coverage');
const report = {
  checkedAt: new Date().toISOString(),
  source: 'https://api.osv.dev/v1/querybatch',
  dependencies: queries.length,
  findings: results.flatMap((result, index) =>
    (result.vulns ?? []).map((vulnerability) => ({
      ...queries[index],
      ...vulnerability,
    })),
  ),
};
await fs.writeFile(
  process.argv[3] ?? 'docs/phase6-backend-advisories.json',
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  `Checked ${report.dependencies} runtime dependencies; ${report.findings.length} advisory matches`,
);
