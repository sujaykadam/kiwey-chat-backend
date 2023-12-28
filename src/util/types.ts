import { PrismaClient } from "@prisma/client";
import { ISODateString } from "next-auth";

export interface GraphQLContext {
	session: Session | null;
	prisma: PrismaClient;
	// pubsub
}

//Users types
export interface User {
	id: string;
	username: string;
	image: string;
}

export interface Session {
	user: User;
	expires: ISODateString;
	email: string;
	image: string;
	name: string;
	emailVerified: Boolean;
}

export interface CreateUsernameResponse {
	success?: boolean;
	error?: string | null;
}
