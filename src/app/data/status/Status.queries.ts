import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { StatusObject } from './types/Status.type';
import { StatusModel } from './mongo/Status.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { CueModel } from '../cue/mongo/Cue.model';

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
                const statuses: any[] = await StatusModel.find({ cueId })
                const modifications: any[] = await ModificationsModel.find({ cueId })
                statuses.map((s) => {
                    const status: any = s.toObject()
                    if (status.userId.toString().trim() === cueObject.createdBy.toString().trim()) {
                        return
                    }
                    const mod: any = modifications.find((m: any) => {
                        const modification = m.toObject()
                        return modification.userId.toString().trim() === s.userId.toString().trim()
                    })
                    if (mod && mod.submittedAt && mod.submittedAt !== '') {
                        statusArray.push({
                            ...status,
                            graded: mod.graded,
                            submission: mod.cue,
                            score: mod.score,
                            status: mod.graded ? 'graded' : 'submitted'
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