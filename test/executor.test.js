import { describe, it, expect } from 'vitest';

// Replicate stripToolTags from executor.js for testing
// (it's internal, not exported — same regex as the source)
const TOOL_NAMES = 'read-file|write-file|update-file|list-path|run-command';

function stripToolTags(text) {
  return text
    .replace(new RegExp(`<(${TOOL_NAMES})(\\s[^>]*)?>[\\s\\S]*?<\\/\\1>`, 'gi'), '')
    .replace(new RegExp(`<(${TOOL_NAMES})(\\s[^>]*)?\\/>`, 'gi'), '')
    .trim();
}

describe('ExecutorAgent - stripToolTags', () => {
  it('should remove a read-file tag with body', () => {
    const input = '<read-file path="test.js">content</read-file>';
    const result = stripToolTags(input);
    expect(result).toBe('');
  });

  it('should remove a self-closing read-file tag', () => {
    const input = 'Before <read-file path="test.js"/> After';
    const result = stripToolTags(input);
    expect(result).toBe('Before  After');
  });

  it('should remove a write-file tag with multiline content', () => {
    const input = `<write-file path="app.js">
const x = 1;
console.log(x);
</write-file>`;
    const result = stripToolTags(input);
    expect(result).toBe('');
  });

  it('should preserve text outside tool tags', () => {
    const input = 'Here is my analysis.\n<read-file path="src/app.js"/>\nThis is the result.';
    const result = stripToolTags(input);
    expect(result).toBe('Here is my analysis.\n\nThis is the result.');
  });

  it('should remove update-file tag', () => {
    const input = '<update-file path="main.py" line="5">fixed line</update-file>';
    const result = stripToolTags(input);
    expect(result).toBe('');
  });

  it('should remove list-path tag', () => {
    const input = '<list-path path="src/"/>';
    const result = stripToolTags(input);
    expect(result).toBe('');
  });

  it('should remove run-command tag', () => {
    const input = '<run-command>npm test</run-command>';
    const result = stripToolTags(input);
    expect(result).toBe('');
  });

  it('should remove run-command with attributes', () => {
    const input = '<run-command bg="true" job-id="install">npm install</run-command>';
    const result = stripToolTags(input);
    expect(result).toBe('');
  });

  it('should remove multiple different tool tags', () => {
    const input = `<read-file path="a.js"/>
Some text here.
<write-file path="b.js">new content</write-file>
More text.
<list-path path="src/"/>`;
    const result = stripToolTags(input);
    expect(result).toBe('Some text here.\n\nMore text.');
  });

  it('should handle text with no tool tags', () => {
    const input = 'This is just a plain text answer.';
    const result = stripToolTags(input);
    expect(result).toBe('This is just a plain text answer.');
  });

  it('should handle empty string', () => {
    const result = stripToolTags('');
    expect(result).toBe('');
  });

  it('should not be confused by similar-looking non-tool text', () => {
    const input = 'You can use <div class="foo">content</div> in HTML.';
    const result = stripToolTags(input);
    expect(result).toContain('<div');
  });

  it('should remove the tool tag even with extra whitespace in attributes', () => {
    const input = '<read-file  path="test.txt" />';
    const result = stripToolTags(input);
    expect(result).toBe('');
  });

  it('should handle self-closing write-file tag', () => {
    const input = 'Before<write-file path="empty.txt"/>After';
    const result = stripToolTags(input);
    expect(result).toBe('BeforeAfter');
  });
});
