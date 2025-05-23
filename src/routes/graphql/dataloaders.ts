import DataLoader from 'dataloader';
import { PrismaClient, Profile, Post, User, MemberType, SubscribersOnAuthors } from '@prisma/client';

// Helper to map results for one-to-one relationships
const mapToIds = <KeyType extends string | number, T extends { id: KeyType }>(ids: readonly KeyType[], results: T[]): (T | null)[] => {
  const map = new Map<KeyType, T>();
  results.forEach(result => map.set(result.id, result));
  return ids.map(id => map.get(id) || null);
};

// Helper to map results for one-to-many relationships (e.g., posts by authorId)
const mapToManyToId = <KeyType extends string | number, T>(
  ids: readonly KeyType[],
  results: T[],
  getKey: (item: T) => KeyType
): (T[] | null)[] => {
  const map = new Map<KeyType, T[]>();
  ids.forEach(id => map.set(id, []));
  results.forEach(result => {
    const key = getKey(result);
    map.get(key)?.push(result);
  });
  return ids.map(id => map.get(id) || null); // Return null if no entry, or [] if you prefer empty array for no results
};


export const createLoaders = (prisma: PrismaClient) => {
  // User.profile loader
  const userProfileLoader = new DataLoader<string, Profile | null>(async (userIds) => {
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: [...userIds] } },
    });
    const profileMap = new Map<string, Profile>();
    profiles.forEach(p => profileMap.set(p.userId, p));
    return userIds.map(uid => profileMap.get(uid) || null);
  });

  // User.posts loader
  const userPostsLoader = new DataLoader<string, Post[] | null>(async (authorIds) => {
    const posts = await prisma.post.findMany({
      where: { authorId: { in: [...authorIds] } },
    });
    return mapToManyToId(authorIds, posts, post => post.authorId);
  });

  // Generic User by ID loader
  const userByIdLoader = new DataLoader<string, User | null>(async (ids) => {
    const users = await prisma.user.findMany({
      where: { id: { in: [...ids] } },
    });
    return mapToIds(ids, users);
  });

  // Profile.memberType loader
  const profileMemberTypeLoader = new DataLoader<string, MemberType | null>(async (memberTypeIds) => {
    const memberTypes = await prisma.memberType.findMany({
      where: { id: { in: [...memberTypeIds] } },
    });
    return mapToIds(memberTypeIds, memberTypes);
  });

  // User.userSubscribedTo (Subscribers of a user)
  const userSubscribedToLoader = new DataLoader<string, SubscribersOnAuthors[] | null>(async (authorIds) => {
    const subscriptions = await prisma.subscribersOnAuthors.findMany({
      where: { authorId: { in: [...authorIds] } },
    });
    return mapToManyToId(authorIds, subscriptions, sub => sub.authorId);
  });

  // User.subscribedToUser (Users a user subscribes to)
  const subscribedToUserLoader = new DataLoader<string, SubscribersOnAuthors[] | null>(async (subscriberIds) => {
    const subscriptions = await prisma.subscribersOnAuthors.findMany({
      where: { subscriberId: { in: [...subscriberIds] } },
    });
    return mapToManyToId(subscriberIds, subscriptions, sub => sub.subscriberId);
  });

  return {
    userProfileLoader,
    userPostsLoader,
    userByIdLoader, // Replaces postAuthorLoader, profileUserLoader, subscribersOnAuthorsSubscriberLoader, subscribersOnAuthorsAuthorLoader
    profileMemberTypeLoader,
    userSubscribedToLoader,
    subscribedToUserLoader,
  };
};

export type DataLoaders = ReturnType<typeof createLoaders>;
