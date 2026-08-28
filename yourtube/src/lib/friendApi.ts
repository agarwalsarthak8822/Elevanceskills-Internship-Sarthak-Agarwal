import axiosInstance from "./axiosinstance";

export interface FriendProfile {
  _id: string;
  name?: string;
  email?: string;
  image?: string;
}

// GET /api/friends -> current user's friends
export async function getFriends(): Promise<FriendProfile[]> {
  const res = await axiosInstance.get("/api/friends");
  return (res.data?.friends as FriendProfile[]) ?? [];
}

// GET /api/friends/search?q= -> users to add (excludes self + existing friends)
export async function searchUsers(q: string): Promise<FriendProfile[]> {
  const res = await axiosInstance.get("/api/friends/search", {
    params: { q },
  });
  return (res.data?.users as FriendProfile[]) ?? [];
}

// POST /api/friends/add -> returns the updated friend list
export async function addFriend(userId: string): Promise<FriendProfile[]> {
  const res = await axiosInstance.post("/api/friends/add", { userId });
  return (res.data?.friends as FriendProfile[]) ?? [];
}

// DELETE /api/friends/:userId -> returns the updated friend list
export async function removeFriend(userId: string): Promise<FriendProfile[]> {
  const res = await axiosInstance.delete(`/api/friends/${userId}`);
  return (res.data?.friends as FriendProfile[]) ?? [];
}
