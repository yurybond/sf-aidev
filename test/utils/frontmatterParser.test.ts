/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import { FrontmatterParser } from '../../src/utils/frontmatterParser.js';

describe('FrontmatterParser', () => {
  describe('parse', () => {
    it('parses frontmatter with single-quoted description', () => {
      const content = `---
description: 'GPT 4.1 as a top-notch coding agent.'
---

# Content here`;

      const result = FrontmatterParser.parse(content);

      expect(result.data).to.not.be.null;
      expect(result.data?.description).to.equal('GPT 4.1 as a top-notch coding agent.');
      expect(result.content).to.equal('# Content here');
    });

    it('parses frontmatter with double-quoted description', () => {
      const content = `---
description: "A powerful AI assistant for code reviews."
---

Body content`;

      const result = FrontmatterParser.parse(content);

      expect(result.data).to.not.be.null;
      expect(result.data?.description).to.equal('A powerful AI assistant for code reviews.');
      expect(result.content).to.equal('Body content');
    });

    it('parses frontmatter with unquoted description', () => {
      const content = `---
description: Simple unquoted description
---

Content`;

      const result = FrontmatterParser.parse(content);

      expect(result.data).to.not.be.null;
      expect(result.data?.description).to.equal('Simple unquoted description');
    });

    it('parses multiple fields from frontmatter', () => {
      const content = `---
description: 'Multi-field test'
author: Jane Doe
version: 1.0.0
---

Content`;

      const result = FrontmatterParser.parse(content);

      expect(result.data).to.not.be.null;
      expect(result.data?.description).to.equal('Multi-field test');
      expect(result.data?.author).to.equal('Jane Doe');
      expect(result.data?.version).to.equal('1.0.0');
    });

    it('returns null data when no frontmatter present', () => {
      const content = `# Just a markdown file

No frontmatter here.`;

      const result = FrontmatterParser.parse(content);

      expect(result.data).to.be.null;
      expect(result.content).to.equal(content);
    });

    it('handles empty frontmatter', () => {
      const content = `---

---

Content after empty frontmatter`;

      const result = FrontmatterParser.parse(content);

      expect(result.data).to.not.be.null;
      expect(result.data?.description).to.be.undefined;
      expect(result.content).to.equal('Content after empty frontmatter');
    });

    it('ignores comments in frontmatter', () => {
      const content = `---
# This is a comment
description: 'Actual description'
# Another comment
author: 'Test Author'
---

Content`;

      const result = FrontmatterParser.parse(content);

      expect(result.data).to.not.be.null;
      expect(result.data?.description).to.equal('Actual description');
      expect(result.data?.author).to.equal('Test Author');
    });

    it('handles escaped quotes in double-quoted values', () => {
      const content = `---
description: "Description with \\"escaped\\" quotes"
---

Content`;

      const result = FrontmatterParser.parse(content);

      expect(result.data).to.not.be.null;
      expect(result.data?.description).to.equal('Description with "escaped" quotes');
    });

    it('handles frontmatter without trailing newline after closing delimiter', () => {
      const content = `---
description: 'Test'
---
Content immediately after`;

      const result = FrontmatterParser.parse(content);

      expect(result.data).to.not.be.null;
      expect(result.data?.description).to.equal('Test');
      expect(result.content).to.equal('Content immediately after');
    });

    it('does not match frontmatter not at start of file', () => {
      const content = `Some content before
---
description: 'Should not match'
---

More content`;

      const result = FrontmatterParser.parse(content);

      expect(result.data).to.be.null;
      expect(result.content).to.equal(content);
    });
  });

  describe('extractDescription', () => {
    it('extracts description from frontmatter', () => {
      const content = `---
description: 'Quick extract test'
---

Content`;

      const description = FrontmatterParser.extractDescription(content);

      expect(description).to.equal('Quick extract test');
    });

    it('returns undefined when no frontmatter', () => {
      const content = '# Just content';

      const description = FrontmatterParser.extractDescription(content);

      expect(description).to.be.undefined;
    });

    it('returns undefined when frontmatter has no description', () => {
      const content = `---
author: 'Test'
version: '1.0'
---

Content`;

      const description = FrontmatterParser.extractDescription(content);

      expect(description).to.be.undefined;
    });
  });

  describe('hasFrontmatter', () => {
    it('returns true when frontmatter is present', () => {
      const content = `---
description: 'Test'
---

Content`;

      expect(FrontmatterParser.hasFrontmatter(content)).to.equal(true);
    });

    it('returns false when no frontmatter', () => {
      const content = '# Just content';

      expect(FrontmatterParser.hasFrontmatter(content)).to.equal(false);
    });

    it('returns false when dashes are not at start', () => {
      const content = `Some text
---
field: value
---`;

      expect(FrontmatterParser.hasFrontmatter(content)).to.equal(false);
    });
  });
});
