/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tests for the checkCopilotEnginesVersion logic in build/hygiene.ts.
 *
 * Note: hygiene.ts cannot be directly imported in the test environment because it depends
 * on gulp-related packages (event-stream, vinyl-fs, gulp-filter) that are not installed in
 * the test context. Instead, we test the extracted logic of checkCopilotEnginesVersion inline.
 * The logic is: read root package.json version, build expected = `^${version}`,
 * compare to copilot package.json engines.vscode, return an error string or undefined.
 */

import assert from 'assert';
import { suite, test, beforeEach, afterEach } from 'node:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Mirrors the logic of checkCopilotEnginesVersion from build/hygiene.ts.
 * Kept in sync: any changes to hygiene.ts checkCopilotEnginesVersion must be reflected here.
 */
function checkCopilotEnginesVersion(repoRoot: string): string | undefined {
	const rootPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
	const copilotPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'extensions/copilot/package.json'), 'utf8'));
	const expected = `^${rootPkg.version}`;
	const actual = copilotPkg?.engines?.vscode;
	if (actual !== expected) {
		return `engines.vscode in 'extensions/copilot/package.json' must be "${expected}" (the version from the root package.json), but found "${actual ?? '<missing>'}"`;
	}
	return undefined;
}

suite('checkCopilotEnginesVersion', () => {

	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hygiene-test-'));
		fs.mkdirSync(path.join(tmpDir, 'extensions', 'copilot'), { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function writeRootPackageJson(version: string): void {
		fs.writeFileSync(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ version })
		);
	}

	function writeCopilotPackageJson(engineVersion: string | undefined): void {
		const pkg: Record<string, unknown> = { name: 'copilot' };
		if (engineVersion !== undefined) {
			pkg.engines = { vscode: engineVersion };
		}
		fs.writeFileSync(
			path.join(tmpDir, 'extensions', 'copilot', 'package.json'),
			JSON.stringify(pkg)
		);
	}

	test('returns undefined when engines.vscode matches ^{rootVersion}', () => {
		writeRootPackageJson('1.95.0');
		writeCopilotPackageJson('^1.95.0');
		const result = checkCopilotEnginesVersion(tmpDir);
		assert.strictEqual(result, undefined);
	});

	test('returns error string when engines.vscode does not match expected version', () => {
		writeRootPackageJson('1.95.0');
		writeCopilotPackageJson('^1.90.0');
		const result = checkCopilotEnginesVersion(tmpDir);
		assert.ok(typeof result === 'string', 'should return an error string');
		assert.ok(result.includes('^1.95.0'), 'error should mention expected version');
		assert.ok(result.includes('^1.90.0'), 'error should mention actual version');
	});

	test('returns error when engines field is absent (shows <missing>)', () => {
		writeRootPackageJson('1.95.0');
		writeCopilotPackageJson(undefined);
		const result = checkCopilotEnginesVersion(tmpDir);
		assert.ok(typeof result === 'string', 'should return an error string when engines is missing');
		assert.ok(result.includes('<missing>'), 'error should indicate version is missing');
	});

	test('returns error when version lacks caret prefix', () => {
		writeRootPackageJson('2.0.0');
		writeCopilotPackageJson('2.0.0'); // missing caret
		const result = checkCopilotEnginesVersion(tmpDir);
		assert.ok(typeof result === 'string', 'should return error when caret prefix is missing');
		assert.ok(result.includes('^2.0.0'), 'error should mention expected ^-prefixed version');
	});

	test('returns undefined for a different matching version', () => {
		writeRootPackageJson('1.100.0');
		writeCopilotPackageJson('^1.100.0');
		const result = checkCopilotEnginesVersion(tmpDir);
		assert.strictEqual(result, undefined, 'should return undefined for matching versions');
	});

	test('error message references the copilot package.json path', () => {
		writeRootPackageJson('1.95.0');
		writeCopilotPackageJson('^1.80.0');
		const result = checkCopilotEnginesVersion(tmpDir);
		assert.ok(typeof result === 'string');
		assert.ok(result.includes('extensions/copilot/package.json'), 'error message should reference the copilot package.json path');
	});

	test('returns error for close but non-exact patch version mismatch', () => {
		writeRootPackageJson('1.95.1');
		writeCopilotPackageJson('^1.95.0');
		const result = checkCopilotEnginesVersion(tmpDir);
		assert.ok(typeof result === 'string', 'should return error for non-exact version match');
	});

	test('returns error when copilot uses a >= range specifier instead of ^', () => {
		writeRootPackageJson('1.95.0');
		writeCopilotPackageJson('>=1.95.0');
		const result = checkCopilotEnginesVersion(tmpDir);
		assert.ok(typeof result === 'string', 'should return error when range specifier is wrong');
	});

	test('error message includes the root package.json version', () => {
		writeRootPackageJson('3.5.2');
		writeCopilotPackageJson('^1.0.0');
		const result = checkCopilotEnginesVersion(tmpDir);
		assert.ok(typeof result === 'string');
		assert.ok(result.includes('3.5.2'), 'error should include the root version number');
	});

	test('returns error when actual is empty string', () => {
		writeRootPackageJson('1.95.0');
		writeCopilotPackageJson('');
		const result = checkCopilotEnginesVersion(tmpDir);
		assert.ok(typeof result === 'string', 'empty string engines version should produce an error');
	});

	test('expected value is constructed as caret + version (not just version)', () => {
		writeRootPackageJson('1.85.2');
		writeCopilotPackageJson('1.85.2'); // missing caret
		const result = checkCopilotEnginesVersion(tmpDir);
		assert.ok(typeof result === 'string');
		// The expected in error message should have caret prefix
		assert.ok(result.includes('"^1.85.2"'), 'expected version in error should be ^-prefixed');
	});
});
