import { Prisma } from "@prisma/client";
import { ApolloError } from "apollo-server-core";
import { GraphQLContext } from "../../util/types";

const resolvers = {
	Mutation: {
		createConversation: async (
			_: any,
			args: { participantIds: Array<string> },
			context: GraphQLContext,
		): Promise<{ conversationId: String }> => {
			const { participantIds } = args;
			const { session, prisma } = context;
			if (!session?.user) {
				throw new ApolloError("Not authorized");
			}
			if (participantIds?.length < 2) {
				throw new ApolloError("Participants are required");
			}
			const {
				user: { id: userId },
			} = session;
			try {
				const conversation = await prisma.conversation.create({
					data: {
						participants: {
							createMany: {
								data: participantIds.map((participantId) => ({
									userId: participantId,
									hasSeenLatestMessage:
										userId === participantId,
								})),
							},
						},
					},
					include: conversationPopulated,
				});
				//pubsub event emit for new conversation
				return {
					conversationId: conversation.id,
				};
			} catch (error: any) {
				console.log("createConversationError", error);
				throw new ApolloError(error?.message);
			}
		},
	},
};

export const participantPopulated =
	Prisma.validator<Prisma.ConversationParticipantInclude>()({
		user: {
			select: {
				id: true,
				username: true,
			},
		},
	});
export const messagePopulated = Prisma.validator<Prisma.MessageInclude>()({
	sender: {
		select: {
			id: true,
			username: true,
		},
	},
});
export const conversationPopulated =
	Prisma.validator<Prisma.ConversationInclude>()({
		participants: {
			include: participantPopulated,
		},
		latestMessage: {
			include: messagePopulated,
		},
	});

export default resolvers;
