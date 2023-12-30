import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { isUserParticipant } from "../../util/functions";
import {
	GraphQLContext,
	MessagePopulated,
	MessageSentSubscriptionPayload,
	SendMessageArguments,
} from "../../util/types";
import { conversationPopulated, messagePopulated } from "./conversation";

const resolvers = {
	Query: {
		messages: async (
			_: any,
			args: { conversationId: string },
			context: GraphQLContext
		): Promise<Array<MessagePopulated>> => {
			const { session, prisma } = context;
			if (!session?.user) {
				throw new GraphQLError("Not authorized");
			}
			const { id: userId } = session?.user;
			const { conversationId } = args;

			const conversation = await prisma.conversation.findUnique({
				where: { id: conversationId },
				include: conversationPopulated,
			});
			if (!conversation) {
				throw new GraphQLError("Conversation not found");
			}
			const alowedToView = isUserParticipant(conversation.participants, userId);

			if (!alowedToView) {
				throw new GraphQLError("Not authorized");
			}
			try {
				const messages = await prisma.message.findMany({
					where: { conversationId },
					include: messagePopulated,
					orderBy: { createdAt: "desc" },
				});
				return messages;
			} catch (error: any) {
				console.log("messagesError", error);
				throw new GraphQLError(error?.message);
			}
		},
	},
	Mutation: {
		sendMessage: async (
			_: any,
			args: SendMessageArguments,
			context: GraphQLContext
		): Promise<Boolean> => {
			const { session, prisma, pubsub } = context;
			if (!session?.user) {
				throw new GraphQLError("Not authorized");
			}
			const { id: userId } = session.user;
			const { id: messageId, conversationId, senderId, body } = args;
			if (userId !== senderId) {
				throw new GraphQLError("Not authorized");
			}
			try {
				// Create new Message
				const newMessage = await prisma.message.create({
					data: { id: messageId, senderId, conversationId, body },
					include: messagePopulated,
				});
				// Find ConversationParticipant entity
				const conversationParticipant =
					await prisma.conversationParticipant.findFirst({
						where: {
							conversationId,
							userId,
						},
					});
				if (!conversationParticipant) {
					throw new GraphQLError("ConversationParticipant not found");
				}
				// Update conversation
				const conversation = await prisma.conversation.update({
					where: { id: conversationId },
					data: {
						latestMessageId: messageId,
						participants: {
							update: {
								where: {
									id: conversationParticipant.id,
								},
								data: {
									hasSeenLatestMessage: true,
								},
							},
							updateMany: {
								where: {
									NOT: {
										id: conversationParticipant.id,
									},
								},
								data: {
									hasSeenLatestMessage: false,
								},
							},
						},
					},
				});

				pubsub.publish("MESSAGE_SENT", {
					messageSent: newMessage,
				});
				// pubsub.publish("CONVERSATION_UPDATED", {
				// 	conversationUpdated: conversation,
				// });
			} catch (error: any) {
				console.log("sendMessageError", error);
				throw new GraphQLError(error?.message);
			}
			return true;
		},
	},
	Subscription: {
		messageSent: {
			subscribe: withFilter(
				(_: any, __: any, context: GraphQLContext) => {
					const { pubsub } = context;
					return pubsub.asyncIterator("MESSAGE_SENT");
				},
				(
					payload: MessageSentSubscriptionPayload,
					args: { conversationId: string },
					context: GraphQLContext
				) => {
					return payload.messageSent.conversationId === args.conversationId;
				}
			),
		},
	},
};

export default resolvers;
