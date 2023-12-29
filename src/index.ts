import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { PrismaClient } from "@prisma/client";
import { json } from "body-parser";
import cors from "cors";
import express from "express";
import { PubSub } from "graphql-subscriptions";
import { useServer } from "graphql-ws/lib/use/ws";
import http from "http";
import { getSession } from "next-auth/react";
import { WebSocketServer } from "ws";
import resolvers from "./graphql/resolvers";
import typeDefs from "./graphql/typeDefs";
import { GraphQLContext, Session, SubscriptionContext } from "./util/types";

async function main() {
	const app = express();
	const httpServer = http.createServer(app);
	const prisma = new PrismaClient();
	const pubsub = new PubSub();

	const schema = makeExecutableSchema({
		typeDefs,
		resolvers,
	});

	const corsOptions = {
		origin: process.env.CLIENT_ORIGIN,
		credentials: true,
	};

	// Create our WebSocket server using the HTTP server we just set up.
	const wsServer = new WebSocketServer({
		server: httpServer,
		path: "/graphql/subscriptions",
	});
	// Save the returned server's info so we can shutdown this server later
	const serverCleanup = useServer(
		{
			schema,
			context: async (ctx: SubscriptionContext): Promise<GraphQLContext> => {
				if (ctx.connectionParams && ctx.connectionParams.session) {
					const { session } = ctx.connectionParams;
					return {
						session,
						prisma,
						pubsub,
					};
				}
				return { session: null, prisma, pubsub };
			},
		},
		wsServer
	);

	const server = new ApolloServer({
		schema,
		csrfPrevention: true,
		plugins: [
			// Proper shutdown for the HTTP server.
			ApolloServerPluginDrainHttpServer({ httpServer }),

			// Proper shutdown for the WebSocket server.
			{
				async serverWillStart() {
					return {
						async drainServer() {
							await serverCleanup.dispose();
						},
					};
				},
			},
		],
	});
	await server.start();
	app.use(
		"/graphql",
		cors<cors.CorsRequest>(corsOptions),
		json(),
		expressMiddleware(server, {
			context: async ({ req }): Promise<GraphQLContext> => {
				const session = await getSession({ req });

				return { session: session as Session, prisma, pubsub };
			},
		})
	);
	await new Promise<void>((resolve) =>
		httpServer.listen({ port: process.env.PORT }, resolve)
	);

	console.log(
		`Server is now running on http://localhost:${process.env.PORT}/graphql`
	);
}

main().catch((err) => console.log(err));
