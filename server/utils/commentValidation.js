const COMMENT_REGEX = /^[a-zA-Z0-9\s]+$/;

export const isValidCommentText = (text) => COMMENT_REGEX.test(text);

export const validateCommentText = (text) => {
  if (!text || !text.trim()) {
    return "Comment cannot be empty";
  }
  if (!isValidCommentText(text.trim())) {
    return "Special characters are not allowed";
  }
  return null;
};
