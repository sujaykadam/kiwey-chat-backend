import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { isUserParticipant } from "../../util/functions";
import {
	ConversationPopulated,
	ConversationUpdatedSubscriptionPayload,
	GraphQLContext,
} from "../../util/types";
const resolvers = {
	Query: {
		conversations: async (
			_: any,
			__: any,
			context: GraphQLContext
		): Promise<Array<ConversationPopulated>> => {
			const { session, prisma } = context;

			if (!session?.user) {
				throw new GraphQLError("Not authorized");
			}
			const {
				user: { id: userId },
			} = session;
			try {
				const conversations = await prisma.conversation.findMany({
					where: {
						participants: {
							some: {
								userId,
							},
						},
					},
					include: conversationPopulated,
				});
				return conversations;
			} catch (error: any) {
				console.log("conversationsError", error);
				throw new GraphQLError(error?.message);
			}
		},
	},
	Mutation: {
		createConversation: async (
			_: any,
			args: { participantIds: Array<string> },
			context: GraphQLContext
		): Promise<{ conversationId: String }> => {
			const { participantIds } = args;
			const { session, prisma, pubsub } = context;
			if (!session?.user) {
				throw new GraphQLError("Not authorized");
			}
			if (participantIds?.length < 2) {
				throw new GraphQLError("Participants are required");
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
									hasSeenLatestMessage: userId === participantId,
								})),
							},
						},
					},
					include: conversationPopulated,
				});

				pubsub.publish("CONVERSATION_CREATED", {
					conversationCreated: conversation,
				});

				return {
					conversationId: conversation.id,
				};
			} catch (error: any) {
				console.log("createConversationError", error);
				throw new GraphQLError(error?.message);
			}
		},
		markConversationAsRead: async (
			_: any,
			args: { userId: string; conversationId: string },
			context: GraphQLContext
		): Promise<Boolean> => {
			const { userId, conversationId } = args;
			const { session, prisma } = context;
			if (!session?.user) {
				throw new GraphQLError("Not authorized");
			}
			try {
				await prisma.conversationParticipant.updateMany({
					where: {
						conversationId,
						userId,
					},
					data: {
						hasSeenLatestMessage: true,
					},
				});
				return true;
			} catch (error: any) {
				console.log("markConversationAsReadError", error);
				throw new GraphQLError(error?.message);
			}
		},
	},
	Subscription: {
		conversationCreated: {
			subscribe: withFilter(
				(_: any, __: any, context: GraphQLContext) => {
					const { pubsub } = context;
					return pubsub.asyncIterator("CONVERSATION_CREATED");
				},
				(
					payload: ConversationCreatedSubscriptionPayload,
					_,
					context: GraphQLContext
				) => {
					const { session } = context;
					const {
						conversationCreated: { participants },
					} = payload;

					return isUserParticipant(participants, session?.user?.id || "");
				}
			),
		},
		conversationUpdated: {
			subscribe: withFilter(
				(_: any, __: any, context: GraphQLContext) => {
					const { pubsub } = context;
					return pubsub.asyncIterator("CONVERSATION_UPDATED");
				},
				(
					payload: ConversationUpdatedSubscriptionPayload,
					_: any,
					context: GraphQLContext
				) => {
					const { session } = context;
					if (!session?.user) {
						throw new GraphQLError("Not authorized");
					}

					const {
						user: { id: userId },
					} = session;
					const {
						conversationUpdated: {
							conversation: { participants },
						},
					} = payload;

					return isUserParticipant(participants, userId);
				}
			),
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

export interface ConversationCreatedSubscriptionPayload {
	conversationCreated: ConversationPopulated;
}

export default resolvers;
