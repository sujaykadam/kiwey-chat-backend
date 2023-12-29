import conversationResolvers from "./conversation";
import messageResolvers from "./message";
import userResolvers from "./user";

import merge from "lodash.merge";

const resolvers = merge(
	{},
	userResolvers,
	conversationResolvers,
	messageResolvers
);

export default resolvers;
