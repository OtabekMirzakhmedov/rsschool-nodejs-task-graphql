import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import mercurius from 'mercurius';
import depthLimit from 'graphql-depth-limit';
import { schema, RootQuery, RootMutation, UserType, PostType, ProfileType, MemberTypeType, SubscribersOnAuthorsType } from './graphql-schema.js';
import { createLoaders } from './dataloaders.js';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  await fastify.register(mercurius, {
    schema,
    validationRules: [depthLimit(5)],
    resolvers: {
      Query: RootQuery.getFields(),
      Mutation: RootMutation.getFields(),
      User: UserType.getFields(),
      Post: PostType.getFields(),
      Profile: ProfileType.getFields(),
      MemberType: MemberTypeType.getFields(),
      SubscribersOnAuthors: SubscribersOnAuthorsType.getFields(),
    },
    graphiql: true,
    context: (request, reply) => {
      return {
        prisma: fastify.prisma,
        loaders: createLoaders(fastify.prisma),
      };
    },
  });
};

export default plugin;
