import { Arg, Ctx, Field, ObjectType } from 'type-graphql';
import { StatusObject } from './types/Status.type';
import { StatusModel } from './mongo/Status.model';

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
            return await StatusModel.find({ cueId })
        } catch (e) {
            console.log(e)
            return []
        }
    }

}