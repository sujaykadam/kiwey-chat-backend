import gql from "graphql-tag";

const typeDefs = gql`
	scalar Date

	type Mutation {
		createConversation(participantIds: [String]): CreateConversationResponse
	}

	type CreateConversationResponse {
		conversationId: String
	}

	type Query {
		conversations: [Conversation]
	}

	type Conversation {
		id: String
		lastMessage: Message
		participants: [Participant]
		createdAt: Date
		updatedAt: Date
	}

	type Participant {
		id: String
		user: User
		hasSeenLatestMessage: Boolean
	}

	type Subscription {
		conversationCreated: Conversation
	}
`;

export default typeDefs;
