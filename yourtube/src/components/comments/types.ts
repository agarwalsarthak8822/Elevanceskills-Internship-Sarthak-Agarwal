export interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  city?: string;
  likes: number;
  likedBy: string[];
  dislikes: number;
  dislikedBy: string[];
  commentedon?: string;
  createdAt?: string;
}

export interface CommentTranslation {
  text: string;
  targetLanguage: string;
  detectedLanguage?: string;
}

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "hi", label: "Hindi" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
  { value: "ar", label: "Arabic" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
] as const;
