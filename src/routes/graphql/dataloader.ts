import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';

export const createDataLoaders = (prisma: PrismaClient) => {
    const postLoader = new DataLoader(async (authorIds: readonly string[]) => {
        const posts = await prisma.post.findMany({
            where: { authorId: { in: [...authorIds] } }
        });

        const postsByAuthorId = authorIds.map(authorId =>
            posts.filter(post => post.authorId === authorId)
        );

        return postsByAuthorId;
    });

    const profileLoader = new DataLoader(async (userIds: readonly string[]) => {
        const profiles = await prisma.profile.findMany({
            where: { userId: { in: [...userIds] } }
        });

        const profilesByUserId = userIds.map(userId =>
            profiles.find(profile => profile.userId === userId) || null
        );

        return profilesByUserId;
    });

    const memberTypeLoader = new DataLoader(async (memberTypeIds: readonly string[]) => {
        const memberTypes = await prisma.memberType.findMany({
            where: { id: { in: [...memberTypeIds] } }
        });

        const memberTypesByIds = memberTypeIds.map(id =>
            memberTypes.find(mt => mt.id === id) || null
        );

        return memberTypesByIds;
    });

    const userSubscribedToLoader = new DataLoader(async (userIds: readonly string[]) => {
        const subscriptions = await prisma.subscribersOnAuthors.findMany({
            where: { subscriberId: { in: [...userIds] } },
            include: { author: true }
        });

        const subscriptionsByUserId = userIds.map(userId =>
            subscriptions
                .filter(sub => sub.subscriberId === userId)
                .map(sub => sub.author)
        );

        return subscriptionsByUserId;
    });

    const subscribedToUserLoader = new DataLoader(async (userIds: readonly string[]) => {
        const subscriptions = await prisma.subscribersOnAuthors.findMany({
            where: { authorId: { in: [...userIds] } },
            include: { subscriber: true }
        });

        const subscriptionsByUserId = userIds.map(userId =>
            subscriptions
                .filter(sub => sub.authorId === userId)
                .map(sub => sub.subscriber)
        );

        return subscriptionsByUserId;
    });

    return {
        postLoader,
        profileLoader,
        memberTypeLoader,
        userSubscribedToLoader,
        subscribedToUserLoader,
    };
};

export type DataLoaders = ReturnType<typeof createDataLoaders>;