import {
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLFloat,
    GraphQLInt,
    GraphQLEnumType,
    GraphQLString,
    GraphQLBoolean,
    GraphQLList
} from 'graphql';
import { UUIDType } from './types/uuid.js';
import { PrismaClient } from '@prisma/client';
import { DataLoaders } from './dataloader.js';

type Context = {
    prisma: PrismaClient;
    dataLoaders: DataLoaders;
};

export const MemberTypeEnum = new GraphQLEnumType({
    name: 'MemberTypeId',
    values: {
        BASIC: { value: 'BASIC' },
        BUSINESS: { value: 'BUSINESS' },
    },
});

export const MemberType = new GraphQLObjectType({
    name: 'MemberType',
    fields: {
        id: { type: new GraphQLNonNull(MemberTypeEnum) },
        discount: { type: new GraphQLNonNull(GraphQLFloat) },
        postsLimitPerMonth: { type: new GraphQLNonNull(GraphQLInt) },
    },
});

export const Post = new GraphQLObjectType({
    name: 'Post',
    fields: {
        id: { type: new GraphQLNonNull(UUIDType) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(GraphQLString) },
    },
});

type ProfileParent = {
    id: string;
    isMale: boolean;
    yearOfBirth: number;
    userId: string;
    memberTypeId: string;
};

export const Profile = new GraphQLObjectType({
    name: 'Profile',
    fields: () => ({
        id: { type: new GraphQLNonNull(UUIDType) },
        isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
        yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
        memberType: {
            type: new GraphQLNonNull(MemberType),
            resolve: (parent: ProfileParent, _, { dataLoaders }: Context) => {
                return dataLoaders.memberTypeLoader.load(parent.memberTypeId);
            },
        },
    }),
});

export type UserParent = {
    id: string;
    name: string;
    balance: number;
};

export const User = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
        id: { type: new GraphQLNonNull(UUIDType) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        balance: { type: new GraphQLNonNull(GraphQLFloat) },
        profile: {
            type: Profile,
            resolve: (parent: UserParent, _, { dataLoaders }: Context) => {
                return dataLoaders.profileLoader.load(parent.id);
            },
        },
        posts: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
            resolve: (parent: UserParent, _, { dataLoaders }: Context) => {
                return dataLoaders.postLoader.load(parent.id);
            },
        },
        userSubscribedTo: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
            resolve: (parent: UserParent, _, { dataLoaders }: Context) => {
                return dataLoaders.userSubscribedToLoader.load(parent.id);
            },
        },
        subscribedToUser: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
            resolve: (parent: UserParent, _, { dataLoaders }: Context) => {
                return dataLoaders.subscribedToUserLoader.load(parent.id);
            },
        },
    }),
});