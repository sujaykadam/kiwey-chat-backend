import { gql } from "apollo-server-core";

const typeDefs = gql`
	type SearchedUser {
		id: String
		username: String
	}
	type Query {
		searchUsers(username: String): [SearchedUser]
	}

	type CreateUsernameResponse {
		success: Boolean
		error: String
	}
	type Mutation {
		createUsername(username: String):  CreateUsernameResponse
	}
`;

export default typeDefs;