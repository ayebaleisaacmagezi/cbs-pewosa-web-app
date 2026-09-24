/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Prints the HTTP endpoint inventory used by the Angular application.
 *
 * Usage: node scripts/extract-angular-fineract-endpoints.mjs
 *
 * This intentionally reads source files only. Paths are normalized to the
 * effective Fineract API prefix where the API-prefix interceptor applies it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const appDirectory = join(process.cwd(), 'src', 'app');
const standardApiPrefix = '/fineract-provider/api/v1';
const endpointPattern = /this\.http\s*\.\s*(get|post|put|patch|delete)(?:<[\s\S]*?>)?\s*\(\s*([`'"])([\s\S]*?)\2/g;

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(entryPath);
    }
    return entry.name.endsWith('.ts') ? [entryPath] : [];
  });
}

function basePath(source) {
  return source.match(/(?:private\s+)?(?:readonly\s+)?basePath\s*=\s*['"]([^'"]+)['"]/)?.[1];
}

function placeholder(expression) {
  return expression.replace(/\$\{encodeURIComponent\(([^)]+)\)\}/g, '{$1}').replace(/\$\{([^}]+)\}/g, '{$1}');
}

function normalizePath(expression, file, source) {
  let value = expression.trim();
  const configuredBasePath = basePath(source);

  if (file.endsWith(`${sep}pewosa-group-lending.service.ts`)) {
    value = value.replaceAll('${this.basePath(groupId)}', '/pewosa/group-lending/groups/{groupId}');
  }
  if (configuredBasePath) {
    value = value.replaceAll('${this.basePath}', configuredBasePath);
  }
  if (file.endsWith(`${sep}diagnostics.service.ts`)) {
    value = value.replaceAll('${this.baseUrl}', '/pewosa/diagnostics');
  }
  if (file.endsWith(`${sep}remittances.service.ts`)) {
    value = value.replaceAll('${this.baseUrl}', '{remittanceBaseUrl}');
  }
  value = value.replaceAll('${this.api}', '{zitadelApiBase}');

  return placeholder(value);
}

function endpointKind(path) {
  if (path.startsWith('{remittanceBaseUrl}') || path.startsWith('{zitadelApiBase}')) {
    return 'External';
  }
  if (path.startsWith('/pewosa/') || path.startsWith('/v2/')) {
    return 'PEWOSA custom Fineract';
  }
  if (path.startsWith('/')) {
    return 'Standard Fineract';
  }
  return 'Unresolved';
}

function effectivePath(path) {
  return endpointKind(path) === 'External' ? path : `${standardApiPrefix}${path}`;
}

const endpoints = new Map();
for (const file of sourceFiles(appDirectory)) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(endpointPattern)) {
    const rawPath = match[3];
    if (
      !rawPath.startsWith('/') &&
      !rawPath.includes('basePath') &&
      !rawPath.includes('baseUrl') &&
      !rawPath.includes('this.api')
    ) {
      continue;
    }

    const method = match[1].toUpperCase();
    const path = normalizePath(rawPath, file, source);
    const kind = endpointKind(path);
    const key = `${method}|${path}|${kind}`;
    const sourcePath = relative(process.cwd(), file).split(sep).join('/');
    const existing = endpoints.get(key) ?? { method, path, kind, sources: new Set() };
    existing.sources.add(sourcePath);
    endpoints.set(key, existing);
  }
}

const grouped = Object.groupBy([...endpoints.values()], ({ kind }) => kind);
const order = [
  'Standard Fineract',
  'PEWOSA custom Fineract',
  'External',
  'Unresolved'
];

console.log('# Angular HTTP Endpoint Map');
console.log('');
console.log(`Fineract endpoints are prefixed with \`${standardApiPrefix}\` by the Angular API-prefix interceptor.`);
console.log('');
for (const kind of order) {
  const entries = grouped[kind]?.sort((left, right) =>
    `${left.path}|${left.method}`.localeCompare(`${right.path}|${right.method}`)
  );
  if (!entries?.length) {
    continue;
  }
  console.log(`## ${kind} (${entries.length})`);
  console.log('');
  console.log('| Method | Effective endpoint | Angular source |');
  console.log('| --- | --- | --- |');
  for (const entry of entries) {
    console.log(`| ${entry.method} | \`${effectivePath(entry.path)}\` | ${[...entry.sources].sort().join('<br>')} |`);
  }
  console.log('');
}
