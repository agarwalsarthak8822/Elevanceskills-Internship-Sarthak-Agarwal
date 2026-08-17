import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { validateCommentText } from "@/lib/commentValidation";
import { detectUserCity } from "@/lib/geolocation";
import { postComment } from "@/lib/commentApi";
import { Comment } from "./types";
import { toast } from "sonner";

interface CommentFormProps {
  videoId: string;
  user: {
    _id: string;
    name?: string;
    image?: string;
  };
  onCommentAdded: (comment: Comment) => void;
}

const CommentForm = ({ videoId, user, onCommentAdded }: CommentFormProps) => {
  const [newComment, setNewComment] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (value: string) => {
    setNewComment(value);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSubmit = async () => {
    const error = validateCommentText(newComment);
    if (error) {
      setValidationError(error);
      toast.error(error);
      return;
    }

    setIsSubmitting(true);
    try {
      const city = await detectUserCity();
      const res = await postComment({
        videoid: videoId,
        commentbody: newComment.trim(),
        city,
      });

      if (res.comment) {
        onCommentAdded(res.comment);
        setNewComment("");
        setValidationError(null);
        toast.success("Comment posted");
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to post comment";
      setValidationError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-4">
      <Avatar className="w-10 h-10">
        <AvatarImage src={user.image || ""} />
        <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <Textarea
          id="comment-input"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => handleChange(e.target.value)}
          className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
        />
        {validationError && (
          <p className="text-sm text-red-600">{validationError}</p>
        )}
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              setNewComment("");
              setValidationError(null);
            }}
            disabled={!newComment.trim() || isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
          >
            {isSubmitting ? "Posting..." : "Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommentForm;
