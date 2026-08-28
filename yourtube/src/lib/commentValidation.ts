// A comment may be written in ANY language, so we allow all Unicode letters
// (\p{L}), numbers (\p{N}), and combining marks (\p{M}, needed for Devanagari,
// Tamil, Arabic, etc.), plus whitespace and ordinary sentence punctuation
// (Latin + CJK). Everything else — "special characters" like
// @ # $ % ^ & * _ = + < > { } [ ] | \ / ~ ` — is blocked.
export const COMMENT_ALLOWED_REGEX =
  /^[\p{L}\p{N}\p{M}\s.,!?'"()\-:;–—…，。！？；：、（）「」『』‘’“”]+$/u;

export const validateCommentText = (text: string): string | null => {
  const trimmed = text.trim();
  if (!trimmed) {
    return "Comment cannot be empty";
  }
  if (!COMMENT_ALLOWED_REGEX.test(trimmed)) {
    return "Special characters like @ # $ % ^ & * are not allowed";
  }
  return null;
};
