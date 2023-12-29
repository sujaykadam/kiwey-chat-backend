import { participantPopulated } from "./types";

export function isUserParticipant(
	participants: Array<participantPopulated>,
	userId: string
): boolean {
	return !!participants.some((participant) => participant.userId === userId);
}
