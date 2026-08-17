import React, { useCallback, useEffect, useState } from "react";
import { useUser } from "@/lib/useUser";
import { fetchComments } from "@/lib/commentApi";
import CommentForm from "./CommentForm";
import CommentCard from "./CommentCard";
import { Comment } from "./types";
import { Button } from "../ui/button";

interface CommentsProps {
  videoId: string;
}

const normalizeComment = (comment: Comment): Comment => ({
  ...comment,
  likes: comment.likes ?? 0,
  dislikes: comment.dislikes ?? 0,
  likedBy: comment.likedBy ?? [],
  dislikedBy: comment.dislikedBy ?? [],
  city: comment.city ?? "Unknown",
});

const Comments = ({ videoId }: CommentsProps) => {
  const { user, openAuthDialog, loading: authLoading } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadComments = useCallback(async () => {
    if (!videoId) return;

    setLoading(true);
    try {
      const data = await fetchComments(videoId);
      setComments(data.map(normalizeComment));
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleCommentAdded = (comment: Comment) => {
    setComments((prev) => [normalizeComment(comment), ...prev]);
  };

  const handleCommentUpdate = (updatedComment: Comment) => {
    setComments((prev) =>
      prev.map((item) =>
        item._id === updatedComment._id ? updatedComment : item
      )
    );
  };

  const handleCommentDelete = (commentId: string) => {
    setComments((prev) => prev.filter((item) => item._id !== commentId));
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  return (
    <div id="comments-section" className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {authLoading ? (
        <p className="text-sm text-gray-500">Checking sign in status...</p>
      ) : user ? (
        <CommentForm
          videoId={videoId}
          user={user}
          onCommentAdded={handleCommentAdded}
        />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          <Button variant="link" className="p-0 h-auto" onClick={() => openAuthDialog("signin")}>
            Sign in
          </Button>{" "}
          to post a comment, like, or dislike.
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentCard
              key={comment._id}
              comment={comment}
              currentUserId={user?._id}
              onUpdate={handleCommentUpdate}
              onDelete={handleCommentDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
