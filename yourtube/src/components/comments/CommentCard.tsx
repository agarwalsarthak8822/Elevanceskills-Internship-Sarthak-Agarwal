import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Languages, ThumbsDown, ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { validateCommentText } from "@/lib/commentValidation";
import {
  deleteComment,
  dislikeComment,
  editComment,
  likeComment,
  translateComment,
} from "@/lib/commentApi";
import { Comment, CommentTranslation, LANGUAGE_OPTIONS } from "./types";
import { toast } from "sonner";

interface CommentCardProps {
  comment: Comment;
  currentUserId?: string;
  onUpdate: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
}

const normalizeIds = (ids: (string | { toString(): string })[] = []) =>
  ids.map((id) => (typeof id === "string" ? id : id.toString()));

const CommentCard = ({
  comment,
  currentUserId,
  onUpdate,
  onDelete,
}: CommentCardProps) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.commentbody);
  const [editError, setEditError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [translation, setTranslation] = useState<CommentTranslation | null>(
    null
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [isReacting, setIsReacting] = useState(false);

  const likedBy = normalizeIds(comment.likedBy);
  const dislikedBy = normalizeIds(comment.dislikedBy);
  const isLiked = currentUserId ? likedBy.includes(currentUserId) : false;
  const isDisliked = currentUserId
    ? dislikedBy.includes(currentUserId)
    : false;

  const commentedDate = comment.commentedon || comment.createdAt;
  const cityLabel = comment.city && comment.city !== "Unknown" ? comment.city : null;

  const handleTranslate = async () => {
    if (translation) {
      setTranslation(null);
      return;
    }

    setIsTranslating(true);
    try {
      const res = await translateComment(comment.commentbody, targetLanguage);
      setTranslation({
        text: res.translatedText,
        targetLanguage,
        detectedLanguage: res.detectedLanguage,
      });
    } catch {
      toast.error("Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleLike = async () => {
    if (!currentUserId || isReacting) return;

    setIsReacting(true);
    try {
      const res = await likeComment(comment._id);
      onUpdate({
        ...comment,
        likes: res.likes,
        dislikes: res.dislikes,
        likedBy: normalizeIds(res.likedBy || []),
        dislikedBy: normalizeIds(res.dislikedBy || []),
      });
    } catch {
      toast.error("Failed to update like");
    } finally {
      setIsReacting(false);
    }
  };

  const handleDislike = async () => {
    if (!currentUserId || isReacting) return;

    setIsReacting(true);
    try {
      const res = await dislikeComment(comment._id);

      if (res.deleted) {
        onDelete(comment._id);
        toast.info("Comment removed due to dislikes");
        return;
      }

      onUpdate({
        ...comment,
        likes: res.likes,
        dislikes: res.dislikes,
        likedBy: normalizeIds(res.likedBy || []),
        dislikedBy: normalizeIds(res.dislikedBy || []),
      });
    } catch {
      toast.error("Failed to update dislike");
    } finally {
      setIsReacting(false);
    }
  };

  const handleSaveEdit = async () => {
    const error = validateCommentText(editText);
    if (error) {
      setEditError(error);
      toast.error(error);
      return;
    }

    try {
      const updated = await editComment(comment._id, editText.trim());
      onUpdate({
        ...comment,
        commentbody: updated.commentbody || editText.trim(),
      });
      setEditing(false);
      setEditError(null);
      setTranslation(null);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to update comment";
      setEditError(message);
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteComment(comment._id);
      onDelete(comment._id);
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  return (
    <div className="flex gap-4">
        <Avatar className="w-10 h-10">
          <AvatarFallback>{comment.usercommented[0]}</AvatarFallback>
        </Avatar>

      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-medium text-sm">{comment.usercommented}</span>
          {cityLabel && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-600">{cityLabel}</span>
            </>
          )}
          {commentedDate && (
            <span className="text-xs text-gray-600">
              {formatDistanceToNow(new Date(commentedDate))} ago
            </span>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value);
                if (editError) setEditError(null);
              }}
            />
            {editError && <p className="text-sm text-red-600">{editError}</p>}
            <div className="flex gap-2 justify-end">
              <Button onClick={handleSaveEdit} disabled={!editText.trim()}>
                Save
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEditText(comment.commentbody);
                  setEditError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{comment.commentbody}</p>

            {translation && (
              <div className="mt-2 rounded-md bg-blue-50 border border-blue-100 p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">
                  Translated (
                  {LANGUAGE_OPTIONS.find(
                    (lang) => lang.value === translation.targetLanguage
                  )?.label || translation.targetLanguage}
                  )
                </p>
                <p className="text-sm text-gray-800">{translation.text}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={handleLike}
                disabled={!currentUserId || isReacting}
              >
                <ThumbsUp
                  className={`w-4 h-4 mr-1 ${
                    isLiked ? "fill-black text-black" : ""
                  }`}
                />
                {comment.likes || 0}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={handleDislike}
                disabled={!currentUserId || isReacting}
              >
                <ThumbsDown
                  className={`w-4 h-4 mr-1 ${
                    isDisliked ? "fill-black text-black" : ""
                  }`}
                />
                {comment.dislikes || 0}
              </Button>

              <div className="flex items-center gap-2">
                <select
                  value={targetLanguage}
                  onChange={(e) => {
                    setTargetLanguage(e.target.value);
                    setTranslation(null);
                  }}
                  className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                >
                  <Languages className="w-4 h-4 mr-1" />
                  {isTranslating
                    ? "Translating..."
                    : translation
                    ? "Hide translation"
                    : "Translate"}
                </Button>
              </div>

              {String(comment.userid) === currentUserId && (
                <div className="flex gap-2 text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true);
                      setEditText(comment.commentbody);
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" onClick={handleDelete}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CommentCard;
