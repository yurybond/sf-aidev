/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { SfError } from '@salesforce/core';
import { GitHubFetcher } from '../../src/sources/gitHubFetcher.js';

describe('GitHubFetcher', () => {
  describe('buildUrl', () => {
    it('builds correct URL with default branch', () => {
      const url = GitHubFetcher.buildUrl('owner/repo', 'path/to/file.md');
      expect(url).to.equal('https://raw.githubusercontent.com/owner/repo/main/path/to/file.md');
    });

    it('builds correct URL with custom branch', () => {
      const url = GitHubFetcher.buildUrl('owner/repo', 'file.json', 'develop');
      expect(url).to.equal('https://raw.githubusercontent.com/owner/repo/develop/file.json');
    });
  });

  // Note: Integration tests for fetchManifest and fetchFile would require
  // mocking the HTTP client (got) or using a real test repository.
  // These tests are focused on unit testing the URL building logic.
  // Full integration tests should be in NUT files.

  describe('fetchManifest', () => {
    it('throws ManifestNotFound for non-existent repo', async () => {
      try {
        await GitHubFetcher.fetchManifest('nonexistent-owner-12345/nonexistent-repo-67890');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('ManifestNotFound');
      }
    });
  });

  describe('fetchFile', () => {
    it('throws FileNotFound for non-existent file', async () => {
      try {
        await GitHubFetcher.fetchFile('nonexistent-owner-12345/nonexistent-repo-67890', 'nonexistent.md');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('FileNotFound');
      }
    });
  });
});
