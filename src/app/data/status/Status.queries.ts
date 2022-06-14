import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { StatusObject } from './types/Status.type';
import { StatusModel } from './mongo/Status.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';

/**
 * Status Query Endpoints
 */
@ObjectType()
export class StatusQueryResolver {
    @Field((type) => [StatusObject], {
        description: 'Used to find one user by id.',
    })
    public async findByCueId(
        @Arg('cueId', (type) => String)
        cueId: string
    ) {
        try {
            const cue: any = await CueModel.findById(cueId);
            let statusArray: any[] = [];
            if (cue) {
                const cueObject = cue.toObject();

                const channelId = cueObject.channelId;

                const fetchChannel = await ChannelModel.findById(channelId);

                let owners: any[] = [];

                if (fetchChannel) {
                    owners = fetchChannel.owners
                        ? [...fetchChannel.owners, fetchChannel.createdBy.toString()]
                        : [fetchChannel.createdBy.toString()];
                }

                const activeSubs = await SubscriptionModel.find({
                    channelId,
                    unsubscribedAt: { $exists: false },
                });

                // console.log("Active subs", activeSubs)

                const activeUserIds: string[] = [];

                activeSubs.map((sub: any) => {
                    const s = sub.toObject();
                    activeUserIds.push(s.userId.toString());
                });

                // console.log("Active user ids", activeUserIds);

                const statuses: any[] = await StatusModel.find({ cueId });
                const modifications: any[] = await ModificationsModel.find({ cueId, restrictAccess: { $ne: true } });

                statuses.map((s) => {
                    const status: any = s.toObject();

                    if (owners.includes(status.userId.toString())) {
                        return;
                    }

                    if (!activeUserIds.includes(status.userId.toString())) {
                        return;
                    }

                    const mod: any = modifications.find((m: any) => {
                        const modification = m.toObject();
                        return modification.userId.toString().trim() === s.userId.toString().trim();
                    });
                    if (mod && mod.submittedAt && mod.submittedAt !== '') {
                        statusArray.push({
                            ...status,
                            comment: mod.comment ? mod.comment : '',
                            graded: mod.graded,
                            submission: mod.cue,
                            score: mod.score,
                            submittedAt: mod.submittedAt && mod.submittedAt !== '' ? mod.submittedAt : '',
                            deadline: cueObject.deadline && cueObject.deadline !== '' ? cueObject.deadline : '',
                            status: mod.graded ? 'graded' : 'submitted',
                            releaseSubmission:
                                mod.releaseSubmission !== null && mod.releaseSubmission !== undefined
                                    ? mod.releaseSubmission
                                    : false,
                            totalPoints: mod.totalPoints ? mod.totalPoints : 100,
                            pointsScored: mod.pointsScored ? mod.pointsScored : undefined,
                        });
                    } else if (mod) {
                        statusArray.push(status);
                    }
                });
            }
            return statusArray;
        } catch (e) {
            console.log(e);
            return [];
        }
    }
}
