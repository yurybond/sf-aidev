/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { InteractiveTable } from '../../src/ui/interactiveTable.js';
import type { GroupedArtifacts, MergedArtifact } from '../../src/services/localFileScanner.js';

describe('InteractiveTable', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('formatRow', () => {
    it('should format installed artifact with checked checkbox', () => {
      const artifact: MergedArtifact = { name: 'my-skill', type: 'skill', installed: true };

      const result = InteractiveTable.formatRow(artifact);

      expect(result).to.equal('  \u2611 my-skill'); // ☑
    });

    it('should format available artifact with unchecked checkbox', () => {
      const artifact: MergedArtifact = { name: 'my-skill', type: 'skill', installed: false };

      const result = InteractiveTable.formatRow(artifact);

      expect(result).to.equal('  \u2610 my-skill'); // ☐
    });
  });

  describe('formatHeader', () => {
    it('should return header as-is', () => {
      const result = InteractiveTable.formatHeader('Agents');

      expect(result).to.equal('Agents');
    });
  });

  describe('toDisplayRows', () => {
    it('should create display rows for all groups', () => {
      const groups: GroupedArtifacts = {
        agents: [{ name: 'agent1', type: 'agent', installed: true }],
        skills: [{ name: 'skill1', type: 'skill', installed: false }],
        prompts: [],
        instructions: [],
      };

      const result = InteractiveTable.toDisplayRows(groups);

      // Should have: Agents header, agent row, blank, Skills header, skill row
      expect(result.length).to.be.greaterThan(0);
      expect(result[0].text).to.equal('Agents');
      expect(result[0].isHeader).to.be.true;
      expect(result[1].text).to.include('agent1');
      expect(result[1].isHeader).to.be.false;
    });

    it('should skip empty groups', () => {
      const groups: GroupedArtifacts = {
        agents: [],
        skills: [{ name: 'skill1', type: 'skill', installed: true }],
        prompts: [],
        instructions: [],
      };

      const result = InteractiveTable.toDisplayRows(groups);

      // Should only have Skills section
      expect(result[0].text).to.equal('Skills');
      expect(result.some((r) => r.text === 'Agents')).to.be.false;
    });

    it('should return empty array for empty groups', () => {
      const groups: GroupedArtifacts = {
        agents: [],
        skills: [],
        prompts: [],
        instructions: [],
      };

      const result = InteractiveTable.toDisplayRows(groups);

      expect(result).to.deep.equal([]);
    });

    it('should include instructions section', () => {
      const groups: GroupedArtifacts = {
        agents: [],
        skills: [],
        prompts: [],
        instructions: [{ name: 'CLAUDE.md', type: 'instruction', installed: true }],
      };

      const result = InteractiveTable.toDisplayRows(groups);

      expect(result[0].text).to.equal('Instructions');
      expect(result[1].text).to.include('CLAUDE.md');
    });
  });

  describe('renderPlainText', () => {
    it('should call log for each row', () => {
      const groups: GroupedArtifacts = {
        agents: [{ name: 'agent1', type: 'agent', installed: true }],
        skills: [],
        prompts: [],
        instructions: [],
      };
      const logSpy = sandbox.spy();

      InteractiveTable.renderPlainText(groups, logSpy);

      expect(logSpy.called).to.be.true;
      expect(logSpy.firstCall.args[0]).to.equal('Agents');
    });

    it('should show empty message when no artifacts', () => {
      const groups: GroupedArtifacts = {
        agents: [],
        skills: [],
        prompts: [],
        instructions: [],
      };
      const logSpy = sandbox.spy();

      InteractiveTable.renderPlainText(groups, logSpy);

      expect(logSpy.calledWith('No artifacts found.')).to.be.true;
    });
  });

  describe('renderSection', () => {
    it('should render section with title and rows', () => {
      const artifacts: MergedArtifact[] = [
        { name: 'skill1', type: 'skill', installed: true },
        { name: 'skill2', type: 'skill', installed: false },
      ];
      const logSpy = sandbox.spy();

      InteractiveTable.renderSection(artifacts, 'Skills', logSpy);

      expect(logSpy.firstCall.args[0]).to.equal('Skills');
      expect(logSpy.secondCall.args[0]).to.include('skill1');
      expect(logSpy.thirdCall.args[0]).to.include('skill2');
    });

    it('should show empty message when no artifacts', () => {
      const logSpy = sandbox.spy();

      InteractiveTable.renderSection([], 'Skills', logSpy);

      expect(logSpy.calledWith('No skills found.')).to.be.true;
    });
  });

  describe('getTotalCount', () => {
    it('should return total count of all artifacts', () => {
      const groups: GroupedArtifacts = {
        agents: [{ name: 'a', type: 'agent', installed: true }],
        skills: [
          { name: 'b', type: 'skill', installed: true },
          { name: 'c', type: 'skill', installed: false },
        ],
        prompts: [{ name: 'd', type: 'prompt', installed: true }],
        instructions: [{ name: 'e', type: 'instruction', installed: true }],
      };

      const result = InteractiveTable.getTotalCount(groups);

      expect(result).to.equal(5);
    });
  });

  describe('getCounts', () => {
    it('should return installed and available counts', () => {
      const groups: GroupedArtifacts = {
        agents: [{ name: 'a', type: 'agent', installed: true }],
        skills: [
          { name: 'b', type: 'skill', installed: true },
          { name: 'c', type: 'skill', installed: false },
        ],
        prompts: [{ name: 'd', type: 'prompt', installed: false }],
        instructions: [],
      };

      const result = InteractiveTable.getCounts(groups);

      expect(result.installed).to.equal(2);
      expect(result.available).to.equal(2);
    });
  });

  describe('isInteractiveSupported', () => {
    it('should check if stdout is TTY', () => {
      // This will depend on the test environment
      const result = InteractiveTable.isInteractiveSupported();
      expect(typeof result).to.equal('boolean');
    });
  });
});
