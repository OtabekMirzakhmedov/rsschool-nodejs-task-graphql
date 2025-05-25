import { GraphQLObjectType, GraphQLList, GraphQLNonNull } from 'graphql';
import { MemberType, MemberTypeEnum, User, Post, Profile } from './graphql-types.js';
import { UUIDType } from './types/uuid.js';
import { PrismaClient, User as PrismaUser } from '@prisma/client';
import { DataLoaders } from './dataloader.js';
import { parseResolveInfo } from 'graphql-parse-resolve-info';
import type { GraphQLResolveInfo } from 'graphql';

type Context = {
    prisma: PrismaClient;
    dataLoaders: DataLoaders;
};

function hasField(parsedInfo: unknown, typeName: string, fieldName: string): boolean {
    try {
        if (!parsedInfo || typeof parsedInfo !== 'object') return false;

        const info = parsedInfo as { fieldsByTypeName?: Record<string, Record<string, unknown>> };
        const typeFields = info.fieldsByTypeName?.[typeName];

        return !!(typeFields && fieldName in typeFields);
    } catch {
        return false;
    }
}

export const createRootQuery = () => {
    return new GraphQLObjectType({
        name: 'RootQueryType',
        fields: {
            memberTypes: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MemberType))),
                resolve: (_: unknown, __: unknown, { prisma }: Context) => {
                    return prisma.memberType.findMany();
                },
            },
            memberType: {
                type: MemberType,
                args: { id: { type: new GraphQLNonNull(MemberTypeEnum) } },
                resolve: (_: unknown, { id }: { id: string }, { prisma }: Context) => {
                    return prisma.memberType.findUnique({ where: { id } });
                },
            },

            users: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
                resolve: async (_: unknown, __: unknown, { prisma, dataLoaders }: Context, info: GraphQLResolveInfo) => {
                    const parsedInfo = parseResolveInfo(info);

                    const needsUserSubscribedTo = hasField(parsedInfo, 'User', 'userSubscribedTo');
                    const needsSubscribedToUser = hasField(parsedInfo, 'User', 'subscribedToUser');

                    type UserInclude = {
                        userSubscribedTo?: {
                            include: {
                                author: true;
                            };
                        };
                        subscribedToUser?: {
                            include: {
                                subscriber: true;
                            };
                        };
                    };

                    const include: UserInclude = {};

                    if (needsUserSubscribedTo) {
                        include.userSubscribedTo = {
                            include: { author: true }
                        };
                    }

                    if (needsSubscribedToUser) {
                        include.subscribedToUser = {
                            include: { subscriber: true }
                        };
                    }

                    const users = await prisma.user.findMany({
                        include: Object.keys(include).length > 0 ? include : undefined
                    });

                    type UserWithRelations = PrismaUser & {
                        userSubscribedTo?: Array<{
                            subscriberId: string;
                            authorId: string;
                            author: PrismaUser;
                        }>;
                        subscribedToUser?: Array<{
                            subscriberId: string;
                            authorId: string;
                            subscriber: PrismaUser;
                        }>;
                    };

                    for (const user of users) {
                        const typedUser = user as UserWithRelations;

                        if (needsUserSubscribedTo && typedUser.userSubscribedTo) {
                            const authors = typedUser.userSubscribedTo.map(sub => sub.author);
                            dataLoaders.userSubscribedToLoader.prime(user.id, authors);
                        }

                        if (needsSubscribedToUser && typedUser.subscribedToUser) {
                            const subscribers = typedUser.subscribedToUser.map(sub => sub.subscriber);
                            dataLoaders.subscribedToUserLoader.prime(user.id, subscribers);
                        }
                    }

                    return users;
                },
            },

            user: {
                type: User,
                args: { id: { type: new GraphQLNonNull(UUIDType) } },
                resolve: (_: unknown, { id }: { id: string }, { prisma }: Context) => {
                    return prisma.user.findUnique({ where: { id } }) as Promise<PrismaUser | null>;
                },
            },

            posts: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
                resolve: (_: unknown, __: unknown, { prisma }: Context) => {
                    return prisma.post.findMany();
                },
            },

            post: {
                type: Post,
                args: { id: { type: new GraphQLNonNull(UUIDType) } },
                resolve: (_: unknown, { id }: { id: string }, { prisma }: Context) => {
                    return prisma.post.findUnique({ where: { id } }) as Promise<PrismaUser | null>;
                },
            },

            profiles: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Profile))),
                resolve: (_: unknown, __: unknown, { prisma }: Context) => {
                    return prisma.profile.findMany();
                },
            },

            profile: {
                type: Profile,
                args: { id: { type: new GraphQLNonNull(UUIDType) } },
                resolve: (_: unknown, { id }: { id: string }, { prisma }: Context) => {
                    return prisma.profile.findUnique({ where: { id } }) as Promise<PrismaUser | null>;
                },
            },
        },
    });
};