import { GraphQLObjectType, GraphQLList, GraphQLNonNull } from 'graphql';
import { MemberType, MemberTypeEnum, User, Post, Profile } from './graphql-types.js';
import { UUIDType } from './types/uuid.js';
import { PrismaClient } from '@prisma/client';

export const createRootQuery = () => {
    return new GraphQLObjectType({
        name: 'RootQueryType',
        fields: {
            memberTypes: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MemberType))),
                resolve: (_: unknown, __: unknown, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.memberType.findMany();
                },
            },
            memberType: {
                type: MemberType,
                args: { id: { type: new GraphQLNonNull(MemberTypeEnum) } },
                resolve: (_: unknown, { id }: { id: string }, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.memberType.findUnique({ where: { id } });
                },
            },

            users: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
                resolve: (_: unknown, __: unknown, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.user.findMany();
                },
            },
            user: {
                type: User,
                args: { id: { type: new GraphQLNonNull(UUIDType) } },
                resolve: (_: unknown, { id }: { id: string }, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.user.findUnique({ where: { id } });
                },
            },

            posts: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
                resolve: (_: unknown, __: unknown, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.post.findMany();
                },
            },
            post: {
                type: Post,
                args: { id: { type: new GraphQLNonNull(UUIDType) } },
                resolve: (_: unknown, { id }: { id: string }, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.post.findUnique({ where: { id } });
                },
            },

            profiles: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Profile))),
                resolve: (_: unknown, __: unknown, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.profile.findMany();
                },
            },
            profile: {
                type: Profile,
                args: { id: { type: new GraphQLNonNull(UUIDType) } },
                resolve: (_: unknown, { id }: { id: string }, { prisma }: { prisma: PrismaClient }) => {
                    return prisma.profile.findUnique({ where: { id } });
                },
            },
        },
    });
};