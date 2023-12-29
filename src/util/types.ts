import { Prisma, PrismaClient } from "@prisma/client";
import { PubSub } from "graphql-subscriptions";
import { Context } from "graphql-ws/lib/server";
import { ISODateString } from "next-auth";
import {
	conversationPopulated,
	participantPopulated,
} from "../graphql/resolvers/conversation";

// Server config types
export interface SubscriptionContext extends Context {
	connectionParams: {
		session?: Session;
	};
}

export interface GraphQLContext {
	session: Session | null;
	prisma: PrismaClient;
	pubsub: PubSub;
}

export interface Session {
	user: User;
	expires: ISODateString;
	email: string;
	image: string;
	name: string;
	emailVerified: Boolean;
}

//Users types
export interface User {
	id: string;
	username: string;
	image: string;
}

export interface CreateUsernameResponse {
	success?: boolean;
	error?: string | null;
}

// Conversation types
export type ConversationPopulated = Prisma.ConversationGetPayload<{
	include: typeof conversationPopulated;
}>;

export type participantPopulated = Prisma.ConversationParticipantGetPayload<{
	include: typeof participantPopulated;
}>;

// Message types
export interface SendMessageArguments {
	id: string;
	conversationId: string;
	senderId: string;
	body: string;
}
