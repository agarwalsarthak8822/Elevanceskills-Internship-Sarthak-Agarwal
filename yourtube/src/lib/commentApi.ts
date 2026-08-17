import axiosInstance from "./axiosinstance";
import { Comment } from "@/components/comments/types";

export interface PostCommentPayload {
  videoid: string;
  commentbody: string;
  city: string;
}

export interface TranslateResponse {
  translatedText: string;
  detectedLanguage?: string;
}

export interface ReactionResponse {
  likes: number;
  dislikes: number;
  liked?: boolean;
  disliked?: boolean;
  deleted?: boolean;
  likedBy?: string[];
  dislikedBy?: string[];
}

export const fetchComments = async (videoId: string): Promise<Comment[]> => {
  const res = await axiosInstance.get(`/comment/${videoId}`);
  return res.data;
};

export const postComment = async (payload: PostCommentPayload) => {
  const res = await axiosInstance.post("/comment/postcomment", payload);
  return res.data;
};

export const editComment = async (id: string, commentbody: string) => {
  const res = await axiosInstance.post(`/comment/editcomment/${id}`, {
    commentbody,
  });
  return res.data;
};

export const deleteComment = async (id: string) => {
  const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
  return res.data;
};

export const translateComment = async (
  text: string,
  targetLanguage: string
): Promise<TranslateResponse> => {
  const res = await axiosInstance.post("/comment/translate", {
    text,
    targetLanguage,
  });
  return res.data;
};

export const likeComment = async (
  commentId: string
): Promise<ReactionResponse> => {
  const res = await axiosInstance.post(`/comment/like/${commentId}`);
  return res.data;
};

export const dislikeComment = async (
  commentId: string
): Promise<ReactionResponse> => {
  const res = await axiosInstance.post(`/comment/dislike/${commentId}`);
  return res.data;
};
