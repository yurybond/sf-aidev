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

    it('handles paths without leading slash', () => {
      const url = GitHubFetcher.buildUrl('owner/repo', 'manifest.json');
      expect(url).to.include('owner/repo/main/manifest.json');
    });
  });

  // Note: These tests make actual HTTP calls to non-existent repos
  // to trigger the error handling branches in the fetcher.
  // Integration tests with real repos should be in NUT files.

  describe('fetchManifest', () => {
    it('throws ManifestNotFound for non-existent repo', async () => {
      try {
        await GitHubFetcher.fetchManifest('nonexistent-owner-12345/nonexistent-repo-67890');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('ManifestNotFound');
        expect((error as SfError).message).to.include('Manifest not found');
      }
    });

    it('throws ManifestNotFound with custom branch info', async () => {
      try {
        await GitHubFetcher.fetchManifest('nonexistent-owner-12345/nonexistent-repo-67890', 'custom-branch');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('ManifestNotFound');
        expect((error as SfError).message).to.include('custom-branch');
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
        expect((error as SfError).message).to.include('File not found');
      }
    });

    it('throws FileNotFound with file path info', async () => {
      try {
        await GitHubFetcher.fetchFile('nonexistent-owner-12345/nonexistent-repo-67890', 'path/to/file.md');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('FileNotFound');
        expect((error as SfError).message).to.include('path/to/file.md');
      }
    });

    it('uses default branch when not specified', async () => {
      try {
        await GitHubFetcher.fetchFile('nonexistent-owner-12345/nonexistent-repo-67890', 'test.md');
        expect.fail('Should have thrown an error');
      } catch (error) {
        // The error will be FileNotFound since the repo doesn't exist
        // but this exercises the default branch code path
        expect(error).to.be.instanceOf(SfError);
      }
    });

    it('uses custom branch when specified', async () => {
      try {
        await GitHubFetcher.fetchFile('nonexistent-owner-12345/nonexistent-repo-67890', 'test.md', 'develop');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
      }
    });
  });

  describe('error handling edge cases', () => {
    it('handles repo names with special characters', async () => {
      try {
        await GitHubFetcher.fetchManifest('owner-name/repo.name-123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Should still throw ManifestNotFound (404) not a parse error
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('ManifestNotFound');
      }
    });

    it('handles deeply nested file paths', async () => {
      try {
        await GitHubFetcher.fetchFile('nonexistent-owner-12345/nonexistent-repo-67890', 'deep/nested/path/to/file.md');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).message).to.include('deep/nested/path/to/file.md');
      }
    });
  });

  describe('fetchRepoTree', () => {
    it('throws RepoNotFound for non-existent repo', async () => {
      try {
        await GitHubFetcher.fetchRepoTree('nonexistent-owner-12345/nonexistent-repo-67890');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('RepoNotFound');
        expect((error as SfError).message).to.include('not found');
      }
    });

    it('throws RepoNotFound with custom branch info', async () => {
      try {
        await GitHubFetcher.fetchRepoTree('nonexistent-owner-12345/nonexistent-repo-67890', 'custom-branch');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('RepoNotFound');
        expect((error as SfError).message).to.include('custom-branch');
      }
    });

    it('uses default branch when not specified', async () => {
      try {
        await GitHubFetcher.fetchRepoTree('nonexistent-owner-12345/nonexistent-repo-67890');
        expect.fail('Should have thrown an error');
      } catch (error) {
        // The error will be RepoNotFound since the repo doesn't exist
        // but this exercises the default branch code path
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('RepoNotFound');
      }
    });
  });
});
