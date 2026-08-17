export const COMMENT_REGEX = /^[a-zA-Z0-9\s]+$/;

export const validateCommentText = (text: string): string | null => {
  const trimmed = text.trim();
  if (!trimmed) {
    return "Comment cannot be empty";
  }
  if (!COMMENT_REGEX.test(trimmed)) {
    return "Special characters are not allowed";
  }
  return null;
};
