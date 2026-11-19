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

  describe('crash reports', () => {
    const crashSection = privacyPolicy.sections.find(
      (section) => section.heading === 'Crash reports',
    );
    const crashText = (crashSection?.paragraphs ?? []).join(' ');

    it('should name Sentry and point to its own privacy policy', () => {
      expect(crashText).toContain('Sentry');
      expect(crashText).toContain("Sentry's own privacy policy covers what it receives.");
    });

    it('should say what a report holds', () => {
      expect(crashText).toMatch(/what kind of error/);
      expect(crashText).toMatch(/names of the screens/);
      expect(crashText).toMatch(/phone model and system version/);
    });

    it('should say a report never includes what you type or play, your names or your cards', () => {
      expect(crashText).toMatch(
        /never includes anything you type or play, your player names, your cards or your answers/,
      );
    });

    it('should mention the IP address, the random number on Android and where reports are kept', () => {
      expect(crashText).toMatch(/IP address/);
      expect(crashText).toMatch(/random number/);
      expect(crashText).toMatch(/European Union/);
    });

    it('should not say the app has no crash reporting service', () => {
      allText.forEach((text) => {
        expect(text).not.toMatch(/no crash reporting/i);
      });
    });

    it('should say that crash reports leave the phone, in the section about what leaves it', () => {
      const leavesSection = privacyPolicy.sections.find(
        (section) => section.heading === 'What leaves your phone',
      );

      expect((leavesSection?.paragraphs ?? []).join(' ')).toMatch(/crash reports/);
    });
  });

  it('should follow the house style, with no dashes as punctuation and no semicolons', () => {
    allText.forEach((text) => {
      expect(text).not.toMatch(/[–—;]|\s-\s/);
    });
  });
});
