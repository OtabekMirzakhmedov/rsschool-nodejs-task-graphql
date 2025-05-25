import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { createRootQuery } from "./queries.js";
import { createMutations } from './mutation.js';
import { GraphQLSchema, parse, validate, execute } from 'graphql';
import depthLimit from 'graphql-depth-limit';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

  const RootQuery = createRootQuery();
  const Mutations = createMutations();

  const schema = new GraphQLSchema({
    query: RootQuery,
    mutation: Mutations,
  });

  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(req) {
      const { query, variables } = req.body as { query: string; variables?: Record<string, unknown> };

      try {
        const document = parse(query);

        const validationErrors = validate(schema, document, [depthLimit(5)]);

        if (validationErrors.length > 0) {
          return {
            errors: validationErrors.map(error => ({
              message: error.message,
              locations: error.locations,
              path: error.path,
            })),
          };
        }

        const result = await execute({
          schema,
          document,
          variableValues: variables,
          contextValue: { prisma },
        });

        return result;
      } catch (error) {
        return {
          errors: [{ message: (error as Error).message }],
        };
      }
    },
  });
};

export default plugin;