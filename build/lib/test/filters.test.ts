/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { suite, test } from 'node:test';
import { eslintFilter } from '../../filters.ts';

suite('eslintFilter', () => {

	test('includes combined JS glob pattern for js, cjs, and mjs extensions', () => {
		// PR change: separate patterns replaced with brace-expansion pattern
		assert.ok(eslintFilter.includes('**/*.{js,cjs,mjs}'), 'should include combined JS glob pattern');
	});

	test('includes combined TS glob pattern for ts, tsx, mts, and cts extensions', () => {
		// PR change: separate patterns replaced with brace-expansion pattern; tsx, mts, cts added
		assert.ok(eslintFilter.includes('**/*.{ts,tsx,mts,cts}'), 'should include combined TS glob pattern');
	});

	test('does not include old separate js pattern', () => {
		assert.ok(!eslintFilter.includes('**/*.js'), 'should not have separate **/*.js pattern');
	});

	test('does not include old separate cjs pattern', () => {
		assert.ok(!eslintFilter.includes('**/*.cjs'), 'should not have separate **/*.cjs pattern');
	});

	test('does not include old separate mjs pattern', () => {
		assert.ok(!eslintFilter.includes('**/*.mjs'), 'should not have separate **/*.mjs pattern');
	});

	test('does not include old separate ts pattern', () => {
		assert.ok(!eslintFilter.includes('**/*.ts'), 'should not have separate **/*.ts pattern');
	});

	test('includes the eslint-plugin-local TypeScript pattern', () => {
		assert.ok(eslintFilter.includes('.eslint-plugin-local/**/*.ts'), 'should include eslint-plugin-local ts files');
	});

	test('is a frozen array', () => {
		assert.ok(Object.isFrozen(eslintFilter), 'eslintFilter should be frozen');
	});

	test('contains negation patterns derived from .eslint-ignore', () => {
		// The filter reads .eslint-ignore and converts lines to negation patterns
		// Every non-negation line from .eslint-ignore should be prefixed with '!'
		const negationPatterns = eslintFilter.filter(p => p.startsWith('!'));
		assert.ok(negationPatterns.length > 0, 'should have negation patterns from .eslint-ignore');
	});

	test('includes tsx extension support (new in this PR)', () => {
		const tsCombinedPattern = eslintFilter.find(p => p === '**/*.{ts,tsx,mts,cts}');
		assert.ok(tsCombinedPattern, 'tsx extension must be in the TS pattern');
		assert.ok(tsCombinedPattern!.includes('tsx'), 'tsx should be included in TS brace expansion');
	});

	test('includes mts extension support (new in this PR)', () => {
		const tsCombinedPattern = eslintFilter.find(p => p === '**/*.{ts,tsx,mts,cts}');
		assert.ok(tsCombinedPattern, 'mts extension must be in the TS pattern');
		assert.ok(tsCombinedPattern!.includes('mts'), 'mts should be included in TS brace expansion');
	});

	test('includes cts extension support (new in this PR)', () => {
		const tsCombinedPattern = eslintFilter.find(p => p === '**/*.{ts,tsx,mts,cts}');
		assert.ok(tsCombinedPattern, 'cts extension must be in the TS pattern');
		assert.ok(tsCombinedPattern!.includes('cts'), 'cts should be included in TS brace expansion');
	});

	test('array contains at least 3 elements (2 glob patterns + plugin pattern)', () => {
		// Must have at minimum: '**/*.{js,cjs,mjs}', '**/*.{ts,tsx,mts,cts}', '.eslint-plugin-local/**/*.ts'
		assert.ok(eslintFilter.length >= 3, 'filter must have at least 3 elements');
	});

	test('negation entries from .eslint-ignore do not start with "!!" (double negation)', () => {
		// .eslint-ignore lines that start with '!' should NOT be further negated
		const doubleNegated = eslintFilter.filter(p => p.startsWith('!!'));
		assert.strictEqual(doubleNegated.length, 0, 'should not have double-negated patterns');
	});

	test('includes copilot coverage directory as negation pattern', () => {
		// New in PR: copilot-specific patterns added to .eslint-ignore
		const hasCopilotCoverage = eslintFilter.some(p => p.includes('extensions/copilot/coverage') || p.includes('copilot/coverage'));
		assert.ok(hasCopilotCoverage, 'should exclude copilot coverage directory');
	});

	test('includes .vscode-test directory as negation pattern', () => {
		// New in PR: .vscode-test added to .eslint-ignore
		const hasVscodeTest = eslintFilter.some(p => p.includes('.vscode-test'));
		assert.ok(hasVscodeTest, 'should exclude .vscode-test directory');
	});
});