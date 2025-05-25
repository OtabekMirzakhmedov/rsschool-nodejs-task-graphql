import { GraphQLObjectType, GraphQLNonNull, GraphQLString } from 'graphql';
import { User, Post, Profile } from './graphql-types.js';
import {
    CreateUserInput,
    CreateProfileInput,
    CreatePostInput,
    ChangeUserInput,
    ChangeProfileInput,
    ChangePostInput
} from './input-types.js';
import { UUIDType } from './types/uuid.js';
import { PrismaClient } from '@prisma/client';

type CreateUserDto = {
    name: string;
    balance: number;
};

type CreateProfileDto = {
    isMale: boolean;
    yearOfBirth: number;
    userId: string;
    memberTypeId: string;
};

type CreatePostDto = {
    title: string;
    content: string;
    authorId: string;
};

type ChangeUserDto = {
    name?: string;
    balance?: number;
};

type ChangeProfileDto = {
    isMale?: boolean;
    yearOfBirth?: number;
    memberTypeId?: string;
};

type ChangePostDto = {
    title?: string;
    content?: string;
};

export const createMutations = () => {
    return new GraphQLObjectType({
        name: 'Mutations',
        fields: {
            // Create mutations
            createUser: {
                type: new GraphQLNonNull(User),
                args: {
                    dto: { type: new GraphQLNonNull(CreateUserInput) },
                },
                resolve: (_: unknown, { dto }: { dto: CreateUserDto }, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.user.create({ data: dto });
                },
            },

            createProfile: {
                type: new GraphQLNonNull(Profile),
                args: {
                    dto: { type: new GraphQLNonNull(CreateProfileInput) },
                },
                resolve: (_: unknown, { dto }: { dto: CreateProfileDto }, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.profile.create({ data: dto });
                },
            },

            createPost: {
                type: new GraphQLNonNull(Post),
                args: {
                    dto: { type: new GraphQLNonNull(CreatePostInput) },
                },
                resolve: (_: unknown, { dto }: { dto: CreatePostDto }, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.post.create({ data: dto });
                },
            },

            changeUser: {
                type: new GraphQLNonNull(User),
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                    dto: { type: new GraphQLNonNull(ChangeUserInput) },
                },
                resolve: (_: unknown, { id, dto }: { id: string; dto: ChangeUserDto }, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.user.update({
                        where: { id },
                        data: dto,
                    });
                },
            },

            changeProfile: {
                type: new GraphQLNonNull(Profile),
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                    dto: { type: new GraphQLNonNull(ChangeProfileInput) },
                },
                resolve: (_: unknown, { id, dto }: { id: string; dto: ChangeProfileDto }, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.profile.update({
                        where: { id },
                        data: dto,
                    });
                },
            },

            changePost: {
                type: new GraphQLNonNull(Post),
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                    dto: { type: new GraphQLNonNull(ChangePostInput) },
                },
                resolve: (_: unknown, { id, dto }: { id: string; dto: ChangePostDto }, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.post.update({
                        where: { id },
                        data: dto,
                    });
                },
            },

            deleteUser: {
                type: new GraphQLNonNull(GraphQLString),
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                },
                resolve: async (_: unknown, { id }: { id: string }, { prisma }: { prisma: PrismaClient }) => {
                    await prisma.user.delete({ where: { id } });
                    return "success";
                },
            },

            deleteProfile: {
                type: new GraphQLNonNull(GraphQLString),
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                },
                resolve: async (_: unknown, { id }: { id: string }, { prisma }: { prisma: PrismaClient }) => {
                    await prisma.profile.delete({ where: { id } });
                    return "success";
                },
            },

            deletePost: {
                type: new GraphQLNonNull(GraphQLString),
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                },
                resolve: async (_: unknown, { id }: { id: string }, { prisma }: { prisma: PrismaClient }) => {
                    await prisma.post.delete({ where: { id } });
                    return "success";
                },
            },

            subscribeTo: {
                type: new GraphQLNonNull(GraphQLString),
                args: {
                    userId: { type: new GraphQLNonNull(UUIDType) },
                    authorId: { type: new GraphQLNonNull(UUIDType) },
                },
                resolve: async (_: unknown, { userId, authorId }: { userId: string; authorId: string }, { prisma }: { prisma: PrismaClient }) => {
                    await prisma.subscribersOnAuthors.create({
                        data: {
                            subscriberId: userId,
                            authorId: authorId,
                        },
                    });
                    return "success";
                },
            },

            unsubscribeFrom: {
                type: new GraphQLNonNull(GraphQLString),
                args: {
                    userId: { type: new GraphQLNonNull(UUIDType) },
                    authorId: { type: new GraphQLNonNull(UUIDType) },
                },
                resolve: async (_: unknown, { userId, authorId }: { userId: string; authorId: string }, { prisma }: { prisma: PrismaClient }) => {
                    await prisma.subscribersOnAuthors.delete({
                        where: {
                            subscriberId_authorId: {
                                subscriberId: userId,
                                authorId: authorId,
                            },
                        },
                    });
                    return "success";
                },
            },
        },
    });
};