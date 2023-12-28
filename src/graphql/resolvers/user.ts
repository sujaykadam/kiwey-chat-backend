import { User } from "@prisma/client";
import { ApolloError } from "apollo-server-core";
import { CreateUsernameResponse, GraphQLContext } from "../../util/types";

const resolvers = {
	Query: {
		searchUsers: async (
			_: any,
			args: { username: string },
			context: GraphQLContext,
		): Promise<Array<User>> => {
			const { username: searchedUsername } = args;
			const { session, prisma } = context;
			if (!session?.user) {
				throw new ApolloError("Not authorized");
			}
			if (!searchedUsername)
				throw new ApolloError("Username is required to search");
			try {
				const users = await prisma.user.findMany({
					where: {
						username: {
							contains: searchedUsername,
							not: session.user.username,
							mode: "insensitive",
						},
					},
				});
				return users;
			} catch (error: any) {
				console.log("searchUsersError", error);
				throw new ApolloError(error?.message);
			}
		},
	},
	Mutation: {
		createUsername: async (
			_: any,
			args: { username: string },
			context: GraphQLContext,
		): Promise<CreateUsernameResponse> => {
			const { username } = args;
			const { session, prisma } = context;
			if (!session?.user) {
				return {
					success: false,
					error: "Not authorized",
				};
			}
			const { id } = session.user;

			try {
				const existingUser = await prisma.user.findUnique({
					where: { username },
				});
				if (existingUser) {
					return {
						success: false,
						error: "Username already exists",
					};
				}
				await prisma.user.update({
					where: { id },
					data: { username },
				});
				return {
					success: true,
					error: null,
				};
			} catch (error: any) {
				console.log("createUsernameError", error);
				return {
					success: false,
					error: error?.message,
				};
			}
		},
	},
};

export default resolvers;
