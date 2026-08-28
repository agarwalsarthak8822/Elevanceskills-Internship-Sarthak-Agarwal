// Keep this rule byte-for-byte equivalent to the frontend
// (yourtube/src/lib/commentValidation.ts). A comment may be written in ANY
// language, so we allow all Unicode letters (\p{L}), numbers (\p{N}) and
// combining marks (\p{M}), plus whitespace and ordinary sentence punctuation
// (Latin + CJK). Everything else — "special characters" like
// @ # $ % ^ & * _ = + < > { } [ ] | \ / ~ ` — is blocked.
const COMMENT_ALLOWED_REGEX =
  /^[\p{L}\p{N}\p{M}\s.,!?'"()\-:;–—…，。！？；：、（）「」『』‘’“”]+$/u;

export const isValidCommentText = (text) => COMMENT_ALLOWED_REGEX.test(text);

export const validateCommentText = (text) => {
  if (!text || !text.trim()) {
    return "Comment cannot be empty";
  }
  if (!isValidCommentText(text.trim())) {
    return "Special characters like @ # $ % ^ & * are not allowed";
  }
  return null;
};
