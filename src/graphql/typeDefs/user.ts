import { gql } from "apollo-server-core";

const typeDef = gql`
	type User {
		id: String
		username: String
	}
	type Query {
		searchUsers(username: String): [User]
	}

	type CreateUsernameResponse {
		success: Boolean
		error: String
	}
	type Mutation {
		createUsername(username: String):  CreateUsernameResponse
	}
`;

export default typeDef;