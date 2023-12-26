import { CreateUsernameResponse, GraphQLContext } from "../../util/types";

const resolvers = {
	Query: {
		searchUsers: () => {},
	},
	Mutation: {
		createUsername: async (
			_:any,
			args: {username: string},
			context: GraphQLContext
		): Promise<CreateUsernameResponse> => {
			const {username} = args;
			const { session, prisma } = context;
			if(!session?.user){
				return {
					success: false,
					error: "Not authorized"
				}
			}
			const {id} = session.user;

			try{
				const existingUser = await prisma.user.findUnique({	where: {username}});
				if(existingUser){
					return {
						success: false,
						error: "Username already exists"
					}
				}
				await prisma.user.update({
					where: {id},
					data: {username}
				});
				return {
					success: true,
					error: null
				}
			}catch(error: any){
				console.log('createUsernameError', error);
				return {
					success: false,
					error: error?.message
				}
			}

		},
	},
}

export default resolvers;