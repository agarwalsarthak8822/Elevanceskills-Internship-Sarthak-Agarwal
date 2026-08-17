import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import { validateCommentText } from "../utils/commentValidation.js";
import { translateText } from "../services/translation.js";

export const postcomment = async (req, res) => {
  const { videoid, commentbody, city } = req.body;
  const authUser = req.authUser;

  const validationError = validateCommentText(commentbody);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  if (!videoid || !mongoose.Types.ObjectId.isValid(videoid)) {
    return res.status(400).json({ message: "Valid videoid is required" });
  }

  try {
    const savedComment = await comment.create({
      videoid,
      userid: authUser._id,
      commentbody: commentbody.trim(),
      usercommented: authUser.name || authUser.email,
      city: city || "Unknown",
    });
    return res.status(201).json({ comment: savedComment });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid }).sort({ createdAt: -1 });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "comment unavailable" });
  }

  try {
    const commentDoc = await comment.findById(_id);
    if (!commentDoc) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (commentDoc.userid.toString() !== req.authUser._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "comment unavailable" });
  }

  const validationError = validateCommentText(commentbody);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const commentDoc = await comment.findById(_id);
    if (!commentDoc) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (commentDoc.userid.toString() !== req.authUser._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this comment" });
    }

    const updatedComment = await comment.findByIdAndUpdate(
      _id,
      { $set: { commentbody: commentbody.trim() } },
      { new: true }
    );
    return res.status(200).json(updatedComment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const translateComment = async (req, res) => {
  const { text, targetLanguage } = req.body;

  if (!text || !targetLanguage) {
    return res.status(400).json({
      message: "text and targetLanguage are required",
    });
  }

  try {
    const translatedText = await translateText(text, targetLanguage);

    return res.status(200).json({
      translatedText,
      detectedLanguage: "auto",
    });
  } catch (error) {
    console.error("Translation error:", error);
    return res.status(500).json({ message: "Translation failed" });
  }
};

export const likeComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.authUser._id.toString();

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    const commentDoc = await comment.findById(commentId);
    if (!commentDoc) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const alreadyLiked = commentDoc.likedBy.some((id) =>
      id.equals(userObjectId)
    );

    if (alreadyLiked) {
      commentDoc.likedBy = commentDoc.likedBy.filter(
        (id) => !id.equals(userObjectId)
      );
      commentDoc.likes = Math.max(0, commentDoc.likes - 1);
    } else {
      const hadDislike = commentDoc.dislikedBy.some((id) =>
        id.equals(userObjectId)
      );
      if (hadDislike) {
        commentDoc.dislikedBy = commentDoc.dislikedBy.filter(
          (id) => !id.equals(userObjectId)
        );
        commentDoc.dislikes = Math.max(0, commentDoc.dislikes - 1);
      }
      commentDoc.likedBy.push(userObjectId);
      commentDoc.likes += 1;
    }

    await commentDoc.save();

    return res.status(200).json({
      likes: commentDoc.likes,
      dislikes: commentDoc.dislikes,
      liked: !alreadyLiked,
      likedBy: commentDoc.likedBy,
      dislikedBy: commentDoc.dislikedBy,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikeComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.authUser._id.toString();

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    const commentDoc = await comment.findById(commentId);
    if (!commentDoc) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const alreadyDisliked = commentDoc.dislikedBy.some((id) =>
      id.equals(userObjectId)
    );

    if (alreadyDisliked) {
      commentDoc.dislikedBy = commentDoc.dislikedBy.filter(
        (id) => !id.equals(userObjectId)
      );
      commentDoc.dislikes = Math.max(0, commentDoc.dislikes - 1);
    } else {
      const hadLike = commentDoc.likedBy.some((id) => id.equals(userObjectId));
      if (hadLike) {
        commentDoc.likedBy = commentDoc.likedBy.filter(
          (id) => !id.equals(userObjectId)
        );
        commentDoc.likes = Math.max(0, commentDoc.likes - 1);
      }
      commentDoc.dislikedBy.push(userObjectId);
      commentDoc.dislikes += 1;
    }

    await commentDoc.save();

    if (commentDoc.dislikes >= 2) {
      await comment.findByIdAndDelete(commentId);
      return res.status(200).json({
        deleted: true,
        likes: commentDoc.likes,
        dislikes: commentDoc.dislikes,
        disliked: !alreadyDisliked,
      });
    }

    return res.status(200).json({
      deleted: false,
      likes: commentDoc.likes,
      dislikes: commentDoc.dislikes,
      disliked: !alreadyDisliked,
      likedBy: commentDoc.likedBy,
      dislikedBy: commentDoc.dislikedBy,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
