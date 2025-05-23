import { GraphQLObjectType, GraphQLSchema, GraphQLID, GraphQLString, GraphQLFloat, GraphQLBoolean, GraphQLInt, GraphQLNonNull, GraphQLList, GraphQLInputObjectType, GraphQLResolveInfo } from 'graphql';
import { parseResolveInfo, ResolveTree } from 'graphql-parse-resolve-info';
import { User } from '@prisma/client'; // Import User type for priming

// Object Types

const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
    profile: {
      type: ProfileType,
      resolve: (parent, _, context) => context.loaders.userProfileLoader.load(parent.id),
    },
    posts: {
      type: new GraphQLList(PostType),
      resolve: (parent, _, context) => context.loaders.userPostsLoader.load(parent.id),
    },
    userSubscribedTo: {
      type: new GraphQLList(SubscribersOnAuthorsType),
      resolve: (parent, _, context) => context.loaders.userSubscribedToLoader.load(parent.id),
    },
    subscribedToUser: {
      type: new GraphQLList(SubscribersOnAuthorsType),
      resolve: (parent, _, context) => context.loaders.subscribedToUserLoader.load(parent.id),
    },
  }),
});

const ProfileType = new GraphQLObjectType({
  name: 'Profile',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    user: {
      type: UserType,
      resolve: (parent, _, context) => context.loaders.userByIdLoader.load(parent.userId),
    },
    memberType: {
      type: MemberTypeType,
      resolve: (parent, _, context) => context.loaders.profileMemberTypeLoader.load(parent.memberTypeId),
    },
  }),
});

const PostType = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: GraphQLString },
    author: {
      type: UserType,
      resolve: (parent, _, context) => context.loaders.userByIdLoader.load(parent.authorId),
    },
  }),
});

const MemberTypeType = new GraphQLObjectType({
  name: 'MemberType',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    discount: { type: new GraphQLNonNull(GraphQLFloat) },
    postsLimitPerMonth: { type: new GraphQLNonNull(GraphQLInt) },
    profiles: {
      type: new GraphQLList(ProfileType),
      resolve: (parent, _, context) => context.prisma.profile.findMany({ where: { memberTypeId: parent.id } }),
    },
  }),
});

const SubscribersOnAuthorsType = new GraphQLObjectType({
  name: 'SubscribersOnAuthors',
  fields: () => ({
    subscriberId: { type: new GraphQLNonNull(GraphQLID) },
    authorId: { type: new GraphQLNonNull(GraphQLID) },
    subscriber: {
      type: UserType,
      resolve: (parent, _, context) => context.loaders.userByIdLoader.load(parent.subscriberId),
    },
    author: {
      type: UserType,
      resolve: (parent, _, context) => context.loaders.userByIdLoader.load(parent.authorId),
    },
  }),
});

// Input Types

const CreateUserInput = new GraphQLInputObjectType({
  name: 'CreateUserInput',
  fields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
  },
});

const UpdateUserInput = new GraphQLInputObjectType({
  name: 'UpdateUserInput',
  fields: {
    name: { type: GraphQLString },
    balance: { type: GraphQLFloat },
  },
});

const CreatePostInput = new GraphQLInputObjectType({
  name: 'CreatePostInput',
  fields: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    authorId: { type: new GraphQLNonNull(GraphQLID) },
  },
});

const UpdatePostInput = new GraphQLInputObjectType({
  name: 'UpdatePostInput',
  fields: {
    title: { type: GraphQLString },
    content: { type: GraphQLString },
  },
});

const CreateProfileInput = new GraphQLInputObjectType({
  name: 'CreateProfileInput',
  fields: {
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    memberTypeId: { type: new GraphQLNonNull(GraphQLID) },
    userId: { type: new GraphQLNonNull(GraphQLID) },
  },
});

const UpdateProfileInput = new GraphQLInputObjectType({
  name: 'UpdateProfileInput',
  fields: {
    isMale: { type: GraphQLBoolean },
    yearOfBirth: { type: GraphQLInt },
    memberTypeId: { type: GraphQLID },
  },
});


// Root Query
const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    user: {
      type: UserType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (_, { id }, context) => context.prisma.user.findUnique({ where: { id } }),
    },
    users: {
      type: new GraphQLList(UserType),
      resolve: async (parent, args, context, info: GraphQLResolveInfo) => {
        const parsedInfo = parseResolveInfo(info) as ResolveTree | null; // Handle null case
        const requestedFields = parsedInfo?.fieldsByTypeName.User || {};

        if (requestedFields.userSubscribedTo || requestedFields.subscribedToUser) {
          const usersWithSubscriptions = await context.prisma.user.findMany({
            include: {
              userSubscribedTo: { include: { subscriber: true, author: true } }, // author is the current user
              subscribedToUser: { include: { subscriber: true, author: true } }, // subscriber is the current user
            },
          });

          const allUsersToPrime: { [key: string]: User } = {};

          usersWithSubscriptions.forEach(user => {
            allUsersToPrime[user.id] = user; // Prime the main user itself

            // Prime User.userSubscribedTo (list of users current user is an author for)
            if (user.userSubscribedTo) {
              context.loaders.userSubscribedToLoader.prime(user.id, user.userSubscribedTo);
              user.userSubscribedTo.forEach(sub => { // sub is a SubscribersOnAuthors record
                if (sub.subscriber) { // The user who subscribed to the current user
                  allUsersToPrime[sub.subscriber.id] = sub.subscriber;
                }
                // sub.author is the current user (user.id), already handled
              });
            } else {
              context.loaders.userSubscribedToLoader.prime(user.id, []);
            }

            // Prime User.subscribedToUser (list of users current user subscribes to)
            if (user.subscribedToUser) {
              context.loaders.subscribedToUserLoader.prime(user.id, user.subscribedToUser);
              user.subscribedToUser.forEach(sub => { // sub is a SubscribersOnAuthors record
                if (sub.author) { // The user the current user is subscribed to
                  allUsersToPrime[sub.author.id] = sub.author;
                }
                // sub.subscriber is the current user (user.id), already handled
              });
            } else {
               context.loaders.subscribedToUserLoader.prime(user.id, []);
            }
          });
          
          // Prime userByIdLoader for all unique users encountered
          Object.values(allUsersToPrime).forEach(usr => {
            context.loaders.userByIdLoader.prime(usr.id, usr);
          });

          return usersWithSubscriptions;
        } else {
          // If subscription fields are not requested, fetch users normally
          return context.prisma.user.findMany();
        }
      },
    },
    post: {
      type: PostType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (_, { id }, context) => context.prisma.post.findUnique({ where: { id } }),
    },
    posts: {
      type: new GraphQLList(PostType),
      resolve: (parent, args, context) => context.prisma.post.findMany(),
    },
    profile: {
      type: ProfileType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (_, { id }, context) => context.prisma.profile.findUnique({ where: { id } }),
    },
    profiles: {
      type: new GraphQLList(ProfileType),
      resolve: (parent, args, context) => context.prisma.profile.findMany(),
    },
    memberType: {
      type: MemberTypeType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (_, { id }, context) => context.prisma.memberType.findUnique({ where: { id } }),
    },
    memberTypes: {
      type: new GraphQLList(MemberTypeType),
      resolve: (parent, args, context) => context.prisma.memberType.findMany(),
    },
  },
});

// Root Mutation
const RootMutation = new GraphQLObjectType({
  name: 'RootMutationType',
  fields: {
    createUser: {
      type: UserType,
      args: { input: { type: new GraphQLNonNull(CreateUserInput) } },
      resolve: (_, { input }, context) => context.prisma.user.create({ data: input }),
    },
    updateUser: {
      type: UserType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        input: { type: new GraphQLNonNull(UpdateUserInput) },
      },
      resolve: (_, { id, input }, context) => context.prisma.user.update({ where: { id }, data: input }),
    },
    deleteUser: {
      type: new GraphQLList(UserType), 
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: async (_, { id }, context) => {
        await context.prisma.user.delete({ where: { id } });
        return context.prisma.user.findMany();
      },
    },
    createPost: {
      type: PostType,
      args: { input: { type: new GraphQLNonNull(CreatePostInput) } },
      resolve: (_, { input }, context) => context.prisma.post.create({ data: input }),
    },
    updatePost: {
      type: PostType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        input: { type: new GraphQLNonNull(UpdatePostInput) },
      },
      resolve: (_, { id, input }, context) => context.prisma.post.update({ where: { id }, data: input }),
    },
    deletePost: {
      type: PostType, 
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: async (_, { id }, context) => {
        await context.prisma.post.delete({ where: { id } });
        return null;
      },
    },
    createProfile: {
      type: ProfileType,
      args: { input: { type: new GraphQLNonNull(CreateProfileInput) } },
      resolve: (_, { input }, context) => context.prisma.profile.create({ data: input }),
    },
    updateProfile: {
      type: ProfileType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        input: { type: new GraphQLNonNull(UpdateProfileInput) },
      },
      resolve: (_, { id, input }, context) => context.prisma.profile.update({ where: { id }, data: input }),
    },
    deleteProfile: {
      type: ProfileType, 
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: async (_, { id }, context) => {
        await context.prisma.profile.delete({ where: { id } });
        return null;
      },
    },
    subscribeUser: {
      type: SubscribersOnAuthorsType, 
      args: {
        userId: { type: new GraphQLNonNull(GraphQLID) },
        authorId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: (_, { userId, authorId }, context) => context.prisma.subscribersOnAuthors.create({ data: { subscriberId: userId, authorId: authorId } }),
    },
    unsubscribeUser: {
      type: GraphQLBoolean, 
      args: {
        userId: { type: new GraphQLNonNull(GraphQLID) },
        authorId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (_, { userId, authorId }, context) => {
        await context.prisma.subscribersOnAuthors.delete({ where: { subscriberId_authorId: { subscriberId: userId, authorId: authorId } } });
        return true; // Return true to indicate success, or adjust as needed by tests
      },
    },
  },
});

// The schema is now built by Mercurius, so we only export the components
// that Mercurius will use to build the schema.

export {
  UserType,
  ProfileType,
  PostType,
  MemberTypeType,
  SubscribersOnAuthorsType,
  RootQuery,
  RootMutation
};

export const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation,
});
