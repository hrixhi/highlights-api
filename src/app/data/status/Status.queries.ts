import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { StatusObject } from './types/Status.type';
import { StatusModel } from './mongo/Status.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { CueModel } from '../cue/mongo/Cue.model';
import { ChannelModel } from '../channel/mongo/Channel.model';

/**
 * Status Query Endpoints
 */
@ObjectType()
export class StatusQueryResolver {

    @Field(type => [StatusObject], {
        description: "Used to find one user by id."
    })
    public async findByCueId(
        @Arg("cueId", type => String)
        cueId: string
    ) {
        try {
            const cue: any = await CueModel.findById(cueId)
            const statusArray: any[] = []
            if (cue) {
                const cueObject = cue.toObject()

                const channelId = cueObject.channelId

                const fetchChannel = await ChannelModel.findById(channelId);

                let owners: any[] = [];
      
                if (fetchChannel) {
                    owners = fetchChannel.owners ? [...fetchChannel.owners, fetchChannel.createdBy.toString()] : [fetchChannel.createdBy.toString()]
                }

                const statuses: any[] = await StatusModel.find({ cueId })
                const modifications: any[] = await ModificationsModel.find({ cueId })
                statuses.map((s) => {
                    const status: any = s.toObject()

                    if (owners.includes(status.userId.toString())) {
                        return 
                    }
                    
                    const mod: any = modifications.find((m: any) => {
                        const modification = m.toObject()
                        return modification.userId.toString().trim() === s.userId.toString().trim()
                    })
                    if (mod && mod.submittedAt && mod.submittedAt !== '') {
                        statusArray.push({
                            ...status,
                            comment: mod.comment ? mod.comment : '',
                            graded: mod.graded,
                            submission: mod.cue,
                            score: mod.score,
                            submittedAt: mod.submittedAt && mod.submittedAt !== "" ? mod.submittedAt : "",
                            deadline: cueObject.deadline && cueObject.deadline !== "" ? cueObject.deadline : "",
                            status: mod.graded ? 'graded' : 'submitted',
                            releaseSubmission: (mod.releaseSubmission !== null && mod.releaseSubmission !== undefined) ? mod.releaseSubmission : false
                        })
                    } else {
                        statusArray.push(status)
                    }
                })
            }
            return statusArray
        } catch (e) {
            console.log(e)
            return []
        }
    }

}