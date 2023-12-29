import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import {
	GraphQLContext,
	MessageSentSubscriptionPayload,
	SendMessageArguments,
} from "../../util/types";
import { messagePopulated } from "./conversation";

const resolvers = {
	Query: {},
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

				// Update conversation
				const conversation = await prisma.conversation.update({
					where: { id: conversationId },
					data: {
						latestMessageId: messageId,
						participants: {
							update: {
								where: {
									id: userId,
								},
								data: {
									hasSeenLatestMessage: true,
								},
							},
							updateMany: {
								where: {
									NOT: {
										id: userId,
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
