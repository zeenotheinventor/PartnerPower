import { privacyPolicy } from './privacyPolicy';

const allText = [
  privacyPolicy.title,
  privacyPolicy.updated,
  ...privacyPolicy.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
];

describe('privacyPolicy', () => {
  it('should have a title and a date', () => {
    expect(privacyPolicy.title.trim()).not.toBe('');
    expect(privacyPolicy.updated.trim()).not.toBe('');
  });

  it('should have sections, each with a heading and non-empty paragraphs', () => {
    expect(privacyPolicy.sections.length).toBeGreaterThan(0);
    privacyPolicy.sections.forEach((section) => {
      expect(section.heading.trim()).not.toBe('');
      expect(section.paragraphs.length).toBeGreaterThan(0);
      section.paragraphs.forEach((paragraph) => expect(paragraph.trim()).not.toBe(''));
    });
  });

  it('should give a contact email and show it in the text', () => {
    expect(privacyPolicy.contactEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(allText.some((text) => text.includes(privacyPolicy.contactEmail))).toBe(true);
  });

  // Launch gate for FRK-73. Skipped while the address is the example.com placeholder. Unskip it
  // when the owner's real address goes in, and it then guards against the placeholder coming back.
  it.skip('launch gate: should use the real contact email, not the example.com placeholder', () => {
    expect(privacyPolicy.contactEmail).not.toMatch(/@example\.com$/);
  });

  describe('the update check', () => {
    const updateSection = privacyPolicy.sections.find((section) =>
      section.heading.toLowerCase().includes('update'),
    );
    const updateText = (updateSection?.paragraphs ?? []).join(' ');

    it('should have a section that says the app checks with Expo for updates when it opens', () => {
      expect(updateText).toMatch(/when the app opens/i);
      expect(updateText).toContain('Expo');
    });

    it('should name Expo and the update check, and point to its own privacy policy', () => {
      expect(updateSection?.heading).toBe('Checking for updates');
      expect(updateText).toContain('Expo');
      expect(updateText).toMatch(/check/);
      expect(updateText).toContain("Expo's own privacy policy covers what it receives.");
    });

    it('should say what the check sends, including the crash report and the IP address', () => {
      expect(updateText).toMatch(/crash report/i);
      expect(updateText).toMatch(/IP address/);
    });

    it('should say it never sends what you type or play', () => {
      expect(updateText).toMatch(/never sends anything you type or play/);
    });

    it('should not claim that nothing is sent, or that nothing is collected from anyone', () => {
      allText.forEach((text) => {
        expect(text).not.toMatch(/does not send anything|collects nothing/i);
      });
    });
  });

  it('should follow the house style, with no dashes as punctuation and no semicolons', () => {
    allText.forEach((text) => {
      expect(text).not.toMatch(/[–—;]|\s-\s/);
    });
  });
});
